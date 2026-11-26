import React, { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  Radio,
  RadioGroup,
  Textarea,
  Tooltip,
} from "../ui";
import {
  STARTER_TEMPLATES,
  StarterTemplate,
  templateToPayload,
} from "../data/templates";
import {
  LIST_COLORS,
  LIST_ICONS,
  ListData,
  ListItem,
  ListType,
} from "../types/listy";
import { useT } from "../i18n/useT";
import { ListIcon } from "./ListIcon";

export interface ListDialogValues {
  name: string;
  description: string;
  icon: string;
  color: string;
  type: ListType;
  items?: ListItem[];
}

interface ListDialogProps {
  open: boolean;
  mode: "create" | "edit";
  initial?: ListData | null;
  onClose: () => void;
  onSubmit: (values: ListDialogValues) => Promise<void> | void;
}

export const ListDialog: React.FC<ListDialogProps> = ({
  open,
  mode,
  initial,
  onClose,
  onSubmit,
}) => {
  const t = useT();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("blank");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("list");
  const [color, setColor] = useState(LIST_COLORS[0]);
  const [type, setType] = useState<ListType>("checklist");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the form only when the dialog opens. `initial` gets a new identity whenever the
  // lists are reloaded (window focus, widget edits), which used to wipe what you typed.
  useEffect(() => {
    if (open) {
      setError(null);
      if (mode === "edit" && initial) {
        setSelectedTemplateId("blank");
        setName(initial.name);
        setDescription(initial.description ?? "");
        setIcon(initial.icon ?? "list");
        setColor(initial.color ?? LIST_COLORS[0]);
        setType(initial.type ?? "checklist");
      } else {
        setSelectedTemplateId("blank");
        setName("");
        setDescription("");
        setIcon("list");
        setColor(LIST_COLORS[0]);
        setType("checklist");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, initial?.id]);

  const applyTemplate = (tpl: StarterTemplate | null) => {
    if (!tpl) {
      setSelectedTemplateId("blank");
      setName("");
      setDescription("");
      setIcon("list");
      setColor(LIST_COLORS[0]);
      setType("checklist");
      return;
    }
    setSelectedTemplateId(tpl.id);
    setName(tpl.name);
    setDescription(tpl.description);
    setIcon(tpl.icon);
    setColor(tpl.color);
    setType(tpl.type);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const tpl =
        mode === "create"
          ? STARTER_TEMPLATES.find((t) => t.id === selectedTemplateId)
          : undefined;
      const starterItems = tpl ? templateToPayload(tpl).items : undefined;
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        icon,
        color,
        type,
        items: starterItems,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface>
        <form onSubmit={handleSubmit}>
          <DialogBody>
            <DialogTitle>
              {mode === "create" ? t("listDialog.createTitle") : t("listDialog.editTitle")}
            </DialogTitle>
            <DialogContent>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                  marginTop: "8px",
                }}
              >
                {mode === "create" && (
                  <Field label={t("listDialog.template")}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      <button
                        type="button"
                        onClick={() => applyTemplate(null)}
                        className={`listy-chip ${
                          selectedTemplateId === "blank" ? "selected" : ""
                        }`}
                      >
                        {t("listDialog.blank")}
                      </button>
                      {STARTER_TEMPLATES.map((tpl) => (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => applyTemplate(tpl)}
                          className={`listy-chip ${
                            selectedTemplateId === tpl.id ? "selected" : ""
                          }`}
                        >
                          <ListIcon iconId={tpl.icon} size={14} color={tpl.color} />
                          {tpl.name}
                        </button>
                      ))}
                    </div>
                  </Field>
                )}

                <Field label={t("listDialog.name")} required>
                  <Input
                    value={name}
                    onChange={(_, d) => setName(d.value)}
                    placeholder={t("listDialog.namePlaceholder")}
                    autoFocus
                  />
                </Field>

                <Field label={t("listDialog.description")}>
                  <Textarea
                    value={description}
                    onChange={(_, d) => setDescription(d.value)}
                    placeholder={t("listDialog.descriptionPlaceholder")}
                    rows={2}
                  />
                </Field>

                <Field label={t("listDialog.icon")}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {LIST_ICONS.map((opt) => (
                      <Tooltip key={opt.id} content={t(`icons.${opt.id}`)}>
                        <button
                          type="button"
                          aria-label={t(`icons.${opt.id}`)}
                          onClick={() => setIcon(opt.id)}
                          className={`listy-icon-pick ${
                            icon === opt.id ? "selected" : ""
                          }`}
                        >
                          <ListIcon
                            iconId={opt.id}
                            size={18}
                            color="var(--win-fg-1)"
                          />
                        </button>
                      </Tooltip>
                    ))}
                  </div>
                </Field>

                <Field label={t("listDialog.color")}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {LIST_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={t("listDialog.selectColor", { color: c })}
                        onClick={() => setColor(c)}
                        style={{
                          backgroundColor: c,
                          borderColor:
                            color === c
                              ? "var(--win-brand)"
                              : "var(--win-border-1)",
                        }}
                        className={`listy-color-pick ${
                          color === c ? "selected" : ""
                        }`}
                      />
                    ))}
                  </div>
                </Field>

                <Field label={t("listDialog.type")}>
                  <RadioGroup
                    value={type}
                    onChange={(_, d) => setType(d.value as ListType)}
                    layout="horizontal"
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "10px 20px",
                        width: "100%",
                      }}
                    >
                      {(["checklist", "simple", "priority", "status"] as const).map((lt) => (
                        <Radio
                          key={lt}
                          value={lt}
                          label={t(`listDialog.type.${lt}`)}
                          description={t(`listDialog.type.${lt}.desc`)}
                        />
                      ))}
                    </div>
                  </RadioGroup>
                </Field>
              </div>
              {error && (
                <p role="alert" className="listy-dialog-error">
                  {error}
                </p>
              )}
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={onClose} type="button">
                {t("common.cancel")}
              </Button>
              <Button
                appearance="primary"
                type="submit"
                disabled={!name.trim() || saving}
              >
                {mode === "create" ? t("listDialog.create") : t("listDialog.saveChanges")}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  );
};
