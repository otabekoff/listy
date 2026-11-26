import React, { useEffect, useState } from "react";
import { Button, DatePicker, Dropdown, Field, Input, Option, TagInput } from "../ui";
import { useT } from "../i18n/useT";
import { useListyStore } from "../store/useListyStore";
import { Priority } from "../types/listy";
import { ListIcon } from "./ListIcon";

const LAST_LIST_KEY = "listy_quick_add_list";

interface QuickAddFormProps {
  /** Changes whenever the form is shown again, to clear it. */
  resetKey: unknown;
  onDone: () => void;
  onCancel: () => void;
  /** Rendered between the fields and the buttons (e.g. dialog chrome). */
  autoFocus?: boolean;
}

/** The Quick Add fields and buttons, shared by the in-app dialog and the global window. */
export const QuickAddForm: React.FC<QuickAddFormProps> = ({
  resetKey,
  onDone,
  onCancel,
  autoFocus = true,
}) => {
  const t = useT();
  const lists = useListyStore((s) => s.lists);
  const addItem = useListyStore((s) => s.addItem);
  const storeError = useListyStore((s) => s.error);

  const [selectedListId, setSelectedListId] = useState(
    () => localStorage.getItem(LAST_LIST_KEY) ?? ""
  );
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [priority, setPriority] = useState<Priority | "none">("none");
  const [dueDate, setDueDate] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setTitle("");
    setTags([]);
    setPriority("none");
    setDueDate("");
    setFailed(false);
  }, [resetKey]);

  const selectedList = lists.find((l) => l.id === selectedListId) ?? lists[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedList || !title.trim()) return;
    const saved = await addItem(selectedList.id, title, {
      tags,
      priority: priority === "none" ? undefined : priority,
      dueDate: dueDate || undefined,
    });
    // On failure keep the form (with the error) so the text isn't lost.
    setFailed(!saved);
    if (saved) {
      localStorage.setItem(LAST_LIST_KEY, selectedList.id);
      onDone();
    }
  };

  const priorities: Priority[] = ["low", "normal", "medium", "high"];

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
      style={{ display: "flex", flexDirection: "column", gap: "12px" }}
    >
      <Field label={t("quickAdd.targetList")} required>
        <Dropdown
          value={selectedList ? selectedList.name : t("quickAdd.noLists")}
          selectedOptions={selectedList ? [selectedList.id] : []}
          onOptionSelect={(_, d) => {
            if (d.optionValue) setSelectedListId(d.optionValue);
          }}
        >
          {lists.map((l) => (
            <Option key={l.id} value={l.id} text={l.name}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                <ListIcon iconId={l.icon} size={15} color={l.color} />
                {l.name}
              </span>
            </Option>
          ))}
        </Dropdown>
      </Field>

      <Field label={t("quickAdd.itemTitle")} required>
        <Input
          value={title}
          onChange={(_, d) => setTitle(d.value)}
          placeholder={t("quickAdd.titlePlaceholder")}
          autoFocus={autoFocus}
        />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <Field label={t("quickAdd.priority")}>
          <Dropdown
            value={priority === "none" ? t("common.none") : t(`common.priority.${priority}`)}
            selectedOptions={[priority]}
            onOptionSelect={(_, d) => setPriority((d.optionValue as Priority | "none") ?? "none")}
          >
            <Option value="none">{t("common.none")}</Option>
            {priorities.map((p) => (
              <Option key={p} value={p}>
                {t(`common.priority.${p}`)}
              </Option>
            ))}
          </Dropdown>
        </Field>
        <Field label={t("quickAdd.dueDate")}>
          <DatePicker
            value={dueDate}
            onChange={setDueDate}
            placeholder={t("quickAdd.duePlaceholder")}
          />
        </Field>
      </div>

      <Field label={t("quickAdd.tags")}>
        <TagInput tags={tags} onChange={setTags} placeholder={t("quickAdd.tagsPlaceholder")} />
      </Field>

      {failed && storeError && (
        <p role="alert" className="listy-dialog-error">
          {storeError}
        </p>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
        <Button appearance="secondary" type="button" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button appearance="primary" type="submit" disabled={!selectedList || !title.trim()}>
          {t("quickAdd.add")}
        </Button>
      </div>
    </form>
  );
};
