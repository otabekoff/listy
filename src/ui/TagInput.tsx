import React, { useState } from "react";
import { Hash, X } from "lucide-react";
import { useT } from "../i18n/useT";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}

export const TagInput: React.FC<TagInputProps> = ({
  tags,
  onChange,
  suggestions = [],
  placeholder,
}) => {
  const t = useT();
  const [draft, setDraft] = useState("");

  const addTag = (raw: string) => {
    const cleaned = raw.trim().replace(/^#+/, "").toLowerCase();
    if (!cleaned || tags.includes(cleaned)) {
      setDraft("");
      return;
    }
    onChange([...tags, cleaned]);
    setDraft("");
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const availableSuggestions = suggestions.filter(
    (s) =>
      !tags.includes(s) &&
      (!draft.trim() || s.toLowerCase().includes(draft.trim().toLowerCase()))
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div
        className="win-input-wrap"
        style={{
          height: "auto",
          minHeight: "36px",
          padding: "5px 8px",
          flexWrap: "wrap",
          gap: "6px",
        }}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="win-badge"
            style={{
              backgroundColor: "var(--win-brand-tint)",
              color: "var(--win-brand-fg)",
              padding: "2px 6px 2px 8px",
              fontSize: "12px",
            }}
          >
            <Hash size={11} />
            {tag}
            <button
              type="button"
              aria-label={t("ui.removeTag", { tag })}
              onClick={() => removeTag(tag)}
              style={{
                border: "none",
                background: "transparent",
                color: "inherit",
                cursor: "pointer",
                display: "inline-flex",
                padding: "1px",
                marginLeft: "2px",
              }}
            >
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          className="win-input-el"
          style={{ minWidth: "120px", fontSize: "13.5px" }}
          value={draft}
          placeholder={tags.length === 0 ? placeholder ?? t("ui.tagPlaceholder") : t("ui.addTag")}
          onChange={(e) => {
            const val = e.target.value;
            if (val.endsWith(",")) {
              addTag(val.slice(0, -1));
            } else {
              setDraft(val);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Tab") {
              if (draft.trim()) {
                e.preventDefault();
                addTag(draft);
              }
            } else if (e.key === "Backspace" && !draft && tags.length > 0) {
              removeTag(tags[tags.length - 1]);
            }
          }}
          onBlur={() => {
            if (draft.trim()) addTag(draft);
          }}
        />
      </div>

      {availableSuggestions.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
          {availableSuggestions.slice(0, 6).map((s) => (
            <button
              key={s}
              type="button"
              className="listy-chip"
              style={{ padding: "2px 8px", fontSize: "11.5px" }}
              onClick={() => addTag(s)}
            >
              + #{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
