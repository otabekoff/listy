#[cfg(target_os = "windows")]
pub fn enable_native_snap_layouts(window: &tauri::WebviewWindow) {
    use windows_sys::Win32::Foundation::{HWND, LPARAM, LRESULT, POINT, RECT, WPARAM};
    use windows_sys::Win32::Graphics::Gdi::ScreenToClient;
    use windows_sys::Win32::UI::HiDpi::GetDpiForWindow;
    use windows_sys::Win32::UI::Shell::{DefSubclassProc, SetWindowSubclass};
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        GetClientRect, IsZoomed, PostMessageW, HTMAXBUTTON, SC_MAXIMIZE, SC_RESTORE, WM_NCHITTEST,
        WM_NCLBUTTONUP, WM_SYSCOMMAND,
    };

    const SUBCLASS_ID: usize = 0x4C495354; // "LIST"
    const TITLEBAR_HEIGHT_DIP: i32 = 40;
    const BTN_WIDTH_DIP: i32 = 46;

    unsafe extern "system" fn subclass_proc(
        hwnd: HWND,
        msg: u32,
        wparam: WPARAM,
        lparam: LPARAM,
        _uid: usize,
        _ref_data: usize,
    ) -> LRESULT {
        unsafe {
            if msg == WM_NCHITTEST {
                let result = DefSubclassProc(hwnd, msg, wparam, lparam);
                let x_screen = (lparam & 0xFFFF) as i16 as i32;
                let y_screen = ((lparam >> 16) & 0xFFFF) as i16 as i32;
                let mut pt = POINT {
                    x: x_screen,
                    y: y_screen,
                };
                if ScreenToClient(hwnd, &mut pt) != 0 {
                    let mut rect = RECT {
                        left: 0,
                        top: 0,
                        right: 0,
                        bottom: 0,
                    };
                    if GetClientRect(hwnd, &mut rect) != 0 {
                        let dpi = GetDpiForWindow(hwnd) as i32;
                        let scale = if dpi > 0 { dpi as f32 / 96.0 } else { 1.0 };
                        let tb_h = (TITLEBAR_HEIGHT_DIP as f32 * scale) as i32;
                        let btn_w = (BTN_WIDTH_DIP as f32 * scale) as i32;
                        let max_left = rect.right - btn_w * 2;
                        let max_right = rect.right - btn_w;
                        if pt.y >= 0 && pt.y <= tb_h && pt.x >= max_left && pt.x < max_right {
                            return HTMAXBUTTON as isize;
                        }
                    }
                }
                return result;
            }

            if msg == WM_NCLBUTTONUP && wparam == HTMAXBUTTON as usize {
                let cmd = if IsZoomed(hwnd) != 0 {
                    SC_RESTORE
                } else {
                    SC_MAXIMIZE
                };
                PostMessageW(hwnd, WM_SYSCOMMAND, cmd as usize, 0);
                return 0;
            }

            DefSubclassProc(hwnd, msg, wparam, lparam)
        }
    }

    if let Ok(hwnd) = window.hwnd() {
        unsafe {
            SetWindowSubclass(hwnd.0 as HWND, Some(subclass_proc), SUBCLASS_ID, 0);
        }
    }
}

#[cfg(not(target_os = "windows"))]
pub fn enable_native_snap_layouts(_window: &tauri::WebviewWindow) {}
