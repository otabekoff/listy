import { CreateListPayload, ListItem, ListType, Priority } from "../types/listy";
import { t } from "../i18n";

export interface StarterTemplateItem {
  title: string;
  description?: string;
  completed?: boolean;
  priority?: Priority;
  tags?: string[];
  dueDate?: string;
  url?: string;
  image?: string;
  notes?: string;
}

export interface StarterTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  type: ListType;
  items: StarterTemplateItem[];
}

/**
 * Template texts live in `i18n/locales/templates.ts`. Each text field is a getter, so it
 * follows the active language whenever a template is shown or turned into a list.
 */
interface TemplateItemDef extends Omit<StarterTemplateItem, "title" | "description" | "notes" | "tags"> {
  key: string;
  hasDescription?: boolean;
  hasNotes?: boolean;
  tags?: string[]; // tag keys
}

interface TemplateDef extends Omit<StarterTemplate, "name" | "description" | "items"> {
  key: string;
  items: TemplateItemDef[];
}

function localizeItem(tplKey: string, def: TemplateItemDef): StarterTemplateItem {
  const { key, hasDescription, hasNotes, tags, ...rest } = def;
  const prefix = `templates.${tplKey}.${key}`;
  return {
    ...rest,
    title: t(`${prefix}.title`),
    description: hasDescription ? t(`${prefix}.description`) : undefined,
    notes: hasNotes ? t(`${prefix}.notes`) : undefined,
    tags: tags?.map((tag) => t(`templates.tag.${tag}`)),
  };
}

function localize(def: TemplateDef): StarterTemplate {
  const { key, items, ...rest } = def;
  return {
    ...rest,
    get name() {
      return t(`templates.${key}.name`);
    },
    get description() {
      return t(`templates.${key}.description`);
    },
    get items() {
      return items.map((item) => localizeItem(key, item));
    },
  };
}

const TEMPLATE_DEFS: TemplateDef[] = [
  {
    id: "tpl-shopping",
    key: "shopping",
    icon: "shopping-cart",
    color: "#3B82F6",
    type: "checklist",
    items: [
      { key: "milk", tags: ["groceries"] },
      { key: "bread", tags: ["groceries"] },
      {
        key: "headphones",
        hasDescription: true,
        priority: "high",
        tags: ["electronics"],
        dueDate: "2026-12-01",
        image: "/templates/headphones.svg",
        hasNotes: true,
      },
      { key: "cable", tags: ["electronics"] },
      { key: "coffee", completed: true, tags: ["groceries"] },
    ],
  },
  {
    id: "tpl-tasks",
    key: "tasks",
    icon: "check",
    color: "#10B981",
    type: "checklist",
    items: [
      {
        key: "goals",
        priority: "high",
        tags: ["planning"],
        dueDate: "2026-11-28",
        hasNotes: true,
      },
      { key: "folder", priority: "normal", tags: ["work"] },
      {
        key: "dentist",
        priority: "low",
        tags: ["personal"],
        dueDate: "2026-12-05",
      },
    ],
  },
  {
    id: "tpl-books",
    key: "books",
    icon: "book",
    color: "#8B5CF6",
    type: "checklist",
    items: [
      {
        key: "cleanCode",
        hasDescription: true,
        tags: ["engineering"],
        hasNotes: true,
      },
      {
        key: "atomicHabits",
        hasDescription: true,
        tags: ["habits"],
        priority: "medium",
      },
      { key: "pragmatic", completed: true, tags: ["engineering"] },
    ],
  },
  {
    id: "tpl-movies",
    key: "movies",
    icon: "movie",
    color: "#EC4899",
    type: "simple",
    items: [
      {
        key: "interstellar",
        tags: ["scifi"],
        image: "/templates/interstellar.svg",
        hasNotes: true,
      },
      { key: "inception", tags: ["thriller"] },
      { key: "spiritedAway", tags: ["animation"] },
    ],
  },
  {
    id: "tpl-travel",
    key: "travel",
    icon: "travel",
    color: "#06B6D4",
    type: "simple",
    items: [
      {
        key: "tokyo",
        hasDescription: true,
        tags: ["asia"],
        dueDate: "2027-04-01",
        image: "/templates/tokyo.svg",
        hasNotes: true,
      },
      {
        key: "rome",
        hasDescription: true,
        tags: ["europe"],
        image: "/templates/rome.svg",
      },
    ],
  },
  {
    id: "tpl-dev",
    key: "dev",
    icon: "code",
    color: "#F59E0B",
    type: "checklist",
    items: [
      { key: "storage", completed: true, tags: ["backend"] },
      { key: "mcp", priority: "medium", tags: ["mcp", "cli"], hasNotes: true },
      { key: "tests", priority: "high", tags: ["qa"], dueDate: "2026-11-30" },
    ],
  },
];

export const STARTER_TEMPLATES: StarterTemplate[] = TEMPLATE_DEFS.map(localize);

export function templateToPayload(tpl: StarterTemplate): CreateListPayload {
  const now = new Date().toISOString();
  const items: ListItem[] = tpl.items.map((it) => ({
    id: `item-${crypto.randomUUID().slice(0, 8)}`,
    title: it.title,
    description: it.description,
    completed: Boolean(it.completed),
    notes: it.notes,
    tags: it.tags ?? [],
    priority: it.priority,
    dueDate: it.dueDate,
    url: it.url,
    image: it.image,
    subtasks: [],
    attachments: [],
    createdAt: now,
    updatedAt: now,
  }));
  return {
    name: tpl.name,
    description: tpl.description,
    icon: tpl.icon,
    color: tpl.color,
    type: tpl.type,
    items,
  };
}
