use super::*;
use crate::models::CreateListPayload;
use tempfile::TempDir;

fn storage() -> (TempDir, PathBuf) {
    let dir = TempDir::new().unwrap();
    let root = dir.path().join("Listy");
    ensure_storage_structure(&root).unwrap();
    (dir, root)
}

fn payload(name: &str, list_type: &str) -> CreateListPayload {
    CreateListPayload {
        name: name.to_string(),
        description: String::new(),
        icon: "list".to_string(),
        color: "#3B82F6".to_string(),
        list_type: list_type.to_string(),
        items: Vec::new(),
    }
}

fn item(title: &str) -> NewItem {
    NewItem {
        title: title.to_string(),
        ..Default::default()
    }
}

fn date(s: &str) -> NaiveDate {
    NaiveDate::parse_from_str(s, "%Y-%m-%d").unwrap()
}

/// A list with one item that has one attachment file.
fn list_with_attachment(root: &Path, name: &str, file_body: &[u8]) -> ListData {
    let list = create_list_in(root, payload(name, "checklist")).unwrap();
    let list = add_item_in(root, &list.id, item("With file")).unwrap();
    let src = root.parent().unwrap().join(format!("{name}-source.txt"));
    fs::write(&src, file_body).unwrap();
    let meta = attach_file_in(root, &list.id, &src).unwrap();
    let mut list = list;
    list.items[0].attachments.push(meta);
    let read_at = list.updated_at.clone();
    update_list_in(root, &list.id.clone(), list, Some(&read_at)).unwrap()
}

#[test]
fn storage_structure_is_created() {
    let (_dir, root) = storage();
    for sub in ["lists", "trash", "attachments", "app.json"] {
        assert!(root.join(sub).exists(), "{sub} missing");
    }
}

#[test]
fn slugify_and_unique_ids() {
    assert_eq!(slugify("Shopping List"), "shopping-list");
    assert_eq!(slugify("  My   Tasks! "), "my-tasks");
    assert!(slugify("Ўзбек").starts_with("list-"));

    let (_dir, root) = storage();
    let a = create_list_in(&root, payload("Groceries", "checklist")).unwrap();
    let b = create_list_in(&root, payload("Groceries", "checklist")).unwrap();
    assert_eq!(a.id, "groceries");
    assert_eq!(b.id, "groceries-2");

    // An ID held by a trashed list is not reused either.
    delete_list_in(&root, &a.id).unwrap();
    let c = create_list_in(&root, payload("Groceries", "checklist")).unwrap();
    assert_eq!(c.id, "groceries-3");
}

#[test]
fn rejects_unsafe_ids_and_file_names() {
    assert!(validate_id("../etc").is_err());
    assert!(validate_id("").is_err());
    assert!(validate_id("ok-id_1").is_ok());
    for bad in ["..", "a/b", "a\\b", "C:x", ""] {
        assert!(validate_file_name(bad).is_err(), "{bad} accepted");
    }
    assert!(validate_file_name("att-1-photo.png").is_ok());
}

#[test]
fn trash_restore_and_permanent_delete() {
    let (_dir, root) = storage();
    let list = list_with_attachment(&root, "Docs", b"hello");
    delete_list_in(&root, &list.id).unwrap();
    assert!(all_lists(&root).unwrap().is_empty());
    assert_eq!(trashed_lists(&root).unwrap().len(), 1);

    let restored = restore_list_in(&root, &list.id).unwrap();
    assert_eq!(restored.items.len(), 1);

    delete_list_in(&root, &list.id).unwrap();
    permanently_delete_in(&root, &list.id).unwrap();
    assert!(trashed_lists(&root).unwrap().is_empty());
    assert!(!root.join("attachments").join(&list.id).exists());
}

#[test]
fn update_detects_conflicts() {
    let (_dir, root) = storage();
    let list = create_list_in(&root, payload("Tasks", "checklist")).unwrap();
    let stale = list.updated_at.clone();
    // Someone else (the CLI, a synced copy) saves in between.
    std::thread::sleep(std::time::Duration::from_millis(5));
    add_item_in(&root, &list.id, item("From CLI")).unwrap();
    let id = list.id.clone();
    let err = update_list_in(&root, &id, list, Some(&stale)).unwrap_err();
    assert!(err.starts_with(CONFLICT_PREFIX));
}

#[test]
fn item_add_toggle_status_and_archive() {
    let (_dir, root) = storage();
    let list = create_list_in(&root, payload("Board", "status")).unwrap();
    let list = add_item_in(
        &root,
        &list.id,
        NewItem {
            title: "Write tests".into(),
            priority: Some("high".into()),
            tags: vec!["dev".into(), " ".into()],
            subtasks: vec!["core".into(), "".into()],
            ..Default::default()
        },
    )
    .unwrap();
    let it = &list.items[0];
    assert_eq!(it.status.as_deref(), Some("todo"));
    assert_eq!(it.tags, vec!["dev"]);
    assert_eq!(it.subtasks.len(), 1);
    let id = it.id.clone();

    let list = set_status_in(&root, &list.id, &id, "in_progress").unwrap();
    assert_eq!(list.items[0].status.as_deref(), Some("in_progress"));
    let list = toggle_item_in(&root, &list.id, &id).unwrap();
    assert!(list.items[0].completed);
    assert_eq!(list.items[0].status.as_deref(), Some("done"));

    let list = delete_item_in(&root, &list.id, &id).unwrap();
    assert!(list.items.is_empty());
    assert_eq!(list.archived_items[0].id, id);

    assert!(add_item_in(&root, &list.id, item("  ")).is_err());
    assert!(set_status_in(&root, &list.id, "nope", "done").is_err());
    assert!(
        add_item_in(
            &root,
            &list.id,
            NewItem {
                title: "x".into(),
                priority: Some("urgent".into()),
                ..Default::default()
            }
        )
        .is_err()
    );
}

#[test]
fn update_item_patch_and_subtasks() {
    let (_dir, root) = storage();
    let list = create_list_in(&root, payload("P", "checklist")).unwrap();
    let list = add_item_in(&root, &list.id, item("Old")).unwrap();
    let id = list.items[0].id.clone();
    let list = update_item_in(
        &root,
        &list.id,
        &id,
        ItemPatch {
            title: Some("New".into()),
            due_date: Some("2030-01-15".into()),
            add_subtasks: vec!["a".into(), "b".into()],
            ..Default::default()
        },
    )
    .unwrap();
    let it = &list.items[0];
    assert_eq!(it.title, "New");
    assert_eq!(it.due_date.as_deref(), Some("2030-01-15"));
    let sub_id = it.subtasks[0].id.clone();

    let list = update_item_in(
        &root,
        &list.id,
        &id,
        ItemPatch {
            due_date: Some(String::new()),
            toggle_subtasks: vec![sub_id],
            ..Default::default()
        },
    )
    .unwrap();
    assert_eq!(list.items[0].due_date, None);
    assert!(list.items[0].subtasks[0].completed);
    assert!(
        update_item_in(
            &root,
            &list.id,
            &id,
            ItemPatch {
                due_date: Some("15/01/2030".into()),
                ..Default::default()
            }
        )
        .is_err()
    );
}

#[test]
fn recurrence_moves_due_date() {
    let today = date("2026-03-10");
    assert_eq!(next_due_date(Some("2026-03-10"), "daily", today).unwrap(), "2026-03-11");
    assert_eq!(next_due_date(Some("2026-03-10"), "weekly", today).unwrap(), "2026-03-17");
    // Overdue items jump to the first occurrence after today.
    assert_eq!(next_due_date(Some("2026-03-01"), "weekly", today).unwrap(), "2026-03-15");
    // Month ends are clamped.
    assert_eq!(
        next_due_date(Some("2026-01-31"), "monthly", date("2026-01-31")).unwrap(),
        "2026-02-28"
    );
    assert_eq!(next_due_date(None, "yearly", today).unwrap(), "2027-03-10");
    assert_eq!(next_due_date(Some("2026-03-10"), "hourly", today), None);

    let mut it = ListItem {
        id: "i".into(),
        title: "Water plants".into(),
        description: None,
        completed: false,
        status: None,
        notes: None,
        tags: vec![],
        priority: None,
        due_date: Some("2026-03-10".into()),
        url: None,
        image: None,
        attachments: vec![],
        subtasks: vec![Subtask {
            id: "s".into(),
            title: "front".into(),
            completed: true,
        }],
        recurrence: Some("daily".into()),
        created_at: now_iso(),
        updated_at: now_iso(),
    };
    set_item_completed(&mut it, true, "checklist", today);
    assert!(!it.completed);
    assert_eq!(it.due_date.as_deref(), Some("2026-03-11"));
    assert!(!it.subtasks[0].completed);

    it.recurrence = None;
    set_item_completed(&mut it, true, "checklist", today);
    assert!(it.completed);
}

#[test]
fn search_finds_items_across_lists() {
    let (_dir, root) = storage();
    let a = create_list_in(&root, payload("A", "checklist")).unwrap();
    let b = create_list_in(&root, payload("B", "checklist")).unwrap();
    add_item_in(&root, &a.id, item("Buy MILK")).unwrap();
    add_item_in(
        &root,
        &b.id,
        NewItem {
            title: "Other".into(),
            tags: vec!["milk-run".into()],
            ..Default::default()
        },
    )
    .unwrap();
    add_item_in(&root, &b.id, item("Unrelated")).unwrap();
    assert_eq!(search_in(&root, "milk").unwrap().len(), 2);
    assert!(search_in(&root, "  ").unwrap().is_empty());
}

#[test]
fn json_list_import_keeps_local_attachments() {
    let (dir, root) = storage();
    let list = list_with_attachment(&root, "Recipes", b"pasta");
    let export = dir.path().join("recipes.json");
    export_list_in(&root, &list.id, &export).unwrap();

    let imported = import_list_in(&root, &export).unwrap();
    assert_ne!(imported.id, list.id);
    let att = &imported.items[0].attachments[0];
    let path = attachment_path_in(&root, &imported.id, &att.file_name).unwrap();
    assert_eq!(fs::read(path).unwrap(), b"pasta");
}

#[test]
fn json_list_import_drops_attachments_it_cannot_find() {
    let (dir, root) = storage();
    let list = list_with_attachment(&root, "Recipes", b"pasta");
    let export = dir.path().join("recipes.json");
    export_list_in(&root, &list.id, &export).unwrap();

    let (_other_dir, other_root) = storage();
    let imported = import_list_in(&other_root, &export).unwrap();
    assert_eq!(imported.items.len(), 1);
    assert!(imported.items[0].attachments.is_empty());
}

#[test]
fn zip_list_export_carries_attachments() {
    let (dir, root) = storage();
    let list = list_with_attachment(&root, "Recipes", b"pasta");
    let export = dir.path().join("recipes.zip");
    export_list_in(&root, &list.id, &export).unwrap();

    let (_other_dir, other_root) = storage();
    let imported = import_list_in(&other_root, &export).unwrap();
    assert_eq!(imported.id, "recipes");
    let att = &imported.items[0].attachments[0];
    let path = attachment_path_in(&other_root, &imported.id, &att.file_name).unwrap();
    assert_eq!(fs::read(path).unwrap(), b"pasta");
}

#[test]
fn zip_backup_round_trip() {
    let (dir, root) = storage();
    let kept = list_with_attachment(&root, "Kept", b"kept-file");
    let trashed = list_with_attachment(&root, "Binned", b"binned-file");
    delete_list_in(&root, &trashed.id).unwrap();
    let mut state = read_app_state(&root).unwrap();
    state.settings.theme = "dark".into();
    state.favorites = vec![kept.id.clone()];
    write_app_state(&root, &state).unwrap();

    let backup = dir.path().join("backup.zip");
    export_backup_in(&root, &backup).unwrap();

    // Restore into an empty storage: everything comes back with the same IDs.
    let (_fresh_dir, fresh) = storage();
    let report = import_backup_in(&fresh, &backup).unwrap();
    assert_eq!(
        report,
        RestoreReport {
            lists: 1,
            trashed: 1,
            attachments: 2
        }
    );
    let restored = get_list_in(&fresh, &kept.id).unwrap();
    let att = &restored.items[0].attachments[0];
    let file = attachment_path_in(&fresh, &kept.id, &att.file_name).unwrap();
    assert_eq!(fs::read(file).unwrap(), b"kept-file");
    assert_eq!(trashed_lists(&fresh).unwrap()[0].id, trashed.id);
    let fresh_state = read_app_state(&fresh).unwrap();
    assert_eq!(fresh_state.settings.theme, "dark");
    assert_eq!(fresh_state.favorites, vec![kept.id.clone()]);

    // Restore into the original storage: IDs are taken, so lists, files and favorites
    // move to new IDs together.
    let report = import_backup_in(&root, &backup).unwrap();
    assert_eq!(report.lists, 1);
    let copies: Vec<ListData> = all_lists(&root)
        .unwrap()
        .into_iter()
        .filter(|l| l.id != kept.id)
        .collect();
    assert_eq!(copies.len(), 1);
    let copy = &copies[0];
    assert_eq!(copy.name, "Kept");
    let att = &copy.items[0].attachments[0];
    assert!(attachment_path_in(&root, &copy.id, &att.file_name).is_ok());
    let state = read_app_state(&root).unwrap();
    assert!(state.favorites.contains(&copy.id));
}

#[test]
fn legacy_json_backup_still_restores() {
    let (dir, root) = storage();
    create_list_in(&root, payload("Old", "simple")).unwrap();
    let legacy = serde_json::json!({
        "version": 1,
        "exportedAt": now_iso(),
        "appState": read_app_state(&root).unwrap(),
        "lists": all_lists(&root).unwrap(),
    });
    let path = dir.path().join("listy-backup.json");
    fs::write(&path, legacy.to_string()).unwrap();

    let (_fresh_dir, fresh) = storage();
    let report = import_backup_in(&fresh, &path).unwrap();
    assert_eq!(report.lists, 1);
    assert_eq!(report.trashed, 0);
}

#[test]
fn zip_import_ignores_path_traversal_entries() {
    let (dir, root) = storage();
    let list = create_list_in(&root, payload("Evil", "checklist")).unwrap();
    let path = dir.path().join("evil.zip");
    write_zip(&path, |zip| {
        zip_add_bytes(zip, LIST_JSON, serde_json::to_string(&list).unwrap().as_bytes())?;
        zip_add_bytes(zip, "attachments/../../escaped.txt", b"x")?;
        zip_add_bytes(zip, "../escaped.txt", b"x")
    })
    .unwrap();
    import_list_in(&root, &path).unwrap();
    assert!(!dir.path().join("escaped.txt").exists());
    assert!(!root.join("escaped.txt").exists());
}
