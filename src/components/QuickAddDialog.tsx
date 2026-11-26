import React from "react";
import { Dialog, DialogBody, DialogContent, DialogSurface, DialogTitle, Keycaps } from "../ui";
import { useT } from "../i18n/useT";
import { QuickAddForm } from "./QuickAddForm";

interface QuickAddDialogProps {
  open: boolean;
  onClose: () => void;
}

export const QuickAddDialog: React.FC<QuickAddDialogProps> = ({ open, onClose }) => {
  const t = useT();
  return (
    <Dialog open={open} onOpenChange={(_, d) => !d.open && onClose()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <span>{t("quickAdd.title")}</span>
              <Keycaps keys={["Ctrl", "Shift", "Space"]} size="small" />
            </span>
          </DialogTitle>
          <DialogContent>
            <div style={{ marginTop: "8px" }}>
              {open && <QuickAddForm resetKey={open} onDone={onClose} onCancel={onClose} />}
            </div>
          </DialogContent>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
