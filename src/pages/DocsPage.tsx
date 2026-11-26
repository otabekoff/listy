import React, { useState } from "react";
import {
  AppWindow,
  BookOpen,
  CalendarCheck,
  ChevronDown,
  ChevronRight,
  Cpu,
  FileJson,
  FolderTree,
  Keyboard,
  Terminal,
} from "lucide-react";
import { Badge, Card, CodeBlock, CountBadge, Text, Title2 } from "../ui";
import { useT } from "../i18n/useT";

const InlineCode: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <code
    style={{
      padding: "1px 6px",
      borderRadius: "4px",
      fontSize: "12.5px",
      fontFamily: "Cascadia Code, Consolas, monospace",
      backgroundColor: "var(--win-bg-hover)",
      border: "1px solid var(--win-border-2)",
      color: "var(--win-brand-fg)",
    }}
  >
    {children}
  </code>
);

/** Renders **bold**, *italic* and `code` inside a translated sentence. */
const Rich: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g).map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
        return <InlineCode key={i}>{part.slice(1, -1)}</InlineCode>;
      }
      if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
        return <em key={i}>{part.slice(1, -1)}</em>;
      }
      return <React.Fragment key={i}>{part}</React.Fragment>;
    })}
  </>
);

const Para: React.FC<{ text: string }> = ({ text }) => (
  <Text size={300} style={{ color: "var(--win-fg-2)" }}>
    <Rich text={text} />
  </Text>
);

const Paras: React.FC<{ texts: string[] }> = ({ texts }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
    {texts.map((text) => (
      <Para key={text} text={text} />
    ))}
  </div>
);

const CLI_EXAMPLES = `# 1. Build release binaries (CLI + MCP)
cargo build --manifest-path src-tauri/Cargo.toml --release --bin listy-cli --bin listy-mcp

# 2. Check active storage folder
listy-cli path

# 3. List all lists, the trash, or inspect one
listy-cli lists
listy-cli trash
listy-cli get shopping-list

# 4. Search items in all lists
listy-cli search usb cable

# 5. Create a new list (checklist | simple | priority | status)
listy-cli create --name "Shopping List" --type checklist --icon shopping-cart --color "#3B82F6"

# 6. Add items (--notes, --repeat, --status, --subtasks and --url are optional)
listy-cli add-item shopping-list --title "USB-C Cable" --priority high --tags electronics --due 2026-12-01
listy-cli add-item my-tasks --title "Water the plants" --due 2026-12-01 --repeat weekly
listy-cli add-item my-tasks --title "Release v2" --notes "## Steps" --subtasks "Build;Test;Publish" --url https://example.com
listy-cli add-item my-board --title "Fix login bug" --status in_progress

# 7. Toggle, change status, or archive items
listy-cli toggle-item shopping-list item-1234abcd
listy-cli set-status my-board item-1234abcd done
listy-cli delete-item shopping-list item-1234abcd`;

const MCP_CONFIG = `{
  "mcpServers": {
    "listy": {
      "command": "D:\\\\Desktop\\\\listy\\\\src-tauri\\\\target\\\\release\\\\listy-mcp.exe",
      "args": []
    }
  }
}`;

const STORAGE_TREE = `MyLists/
├── app.json              # Theme, view, sort, favorites & recently opened
├── lists/
│   ├── shopping-list.json
│   └── my-tasks.json
├── trash/                # Soft-deleted lists (restorable)
└── attachments/          # Per-list attachment folders`;

const MCP_TOOLS = [
  { name: "get_storage_path", params: "—" },
  { name: "list_lists", params: "summary?" },
  { name: "list_trash", params: "—" },
  { name: "get_list", params: "id" },
  { name: "search", params: "query" },
  { name: "create_list", params: "name, description?, type?, icon?, color?" },
  { name: "delete_list", params: "id" },
  { name: "restore_list", params: "id" },
  {
    name: "add_item",
    params:
      "listId, title, description?, notes?, priority?, tags?, dueDate?, url?, status?, recurrence?, subtasks?",
  },
  {
    name: "update_item",
    params:
      "listId, itemId, title?, description?, notes?, priority?, tags?, dueDate?, url?, recurrence?, completed?, addSubtasks?, toggleSubtasks?",
  },
  { name: "set_status", params: "listId, itemId, status" },
  { name: "toggle_item", params: "listId, itemId" },
  { name: "delete_item", params: "listId, itemId" },
];

const SHORTCUTS = [
  { keys: "Ctrl+Shift+Space", key: "quickAdd" },
  { keys: "Ctrl+Alt+Space", key: "globalQuickAdd" },
  { keys: "Ctrl+T", key: "today" },
  { keys: "Ctrl+Z", key: "undo" },
];

const ROW_STYLE: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: "6px",
  backgroundColor: "var(--win-bg-subtle)",
  border: "1px solid var(--win-border-2)",
};

interface DocSectionItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge?: string;
  content: React.ReactNode;
}

export const DocsPage: React.FC = () => {
  const t = useT();
  const [openId, setOpenId] = useState<string | null>("usage");

  const sections: DocSectionItem[] = [
    {
      id: "usage",
      icon: <BookOpen size={18} color="var(--win-brand-fg)" />,
      title: t("docs.usage.title"),
      subtitle: t("docs.usage.subtitle"),
      content: (
        <Paras
          texts={[
            t("docs.usage.types"),
            t("docs.usage.items"),
            t("docs.usage.subtasks"),
            t("docs.usage.repeat"),
            t("docs.usage.deletion"),
            t("docs.usage.undo"),
          ]}
        />
      ),
    },
    {
      id: "today",
      icon: <CalendarCheck size={18} color="var(--win-brand-fg)" />,
      title: t("docs.today.title"),
      subtitle: t("docs.today.subtitle"),
      content: <Paras texts={[t("docs.today.page"), t("docs.today.reminders")]} />,
    },
    {
      id: "shortcuts",
      icon: <Keyboard size={18} color="var(--win-brand-fg)" />,
      title: t("docs.shortcuts.title"),
      subtitle: t("docs.shortcuts.subtitle"),
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {SHORTCUTS.map((sc) => (
              <div
                key={sc.keys}
                style={{ ...ROW_STYLE, display: "flex", alignItems: "center", gap: "12px" }}
              >
                <span style={{ minWidth: "140px", flexShrink: 0 }}>
                  <InlineCode>{sc.keys}</InlineCode>
                </span>
                <Text size={200} style={{ color: "var(--win-fg-2)" }}>
                  {t(`docs.shortcuts.${sc.key}`)}
                </Text>
              </div>
            ))}
          </div>
          <Para text={t("docs.shortcuts.globalNote")} />
        </div>
      ),
    },
    {
      id: "tray-widget",
      icon: <AppWindow size={18} color="var(--win-brand-fg)" />,
      title: t("docs.tray.title"),
      subtitle: t("docs.tray.subtitle"),
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <Paras
            texts={[
              t("docs.tray.tray"),
              t("docs.tray.closeToTray"),
              t("docs.tray.autostart"),
              t("docs.tray.widget"),
              t("docs.tray.updates"),
            ]}
          />
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <Text size={300} style={{ color: "var(--win-fg-2)" }}>
              <strong>{t("docs.tray.badges")}</strong>
            </Text>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12.5px" }}>
              1 = <CountBadge count={1} />
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12.5px" }}>
              2–9 = <CountBadge count={5} />
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12.5px" }}>
              10+ = <CountBadge count={14} />
            </span>
          </div>
        </div>
      ),
    },
    {
      id: "storage",
      icon: <FolderTree size={18} color="var(--win-brand-fg)" />,
      title: t("docs.storage.title"),
      subtitle: t("docs.storage.subtitle"),
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <Para text={t("docs.storage.files")} />
          <CodeBlock code={STORAGE_TREE} lang="bash" title={t("docs.storage.treeTitle")} />
          <Paras
            texts={[
              t("docs.storage.liveChanges"),
              t("docs.storage.backup"),
              t("docs.storage.exportList"),
            ]}
          />
        </div>
      ),
    },
    {
      id: "cli",
      icon: <Terminal size={18} color="var(--win-brand-fg)" />,
      title: t("docs.cli.title"),
      subtitle: t("docs.cli.subtitle"),
      badge: "listy-cli",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <Para text={t("docs.cli.storage")} />
          <CodeBlock code={CLI_EXAMPLES} lang="bash" title="PowerShell / Terminal" />
          <Paras
            texts={[t("docs.cli.commands"), t("docs.cli.addItemFlags"), t("docs.cli.help")]}
          />
        </div>
      ),
    },
    {
      id: "mcp",
      icon: <Cpu size={18} color="var(--win-brand-fg)" />,
      title: t("docs.mcp.title"),
      subtitle: t("docs.mcp.subtitle"),
      badge: t("docs.mcp.badge", { count: MCP_TOOLS.length }),
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <Para text={t("docs.mcp.intro")} />
          <CodeBlock code={MCP_CONFIG} lang="json" title={t("docs.mcp.configTitle")} />
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {MCP_TOOLS.map((tool) => (
              <div
                key={tool.name}
                style={{ ...ROW_STYLE, display: "flex", flexDirection: "column", gap: "4px" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <FileJson size={14} color="var(--win-fg-3)" />
                  <InlineCode>{tool.name}</InlineCode>
                  <Text size={200} style={{ color: "var(--win-fg-3)" }}>
                    {t(`docs.mcp.tool.${tool.name}`)}
                  </Text>
                </div>
                <div
                  style={{
                    paddingLeft: "22px",
                    fontSize: "11.5px",
                    fontFamily: "Cascadia Code, Consolas, monospace",
                    color: "var(--win-fg-3)",
                    wordBreak: "break-word",
                  }}
                >
                  {tool.params}
                </div>
              </div>
            ))}
          </div>
          <Paras texts={[t("docs.mcp.createList"), t("docs.mcp.updateItem")]} />
        </div>
      ),
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "18px",
        maxWidth: "840px",
        width: "100%",
        margin: "0 auto",
      }}
    >
      <div>
        <Title2>{t("docs.title")}</Title2>
        <Text size={300} style={{ color: "var(--win-fg-3)" }}>
          {t("docs.intro")}
        </Text>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {sections.map((sec) => {
          const isOpen = openId === sec.id;
          return (
            <Card key={sec.id} style={{ overflow: "hidden" }}>
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : sec.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  padding: "14px 18px",
                  border: "none",
                  background: "transparent",
                  color: "var(--win-fg-1)",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0 }}>
                  <span style={{ display: "inline-flex", flexShrink: 0 }}>
                    {sec.icon}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "14.5px", fontWeight: 600 }}>
                      {sec.title}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--win-fg-3)", marginTop: "2px" }}>
                      {sec.subtitle}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                  {sec.badge && (
                    <Badge appearance="tint" color="brand">
                      {sec.badge}
                    </Badge>
                  )}
                  {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
              </button>

              {isOpen && (
                <div
                  style={{
                    padding: "4px 18px 18px 50px",
                    borderTop: "1px solid var(--win-border-2)",
                    paddingTop: "14px",
                  }}
                >
                  {sec.content}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
