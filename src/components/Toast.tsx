import React, { useEffect } from "react";
import { X } from "lucide-react";
import { Button, Keycaps } from "../ui";
import { useT } from "../i18n/useT";
import { useListyStore } from "../store/useListyStore";

const VISIBLE_MS = 6000;

/** The store's toast message, bottom-centre, with Undo when the change can be undone. */
export const Toast: React.FC = () => {
  const t = useT();
  const toast = useListyStore((s) => s.toast);
  const dismiss = useListyStore((s) => s.dismissToast);
  const undo = useListyStore((s) => s.undo);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(dismiss, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [toast, dismiss]);

  if (!toast || !toast.message) return null;

  return (
    <div className="listy-toast" role="status" aria-live="polite" key={toast.id}>
      <span>{toast.message}</span>
      {toast.canUndo && (
        <Button appearance="transparent" size="small" onClick={() => void undo()}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            {t("common.undo")}
            <Keycaps keys={["Ctrl", "Z"]} size="small" />
          </span>
        </Button>
      )}
      <button type="button" className="listy-toast-close" aria-label={t("common.close")} onClick={dismiss}>
        <X size={14} />
      </button>
    </div>
  );
};
