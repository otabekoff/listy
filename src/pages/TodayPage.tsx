import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarCheck, Repeat } from "lucide-react";
import { Badge, Checkbox, Text, Title2 } from "../ui";
import { ListIcon } from "../components/ListIcon";
import { useT } from "../i18n/useT";
import { DueEntry, collectDue } from "../services/due";
import { useListyStore } from "../store/useListyStore";
import { describeDueDate, nextDueDate, parseLocalDate } from "../types/listy";
import { useLocale } from "../i18n/useT";

/** Everything due across all lists: overdue, today, and the next seven days. */
export const TodayPage: React.FC = () => {
  const t = useT();
  const navigate = useNavigate();
  const lists = useListyStore((s) => s.lists);
  const toggleItem = useListyStore((s) => s.toggleItem);
  const setItemStatus = useListyStore((s) => s.setItemStatus);
  const showToast = useListyStore((s) => s.showToast);
  const locale = useLocale();
  const due = useMemo(() => collectDue(lists), [lists]);

  const setDone = async (entry: DueEntry, done: boolean) => {
    const { list, item } = entry;
    const ok =
      list.type === "status"
        ? await setItemStatus(list.id, item.id, done ? { status: "done", completed: true } : { status: "todo", completed: false })
        : await toggleItem(list.id, item.id);
    if (!ok || !done) return;
    // Say where the item went: done (listed below), or on to its next date.
    if (item.recurrence) {
      const next = parseLocalDate(nextDueDate(item.dueDate, item.recurrence));
      const date = next?.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" }) ?? "";
      showToast(t("today.movedTo", { title: item.title, date }), true);
    } else {
      showToast(t("today.completed", { title: item.title, list: list.name }), true);
    }
  };

  const section = (title: string, entries: DueEntry[], tone?: "danger" | "done") =>
    entries.length > 0 && (
      <section style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <Text
          weight="semibold"
          size={300}
          style={{
            color: tone === "danger" ? "var(--win-danger)" : tone === "done" ? "var(--win-fg-3)" : "var(--win-fg-2)",
          }}
        >
          {title} · {entries.length}
        </Text>
        {entries.map((entry) => {
          const info = describeDueDate(entry.item.dueDate ?? "");
          const subtasks = entry.item.subtasks ?? [];
          const done = entry.item.completed;
          return (
            <div
              key={`${entry.list.id}/${entry.item.id}`}
              className="listy-item-row"
              style={done ? { opacity: 0.72 } : undefined}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: 1 }}>
                <Checkbox
                  checked={done}
                  aria-label={t(done ? "today.reopen" : "today.complete", { title: entry.item.title })}
                  onChange={() => void setDone(entry, !done)}
                />
                <div
                  style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: 0, cursor: "pointer" }}
                  onClick={() => navigate(`/list/${entry.list.id}`)}
                >
                  <Text
                    weight="medium"
                    style={done ? { textDecoration: "line-through", color: "var(--win-fg-3)" } : undefined}
                  >
                    {entry.item.title}
                  </Text>
                  <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px" }}>
                    {!done && (
                      <Badge
                        appearance="tint"
                        size="small"
                        color={info.state === "overdue" ? "danger" : info.state === "later" ? undefined : "warning"}
                      >
                        {info.label}
                      </Badge>
                    )}
                    {entry.item.recurrence && (
                      <Badge appearance="tint" color="subtle" size="small">
                        <Repeat size={10} /> {t(`common.repeat.${entry.item.recurrence}`)}
                      </Badge>
                    )}
                    {subtasks.length > 0 && (
                      <Badge appearance="tint" color="subtle" size="small">
                        {subtasks.filter((s) => s.completed).length}/{subtasks.length}
                      </Badge>
                    )}
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "12px",
                        color: "var(--win-fg-3)",
                      }}
                    >
                      <ListIcon iconId={entry.list.icon} size={12} color={entry.list.color} />
                      {entry.list.name}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </section>
    );

  const empty =
    due.overdue.length + due.today.length + due.upcoming.length + due.doneToday.length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <Title2>{t("today.title")}</Title2>
        <Text size={300} block style={{ color: "var(--win-fg-3)" }}>
          {t("today.subtitle")}
        </Text>
      </div>
      {empty ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--win-fg-3)" }}>
          <CalendarCheck size={40} style={{ opacity: 0.6 }} />
          <Text size={400} block style={{ marginTop: "12px" }}>
            {t("today.empty")}
          </Text>
          <Text size={300} block style={{ marginTop: "4px" }}>
            {t("today.emptyHint")}
          </Text>
        </div>
      ) : (
        <>
          {section(t("today.overdue"), due.overdue, "danger")}
          {section(t("today.today"), due.today)}
          {section(t("today.upcoming"), due.upcoming)}
          {section(t("today.doneToday"), due.doneToday, "done")}
        </>
      )}
    </div>
  );
};
