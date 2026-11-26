import type { Namespace } from "../index";

const ns: Namespace = {
  en: {
    subtitle: "Deleted lists are moved to your storage trash folder and can be restored anytime.",
    emptyTrash: "Empty Trash",
    isEmpty: "Trash is empty.",
    items_one: "{count} item",
    items_other: "{count} items",
    restore: "Restore",
    deleteForever: "Delete Forever",
    confirmEmptyTitle: "Empty Trash?",
    confirmDeleteTitle: "Delete “{name}” forever?",
    confirmEmptyMessage: "All lists in Trash will be permanently deleted from disk. This cannot be undone.",
    confirmDeleteMessage: "This list JSON file will be permanently deleted from disk. This cannot be undone.",
  },
  uz: {
    subtitle: "O‘chirilgan ro‘yxatlar xotiradagi savat jildiga ko‘chiriladi va ularni istalgan vaqtda tiklash mumkin.",
    emptyTrash: "Savatni tozalash",
    isEmpty: "Savat bo‘sh.",
    items_other: "{count} ta element",
    restore: "Tiklash",
    deleteForever: "Butunlay o‘chirish",
    confirmEmptyTitle: "Savat tozalansinmi?",
    confirmDeleteTitle: "“{name}” butunlay o‘chirilsinmi?",
    confirmEmptyMessage: "Savatdagi barcha ro‘yxatlar diskdan butunlay o‘chiriladi. Buni qaytarib bo‘lmaydi.",
    confirmDeleteMessage: "Bu ro‘yxatning JSON fayli diskdan butunlay o‘chiriladi. Buni qaytarib bo‘lmaydi.",
  },
  ru: {
    subtitle: "Удалённые списки перемещаются в папку корзины в хранилище, их можно восстановить в любой момент.",
    emptyTrash: "Очистить корзину",
    isEmpty: "Корзина пуста.",
    items_one: "{count} элемент",
    items_few: "{count} элемента",
    items_many: "{count} элементов",
    items_other: "{count} элемента",
    restore: "Восстановить",
    deleteForever: "Удалить навсегда",
    confirmEmptyTitle: "Очистить корзину?",
    confirmDeleteTitle: "Удалить «{name}» навсегда?",
    confirmEmptyMessage: "Все списки в корзине будут безвозвратно удалены с диска. Это действие нельзя отменить.",
    confirmDeleteMessage: "JSON-файл этого списка будет безвозвратно удалён с диска. Это действие нельзя отменить.",
  },
};

export default ns;
