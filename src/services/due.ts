import { ListData, ListItem, parseLocalDate, toDateKey } from "../types/listy";

export interface DueEntry {
  list: ListData;
  item: ListItem;
  /** Days from today: negative = overdue, 0 = today. */
  days: number;
}

export interface DueSummary {
  overdue: DueEntry[];
  today: DueEntry[];
  /** Due in the next `upcomingDays` days (tomorrow onwards). */
  upcoming: DueEntry[];
  /** Items with a due date that were completed today, so ticking one off is visible. */
  doneToday: DueEntry[];
}

/**
 * Open items with a due date across all lists. Simple lists are left out: their items
 * can't be completed, so they would stay "due" forever.
 */
export function collectDue(lists: ListData[], now = new Date(), upcomingDays = 7): DueSummary {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const summary: DueSummary = { overdue: [], today: [], upcoming: [], doneToday: [] };
  const todayKey = toDateKey(now);
  for (const list of lists) {
    if (list.type === "simple") continue;
    for (const item of list.items) {
      if (!item.dueDate) continue;
      const date = parseLocalDate(item.dueDate);
      if (!date) continue;
      const days = Math.round((date.getTime() - today) / 86_400_000);
      const entry = { list, item, days };
      if (item.completed) {
        const doneAt = new Date(item.updatedAt);
        if (!Number.isNaN(doneAt.getTime()) && toDateKey(doneAt) === todayKey) {
          summary.doneToday.push(entry);
        }
        continue;
      }
      if (days < 0) summary.overdue.push(entry);
      else if (days === 0) summary.today.push(entry);
      else if (days <= upcomingDays) summary.upcoming.push(entry);
    }
  }
  const byDate = (a: DueEntry, b: DueEntry) => a.days - b.days || a.item.title.localeCompare(b.item.title);
  summary.overdue.sort(byDate);
  summary.today.sort(byDate);
  summary.upcoming.sort(byDate);
  summary.doneToday.sort(byDate);
  return summary;
}

/** Number of items due today or overdue. */
export function dueNowCount(lists: ListData[], now = new Date()): number {
  const { overdue, today } = collectDue(lists, now, 0);
  return overdue.length + today.length;
}

const REMINDED_KEY = "listy_reminded_on";
/** Hour of the day (local) from which the daily reminder may be shown. */
export const REMINDER_HOUR = 9;

/** True when today's reminder is due and has not been shown yet. */
export function shouldRemind(now = new Date()): boolean {
  if (now.getHours() < REMINDER_HOUR) return false;
  try {
    return localStorage.getItem(REMINDED_KEY) !== toDateKey(now);
  } catch {
    return false;
  }
}

export function markReminded(now = new Date()): void {
  try {
    localStorage.setItem(REMINDED_KEY, toDateKey(now));
  } catch {
    // Storage unavailable: the reminder may repeat, which is harmless.
  }
}
