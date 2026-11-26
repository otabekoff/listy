import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "./Inputs";
import { useT } from "../i18n/useT";

function highlightGenericLine(line: string, lang: string, lineIdx: number): React.ReactNode {
  const trimmed = line.trim();
  if (
    (lang === "bash" || lang === "sh" || lang === "python" || lang === "py") &&
    trimmed.startsWith("#")
  ) {
    return (
      <span key={lineIdx} style={{ color: "#6A9955", fontStyle: "italic" }}>
        {line}
      </span>
    );
  }
  if (trimmed.startsWith("//")) {
    return (
      <span key={lineIdx} style={{ color: "#6A9955", fontStyle: "italic" }}>
        {line}
      </span>
    );
  }
  if (lang === "json") {
    const tokens = line.split(/("[^"]*"(?=\s*:)|"[^"]*"|\b(?:true|false|null)\b|\b\d+(?:\.\d+)?\b)/g);
    return (
      <span key={lineIdx}>
        {tokens.map((tok, i) => {
          if (!tok) return null;
          if (tok.startsWith('"') && tok.endsWith('"')) {
            const rest = line.slice(line.indexOf(tok) + tok.length).trimStart();
            const isKey = rest.startsWith(":");
            return (
              <span key={i} style={{ color: isKey ? "#9CDCFE" : "#CE9178" }}>
                {tok}
              </span>
            );
          }
          if (tok === "true" || tok === "false" || tok === "null") {
            return (
              <span key={i} style={{ color: "#569CD6" }}>
                {tok}
              </span>
            );
          }
          if (/^\d/.test(tok)) {
            return (
              <span key={i} style={{ color: "#B5CEA8" }}>
                {tok}
              </span>
            );
          }
          return <span key={i}>{tok}</span>;
        })}
      </span>
    );
  }

  const tokens = line.split(
    /("[^"]*"|'[^']*'|`[^`]*`|--[a-zA-Z0-9-]+|\b(?:const|let|var|fn|pub|struct|impl|function|return|import|export|from|if|else|for|while|async|await|def|class|cargo|listy-cli|true|false|null)\b|\b\d+(?:\.\d+)?\b)/g
  );
  return (
    <span key={lineIdx}>
      {tokens.map((tok, i) => {
        if (!tok) return null;
        if (
          (tok.startsWith('"') && tok.endsWith('"')) ||
          (tok.startsWith("'") && tok.endsWith("'")) ||
          (tok.startsWith("`") && tok.endsWith("`"))
        ) {
          return (
            <span key={i} style={{ color: "#CE9178" }}>
              {tok}
            </span>
          );
        }
        if (tok.startsWith("--")) {
          return (
            <span key={i} style={{ color: "#9CDCFE" }}>
              {tok}
            </span>
          );
        }
        if (tok === "cargo" || tok === "listy-cli") {
          return (
            <span key={i} style={{ color: "#4EC9B0", fontWeight: 600 }}>
              {tok}
            </span>
          );
        }
        if (
          /^(const|let|var|fn|pub|struct|impl|function|return|import|export|from|if|else|for|while|async|await|def|class|true|false|null)$/.test(
            tok
          )
        ) {
          return (
            <span key={i} style={{ color: "#C586C0" }}>
              {tok}
            </span>
          );
        }
        if (/^\d/.test(tok)) {
          return (
            <span key={i} style={{ color: "#B5CEA8" }}>
              {tok}
            </span>
          );
        }
        return <span key={i}>{tok}</span>;
      })}
    </span>
  );
}

export const CodeBlock: React.FC<{
  code: string;
  lang?: string;
  title?: string;
}> = ({ code, lang = "text", title }) => {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const normLang = lang.toLowerCase().trim() || "text";
  const lines = code.split("\n");

  const handleCopy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div
      style={{
        borderRadius: "8px",
        overflow: "hidden",
        border: "1px solid var(--win-border-1)",
        backgroundColor: "#14161c",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "5px 8px 5px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          backgroundColor: "rgba(255,255,255,0.03)",
        }}
      >
        <span style={{ fontSize: "11.5px", fontWeight: 600, color: "#9aa0a6" }}>
          {title ?? normLang.toUpperCase()}
        </span>
        <Button
          appearance="subtle"
          size="small"
          icon={
            copied ? (
              <Check size={13} color="#4EC9B0" />
            ) : (
              <Copy size={13} color="#d4d4d8" />
            )
          }
          aria-label={t("ui.copyCode")}
          onClick={handleCopy}
          style={{ color: "#d4d4d8", height: "24px", fontSize: "11.5px" }}
        >
          {copied ? t("ui.copied") : t("ui.copy")}
        </Button>
      </div>
      <pre
        style={{
          margin: 0,
          padding: "10px 12px",
          color: "#d4d4d8",
          fontSize: "12.5px",
          lineHeight: 1.55,
          overflowX: "auto",
          fontFamily: "Cascadia Code, Consolas, monospace",
        }}
      >
        {lines.map((line, idx) => (
          <div key={idx}>{highlightGenericLine(line, normLang, idx)}</div>
        ))}
      </pre>
    </div>
  );
};
