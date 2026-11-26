import type { Namespace } from "../index";

const ns: Namespace = {
  en: {
    title_one: "Listy: {count} item needs attention",
    title_other: "Listy: {count} items need attention",
    overdue: "{count} overdue",
    today: "{count} due today",
  },
  uz: {
    title_other: "Listy: {count} ta element e’tibor talab qiladi",
    overdue: "{count} tasi muddati o‘tgan",
    today: "{count} tasi bugun",
  },
  ru: {
    title_one: "Listy: {count} элемент требует внимания",
    title_few: "Listy: {count} элемента требуют внимания",
    title_many: "Listy: {count} элементов требуют внимания",
    title_other: "Listy: {count} элемента требуют внимания",
    overdue: "просрочено: {count}",
    today: "на сегодня: {count}",
  },
};

export default ns;
