import { describe, expect, it } from "vitest";
import {
  AppStateJsonSchema,
  ListDataSchema,
  describeDueDate,
  formatRelativeDate,
  getIconEmoji,
} from "./listy";

describe("Listy schemas and helpers", () => {
  it("parses valid list JSON with optional item metadata", () => {
    const parsed = ListDataSchema.parse({
      id: "shopping-list",
      name: "Shopping List",
      description: "Things I want to buy",
      icon: "shopping-cart",
      color: "#3B82F6",
      type: "checklist",
      createdAt: "2026-11-25T10:00:00Z",
      updatedAt: "2026-11-25T12:00:00Z",
      items: [
        {
          id: "item-001",
          title: "Wireless Headphones",
          completed: false,
          priority: "high",
          tags: ["electronics"],
          createdAt: "2026-11-25T10:30:00Z",
          updatedAt: "2026-11-25T10:30:00Z",
        },
      ],
    });
    expect(parsed.items[0].tags).toEqual(["electronics"]);
    expect(parsed.type).toBe("checklist");
  });

  it("applies default AppStateJson values", () => {
    const state = AppStateJsonSchema.parse({});
    expect(state.version).toBe(1);
    expect(state.settings.theme).toBe("system");
    expect(state.settings.defaultView).toBe("grid");
    expect(state.favorites).toEqual([]);
  });

  it("maps icon ids and formats dates", () => {
    expect(getIconEmoji("shopping-cart")).toBe("🛒");
    expect(getIconEmoji("unknown-icon")).toBe("📝");
    expect(formatRelativeDate(new Date().toISOString())).toBe("Updated today");
  });

  it("describes due dates relative to today", () => {
    const now = new Date(2026, 10, 26, 15, 30);
    expect(describeDueDate("2026-11-26", now)).toEqual({ label: "Due today", state: "today" });
    expect(describeDueDate("2026-11-27", now).label).toBe("Due tomorrow");
    expect(describeDueDate("2026-11-28", now).state).toBe("soon");
    expect(describeDueDate("2026-12-20", now).state).toBe("later");
    expect(describeDueDate("2026-11-25", now)).toEqual({
      label: "Overdue · yesterday",
      state: "overdue",
    });
    expect(describeDueDate("2026-11-01", now).state).toBe("overdue");
    expect(describeDueDate("not-a-date", now)).toEqual({ label: "Due not-a-date", state: "later" });
  });
});
