import React, { useEffect, useState } from "react";
import { ExternalLink, Link2, ListChecks, Paperclip, Plus, Repeat, X } from "lucide-react";
import {
  Button,
  Checkbox,
  DatePicker,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Dropdown,
  Field,
  Input,
  MarkdownEditor,
  Option,
  TagInput,
} from "../ui";
import { useT } from "../i18n/useT";
import { storageApi } from "../services/storageApi";
import { AttachmentMeta, ListItem, Priority, Recurrence, Subtask } from "../types/listy";

const RECURRENCES: Recurrence[] = ["daily", "weekly", "monthly", "yearly"];

function newSubtaskId(): string {
  return `sub-${crypto.randomUUID().slice(0, 8)}`;
}

interface ItemDetailDialogProps {
  open: boolean;
  listId: string;
  item: ListItem | null;
  availableTags?: string[];
  onClose: () => void;
  onSave: (patch: Partial<ListItem>) => Promise<void> | void;
}

const PRIORITY_DOT: Record<Priority, string> = {
  high: "#EF4444",
  medium: "#F59E0B",
  normal: "#3B82F6",
  low: "#64748B",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const ItemDetailDialog: React.FC<ItemDetailDialogProps> = ({
  open,
  listId,
  item,
  availableTags = [],
  onClose,
  onSave,
}) => {
  const t = useT();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [completed, setCompleted] = useState(false);
  const [priority, setPriority] = useState<Priority | "none">("none");
  const [tags, setTags] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [url, setUrl] = useState("");
  const [image, setImage] = useState("");
  const [notes, setNotes] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence | "none">("none");
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([]);
  // File changes are only applied on Save: files attached in this session are deleted
  // again on Cancel, and files removed in this session are deleted only after saving.
  const [addedFiles, setAddedFiles] = useState<string[]>([]);
  const [removedFiles, setRemovedFiles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && item) {
      setTitle(item.title);
      setDescription(item.description ?? "");
      setCompleted(item.completed);
      setPriority(item.priority ?? "none");
      setTags(item.tags ?? []);
      setDueDate(item.dueDate ?? "");
      setUrl(item.url ?? "");
      setImage(item.image ?? "");
      setNotes(item.notes ?? "");
      setRecurrence(item.recurrence ?? "none");
      setSubtasks(item.subtasks ?? []);
      setNewSubtask("");
      setAttachments(item.attachments ?? []);
      setAddedFiles([]);
      setRemovedFiles([]);
      setError(null);
    }
  }, [open, item]);

  const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err));

  const handleAttach = async () => {
    try {
      const added = await storageApi.attachFilesWithDialog(listId);
      if (added.length > 0) {
        setAttachments((prev) => [...prev, ...added]);
        setAddedFiles((prev) => [...prev, ...added.map((a) => a.fileName)]);
      }
    } catch (err) {
      setError(errorText(err));
    }
  };

  const handleRemoveAttachment = (att: AttachmentMeta) => {
    setAttachments((prev) => prev.filter((a) => a.id !== att.id));
    if (addedFiles.includes(att.fileName)) {
      // Attached during this session and never saved: nothing references it.
      setAddedFiles((prev) => prev.filter((f) => f !== att.fileName));
      storageApi.removeAttachment(listId, att.fileName).catch(() => undefined);
    } else {
      setRemovedFiles((prev) => [...prev, att.fileName]);
    }
  };

  const handleOpenAttachment = (att: AttachmentMeta) => {
    storageApi.openAttachment(listId, att.fileName).catch((err) => setError(errorText(err)));
  };

  const addSubtask = () => {
    const text = newSubtask.trim();
    if (!text) return;
    setSubtasks((prev) => [...prev, { id: newSubtaskId(), title: text, completed: false }]);
    setNewSubtask("");
  };

  const handleCancel = () => {
    if (saving) return;
    for (const fileName of addedFiles) {
      storageApi.removeAttachment(listId, fileName).catch(() => undefined);
    }
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        completed,
        priority: priority === "none" ? undefined : priority,
        tags,
        dueDate: dueDate.trim() || undefined,
        url: url.trim() || undefined,
        image: image.trim() || undefined,
        notes: notes.trim() || undefined,
        attachments,
        recurrence: recurrence === "none" ? undefined : recurrence,
        subtasks: subtasks
          .map((st) => ({ ...st, title: st.title.trim() }))
          .filter((st) => st.title),
      });
    } catch (err) {
      setError(errorText(err));
      setSaving(false);
      return;
    }
    for (const fileName of removedFiles) {
      storageApi.removeAttachment(listId, fileName).catch(() => undefined);
    }
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && handleCancel()}>
      <DialogSurface style={{ maxWidth: "600px" }}>
        <form onSubmit={handleSubmit}>
          <DialogBody>
            <DialogTitle>{t("item.editTitle")}</DialogTitle>
            <DialogContent>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  marginTop: "8px",
                }}
              >
                <Field label={t("item.title")} required>
                  <Input
                    value={title}
                    onChange={(_, d) => setTitle(d.value)}
                    autoFocus
                  />
                </Field>

                <Checkbox
                  checked={completed}
                  onChange={(_, d) => setCompleted(Boolean(d.checked))}
                  label={t("item.markCompleted")}
                />

                <Field label={t("item.description")}>
                  <Input
                    value={description}
                    onChange={(_, d) => setDescription(d.value)}
                    placeholder={t("item.descriptionPlaceholder")}
                  />
                </Field>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <Field label={t("item.priority")}>
                    <Dropdown
                      value={
                        priority === "none"
                          ? t("common.none")
                          : t(`common.priority.${priority}`)
                      }
                      selectedOptions={[priority]}
                      onOptionSelect={(_, d) =>
                        setPriority(
                          (d.optionValue as Priority | "none") ?? "none"
                        )
                      }
                    >
                      <Option value="none">{t("common.none")}</Option>
                      {(["low", "normal", "medium", "high"] as Priority[]).map(
                        (p) => (
                          <Option key={p} value={p}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <span
                                style={{
                                  width: "8px",
                                  height: "8px",
                                  borderRadius: "50%",
                                  backgroundColor: PRIORITY_DOT[p],
                                }}
                              />
                              {t(`common.priority.${p}`)}
                            </span>
                          </Option>
                        )
                      )}
                    </Dropdown>
                  </Field>

                  <Field label={t("item.dueDate")}>
                    <DatePicker
                      value={dueDate}
                      onChange={setDueDate}
                      placeholder={t("item.duePlaceholder")}
                    />
                  </Field>
                </div>

                <Field label={t("item.repeat")}>
                  <Dropdown
                    value={t(`common.repeat.${recurrence}`)}
                    selectedOptions={[recurrence]}
                    onOptionSelect={(_, d) =>
                      setRecurrence((d.optionValue as Recurrence | "none") ?? "none")
                    }
                  >
                    <Option value="none">{t("common.repeat.none")}</Option>
                    {RECURRENCES.map((r) => (
                      <Option key={r} value={r}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                          <Repeat size={13} />
                          {t(`common.repeat.${r}`)}
                        </span>
                      </Option>
                    ))}
                  </Dropdown>
                </Field>
                {recurrence !== "none" && (
                  <p style={{ margin: "-6px 0 0", fontSize: "12px", color: "var(--win-fg-3)" }}>
                    {t("item.repeatHint")}
                  </p>
                )}

                <Field label={t("item.subtasks")}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {subtasks.map((st) => (
                      <div key={st.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Checkbox
                          checked={st.completed}
                          aria-label={st.title}
                          onChange={(_, d) =>
                            setSubtasks((prev) =>
                              prev.map((x) =>
                                x.id === st.id ? { ...x, completed: Boolean(d.checked) } : x
                              )
                            )
                          }
                        />
                        <Input
                          style={{ flex: 1 }}
                          value={st.title}
                          onChange={(_, d) =>
                            setSubtasks((prev) =>
                              prev.map((x) => (x.id === st.id ? { ...x, title: d.value } : x))
                            )
                          }
                        />
                        <Button
                          appearance="subtle"
                          size="small"
                          icon={<X size={14} />}
                          aria-label={t("item.removeSubtask", { title: st.title })}
                          onClick={() => setSubtasks((prev) => prev.filter((x) => x.id !== st.id))}
                        />
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: "8px" }}>
                      <Input
                        style={{ flex: 1 }}
                        contentBefore={<ListChecks size={14} />}
                        value={newSubtask}
                        placeholder={t("item.subtaskPlaceholder")}
                        onChange={(_, d) => setNewSubtask(d.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addSubtask();
                          }
                        }}
                      />
                      <Button
                        appearance="secondary"
                        icon={<Plus size={14} />}
                        disabled={!newSubtask.trim()}
                        onClick={addSubtask}
                      >
                        {t("item.addSubtask")}
                      </Button>
                    </div>
                  </div>
                </Field>

                <Field label={t("item.tags")}>
                  <TagInput
                    tags={tags}
                    onChange={setTags}
                    suggestions={availableTags}
                    placeholder={t("quickAdd.tagsPlaceholder")}
                  />
                </Field>

                <Field label={t("item.url")}>
                  <Input
                    type="url"
                    contentBefore={<Link2 size={14} />}
                    value={url}
                    onChange={(_, d) => setUrl(d.value)}
                    placeholder="https://..."
                  />
                </Field>

                {image && (
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <img
                      src={image}
                      alt={title || t("item.imagePreview")}
                      style={{
                        width: "56px",
                        height: "56px",
                        borderRadius: "10px",
                        objectFit: "cover",
                        border: "1px solid var(--win-border-1)",
                      }}
                    />
                    <Button
                      appearance="subtle"
                      size="small"
                      onClick={() => setImage("")}
                    >
                      {t("item.removeImage")}
                    </Button>
                  </div>
                )}

                <Field label={t("item.notes")}>
                  <MarkdownEditor value={notes} onChange={setNotes} />
                </Field>

                <Field label={t("item.attachments")}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div>
                      <Button
                        appearance="secondary"
                        size="small"
                        icon={<Paperclip size={14} />}
                        onClick={handleAttach}
                      >
                        {t("item.attachFile")}
                      </Button>
                    </div>
                    {attachments.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {attachments.map((att) => (
                          <span
                            key={att.id}
                            className="win-badge"
                            style={{
                              backgroundColor: "var(--win-bg-subtle)",
                              border: "1px solid var(--win-border-1)",
                              color: "var(--win-fg-1)",
                              padding: "4px 8px",
                              fontSize: "12px",
                            }}
                          >
                            <Paperclip size={11} />
                            <button
                              type="button"
                              onClick={() => handleOpenAttachment(att)}
                              style={{
                                border: "none",
                                background: "transparent",
                                color: "var(--win-brand-fg)",
                                cursor: "pointer",
                                fontFamily: "inherit",
                                fontSize: "12px",
                                padding: 0,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              {att.name}
                              <ExternalLink size={10} />
                            </button>
                            <span style={{ color: "var(--win-fg-3)", fontSize: "11px" }}>
                              ({formatFileSize(att.size)})
                            </span>
                            <button
                              type="button"
                              aria-label={t("item.removeFile", { name: att.name })}
                              onClick={() => handleRemoveAttachment(att)}
                              style={{
                                border: "none",
                                background: "transparent",
                                color: "var(--win-fg-3)",
                                cursor: "pointer",
                                display: "inline-flex",
                                padding: "1px",
                              }}
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Field>
              </div>
              {error && (
                <p role="alert" className="listy-dialog-error">
                  {error}
                </p>
              )}
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={handleCancel} type="button">
                {t("common.cancel")}
              </Button>
              <Button
                appearance="primary"
                type="submit"
                disabled={!title.trim() || saving}
              >
                {saving ? t("common.saving") : t("item.save")}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  );
};
