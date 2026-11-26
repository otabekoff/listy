import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  List,
  Plus,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";
import { Button, Dropdown, Input, Keycaps, Option, Text, Title2, Tooltip } from "../ui";
import { ListCard } from "../components/ListCard";
import { ListDialog, ListDialogValues } from "../components/ListDialog";
import { useT } from "../i18n/useT";
import { useListyStore } from "../store/useListyStore";
import { AppSettings, ListData } from "../types/listy";

export type ListsPageMode = "home" | "all" | "favorites" | "recent";

interface ListsPageProps {
  mode: ListsPageMode;
}

const MODE_TITLE_KEYS: Record<ListsPageMode, string> = {
  home: "lists.title.home",
  all: "nav.allLists",
  favorites: "nav.favorites",
  recent: "nav.recent",
};

export const ListsPage: React.FC<ListsPageProps> = ({ mode }) => {
  const t = useT();
  const navigate = useNavigate();

  const lists = useListyStore((s) => s.lists);
  const appState = useListyStore((s) => s.appState);
  const searchQuery = useListyStore((s) => s.searchQuery);
  const setSearchQuery = useListyStore((s) => s.setSearchQuery);
  const viewMode = useListyStore((s) => s.viewMode);
  const setViewMode = useListyStore((s) => s.setViewMode);
  const sortBy = useListyStore((s) => s.sortBy);
  const sortOrder = useListyStore((s) => s.sortOrder);
  const setSort = useListyStore((s) => s.setSort);

  const createList = useListyStore((s) => s.createList);
  const seedStarterLists = useListyStore((s) => s.seedStarterLists);
  const updateListDetails = useListyStore((s) => s.updateListDetails);
  const deleteList = useListyStore((s) => s.deleteList);
  const duplicateList = useListyStore((s) => s.duplicateList);
  const reportError = useListyStore((s) => s.reportError);
  const toggleFavorite = useListyStore((s) => s.toggleFavorite);
  const exportList = useListyStore((s) => s.exportList);
  const importList = useListyStore((s) => s.importList);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<ListData | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const filteredAndSorted = useMemo(() => {
    let base = lists;
    if (mode === "favorites") {
      base = lists.filter((l) => appState.favorites.includes(l.id));
    } else if (mode === "recent") {
      const orderMap = new Map(
        appState.recentlyOpened.map((id, idx) => [id, idx])
      );
      base = lists
        .filter((l) => orderMap.has(l.id))
        .sort(
          (a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999)
        );
    }

    const q = searchQuery.trim().toLowerCase();
    const withMatchCounts = base
      .map((list) => {
        if (!q) return { list, matchedItemsCount: 0 };
        const nameMatch = list.name.toLowerCase().includes(q);
        const descMatch = list.description.toLowerCase().includes(q);
        const matchedItemsCount = list.items.filter(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            (item.description?.toLowerCase().includes(q) ?? false) ||
            item.tags.some((t) => t.toLowerCase().includes(q))
        ).length;
        if (!nameMatch && !descMatch && matchedItemsCount === 0) return null;
        return { list, matchedItemsCount };
      })
      .filter(
        (x): x is { list: ListData; matchedItemsCount: number } => x !== null
      );

    if (mode !== "recent" || q) {
      withMatchCounts.sort((a, b) => {
        let cmp = 0;
        if (sortBy === "name") {
          cmp = a.list.name.localeCompare(b.list.name);
        } else if (sortBy === "itemCount") {
          cmp = a.list.items.length - b.list.items.length;
        } else if (sortBy === "createdAt") {
          cmp = a.list.createdAt.localeCompare(b.list.createdAt);
        } else {
          cmp = a.list.updatedAt.localeCompare(b.list.updatedAt);
        }
        return sortOrder === "asc" ? cmp : -cmp;
      });
    }

    return withMatchCounts;
  }, [
    lists,
    mode,
    appState.favorites,
    appState.recentlyOpened,
    searchQuery,
    sortBy,
    sortOrder,
  ]);

  const handleOpenCreate = () => {
    setEditingList(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (list: ListData) => {
    setEditingList(list);
    setDialogOpen(true);
  };

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
    <div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <Title2>{t(MODE_TITLE_KEYS[mode])}</Title2>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Input
            inputRef={searchRef}
            style={{ width: "240px" }}
            contentBefore={<Search size={15} />}
            contentAfter={
              !searchQuery ? <Keycaps keys={["Ctrl", "K"]} size="small" /> : undefined
            }
            placeholder={t("lists.searchPlaceholder")}
            value={searchQuery}
            onChange={(_, d) => setSearchQuery(d.value)}
          />

          <Dropdown
            style={{ minWidth: "150px" }}
            value={
              sortBy === "updatedAt"
                ? t("lists.sort.updatedAt")
                : sortBy === "createdAt"
                ? t("lists.sort.createdAt")
                : sortBy === "name"
                ? t("lists.sort.name")
                : t("lists.sort.itemCount")
            }
            selectedOptions={[sortBy]}
            onOptionSelect={(_, d) => {
              const nextSort =
                (d.optionValue as AppSettings["sortBy"]) ?? "updatedAt";
              setSort(nextSort, nextSort === "name" ? "asc" : "desc");
            }}
          >
            <Option value="updatedAt">{t("lists.sort.updatedAt")}</Option>
            <Option value="createdAt">{t("lists.sort.createdAt")}</Option>
            <Option value="name">{t("lists.sort.name")}</Option>
            <Option value="itemCount">{t("lists.sort.itemCount")}</Option>
          </Dropdown>

          <Tooltip content={t("lists.gridView")}>
            <Button
              appearance={viewMode === "grid" ? "secondary" : "subtle"}
              icon={<LayoutGrid size={16} />}
              aria-label={t("lists.gridView")}
              onClick={() => setViewMode("grid")}
            />
          </Tooltip>
          <Tooltip content={t("lists.listView")}>
            <Button
              appearance={viewMode === "list" ? "secondary" : "subtle"}
              icon={<List size={16} />}
              aria-label={t("lists.listView")}
              onClick={() => setViewMode("list")}
            />
          </Tooltip>

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
            onClick={handleOpenCreate}
          >
            {t("home.newList")}
          </Button>
        </div>
      </div>

      {mode === "home" && lists.length === 0 && (
        <div
          style={{
            padding: "24px",
            marginBottom: "20px",
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
              {t("lists.welcome")}
            </Text>
            <Text size={300} style={{ color: "var(--win-fg-3)" }}>
              {t("lists.welcomeHint")}
            </Text>
          </div>
          <Button
            appearance="secondary"
            icon={<Sparkles size={15} />}
            onClick={() => seedStarterLists()}
          >
            {t("lists.addStarter")}
          </Button>
        </div>
      )}

      {searchQuery.trim() && filteredAndSorted.length === 0 ? (
        <div
          style={{
            padding: "48px 24px",
            textAlign: "center",
            color: "var(--win-fg-3)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <Text size={400} block>
            {t("lists.noMatch", { query: searchQuery.trim() })}
          </Text>
          <Button appearance="secondary" onClick={() => setSearchQuery("")}>
            {t("lists.clearSearch")}
          </Button>
        </div>
      ) : filteredAndSorted.length === 0 && mode !== "home" && mode !== "all" ? (
        <div
          style={{
            padding: "48px 24px",
            textAlign: "center",
            color: "var(--win-fg-3)",
          }}
        >
          <Text size={400} block>
            {mode === "favorites"
              ? t("lists.noFavorites")
              : t("lists.noRecent")}
          </Text>
        </div>
      ) : (
        <div className={viewMode === "grid" ? "listy-grid" : "listy-list-view"}>
          {filteredAndSorted.map(({ list, matchedItemsCount }) => (
            <ListCard
              key={list.id}
              list={list}
              viewMode={viewMode}
              isFavorite={appState.favorites.includes(list.id)}
              matchedItemsCount={matchedItemsCount}
              onOpen={() => navigate(`/list/${list.id}`)}
              onEdit={() => handleOpenEdit(list)}
              onDuplicate={() => duplicateList(list).catch(reportError)}
              onToggleFavorite={() => toggleFavorite(list.id)}
              onExport={() => exportList(list)}
              onDelete={() => deleteList(list.id)}
            />
          ))}

          {(mode === "home" || mode === "all") && viewMode === "grid" && (
            <button
              type="button"
              className="listy-create-card"
              onClick={handleOpenCreate}
            >
              <Plus size={22} />
              <Text weight="semibold">{t("lists.createNew")}</Text>
              <Text size={200} style={{ color: "var(--win-fg-3)" }}>
                {t("lists.fromScratch")}
              </Text>
            </button>
          )}
        </div>
      )}

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
