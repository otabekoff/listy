import { z } from "zod";
import { intlLocale, t } from "../i18n";

export const PrioritySchema = z.enum(["low", "normal", "medium", "high"]);
export type Priority = z.infer<typeof PrioritySchema>;

export const ListTypeSchema = z.enum(["simple", "checklist", "priority", "status"]);
export type ListType = z.infer<typeof ListTypeSchema>;

export const ItemStatusSchema = z.enum(["todo", "in_progress", "done"]);
export type ItemStatus = z.infer<typeof ItemStatusSchema>;

export const RecurrenceSchema = z.enum(["daily", "weekly", "monthly", "yearly"]);
export type Recurrence = z.infer<typeof RecurrenceSchema>;

export const SubtaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean().default(false),
});
export type Subtask = z.infer<typeof SubtaskSchema>;

export const AttachmentMetaSchema = z.object({
  id: z.string(),
  name: z.string(),
  fileName: z.string(),
  size: z.number(),
});
export type AttachmentMeta = z.infer<typeof AttachmentMetaSchema>;

export const ListItemSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  completed: z.boolean().default(false),
  status: ItemStatusSchema.optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
  priority: PrioritySchema.optional(),
  dueDate: z.string().optional(),
  url: z.string().optional(),
  image: z.string().optional(),
  attachments: z.array(AttachmentMetaSchema).default([]),
  subtasks: z.array(SubtaskSchema).default([]),
  recurrence: RecurrenceSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ListItem = z.infer<typeof ListItemSchema>;

export const ListDataSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().default(""),
  icon: z.string().default("list"),
  color: z.string().default("#3B82F6"),
  type: ListTypeSchema.default("checklist"),
  createdAt: z.string(),
  updatedAt: z.string(),
  items: z.array(ListItemSchema).default([]),
  archivedItems: z.array(ListItemSchema).default([]),
});
export type ListData = z.infer<typeof ListDataSchema>;

export const CreateListPayloadSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  icon: z.string().default("list"),
  color: z.string().default("#3B82F6"),
  type: ListTypeSchema.default("checklist"),
  items: z.array(ListItemSchema).default([]),
});
export type CreateListPayload = z.infer<typeof CreateListPayloadSchema>;

const DEFAULT_SETTINGS_INPUT = {
  theme: "system",
  defaultView: "grid",
  sortBy: "updatedAt",
  sortOrder: "desc",
  closeToTray: true,
  globalQuickAdd: true,
  dueReminders: true,
  language: "auto",
} as const;

export const AppSettingsSchema = z.object({
  theme: z.enum(["system", "light", "dark"]).default("system"),
  defaultView: z.enum(["grid", "list"]).default("grid"),
  sortBy: z.enum(["updatedAt", "createdAt", "name", "itemCount"]).default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  /** Closing the main window hides it to the tray. */
  closeToTray: z.boolean().default(true),
  /** System-wide Quick Add shortcut (Ctrl+Alt+Space). */
  globalQuickAdd: z.boolean().default(true),
  /** Daily notification about items due today or overdue. */
  dueReminders: z.boolean().default(true),
  language: z.enum(["auto", "en", "uz", "ru"]).default("auto"),
});
export type AppSettings = z.infer<typeof AppSettingsSchema>;

export const AppStateJsonSchema = z.object({
  version: z.number().default(1),
  settings: AppSettingsSchema.default(DEFAULT_SETTINGS_INPUT),
  favorites: z.array(z.string()).default([]),
  recentlyOpened: z.array(z.string()).default([]),
});
export type AppStateJson = z.infer<typeof AppStateJsonSchema>;

export interface IconOption {
  id: string;
  emoji: string;
  label: string;
}

export const LIST_ICONS: IconOption[] = [
  { id: "list", emoji: "📝", label: "List" },
  { id: "shopping-cart", emoji: "🛒", label: "Shopping" },
  { id: "check", emoji: "✅", label: "Tasks" },
  { id: "book", emoji: "📚", label: "Books" },
  { id: "movie", emoji: "🎬", label: "Movies" },
  { id: "idea", emoji: "💡", label: "Ideas" },
  { id: "travel", emoji: "✈️", label: "Travel" },
  { id: "code", emoji: "💻", label: "Dev" },
  { id: "home", emoji: "🏠", label: "Home" },
  { id: "star", emoji: "⭐", label: "Goals" },
  { id: "music", emoji: "🎵", label: "Music" },
  { id: "food", emoji: "🍽️", label: "Food" },
];

export const LIST_COLORS: string[] = [
  "#FFFFFF", // White
  "#111827", // Black
  "#3B82F6", // Blue
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Violet
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#64748B", // Slate
];

export function getIconEmoji(iconId: string): string {
  return LIST_ICONS.find((i) => i.id === iconId)?.emoji ?? "📝";
}

export function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return t("common.updatedRecently");
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startOfToday - startOfDate) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return t("common.updatedToday");
  if (diffDays === 1) return t("common.updatedYesterday");
  if (diffDays < 7) return t("common.updatedDaysAgo", { count: diffDays });
  return t("common.updatedOn", { date: date.toLocaleDateString(intlLocale()) });
}

export interface DueDateInfo {
  label: string;
  /** "overdue" | "today" | "soon" (within 2 days) | "later" */
  state: "overdue" | "today" | "soon" | "later";
}

/** Parse a `YYYY-MM-DD` date as a local date, or null. */
export function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** Format a local date as `YYYY-MM-DD`. */
export function toDateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Describe a `YYYY-MM-DD` due date relative to `now` (local time). */
export function describeDueDate(due: string, now: Date = new Date()): DueDateInfo {
  const date = parseLocalDate(due);
  if (!date) return { label: t("common.dueOn", { date: due }), state: "later" };
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  const sameYear = date.getFullYear() === today.getFullYear();
  const formatted = date.toLocaleDateString(intlLocale(), {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  if (diffDays < 0) {
    const when = diffDays === -1 ? t("common.yesterday") : formatted;
    return { label: t("common.overdue", { when }), state: "overdue" };
  }
  if (diffDays === 0) return { label: t("common.dueToday"), state: "today" };
  if (diffDays === 1) return { label: t("common.dueTomorrow"), state: "soon" };
  if (diffDays === 2) return { label: t("common.dueOn", { date: formatted }), state: "soon" };
  return { label: t("common.dueOn", { date: formatted }), state: "later" };
}

function addMonthsClamped(date: Date, months: number): Date {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), lastDay));
  return target;
}

function stepDate(date: Date, recurrence: Recurrence): Date {
  switch (recurrence) {
    case "daily":
      return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    case "weekly":
      return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7);
    case "monthly":
      return addMonthsClamped(date, 1);
    case "yearly":
      return addMonthsClamped(date, 12);
  }
}

/**
 * The next due date of a recurring item completed on `today`: one step after its due
 * date, moved on until it is after today. Mirrors `core::next_due_date` in Rust.
 */
export function nextDueDate(
  due: string | undefined,
  recurrence: Recurrence,
  today: Date = new Date()
): string {
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let next = stepDate((due && parseLocalDate(due)) || todayStart, recurrence);
  for (let i = 0; i < 5000 && next.getTime() <= todayStart.getTime(); i++) {
    next = stepDate(next, recurrence);
  }
  return toDateKey(next);
}

/**
 * Mark an item completed or not. Completing a recurring item instead moves its due date to
 * the next occurrence and resets it (and its subtasks). Mirrors `core::set_item_completed`.
 */
export function withCompletion(
  item: ListItem,
  completed: boolean,
  listType: ListType,
  today: Date = new Date()
): ListItem {
  const updatedAt = new Date().toISOString();
  if (completed && item.recurrence) {
    return {
      ...item,
      completed: false,
      dueDate: nextDueDate(item.dueDate, item.recurrence, today),
      ...(listType === "status" || item.status ? { status: "todo" as const } : {}),
      subtasks: (item.subtasks ?? []).map((s) => ({ ...s, completed: false })),
      updatedAt,
    };
  }
  return {
    ...item,
    completed,
    ...(listType === "status"
      ? { status: completed ? ("done" as const) : ("todo" as const) }
      : {}),
    updatedAt,
  };
}
