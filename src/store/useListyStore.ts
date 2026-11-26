import { create } from "zustand";
import { STARTER_TEMPLATES, templateToPayload } from "../data/templates";
import { t } from "../i18n";
import { RestoreReport, storageApi } from "../services/storageApi";
import {
  AppSettings,
  AppStateJson,
  CreateListPayload,
  ListData,
  ListItem,
  withCompletion,
} from "../types/listy";

export type ListDetailsPatch = Partial<
  Pick<ListData, "name" | "description" | "icon" | "color" | "type">
>;

/** A short message at the bottom of the window, optionally offering Undo. */
export interface Toast {
  id: number;
  message: string;
  canUndo: boolean;
}

/** How a change can be undone: its label, and whether to announce it with a toast. */
interface UndoSpec {
  label: string;
  /** Only show the Undo toast for changes that remove something from view. */
  toast?: boolean;
}

/** The items of a list before an undoable change. */
interface UndoEntry {
  listId: string;
  items: ListItem[];
  archivedItems: ListItem[];
  label: string;
}

const UNDO_LIMIT = 30;

interface ListyStore {
  initialized: boolean;
  isLoading: boolean;
  error: string | null;
  storagePath: string;
  appState: AppStateJson;
  lists: ListData[];
  trashedLists: ListData[];
  searchQuery: string;
  viewMode: "grid" | "list";
  sortBy: AppSettings["sortBy"];
  sortOrder: AppSettings["sortOrder"];
  toast: Toast | null;
  undoStack: UndoEntry[];

  init: () => Promise<void>;
  refreshAll: () => Promise<void>;
  clearError: () => void;
  /** Show an error from a UI action in the global message bar. */
  reportError: (err: unknown) => void;
  setSearchQuery: (q: string) => void;
  setViewMode: (mode: "grid" | "list") => void;
  setSort: (sortBy: AppSettings["sortBy"], sortOrder: AppSettings["sortOrder"]) => void;
  showToast: (message: string, canUndo?: boolean) => void;
  dismissToast: () => void;
  /** Revert the last undoable item change. Resolves to false when there was none. */
  undo: () => Promise<boolean>;

  selectStorageFolder: () => Promise<void>;
  openStorageFolder: () => Promise<void>;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;

  /** Throws on failure so dialogs can show the error and stay open. */
  createList: (payload: CreateListPayload) => Promise<ListData>;
  seedStarterLists: () => Promise<void>;
  /** Throws on failure so dialogs can show the error and stay open. */
  updateListDetails: (id: string, patch: ListDetailsPatch) => Promise<ListData>;
  deleteList: (id: string) => Promise<boolean>;
  restoreList: (id: string) => Promise<boolean>;
  permanentlyDeleteList: (id: string) => Promise<boolean>;
  /** Throws on failure. */
  duplicateList: (list: ListData) => Promise<ListData>;
  toggleFavorite: (id: string) => Promise<void>;
  markRecentlyOpened: (id: string) => Promise<void>;
  exportList: (list: ListData) => Promise<boolean>;
  importList: () => Promise<ListData | null>;
  exportBackup: () => Promise<boolean>;
  importBackup: () => Promise<RestoreReport | null>;

  // Item operations resolve to `true` when the change was saved.
  addItem: (
    listId: string,
    title: string,
    extra?: Partial<Omit<ListItem, "id" | "title" | "createdAt" | "updatedAt">>
  ) => Promise<boolean>;
  /** Throws on failure so the item dialog can show the error and stay open. */
  updateItem: (listId: string, itemId: string, patch: Partial<ListItem>) => Promise<void>;
  setItemStatus: (listId: string, itemId: string, patch: Partial<ListItem>) => Promise<boolean>;
  toggleItem: (listId: string, itemId: string) => Promise<boolean>;
  deleteItem: (listId: string, itemId: string) => Promise<boolean>;
  archiveCompleted: (listId: string) => Promise<boolean>;
  restoreArchivedItem: (listId: string, itemId: string) => Promise<boolean>;
  permanentlyDeleteArchivedItem: (listId: string, itemId: string) => Promise<boolean>;
  clearArchivedItems: (listId: string) => Promise<boolean>;
  reorderItems: (listId: string, fromId: string, toId: string) => Promise<boolean>;
  toggleSubtask: (listId: string, itemId: string, subtaskId: string) => Promise<boolean>;
}

const DEFAULT_APP_STATE: AppStateJson = {
  version: 1,
  settings: {
    theme: "system",
    defaultView: "grid",
    sortBy: "updatedAt",
    sortOrder: "desc",
    closeToTray: true,
    globalQuickAdd: true,
    dueReminders: true,
    language: "auto",
  },
  favorites: [],
  recentlyOpened: [],
};


function rawMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function isConflict(err: unknown): boolean {
  return rawMessage(err).startsWith("CONFLICT");
}

function newItemId(): string {
  return `item-${crypto.randomUUID().slice(0, 8)}`;
}

/*
 * Write queue.
 *
 * Every write to one list (or to app.json) runs strictly after the previous write to
 * the same target finishes, and computes its change from the latest saved state.
 * Without this, two quick actions (e.g. ticking two checkboxes) both started from the
 * same stale copy: one change was lost or the backend rejected it as a CONFLICT.
 */
const APP_STATE_KEY = "__app_state__";
const writeQueues = new Map<string, Promise<unknown>>();
let writeGeneration = 0;

function enqueue<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = writeQueues.get(key) ?? Promise.resolve();
  const run = previous.catch(() => undefined).then(task);
  writeQueues.set(key, run);
  run
    .finally(() => {
      if (writeQueues.get(key) === run) writeQueues.delete(key);
    })
    .catch(() => undefined);
  return run;
}

async function waitForPendingWrites(): Promise<void> {
  await Promise.allSettled(Array.from(writeQueues.values()));
}

function attachmentFiles(items: ListItem[]): string[] {
  return items.flatMap((it) => (it.attachments ?? []).map((a) => a.fileName));
}

export const useListyStore = create<ListyStore>((set, get) => {
  /** Turn an error into a user-facing one; reload from disk on conflicts. */
  const normalizeError = (err: unknown): Error => {
    if (isConflict(err)) {
      void get().refreshAll();
      return new Error(t("store.conflict"));
    }
    return err instanceof Error ? err : new Error(String(err));
  };

  const reportError = (err: unknown) => set({ error: normalizeError(err).message });

  /** A write finished: let refreshAll know, and tell the other windows. */
  const afterWrite = (notify = true) => {
    writeGeneration += 1;
    if (notify) storageApi.notifyChanged().catch(() => undefined);
  };

  /**
   * Apply `recipe` to the latest saved copy of a list and persist it. The recipe returns
   * the next list, or null to skip the write. Throws (normalized) on failure.
   */
  const mutateListOrThrow = (
    listId: string,
    recipe: (list: ListData) => ListData | null,
    undo?: UndoSpec
  ): Promise<ListData | null> =>
    enqueue(listId, async () => {
      const current = get().lists.find((l) => l.id === listId);
      if (!current) return null;
      const next = recipe(current);
      if (!next) return null;
      const updated = await storageApi.updateList(listId, next, current.updatedAt);
      set((s) => ({
        lists: s.lists.map((l) => (l.id === updated.id ? updated : l)),
        ...(undo
          ? {
              undoStack: [
                ...s.undoStack,
                {
                  listId,
                  items: current.items,
                  archivedItems: current.archivedItems ?? [],
                  label: undo.label,
                },
              ].slice(-UNDO_LIMIT),
            }
          : {}),
      }));
      if (undo?.toast) get().showToast(undo.label, true);
      afterWrite();
      return updated;
    }).catch((err) => {
      throw normalizeError(err);
    });

  /** Forget a list's undo steps (its attachment files were deleted, so they can't return). */
  const dropUndo = (listId: string) =>
    set((s) => ({ undoStack: s.undoStack.filter((u) => u.listId !== listId) }));

  /** Like mutateListOrThrow, but reports errors in the message bar. Resolves to success. */
  const mutateList = (
    listId: string,
    recipe: (list: ListData) => ListData | null,
    undo?: UndoSpec
  ): Promise<boolean> =>
    mutateListOrThrow(listId, recipe, undo).then(
      (updated) => updated !== null,
      (err) => {
        set({ error: rawMessage(err) });
        return false;
      }
    );

  /** Persist whatever app state is current once earlier app-state writes are done. */
  const persistAppState = (notify = true): Promise<void> =>
    enqueue(APP_STATE_KEY, async () => {
      await storageApi.updateAppState(get().appState);
      afterWrite(notify);
    }).catch(reportError);

  const removeAttachmentFiles = (listId: string, fileNames: string[]) => {
    for (const fileName of fileNames) {
      storageApi.removeAttachment(listId, fileName).catch(() => undefined);
    }
  };

  return {
    initialized: false,
    isLoading: false,
    error: null,
    storagePath: "",
    appState: DEFAULT_APP_STATE,
    lists: [],
    trashedLists: [],
    searchQuery: "",
    viewMode: "grid",
    sortBy: "updatedAt",
    sortOrder: "desc",
    toast: null,
    undoStack: [],

    clearError: () => set({ error: null }),
    reportError,
    setSearchQuery: (searchQuery) => set({ searchQuery }),
    setViewMode: (viewMode) => set({ viewMode }),
    setSort: (sortBy, sortOrder) => set({ sortBy, sortOrder }),
    showToast: (message, canUndo = false) =>
      set((s) => ({ toast: { id: (s.toast?.id ?? 0) + 1, message, canUndo } })),
    dismissToast: () => set({ toast: null }),

    undo: async () => {
      const stack = get().undoStack;
      const entry = stack[stack.length - 1];
      if (!entry) return false;
      set((s) => ({ undoStack: s.undoStack.slice(0, -1), toast: null }));
      const ok = await mutateList(entry.listId, (list) => ({
        ...list,
        items: entry.items,
        archivedItems: entry.archivedItems,
      }));
      if (ok) get().showToast(t("store.undone", { action: entry.label }));
      return ok;
    },

    init: async () => {
      set({ isLoading: true, error: null });
      try {
        const storagePath = await storageApi.initializeStorage();
        const [appState, lists, trashedLists] = await Promise.all([
          storageApi.getAppState(),
          storageApi.getAllLists(),
          storageApi.getTrashedLists(),
        ]);
        set({
          initialized: true,
          isLoading: false,
          storagePath,
          appState,
          lists,
          trashedLists,
          viewMode: appState.settings.defaultView,
          sortBy: appState.settings.sortBy,
          sortOrder: appState.settings.sortOrder,
        });
      } catch (err) {
        set({ isLoading: false, initialized: true, error: rawMessage(err) });
      }
    },

    refreshAll: async () => {
      // Never let a read that started before a write finished overwrite that write.
      await waitForPendingWrites();
      const generation = writeGeneration;
      try {
        const [storagePath, appState, lists, trashedLists] = await Promise.all([
          storageApi.getStoragePath(),
          storageApi.getAppState(),
          storageApi.getAllLists(),
          storageApi.getTrashedLists(),
        ]);
        if (generation !== writeGeneration) {
          return get().refreshAll();
        }
        set({ storagePath, appState, lists, trashedLists });
      } catch (err) {
        set({ error: rawMessage(err) });
      }
    },

    selectStorageFolder: async () => {
      try {
        const newPath = await storageApi.selectStorageFolder();
        if (!newPath) return;
        set({ storagePath: newPath });
        await get().refreshAll();
        storageApi.notifyChanged().catch(() => undefined);
      } catch (err) {
        reportError(err);
      }
    },

    openStorageFolder: async () => {
      try {
        await storageApi.openStorageFolder();
      } catch (err) {
        reportError(err);
      }
    },

    updateSettings: async (partial) => {
      const { appState } = get();
      const nextState: AppStateJson = {
        ...appState,
        settings: { ...appState.settings, ...partial },
      };
      set({
        appState: nextState,
        viewMode: nextState.settings.defaultView,
        sortBy: nextState.settings.sortBy,
        sortOrder: nextState.settings.sortOrder,
      });
      await persistAppState();
    },

    createList: async (payload) => {
      try {
        const created = await storageApi.createList(payload);
        set((s) => ({ lists: [created, ...s.lists] }));
        afterWrite();
        return created;
      } catch (err) {
        throw normalizeError(err);
      }
    },

    seedStarterLists: async () => {
      const created: ListData[] = [];
      try {
        for (const tpl of STARTER_TEMPLATES.slice(0, 3)) {
          created.push(await storageApi.createList(templateToPayload(tpl)));
        }
      } catch (err) {
        reportError(err);
      }
      if (created.length > 0) {
        set((s) => ({ lists: [...created.reverse(), ...s.lists] }));
        afterWrite();
      }
    },

    updateListDetails: async (id, patch) => {
      const updated = await mutateListOrThrow(id, (list) => ({ ...list, ...patch }));
      if (!updated) throw new Error("This list no longer exists.");
      return updated;
    },

    deleteList: async (id) => {
      try {
        await enqueue(id, () => storageApi.deleteList(id));
        const target = get().lists.find((l) => l.id === id);
        set((s) => ({
          lists: s.lists.filter((l) => l.id !== id),
          trashedLists: target ? [target, ...s.trashedLists] : s.trashedLists,
          appState: {
            ...s.appState,
            favorites: s.appState.favorites.filter((fid) => fid !== id),
            recentlyOpened: s.appState.recentlyOpened.filter((rid) => rid !== id),
          },
        }));
        afterWrite();
        await persistAppState(false);
        return true;
      } catch (err) {
        reportError(err);
        return false;
      }
    },

    restoreList: async (id) => {
      try {
        const restored = await enqueue(id, () => storageApi.restoreList(id));
        set((s) => ({
          trashedLists: s.trashedLists.filter((l) => l.id !== id),
          lists: [restored, ...s.lists.filter((l) => l.id !== id)],
        }));
        afterWrite();
        return true;
      } catch (err) {
        reportError(err);
        return false;
      }
    },

    permanentlyDeleteList: async (id) => {
      try {
        await enqueue(id, () => storageApi.permanentlyDeleteList(id));
        set((s) => ({ trashedLists: s.trashedLists.filter((l) => l.id !== id) }));
        afterWrite();
        return true;
      } catch (err) {
        reportError(err);
        return false;
      }
    },

    duplicateList: async (list) => {
      const now = new Date().toISOString();
      return get().createList({
        name: t("store.copyName", { name: list.name }),
        description: list.description,
        icon: list.icon,
        color: list.color,
        type: list.type,
        // Attachment files live in the source list's folder, so the copy can't reference them.
        items: list.items.map((item) => ({
          ...item,
          id: newItemId(),
          attachments: [],
          subtasks: (item.subtasks ?? []).map((st) => ({
            ...st,
            id: `sub-${crypto.randomUUID().slice(0, 8)}`,
          })),
          createdAt: now,
          updatedAt: now,
        })),
      });
    },

    toggleFavorite: async (id) => {
      set((s) => {
        const exists = s.appState.favorites.includes(id);
        const favorites = exists
          ? s.appState.favorites.filter((fid) => fid !== id)
          : [id, ...s.appState.favorites];
        return { appState: { ...s.appState, favorites } };
      });
      await persistAppState();
    },

    markRecentlyOpened: async (id) => {
      const { recentlyOpened } = get().appState;
      if (recentlyOpened[0] === id) return;
      set((s) => ({
        appState: {
          ...s.appState,
          recentlyOpened: [id, ...s.appState.recentlyOpened.filter((rid) => rid !== id)].slice(
            0,
            20
          ),
        },
      }));
      // Opening a list is not worth waking up the other windows for.
      await persistAppState(false);
    },

    exportList: async (list) => {
      try {
        return await storageApi.exportListWithDialog(list);
      } catch (err) {
        reportError(err);
        return false;
      }
    },

    importList: async () => {
      try {
        const imported = await storageApi.importListWithDialog();
        if (imported) {
          set((s) => ({ lists: [imported, ...s.lists] }));
          afterWrite();
        }
        return imported;
      } catch (err) {
        reportError(err);
        return null;
      }
    },

    exportBackup: async () => {
      try {
        return await storageApi.exportBackupWithDialog();
      } catch (err) {
        reportError(err);
        return false;
      }
    },

    importBackup: async () => {
      try {
        const report = await storageApi.importBackupWithDialog();
        if (report) {
          afterWrite();
          await get().refreshAll();
        }
        return report;
      } catch (err) {
        reportError(err);
        return null;
      }
    },

    addItem: (listId, title, extra) => {
      const trimmed = title.trim();
      if (!trimmed) return Promise.resolve(false);
      return mutateList(listId, (list) => {
        const now = new Date().toISOString();
        const newItem: ListItem = {
          id: newItemId(),
          title: trimmed,
          completed: false,
          tags: [],
          attachments: [],
          ...extra,
          subtasks: extra?.subtasks ?? [],
          createdAt: now,
          updatedAt: now,
        };
        return { ...list, items: [...list.items, newItem] };
      });
    },

    updateItem: async (listId, itemId, patch) => {
      const before = get()
        .lists.find((l) => l.id === listId)
        ?.items.find((i) => i.id === itemId);
      // Files removed in the editor are deleted after saving, so that change can't be undone.
      const kept = patch.attachments ?? before?.attachments ?? [];
      const removesFiles = (before?.attachments ?? []).some(
        (a) => !kept.some((b) => b.id === a.id)
      );
      if (removesFiles) dropUndo(listId);
      await mutateListOrThrow(
        listId,
        (list) => {
          const current = list.items.find((it) => it.id === itemId);
          if (!current) return null;
          let next: ListItem = { ...current, ...patch, updatedAt: new Date().toISOString() };
          // Completing a recurring item moves it to its next date instead.
          if (patch.completed && !current.completed && next.recurrence) {
            next = withCompletion(next, true, list.type);
          }
          return { ...list, items: list.items.map((it) => (it.id === itemId ? next : it)) };
        },
        removesFiles ? undefined : { label: t("store.itemUpdated") }
      );
    },

    setItemStatus: (listId, itemId, patch) =>
      mutateList(
        listId,
        (list) => {
          const current = list.items.find((it) => it.id === itemId);
          if (!current) return null;
          let next: ListItem = { ...current, ...patch, updatedAt: new Date().toISOString() };
          if (patch.completed && !current.completed && next.recurrence) {
            next = withCompletion(next, true, list.type);
          }
          return { ...list, items: list.items.map((it) => (it.id === itemId ? next : it)) };
        },
        { label: t("store.statusChanged") }
      ),

    toggleItem: (listId, itemId) =>
      mutateList(
        listId,
        (list) => {
          const target = list.items.find((it) => it.id === itemId);
          if (!target) return null;
          // Keeps status lists consistent when toggled from the widget or a menu, and
          // moves recurring items on to their next date.
          const next = withCompletion(target, !target.completed, list.type);
          return { ...list, items: list.items.map((it) => (it.id === itemId ? next : it)) };
        },
        { label: t("store.itemToggled") }
      ),

    toggleSubtask: (listId, itemId, subtaskId) =>
      mutateList(listId, (list) => {
        const target = list.items.find((it) => it.id === itemId);
        if (!target || !(target.subtasks ?? []).some((st) => st.id === subtaskId)) return null;
        const next: ListItem = {
          ...target,
          subtasks: target.subtasks.map((st) =>
            st.id === subtaskId ? { ...st, completed: !st.completed } : st
          ),
          updatedAt: new Date().toISOString(),
        };
        return { ...list, items: list.items.map((it) => (it.id === itemId ? next : it)) };
      }),

    deleteItem: (listId, itemId) =>
      mutateList(
        listId,
        (list) => {
          const target = list.items.find((it) => it.id === itemId);
          if (!target) return null;
          return {
            ...list,
            items: list.items.filter((it) => it.id !== itemId),
            archivedItems: [
              { ...target, updatedAt: new Date().toISOString() },
              ...(list.archivedItems ?? []),
            ],
          };
        },
        { label: t("store.itemArchived"), toast: true }
      ),

    archiveCompleted: (listId) =>
      mutateList(
        listId,
        (list) => {
          const completed = list.items.filter((i) => i.completed);
          if (completed.length === 0) return null;
          const now = new Date().toISOString();
          return {
            ...list,
            items: list.items.filter((i) => !i.completed),
            archivedItems: [
              ...completed.map((i) => ({ ...i, updatedAt: now })),
              ...(list.archivedItems ?? []),
            ],
          };
        },
        { label: t("store.completedArchived"), toast: true }
      ),

    restoreArchivedItem: (listId, itemId) =>
      mutateList(
        listId,
        (list) => {
          const target = (list.archivedItems ?? []).find((it) => it.id === itemId);
          if (!target) return null;
          return {
            ...list,
            items: [...list.items, { ...target, updatedAt: new Date().toISOString() }],
            archivedItems: (list.archivedItems ?? []).filter((it) => it.id !== itemId),
          };
        },
        { label: t("store.itemRestored") }
      ),

    permanentlyDeleteArchivedItem: async (listId, itemId) => {
      let removed: ListItem[] = [];
      const ok = await mutateList(listId, (list) => {
        removed = (list.archivedItems ?? []).filter((it) => it.id === itemId);
        if (removed.length === 0) return null;
        return {
          ...list,
          archivedItems: (list.archivedItems ?? []).filter((it) => it.id !== itemId),
        };
      });
      if (ok) {
        dropUndo(listId);
        removeAttachmentFiles(listId, attachmentFiles(removed));
      }
      return ok;
    },

    clearArchivedItems: async (listId) => {
      let removed: ListItem[] = [];
      const ok = await mutateList(listId, (list) => {
        removed = list.archivedItems ?? [];
        if (removed.length === 0) return null;
        return { ...list, archivedItems: [] };
      });
      if (ok) {
        dropUndo(listId);
        removeAttachmentFiles(listId, attachmentFiles(removed));
      }
      return ok;
    },

    reorderItems: (listId, fromId, toId) => {
      if (fromId === toId) return Promise.resolve(false);
      return mutateList(
        listId,
        (list) => {
          const items = [...list.items];
          const fromIdx = items.findIndex((i) => i.id === fromId);
          const toIdx = items.findIndex((i) => i.id === toId);
          if (fromIdx === -1 || toIdx === -1) return null;
          const [moved] = items.splice(fromIdx, 1);
          items.splice(toIdx, 0, moved);
          return { ...list, items };
        },
        { label: t("store.itemsReordered") }
      );
    },
  };
});
