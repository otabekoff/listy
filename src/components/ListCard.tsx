import React, { useState } from "react";
import {
  Copy,
  Download,
  MoreHorizontal,
  Palette,
  Pencil,
  Smile,
  Star,
  Trash2,
} from "lucide-react";
import {
  Button,
  ContextMenu,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Text,
} from "../ui";
import { ListData, formatRelativeDate } from "../types/listy";
import { useT } from "../i18n/useT";
import { ListIconBadge, getNeutralAccentBorder } from "./ListIcon";

interface ListCardProps {
  list: ListData;
  viewMode: "grid" | "list";
  isFavorite: boolean;
  matchedItemsCount?: number;
  onOpen: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onToggleFavorite: () => void;
  onExport: () => void;
  onDelete: () => void;
}

export const ListCard: React.FC<ListCardProps> = ({
  list,
  viewMode,
  isFavorite,
  matchedItemsCount,
  onOpen,
  onEdit,
  onDuplicate,
  onToggleFavorite,
  onExport,
  onDelete,
}) => {
  const t = useT();
  const [ctxPos, setCtxPos] = useState<{ x: number; y: number } | null>(null);
  const total = list.items.length;
  const completed = list.items.filter((i) => i.completed).length;
  const summaryText =
    list.type === "checklist"
      ? `${t("listCard.items", { count: total })} · ${t("listCard.completed", { count: completed })}`
      : t("listCard.items", { count: total });
  const updatedText = formatRelativeDate(list.updatedAt);

  const menu = (
    <Menu>
      <MenuTrigger disableButtonEnhancement>
        <Button
          appearance="subtle"
          size="small"
          icon={<MoreHorizontal size={16} />}
          aria-label={t("listCard.options")}
          onClick={(e) => e.stopPropagation()}
        />
      </MenuTrigger>
      <MenuPopover onClick={(e) => e.stopPropagation()}>
        <MenuList>
          <MenuItem icon={<Pencil size={15} />} onClick={onEdit}>
            {t("listCard.renameEdit")}
          </MenuItem>
          <MenuItem icon={<Smile size={15} />} onClick={onEdit}>
            {t("listCard.changeIcon")}
          </MenuItem>
          <MenuItem icon={<Palette size={15} />} onClick={onEdit}>
            {t("listCard.changeColor")}
          </MenuItem>
          <MenuItem icon={<Copy size={15} />} onClick={onDuplicate}>
            {t("listCard.duplicate")}
          </MenuItem>
          <MenuItem
            icon={
              <Star
                size={15}
                fill={isFavorite ? "#F59E0B" : "none"}
                color={isFavorite ? "#F59E0B" : "currentColor"}
              />
            }
            onClick={onToggleFavorite}
          >
            {isFavorite ? t("listCard.removeFavorite") : t("listCard.addFavorite")}
          </MenuItem>
          <MenuItem icon={<Download size={15} />} onClick={onExport}>
            {t("listCard.exportJson")}
          </MenuItem>
          <MenuItem icon={<Trash2 size={15} />} onClick={onDelete}>
            {t("listCard.moveToTrash")}
          </MenuItem>
        </MenuList>
      </MenuPopover>
    </Menu>
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxPos({ x: e.clientX, y: e.clientY });
  };

  const contextItems = [
    { label: t("listCard.renameEdit"), icon: <Pencil size={15} />, onClick: onEdit },
    { label: t("listCard.duplicate"), icon: <Copy size={15} />, onClick: onDuplicate },
    {
      label: isFavorite ? t("listCard.removeFavorite") : t("listCard.addFavorite"),
      icon: (
        <Star
          size={15}
          fill={isFavorite ? "#F59E0B" : "none"}
          color={isFavorite ? "#F59E0B" : "currentColor"}
        />
      ),
      onClick: onToggleFavorite,
    },
    { label: t("listCard.exportJson"), icon: <Download size={15} />, onClick: onExport },
    {
      label: t("listCard.moveToTrash"),
      icon: <Trash2 size={15} />,
      onClick: onDelete,
      danger: true,
    },
  ];

  if (viewMode === "list") {
    return (
      <>
        <div
          className="listy-row-card"
          onClick={onOpen}
          onContextMenu={handleContextMenu}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={0}
        >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            minWidth: 0,
            flex: 1,
          }}
        >
          <ListIconBadge iconId={list.icon} color={list.color} size={40} />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: "15px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {list.name}
            </div>
            <div style={{ fontSize: "12.5px", color: "var(--win-fg-3)" }}>
              {summaryText}
              {matchedItemsCount
                ? ` · ${t("listCard.matching", { count: matchedItemsCount })}`
                : ""}
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexShrink: 0,
          }}
        >
          <Text size={200} style={{ color: "var(--win-fg-3)" }}>
            {updatedText}
          </Text>
          <Button
            appearance="subtle"
            size="small"
            icon={
              <Star
                size={16}
                fill={isFavorite ? "#F59E0B" : "none"}
                color={isFavorite ? "#F59E0B" : "currentColor"}
              />
            }
            aria-label={t("listCard.toggleFavorite")}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
          />
          {menu}
        </div>
      </div>
      <ContextMenu
        position={ctxPos}
        items={contextItems}
        onClose={() => setCtxPos(null)}
      />
    </>
    );
  }

  const accentColor = getNeutralAccentBorder(list.color);

  return (
    <>
      <div
        className="listy-card"
        style={{ "--card-accent": accentColor } as React.CSSProperties}
        onClick={onOpen}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
      >
      <div
        className="listy-card-accent"
        style={{ backgroundColor: accentColor }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginTop: "2px",
        }}
      >
        <ListIconBadge iconId={list.icon} color={list.color} size={40} />
        <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
          {isFavorite && (
            <Button
              appearance="subtle"
              size="small"
              icon={<Star size={16} fill="#F59E0B" color="#F59E0B" />}
              aria-label={t("listCard.favorite")}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
            />
          )}
          {menu}
        </div>
      </div>

      <div>
        <div
          style={{
            fontWeight: 600,
            fontSize: "15px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {list.name}
        </div>
        <div
          style={{
            fontSize: "12.5px",
            color: "var(--win-fg-3)",
            marginTop: "4px",
          }}
        >
          {summaryText}
        </div>
        {matchedItemsCount ? (
          <div
            style={{
              fontSize: "12.5px",
              color: "var(--win-brand-fg)",
              marginTop: "2px",
            }}
          >
            {t("listCard.matching", { count: matchedItemsCount })}
          </div>
        ) : null}
      </div>

      <div
        style={{
          fontSize: "12.5px",
          color: "var(--win-fg-3)",
          marginTop: "auto",
          paddingTop: "4px",
        }}
      >
        {updatedText}
      </div>
    </div>
    <ContextMenu
      position={ctxPos}
      items={contextItems}
      onClose={() => setCtxPos(null)}
    />
  </>
  );
};
