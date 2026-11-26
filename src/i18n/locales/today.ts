import type { Namespace } from "../index";

const ns: Namespace = {
  en: {
    doneToday: "Done today",
    reopen: "Mark \"{title}\" as not done",
    completed: "Done: {title} (stays in {list})",
    movedTo: "{title} repeats: next on {date}",
    title: "Today",
    subtitle: "Overdue items, today's items and the next 7 days, from all your lists.",
    overdue: "Overdue",
    today: "Today",
    upcoming: "Next 7 days",
    empty: "Nothing due. Enjoy your day!",
    emptyHint: "Items with a due date in checklists, priority and status lists appear here.",
    complete: "Complete \"{title}\"",
  },
  uz: {
    doneToday: "Bugun bajarildi",
    reopen: "\"{title}\" ni bajarilmagan deb belgilash",
    completed: "Bajarildi: {title} ({list} ro‘yxatida qoladi)",
    movedTo: "{title} takrorlanadi: keyingisi {date}",
    title: "Bugun",
    subtitle: "Barcha ro‘yxatlaringizdagi muddati o‘tgan, bugungi va keyingi 7 kunlik elementlar.",
    overdue: "Muddati o‘tgan",
    today: "Bugun",
    upcoming: "Keyingi 7 kun",
    empty: "Muddati yetgan narsa yo‘q. Kuningiz xayrli o‘tsin!",
    emptyHint: "Checklist, muhimlik va holat ro‘yxatlaridagi muddatli elementlar shu yerda chiqadi.",
    complete: "\"{title}\" ni bajarildi deb belgilash",
  },
  ru: {
    doneToday: "Выполнено сегодня",
    reopen: "Снять отметку с «{title}»",
    completed: "Готово: {title} (остаётся в списке «{list}»)",
    movedTo: "{title} повторяется: следующий раз {date}",
    title: "Сегодня",
    subtitle: "Просроченные, сегодняшние и ближайшие 7 дней — из всех ваших списков.",
    overdue: "Просрочено",
    today: "Сегодня",
    upcoming: "Ближайшие 7 дней",
    empty: "Ничего не горит. Хорошего дня!",
    emptyHint: "Здесь появляются элементы со сроком из чек-листов, списков приоритетов и статусов.",
    complete: "Выполнить «{title}»",
  },
};

export default ns;
