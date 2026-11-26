import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { useT } from "../i18n/useT";

export const Dialog: React.FC<{
  open: boolean;
  onOpenChange?: (_: unknown, data: { open: boolean }) => void;
  children: React.ReactNode;
}> = ({ open, onOpenChange, children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange?.(null, { open: false });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;
  return (
    <div
      className="win-dialog-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onOpenChange?.(null, { open: false });
        }
      }}
    >
      {children}
    </div>
  );
};

export const DialogSurface: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => (
  <div className="win-dialog-surface" style={style}>
    {children}
  </div>
);

export const DialogBody: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <div>{children}</div>;

export const DialogTitle: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <h2 className="win-dialog-title">{children}</h2>;

export const DialogContent: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className = "", children }) => (
  <div className={className}>{children}</div>
);

export const DialogActions: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <div className="win-dialog-actions">{children}</div>;

/* Dropdown & Option */
const DropdownContext = React.createContext<{
  selectedOptions: string[];
  onSelect: (value: string) => void;
}>({ selectedOptions: [], onSelect: () => {} });

export const Dropdown: React.FC<{
  value: string;
  selectedOptions?: string[];
  onOptionSelect?: (_: unknown, data: { optionValue?: string }) => void;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ value, selectedOptions = [], onOptionSelect, style, children }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 180,
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = Math.max(rect.width, 160);
    const estH = 220;
    const left = Math.min(
      Math.max(8, rect.left),
      window.innerWidth - width - 8
    );
    const fitsBelow = rect.bottom + 4 + estH <= window.innerHeight - 8;
    const top = fitsBelow
      ? rect.bottom + 4
      : Math.max(8, rect.top - estH - 4);
    setPos({ top, left, width });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.setTimeout(() => {
      const items = popoverRef.current?.querySelectorAll<HTMLButtonElement>(".win-menu-item");
      if (!items || items.length === 0) return;
      const selected = popoverRef.current?.querySelector<HTMLButtonElement>(".win-menu-item.selected");
      (selected ?? items[0]).focus();
    }, 0);
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || popoverRef.current?.contains(t)) {
        return;
      }
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      popoverRef.current?.querySelectorAll<HTMLButtonElement>(".win-menu-item") ?? []
    );
    if (items.length === 0) return;
    const idx = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(idx + 1) % items.length].focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(idx - 1 + items.length) % items.length].focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0].focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1].focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div className="win-popover-anchor" style={style}>
      <button
        ref={triggerRef}
        type="button"
        className="win-btn win-btn-secondary"
        style={{
          width: "100%",
          justifyContent: "space-between",
          fontWeight: 400,
        }}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {value}
        </span>
        <ChevronDown size={14} style={{ opacity: 0.7, flexShrink: 0 }} />
      </button>
      {open &&
        createPortal(
          <DropdownContext.Provider
            value={{
              selectedOptions,
              onSelect: (val) => {
                onOptionSelect?.(null, { optionValue: val });
                setOpen(false);
              },
            }}
          >
            <div
              ref={popoverRef}
              className="win-popover"
              role="listbox"
              onKeyDown={handleMenuKeyDown}
              style={{
                position: "fixed",
                top: `${pos.top}px`,
                left: `${pos.left}px`,
                right: "auto",
                minWidth: `${pos.width}px`,
                zIndex: 2100,
              }}
            >
              {children}
            </div>
          </DropdownContext.Provider>,
          document.body
        )}
    </div>
  );
};

export const Option: React.FC<{
  value: string;
  text?: string;
  children: React.ReactNode;
}> = ({ value, children }) => {
  const ctx = React.useContext(DropdownContext);
  const isSelected = ctx.selectedOptions.includes(value);
  return (
    <button
      type="button"
      className={`win-menu-item ${isSelected ? "selected" : ""}`}
      onClick={() => ctx.onSelect(value)}
    >
      {children}
    </button>
  );
};

/* Menu */
const MenuContext = React.createContext<{
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  popoverRef: React.RefObject<HTMLDivElement | null>;
}>({
  open: false,
  setOpen: () => {},
  anchorRef: { current: null },
  popoverRef: { current: null },
});

export const Menu: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t) || popoverRef.current?.contains(t)) {
        return;
      }
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <MenuContext.Provider value={{ open, setOpen, anchorRef, popoverRef }}>
      <div className="win-popover-anchor" ref={anchorRef}>
        {children}
      </div>
    </MenuContext.Provider>
  );
};

export const MenuTrigger: React.FC<{
  disableButtonEnhancement?: boolean;
  children: React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>;
}> = ({ children }) => {
  const { setOpen } = React.useContext(MenuContext);
  return React.cloneElement(children, {
    onClick: (e: React.MouseEvent) => {
      children.props.onClick?.(e);
      setOpen((o) => !o);
    },
  });
};

export const MenuPopover: React.FC<{
  onClick?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}> = ({ onClick, children }) => {
  const { open, anchorRef, popoverRef } = React.useContext(MenuContext);
  const [pos, setPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const popW = 200;
    const popH = 260;
    const left = Math.min(
      Math.max(8, rect.right - popW),
      window.innerWidth - popW - 8
    );
    const fitsBelow = rect.bottom + 4 + popH <= window.innerHeight - 8;
    const top = fitsBelow
      ? rect.bottom + 4
      : Math.max(8, rect.top - popH - 4);
    setPos({ top, left });
    window.setTimeout(() => {
      const first = popoverRef.current?.querySelector<HTMLButtonElement>(".win-menu-item");
      first?.focus();
    }, 0);
  }, [open, anchorRef]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      popoverRef.current?.querySelectorAll<HTMLButtonElement>(".win-menu-item") ?? []
    );
    if (items.length === 0) return;
    const idx = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(idx + 1) % items.length].focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(idx - 1 + items.length) % items.length].focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0].focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1].focus();
    }
  };

  if (!open) return null;
  return createPortal(
    <div
      ref={popoverRef}
      className="win-popover"
      role="menu"
      onKeyDown={handleKeyDown}
      onClick={onClick}
      style={{
        position: "fixed",
        top: `${pos.top}px`,
        left: `${pos.left}px`,
        right: "auto",
        minWidth: "200px",
        zIndex: 2100,
      }}
    >
      {children}
    </div>,
    document.body
  );
};

export const MenuList: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <>{children}</>;

export const MenuItem: React.FC<{
  icon?: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
}> = ({ icon, onClick, children }) => {
  const { setOpen } = React.useContext(MenuContext);
  return (
    <button
      type="button"
      className="win-menu-item"
      onClick={() => {
        onClick?.();
        setOpen(false);
      }}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
};

/* Tooltip */
export const Tooltip: React.FC<{
  content: React.ReactNode;
  placement?: "top" | "bottom";
  fullWidth?: boolean;
  children: React.ReactNode;
}> = ({ content, placement = "top", fullWidth = false, children }) => {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number; align: "left" | "center" | "right" }>({
    x: 0,
    y: 0,
    align: "center",
  });
  const anchorRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<number | null>(null);

  const show = () => {
    timerRef.current = window.setTimeout(() => {
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      let align: "left" | "center" | "right" = "center";
      let x = rect.left + rect.width / 2;
      if (rect.left < 96) {
        align = "left";
        x = Math.max(8, rect.left);
      } else if (rect.right > window.innerWidth - 96) {
        align = "right";
        x = Math.min(window.innerWidth - 8, rect.right);
      }
      setPos({
        x,
        y: placement === "top" ? rect.top - 8 : rect.bottom + 8,
        align,
      });
      setVisible(true);
    }, 350);
  };

  const hide = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
  };

  useEffect(() => () => hide(), []);

  const tx =
    pos.align === "left" ? "0%" : pos.align === "right" ? "-100%" : "-50%";
  const ty = placement === "top" ? "-100%" : "0%";

  return (
    <span
      ref={anchorRef}
      className="win-tooltip-wrap"
      style={fullWidth ? { width: "100%", display: "flex" } : undefined}
      onMouseEnter={show}
      onMouseLeave={hide}
      onMouseDown={hide}
    >
      {children}
      {visible &&
        content &&
        createPortal(
          <span
            className="win-tooltip"
            style={{
              left: `${pos.x}px`,
              top: `${pos.y}px`,
              transform: `translate(${tx}, ${ty})`,
            }}
          >
            {content}
          </span>,
          document.body
        )}
    </span>
  );
};

/* ConfirmDialog */
export const ConfirmDialog: React.FC<{
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({
  open,
  title,
  message,
  confirmLabel,
  onCancel,
  onConfirm,
}) => {
  const t = useT();
  return (
  <Dialog open={open} onOpenChange={(_, d) => !d.open && onCancel()}>
    <DialogSurface>
      <DialogBody>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <p
            style={{
              margin: "6px 0 0 0",
              fontSize: "14px",
              color: "var(--win-fg-2)",
            }}
          >
            {message}
          </p>
        </DialogContent>
        <DialogActions>
          <button
            type="button"
            className="win-btn win-btn-secondary"
            onClick={onCancel}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className="win-btn win-btn-danger"
            onClick={onConfirm}
          >
            {confirmLabel ?? t("ui.confirm")}
          </button>
        </DialogActions>
      </DialogBody>
    </DialogSurface>
  </Dialog>
  );
};

/* ContextMenu */
export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

export const ContextMenu: React.FC<{
  position: { x: number; y: number } | null;
  items: ContextMenuItem[];
  onClose: () => void;
}> = ({ position, items, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!position) return;
    window.setTimeout(() => {
      ref.current?.querySelector<HTMLButtonElement>(".win-menu-item")?.focus();
    }, 0);
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [position, onClose]);

  if (!position) return null;
  const popW = 200;
  const popH = items.length * 36 + 12;
  const left = Math.min(Math.max(8, position.x), window.innerWidth - popW - 8);
  const top = Math.min(Math.max(8, position.y), window.innerHeight - popH - 8);

  return createPortal(
    <div
      ref={ref}
      className="win-popover"
      role="menu"
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        const btns = Array.from(
          ref.current?.querySelectorAll<HTMLButtonElement>(".win-menu-item") ?? []
        );
        if (btns.length === 0) return;
        const idx = btns.indexOf(document.activeElement as HTMLButtonElement);
        if (e.key === "ArrowDown") {
          e.preventDefault();
          btns[(idx + 1) % btns.length].focus();
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          btns[(idx - 1 + btns.length) % btns.length].focus();
        }
      }}
      style={{
        position: "fixed",
        top: `${top}px`,
        left: `${left}px`,
        right: "auto",
        minWidth: `${popW}px`,
        zIndex: 2200,
      }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          className="win-menu-item"
          style={item.danger ? { color: "var(--win-danger)" } : undefined}
          onClick={() => {
            item.onClick();
            onClose();
          }}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </div>,
    document.body
  );
};
