import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Clock, Plus, Sparkles, Upload } from "lucide-react";
import { Button, Text, Title2, Title3 } from "../ui";
import { ListCard } from "../components/ListCard";
import { ListDialog, ListDialogValues } from "../components/ListDialog";
import { ListIcon } from "../components/ListIcon";
import { STARTER_TEMPLATES, templateToPayload } from "../data/templates";
import { useT } from "../i18n/useT";
import { useListyStore } from "../store/useListyStore";
import { ListData } from "../types/listy";

export const HomePage: React.FC = () => {
  const t = useT();
  const navigate = useNavigate();
  const lists = useListyStore((s) => s.lists);
  const appState = useListyStore((s) => s.appState);
  const createList = useListyStore((s) => s.createList);
  const updateListDetails = useListyStore((s) => s.updateListDetails);
  const deleteList = useListyStore((s) => s.deleteList);
  const duplicateList = useListyStore((s) => s.duplicateList);
  const reportError = useListyStore((s) => s.reportError);
  const toggleFavorite = useListyStore((s) => s.toggleFavorite);
  const exportList = useListyStore((s) => s.exportList);
  const importList = useListyStore((s) => s.importList);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<ListData | null>(null);
  const recentRowRef = useRef<HTMLDivElement>(null);
  const [maxRecentCols, setMaxRecentCols] = useState(3);

  useEffect(() => {
    const el = recentRowRef.current;
    if (!el) return;
    const updateCols = () => {
      const width = el.clientWidth;
      if (width > 0) {
        const cols = Math.max(1, Math.floor((width + 16) / (240 + 16)));
        setMaxRecentCols(cols);
      }
    };
    updateCols();
    const ro = new ResizeObserver(updateCols);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const recentLists = useMemo(() => {
    const orderMap = new Map(
      appState.recentlyOpened.map((id, idx) => [id, idx])
    );
    const opened = lists
      .filter((l) => orderMap.has(l.id))
      .sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));

    const source =
      opened.length > 0
        ? opened
        : [...lists].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    return source.slice(0, maxRecentCols);
  }, [lists, appState.recentlyOpened, maxRecentCols]);

  const handleDialogSubmit = async (values: ListDialogValues) => {
    if (editingList) {
      // Patch only the details, so item changes made meanwhile are not overwritten.
      await updateListDetails(editingList.id, {
        name: values.name,
        description: values.description,
        icon: values.icon,
        color: values.color,
        type: values.type,
      });
    } else {
      const created = await createList({
        name: values.name,
        description: values.description,
        icon: values.icon,
        color: values.color,
        type: values.type,
        items: values.items ?? [],
      });
      navigate(`/list/${created.id}`);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div>
          <Title2>{t("nav.home")}</Title2>
          <Text size={300} style={{ color: "var(--win-fg-3)" }}>
            {t("home.subtitle")}
          </Text>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <Button
            appearance="secondary"
            icon={<Upload size={15} />}
            onClick={() => importList()}
          >
            {t("home.import")}
          </Button>
          <Button
            appearance="primary"
            icon={<Plus size={16} />}
            onClick={() => {
              setEditingList(null);
              setDialogOpen(true);
            }}
          >
            {t("home.newList")}
          </Button>
        </div>
      </div>

      <section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Clock size={16} style={{ color: "var(--win-fg-2)" }} />
            <Title3>{t("nav.recent")}</Title3>
          </div>
          {lists.length > 0 && (
            <Button
              appearance="subtle"
              size="small"
              onClick={() => navigate("/all")}
            >
              {t("nav.allLists")} <ArrowRight size={14} />
            </Button>
          )}
        </div>

        <div ref={recentRowRef}>
          {recentLists.length === 0 ? (
            <div
              style={{
                padding: "24px",
                borderRadius: "12px",
                backgroundColor: "var(--win-bg-card)",
                border: "1px solid var(--win-border-2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <Text weight="semibold" size={400} block>
                  {t("home.noListsYet")}
                </Text>
                <Text size={300} style={{ color: "var(--win-fg-3)" }}>
                  {t("home.noListsHint")}
                </Text>
              </div>
              <Button
                appearance="primary"
                icon={<Plus size={15} />}
                onClick={() => {
                  setEditingList(null);
                  setDialogOpen(true);
                }}
              >
                {t("home.createFirst")}
              </Button>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${maxRecentCols}, minmax(0, 1fr))`,
                gap: "16px",
                padding: "3px 0",
              }}
            >
              {recentLists.map((list) => (
                <ListCard
                  key={list.id}
                  list={list}
                  viewMode="grid"
                  isFavorite={appState.favorites.includes(list.id)}
                  onOpen={() => navigate(`/list/${list.id}`)}
                  onEdit={() => {
                    setEditingList(list);
                    setDialogOpen(true);
                  }}
                  onDuplicate={() => duplicateList(list).catch(reportError)}
                  onToggleFavorite={() => toggleFavorite(list.id)}
                  onExport={() => exportList(list)}
                  onDelete={() => deleteList(list.id)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Sparkles size={16} style={{ color: "var(--win-brand-fg)" }} />
          <Title3>{t("home.templates")}</Title3>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "10px",
          }}
        >
          {STARTER_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={async () => {
                try {
                  const created = await createList(templateToPayload(tpl));
                  navigate(`/list/${created.id}`);
                } catch (err) {
                  reportError(err);
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 14px",
                borderRadius: "10px",
                backgroundColor: "var(--win-bg-card)",
                border: "1px solid var(--win-border-2)",
                color: "var(--win-fg-1)",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
                transition:
                  "background-color 0.12s ease, border-color 0.12s ease",
              }}
            >
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "8px",
                  backgroundColor: `${tpl.color}1F`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <ListIcon iconId={tpl.icon} size={17} color={tpl.color} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "13.5px", fontWeight: 600 }}>
                  {tpl.name}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--win-fg-3)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t("home.starterItems", { count: tpl.items.length })}
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <ListDialog
        open={dialogOpen}
        mode={editingList ? "edit" : "create"}
        initial={editingList}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleDialogSubmit}
      />
    </div>
  );
};
