//! Tauri commands for storage. They only resolve the storage folder and call `core`,
//! which holds all the logic shared with `listy-cli` and `listy-mcp`.

use crate::core::{self, RestoreReport};
use crate::models::{AppStateJson, AttachmentMeta, CreateListPayload, ListData, StoragePointer};
use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::sync::mpsc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_opener::OpenerExt;

type Result<T> = core::Result<T>;

/// Event sent to every window when files in the storage folder change, whoever changed
/// them (this app, `listy-cli`, `listy-mcp`, a sync client).
pub const STORAGE_CHANGED_EVENT: &str = "listy://storage-changed";

fn pointer_file_path(app: &AppHandle) -> Result<PathBuf> {
    let dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create app data dir: {e}"))?;
    Ok(dir.join("storage_pointer.json"))
}

fn default_storage_root(app: &AppHandle) -> Result<PathBuf> {
    if let Ok(docs) = app.path().document_dir() {
        return Ok(docs.join("Listy"));
    }
    let data = app
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("Failed to resolve default storage dir: {e}"))?;
    Ok(data.join("Listy"))
}

fn save_storage_pointer(app: &AppHandle, root: &Path) -> Result<()> {
    let ptr = StoragePointer {
        storage_path: root.to_string_lossy().to_string(),
    };
    let json = serde_json::to_string_pretty(&ptr)
        .map_err(|e| format!("Failed to serialize storage pointer: {e}"))?;
    core::atomic_write(&pointer_file_path(app)?, json.as_bytes())
}

pub fn resolve_storage_root(app: &AppHandle) -> Result<PathBuf> {
    let pointer_path = pointer_file_path(app)?;
    if let Ok(raw) = fs::read_to_string(&pointer_path)
        && let Ok(ptr) = serde_json::from_str::<StoragePointer>(&raw)
            && !ptr.storage_path.trim().is_empty() {
                return Ok(PathBuf::from(ptr.storage_path));
            }
    let default_root = default_storage_root(app)?;
    save_storage_pointer(app, &default_root)?;
    Ok(default_root)
}

/// The storage root, with its folders created.
fn root(app: &AppHandle) -> Result<PathBuf> {
    let root = resolve_storage_root(app)?;
    core::ensure_storage_structure(&root)?;
    Ok(root)
}

// ---------------------------------------------------------------------------------------
// Watching the storage folder
// ---------------------------------------------------------------------------------------

/// The live watcher of the current storage folder. Dropping it stops watching.
#[derive(Default)]
pub struct StorageWatcher(Mutex<Option<RecommendedWatcher>>);

/// Our own temp files (`.name.tmp.uuid`) are written and renamed on every save; only the
/// final file matters.
fn is_relevant(path: &Path) -> bool {
    !path
        .file_name()
        .and_then(|n| n.to_str())
        .is_some_and(|n| n.starts_with('.'))
}

/// (Re)starts watching the storage folder. Bursts of file events are coalesced into one
/// `listy://storage-changed` event about 300 ms after the last change.
pub fn start_watching(app: &AppHandle) -> Result<()> {
    let root = root(app)?;
    let (tx, rx) = mpsc::channel::<()>();
    let mut watcher = notify::recommended_watcher(move |res: notify::Result<notify::Event>| {
        if let Ok(event) = res {
            if event.kind.is_access() {
                return;
            }
            if event.paths.iter().any(|p| is_relevant(p)) {
                let _ = tx.send(());
            }
        }
    })
    .map_err(|e| format!("Failed to watch storage folder: {e}"))?;
    watcher
        .watch(&root, RecursiveMode::Recursive)
        .map_err(|e| format!("Failed to watch storage folder: {e}"))?;

    let handle = app.clone();
    std::thread::spawn(move || {
        // Ends when the watcher (and with it `tx`) is dropped.
        while rx.recv().is_ok() {
            while rx.recv_timeout(Duration::from_millis(300)).is_ok() {}
            let _ = handle.emit(STORAGE_CHANGED_EVENT, ());
        }
    });

    let state = app.state::<StorageWatcher>();
    *state.0.lock().map_err(|_| "Watcher lock poisoned".to_string())? = Some(watcher);
    Ok(())
}

// ---------------------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------------------

fn path_string(p: &Path) -> String {
    p.to_string_lossy().to_string()
}

#[tauri::command]
pub fn get_storage_path(app: AppHandle) -> Result<String> {
    Ok(path_string(&resolve_storage_root(&app)?))
}

#[tauri::command]
pub fn set_storage_path(app: AppHandle, path: String) -> Result<String> {
    let target = PathBuf::from(path.trim());
    if target.as_os_str().is_empty() {
        return Err("Storage path cannot be empty".to_string());
    }
    core::ensure_storage_structure(&target)?;
    save_storage_pointer(&app, &target)?;
    // Watching is a convenience: a folder that can't be watched still works.
    let _ = start_watching(&app);
    Ok(path_string(&target))
}

#[tauri::command]
pub fn initialize_storage(app: AppHandle) -> Result<String> {
    Ok(path_string(&root(&app)?))
}

#[tauri::command]
pub fn get_app_state(app: AppHandle) -> Result<AppStateJson> {
    core::read_app_state(&root(&app)?)
}

#[tauri::command]
pub fn update_app_state(app: AppHandle, state: AppStateJson) -> Result<AppStateJson> {
    core::write_app_state(&root(&app)?, &state)?;
    Ok(state)
}

#[tauri::command]
pub fn get_all_lists(app: AppHandle) -> Result<Vec<ListData>> {
    core::all_lists(&root(&app)?)
}

#[tauri::command]
pub fn get_trashed_lists(app: AppHandle) -> Result<Vec<ListData>> {
    core::trashed_lists(&root(&app)?)
}

#[tauri::command]
pub fn get_list(app: AppHandle, id: String) -> Result<ListData> {
    core::get_list_in(&root(&app)?, &id)
}

#[tauri::command]
pub fn create_list(app: AppHandle, data: CreateListPayload) -> Result<ListData> {
    core::create_list_in(&root(&app)?, data)
}

#[tauri::command]
pub fn update_list(
    app: AppHandle,
    id: String,
    data: ListData,
    expected_updated_at: Option<String>,
) -> Result<ListData> {
    core::update_list_in(&root(&app)?, &id, data, expected_updated_at.as_deref())
}

#[tauri::command]
pub fn delete_list(app: AppHandle, id: String) -> Result<()> {
    core::delete_list_in(&root(&app)?, &id)
}

#[tauri::command]
pub fn restore_list(app: AppHandle, id: String) -> Result<ListData> {
    core::restore_list_in(&root(&app)?, &id)
}

#[tauri::command]
pub fn permanently_delete_list(app: AppHandle, id: String) -> Result<()> {
    core::permanently_delete_in(&root(&app)?, &id)
}

#[tauri::command]
pub fn export_list(app: AppHandle, id: String, path: String) -> Result<()> {
    core::export_list_in(&root(&app)?, &id, Path::new(&path))
}

#[tauri::command]
pub fn import_list(app: AppHandle, path: String) -> Result<ListData> {
    core::import_list_in(&root(&app)?, Path::new(&path))
}

#[tauri::command]
pub fn export_backup(app: AppHandle, path: String) -> Result<()> {
    core::export_backup_in(&root(&app)?, Path::new(&path))
}

#[tauri::command]
pub fn import_backup(app: AppHandle, path: String) -> Result<RestoreReport> {
    core::import_backup_in(&root(&app)?, Path::new(&path))
}

#[tauri::command]
pub fn attach_file_to_list(
    app: AppHandle,
    list_id: String,
    source_path: String,
) -> Result<AttachmentMeta> {
    core::attach_file_in(&root(&app)?, &list_id, Path::new(&source_path))
}

#[tauri::command]
pub fn get_attachment_path(app: AppHandle, list_id: String, file_name: String) -> Result<String> {
    let path = core::attachment_path_in(&root(&app)?, &list_id, &file_name)?;
    Ok(path_string(&path))
}

/// Opens an attachment with the system default app. Done on the Rust side so the
/// webview never needs the broad `opener:allow-open-path` permission.
#[tauri::command]
pub fn open_attachment(app: AppHandle, list_id: String, file_name: String) -> Result<()> {
    let path = core::attachment_path_in(&root(&app)?, &list_id, &file_name)?;
    app.opener()
        .open_path(path_string(&path), None::<&str>)
        .map_err(|e| format!("Failed to open attachment: {e}"))
}

/// Opens the current storage folder in the system file explorer.
#[tauri::command]
pub fn open_storage_folder(app: AppHandle) -> Result<()> {
    let root = root(&app)?;
    app.opener()
        .open_path(path_string(&root), None::<&str>)
        .map_err(|e| format!("Failed to open storage folder: {e}"))
}

#[tauri::command]
pub fn remove_attachment_file(app: AppHandle, list_id: String, file_name: String) -> Result<()> {
    core::remove_attachment_in(&root(&app)?, &list_id, &file_name)
}
