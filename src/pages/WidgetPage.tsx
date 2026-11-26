import React, { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Maximize2, Monitor, Pin, Plus, X } from "lucide-react";
import { Button, Checkbox, Dropdown, Input, Option, Text } from "../ui";
import { ListIcon } from "../components/ListIcon";
import { ListyLogo } from "../components/ListyLogo";
import { storageApi } from "../services/storageApi";
import { useT } from "../i18n/useT";
import { useListyStore } from "../store/useListyStore";

export const WidgetPage: React.FC = () => {
  const t = useT();
  const lists = useListyStore((s) => s.lists);
  const addItem = useListyStore((s) => s.addItem);
  const toggleItem = useListyStore((s) => s.toggleItem);
  const error = useListyStore((s) => s.error);
  const clearError = useListyStore((s) => s.clearError);

  const [selectedId, setSelectedId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [mode, setMode] = useState<"normal" | "top" | "desktop">(() => {
    const saved = localStorage.getItem("listy_widget_mode");
    return saved === "top" || saved === "normal" ? saved : "desktop";
  });

  useEffect(() => {
    if (!selectedId && lists.length > 0) {
      setSelectedId(lists[0].id);
    }
  }, [lists, selectedId]);

  useEffect(() => {
    localStorage.setItem("listy_widget_mode", mode);
    if (!storageApi.isTauri()) return;
    const win = getCurrentWindow();
    const apply =
      mode === "top"
        ? storageApi.setWidgetDesktopMode(false).then(() => win.setAlwaysOnTop(true))
        : win
            .setAlwaysOnTop(false)
            .then(() => storageApi.setWidgetDesktopMode(mode === "desktop"));
    apply.catch(() => undefined);
  }, [mode]);

  const activeList = lists.find((l) => l.id === selectedId) ?? lists[0];

  const handleTogglePin = () => {
    setMode((m) => (m === "top" ? "normal" : "top"));
  };

  const handleToggleDesktop = () => {
    setMode((m) => (m === "desktop" ? "normal" : "desktop"));
  };

  const handleCloseWidget = async () => {
    if (storageApi.isTauri()) {
      await getCurrentWindow().hide();
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeList || !newTitle.trim()) return;
    if (await addItem(activeList.id, newTitle)) setNewTitle("");
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        background: "var(--win-mica-bg)",
        border: "1px solid var(--win-border-1)",
      }}
    >
      <header
        data-tauri-drag-region
        style={{
          height: "38px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 8px 0 12px",
          backgroundColor: "var(--win-bg-appbar)",
          borderBottom: "1px solid var(--win-border-1)",
          userSelect: "none",
          flexShrink: 0,
        }}
      >
        <div
          data-tauri-drag-region
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <ListyLogo size={16} />
          <Text size={200} weight="semibold">
            {t("widget.title")}
          </Text>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
          <Button
            appearance={mode === "desktop" ? "primary" : "subtle"}
            size="small"
            icon={<Monitor size={13} />}
            aria-label={t("widget.stickDesktop")}
            title={
              mode === "desktop"
                ? t("widget.unstickDesktop")
                : t("widget.stickDesktopHint")
            }
            onClick={handleToggleDesktop}
          />
          <Button
            appearance={mode === "top" ? "primary" : "subtle"}
            size="small"
            icon={<Pin size={13} />}
            aria-label={t("widget.pinTop")}
            title={mode === "top" ? t("widget.unpinTop") : t("widget.pinTop")}
            onClick={handleTogglePin}
          />
          <Button
            appearance="subtle"
            size="small"
            icon={<Maximize2 size={13} />}
            aria-label={t("widget.openFull")}
            title={t("widget.openListy")}
            onClick={() => storageApi.showMainWindow()}
          />
          <Button
            appearance="subtle"
            size="small"
            icon={<X size={14} />}
            aria-label={t("widget.hide")}
            onClick={handleCloseWidget}
          />
        </div>
      </header>

      <div
        style={{
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          flex: 1,
          minHeight: 0,
        }}
      >
        <Dropdown
          value={activeList ? activeList.name : t("widget.noLists")}
          selectedOptions={activeList ? [activeList.id] : []}
          onOptionSelect={(_, d) => {
            if (d.optionValue) setSelectedId(d.optionValue);
          }}
        >
          {lists.map((l) => (
            <Option key={l.id} value={l.id}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                <ListIcon iconId={l.icon} size={14} color={l.color} />
                {l.name}
              </span>
            </Option>
          ))}
        </Dropdown>

        {error && (
          <div role="alert" className="listy-widget-error">
            <span>{error}</span>
            <button type="button" aria-label={t("widget.dismissError")} onClick={clearError}>
              <X size={12} />
            </button>
          </div>
        )}

        {activeList && (
          <form onSubmit={handleAdd} style={{ display: "flex", gap: "6px" }}>
            <Input
              style={{ flex: 1 }}
              placeholder={t("widget.quickAddPlaceholder")}
              aria-label={t("widget.addItemTo", { name: activeList.name })}
              value={newTitle}
              onChange={(_, d) => setNewTitle(d.value)}
            />
            <Button
              appearance="primary"
              size="small"
              icon={<Plus size={15} />}
              type="submit"
              disabled={!newTitle.trim()}
              aria-label={t("widget.addItem")}
              style={{ height: "34px", width: "34px" }}
            />
          </form>
        )}

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          {!activeList || activeList.items.length === 0 ? (
            <Text
              size={200}
              style={{
                color: "var(--win-fg-3)",
                textAlign: "center",
                padding: "24px 0",
              }}
            >
              {t("widget.noItems")}
            </Text>
          ) : (
            activeList.items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  backgroundColor: "var(--win-bg-card)",
                  border: "1px solid var(--win-border-2)",
                }}
              >
                <Checkbox
                  checked={item.completed}
                  aria-label={t(item.completed ? "widget.markActive" : "widget.markCompleted", { title: item.title })}
                  onChange={() => toggleItem(activeList.id, item.id)}
                />
                <Text
                  size={200}
                  style={{
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    textDecoration: item.completed ? "line-through" : "none",
                    color: item.completed ? "var(--win-fg-3)" : "var(--win-fg-1)",
                  }}
                >
                  {item.title}
                </Text>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
