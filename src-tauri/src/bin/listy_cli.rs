use std::env;
use std::process;
use listy_lib::core::{self, NewItem};
use listy_lib::models::CreateListPayload;

fn print_help() {
    eprintln!(
        r#"Listy CLI — Manage your local-first Listy JSON lists from the terminal.

USAGE:
  listy-cli [--storage <path>] <COMMAND> [ARGS]

COMMANDS:
  path                               Show active storage folder
  lists                              List all active lists (JSON)
  trash                              List the lists in the trash (JSON)
  get <list_id>                      Get a list and its items (JSON)
  search <query>                     Find items in all lists (JSON)
  create --name <name> [--desc <d>] [--type checklist|simple|priority|status] [--icon <id>] [--color <hex>]
  delete <list_id>                   Move a list to trash
  restore <list_id>                  Restore a list from trash
  add-item <list_id> --title <t> [--desc <d>] [--notes <md>] [--priority low|normal|medium|high]
           [--tags a,b] [--due YYYY-MM-DD] [--repeat daily|weekly|monthly|yearly]
           [--status todo|in_progress|done] [--subtasks "a;b;c"] [--url <link>]
  toggle-item <list_id> <item_id>    Toggle completed status of an item
  set-status <list_id> <item_id> <todo|in_progress|done>
  delete-item <list_id> <item_id>    Move an item to the list's archive
  help                               Show this help message
"#
    );
}

fn flag_val(args: &[String], flag: &str) -> Option<String> {
    args.windows(2)
        .find(|w| w[0] == flag)
        .map(|w| w[1].clone())
}

fn run() -> Result<(), String> {
    let raw_args: Vec<String> = env::args().skip(1).collect();
    if raw_args.is_empty() || raw_args[0] == "help" || raw_args[0] == "--help" || raw_args[0] == "-h" {
        print_help();
        return Ok(());
    }

    let mut storage_override: Option<String> = None;
    let mut args = Vec::new();
    let mut i = 0;
    while i < raw_args.len() {
        if raw_args[i] == "--storage" && i + 1 < raw_args.len() {
            storage_override = Some(raw_args[i + 1].clone());
            i += 2;
        } else {
            args.push(raw_args[i].clone());
            i += 1;
        }
    }

    if args.is_empty() {
        print_help();
        return Ok(());
    }

    let root = core::resolve_headless_storage_root(storage_override.as_deref())?;
    let cmd = args[0].as_str();
    let rest = &args[1..];

    match cmd {
        "path" => {
            println!("{}", root.display());
        }
        "lists" => {
            let lists = core::all_lists(&root)?;
            println!("{}", serde_json::to_string_pretty(&lists).unwrap());
        }
        "trash" => {
            let lists = core::trashed_lists(&root)?;
            println!("{}", serde_json::to_string_pretty(&lists).unwrap());
        }
        "search" => {
            let query = rest.join(" ");
            if query.trim().is_empty() {
                return Err("Missing <query>".to_string());
            }
            let hits = core::search_in(&root, &query)?;
            println!("{}", serde_json::to_string_pretty(&hits).unwrap());
        }
        "get" => {
            let id = rest.first().ok_or("Missing <list_id>")?;
            let list = core::get_list_in(&root, id)?;
            println!("{}", serde_json::to_string_pretty(&list).unwrap());
        }
        "create" => {
            let name = flag_val(rest, "--name").ok_or("Missing --name <name>")?;
            let description = flag_val(rest, "--desc").unwrap_or_default();
            let list_type = flag_val(rest, "--type").unwrap_or_else(|| "checklist".to_string());
            let icon = flag_val(rest, "--icon").unwrap_or_else(|| "list".to_string());
            let color = flag_val(rest, "--color").unwrap_or_else(|| "#3B82F6".to_string());
            let created = core::create_list_in(
                &root,
                CreateListPayload {
                    name,
                    description,
                    icon,
                    color,
                    list_type,
                    items: Vec::new(),
                },
            )?;
            println!("{}", serde_json::to_string_pretty(&created).unwrap());
        }
        "delete" => {
            let id = rest.first().ok_or("Missing <list_id>")?;
            core::delete_list_in(&root, id)?;
            println!("{{\"deleted\":\"{id}\"}}");
        }
        "restore" => {
            let id = rest.first().ok_or("Missing <list_id>")?;
            let restored = core::restore_list_in(&root, id)?;
            println!("{}", serde_json::to_string_pretty(&restored).unwrap());
        }
        "add-item" => {
            let list_id = rest.first().ok_or("Missing <list_id>")?;
            let title = flag_val(rest, "--title").ok_or("Missing --title <title>")?;
            let split = |flag: &str, sep: char| -> Vec<String> {
                flag_val(rest, flag)
                    .map(|t| {
                        t.split(sep)
                            .map(|s| s.trim().to_string())
                            .filter(|s| !s.is_empty())
                            .collect()
                    })
                    .unwrap_or_default()
            };
            let updated = core::add_item_in(
                &root,
                list_id,
                NewItem {
                    title,
                    description: flag_val(rest, "--desc"),
                    notes: flag_val(rest, "--notes"),
                    priority: flag_val(rest, "--priority"),
                    tags: split("--tags", ','),
                    due_date: flag_val(rest, "--due"),
                    url: flag_val(rest, "--url"),
                    status: flag_val(rest, "--status"),
                    recurrence: flag_val(rest, "--repeat"),
                    subtasks: split("--subtasks", ';'),
                },
            )?;
            println!("{}", serde_json::to_string_pretty(&updated).unwrap());
        }
        "toggle-item" => {
            let list_id = rest.first().ok_or("Missing <list_id>")?;
            let item_id = rest.get(1).ok_or("Missing <item_id>")?;
            let updated = core::toggle_item_in(&root, list_id, item_id)?;
            println!("{}", serde_json::to_string_pretty(&updated).unwrap());
        }
        "set-status" => {
            let list_id = rest.first().ok_or("Missing <list_id>")?;
            let item_id = rest.get(1).ok_or("Missing <item_id>")?;
            let status = rest.get(2).ok_or("Missing <status>")?;
            let updated = core::set_status_in(&root, list_id, item_id, status)?;
            println!("{}", serde_json::to_string_pretty(&updated).unwrap());
        }
        "delete-item" => {
            let list_id = rest.first().ok_or("Missing <list_id>")?;
            let item_id = rest.get(1).ok_or("Missing <item_id>")?;
            let updated = core::delete_item_in(&root, list_id, item_id)?;
            println!("{}", serde_json::to_string_pretty(&updated).unwrap());
        }
        other => {
            return Err(format!("Unknown command '{other}'. Run `listy-cli help`."));
        }
    }
    Ok(())
}

fn main() {
    if let Err(err) = run() {
        eprintln!("Error: {err}");
        process::exit(1);
    }
}
