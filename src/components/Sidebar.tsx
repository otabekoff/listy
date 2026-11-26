import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CalendarCheck, PanelLeft, Plus } from "lucide-react";
import { useT } from "../i18n/useT";
import { dueNowCount } from "../services/due";
import { Button, CountBadge, Keycaps, Tooltip } from "../ui";
import { useListyStore } from "../store/useListyStore";
import {
  NavDocsIcon,
  NavFavoritesIcon,
  NavHomeIcon,
  NavListsIcon,
  NavSettingsIcon,
  NavShortcutsIcon,
  NavTrashIcon,
} from "./NavIcons";
import { ListyLogo } from "./ListyLogo";

interface SidebarProps {
  collapsed: boolean;
  isFullscreen: boolean;
  onToggleSidebar: () => void;
  onQuickAdd: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  isFullscreen,
  onToggleSidebar,
  onQuickAdd,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const t = useT();
  const trashedCount = useListyStore((s) => s.trashedLists.length);
  const lists = useListyStore((s) => s.lists);
  const listsCount = lists.length;
  const dueCount = useMemo(() => dueNowCount(lists), [lists]);

  const navItems = [
    { path: "/", label: t("nav.home"), icon: <NavHomeIcon size={22} /> },
    {
      path: "/today",
      label: t("nav.today"),
      icon: <CalendarCheck size={20} strokeWidth={1.7} style={{ margin: "0 1px" }} />,
      badge: dueCount > 0 ? dueCount : undefined,
    },
    { path: "/all", label: t("nav.allLists"), icon: <NavListsIcon size={22} /> },
    { path: "/favorites", label: t("nav.favorites"), icon: <NavFavoritesIcon size={22} /> },
    {
      path: "/trash",
      label: t("nav.trash"),
      icon: <NavTrashIcon size={22} />,
      badge: trashedCount > 0 ? trashedCount : undefined,
    },
    { path: "/shortcuts", label: t("nav.shortcuts"), icon: <NavShortcutsIcon size={22} /> },
  ];

  const docsActive = location.pathname === "/docs";
  const settingsActive = location.pathname === "/settings";

  return (
    <aside className={`listy-sidebar ${collapsed ? "collapsed" : ""}`}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "0 2px 16px 2px",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {isFullscreen ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                height: "38px",
                padding: "0 6px",
              }}
            >
              <ListyLogo size={24} />
              <span
                style={{
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "var(--win-fg-1)",
                  letterSpacing: "0.01em",
                }}
              >
                Listy
              </span>
            </div>
          ) : (
            <Tooltip
              content={
                <span
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
                >
                  <span>{t("app.quickAdd")}</span>
                  <Keycaps keys={["Ctrl", "Shift", "Space"]} size="small" />
                </span>
              }
              placement="bottom"
              fullWidth
            >
              <Button
                appearance="primary"
                icon={<Plus size={17} />}
                style={{
                  width: "100%",
                  height: "38px",
                  fontSize: "14.5px",
                  borderRadius: "8px",
                }}
                disabled={listsCount === 0}
                onClick={onQuickAdd}
              >
                {t("app.quickAdd")}
              </Button>
            </Tooltip>
          )}
        </div>

        <Tooltip
          content={
            <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <span>{t("nav.hideSidebar")}</span>
              <Keycaps keys={["Ctrl", "B"]} size="small" />
            </span>
          }
          placement="bottom"
        >
          <Button
            appearance="subtle"
            icon={<PanelLeft size={17} />}
            aria-label={t("nav.hideSidebar")}
            style={{ width: "38px", height: "38px", borderRadius: "8px", flexShrink: 0 }}
            onClick={onToggleSidebar}
          />
        </Tooltip>
      </div>

      <nav className="listy-sidebar-nav">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Button
              key={item.path}
              appearance={active ? "subtle" : "transparent"}
              icon={item.icon}
              onClick={() => navigate(item.path)}
              className={`listy-nav-btn ${active ? "active" : ""}`}
            >
              {active && <span className="listy-nav-indicator" />}
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                }}
              >
                <span>{item.label}</span>
                {item.badge !== undefined && <CountBadge count={item.badge} />}
              </span>
            </Button>
          );
        })}
      </nav>

      <div
        className="listy-sidebar-footer"
        style={{ display: "flex", flexDirection: "column", gap: "4px" }}
      >
        <Button
          appearance={docsActive ? "subtle" : "transparent"}
          icon={<NavDocsIcon size={22} />}
          onClick={() => navigate("/docs")}
          className={`listy-nav-btn ${docsActive ? "active" : ""}`}
        >
          {docsActive && <span className="listy-nav-indicator" />}
          <span>{t("nav.docs")}</span>
        </Button>

        <Button
          appearance={settingsActive ? "subtle" : "transparent"}
          icon={<NavSettingsIcon size={22} />}
          onClick={() => navigate("/settings")}
          className={`listy-nav-btn ${settingsActive ? "active" : ""}`}
        >
          {settingsActive && <span className="listy-nav-indicator" />}
          <span>{t("nav.settings")}</span>
        </Button>
      </div>
    </aside>
  );
};
