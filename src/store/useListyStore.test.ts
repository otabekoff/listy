import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ListData } from "../types/listy";

// In-memory stand-in for the Rust backend, including its optimistic-concurrency check.
const disk = new Map<string, ListData>();
let clock = 0;
const tick = () => new Promise((r) => setTimeout(r, 1));

vi.mock("../services/storageApi", () => ({
  storageApi: {
    isTauri: () => false,
    notifyChanged: vi.fn(async () => undefined),
    removeAttachment: vi.fn(async () => undefined),
    updateAppState: vi.fn(async (s: unknown) => s),
    getStoragePath: vi.fn(async () => "mem"),
    getAppState: vi.fn(async () => ({
      version: 1,
      settings: {
        theme: "system",
        defaultView: "grid",
        sortBy: "updatedAt",
        sortOrder: "desc",
        closeToTray: true,
        globalQuickAdd: true,
        dueReminders: true,
        language: "en",
      },
      favorites: [],
      recentlyOpened: [],
    })),
    getAllLists: vi.fn(async () => Array.from(disk.values())),
    getTrashedLists: vi.fn(async () => []),
    updateList: vi.fn(async (id: string, data: ListData, expected?: string) => {
      await tick();
      const current = disk.get(id);
      if (!current) throw new Error(`List '${id}' not found`);
      if (expected && current.updatedAt !== expected) {
        throw new Error("CONFLICT: List was modified externally. Please reload before saving.");
      }
      const saved = { ...data, updatedAt: `t${++clock}` };
      disk.set(id, saved);
      return saved;
    }),
  },
}));

const { useListyStore } = await import("./useListyStore");
const { storageApi } = await import("../services/storageApi");

function seed(): ListData {
  const list: ListData = {
    id: "groceries",
    name: "Groceries",
    description: "",
    icon: "list",
    color: "#3B82F6",
    type: "checklist",
    createdAt: "t0",
    updatedAt: "t0",
    items: ["a", "b", "c"].map((id) => ({
      id,
      title: id.toUpperCase(),
      subtasks: [],
      completed: false,
      tags: [],
      attachments: [],
      createdAt: "t0",
      updatedAt: "t0",
    })),
    archivedItems: [],
  };
  disk.clear();
  disk.set(list.id, list);
  useListyStore.setState({ lists: [list], error: null });
  return list;
}

describe("useListyStore write queue", () => {
  beforeEach(() => {
    clock = 0;
    vi.clearAllMocks();
  });

  it("keeps every change when edits to one list overlap", async () => {
    seed();
    const { toggleItem, addItem, updateListDetails } = useListyStore.getState();

    const results = await Promise.all([
      toggleItem("groceries", "a"),
      toggleItem("groceries", "b"),
      addItem("groceries", "  Milk  "),
      updateListDetails("groceries", { name: "Weekly groceries" }),
    ]);

    expect(results.slice(0, 3)).toEqual([true, true, true]);
    const saved = disk.get("groceries")!;
    expect(saved.items.filter((i) => i.completed).map((i) => i.id)).toEqual(["a", "b"]);
    expect(saved.items.map((i) => i.title)).toContain("Milk");
    expect(saved.name).toBe("Weekly groceries");
    expect(useListyStore.getState().lists[0]).toEqual(saved);
    expect(useListyStore.getState().error).toBeNull();
  });

  it("reports a conflict with a friendly message and reloads from disk", async () => {
    seed();
    // Someone else (widget / CLI) saved a newer version behind our back.
    disk.set("groceries", { ...disk.get("groceries")!, name: "Changed elsewhere", updatedAt: "ext" });

    const ok = await useListyStore.getState().toggleItem("groceries", "a");

    expect(ok).toBe(false);
    expect(useListyStore.getState().error).toMatch(/changed somewhere else/);
    await vi.waitFor(() =>
      expect(useListyStore.getState().lists[0].name).toBe("Changed elsewhere")
    );
  });

  it("deletes attachment files only after archived items are permanently removed", async () => {
    const list = seed();
    const archived = {
      ...list.items[0],
      attachments: [{ id: "att-1", name: "r.pdf", fileName: "att-1-r.pdf", size: 1 }],
    };
    disk.set(list.id, { ...list, archivedItems: [archived] });
    useListyStore.setState({ lists: [disk.get(list.id)!] });

    expect(await useListyStore.getState().clearArchivedItems(list.id)).toBe(true);
    expect(disk.get(list.id)!.archivedItems).toEqual([]);
    expect(storageApi.removeAttachment).toHaveBeenCalledWith(list.id, "att-1-r.pdf");
  });

  it("toggling an item in a status list keeps its status in sync", async () => {
    const list = seed();
    disk.set(list.id, { ...list, type: "status" });
    useListyStore.setState({ lists: [disk.get(list.id)!] });

    await useListyStore.getState().toggleItem(list.id, "a");
    expect(disk.get(list.id)!.items[0]).toMatchObject({ completed: true, status: "done" });
  });
});

describe("useListyStore undo", () => {
  beforeEach(() => {
    clock = 0;
    vi.clearAllMocks();
    useListyStore.setState({ undoStack: [], toast: null });
  });

  it("undoes archiving an item and offers Undo in a toast", async () => {
    seed();
    const { deleteItem } = useListyStore.getState();
    expect(await deleteItem("groceries", "b")).toBe(true);
    expect(disk.get("groceries")!.items.map((i) => i.id)).toEqual(["a", "c"]);
    expect(useListyStore.getState().toast?.canUndo).toBe(true);

    expect(await useListyStore.getState().undo()).toBe(true);
    const saved = disk.get("groceries")!;
    expect(saved.items.map((i) => i.id)).toEqual(["a", "b", "c"]);
    expect(saved.archivedItems).toEqual([]);
    expect(useListyStore.getState().undoStack).toEqual([]);
  });

  it("undoes checks quietly, newest first, and reports when nothing is left", async () => {
    seed();
    const { toggleItem } = useListyStore.getState();
    await toggleItem("groceries", "a");
    await toggleItem("groceries", "b");
    expect(useListyStore.getState().toast).toBeNull();

    await useListyStore.getState().undo();
    expect(disk.get("groceries")!.items.filter((i) => i.completed).map((i) => i.id)).toEqual(["a"]);
    await useListyStore.getState().undo();
    expect(disk.get("groceries")!.items.some((i) => i.completed)).toBe(false);
    expect(await useListyStore.getState().undo()).toBe(false);
  });

  it("moves a recurring item to its next date instead of completing it", async () => {
    const list = seed();
    const recurring = { ...list.items[0], dueDate: "2020-01-01", recurrence: "daily" as const };
    disk.set(list.id, { ...list, items: [recurring, ...list.items.slice(1)] });
    useListyStore.setState({ lists: [disk.get(list.id)!] });

    await useListyStore.getState().toggleItem(list.id, recurring.id);
    const saved = disk.get(list.id)!.items[0];
    expect(saved.completed).toBe(false);
    expect(saved.dueDate! > "2020-01-01").toBe(true);
  });
});
