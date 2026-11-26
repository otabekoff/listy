use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder,
};

pub mod core;
pub mod models;
mod storage;

#[cfg(target_os = "windows")]
fn apply_desktop_widget_zorder(window: &tauri::WebviewWindow, stick_to_desktop: bool) {
    use windows_sys::Win32::Foundation::HWND;
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        FindWindowW, GetWindowLongPtrW, SetWindowLongPtrW, SetWindowPos, GWL_EXSTYLE,
        GWLP_HWNDPARENT, HWND_BOTTOM, HWND_NOTOPMOST, SWP_FRAMECHANGED, SWP_NOACTIVATE,
        SWP_NOMOVE, SWP_NOSIZE, WS_EX_TOOLWINDOW,
    };

    if let Ok(hwnd) = window.hwnd() {
        let raw_hwnd = hwnd.0 as HWND;
        unsafe {
            let ex_style = GetWindowLongPtrW(raw_hwnd, GWL_EXSTYLE);
            if stick_to_desktop {
                // Attach owner to Windows Desktop (Progman) so Win+D never minimizes the widget
                let progman_name: Vec<u16> = "Progman\0".encode_utf16().collect();
                let progman = FindWindowW(progman_name.as_ptr(), std::ptr::null());
                if !progman.is_null() {
                    SetWindowLongPtrW(raw_hwnd, GWLP_HWNDPARENT, progman as isize);
                }
                SetWindowLongPtrW(
                    raw_hwnd,
                    GWL_EXSTYLE,
                    ex_style | (WS_EX_TOOLWINDOW as isize),
                );
                SetWindowPos(
                    raw_hwnd,
                    HWND_BOTTOM,
                    0,
                    0,
                    0,
                    0,
                    SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_FRAMECHANGED,
                );
            } else {
                SetWindowLongPtrW(raw_hwnd, GWLP_HWNDPARENT, 0);
                SetWindowLongPtrW(
                    raw_hwnd,
                    GWL_EXSTYLE,
                    ex_style & !(WS_EX_TOOLWINDOW as isize),
                );
                SetWindowPos(
                    raw_hwnd,
                    HWND_NOTOPMOST,
                    0,
                    0,
                    0,
                    0,
                    SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_FRAMECHANGED,
                );
            }
        }
    }
}

#[cfg(not(target_os = "windows"))]
fn apply_desktop_widget_zorder(_window: &tauri::WebviewWindow, _stick_to_desktop: bool) {}

fn toggle_or_create_widget(app: &AppHandle) -> Result<(), String> {
    if let Some(widget) = app.get_webview_window("widget") {
        if widget.is_visible().unwrap_or(false) {
            let _ = widget.hide();
        } else {
            let _ = widget.show();
            let _ = widget.set_focus();
        }
        return Ok(());
    }

    let builder = WebviewWindowBuilder::new(
        app,
        "widget",
        WebviewUrl::App("index.html".into()),
    )
    .initialization_script("window.location.hash = '#/widget';")
    .title("Listy Widget")
    .inner_size(340.0, 460.0)
    .min_inner_size(280.0, 320.0)
    .max_inner_size(520.0, 760.0)
    .maximized(false)
    .maximizable(false)
    .decorations(false)
    .resizable(true)
    .skip_taskbar(true)
    .background_color(tauri::window::Color(28, 31, 39, 255));

    let widget = builder
        .build()
        .map_err(|e| format!("Failed to create widget window: {e}"))?;

    let _ = widget.unmaximize();
    let _ = widget.set_size(tauri::Size::Logical(tauri::LogicalSize::new(340.0, 460.0)));
    if let Ok(Some(monitor)) = app.primary_monitor() {
        let scale = monitor.scale_factor();
        let size = monitor.size();
        let logical_w = size.width as f64 / scale;
        let _ = widget.set_position(tauri::Position::Logical(tauri::LogicalPosition::new(
            (logical_w - 368.0).max(24.0),
            28.0,
        )));
    }
    apply_desktop_widget_zorder(&widget, true);
    Ok(())
}

#[tauri::command]
async fn toggle_desktop_widget(app: AppHandle) -> Result<(), String> {
    toggle_or_create_widget(&app)
}

#[tauri::command]
fn set_widget_desktop_mode(app: AppHandle, stick_to_desktop: bool) -> Result<(), String> {
    if let Some(widget) = app.get_webview_window("widget") {
        if stick_to_desktop {
            let _ = widget.set_always_on_top(false);
        }
        apply_desktop_widget_zorder(&widget, stick_to_desktop);
    }
    Ok(())
}

fn show_main(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.unminimize();
        let _ = win.set_focus();
    }
}

#[tauri::command]
fn show_main_window(app: AppHandle) {
    show_main(&app);
}

/// Label and route of the small window opened by the global Quick Add shortcut.
const QUICK_ADD_LABEL: &str = "quickadd";

fn toggle_quick_add_window(app: &AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window(QUICK_ADD_LABEL) {
        if win.is_visible().unwrap_or(false) && win.is_focused().unwrap_or(false) {
            let _ = win.hide();
        } else {
            // Tell the page to reset its form before it becomes visible again.
            let _ = win.emit("listy://quick-add-opened", ());
            let _ = win.center();
            let _ = win.show();
            let _ = win.set_focus();
        }
        return Ok(());
    }
    WebviewWindowBuilder::new(app, QUICK_ADD_LABEL, WebviewUrl::App("index.html".into()))
        .initialization_script("window.location.hash = '#/quick-add';")
        .title("Listy Quick Add")
        .inner_size(460.0, 430.0)
        .resizable(false)
        .maximizable(false)
        .minimizable(false)
        .decorations(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .center()
        .focused(true)
        .background_color(tauri::window::Color(32, 32, 32, 255))
        .build()
        .map_err(|e| format!("Failed to open Quick Add: {e}"))?;
    Ok(())
}

/// The system-wide Quick Add shortcut.
#[cfg(desktop)]
const QUICK_ADD_SHORTCUT: &str = "Ctrl+Alt+Space";

/// Turns the system-wide Quick Add shortcut on or off.
#[tauri::command]
fn set_global_quick_add(app: AppHandle, enabled: bool) -> Result<(), String> {
    #[cfg(desktop)]
    {
        use tauri_plugin_global_shortcut::GlobalShortcutExt;
        let gs = app.global_shortcut();
        let registered = gs.is_registered(QUICK_ADD_SHORTCUT);
        if enabled && !registered {
            gs.register(QUICK_ADD_SHORTCUT).map_err(|e| {
                format!("Could not register {QUICK_ADD_SHORTCUT} (another app may use it): {e}")
            })?;
        } else if !enabled && registered {
            gs.unregister(QUICK_ADD_SHORTCUT)
                .map_err(|e| format!("Failed to unregister shortcut: {e}"))?;
        }
    }
    #[cfg(not(desktop))]
    let _ = (app, enabled);
    Ok(())
}

/// Hides the calling window (the Quick Add window closes itself this way, so it opens
/// instantly next time).
#[tauri::command]
fn hide_window(window: tauri::WebviewWindow) {
    let _ = window.hide();
}

/// Argument the autostart entry passes, so Listy starts hidden in the tray.
const MINIMIZED_ARG: &str = "--minimized";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        use tauri_plugin_global_shortcut::ShortcutState;
        builder = builder
            // Must be the first plugin: a second launch just brings the running app forward.
            .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
                show_main(app);
            }))
            .plugin(tauri_plugin_autostart::init(
                tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                Some(vec![MINIMIZED_ARG]),
            ))
            .plugin(
                tauri_plugin_global_shortcut::Builder::new()
                    .with_handler(|app, _shortcut, event| {
                        if event.state() == ShortcutState::Pressed {
                            let _ = toggle_quick_add_window(app);
                        }
                    })
                    .build(),
            )
            .plugin(tauri_plugin_updater::Builder::new().build());
    }

    builder
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_process::init())
        .plugin(
            tauri_plugin_snap_layout::init()
                .button_id("snap-btn")
                .build(),
        )
        .manage(storage::StorageWatcher::default())
        .setup(|app| {
            let start_hidden = std::env::args().any(|a| a == MINIMIZED_ARG);
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.unmaximize();
                let _ = win.set_size(tauri::Size::Logical(tauri::LogicalSize::new(1180.0, 760.0)));
                let _ = win.center();
                if !start_hidden {
                    let _ = win.show();
                    let _ = win.set_focus();
                }
            }

            // Pick up changes made by listy-cli, listy-mcp or a sync client right away.
            // A folder that can't be watched still works; it just refreshes on focus.
            let _ = storage::start_watching(app.handle());

            let open_item = MenuItem::with_id(app, "open_main", "Open Listy", true, None::<&str>)?;
            let quick_item = MenuItem::with_id(app, "quick_add", "Quick Add", true, None::<&str>)?;
            let widget_item =
                MenuItem::with_id(app, "toggle_widget", "Desktop Widget", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let tray_menu =
                Menu::with_items(app, &[&open_item, &quick_item, &widget_item, &quit_item])?;

            let mut tray_builder = TrayIconBuilder::new()
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .tooltip("Listy — Your lists. Your files.")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open_main" => show_main(app),
                    "quick_add" => {
                        let _ = toggle_quick_add_window(app);
                    }
                    "toggle_widget" => {
                        let app_handle = app.clone();
                        tauri::async_runtime::spawn(async move {
                            let _ = toggle_or_create_widget(&app_handle);
                        });
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main(tray.app_handle());
                    }
                });

            if let Some(icon) = app.default_window_icon().cloned() {
                tray_builder = tray_builder.icon(icon);
            }
            let _ = tray_builder.build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            storage::get_storage_path,
            storage::set_storage_path,
            storage::initialize_storage,
            storage::get_app_state,
            storage::update_app_state,
            storage::get_all_lists,
            storage::get_trashed_lists,
            storage::get_list,
            storage::create_list,
            storage::update_list,
            storage::delete_list,
            storage::restore_list,
            storage::permanently_delete_list,
            storage::export_list,
            storage::import_list,
            storage::export_backup,
            storage::import_backup,
            storage::attach_file_to_list,
            storage::get_attachment_path,
            storage::remove_attachment_file,
            storage::open_attachment,
            storage::open_storage_folder,
            toggle_desktop_widget,
            set_widget_desktop_mode,
            show_main_window,
            set_global_quick_add,
            hide_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
