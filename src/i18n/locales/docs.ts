import type { Namespace } from "../index";

// Inline markup understood by DocsPage: **bold**, *italic*, `code`.
const ns: Namespace = {
  en: {
    title: "Docs",
    intro: "Select a section below to expand its guide, examples, and configuration.",

    "usage.title": "How to Use Listy",
    "usage.subtitle": "4 list types, subtasks, repeating items, Markdown notes, archive, trash & undo",
    "usage.types":
      "**4 List Types:** Choose between `Checklist` (checkboxes), `Simple List`, `Priority List`, or `Status List` (cycles *To Do → In Progress → Done*).",
    "usage.items":
      "**Rich Items:** Click any item to edit its description, priority, due date, tags, URL, **Markdown notes** (with live syntax highlighting & code blocks), or attach files stored locally in `attachments/`.",
    "usage.subtasks":
      "**Subtasks:** Break an item into smaller steps. The item shows a badge such as `2/5` — click it to expand the subtasks and tick them off right in the list.",
    "usage.repeat":
      "**Repeating Items:** Set an item to repeat *every day*, *week*, *month* or *year*. When you complete it, Listy moves its due date to the next occurrence instead of leaving it done.",
    "usage.deletion":
      "**Safe Deletion:** Deleting an item moves it into that list's `Archive`; deleting a list moves it into `Trash` so you can restore it anytime.",
    "usage.undo":
      "**Undo:** Press `Ctrl+Z` to undo the last check, archive, edit or reorder.",

    "today.title": "Today & Reminders",
    "today.subtitle": "What is due across all your lists, and a daily reminder",
    "today.page":
      "**Today page** (`Ctrl+T`): one view with *overdue* items, items *due today* and the *next 7 days*, collected from all your lists.",
    "today.reminders":
      "**Due Date Reminders:** Once a day (from 09:00) Listy shows a Windows notification about items that are due today or overdue. Turn it off in *Settings → Due date reminders*.",

    "shortcuts.title": "Quick Add & Keyboard Shortcuts",
    "shortcuts.subtitle": "Add items from anywhere and move around faster",
    "shortcuts.quickAdd": "Quick Add inside Listy",
    "shortcuts.globalQuickAdd": "Quick Add from any app, even when Listy is in the tray",
    "shortcuts.today": "Open the Today page",
    "shortcuts.undo": "Undo the last change (check, archive, edit, reorder)",
    "shortcuts.globalNote":
      "The global shortcut can be turned off in *Settings → Quick Add from anywhere*; `Ctrl+Shift+Space` inside the app keeps working.",

    "tray.title": "System Tray, Desktop Widget & Badges",
    "tray.subtitle": "Tray icon, start with Windows, floating mini-widget, updates and count badges",
    "tray.tray":
      "**Windows System Tray:** Listy stays accessible from the Windows notification area. Left-click the tray icon to bring Listy to front, or right-click for *Open Listy*, *Desktop Widget*, and *Quit*.",
    "tray.closeToTray":
      "**Close to Tray:** With *Settings → Keep running in the tray*, closing the window hides Listy to the tray, so reminders and global Quick Add keep working. Use *Quit* in the tray menu to exit completely.",
    "tray.autostart":
      "**Start with Windows:** Turn on *Settings → Start with Windows* to open Listy in the tray when you sign in.",
    "tray.widget":
      "**Desktop Mini-Widget:** Launch from the System Tray or *Settings → Desktop Mini-Widget*. Pick any list, check off tasks, quick-add items, click **Pin on top** to keep it on top, or click **Stick to Desktop** (Monitor icon) for Rainmeter-style placement behind normal windows and hidden from Alt+Tab.",
    "tray.updates":
      "**Automatic Updates:** Listy checks for a new version shortly after it starts. You can also check by hand in *Settings → Updates*.",
    "tray.badges": "Count Badges:",

    "storage.title": "Local-First File Storage",
    "storage.subtitle": "Plain JSON files, live sync, .zip backups and list export",
    "storage.files":
      "Every list lives in its own atomic JSON file inside your chosen folder. Point Settings to OneDrive, Dropbox, or a USB drive for portable sync.",
    "storage.treeTitle": "Folder Structure",
    "storage.liveChanges":
      "**Live Changes:** When `listy-cli`, `listy-mcp` or a sync client (OneDrive, Dropbox…) changes the files, the app shows the changes immediately — no restart needed.",
    "storage.backup":
      "**Backups:** *Settings → Backup & Restore* saves a `.zip` with all lists, the trash, attachments and settings. Restore accepts these `.zip` files and older `.json` backups.",
    "storage.exportList":
      "**Export a List:** A single list exports as `.json`, or as `.zip` when it has attachments. Import it again from *Settings → Backup & Restore*.",

    "cli.title": "CLI (listy-cli)",
    "cli.subtitle": "Create lists, add items, search and change status from PowerShell or Terminal",
    "cli.storage":
      "By default, `listy-cli` reads the active folder configured in Settings. Override it anytime with `--storage <path>` or `LISTY_STORAGE`.",
    "cli.commands":
      "**Commands:** `path`, `lists`, `trash` (lists in the trash), `get <list_id>`, `search <query>` (find items in all lists), `create`, `delete`, `restore`, `add-item`, `toggle-item`, `set-status <list_id> <item_id> <todo|in_progress|done>`, `delete-item`.",
    "cli.addItemFlags":
      "**add-item options:** `--title` (required), `--desc`, `--notes <markdown>`, `--priority low|normal|medium|high`, `--tags a,b`, `--due YYYY-MM-DD`, `--repeat daily|weekly|monthly|yearly`, `--status todo|in_progress|done`, `--subtasks \"a;b;c\"`, `--url <link>`.",
    "cli.help": "Run `listy-cli help` to see all commands. Every command prints JSON.",

    "mcp.title": "MCP Server (listy-mcp)",
    "mcp.subtitle": "Connect AI agents via stdio JSON-RPC 2.0",
    "mcp.badge_one": "{count} tool",
    "mcp.badge_other": "{count} tools",
    "mcp.intro":
      "Add `listy-mcp.exe` to any MCP client (Claude Desktop, Cursor, Antigravity) so AI agents can read and update your lists directly on disk:",
    "mcp.configTitle": "mcpServers configuration",
    "mcp.tool.get_storage_path": "Get the active Listy storage folder",
    "mcp.tool.list_lists": "List all active lists (summary=true: only names and counts)",
    "mcp.tool.list_trash": "List the lists in the trash",
    "mcp.tool.get_list": "Fetch a single list with all its items",
    "mcp.tool.search": "Find items in all lists by title, description, notes, tags or subtasks",
    "mcp.tool.create_list": "Create a list: simple, checklist, priority or status",
    "mcp.tool.delete_list": "Move a list to the trash",
    "mcp.tool.restore_list": "Restore a list from the trash",
    "mcp.tool.add_item": "Add an item, with notes, status, repeat, subtasks and URL",
    "mcp.tool.update_item": "Change fields of an item",
    "mcp.tool.set_status": "Set an item's status: todo, in_progress or done",
    "mcp.tool.toggle_item": "Toggle the completed state of an item",
    "mcp.tool.delete_item": "Move an item to its list's archive",
    "mcp.createList":
      "`create_list` accepts all four types: `simple`, `checklist`, `priority` and `status`. In `add_item`, `recurrence` is `daily`, `weekly`, `monthly` or `yearly`, and `subtasks` is a list of subtask titles.",
    "mcp.updateItem":
      "`update_item` changes only the fields you pass; an empty string clears an optional field. `set_status` with `done` also completes the item.",
  },
  uz: {
    title: "Qo‘llanma",
    intro: "Qo‘llanma, misollar va sozlashni ko‘rish uchun quyidagi bo‘limlardan birini oching.",

    "usage.title": "Listy’dan qanday foydalaniladi",
    "usage.subtitle":
      "4 xil ro‘yxat, kichik vazifalar, takrorlanuvchi elementlar, Markdown eslatmalar, arxiv, Savat va qaytarish",
    "usage.types":
      "**4 xil ro‘yxat:** `Checklist` (belgilash katakchalari), `Oddiy ro‘yxat`, `Muhimlik ro‘yxati` yoki `Holat ro‘yxati` (*Bajarilishi kerak → Jarayonda → Bajarildi* tartibida almashadi) dan birini tanlang.",
    "usage.items":
      "**Boy elementlar:** Istalgan elementni bosib, uning tavsifi, muhimligi, muddati, teglari, havolasi va **Markdown eslatmalari**ni (sintaksis ranglari va kod bloklari bilan) tahrirlang yoki `attachments/` papkasida saqlanadigan fayllarni biriktiring.",
    "usage.subtasks":
      "**Kichik vazifalar:** Elementni kichik qadamlarga bo‘ling. Elementda `2/5` kabi belgi ko‘rinadi — uni bossangiz, kichik vazifalar ochiladi va ularni shu yerning o‘zida belgilashingiz mumkin.",
    "usage.repeat":
      "**Takrorlanuvchi elementlar:** Elementni *har kuni*, *har hafta*, *har oy* yoki *har yili* takrorlanadigan qiling. Uni bajarganingizda Listy elementni bajarilgan holda qoldirmaydi, balki muddatini keyingi sanaga o‘tkazadi.",
    "usage.deletion":
      "**Xavfsiz o‘chirish:** Element o‘chirilsa, o‘sha ro‘yxatning `arxiv`iga tushadi; ro‘yxat o‘chirilsa, `Savat`ga tushadi va uni istalgan vaqtda tiklash mumkin.",
    "usage.undo":
      "**Qaytarish:** Oxirgi belgilash, arxivlash, tahrirlash yoki tartibni o‘zgartirishni bekor qilish uchun `Ctrl+Z` ni bosing.",

    "today.title": "Bugun va eslatmalar",
    "today.subtitle": "Barcha ro‘yxatlardagi muddatli ishlar va kunlik eslatma",
    "today.page":
      "**Bugun sahifasi** (`Ctrl+T`): barcha ro‘yxatlaringizdagi *muddati o‘tgan*, *bugungi* va *keyingi 7 kunlik* elementlar bitta joyda.",
    "today.reminders":
      "**Muddat eslatmalari:** Kuniga bir marta (09:00 dan keyin) Listy bugun muddati tugaydigan yoki muddati o‘tgan elementlar haqida Windows bildirishnomasini ko‘rsatadi. Uni *Sozlamalar → Muddat eslatmalari* bo‘limida o‘chirish mumkin.",

    "shortcuts.title": "Tez qo‘shish va tezkor tugmalar",
    "shortcuts.subtitle": "Istalgan joydan element qo‘shing va tezroq ishlang",
    "shortcuts.quickAdd": "Listy ichida Tez qo‘shish",
    "shortcuts.globalQuickAdd": "Istalgan dasturdan Tez qo‘shish (Listy treyda bo‘lsa ham)",
    "shortcuts.today": "Bugun sahifasini ochish",
    "shortcuts.undo": "Oxirgi o‘zgarishni qaytarish (belgilash, arxivlash, tahrirlash, tartib)",
    "shortcuts.globalNote":
      "Umumiy tezkor tugmani *Sozlamalar → Istalgan joydan tez qo‘shish* bo‘limida o‘chirish mumkin; dastur ichidagi `Ctrl+Shift+Space` ishlashda davom etadi.",

    "tray.title": "Tizim treyi, ish stoli vidjeti va belgilar",
    "tray.subtitle": "Trey belgisi, Windows bilan ishga tushish, mini-vidjet, yangilanishlar va son belgilari",
    "tray.tray":
      "**Windows tizim treyi:** Listy’ni Windows bildirishnomalar hududidan doim ochish mumkin. Listy’ni oldinga chiqarish uchun trey belgisini chap tugma bilan bosing yoki *Listy’ni ochish*, *Ish stoli vidjeti* va *Chiqish* uchun o‘ng tugma bilan bosing.",
    "tray.closeToTray":
      "**Treyga yopish:** *Sozlamalar → Trayda ishlab turish* yoqilgan bo‘lsa, oyna yopilganda Listy treyga yashirinadi, eslatmalar va umumiy Tez qo‘shish ishlashda davom etadi. Butunlay chiqish uchun trey menyusidagi *Chiqish* ni tanlang.",
    "tray.autostart":
      "**Windows bilan ishga tushish:** Tizimga kirganingizda Listy treyda ochilishi uchun *Sozlamalar → Windows bilan birga ishga tushirish* ni yoqing.",
    "tray.widget":
      "**Ish stoli mini-vidjeti:** Tizim treyidan yoki *Sozlamalar → Ish stoli mini-vidjeti* orqali oching. Istalgan ro‘yxatni tanlang, vazifalarni belgilang, tez element qo‘shing, oynalar ustida turishi uchun **Yuqorida qadash** ni bosing yoki Rainmeter uslubida oddiy oynalar ortida turishi va Alt+Tab’da ko‘rinmasligi uchun **Ish stoliga biriktirish** (monitor belgisi) ni bosing.",
    "tray.updates":
      "**Avtomatik yangilanish:** Listy ishga tushgandan so‘ng tez orada yangi versiyani tekshiradi. Buni *Sozlamalar → Yangilanishlar* bo‘limida qo‘lda ham qilish mumkin.",
    "tray.badges": "Son belgilari:",

    "storage.title": "Mahalliy fayllarda saqlash",
    "storage.subtitle": "Oddiy JSON fayllar, jonli sinxronlash, .zip zaxira nusxalar va ro‘yxat eksporti",
    "storage.files":
      "Har bir ro‘yxat siz tanlagan papkada alohida JSON faylda saqlanadi va xavfsiz yoziladi. Ko‘chma sinxronlash uchun Sozlamalarda saqlash papkasini OneDrive, Dropbox yoki USB diskka ko‘rsating.",
    "storage.treeTitle": "Papka tuzilmasi",
    "storage.liveChanges":
      "**Jonli o‘zgarishlar:** `listy-cli`, `listy-mcp` yoki sinxronlash dasturi (OneDrive, Dropbox…) fayllarni o‘zgartirsa, o‘zgarishlar dasturda darhol ko‘rinadi — qayta ishga tushirish shart emas.",
    "storage.backup":
      "**Zaxira nusxalar:** *Sozlamalar → Zaxira nusxa va tiklash* barcha ro‘yxatlar, Savat, biriktirilgan fayllar va sozlamalarni bitta `.zip` faylga saqlaydi. Tiklashda shu `.zip` fayllar ham, eski `.json` zaxira nusxalar ham qabul qilinadi.",
    "storage.exportList":
      "**Ro‘yxatni eksport qilish:** Bitta ro‘yxat `.json` sifatida, biriktirilgan fayllari bo‘lsa `.zip` sifatida eksport qilinadi. Uni *Sozlamalar → Zaxira nusxa va tiklash* orqali qayta import qilish mumkin.",

    "cli.title": "CLI (listy-cli)",
    "cli.subtitle":
      "PowerShell yoki Terminal’dan ro‘yxat yarating, element qo‘shing, qidiring va holatini o‘zgartiring",
    "cli.storage":
      "Odatda `listy-cli` Sozlamalarda tanlangan saqlash papkasini o‘qiydi. Uni istalgan vaqtda `--storage <path>` yoki `LISTY_STORAGE` bilan almashtirish mumkin.",
    "cli.commands":
      "**Buyruqlar:** `path`, `lists`, `trash` (Savatdagi ro‘yxatlar), `get <list_id>`, `search <query>` (barcha ro‘yxatlardan element qidirish), `create`, `delete`, `restore`, `add-item`, `toggle-item`, `set-status <list_id> <item_id> <todo|in_progress|done>`, `delete-item`.",
    "cli.addItemFlags":
      "**add-item parametrlari:** `--title` (majburiy), `--desc`, `--notes <markdown>`, `--priority low|normal|medium|high`, `--tags a,b`, `--due YYYY-MM-DD`, `--repeat daily|weekly|monthly|yearly`, `--status todo|in_progress|done`, `--subtasks \"a;b;c\"`, `--url <link>`.",
    "cli.help":
      "Barcha buyruqlarni ko‘rish uchun `listy-cli help` ni ishga tushiring. Har bir buyruq natijani JSON ko‘rinishida chiqaradi.",

    "mcp.title": "MCP server (listy-mcp)",
    "mcp.subtitle": "AI agentlarni stdio JSON-RPC 2.0 orqali ulang",
    "mcp.badge_other": "{count} ta vosita",
    "mcp.intro":
      "AI agentlar ro‘yxatlaringizni to‘g‘ridan-to‘g‘ri diskda o‘qishi va yangilashi uchun `listy-mcp.exe` ni istalgan MCP mijoziga (Claude Desktop, Cursor, Antigravity) qo‘shing:",
    "mcp.configTitle": "mcpServers sozlamasi",
    "mcp.tool.get_storage_path": "Joriy saqlash papkasini olish",
    "mcp.tool.list_lists": "Barcha faol ro‘yxatlar (summary=true: faqat nomlar va sonlar)",
    "mcp.tool.list_trash": "Savatdagi ro‘yxatlar",
    "mcp.tool.get_list": "Bitta ro‘yxatni barcha elementlari bilan olish",
    "mcp.tool.search":
      "Barcha ro‘yxatlardan nom, tavsif, eslatma, teg yoki kichik vazifa bo‘yicha element qidirish",
    "mcp.tool.create_list": "Ro‘yxat yaratish: simple, checklist, priority yoki status",
    "mcp.tool.delete_list": "Ro‘yxatni Savatga o‘tkazish",
    "mcp.tool.restore_list": "Ro‘yxatni Savatdan tiklash",
    "mcp.tool.add_item":
      "Element qo‘shish: eslatma, holat, takrorlanish, kichik vazifalar va havola bilan",
    "mcp.tool.update_item": "Element maydonlarini o‘zgartirish",
    "mcp.tool.set_status": "Element holatini belgilash: todo, in_progress yoki done",
    "mcp.tool.toggle_item": "Elementni bajarilgan/bajarilmagan qilish",
    "mcp.tool.delete_item": "Elementni ro‘yxat arxiviga o‘tkazish",
    "mcp.createList":
      "`create_list` to‘rt turni ham qabul qiladi: `simple`, `checklist`, `priority` va `status`. `add_item` da `recurrence` — `daily`, `weekly`, `monthly` yoki `yearly`, `subtasks` esa kichik vazifalar nomlari ro‘yxati.",
    "mcp.updateItem":
      "`update_item` faqat siz bergan maydonlarni o‘zgartiradi; bo‘sh satr ixtiyoriy maydonni tozalaydi. `set_status` ga `done` berilsa, element bajarilgan deb ham belgilanadi.",
  },
  ru: {
    title: "Справка",
    intro: "Откройте раздел ниже, чтобы увидеть руководство, примеры и настройки.",

    "usage.title": "Как пользоваться Listy",
    "usage.subtitle":
      "4 типа списков, подзадачи, повторяющиеся элементы, заметки в Markdown, архив, корзина и отмена",
    "usage.types":
      "**4 типа списков:** `Чек-лист` (флажки), `Простой список`, `Список с приоритетами` или `Список со статусами` (по кругу *К выполнению → В работе → Готово*).",
    "usage.items":
      "**Подробные элементы:** Нажмите на любой элемент, чтобы изменить описание, приоритет, срок, теги, ссылку, **заметки в Markdown** (с подсветкой синтаксиса и блоками кода) или прикрепить файлы, которые хранятся локально в `attachments/`.",
    "usage.subtasks":
      "**Подзадачи:** Разбейте элемент на небольшие шаги. У элемента появится значок вроде `2/5` — нажмите на него, чтобы раскрыть подзадачи и отмечать их прямо в списке.",
    "usage.repeat":
      "**Повторяющиеся элементы:** Настройте повтор *каждый день*, *неделю*, *месяц* или *год*. Когда вы отмечаете такой элемент выполненным, Listy переносит срок на следующую дату.",
    "usage.deletion":
      "**Безопасное удаление:** Удалённый элемент попадает в `Архив` своего списка, а удалённый список — в `Корзину`, откуда его можно восстановить в любой момент.",
    "usage.undo":
      "**Отмена:** Нажмите `Ctrl+Z`, чтобы отменить последнюю отметку, архивацию, правку или перестановку.",

    "today.title": "Сегодня и напоминания",
    "today.subtitle": "Сроки из всех списков и ежедневное напоминание",
    "today.page":
      "**Страница «Сегодня»** (`Ctrl+T`): *просроченные* элементы, элементы *на сегодня* и на *ближайшие 7 дней* из всех ваших списков в одном месте.",
    "today.reminders":
      "**Напоминания о сроках:** Раз в день (начиная с 09:00) Listy показывает уведомление Windows об элементах со сроком на сегодня и просроченных. Отключить можно в *Настройки → Напоминания о сроках*.",

    "shortcuts.title": "Быстрое добавление и сочетания клавиш",
    "shortcuts.subtitle": "Добавляйте элементы откуда угодно и работайте быстрее",
    "shortcuts.quickAdd": "Быстрое добавление внутри Listy",
    "shortcuts.globalQuickAdd": "Быстрое добавление из любой программы, даже когда Listy в трее",
    "shortcuts.today": "Открыть страницу «Сегодня»",
    "shortcuts.undo": "Отменить последнее действие (отметка, архив, правка, порядок)",
    "shortcuts.globalNote":
      "Глобальное сочетание можно отключить в *Настройки → Быстрое добавление отовсюду*; `Ctrl+Shift+Space` внутри приложения продолжит работать.",

    "tray.title": "Системный трей, виджет и счётчики",
    "tray.subtitle": "Значок в трее, автозапуск, мини-виджет, обновления и счётчики",
    "tray.tray":
      "**Системный трей Windows:** Listy всегда доступен из области уведомлений. Щёлкните значок левой кнопкой, чтобы вывести Listy на передний план, или правой — для пунктов *Открыть Listy*, *Виджет рабочего стола* и *Выход*.",
    "tray.closeToTray":
      "**Сворачивание в трей:** Если включено *Настройки → Работать в трее*, при закрытии окна Listy прячется в трей, а напоминания и глобальное быстрое добавление продолжают работать. Чтобы выйти полностью, выберите *Выход* в меню трея.",
    "tray.autostart":
      "**Запуск вместе с Windows:** Включите *Настройки → Запускать вместе с Windows*, и Listy будет открываться в трее при входе в систему.",
    "tray.widget":
      "**Мини-виджет рабочего стола:** Откройте его из трея или через *Настройки → Мини-виджет рабочего стола*. Выберите список, отмечайте задачи, быстро добавляйте элементы, нажмите **Поверх всех окон**, чтобы виджет был поверх окон, или **Закрепить на рабочем столе** (значок монитора), чтобы он, как в Rainmeter, находился за обычными окнами и не показывался в Alt+Tab.",
    "tray.updates":
      "**Автообновление:** Вскоре после запуска Listy проверяет, есть ли новая версия. Проверить вручную можно в *Настройки → Обновления*.",
    "tray.badges": "Счётчики:",

    "storage.title": "Локальное хранение в файлах",
    "storage.subtitle": "Обычные JSON-файлы, живая синхронизация, резервные копии .zip и экспорт списков",
    "storage.files":
      "Каждый список хранится в отдельном JSON-файле в выбранной вами папке и записывается атомарно. Укажите в настройках папку OneDrive, Dropbox или USB-накопитель — и списки будут с вами везде.",
    "storage.treeTitle": "Структура папки",
    "storage.liveChanges":
      "**Изменения на лету:** Когда `listy-cli`, `listy-mcp` или клиент синхронизации (OneDrive, Dropbox…) меняют файлы, приложение сразу показывает изменения — перезапуск не нужен.",
    "storage.backup":
      "**Резервные копии:** *Настройки → Резервное копирование* сохраняет `.zip` со всеми списками, корзиной, вложениями и настройками. Восстановить можно из таких `.zip` и из старых резервных копий `.json`.",
    "storage.exportList":
      "**Экспорт списка:** Отдельный список экспортируется в `.json`, а если в нём есть вложения — в `.zip`. Импортировать его обратно можно в *Настройки → Резервное копирование*.",

    "cli.title": "CLI (listy-cli)",
    "cli.subtitle":
      "Создавайте списки, добавляйте элементы, ищите и меняйте статус из PowerShell или терминала",
    "cli.storage":
      "По умолчанию `listy-cli` работает с папкой, выбранной в настройках. Её можно переопределить через `--storage <path>` или `LISTY_STORAGE`.",
    "cli.commands":
      "**Команды:** `path`, `lists`, `trash` (списки в корзине), `get <list_id>`, `search <query>` (поиск элементов во всех списках), `create`, `delete`, `restore`, `add-item`, `toggle-item`, `set-status <list_id> <item_id> <todo|in_progress|done>`, `delete-item`.",
    "cli.addItemFlags":
      "**Параметры add-item:** `--title` (обязательно), `--desc`, `--notes <markdown>`, `--priority low|normal|medium|high`, `--tags a,b`, `--due YYYY-MM-DD`, `--repeat daily|weekly|monthly|yearly`, `--status todo|in_progress|done`, `--subtasks \"a;b;c\"`, `--url <link>`.",
    "cli.help":
      "Запустите `listy-cli help`, чтобы увидеть все команды. Каждая команда выводит результат в JSON.",

    "mcp.title": "MCP-сервер (listy-mcp)",
    "mcp.subtitle": "Подключение ИИ-агентов через stdio JSON-RPC 2.0",
    "mcp.badge_one": "{count} инструмент",
    "mcp.badge_few": "{count} инструмента",
    "mcp.badge_many": "{count} инструментов",
    "mcp.badge_other": "{count} инструмента",
    "mcp.intro":
      "Добавьте `listy-mcp.exe` в любой MCP-клиент (Claude Desktop, Cursor, Antigravity), чтобы ИИ-агенты могли читать и изменять ваши списки прямо на диске:",
    "mcp.configTitle": "Настройка mcpServers",
    "mcp.tool.get_storage_path": "Узнать текущую папку хранения",
    "mcp.tool.list_lists": "Все активные списки (summary=true: только названия и количество)",
    "mcp.tool.list_trash": "Списки в корзине",
    "mcp.tool.get_list": "Получить один список со всеми элементами",
    "mcp.tool.search": "Поиск элементов во всех списках по названию, описанию, заметкам, тегам и подзадачам",
    "mcp.tool.create_list": "Создать список: simple, checklist, priority или status",
    "mcp.tool.delete_list": "Переместить список в корзину",
    "mcp.tool.restore_list": "Восстановить список из корзины",
    "mcp.tool.add_item": "Добавить элемент с заметками, статусом, повтором, подзадачами и ссылкой",
    "mcp.tool.update_item": "Изменить поля элемента",
    "mcp.tool.set_status": "Задать статус элемента: todo, in_progress или done",
    "mcp.tool.toggle_item": "Отметить элемент выполненным или снять отметку",
    "mcp.tool.delete_item": "Переместить элемент в архив списка",
    "mcp.createList":
      "`create_list` принимает все четыре типа: `simple`, `checklist`, `priority` и `status`. В `add_item` поле `recurrence` — это `daily`, `weekly`, `monthly` или `yearly`, а `subtasks` — список названий подзадач.",
    "mcp.updateItem":
      "`update_item` меняет только переданные поля; пустая строка очищает необязательное поле. `set_status` со значением `done` также отмечает элемент выполненным.",
  },
};

export default ns;
