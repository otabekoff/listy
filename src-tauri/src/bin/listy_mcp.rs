//! Listy MCP server: exposes the Listy storage folder to AI agents over stdio (JSON-RPC,
//! Model Context Protocol). All changes go through `listy_lib::core`, the same code the
//! desktop app uses, and a running app picks them up immediately.

use listy_lib::core::{self, ItemPatch, NewItem};
use listy_lib::models::CreateListPayload;
use serde_json::{Value, json};
use std::io::{self, BufRead, Write};
use std::path::Path;

fn id_schema(description: &str) -> Value {
    json!({ "type": "string", "description": description })
}

fn item_ref_schema(extra: Value) -> Value {
    let mut props = json!({
        "listId": id_schema("List ID (e.g. shopping-list)"),
        "itemId": id_schema("Item ID (e.g. item-1a2b3c4d)")
    });
    let mut required = vec![json!("listId"), json!("itemId")];
    if let (Some(p), Some(e)) = (props.as_object_mut(), extra.get("properties")) {
        for (k, v) in e.as_object().into_iter().flatten() {
            p.insert(k.clone(), v.clone());
        }
    }
    if let Some(req) = extra.get("required").and_then(Value::as_array) {
        required.extend(req.iter().cloned());
    }
    json!({ "type": "object", "properties": props, "required": required })
}

fn tools_schema() -> Value {
    let priority = json!({ "type": "string", "enum": core::PRIORITIES });
    let status = json!({ "type": "string", "enum": core::STATUSES });
    let recurrence = json!({
        "type": "string",
        "enum": core::RECURRENCES,
        "description": "Completing a recurring item moves its due date to the next occurrence."
    });
    let due = json!({ "type": "string", "description": "YYYY-MM-DD" });
    let tags = json!({ "type": "array", "items": { "type": "string" } });

    json!([
        {
            "name": "get_storage_path",
            "description": "Get the active Listy storage folder path.",
            "inputSchema": { "type": "object", "properties": {} }
        },
        {
            "name": "list_lists",
            "description": "List all active Listy lists. With summary=true returns only id, name, type and item counts.",
            "inputSchema": {
                "type": "object",
                "properties": { "summary": { "type": "boolean" } }
            }
        },
        {
            "name": "list_trash",
            "description": "List the lists in the trash (they can be restored with restore_list).",
            "inputSchema": { "type": "object", "properties": {} }
        },
        {
            "name": "get_list",
            "description": "Get a Listy list with all its items.",
            "inputSchema": {
                "type": "object",
                "properties": { "id": id_schema("List ID (e.g. shopping-list)") },
                "required": ["id"]
            }
        },
        {
            "name": "search",
            "description": "Find items in all active lists whose title, description, notes, tags or subtasks contain the query (case-insensitive).",
            "inputSchema": {
                "type": "object",
                "properties": { "query": { "type": "string" } },
                "required": ["query"]
            }
        },
        {
            "name": "create_list",
            "description": "Create a new Listy list. Types: checklist (tick items off), simple (plain notes), priority (checklist sorted by priority), status (To Do / In Progress / Done board).",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "name": { "type": "string" },
                    "description": { "type": "string" },
                    "type": { "type": "string", "enum": core::LIST_TYPES },
                    "icon": { "type": "string" },
                    "color": { "type": "string", "description": "Hex color, e.g. #3B82F6" }
                },
                "required": ["name"]
            }
        },
        {
            "name": "delete_list",
            "description": "Move a Listy list to the trash.",
            "inputSchema": {
                "type": "object",
                "properties": { "id": { "type": "string" } },
                "required": ["id"]
            }
        },
        {
            "name": "restore_list",
            "description": "Restore a list from the trash.",
            "inputSchema": {
                "type": "object",
                "properties": { "id": { "type": "string" } },
                "required": ["id"]
            }
        },
        {
            "name": "add_item",
            "description": "Add an item to a Listy list.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "listId": { "type": "string" },
                    "title": { "type": "string" },
                    "description": { "type": "string" },
                    "notes": { "type": "string", "description": "Markdown notes" },
                    "priority": priority,
                    "tags": tags,
                    "dueDate": due,
                    "url": { "type": "string" },
                    "status": status,
                    "recurrence": recurrence,
                    "subtasks": { "type": "array", "items": { "type": "string" }, "description": "Subtask titles" }
                },
                "required": ["listId", "title"]
            }
        },
        {
            "name": "update_item",
            "description": "Change fields of an item. Omitted fields stay as they are; an empty string clears an optional field.",
            "inputSchema": item_ref_schema(json!({
                "properties": {
                    "title": { "type": "string" },
                    "description": { "type": "string" },
                    "notes": { "type": "string" },
                    "priority": { "type": "string", "description": "low | normal | medium | high, or empty to clear" },
                    "tags": tags,
                    "dueDate": { "type": "string", "description": "YYYY-MM-DD, or empty to clear" },
                    "url": { "type": "string" },
                    "recurrence": { "type": "string", "description": "daily | weekly | monthly | yearly, or empty to clear" },
                    "completed": { "type": "boolean" },
                    "addSubtasks": { "type": "array", "items": { "type": "string" } },
                    "toggleSubtasks": { "type": "array", "items": { "type": "string" }, "description": "Subtask IDs to tick or untick" }
                }
            }))
        },
        {
            "name": "set_status",
            "description": "Set the status of an item: todo, in_progress or done (done also completes it).",
            "inputSchema": item_ref_schema(json!({
                "properties": { "status": status },
                "required": ["status"]
            }))
        },
        {
            "name": "toggle_item",
            "description": "Toggle the completed state of an item.",
            "inputSchema": item_ref_schema(json!({}))
        },
        {
            "name": "delete_item",
            "description": "Move an item to its list's archive (it can be restored in the app).",
            "inputSchema": item_ref_schema(json!({}))
        }
    ])
}

fn str_arg<'a>(args: &'a Value, key: &str) -> Result<&'a str, String> {
    args.get(key)
        .and_then(Value::as_str)
        .ok_or_else(|| format!("Missing {key}"))
}

fn opt_str(args: &Value, key: &str) -> Option<String> {
    args.get(key).and_then(Value::as_str).map(str::to_string)
}

fn to_value<T: serde::Serialize>(v: T) -> Result<Value, String> {
    serde_json::to_value(v).map_err(|e| e.to_string())
}

fn parse<T: serde::de::DeserializeOwned>(args: &Value) -> Result<T, String> {
    serde_json::from_value(args.clone()).map_err(|e| format!("Invalid arguments: {e}"))
}

fn call_tool(root: &Path, name: &str, args: &Value) -> Result<Value, String> {
    match name {
        "get_storage_path" => Ok(json!({ "storagePath": root.to_string_lossy() })),
        "list_lists" => {
            let lists = core::all_lists(root)?;
            if args.get("summary").and_then(Value::as_bool) == Some(true) {
                let summary: Vec<Value> = lists
                    .iter()
                    .map(|l| {
                        json!({
                            "id": l.id,
                            "name": l.name,
                            "type": l.list_type,
                            "items": l.items.len(),
                            "completed": l.items.iter().filter(|i| i.completed).count(),
                            "updatedAt": l.updated_at,
                        })
                    })
                    .collect();
                return Ok(Value::Array(summary));
            }
            to_value(lists)
        }
        "list_trash" => to_value(core::trashed_lists(root)?),
        "get_list" => to_value(core::get_list_in(root, str_arg(args, "id")?)?),
        "search" => to_value(core::search_in(root, str_arg(args, "query")?)?),
        "create_list" => {
            let list_type = opt_str(args, "type").unwrap_or_else(|| "checklist".to_string());
            if !core::LIST_TYPES.contains(&list_type.as_str()) {
                return Err(format!(
                    "Invalid type '{list_type}'. Use one of: {}",
                    core::LIST_TYPES.join(", ")
                ));
            }
            let created = core::create_list_in(
                root,
                CreateListPayload {
                    name: str_arg(args, "name")?.to_string(),
                    description: opt_str(args, "description").unwrap_or_default(),
                    icon: opt_str(args, "icon").unwrap_or_else(|| "list".to_string()),
                    color: opt_str(args, "color").unwrap_or_else(|| "#3B82F6".to_string()),
                    list_type,
                    items: Vec::new(),
                },
            )?;
            to_value(created)
        }
        "delete_list" => {
            let id = str_arg(args, "id")?;
            core::delete_list_in(root, id)?;
            Ok(json!({ "deleted": id }))
        }
        "restore_list" => to_value(core::restore_list_in(root, str_arg(args, "id")?)?),
        "add_item" => {
            let list_id = str_arg(args, "listId")?;
            let new: NewItem = parse(args)?;
            to_value(core::add_item_in(root, list_id, new)?)
        }
        "update_item" => {
            let (list_id, item_id) = (str_arg(args, "listId")?, str_arg(args, "itemId")?);
            let patch: ItemPatch = parse(args)?;
            to_value(core::update_item_in(root, list_id, item_id, patch)?)
        }
        "set_status" => {
            let (list_id, item_id) = (str_arg(args, "listId")?, str_arg(args, "itemId")?);
            to_value(core::set_status_in(root, list_id, item_id, str_arg(args, "status")?)?)
        }
        "toggle_item" => {
            let (list_id, item_id) = (str_arg(args, "listId")?, str_arg(args, "itemId")?);
            to_value(core::toggle_item_in(root, list_id, item_id)?)
        }
        "delete_item" => {
            let (list_id, item_id) = (str_arg(args, "listId")?, str_arg(args, "itemId")?);
            to_value(core::delete_item_in(root, list_id, item_id)?)
        }
        _ => Err(format!("Unknown tool: {name}")),
    }
}

fn main() {
    let stdin = io::stdin();
    let mut stdout = io::stdout();

    for line in stdin.lock().lines() {
        let Ok(raw) = line else { break };
        if raw.trim().is_empty() {
            continue;
        }
        let req: Value = match serde_json::from_str(&raw) {
            Ok(v) => v,
            Err(_) => continue,
        };

        let id = req.get("id").cloned();
        let method = req.get("method").and_then(|m| m.as_str()).unwrap_or("");
        let params = req.get("params").cloned().unwrap_or_else(|| json!({}));

        // Notifications have no id and expect no response
        if id.is_none() {
            continue;
        }

        let response = match method {
            "initialize" => json!({
                "jsonrpc": "2.0",
                "id": id,
                "result": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": { "tools": {} },
                    "serverInfo": { "name": "listy-mcp", "version": env!("CARGO_PKG_VERSION") }
                }
            }),
            "ping" => json!({ "jsonrpc": "2.0", "id": id, "result": {} }),
            "tools/list" => json!({
                "jsonrpc": "2.0",
                "id": id,
                "result": { "tools": tools_schema() }
            }),
            "tools/call" => {
                let tool_name = params.get("name").and_then(|n| n.as_str()).unwrap_or("");
                let tool_args = params.get("arguments").cloned().unwrap_or_else(|| json!({}));
                let result = core::resolve_headless_storage_root(None)
                    .and_then(|root| call_tool(&root, tool_name, &tool_args));
                match result {
                    Ok(val) => json!({
                        "jsonrpc": "2.0",
                        "id": id,
                        "result": {
                            "content": [{ "type": "text", "text": serde_json::to_string_pretty(&val).unwrap_or_default() }]
                        }
                    }),
                    Err(err) => json!({
                        "jsonrpc": "2.0",
                        "id": id,
                        "result": {
                            "isError": true,
                            "content": [{ "type": "text", "text": err }]
                        }
                    }),
                }
            }
            _ => json!({
                "jsonrpc": "2.0",
                "id": id,
                "error": { "code": -32601, "message": format!("Method not found: {method}") }
            }),
        };

        let _ = writeln!(stdout, "{}", response);
        let _ = stdout.flush();
    }
}
