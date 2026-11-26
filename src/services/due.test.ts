import { describe, expect, it } from "vitest";
import type { ListData, ListItem, ListType } from "../types/listy";
import { collectDue, dueNowCount } from "./due";

const now = new Date(2026, 10, 26, 10, 0);

function item(id: string, dueDate?: string, completed = false): ListItem {
  return {
    id,
    title: id,
    completed,
    dueDate,
    tags: [],
    attachments: [],
    subtasks: [],
    createdAt: "t",
    updatedAt: "t",
  };
}

function list(id: string, type: ListType, items: ListItem[]): ListData {
  return {
    id,
    name: id,
    description: "",
    icon: "list",
    color: "#3B82F6",
    type,
    createdAt: "t",
    updatedAt: "t",
    items,
    archivedItems: [],
  };
}

describe("collectDue", () => {
  const lists = [
    list("a", "checklist", [
      item("late", "2026-11-20"),
      item("now", "2026-11-26"),
      item("soon", "2026-11-28"),
      item("far", "2027-01-10"),
      item("done", "2026-11-20", true),
      { ...item("doneNow", "2026-11-26", true), updatedAt: new Date(2026, 10, 26, 9, 0).toISOString() },
      item("undated"),
    ]),
    // Simple lists can't be completed, so they never count as due.
    list("b", "simple", [item("note", "2026-11-20")]),
  ];

  it("groups open items by how soon they are due", () => {
    const due = collectDue(lists, now);
    expect(due.overdue.map((e) => e.item.id)).toEqual(["late"]);
    expect(due.today.map((e) => e.item.id)).toEqual(["now"]);
    expect(due.upcoming.map((e) => e.item.id)).toEqual(["soon"]);
    expect(dueNowCount(lists, now)).toBe(2);
    // Completed today (doneNow) is listed; completed on an earlier day (done, updatedAt "t") is not.
    expect(due.doneToday.map((e) => e.item.id)).toEqual(["doneNow"]);
  });
});
