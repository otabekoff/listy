import React, { useRef, useState } from "react";
import { Code2, Eye, Pencil } from "lucide-react";
import { CodeBlock } from "./CodeBlock";
import { useT } from "../i18n/useT";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function highlightMarkdownSource(source: string): React.ReactNode {
  const lines = source.split("\n");
  let inFence = false;

  return lines.map((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      inFence = !inFence;
      return (
        <div key={idx} style={{ color: "#4EC9B0", fontWeight: 600 }}>
          {line || " "}
        </div>
      );
    }
    if (inFence) {
      return (
        <div key={idx} style={{ color: "#CE9178" }}>
          {line || " "}
        </div>
      );
    }
    if (/^#{1,6}\s/.test(line)) {
      return (
        <div key={idx} style={{ color: "#569CD6", fontWeight: 700 }}>
          {line}
        </div>
      );
    }
    if (/^\s*>\s?/.test(line)) {
      return (
        <div key={idx} style={{ color: "#6A9955", fontStyle: "italic" }}>
          {line}
        </div>
      );
    }
    // Highlight inline tokens: `code`, **bold**, *italic*, [text](url)
    const parts = line.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g);
    return (
      <div key={idx}>
        {parts.length === 1 && !line ? " " : null}
        {parts.map((part, pIdx) => {
          if (!part) return null;
          if (part.startsWith("`") && part.endsWith("`")) {
            return (
              <span key={pIdx} style={{ color: "#CE9178" }}>
                {part}
              </span>
            );
          }
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <span key={pIdx} style={{ color: "#DCDCAA", fontWeight: 700 }}>
                {part}
              </span>
            );
          }
          if (part.startsWith("*") && part.endsWith("*")) {
            return (
              <span key={pIdx} style={{ color: "#C586C0", fontStyle: "italic" }}>
                {part}
              </span>
            );
          }
          if (part.startsWith("[") && part.includes("](")) {
            return (
              <span key={pIdx} style={{ color: "#4FC1FF" }}>
                {part}
              </span>
            );
          }
          return <span key={pIdx}>{part}</span>;
        })}
      </div>
    );
  });
}

function renderInlineMarkdown(text: string): React.ReactNode {
  const parts = text.split(
    /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|\[[^\]]+\]\([^)]+\))/g
  );
  return parts.map((part, idx) => {
    if (!part) return null;
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={idx}
          style={{
            padding: "1px 5px",
            borderRadius: "4px",
            fontSize: "12px",
            fontFamily: "Cascadia Code, Consolas, monospace",
            backgroundColor: "var(--win-bg-hover)",
            border: "1px solid var(--win-border-2)",
            color: "var(--win-brand-fg)",
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={idx}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("~~") && part.endsWith("~~")) {
      return <del key={idx}>{part.slice(2, -2)}</del>;
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const href = /^https?:\/\//i.test(linkMatch[2])
        ? linkMatch[2]
        : `https://${linkMatch[2]}`;
      return (
        <a
          key={idx}
          href={href}
          target="_blank"
          rel="noreferrer"
          style={{ color: "var(--win-brand-fg)", textDecoration: "underline" }}
        >
          {linkMatch[1]}
        </a>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function renderMarkdownBlocks(source: string, emptyText: string): React.ReactNode {
  if (!source.trim()) {
    return (
      <span style={{ color: "var(--win-fg-3)", fontSize: "13px" }}>
        {emptyText}
      </span>
    );
  }

  const lines = source.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const fenceMatch = line.trim().match(/^```(\w*)/);
    if (fenceMatch) {
      const lang = fenceMatch[1] || "text";
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push(
        <CodeBlock key={`code-${i}`} code={codeLines.join("\n")} lang={lang} />
      );
      continue;
    }

    if (/^###\s+/.test(line)) {
      blocks.push(
        <h4 key={i} style={{ margin: "4px 0", fontSize: "14px", fontWeight: 600 }}>
          {renderInlineMarkdown(line.replace(/^###\s+/, ""))}
        </h4>
      );
    } else if (/^##\s+/.test(line)) {
      blocks.push(
        <h3 key={i} style={{ margin: "4px 0", fontSize: "15.5px", fontWeight: 600 }}>
          {renderInlineMarkdown(line.replace(/^##\s+/, ""))}
        </h3>
      );
    } else if (/^#\s+/.test(line)) {
      blocks.push(
        <h2 key={i} style={{ margin: "4px 0", fontSize: "17px", fontWeight: 700 }}>
          {renderInlineMarkdown(line.replace(/^#\s+/, ""))}
        </h2>
      );
    } else if (/^\s*>\s?/.test(line)) {
      blocks.push(
        <blockquote
          key={i}
          style={{
            margin: "2px 0",
            padding: "4px 10px",
            borderLeft: "3px solid var(--win-brand)",
            backgroundColor: "var(--win-bg-hover)",
            borderRadius: "0 6px 6px 0",
            color: "var(--win-fg-2)",
            fontSize: "13px",
          }}
        >
          {renderInlineMarkdown(line.replace(/^\s*>\s?/, ""))}
        </blockquote>
      );
    } else if (/^\s*[-*]\s+/.test(line)) {
      blocks.push(
        <div
          key={i}
          style={{
            display: "flex",
            gap: "8px",
            fontSize: "13.5px",
            paddingLeft: "6px",
          }}
        >
          <span>•</span>
          <span>{renderInlineMarkdown(line.replace(/^\s*[-*]\s+/, ""))}</span>
        </div>
      );
    } else if (!line.trim()) {
      blocks.push(<div key={i} style={{ height: "6px" }} />);
    } else {
      blocks.push(
        <p key={i} style={{ margin: 0, fontSize: "13.5px", lineHeight: 1.55 }}>
          {renderInlineMarkdown(line)}
        </p>
      );
    }
    i++;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      {blocks}
    </div>
  );
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder,
}) => {
  const t = useT();
  const [tab, setTab] = useState<"write" | "preview">("write");
  const preRef = useRef<HTMLPreElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertCodeBlock = () => {
    const snippet = "\n```ts\n// code here\n```\n";
    onChange(value ? `${value}${snippet}` : snippet.trimStart());
    setTab("write");
    window.setTimeout(() => textareaRef.current?.focus(), 20);
  };

  const syncScroll = () => {
    if (preRef.current && textareaRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  return (
    <div
      style={{
        borderRadius: "8px",
        border: "1px solid var(--win-border-1)",
        backgroundColor: "var(--win-bg-input)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "5px 8px",
          borderBottom: "1px solid var(--win-border-2)",
          backgroundColor: "var(--win-bg-subtle)",
        }}
      >
        <div style={{ display: "flex", gap: "4px" }}>
          <button
            type="button"
            className={`win-btn win-btn-small ${
              tab === "write" ? "win-btn-secondary" : "win-btn-subtle"
            }`}
            onClick={() => setTab("write")}
          >
            <Pencil size={12} /> {t("ui.write")}
          </button>
          <button
            type="button"
            className={`win-btn win-btn-small ${
              tab === "preview" ? "win-btn-secondary" : "win-btn-subtle"
            }`}
            onClick={() => setTab("preview")}
          >
            <Eye size={12} /> {t("ui.preview")}
          </button>
        </div>

        <button
          type="button"
          className="win-btn win-btn-subtle win-btn-small"
          onClick={insertCodeBlock}
          title={t("ui.insertCodeBlock")}
        >
          <Code2 size={13} /> {t("ui.codeBlock")}
        </button>
      </div>

      {tab === "write" ? (
        <div style={{ position: "relative", height: "140px" }}>
          <pre
            ref={preRef}
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              margin: 0,
              padding: "10px 12px",
              fontFamily: "Cascadia Code, Consolas, monospace",
              fontSize: "12.5px",
              lineHeight: 1.55,
              whiteSpace: "pre-wrap",
              wordWrap: "break-word",
              overflow: "hidden",
              color: "var(--win-fg-1)",
              pointerEvents: "none",
            }}
          >
            {value ? (
              highlightMarkdownSource(value)
            ) : (
              <span style={{ color: "var(--win-fg-3)" }}>{placeholder ?? t("ui.markdownPlaceholder")}</span>
            )}
          </pre>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onScroll={syncScroll}
            spellCheck={false}
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              margin: 0,
              padding: "10px 12px",
              border: "none",
              outline: "none",
              resize: "none",
              background: "transparent",
              color: "transparent",
              caretColor: "var(--win-fg-1)",
              fontFamily: "Cascadia Code, Consolas, monospace",
              fontSize: "12.5px",
              lineHeight: 1.55,
              overflowY: "auto",
            }}
          />
        </div>
      ) : (
        <div
          style={{
            minHeight: "140px",
            maxHeight: "220px",
            overflowY: "auto",
            padding: "10px 12px",
          }}
        >
          {renderMarkdownBlocks(value, t("ui.nothingToPreview"))}
        </div>
      )}
    </div>
  );
};
