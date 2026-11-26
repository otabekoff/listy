import type { Namespace } from "../index";

const ns: Namespace = {
  en: {
    conflict:
      "This list was changed somewhere else (another Listy window, the CLI, or a synced folder). The latest version has been loaded. Please try your change again.",
    copyName: "{name} (Copy)",
    itemUpdated: "Item updated",
    statusChanged: "Status changed",
    itemToggled: "Item checked",
    itemsReordered: "Items reordered",
    itemArchived: "Item moved to the archive",
    completedArchived: "Completed items archived",
    itemRestored: "Item restored",
    undone: "Undone: {action}",
    nothingToUndo: "Nothing to undo",
  },
  uz: {
    conflict:
      "Bu ro‘yxat boshqa joyda o‘zgartirildi (boshqa Listy oynasi, CLI yoki sinxronlangan papka). Eng so‘nggi versiya yuklandi. O‘zgarishni qaytadan kiriting.",
    copyName: "{name} (nusxa)",
    itemUpdated: "Element yangilandi",
    statusChanged: "Holat o‘zgardi",
    itemToggled: "Element belgilandi",
    itemsReordered: "Elementlar tartibi o‘zgardi",
    itemArchived: "Element arxivga o‘tkazildi",
    completedArchived: "Bajarilganlar arxivlandi",
    itemRestored: "Element tiklandi",
    undone: "Qaytarildi: {action}",
    nothingToUndo: "Qaytaradigan amal yo‘q",
  },
  ru: {
    conflict:
      "Этот список изменили в другом месте (другое окно Listy, CLI или синхронизируемая папка). Загружена последняя версия. Повторите изменение.",
    copyName: "{name} (копия)",
    itemUpdated: "Элемент изменён",
    statusChanged: "Статус изменён",
    itemToggled: "Элемент отмечен",
    itemsReordered: "Порядок изменён",
    itemArchived: "Элемент перемещён в архив",
    completedArchived: "Выполненные перемещены в архив",
    itemRestored: "Элемент восстановлен",
    undone: "Отменено: {action}",
    nothingToUndo: "Нечего отменять",
  },
};

export default ns;
