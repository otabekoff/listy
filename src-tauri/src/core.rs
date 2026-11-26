//! All Listy storage logic, shared by the desktop app (Tauri commands in `storage.rs`),
//! `listy-cli` and `listy-mcp`. Every function takes the storage root explicitly, so the
//! same code runs headless and is easy to test against a temporary folder.
//!
//! Layout of a storage root:
//! ```text
//! app.json                    settings, favorites, recently opened
//! lists/<id>.json             one file per active list
//! trash/<id>.json             lists moved to the trash
//! attachments/<id>/<file>     files attached to a list's items
//! ```

use crate::models::{
    AppStateJson, AttachmentMeta, CreateListPayload, ListData, ListItem, StoragePointer, Subtask,
};
use chrono::{Days, Local, Months, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use uuid::Uuid;

pub type Result<T> = std::result::Result<T, String>;

/// Prefix of the error returned when a list changed on disk since the caller read it.
pub const CONFLICT_PREFIX: &str = "CONFLICT";

const LISTS: &str = "lists";
const TRASH: &str = "trash";
const ATTACHMENTS: &str = "attachments";

/// Name of the bundle file inside a full-backup `.zip`.
const BACKUP_JSON: &str = "backup.json";
/// Name of the list file inside a single-list `.zip` export.
const LIST_JSON: &str = "list.json";

// ---------------------------------------------------------------------------------------
// Basics
// ---------------------------------------------------------------------------------------

pub fn now_iso() -> String {
    Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}

fn short_uuid() -> String {
    Uuid::new_v4().to_string()[..8].to_string()
}

/// Writes bytes to a temporary file in the same directory and atomically renames it over
/// `target`, so a crash or a sync client never sees a half-written file.
pub fn atomic_write(target: &Path, bytes: &[u8]) -> Result<()> {
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create parent directory: {e}"))?;
    }
    let tmp_name = format!(
        ".{}.tmp.{}",
        target
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("file"),
        Uuid::new_v4()
    );
    let tmp_path = target.with_file_name(tmp_name);
    {
        let mut file =
            File::create(&tmp_path).map_err(|e| format!("Failed to create temp file: {e}"))?;
        file.write_all(bytes)
            .map_err(|e| format!("Failed to write temp file: {e}"))?;
        file.sync_all()
            .map_err(|e| format!("Failed to flush temp file: {e}"))?;
    }
    fs::rename(&tmp_path, target).map_err(|e| {
        let _ = fs::remove_file(&tmp_path);
        format!("Failed to write {}: {e}", target.display())
    })
}

fn write_json<T: Serialize>(target: &Path, value: &T) -> Result<()> {
    let json =
        serde_json::to_string_pretty(value).map_err(|e| format!("Failed to serialize: {e}"))?;
    atomic_write(target, json.as_bytes())
}

pub fn ensure_storage_structure(root: &Path) -> Result<()> {
    for dir in [LISTS, TRASH, ATTACHMENTS] {
        fs::create_dir_all(root.join(dir))
            .map_err(|e| format!("Failed to create {dir} directory: {e}"))?;
    }
    let app_json_path = root.join("app.json");
    if !app_json_path.exists() {
        write_json(&app_json_path, &AppStateJson::default())?;
    }
    Ok(())
}

pub fn validate_id(id: &str) -> Result<()> {
    if id.is_empty()
        || !id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    {
        return Err("Invalid list ID format".to_string());
    }
    Ok(())
}

/// An attachment file name must be a single plain path component.
pub fn validate_file_name(name: &str) -> Result<()> {
    if name.is_empty()
        || name == "."
        || name.contains("..")
        || name.contains('/')
        || name.contains('\\')
        || name.contains(':')
    {
        return Err("Invalid attachment file name".to_string());
    }
    Ok(())
}

pub fn slugify(name: &str) -> String {
    let mut slug = String::new();
    let mut prev_dash = false;
    for ch in name.chars() {
        if ch.is_ascii_alphanumeric() {
            slug.push(ch.to_ascii_lowercase());
            prev_dash = false;
        } else if !prev_dash && !slug.is_empty() {
            slug.push('-');
            prev_dash = true;
        }
    }
    while slug.ends_with('-') {
        slug.pop();
    }
    if slug.is_empty() {
        format!("list-{}", short_uuid())
    } else {
        slug.chars().take(48).collect()
    }
}

fn list_path(root: &Path, folder: &str, id: &str) -> PathBuf {
    root.join(folder).join(format!("{id}.json"))
}

fn id_in_use(root: &Path, id: &str) -> bool {
    list_path(root, LISTS, id).exists() || list_path(root, TRASH, id).exists()
}

/// A list id derived from `name` that is used by no active or trashed list.
pub fn unique_list_id(root: &Path, name: &str) -> String {
    let base = slugify(name);
    if !id_in_use(root, &base) {
        return base;
    }
    for i in 2..10000 {
        let candidate = format!("{base}-{i}");
        if !id_in_use(root, &candidate) {
            return candidate;
        }
    }
    format!("{base}-{}", short_uuid())
}

fn read_list_file(path: &Path) -> Result<ListData> {
    let raw = fs::read_to_string(path).map_err(|e| format!("Failed to read list: {e}"))?;
    serde_json::from_str::<ListData>(&raw).map_err(|e| format!("Failed to parse list: {e}"))
}

// ---------------------------------------------------------------------------------------
// Storage root for the headless binaries
// ---------------------------------------------------------------------------------------

/// Resolves the active Listy storage folder for the CLI / MCP binaries: `--storage`, then
/// `LISTY_STORAGE`, then the folder the desktop app points to, then `~/Documents/Listy`.
pub fn resolve_headless_storage_root(override_path: Option<&str>) -> Result<PathBuf> {
    let explicit = override_path
        .map(str::to_string)
        .or_else(|| env::var("LISTY_STORAGE").ok())
        .map(|p| p.trim().to_string())
        .filter(|p| !p.is_empty());
    if let Some(p) = explicit {
        let pb = PathBuf::from(p);
        ensure_storage_structure(&pb)?;
        return Ok(pb);
    }

    // The desktop app keeps a pointer in its app_local_data_dir.
    const APP_ID: &str = "com.listy.app";
    let pointer_candidates = [
        env::var("LOCALAPPDATA")
            .ok()
            .map(|d| PathBuf::from(d).join(APP_ID)),
        env::var("XDG_DATA_HOME")
            .ok()
            .map(|d| PathBuf::from(d).join(APP_ID)),
        env::var("HOME")
            .ok()
            .map(|h| PathBuf::from(h).join(".local").join("share").join(APP_ID)),
        env::var("HOME").ok().map(|h| {
            PathBuf::from(h)
                .join("Library")
                .join("Application Support")
                .join(APP_ID)
        }),
    ];
    for dir in pointer_candidates.into_iter().flatten() {
        let cand = dir.join("storage_pointer.json");
        let Ok(raw) = fs::read_to_string(&cand) else {
            continue;
        };
        if let Ok(ptr) = serde_json::from_str::<StoragePointer>(&raw)
            && !ptr.storage_path.trim().is_empty() {
                let pb = PathBuf::from(ptr.storage_path);
                ensure_storage_structure(&pb)?;
                return Ok(pb);
            }
    }

    let docs = env::var("USERPROFILE")
        .or_else(|_| env::var("HOME"))
        .map(|h| PathBuf::from(h).join("Documents").join("Listy"))
        .map_err(|_| "Could not resolve default Listy storage path".to_string())?;
    ensure_storage_structure(&docs)?;
    Ok(docs)
}

// ---------------------------------------------------------------------------------------
// App state
// ---------------------------------------------------------------------------------------

pub fn read_app_state(root: &Path) -> Result<AppStateJson> {
    ensure_storage_structure(root)?;
    let raw = fs::read_to_string(root.join("app.json"))
        .map_err(|e| format!("Failed to read app.json: {e}"))?;
    serde_json::from_str::<AppStateJson>(&raw).map_err(|e| format!("Failed to parse app.json: {e}"))
}

pub fn write_app_state(root: &Path, state: &AppStateJson) -> Result<()> {
    ensure_storage_structure(root)?;
    write_json(&root.join("app.json"), state)
}

// ---------------------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------------------

/// Reads every list in `dir`, newest first. Files that are not valid lists are skipped.
pub fn read_lists_from_dir(dir: &Path) -> Result<Vec<ListData>> {
    if !dir.exists() {
        return Ok(Vec::new());
    }
    let mut lists = Vec::new();
    let entries = fs::read_dir(dir).map_err(|e| format!("Failed to read directory: {e}"))?;
    for entry in entries.flatten() {
        let path = entry.path();
        let is_json = path.extension().and_then(|e| e.to_str()) == Some("json");
        let hidden = path
            .file_name()
            .and_then(|n| n.to_str())
            .is_some_and(|n| n.starts_with('.'));
        if is_json && !hidden
            && let Ok(list) = read_list_file(&path) {
                lists.push(list);
            }
    }
    lists.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    Ok(lists)
}

pub fn all_lists(root: &Path) -> Result<Vec<ListData>> {
    ensure_storage_structure(root)?;
    read_lists_from_dir(&root.join(LISTS))
}

pub fn trashed_lists(root: &Path) -> Result<Vec<ListData>> {
    ensure_storage_structure(root)?;
    read_lists_from_dir(&root.join(TRASH))
}

pub fn get_list_in(root: &Path, id: &str) -> Result<ListData> {
    validate_id(id)?;
    let path = list_path(root, LISTS, id);
    if !path.exists() {
        return Err(format!("List '{id}' not found"));
    }
    read_list_file(&path)
}

pub fn create_list_in(root: &Path, data: CreateListPayload) -> Result<ListData> {
    ensure_storage_structure(root)?;
    let now = now_iso();
    let id = unique_list_id(root, &data.name);
    let list = ListData {
        id: id.clone(),
        name: data.name.trim().to_string(),
        description: data.description,
        icon: data.icon,
        color: data.color,
        list_type: data.list_type,
        created_at: now.clone(),
        updated_at: now,
        items: data.items,
        archived_items: Vec::new(),
    };
    write_json(&list_path(root, LISTS, &id), &list)?;
    Ok(list)
}

/// Saves `data` as list `id`. With `expected_updated_at`, refuses (with a `CONFLICT` error)
/// when the file on disk was changed since the caller read it.
pub fn update_list_in(
    root: &Path,
    id: &str,
    mut data: ListData,
    expected_updated_at: Option<&str>,
) -> Result<ListData> {
    validate_id(id)?;
    let path = list_path(root, LISTS, id);
    if !path.exists() {
        return Err(format!("List '{id}' not found"));
    }
    if let Some(expected) = expected_updated_at
        && let Ok(current) = read_list_file(&path)
            && current.updated_at != expected {
                return Err(format!(
                    "{CONFLICT_PREFIX}: List was modified externally. Please reload before saving."
                ));
            }
    data.id = id.to_string();
    data.updated_at = now_iso();
    write_json(&path, &data)?;
    Ok(data)
}

/// Read-modify-write of one list with conflict protection: fails instead of overwriting a
/// change another process made between the read and the write.
fn modify_list<F>(root: &Path, id: &str, change: F) -> Result<ListData>
where
    F: FnOnce(&mut ListData) -> Result<()>,
{
    let mut list = get_list_in(root, id)?;
    let read_at = list.updated_at.clone();
    change(&mut list)?;
    update_list_in(root, id, list, Some(&read_at))
}

pub fn delete_list_in(root: &Path, id: &str) -> Result<()> {
    validate_id(id)?;
    ensure_storage_structure(root)?;
    let src = list_path(root, LISTS, id);
    if !src.exists() {
        return Err(format!("List '{id}' not found"));
    }
    let dst = list_path(root, TRASH, id);
    if dst.exists() {
        return Err(format!("A list with ID '{id}' is already in the trash"));
    }
    fs::rename(&src, &dst).map_err(|e| format!("Failed to move list to trash: {e}"))
}

pub fn restore_list_in(root: &Path, id: &str) -> Result<ListData> {
    validate_id(id)?;
    ensure_storage_structure(root)?;
    let src = list_path(root, TRASH, id);
    if !src.exists() {
        return Err(format!("Trashed list '{id}' not found"));
    }
    let dst = list_path(root, LISTS, id);
    if dst.exists() {
        return Err(format!("An active list with ID '{id}' already exists"));
    }
    fs::rename(&src, &dst).map_err(|e| format!("Failed to restore list: {e}"))?;
    read_list_file(&dst)
}

/// Deletes a trashed list and its attachment files for good.
pub fn permanently_delete_in(root: &Path, id: &str) -> Result<()> {
    validate_id(id)?;
    let target = list_path(root, TRASH, id);
    if target.exists() {
        fs::remove_file(&target).map_err(|e| format!("Failed to permanently delete list: {e}"))?;
    }
    let attach_dir = root.join(ATTACHMENTS).join(id);
    if attach_dir.exists() {
        let _ = fs::remove_dir_all(&attach_dir);
    }
    Ok(())
}

// ---------------------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------------------

fn safe_file_name(original: &str) -> String {
    original
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '.' || c == '-' || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect::<String>()
        .replace("..", "_")
}

/// Copies `source` into the list's attachment folder.
pub fn attach_file_in(root: &Path, list_id: &str, source: &Path) -> Result<AttachmentMeta> {
    validate_id(list_id)?;
    ensure_storage_structure(root)?;
    if !source.is_file() {
        return Err("Source file does not exist".to_string());
    }
    let original_name = source
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("attachment")
        .to_string();
    let id = format!("att-{}", short_uuid());
    let file_name = format!("{id}-{}", safe_file_name(&original_name));
    let attach_dir = root.join(ATTACHMENTS).join(list_id);
    fs::create_dir_all(&attach_dir)
        .map_err(|e| format!("Failed to create attachments folder: {e}"))?;
    let size = fs::copy(source, attach_dir.join(&file_name))
        .map_err(|e| format!("Failed to copy attachment: {e}"))?;
    Ok(AttachmentMeta {
        id,
        name: original_name,
        file_name,
        size,
    })
}

/// The path of an existing attachment file.
pub fn attachment_path_in(root: &Path, list_id: &str, file_name: &str) -> Result<PathBuf> {
    validate_id(list_id)?;
    validate_file_name(file_name)?;
    let path = root.join(ATTACHMENTS).join(list_id).join(file_name);
    if !path.exists() {
        return Err("Attachment file not found".to_string());
    }
    Ok(path)
}

pub fn remove_attachment_in(root: &Path, list_id: &str, file_name: &str) -> Result<()> {
    validate_id(list_id)?;
    validate_file_name(file_name)?;
    let path = root.join(ATTACHMENTS).join(list_id).join(file_name);
    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("Failed to delete attachment: {e}"))?;
    }
    Ok(())
}

fn referenced_files(list: &ListData) -> Vec<String> {
    list.items
        .iter()
        .chain(list.archived_items.iter())
        .flat_map(|it| it.attachments.iter().map(|a| a.file_name.clone()))
        .collect()
}

/// Drops attachment entries whose file is not in the list's attachment folder, so the app
/// never shows a file it cannot open. Returns how many were dropped.
fn prune_missing_attachments(root: &Path, list: &mut ListData) -> usize {
    let dir = root.join(ATTACHMENTS).join(&list.id);
    let mut dropped = 0;
    for item in list.items.iter_mut().chain(list.archived_items.iter_mut()) {
        let before = item.attachments.len();
        item.attachments.retain(|a| {
            validate_file_name(&a.file_name).is_ok() && dir.join(&a.file_name).is_file()
        });
        dropped += before - item.attachments.len();
    }
    dropped
}

/// Copies the attachment files `list` references from `attachments/<from_id>` to
/// `attachments/<list.id>` inside the same storage root.
fn copy_local_attachments(root: &Path, from_id: &str, list: &ListData) -> usize {
    if validate_id(from_id).is_err() || from_id == list.id {
        return 0;
    }
    let src_dir = root.join(ATTACHMENTS).join(from_id);
    let dst_dir = root.join(ATTACHMENTS).join(&list.id);
    let mut copied = 0;
    for name in referenced_files(list) {
        if validate_file_name(&name).is_err() {
            continue;
        }
        let src = src_dir.join(&name);
        if src.is_file() && fs::create_dir_all(&dst_dir).is_ok()
            && fs::copy(&src, dst_dir.join(&name)).is_ok() {
                copied += 1;
            }
    }
    copied
}

// ---------------------------------------------------------------------------------------
// Zip helpers
// ---------------------------------------------------------------------------------------

fn is_zip_path(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .is_some_and(|e| e.eq_ignore_ascii_case("zip"))
}

/// True when the file starts with the zip signature, whatever its extension.
fn looks_like_zip(path: &Path) -> bool {
    let mut magic = [0u8; 4];
    File::open(path)
        .and_then(|mut f| f.read_exact(&mut magic))
        .is_ok()
        && magic == *b"PK\x03\x04"
}

type ZipOut = zip::ZipWriter<File>;

fn zip_options() -> zip::write::SimpleFileOptions {
    zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .large_file(true)
}

fn zip_add_bytes(zip: &mut ZipOut, name: &str, bytes: &[u8]) -> Result<()> {
    zip.start_file(name, zip_options())
        .map_err(|e| format!("Failed to write zip entry {name}: {e}"))?;
    zip.write_all(bytes)
        .map_err(|e| format!("Failed to write zip entry {name}: {e}"))
}

fn zip_add_file(zip: &mut ZipOut, name: &str, path: &Path) -> Result<()> {
    let mut src = File::open(path).map_err(|e| format!("Failed to read {}: {e}", path.display()))?;
    zip.start_file(name, zip_options())
        .map_err(|e| format!("Failed to write zip entry {name}: {e}"))?;
    std::io::copy(&mut src, zip).map_err(|e| format!("Failed to write zip entry {name}: {e}"))?;
    Ok(())
}

/// Writes a zip through a temp file next to `dest`, then renames it into place.
fn write_zip<F>(dest: &Path, fill: F) -> Result<()>
where
    F: FnOnce(&mut ZipOut) -> Result<()>,
{
    let tmp = dest.with_file_name(format!(".listy-export.{}.tmp", Uuid::new_v4()));
    let result = (|| {
        let file = File::create(&tmp).map_err(|e| format!("Failed to create export file: {e}"))?;
        let mut zip = zip::ZipWriter::new(file);
        fill(&mut zip)?;
        let file = zip
            .finish()
            .map_err(|e| format!("Failed to finish zip: {e}"))?;
        file.sync_all()
            .map_err(|e| format!("Failed to flush export file: {e}"))?;
        drop(file);
        fs::rename(&tmp, dest).map_err(|e| format!("Failed to write {}: {e}", dest.display()))
    })();
    if result.is_err() {
        let _ = fs::remove_file(&tmp);
    }
    result
}

type ZipIn = zip::ZipArchive<File>;

fn open_zip(path: &Path) -> Result<ZipIn> {
    let file = File::open(path).map_err(|e| format!("Failed to open {}: {e}", path.display()))?;
    zip::ZipArchive::new(file).map_err(|e| format!("Not a valid zip file: {e}"))
}

fn zip_read_string(zip: &mut ZipIn, name: &str) -> Result<String> {
    let mut entry = zip
        .by_name(name)
        .map_err(|_| format!("The file does not contain {name}"))?;
    let mut raw = String::new();
    entry
        .read_to_string(&mut raw)
        .map_err(|e| format!("Failed to read {name}: {e}"))?;
    Ok(raw)
}

/// The `/`-separated components of a zip entry name, only when every one is a plain
/// path component (no `..`, no absolute paths, no drive letters).
fn zip_entry_parts(name: &str) -> Option<Vec<String>> {
    let parts: Vec<String> = name.split('/').map(str::to_string).collect();
    if parts.iter().all(|p| validate_file_name(p).is_ok()) {
        Some(parts)
    } else {
        None
    }
}

/// The name of a file entry (directories and unreadable names give None).
fn zip_file_name(zip: &mut ZipIn, index: usize) -> Option<String> {
    let entry = zip.by_index(index).ok()?;
    if !entry.is_file() {
        return None;
    }
    entry.name().ok().map(|n| n.to_string())
}

fn extract_entry(zip: &mut ZipIn, index: usize, dest: &Path) -> Result<()> {
    let mut entry = zip
        .by_index(index)
        .map_err(|e| format!("Failed to read zip entry: {e}"))?;
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create folder: {e}"))?;
    }
    let mut out = File::create(dest).map_err(|e| format!("Failed to write attachment: {e}"))?;
    std::io::copy(&mut entry, &mut out).map_err(|e| format!("Failed to write attachment: {e}"))?;
    Ok(())
}

// ---------------------------------------------------------------------------------------
// Single-list export / import
// ---------------------------------------------------------------------------------------

/// Exports one list. A `.zip` destination also carries its attachment files; any other
/// destination gets the plain list JSON.
pub fn export_list_in(root: &Path, id: &str, dest: &Path) -> Result<()> {
    let list = get_list_in(root, id)?;
    let json = serde_json::to_string_pretty(&list)
        .map_err(|e| format!("Failed to serialize list: {e}"))?;
    if !is_zip_path(dest) {
        return atomic_write(dest, json.as_bytes());
    }
    let attach_dir = root.join(ATTACHMENTS).join(id);
    write_zip(dest, |zip| {
        zip_add_bytes(zip, LIST_JSON, json.as_bytes())?;
        for name in referenced_files(&list) {
            let path = attach_dir.join(&name);
            if validate_file_name(&name).is_ok() && path.is_file() {
                zip_add_file(zip, &format!("{ATTACHMENTS}/{name}"), &path)?;
            }
        }
        Ok(())
    })
}

/// Imports a list exported by [`export_list_in`] (JSON or zip) as a new list.
pub fn import_list_in(root: &Path, source: &Path) -> Result<ListData> {
    ensure_storage_structure(root)?;
    let zipped = looks_like_zip(source);
    let mut archive = if zipped { Some(open_zip(source)?) } else { None };
    let raw = match archive.as_mut() {
        Some(zip) => zip_read_string(zip, LIST_JSON)?,
        None => fs::read_to_string(source).map_err(|e| format!("Failed to read import file: {e}"))?,
    };
    let mut list = serde_json::from_str::<ListData>(&raw)
        .map_err(|e| format!("Invalid Listy list format: {e}"))?;

    let original_id = list.id.clone();
    list.id = unique_list_id(root, &list.name);
    list.updated_at = now_iso();
    if list.created_at.trim().is_empty() {
        list.created_at = list.updated_at.clone();
    }

    let attach_dir = root.join(ATTACHMENTS).join(&list.id);
    if let Some(zip) = archive.as_mut() {
        for index in 0..zip.len() {
            let Some(name) = zip_file_name(zip, index) else {
                continue;
            };
            if let Some(parts) = zip_entry_parts(&name)
                && parts.len() == 2 && parts[0] == ATTACHMENTS {
                    extract_entry(zip, index, &attach_dir.join(&parts[1]))?;
                }
        }
    } else {
        // A plain JSON export carries no files; when it came from this same storage the
        // original list's files are still here and can be copied.
        copy_local_attachments(root, &original_id, &list);
    }
    prune_missing_attachments(root, &mut list);

    write_json(&list_path(root, LISTS, &list.id), &list)?;
    Ok(list)
}

// ---------------------------------------------------------------------------------------
// Full backup
// ---------------------------------------------------------------------------------------

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupBundle {
    pub version: u32,
    pub exported_at: String,
    pub app_state: AppStateJson,
    pub lists: Vec<ListData>,
    #[serde(default)]
    pub trashed_lists: Vec<ListData>,
}

#[derive(Debug, Default, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RestoreReport {
    pub lists: usize,
    pub trashed: usize,
    pub attachments: usize,
}

/// Writes a full backup. A `.zip` destination holds `backup.json` (settings, active and
/// trashed lists) plus every attachment file; any other destination gets `backup.json`
/// alone.
pub fn export_backup_in(root: &Path, dest: &Path) -> Result<()> {
    let bundle = BackupBundle {
        version: 2,
        exported_at: now_iso(),
        app_state: read_app_state(root)?,
        lists: all_lists(root)?,
        trashed_lists: trashed_lists(root)?,
    };
    let json = serde_json::to_string_pretty(&bundle)
        .map_err(|e| format!("Failed to serialize backup: {e}"))?;
    if !is_zip_path(dest) {
        return atomic_write(dest, json.as_bytes());
    }
    write_zip(dest, |zip| {
        zip_add_bytes(zip, BACKUP_JSON, json.as_bytes())?;
        for list in bundle.lists.iter().chain(bundle.trashed_lists.iter()) {
            let dir = root.join(ATTACHMENTS).join(&list.id);
            for name in referenced_files(list) {
                let path = dir.join(&name);
                if validate_file_name(&name).is_ok() && path.is_file() {
                    zip_add_file(zip, &format!("{ATTACHMENTS}/{}/{name}", list.id), &path)?;
                }
            }
        }
        Ok(())
    })
}

/// Restores a backup made by [`export_backup_in`] (zip, or the JSON of version 1 or 2)
/// next to the lists already in storage. A list whose ID is taken gets a new ID; its
/// files, favorites and recent entries follow it. Settings are taken from the backup.
pub fn import_backup_in(root: &Path, source: &Path) -> Result<RestoreReport> {
    ensure_storage_structure(root)?;
    let mut archive = if looks_like_zip(source) {
        Some(open_zip(source)?)
    } else {
        None
    };
    let raw = match archive.as_mut() {
        Some(zip) => zip_read_string(zip, BACKUP_JSON)?,
        None => fs::read_to_string(source).map_err(|e| format!("Failed to read backup file: {e}"))?,
    };
    let bundle = serde_json::from_str::<BackupBundle>(&raw)
        .map_err(|e| format!("Invalid backup format: {e}"))?;

    let mut report = RestoreReport::default();
    // Original ID -> new ID, for every list written.
    let mut id_map: HashMap<String, String> = HashMap::new();
    let mut restored: Vec<(ListData, &str)> = Vec::new();

    let sources = bundle
        .lists
        .into_iter()
        .map(|l| (l, LISTS))
        .chain(bundle.trashed_lists.into_iter().map(|l| (l, TRASH)));
    for (mut list, folder) in sources {
        let original_id = list.id.clone();
        if validate_id(&list.id).is_err() || id_in_use(root, &list.id) {
            list.id = unique_list_id(root, &list.name);
        }
        // Claim the ID right away so a later list in the same backup can't take it.
        write_json(&list_path(root, folder, &list.id), &list)?;
        id_map.entry(original_id).or_insert_with(|| list.id.clone());
        if folder == LISTS {
            report.lists += 1;
        } else {
            report.trashed += 1;
        }
        restored.push((list, folder));
    }

    // Attachment files: from the zip, or (JSON backup) from this same storage.
    if let Some(zip) = archive.as_mut() {
        for index in 0..zip.len() {
            let Some(name) = zip_file_name(zip, index) else {
                continue;
            };
            let Some(parts) = zip_entry_parts(&name) else {
                continue;
            };
            if parts.len() != 3 || parts[0] != ATTACHMENTS {
                continue;
            }
            if let Some(new_id) = id_map.get(&parts[1]) {
                let dest = root.join(ATTACHMENTS).join(new_id).join(&parts[2]);
                extract_entry(zip, index, &dest)?;
                report.attachments += 1;
            }
        }
    } else {
        for (original, new_id) in &id_map {
            if let Some((list, _)) = restored.iter().find(|(l, _)| &l.id == new_id) {
                report.attachments += copy_local_attachments(root, original, list);
            }
        }
    }

    for (list, folder) in restored.iter_mut() {
        if prune_missing_attachments(root, list) > 0 {
            write_json(&list_path(root, folder, &list.id), list)?;
        }
    }

    // Settings come from the backup; favorites and recents are merged, following renames.
    let mut state = read_app_state(root)?;
    let active: Vec<&String> = restored
        .iter()
        .filter(|(_, f)| *f == LISTS)
        .map(|(l, _)| &l.id)
        .collect();
    let map_ids = |ids: &[String]| -> Vec<String> {
        ids.iter()
            .filter_map(|id| id_map.get(id))
            .filter(|id| active.contains(id))
            .cloned()
            .collect()
    };
    state.settings = bundle.app_state.settings;
    for id in map_ids(&bundle.app_state.favorites) {
        if !state.favorites.contains(&id) {
            state.favorites.push(id);
        }
    }
    let mut recent = map_ids(&bundle.app_state.recently_opened);
    recent.extend(state.recently_opened.iter().cloned());
    let mut seen = std::collections::HashSet::new();
    recent.retain(|id| seen.insert(id.clone()));
    recent.truncate(20);
    state.recently_opened = recent;
    write_app_state(root, &state)?;

    Ok(report)
}

// ---------------------------------------------------------------------------------------
// Items: completion and recurrence
// ---------------------------------------------------------------------------------------

pub const RECURRENCES: [&str; 4] = ["daily", "weekly", "monthly", "yearly"];
pub const STATUSES: [&str; 3] = ["todo", "in_progress", "done"];
pub const PRIORITIES: [&str; 4] = ["low", "normal", "medium", "high"];
pub const LIST_TYPES: [&str; 4] = ["simple", "checklist", "priority", "status"];

pub fn today_local() -> NaiveDate {
    Local::now().date_naive()
}

fn step(date: NaiveDate, recurrence: &str) -> Option<NaiveDate> {
    match recurrence {
        "daily" => date.checked_add_days(Days::new(1)),
        "weekly" => date.checked_add_days(Days::new(7)),
        // chrono clamps to the last day of a shorter month (Jan 31 -> Feb 28).
        "monthly" => date.checked_add_months(Months::new(1)),
        "yearly" => date.checked_add_months(Months::new(12)),
        _ => None,
    }
}

/// The next due date (`YYYY-MM-DD`) of a recurring item completed on `today`: one step
/// after its current due date, moved on until it is after `today`. Without a valid due
/// date, the step is counted from `today`.
pub fn next_due_date(due: Option<&str>, recurrence: &str, today: NaiveDate) -> Option<String> {
    let start = due
        .and_then(|d| NaiveDate::parse_from_str(d.trim(), "%Y-%m-%d").ok())
        .unwrap_or(today);
    let mut next = step(start, recurrence)?;
    for _ in 0..5000 {
        if next > today {
            break;
        }
        next = step(next, recurrence)?;
    }
    Some(next.format("%Y-%m-%d").to_string())
}

/// Marks an item completed or not. Completing a recurring item instead moves its due date
/// to the next occurrence and resets it (and its subtasks) to not completed.
pub fn set_item_completed(item: &mut ListItem, completed: bool, list_type: &str, today: NaiveDate) {
    item.updated_at = now_iso();
    if completed
        && let Some(rec) = item.recurrence.as_deref()
            && let Some(next) = next_due_date(item.due_date.as_deref(), rec, today) {
                item.due_date = Some(next);
                item.completed = false;
                if list_type == "status" || item.status.is_some() {
                    item.status = Some("todo".to_string());
                }
                for sub in &mut item.subtasks {
                    sub.completed = false;
                }
                return;
            }
    item.completed = completed;
    if list_type == "status" {
        item.status = Some(if completed { "done" } else { "todo" }.to_string());
    }
}

fn check_one_of(field: &str, value: &str, allowed: &[&str]) -> Result<()> {
    if allowed.contains(&value) {
        Ok(())
    } else {
        Err(format!("Invalid {field} '{value}'. Use one of: {}", allowed.join(", ")))
    }
}

fn check_due_date(value: &str) -> Result<()> {
    NaiveDate::parse_from_str(value, "%Y-%m-%d")
        .map(|_| ())
        .map_err(|_| format!("Invalid due date '{value}'. Use YYYY-MM-DD"))
}

fn non_empty(value: Option<String>) -> Option<String> {
    value.map(|v| v.trim().to_string()).filter(|v| !v.is_empty())
}

fn new_subtask(title: &str) -> Subtask {
    Subtask {
        id: format!("sub-{}", short_uuid()),
        title: title.trim().to_string(),
        completed: false,
    }
}

/// Fields of a new item (CLI / MCP).
#[derive(Debug, Default, Clone, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct NewItem {
    pub title: String,
    pub description: Option<String>,
    pub notes: Option<String>,
    pub priority: Option<String>,
    pub tags: Vec<String>,
    pub due_date: Option<String>,
    pub url: Option<String>,
    pub status: Option<String>,
    pub recurrence: Option<String>,
    pub subtasks: Vec<String>,
}

pub fn add_item_in(root: &Path, list_id: &str, new: NewItem) -> Result<ListData> {
    let title = new.title.trim().to_string();
    if title.is_empty() {
        return Err("Item title cannot be empty".to_string());
    }
    let priority = non_empty(new.priority);
    let due_date = non_empty(new.due_date);
    let status = non_empty(new.status);
    let recurrence = non_empty(new.recurrence);
    if let Some(p) = &priority {
        check_one_of("priority", p, &PRIORITIES)?;
    }
    if let Some(d) = &due_date {
        check_due_date(d)?;
    }
    if let Some(s) = &status {
        check_one_of("status", s, &STATUSES)?;
    }
    if let Some(r) = &recurrence {
        check_one_of("recurrence", r, &RECURRENCES)?;
    }
    modify_list(root, list_id, |list| {
        let now = now_iso();
        let status = status.or_else(|| (list.list_type == "status").then(|| "todo".to_string()));
        list.items.push(ListItem {
            id: format!("item-{}", short_uuid()),
            title,
            description: non_empty(new.description),
            completed: status.as_deref() == Some("done"),
            status,
            notes: non_empty(new.notes),
            tags: new
                .tags
                .iter()
                .map(|t| t.trim().to_string())
                .filter(|t| !t.is_empty())
                .collect(),
            priority,
            due_date,
            url: non_empty(new.url),
            image: None,
            attachments: Vec::new(),
            subtasks: new
                .subtasks
                .iter()
                .filter(|s| !s.trim().is_empty())
                .map(|s| new_subtask(s))
                .collect(),
            recurrence,
            created_at: now.clone(),
            updated_at: now,
        });
        Ok(())
    })
}

fn find_item<'a>(list: &'a mut ListData, item_id: &str) -> Result<&'a mut ListItem> {
    let list_id = list.id.clone();
    list.items
        .iter_mut()
        .find(|i| i.id == item_id)
        .ok_or_else(|| format!("Item '{item_id}' not found in list '{list_id}'"))
}

pub fn toggle_item_in(root: &Path, list_id: &str, item_id: &str) -> Result<ListData> {
    let today = today_local();
    modify_list(root, list_id, |list| {
        let list_type = list.list_type.clone();
        let item = find_item(list, item_id)?;
        let completed = !item.completed;
        set_item_completed(item, completed, &list_type, today);
        Ok(())
    })
}

/// Sets the status of an item (`todo`, `in_progress`, `done`); `done` also completes it.
pub fn set_status_in(root: &Path, list_id: &str, item_id: &str, status: &str) -> Result<ListData> {
    check_one_of("status", status, &STATUSES)?;
    let today = today_local();
    modify_list(root, list_id, |list| {
        let item = find_item(list, item_id)?;
        if status == "done" {
            item.status = Some("done".to_string());
            set_item_completed(item, true, "status", today);
        } else {
            item.status = Some(status.to_string());
            item.completed = false;
            item.updated_at = now_iso();
        }
        Ok(())
    })
}

/// Moves an item to the list's archive.
pub fn delete_item_in(root: &Path, list_id: &str, item_id: &str) -> Result<ListData> {
    modify_list(root, list_id, |list| {
        let pos = list
            .items
            .iter()
            .position(|i| i.id == item_id)
            .ok_or_else(|| format!("Item '{item_id}' not found in list '{list_id}'"))?;
        let mut removed = list.items.remove(pos);
        removed.updated_at = now_iso();
        list.archived_items.insert(0, removed);
        Ok(())
    })
}

/// A partial change to an item. Fields left out are unchanged; an empty string clears an
/// optional text field.
#[derive(Debug, Default, Clone, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct ItemPatch {
    pub title: Option<String>,
    pub description: Option<String>,
    pub notes: Option<String>,
    pub priority: Option<String>,
    pub tags: Option<Vec<String>>,
    pub due_date: Option<String>,
    pub url: Option<String>,
    pub recurrence: Option<String>,
    pub completed: Option<bool>,
    pub add_subtasks: Vec<String>,
    /// IDs of subtasks to mark completed or not completed.
    pub toggle_subtasks: Vec<String>,
}

pub fn update_item_in(root: &Path, list_id: &str, item_id: &str, patch: ItemPatch) -> Result<ListData> {
    let clear_or = |v: String| -> Option<String> { non_empty(Some(v)) };
    if let Some(p) = patch.priority.clone().and_then(clear_or) {
        check_one_of("priority", &p, &PRIORITIES)?;
    }
    if let Some(d) = patch.due_date.clone().and_then(clear_or) {
        check_due_date(&d)?;
    }
    if let Some(r) = patch.recurrence.clone().and_then(clear_or) {
        check_one_of("recurrence", &r, &RECURRENCES)?;
    }
    if patch.title.as_deref().is_some_and(|t| t.trim().is_empty()) {
        return Err("Item title cannot be empty".to_string());
    }
    let today = today_local();
    modify_list(root, list_id, |list| {
        let list_type = list.list_type.clone();
        let item = find_item(list, item_id)?;
        if let Some(t) = patch.title {
            item.title = t.trim().to_string();
        }
        if let Some(v) = patch.description {
            item.description = clear_or(v);
        }
        if let Some(v) = patch.notes {
            item.notes = clear_or(v);
        }
        if let Some(v) = patch.priority {
            item.priority = clear_or(v);
        }
        if let Some(tags) = patch.tags {
            item.tags = tags
                .iter()
                .map(|t| t.trim().to_string())
                .filter(|t| !t.is_empty())
                .collect();
        }
        if let Some(v) = patch.due_date {
            item.due_date = clear_or(v);
        }
        if let Some(v) = patch.url {
            item.url = clear_or(v);
        }
        if let Some(v) = patch.recurrence {
            item.recurrence = clear_or(v);
        }
        for title in patch.add_subtasks.iter().filter(|s| !s.trim().is_empty()) {
            item.subtasks.push(new_subtask(title));
        }
        for sub_id in &patch.toggle_subtasks {
            let sub = item
                .subtasks
                .iter_mut()
                .find(|s| &s.id == sub_id)
                .ok_or_else(|| format!("Subtask '{sub_id}' not found"))?;
            sub.completed = !sub.completed;
        }
        item.updated_at = now_iso();
        if let Some(done) = patch.completed {
            set_item_completed(item, done, &list_type, today);
        }
        Ok(())
    })
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchHit {
    pub list_id: String,
    pub list_name: String,
    pub item: ListItem,
}

/// Active items whose title, description, notes, tags or subtasks contain `query`
/// (case-insensitive).
pub fn search_in(root: &Path, query: &str) -> Result<Vec<SearchHit>> {
    let q = query.trim().to_lowercase();
    if q.is_empty() {
        return Ok(Vec::new());
    }
    let has = |s: &str| s.to_lowercase().contains(&q);
    let mut hits = Vec::new();
    for list in all_lists(root)? {
        for item in &list.items {
            let matched = has(&item.title)
                || item.description.as_deref().is_some_and(has)
                || item.notes.as_deref().is_some_and(has)
                || item.tags.iter().any(|t| has(t))
                || item.subtasks.iter().any(|s| has(&s.title));
            if matched {
                hits.push(SearchHit {
                    list_id: list.id.clone(),
                    list_name: list.name.clone(),
                    item: item.clone(),
                });
            }
        }
    }
    Ok(hits)
}

#[cfg(test)]
mod tests;
