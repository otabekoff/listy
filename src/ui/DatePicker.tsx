import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useLocale, useT } from "../i18n/useT";

interface DatePickerProps {
  value: string; // YYYY-MM-DD or ""
  onChange: (value: string) => void;
  placeholder?: string;
}

// Monday-first week; 2024-01-01 was a Monday.
function weekdayNames(locale: string): string[] {
  return Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: "short" })
  );
}

function monthName(locale: string, year: number, month: number): string {
  const name = new Date(year, month, 1).toLocaleDateString(locale, { month: "long" });
  return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
}

function parseYMD(val: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return null;
  const [y, m, d] = val.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function toYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder,
}) => {
  const t = useT();
  const locale = useLocale();
  const weekdays = weekdayNames(locale);
  const parsed = parseYMD(value);
  const today = new Date();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(
    parsed?.getFullYear() ?? today.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(
    parsed?.getMonth() ?? today.getMonth()
  );
  const [pos, setPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popW = 268;
    const popH = 310;
    const left = Math.min(
      Math.max(8, rect.left),
      window.innerWidth - popW - 8
    );
    const fitsBelow = rect.bottom + 6 + popH <= window.innerHeight - 8;
    const top = fitsBelow
      ? rect.bottom + 6
      : Math.max(8, rect.top - popH - 6);
    setPos({ top, left });
  };

  useEffect(() => {
    if (open) {
      const p = parseYMD(value) ?? new Date();
      setViewYear(p.getFullYear());
      setViewMonth(p.getMonth());
      updatePosition();
    }
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onResize = () => updatePosition();
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const todayYMD = toYMD(today);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="win-btn win-btn-secondary"
        style={{
          width: "100%",
          justifyContent: "space-between",
          fontWeight: 400,
          padding: "0 10px",
        }}
        onClick={() => setOpen((o) => !o)}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            color: value ? "var(--win-fg-1)" : "var(--win-fg-3)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          <Calendar size={14} style={{ opacity: 0.75, flexShrink: 0 }} />
          {value || placeholder || t("ui.selectDate")}
        </span>
        {value && (
          <span
            role="button"
            aria-label={t("ui.clearDate")}
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            style={{
              display: "inline-flex",
              color: "var(--win-fg-3)",
              padding: "2px",
              flexShrink: 0,
            }}
          >
            <X size={13} />
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            className="win-popover"
            style={{
              position: "fixed",
              top: `${pos.top}px`,
              left: `${pos.left}px`,
              right: "auto",
              width: "268px",
              padding: "12px",
              gap: "8px",
              zIndex: 2100,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: "13.5px", fontWeight: 600 }}>
                {monthName(locale, viewYear, viewMonth)} {viewYear}
              </span>
              <div style={{ display: "flex", gap: "4px" }}>
                <button
                  type="button"
                  className="win-btn win-btn-subtle win-btn-small win-btn-icon-only"
                  onClick={prevMonth}
                  aria-label={t("ui.previousMonth")}
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  className="win-btn win-btn-subtle win-btn-small win-btn-icon-only"
                  onClick={nextMonth}
                  aria-label={t("ui.nextMonth")}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: "2px",
                textAlign: "center",
              }}
            >
              {weekdays.map((w) => (
                <div
                  key={w}
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--win-fg-3)",
                    padding: "4px 0",
                  }}
                >
                  {w}
                </div>
              ))}
              {cells.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} />;
                const cellYMD = `${viewYear}-${String(viewMonth + 1).padStart(
                  2,
                  "0"
                )}-${String(day).padStart(2, "0")}`;
                const isSelected = value === cellYMD;
                const isToday = todayYMD === cellYMD;
                return (
                  <button
                    key={cellYMD}
                    type="button"
                    onClick={() => {
                      onChange(cellYMD);
                      setOpen(false);
                    }}
                    style={{
                      height: "30px",
                      borderRadius: "6px",
                      border:
                        isToday && !isSelected
                          ? "1px solid var(--win-brand)"
                          : "1px solid transparent",
                      backgroundColor: isSelected
                        ? "var(--win-brand)"
                        : "transparent",
                      color: isSelected
                        ? "var(--win-fg-on-brand)"
                        : "var(--win-fg-1)",
                      fontSize: "12.5px",
                      fontWeight: isSelected || isToday ? 600 : 400,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                paddingTop: "6px",
                borderTop: "1px solid var(--win-border-2)",
              }}
            >
              <button
                type="button"
                className="win-btn win-btn-subtle win-btn-small"
                onClick={() => {
                  onChange(todayYMD);
                  setOpen(false);
                }}
              >
                {t("ui.today")}
              </button>
              <button
                type="button"
                className="win-btn win-btn-subtle win-btn-small"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                {t("ui.clear")}
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
