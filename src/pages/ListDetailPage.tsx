import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  GripVertical,
  Link2,
  MoreHorizontal,
  Paperclip,
  ListChecks,
  Pencil,
  Plus,
  Repeat,
  RotateCcw,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import {
  Badge,
  Breadcrumb,
  BreadcrumbButton,
  BreadcrumbDivider,
  BreadcrumbItem,
  Button,
  Checkbox,
  ConfirmDialog,
  ContextMenu,
  Dropdown,
  Input,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Option,
  ProgressBar,
  Text,
  Title2,
  Tooltip,
} from "../ui";
import { ItemDetailDialog } from "../components/ItemDetailDialog";
import { ListDialog, ListDialogValues } from "../components/ListDialog";
import { ListIconBadge, getNeutralAccentBorder } from "../components/ListIcon";
import { useT } from "../i18n/useT";
import { useListyStore } from "../store/useListyStore";
import { ItemStatus, ListItem, describeDueDate } from "../types/listy";

const PRIORITY_COLORS: Record<
  string,
  "danger" | "warning" | "informative" | "subtle"
> = {
  high: "danger",
  medium: "warning",
  normal: "informative",
  low: "subtle",
};

export const ListDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = useT();

  const lists = useListyStore((s) => s.lists);
  const appState = useListyStore((s) => s.appState);
  const markRecentlyOpened = useListyStore((s) => s.markRecentlyOpened);
  const toggleFavorite = useListyStore((s) => s.toggleFavorite);
  const updateListDetails = useListyStore((s) => s.updateListDetails);
  const reportError = useListyStore((s) => s.reportError);
  const deleteList = useListyStore((s) => s.deleteList);
  const duplicateList = useListyStore((s) => s.duplicateList);
  const exportList = useListyStore((s) => s.exportList);
  const addItem = useListyStore((s) => s.addItem);
  const updateItem = useListyStore((s) => s.updateItem);
  const setItemStatus = useListyStore((s) => s.setItemStatus);
  const archiveCompleted = useListyStore((s) => s.archiveCompleted);
  const toggleItem = useListyStore((s) => s.toggleItem);
  const deleteItem = useListyStore((s) => s.deleteItem);
  const restoreArchivedItem = useListyStore((s) => s.restoreArchivedItem);
  const permanentlyDeleteArchivedItem = useListyStore(
    (s) => s.permanentlyDeleteArchivedItem
  );
  const clearArchivedItems = useListyStore((s) => s.clearArchivedItems);
  const reorderItems = useListyStore((s) => s.reorderItems);
  const toggleSubtask = useListyStore((s) => s.toggleSubtask);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpanded = (itemId: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });

  const list = lists.find((l) => l.id === id);

  const [newItemTitle, setNewItemTitle] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<
    "default" | "title" | "priority" | "dueDate"
  >("default");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [editListOpen, setEditListOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ListItem | null>(null);
  const [confirmAction, setConfirmAction] = useState<
    { kind: "clear" } | { kind: "item"; item: ListItem } | null
  >(null);
  const [itemCtx, setItemCtx] = useState<{
    x: number;
    y: number;
    item: ListItem;
  } | null>(null);

  useEffect(() => {
    if (!draggedId || !list) return;
    const onPointerMove = (e: PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const row = el?.closest("[data-item-id]") as HTMLElement | null;
      const targetId = row?.getAttribute("data-item-id") ?? null;
      if (targetId && targetId !== draggedId) {
        setDropTargetId(targetId);
      } else {
        setDropTargetId(null);
      }
    };
    const onPointerUp = () => {
      if (dropTargetId && dropTargetId !== draggedId) {
        reorderItems(list.id, draggedId, dropTargetId);
      }
      setDraggedId(null);
      setDropTargetId(null);
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [draggedId, dropTargetId, list, reorderItems]);

  useEffect(() => {
    if (id && list) {
      markRecentlyOpened(id);
    }
  }, [id]);

  const allTags = useMemo(() => {
    if (!list) return [];
    const set = new Set<string>();
    list.items.forEach((it) => it.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [list]);

  const canDragReorder =
    sortBy === "default" && filter === "all" && !search.trim() && !selectedTag;

  const filteredItems = useMemo(() => {
    if (!list) return [];
    const q = search.trim().toLowerCase();
    let result = list.items.filter((item) => {
      if (filter === "active" && item.completed) return false;
      if (filter === "completed" && !item.completed) return false;
      if (selectedTag && !item.tags.includes(selectedTag)) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        (item.description?.toLowerCase().includes(q) ?? false) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
      );
    });

    if (sortBy !== "default") {
      const priorityRank: Record<string, number> = {
        high: 4,
        medium: 3,
        normal: 2,
        low: 1,
      };
      result = [...result].sort((a, b) => {
        if (sortBy === "title") return a.title.localeCompare(b.title);
        if (sortBy === "priority") {
          return (
            (priorityRank[b.priority ?? ""] ?? 0) -
            (priorityRank[a.priority ?? ""] ?? 0)
          );
        }
        if (sortBy === "dueDate") {
          return (a.dueDate ?? "9999-99-99").localeCompare(
            b.dueDate ?? "9999-99-99"
          );
        }
        return 0;
      });
    }
    return result;
  }, [list, search, filter, selectedTag, sortBy]);

  if (!list) {
    return (
      <div style={{ padding: "32px" }}>
        <Title2>{t("listDetail.notFound")}</Title2>
        <div style={{ marginTop: "12px" }}>
          <Button appearance="primary" onClick={() => navigate("/")}>
            {t("listDetail.backHome")}
          </Button>
        </div>
      </div>
    );
  }

  const isFavorite = appState.favorites.includes(list.id);
  // Lists whose items can be completed (simple lists are plain notes).
  const tracksCompletion = list.type !== "simple";
  const canToggle = list.type === "checklist" || list.type === "priority";
  const totalCount = list.items.length;
  const completedCount = list.items.filter((i) => i.completed).length;

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle.trim()) return;
    // Keep the typed text if saving failed, so nothing is lost.
    if (await addItem(list.id, newItemTitle)) setNewItemTitle("");
  };

  const handleEditListSubmit = async (values: ListDialogValues) => {
    await updateListDetails(list.id, {
      name: values.name,
      description: values.description,
      icon: values.icon,
      color: values.color,
      type: values.type,
    });
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          marginBottom: "20px",
        }}
      >
        <Breadcrumb>
          <BreadcrumbItem>
            <BreadcrumbButton onClick={() => navigate("/")}>
              {t("nav.home")}
            </BreadcrumbButton>
          </BreadcrumbItem>
          <BreadcrumbDivider />
          <BreadcrumbItem>
            <BreadcrumbButton current>{list.name}</BreadcrumbButton>
          </BreadcrumbItem>
        </Breadcrumb>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <ListIconBadge iconId={list.icon} color={list.color} size={44} />
            <div>
              <Title2>{list.name}</Title2>
              {list.description && (
                <Text size={300} block style={{ color: "var(--win-fg-3)" }}>
                  {list.description}
                </Text>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Button
              appearance="subtle"
              icon={
                <Star
                  size={17}
                  fill={isFavorite ? "#F59E0B" : "none"}
                  color={isFavorite ? "#F59E0B" : "currentColor"}
                />
              }
              onClick={() => toggleFavorite(list.id)}
              aria-label={t("listDetail.toggleFavorite")}
            />
            <Menu>
              <MenuTrigger disableButtonEnhancement>
                <Button
                  appearance="subtle"
                  icon={<MoreHorizontal size={17} />}
                  aria-label={t("listDetail.moreActions")}
                />
              </MenuTrigger>
              <MenuPopover>
                <MenuList>
                  <MenuItem
                    icon={<Pencil size={15} />}
                    onClick={() => setEditListOpen(true)}
                  >
                    {t("listDetail.editDetails")}
                  </MenuItem>
                  <MenuItem
                    icon={<Copy size={15} />}
                    onClick={async () => {
                      try {
                        const copy = await duplicateList(list);
                        navigate(`/list/${copy.id}`);
                      } catch (err) {
                        reportError(err);
                      }
                    }}
                  >
                    {t("listDetail.duplicate")}
                  </MenuItem>
                  <MenuItem
                    icon={<Download size={15} />}
                    onClick={() => exportList(list)}
                  >
                    {t("listDetail.exportJson")}
                  </MenuItem>
                  <MenuItem
                    icon={<Trash2 size={15} />}
                    onClick={async () => {
                      if (await deleteList(list.id)) navigate("/");
                    }}
                  >
                    {t("listDetail.moveToTrash")}
                  </MenuItem>
                </MenuList>
              </MenuPopover>
            </Menu>
          </div>
        </div>

        {tracksCompletion && totalCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <ProgressBar
              value={completedCount}
              max={totalCount}
              style={{ maxWidth: "240px" }}
            />
            <Text size={200} style={{ color: "var(--win-fg-3)" }}>
              {t("listDetail.progress", { done: completedCount, total: totalCount })}
            </Text>
            {completedCount > 0 && (
              <Button
                appearance="subtle"
                size="small"
                onClick={() => archiveCompleted(list.id)}
              >
                {t("listDetail.archiveCompleted")}
              </Button>
            )}
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "10px",
          marginBottom: "16px",
        }}
      >
        <Input
          contentBefore={<Search size={15} />}
          placeholder={t("listDetail.searchPlaceholder")}
          value={search}
          onChange={(_, d) => setSearch(d.value)}
          style={{ width: "220px" }}
        />

        {tracksCompletion && (
          <Dropdown
            style={{ minWidth: "130px" }}
            value={
              t(`listDetail.filter.${filter}`)
            }
            selectedOptions={[filter]}
            onOptionSelect={(_, d) =>
              setFilter(
                (d.optionValue as "all" | "active" | "completed") ?? "all"
              )
            }
          >
            <Option value="all">{t("listDetail.filter.all")}</Option>
            <Option value="active">{t("listDetail.filter.active")}</Option>
            <Option value="completed">{t("listDetail.filter.completed")}</Option>
          </Dropdown>
        )}

        <Dropdown
          style={{ minWidth: "140px" }}
          value={
            t(`listDetail.sort.${sortBy}`)
          }
          selectedOptions={[sortBy]}
          onOptionSelect={(_, d) =>
            setSortBy(
              (d.optionValue as "default" | "title" | "priority" | "dueDate") ??
                "default"
            )
          }
        >
          <Option value="default">{t("listDetail.sort.default")}</Option>
          <Option value="title">{t("listDetail.sort.title")}</Option>
          <Option value="priority">{t("listDetail.sort.priority")}</Option>
          <Option value="dueDate">{t("listDetail.sort.dueDate")}</Option>
        </Dropdown>

        {allTags.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              alignItems: "center",
            }}
          >
            {selectedTag && (
              <Button
                size="small"
                appearance="subtle"
                onClick={() => setSelectedTag(null)}
              >
                {t("listDetail.clearTag")}
              </Button>
            )}
            {allTags.map((tag) => (
              <Badge
                key={tag}
                appearance={selectedTag === tag ? "filled" : "tint"}
                color={selectedTag === tag ? "brand" : "subtle"}
                style={{ cursor: "pointer" }}
                onClick={() =>
                  setSelectedTag((prev) => (prev === tag ? null : tag))
                }
              >
                #{tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <form
        style={{ display: "flex", gap: "8px", marginBottom: "16px" }}
        onSubmit={handleAddItem}
      >
        <Input
          style={{ flex: 1 }}
          placeholder={t("listDetail.addPlaceholder")}
          value={newItemTitle}
          onChange={(_, d) => setNewItemTitle(d.value)}
        />
        <Button
          appearance="primary"
          icon={<Plus size={16} />}
          type="submit"
          disabled={!newItemTitle.trim()}
        >
          {t("listDetail.add")}
        </Button>
      </form>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {filteredItems.length === 0 ? (
          <Text
            size={300}
            style={{
              color: "var(--win-fg-3)",
              padding: "24px 0",
              textAlign: "center",
            }}
          >
            {list.items.length === 0
              ? t("listDetail.emptyList")
              : t("listDetail.noMatches")}
          </Text>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              data-item-id={item.id}
              className="listy-item-row"
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setItemCtx({ x: e.clientX, y: e.clientY, item });
              }}
              style={{
                opacity: draggedId === item.id ? 0.55 : 1,
                borderColor:
                  dropTargetId === item.id ? "var(--win-brand)" : undefined,
                boxShadow:
                  dropTargetId === item.id
                    ? "0 0 0 1px var(--win-brand)"
                    : undefined,
                userSelect: draggedId ? "none" : undefined,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {canDragReorder && (
                  <span
                    onPointerDown={(e) => {
                      e.preventDefault();
                      setDraggedId(item.id);
                    }}
                    style={{
                      cursor: draggedId === item.id ? "grabbing" : "grab",
                      color: "var(--win-fg-3)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "4px 2px",
                      touchAction: "none",
                    }}
                    title={t("listDetail.dragToReorder")}
                  >
                    <GripVertical size={15} />
                  </span>
                )}
                {list.type === "status" ? (
                  <button
                    type="button"
                    onClick={() => {
                      const cur: ItemStatus =
                        item.status ?? (item.completed ? "done" : "todo");
                      const next: ItemStatus =
                        cur === "todo"
                          ? "in_progress"
                          : cur === "in_progress"
                          ? "done"
                          : "todo";
                      setItemStatus(list.id, item.id, {
                        status: next,
                        completed: next === "done",
                      });
                    }}
                    className="win-badge"
                    style={{
                      cursor: "pointer",
                      border: "1px solid var(--win-border-1)",
                      backgroundColor:
                        (item.status ?? (item.completed ? "done" : "todo")) === "done"
                          ? "var(--win-brand-tint)"
                          : (item.status ?? "todo") === "in_progress"
                          ? "var(--win-warning-tint)"
                          : "var(--win-bg-hover)",
                      color:
                        (item.status ?? (item.completed ? "done" : "todo")) === "done"
                          ? "var(--win-brand-fg)"
                          : (item.status ?? "todo") === "in_progress"
                          ? "var(--win-warning)"
                          : "var(--win-fg-2)",
                      fontFamily: "inherit",
                      flexShrink: 0,
                    }}
                  >
                    {(item.status ?? (item.completed ? "done" : "todo")) === "done"
                      ? t("common.status.done")
                      : (item.status ?? "todo") === "in_progress"
                      ? t("common.status.in_progress")
                      : t("common.status.todo")}
                  </button>
                ) : canToggle ? (
                  <Checkbox
                    checked={item.completed}
                    aria-label={t(
                      item.completed ? "listDetail.markActiveAria" : "listDetail.markCompletedAria",
                      { title: item.title }
                    )}
                    onChange={() => toggleItem(list.id, item.id)}
                  />
                ) : (
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      marginLeft: "4px",
                      marginRight: "4px",
                      flexShrink: 0,
                      backgroundColor: getNeutralAccentBorder(list.color),
                    }}
                  />
                )}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    minWidth: 0,
                    flex: 1,
                    cursor: "pointer",
                  }}
                  onClick={() => setEditingItem(item)}
                >
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.title}
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "8px",
                        objectFit: "cover",
                        flexShrink: 0,
                        border: "1px solid var(--win-border-2)",
                      }}
                    />
                  )}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    <Text
                      weight="medium"
                      style={{
                        textDecoration:
                          tracksCompletion && item.completed
                            ? "line-through"
                            : "none",
                        color:
                          tracksCompletion && item.completed
                            ? "var(--win-fg-3)"
                            : "var(--win-fg-1)",
                      }}
                    >
                      {item.title}
                    </Text>

                    {item.description && (
                      <Text size={200} style={{ color: "var(--win-fg-3)" }}>
                        {item.description}
                      </Text>
                    )}

                  {(item.priority ||
                    item.dueDate ||
                    item.recurrence ||
                    (item.subtasks?.length ?? 0) > 0 ||
                    item.tags.length > 0 ||
                    item.url ||
                    item.notes ||
                    (item.attachments?.length ?? 0) > 0) && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      {item.priority && (
                        <Badge
                          appearance="tint"
                          color={PRIORITY_COLORS[item.priority] ?? "informative"}
                          size="small"
                        >
                          {t(`common.priority.${item.priority}`)}
                        </Badge>
                      )}
                      {item.dueDate &&
                        (() => {
                          const due = describeDueDate(item.dueDate);
                          // Urgency stops mattering once the item is done.
                          const urgent = !item.completed && due.state !== "later";
                          return (
                            <Badge
                              appearance={urgent ? "tint" : "outline"}
                              color={
                                !urgent
                                  ? undefined
                                  : due.state === "overdue"
                                  ? "danger"
                                  : "warning"
                              }
                              size="small"
                            >
                              {item.completed && due.state === "overdue"
                                ? t("common.dueOn", { date: item.dueDate })
                                : due.label}
                            </Badge>
                          );
                        })()}
                      {item.recurrence && (
                        <Badge appearance="tint" color="subtle" size="small">
                          <Repeat size={10} /> {t(`common.repeat.${item.recurrence}`)}
                        </Badge>
                      )}
                      {(item.subtasks?.length ?? 0) > 0 && (
                        <button
                          type="button"
                          className="win-badge"
                          aria-expanded={expanded.has(item.id)}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpanded(item.id);
                          }}
                          style={{
                            cursor: "pointer",
                            border: "1px solid var(--win-border-1)",
                            backgroundColor: "var(--win-bg-hover)",
                            color: "var(--win-fg-2)",
                            fontFamily: "inherit",
                            fontSize: "11px",
                          }}
                        >
                          <ListChecks size={10} />{" "}
                          {item.subtasks.filter((st) => st.completed).length}/{item.subtasks.length}
                          {expanded.has(item.id) ? (
                            <ChevronDown size={10} />
                          ) : (
                            <ChevronRight size={10} />
                          )}
                        </button>
                      )}
                      {item.notes && (
                        <Badge appearance="tint" color="subtle" size="small">
                          {t("listDetail.note")}
                        </Badge>
                      )}
                      {(item.attachments?.length ?? 0) > 0 && (
                        <Badge appearance="tint" color="subtle" size="small">
                          <Paperclip size={10} /> {item.attachments.length}
                        </Badge>
                      )}
                      {item.tags.map((tag) => (
                        <Badge key={tag} appearance="tint" size="small">
                          #{tag}
                        </Badge>
                      ))}
                      {item.url && (
                        <a
                          href={
                            /^https?:\/\//i.test(item.url)
                              ? item.url
                              : `https://${item.url}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                            fontSize: "12px",
                            color: "var(--win-brand-fg)",
                          }}
                        >
                          <Link2 size={12} /> {t("listDetail.link")}
                        </a>
                      )}
                    </div>
                  )}
                  {expanded.has(item.id) && (item.subtasks?.length ?? 0) > 0 && (
                    <div className="listy-subtasks" onClick={(e) => e.stopPropagation()}>
                      {item.subtasks.map((st) => (
                        <Checkbox
                          key={st.id}
                          checked={st.completed}
                          label={st.title}
                          onChange={() => toggleSubtask(list.id, item.id, st.id)}
                        />
                      ))}
                    </div>
                  )}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  flexShrink: 0,
                }}
              >
                <Tooltip content={t("listDetail.editItem")}>
                  <Button
                    appearance="subtle"
                    size="small"
                    icon={<Pencil size={15} />}
                    aria-label={t("listDetail.editItem")}
                    onClick={() => setEditingItem(item)}
                  />
                </Tooltip>
                <Tooltip content={t("listDetail.moveToArchive")}>
                  <Button
                    appearance="subtle"
                    size="small"
                    icon={<Trash2 size={15} />}
                    aria-label={t("listDetail.archiveItem")}
                    onClick={() => deleteItem(list.id, item.id)}
                  />
                </Tooltip>
              </div>
            </div>
          ))
        )}
      </div>

      {(list.archivedItems ?? []).length > 0 && (
        <div style={{ marginTop: "24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "8px",
            }}
          >
            <Button
              appearance="subtle"
              size="small"
              icon={
                archiveOpen ? (
                  <ChevronDown size={15} />
                ) : (
                  <ChevronRight size={15} />
                )
              }
              onClick={() => setArchiveOpen((o) => !o)}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Archive size={14} />
                {t("listDetail.archive", { count: list.archivedItems.length })}
              </span>
            </Button>

            {archiveOpen && (
              <Button
                appearance="subtle"
                size="small"
                onClick={() => setConfirmAction({ kind: "clear" })}
              >
                {t("listDetail.clearArchive")}
              </Button>
            )}
          </div>

          {archiveOpen && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {list.archivedItems.map((item) => (
                <div
                  key={item.id}
                  className="listy-item-row"
                  style={{ opacity: 0.78 }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <Text
                      style={{
                        textDecoration: "line-through",
                        color: "var(--win-fg-3)",
                      }}
                    >
                      {item.title}
                    </Text>
                  </div>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <Tooltip content={t("listDetail.restoreToList")}>
                      <Button
                        appearance="subtle"
                        size="small"
                        icon={<RotateCcw size={14} />}
                        aria-label={t("listDetail.restoreItem")}
                        onClick={() => restoreArchivedItem(list.id, item.id)}
                      />
                    </Tooltip>
                    <Tooltip content={t("listDetail.deleteForever")}>
                      <Button
                        appearance="subtle"
                        size="small"
                        icon={<Trash2 size={14} />}
                        aria-label={t("listDetail.deleteArchivedItem")}
                        onClick={() => setConfirmAction({ kind: "item", item })}
                      />
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ListDialog
        open={editListOpen}
        mode="edit"
        initial={list}
        onClose={() => setEditListOpen(false)}
        onSubmit={handleEditListSubmit}
      />

      <ItemDetailDialog
        open={editingItem !== null}
        listId={list.id}
        item={editingItem}
        availableTags={allTags}
        onClose={() => setEditingItem(null)}
        onSave={async (patch) => {
          if (editingItem) {
            await updateItem(list.id, editingItem.id, patch);
          }
        }}
      />

      <ConfirmDialog
        open={confirmAction !== null}
        title={
          confirmAction?.kind === "clear"
            ? t("listDetail.confirmClearTitle")
            : t("listDetail.confirmDeleteTitle", {
                title: confirmAction?.kind === "item" ? confirmAction.item.title : "",
              })
        }
        message={
          confirmAction?.kind === "clear"
            ? t("listDetail.confirmClearMessage", {
                count: (list.archivedItems ?? []).length,
              })
            : t("listDetail.confirmDeleteMessage")
        }
        confirmLabel={t("listDetail.confirmDeleteLabel")}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          if (confirmAction?.kind === "clear") {
            clearArchivedItems(list.id);
          } else if (confirmAction?.kind === "item") {
            permanentlyDeleteArchivedItem(list.id, confirmAction.item.id);
          }
          setConfirmAction(null);
        }}
      />

      <ContextMenu
        position={itemCtx ? { x: itemCtx.x, y: itemCtx.y } : null}
        onClose={() => setItemCtx(null)}
        items={
          itemCtx
            ? [
                {
                  label: t("listDetail.editItem"),
                  icon: <Pencil size={15} />,
                  onClick: () => setEditingItem(itemCtx.item),
                },
                ...(canToggle
                  ? [
                      {
                        label: itemCtx.item.completed
                          ? t("listDetail.markActive")
                          : t("listDetail.markCompleted"),
                        icon: itemCtx.item.completed ? (
                          <RotateCcw size={15} />
                        ) : (
                          <Check size={15} />
                        ),
                        onClick: () => toggleItem(list.id, itemCtx.item.id),
                      },
                    ]
                  : []),
                {
                  label: t("listDetail.moveToArchive"),
                  icon: <Trash2 size={15} />,
                  danger: true,
                  onClick: () => deleteItem(list.id, itemCtx.item.id),
                },
              ]
            : []
        }
      />
    </div>
  );
};
