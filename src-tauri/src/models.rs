use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AttachmentMeta {
    pub id: String,
    pub name: String,
    pub file_name: String,
    pub size: u64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Subtask {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub completed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListItem {
    pub id: String,
    pub title: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(default)]
    pub completed: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub priority: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub due_date: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image: Option<String>,
    #[serde(default)]
    pub attachments: Vec<AttachmentMeta>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub subtasks: Vec<Subtask>,
    /// "daily" | "weekly" | "monthly" | "yearly". Completing a recurring item moves its
    /// due date forward instead of leaving it completed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub recurrence: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListData {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default = "default_icon")]
    pub icon: String,
    #[serde(default = "default_color")]
    pub color: String,
    #[serde(rename = "type", default = "default_list_type")]
    pub list_type: String,
    pub created_at: String,
    pub updated_at: String,
    #[serde(default)]
    pub items: Vec<ListItem>,
    #[serde(default)]
    pub archived_items: Vec<ListItem>,
}

fn default_icon() -> String {
    "list".to_string()
}

fn default_color() -> String {
    "#3B82F6".to_string()
}

fn default_list_type() -> String {
    "checklist".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateListPayload {
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default = "default_icon")]
    pub icon: String,
    #[serde(default = "default_color")]
    pub color: String,
    #[serde(rename = "type", default = "default_list_type")]
    pub list_type: String,
    #[serde(default)]
    pub items: Vec<ListItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default = "default_view")]
    pub default_view: String,
    #[serde(default = "default_sort_by")]
    pub sort_by: String,
    #[serde(default = "default_sort_order")]
    pub sort_order: String,
    /// Closing the main window hides it to the tray instead of quitting.
    #[serde(default = "default_true")]
    pub close_to_tray: bool,
    /// System-wide Quick Add shortcut (Ctrl+Alt+Space).
    #[serde(default = "default_true")]
    pub global_quick_add: bool,
    /// Daily notification about items due today or overdue.
    #[serde(default = "default_true")]
    pub due_reminders: bool,
    /// "auto" | "en" | "uz" | "ru"
    #[serde(default = "default_language")]
    pub language: String,
}

fn default_theme() -> String {
    "system".to_string()
}

fn default_view() -> String {
    "grid".to_string()
}

fn default_sort_by() -> String {
    "updatedAt".to_string()
}

fn default_sort_order() -> String {
    "desc".to_string()
}

fn default_true() -> bool {
    true
}

fn default_language() -> String {
    "auto".to_string()
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: default_theme(),
            default_view: default_view(),
            sort_by: default_sort_by(),
            sort_order: default_sort_order(),
            close_to_tray: true,
            global_quick_add: true,
            due_reminders: true,
            language: default_language(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppStateJson {
    #[serde(default = "default_version")]
    pub version: u32,
    #[serde(default)]
    pub settings: AppSettings,
    #[serde(default)]
    pub favorites: Vec<String>,
    #[serde(default)]
    pub recently_opened: Vec<String>,
}

fn default_version() -> u32 {
    1
}

impl Default for AppStateJson {
    fn default() -> Self {
        Self {
            version: 1,
            settings: AppSettings::default(),
            favorites: Vec::new(),
            recently_opened: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoragePointer {
    pub storage_path: String,
}
