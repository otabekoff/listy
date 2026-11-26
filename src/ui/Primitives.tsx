import React, { useEffect } from "react";
import { useT } from "../i18n/useT";

interface ThemeProviderProps {
  theme: "light" | "dark";
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  theme,
  children,
}) => {
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return <div className="win-theme-root">{children}</div>;
};

interface TextProps extends React.HTMLAttributes<HTMLElement> {
  size?: 100 | 200 | 300 | 400;
  weight?: "regular" | "medium" | "semibold" | "bold";
  block?: boolean;
  children?: React.ReactNode;
}

const SIZE_MAP: Record<number, string> = {
  100: "11.5px",
  200: "12.5px",
  300: "13.5px",
  400: "15px",
};

const WEIGHT_MAP: Record<string, number> = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

export const Text: React.FC<TextProps> = ({
  size = 300,
  weight = "regular",
  block = false,
  style,
  className = "",
  children,
  ...rest
}) => {
  const Tag = block ? "div" : "span";
  return (
    <Tag
      className={`win-text ${className}`}
      style={{
        fontSize: SIZE_MAP[size] ?? "14px",
        fontWeight: WEIGHT_MAP[weight] ?? 400,
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
};

export const Title2: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <h2 className="win-title2" style={style}>
    {children}
  </h2>
);

export const Title3: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <h3 className="win-title3" style={style}>
    {children}
  </h3>
);

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = "",
  children,
  ...rest
}) => (
  <div className={`win-card ${className}`} {...rest}>
    {children}
  </div>
);

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  appearance?: "tint" | "filled" | "outline";
  color?: "brand" | "danger" | "warning" | "informative" | "subtle";
  size?: "small" | "medium";
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  appearance = "tint",
  color = "subtle",
  style,
  className = "",
  children,
  ...rest
}) => {
  const palette: Record<string, { bg: string; fg: string; border: string }> = {
    brand: {
      bg: appearance === "filled" ? "var(--win-brand)" : "var(--win-brand-tint)",
      fg: appearance === "filled" ? "var(--win-fg-on-brand)" : "var(--win-brand-fg)",
      border: "var(--win-brand)",
    },
    danger: {
      bg: "var(--win-danger-tint)",
      fg: "var(--win-danger)",
      border: "var(--win-danger)",
    },
    warning: {
      bg: "var(--win-warning-tint)",
      fg: "var(--win-warning)",
      border: "var(--win-warning)",
    },
    informative: {
      bg: "var(--win-brand-tint)",
      fg: "var(--win-brand-fg)",
      border: "var(--win-brand)",
    },
    subtle: {
      bg: "var(--win-bg-hover)",
      fg: "var(--win-fg-2)",
      border: "var(--win-border-1)",
    },
  };
  const p = palette[color] ?? palette.subtle;
  return (
    <span
      className={`win-badge ${className}`}
      style={{
        backgroundColor: appearance === "outline" ? "transparent" : p.bg,
        color: p.fg,
        border: appearance === "outline" ? `1px solid ${p.border}` : "1px solid transparent",
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
};

export const CountBadge: React.FC<{ count: number }> = ({ count }) => {
  const t = useT();
  if (count <= 0) return null;
  if (count === 1) {
    return (
      <span
        aria-label={t("ui.oneItem")}
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          backgroundColor: "#ef4444",
          display: "inline-block",
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: "18px",
        height: "18px",
        padding: "0 5px",
        borderRadius: "999px",
        backgroundColor: "#ef4444",
        color: "#ffffff",
        fontSize: "11px",
        fontWeight: 700,
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {count >= 10 ? "9+" : count}
    </span>
  );
};

export const ProgressBar: React.FC<{
  value: number;
  max?: number;
  style?: React.CSSProperties;
}> = ({ value, max = 100, style }) => {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="win-progress-track" style={style}>
      <div className="win-progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
};

export const Spinner: React.FC<{ label?: string }> = ({ label }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "10px",
    }}
  >
    <div className="win-spinner" />
    {label && <Text size={300}>{label}</Text>}
  </div>
);

export const MessageBar: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => (
  <div className="win-message-bar" style={style}>
    {children}
  </div>
);

export const MessageBarBody: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <div style={{ flex: 1 }}>{children}</div>;

export const MessageBarActions: React.FC<{
  children?: React.ReactNode;
  containerAction?: React.ReactNode;
}> = ({ children, containerAction }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
    {children}
    {containerAction}
  </div>
);

export const Breadcrumb: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const t = useT();
  return (
    <nav
      aria-label={t("ui.breadcrumb")}
      style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}
    >
      {children}
    </nav>
  );
};

export const BreadcrumbItem: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <span style={{ display: "inline-flex", alignItems: "center" }}>{children}</span>;

export const BreadcrumbButton: React.FC<{
  onClick?: () => void;
  current?: boolean;
  children: React.ReactNode;
}> = ({ onClick, current, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={current}
    style={{
      background: "transparent",
      border: "none",
      padding: "2px 4px",
      borderRadius: "4px",
      fontFamily: "inherit",
      fontSize: "13px",
      fontWeight: current ? 600 : 400,
      color: current ? "var(--win-fg-1)" : "var(--win-fg-3)",
      cursor: current ? "default" : "pointer",
    }}
  >
    {children}
  </button>
);

export const BreadcrumbDivider: React.FC = () => (
  <span style={{ color: "var(--win-fg-3)", userSelect: "none" }}>/</span>
);

export const Keycaps: React.FC<{
  keys: string[];
  size?: "small" | "medium";
}> = ({ keys, size = "medium" }) => {
  const isSmall = size === "small";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: isSmall ? "3px" : "5px",
      }}
    >
      {keys.map((k, idx) => (
        <React.Fragment key={k}>
          {idx > 0 && (
            <span
              style={{
                fontSize: isSmall ? "10px" : "11px",
                color: "var(--win-fg-3)",
              }}
            >
              +
            </span>
          )}
          <kbd
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: isSmall ? "20px" : "26px",
              height: isSmall ? "20px" : "24px",
              padding: isSmall ? "0 5px" : "0 8px",
              borderRadius: "5px",
              fontSize: isSmall ? "11px" : "12px",
              fontWeight: 600,
              fontFamily: "inherit",
              backgroundColor: "var(--win-bg-subtle)",
              border: "1px solid var(--win-border-1)",
              borderBottomWidth: "2px",
              color: "var(--win-fg-1)",
            }}
          >
            {k}
          </kbd>
        </React.Fragment>
      ))}
    </span>
  );
};

export const SettingsSection: React.FC<{
  title?: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <div className="win-settings-section">
    {title && <div className="win-settings-section-title">{title}</div>}
    {children}
  </div>
);

export const SettingsCard: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  onClick?: () => void;
}> = ({ icon, title, description, action, onClick }) => (
  <div
    className="win-settings-card"
    onClick={onClick}
    style={{ cursor: onClick ? "pointer" : "default" }}
  >
    <div className="win-settings-card-left">
      {icon && <span className="win-settings-card-icon">{icon}</span>}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--win-fg-1)" }}>
          {title}
        </div>
        {description && (
          <div style={{ fontSize: "12px", color: "var(--win-fg-3)", marginTop: "2px" }}>
            {description}
          </div>
        )}
      </div>
    </div>
    {action && <div style={{ flexShrink: 0 }}>{action}</div>}
  </div>
);
