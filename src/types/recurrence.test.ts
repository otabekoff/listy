import { describe, expect, it } from "vitest";
import { ListItem, nextDueDate, withCompletion } from "./listy";

const today = new Date(2026, 2, 10); // 2026-03-10, local time

function item(patch: Partial<ListItem> = {}): ListItem {
  return {
    id: "i",
    title: "Water plants",
    completed: false,
    tags: [],
    attachments: [],
    subtasks: [],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...patch,
  };
}

// The same cases as core::tests::recurrence_moves_due_date in Rust, so both sides agree.
describe("nextDueDate", () => {
  it("steps by the recurrence", () => {
    expect(nextDueDate("2026-03-10", "daily", today)).toBe("2026-03-11");
    expect(nextDueDate("2026-03-10", "weekly", today)).toBe("2026-03-17");
    expect(nextDueDate(undefined, "yearly", today)).toBe("2027-03-10");
  });

  it("moves overdue items to the first occurrence after today", () => {
    expect(nextDueDate("2026-03-01", "weekly", today)).toBe("2026-03-15");
  });

  it("clamps month ends", () => {
    expect(nextDueDate("2026-01-31", "monthly", new Date(2026, 0, 31))).toBe("2026-02-28");
  });
});

describe("withCompletion", () => {
  it("completes plain items and syncs status lists", () => {
    expect(withCompletion(item(), true, "checklist", today).completed).toBe(true);
    const done = withCompletion(item(), true, "status", today);
    expect(done.status).toBe("done");
    expect(withCompletion(done, false, "status", today).status).toBe("todo");
  });

  it("moves recurring items on instead of completing them", () => {
    const next = withCompletion(
      item({
        dueDate: "2026-03-10",
        recurrence: "daily",
        subtasks: [{ id: "s", title: "front", completed: true }],
      }),
      true,
      "checklist",
      today
    );
    expect(next.completed).toBe(false);
    expect(next.dueDate).toBe("2026-03-11");
    expect(next.subtasks[0].completed).toBe(false);
  });
});
