import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open, save } from "@tauri-apps/plugin-dialog";
import { t } from "../i18n";
import {
  AppStateJson,
  AppStateJsonSchema,
  AttachmentMeta,
  CreateListPayload,
  ListData,
  ListDataSchema,
} from "../types/listy";

function isTauriEnv(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

const LS_PREFIX = "listy_fallback_";

/** Event broadcast to every Listy window after this window writes to storage. */
const CHANGED_EVENT = "listy://data-changed";
/** Sent by the Rust file watcher when anything in the storage folder changes. */
const STORAGE_CHANGED_EVENT = "listy://storage-changed";

/** What a backup restore brought back. */
export interface RestoreReport {
  lists: number;
  trashed: number;
  attachments: number;
}

const ZIP_FILTER = { name: "Zip", extensions: ["zip"] };
const JSON_FILTER = { name: "JSON", extensions: ["json"] };

function hasAttachments(list: ListData): boolean {
  return [...list.items, ...(list.archivedItems ?? [])].some(
    (it) => (it.attachments?.length ?? 0) > 0
  );
}

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: unknown): void {
  localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
}

export const storageApi = {
  isTauri: isTauriEnv,

  async initializeStorage(): Promise<string> {
    if (!isTauriEnv()) {
      return lsGet("storage_path", "Browser LocalStorage (Demo)");
    }
    return invoke<string>("initialize_storage");
  },

  async getStoragePath(): Promise<string> {
    if (!isTauriEnv()) {
      return lsGet("storage_path", "Browser LocalStorage (Demo)");
    }
    return invoke<string>("get_storage_path");
  },

  async selectStorageFolder(): Promise<string | null> {
    if (!isTauriEnv()) {
      return null;
    }
    const selected = await open({
      directory: true,
      multiple: false,
      title: t("dialogs.selectStorage"),
    });
    if (!selected || Array.isArray(selected)) return null;
    return invoke<string>("set_storage_path", { path: selected });
  },

  async openStorageFolder(): Promise<void> {
    if (!isTauriEnv()) return;
    await invoke<void>("open_storage_folder");
  },

  /** Tell the other windows (main app / desktop widget) that data on disk changed. */
  async notifyChanged(): Promise<void> {
    if (!isTauriEnv()) return;
    await emit(CHANGED_EVENT, { source: getCurrentWindow().label });
  },

  /** Run `cb` when another window reports a storage change. Returns an unsubscribe fn. */
  onExternalChange(cb: () => void): () => void {
    if (!isTauriEnv()) return () => {};
    const self = getCurrentWindow().label;
    const unlisten = listen<{ source?: string }>(CHANGED_EVENT, (event) => {
      if (event.payload?.source !== self) cb();
    });
    return () => {
      unlisten.then((fn) => fn()).catch(() => {});
    };
  },

  /**
   * Run `cb` when files in the storage folder change, whoever changed them (another
   * window, listy-cli, listy-mcp, a sync client). Returns an unsubscribe fn.
   */
  onStorageChanged(cb: () => void): () => void {
    if (!isTauriEnv()) return () => {};
    const unlisten = listen(STORAGE_CHANGED_EVENT, () => cb());
    return () => {
      unlisten.then((fn) => fn()).catch(() => {});
    };
  },

  async getAppState(): Promise<AppStateJson> {
    if (!isTauriEnv()) {
      return AppStateJsonSchema.parse(lsGet("app_state", {}));
    }
    const raw = await invoke<AppStateJson>("get_app_state");
    return AppStateJsonSchema.parse(raw);
  },

  async updateAppState(state: AppStateJson): Promise<AppStateJson> {
    if (!isTauriEnv()) {
      lsSet("app_state", state);
      return state;
    }
    return invoke<AppStateJson>("update_app_state", { state });
  },

  async getAllLists(): Promise<ListData[]> {
    if (!isTauriEnv()) {
      return lsGet<unknown[]>("lists", []).map((l) => ListDataSchema.parse(l));
    }
    const raw = await invoke<ListData[]>("get_all_lists");
    return raw.map((l) => ListDataSchema.parse(l));
  },

  async getTrashedLists(): Promise<ListData[]> {
    if (!isTauriEnv()) {
      return lsGet<ListData[]>("trash", []);
    }
    const raw = await invoke<ListData[]>("get_trashed_lists");
    return raw.map((l) => ListDataSchema.parse(l));
  },

  async getList(id: string): Promise<ListData> {
    if (!isTauriEnv()) {
      const found = lsGet<ListData[]>("lists", []).find((l) => l.id === id);
      if (!found) throw new Error(`List '${id}' not found`);
      return found;
    }
    const raw = await invoke<ListData>("get_list", { id });
    return ListDataSchema.parse(raw);
  },

  async createList(data: CreateListPayload): Promise<ListData> {
    if (!isTauriEnv()) {
      const now = new Date().toISOString();
      const id =
        data.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || `list-${Date.now()}`;
      const list: ListData = {
        ...data,
        id: `${id}-${Math.floor(Math.random() * 1000)}`,
        createdAt: now,
        updatedAt: now,
        archivedItems: [],
      };
      const all = lsGet<ListData[]>("lists", []);
      lsSet("lists", [list, ...all]);
      return list;
    }
    return invoke<ListData>("create_list", { data });
  },

  async updateList(
    id: string,
    data: ListData,
    expectedUpdatedAt?: string
  ): Promise<ListData> {
    if (!isTauriEnv()) {
      const updated = { ...data, updatedAt: new Date().toISOString() };
      const all = lsGet<ListData[]>("lists", []).map((l) =>
        l.id === id ? updated : l
      );
      lsSet("lists", all);
      return updated;
    }
    return invoke<ListData>("update_list", {
      id,
      data,
      expectedUpdatedAt: expectedUpdatedAt ?? null,
    });
  },

  async deleteList(id: string): Promise<void> {
    if (!isTauriEnv()) {
      const all = lsGet<ListData[]>("lists", []);
      const target = all.find((l) => l.id === id);
      lsSet(
        "lists",
        all.filter((l) => l.id !== id)
      );
      if (target) {
        const trash = lsGet<ListData[]>("trash", []);
        lsSet("trash", [target, ...trash]);
      }
      return;
    }
    return invoke<void>("delete_list", { id });
  },

  async restoreList(id: string): Promise<ListData> {
    if (!isTauriEnv()) {
      const trash = lsGet<ListData[]>("trash", []);
      const target = trash.find((l) => l.id === id);
      if (!target) throw new Error("Not found in trash");
      lsSet(
        "trash",
        trash.filter((l) => l.id !== id)
      );
      const all = lsGet<ListData[]>("lists", []);
      lsSet("lists", [target, ...all]);
      return target;
    }
    return invoke<ListData>("restore_list", { id });
  },

  async permanentlyDeleteList(id: string): Promise<void> {
    if (!isTauriEnv()) {
      const trash = lsGet<ListData[]>("trash", []);
      lsSet(
        "trash",
        trash.filter((l) => l.id !== id)
      );
      return;
    }
    return invoke<void>("permanently_delete_list", { id });
  },

  async exportListWithDialog(list: ListData): Promise<boolean> {
    if (!isTauriEnv()) {
      const blob = new Blob([JSON.stringify(list, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${list.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      return true;
    }
    // Lists with files default to a .zip that carries them; plain JSON stays readable.
    const zipFirst = hasAttachments(list);
    const targetPath = await save({
      title: t("dialogs.exportList", { name: list.name }),
      defaultPath: `${list.id}.${zipFirst ? "zip" : "json"}`,
      filters: zipFirst ? [ZIP_FILTER, JSON_FILTER] : [JSON_FILTER, ZIP_FILTER],
    });
    if (!targetPath) return false;
    await invoke<void>("export_list", { id: list.id, path: targetPath });
    return true;
  },

  async importListWithDialog(): Promise<ListData | null> {
    if (!isTauriEnv()) return null;
    const sourcePath = await open({
      title: t("dialogs.importList"),
      multiple: false,
      filters: [{ name: "Listy", extensions: ["json", "zip"] }],
    });
    if (!sourcePath || Array.isArray(sourcePath)) return null;
    return invoke<ListData>("import_list", { path: sourcePath });
  },

  async exportBackupWithDialog(): Promise<boolean> {
    if (!isTauriEnv()) {
      const lists = lsGet<ListData[]>("lists", []);
      const appState = lsGet("app_state", {});
      const blob = new Blob(
        [
          JSON.stringify(
            {
              version: 1,
              exportedAt: new Date().toISOString(),
              appState,
              lists,
            },
            null,
            2
          ),
        ],
        { type: "application/json" }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `listy-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      return true;
    }
    const targetPath = await save({
      title: t("dialogs.exportBackup"),
      defaultPath: `listy-backup-${new Date().toISOString().slice(0, 10)}.zip`,
      filters: [ZIP_FILTER, JSON_FILTER],
    });
    if (!targetPath) return false;
    await invoke<void>("export_backup", { path: targetPath });
    return true;
  },

  async importBackupWithDialog(): Promise<RestoreReport | null> {
    if (!isTauriEnv()) return null;
    const sourcePath = await open({
      title: t("dialogs.restoreBackup"),
      multiple: false,
      filters: [{ name: "Listy backup", extensions: ["zip", "json"] }],
    });
    if (!sourcePath || Array.isArray(sourcePath)) return null;
    return invoke<RestoreReport>("import_backup", { path: sourcePath });
  },

  async attachFilesWithDialog(listId: string): Promise<AttachmentMeta[]> {
    if (!isTauriEnv()) return [];
    const selected = await open({
      title: t("dialogs.attachFiles"),
      multiple: true,
    });
    if (!selected) return [];
    const paths = Array.isArray(selected) ? selected : [selected];
    const results: AttachmentMeta[] = [];
    for (const p of paths) {
      const meta = await invoke<AttachmentMeta>("attach_file_to_list", {
        listId,
        sourcePath: p,
      });
      results.push(meta);
    }
    return results;
  },

  async openAttachment(listId: string, fileName: string): Promise<void> {
    if (!isTauriEnv()) return;
    await invoke<void>("open_attachment", { listId, fileName });
  },

  async removeAttachment(listId: string, fileName: string): Promise<void> {
    if (!isTauriEnv()) return;
    await invoke<void>("remove_attachment_file", { listId, fileName });
  },

  async toggleDesktopWidget(): Promise<void> {
    if (!isTauriEnv()) return;
    await invoke<void>("toggle_desktop_widget");
  },

  async setWidgetDesktopMode(stickToDesktop: boolean): Promise<void> {
    if (!isTauriEnv()) return;
    await invoke<void>("set_widget_desktop_mode", { stickToDesktop });
  },

  async showMainWindow(): Promise<void> {
    if (!isTauriEnv()) return;
    await invoke<void>("show_main_window");
  },

  /** Turn the system-wide Quick Add shortcut (Ctrl+Alt+Space) on or off. */
  async setGlobalQuickAdd(enabled: boolean): Promise<void> {
    if (!isTauriEnv()) return;
    await invoke<void>("set_global_quick_add", { enabled });
  },

  /** Hide the calling window (the Quick Add window closes itself this way). */
  async hideCurrentWindow(): Promise<void> {
    if (!isTauriEnv()) return;
    await invoke<void>("hide_window");
  },

  /** Hide the main window to the tray. */
  async hideMainWindow(): Promise<void> {
    if (!isTauriEnv()) return;
    await getCurrentWindow().hide();
  },

  async isAutostartEnabled(): Promise<boolean> {
    if (!isTauriEnv()) return false;
    const { isEnabled } = await import("@tauri-apps/plugin-autostart");
    return isEnabled();
  },

  async setAutostart(enabled: boolean): Promise<void> {
    if (!isTauriEnv()) return;
    const { enable, disable } = await import("@tauri-apps/plugin-autostart");
    await (enabled ? enable() : disable());
  },
};
