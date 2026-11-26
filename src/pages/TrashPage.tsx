import React, { useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { Button, ConfirmDialog, Text, Title2 } from "../ui";
import { ListIconBadge } from "../components/ListIcon";
import { useT } from "../i18n/useT";
import { useListyStore } from "../store/useListyStore";
import { ListData, formatRelativeDate } from "../types/listy";

export const TrashPage: React.FC = () => {
  const t = useT();
  const trashedLists = useListyStore((s) => s.trashedLists);
  const restoreList = useListyStore((s) => s.restoreList);
  const permanentlyDeleteList = useListyStore((s) => s.permanentlyDeleteList);

  const [confirmTarget, setConfirmTarget] = useState<ListData | "all" | null>(
    null
  );

  const handleConfirm = async () => {
    if (!confirmTarget) return;
    if (confirmTarget === "all") {
      for (const l of trashedLists) {
        await permanentlyDeleteList(l.id);
      }
    } else {
      await permanentlyDeleteList(confirmTarget.id);
    }
    setConfirmTarget(null);
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <div>
          <Title2>{t("nav.trash")}</Title2>
          <Text size={300} block style={{ color: "var(--win-fg-3)" }}>
            {t("trash.subtitle")}
          </Text>
        </div>
        {trashedLists.length > 0 && (
          <Button
            appearance="secondary"
            icon={<Trash2 size={15} />}
            onClick={() => setConfirmTarget("all")}
          >
            {t("trash.emptyTrash")}
          </Button>
        )}
      </div>

      {trashedLists.length === 0 ? (
        <Text size={400} style={{ color: "var(--win-fg-3)" }}>
          {t("trash.isEmpty")}
        </Text>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {trashedLists.map((list) => (
            <div
              key={list.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                borderRadius: "10px",
                backgroundColor: "var(--win-bg-card)",
                border: "1px solid var(--win-border-2)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <ListIconBadge iconId={list.icon} color={list.color} size={38} />
                <div>
                  <Text weight="semibold" block>
                    {list.name}
                  </Text>
                  <Text size={200} style={{ color: "var(--win-fg-3)" }}>
                    {t("trash.items", { count: list.items.length })} ·{" "}
                    {formatRelativeDate(list.updatedAt)}
                  </Text>
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <Button
                  appearance="secondary"
                  icon={<RotateCcw size={15} />}
                  onClick={() => restoreList(list.id)}
                >
                  {t("trash.restore")}
                </Button>
                <Button
                  appearance="subtle"
                  icon={<Trash2 size={15} />}
                  onClick={() => setConfirmTarget(list)}
                >
                  {t("trash.deleteForever")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmTarget !== null}
        title={
          confirmTarget === "all"
            ? t("trash.confirmEmptyTitle")
            : t("trash.confirmDeleteTitle", { name: confirmTarget?.name ?? "" })
        }
        message={
          confirmTarget === "all"
            ? t("trash.confirmEmptyMessage")
            : t("trash.confirmDeleteMessage")
        }
        confirmLabel={t("trash.deleteForever")}
        onCancel={() => setConfirmTarget(null)}
        onConfirm={handleConfirm}
      />
    </div>
  );
};
