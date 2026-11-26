import { useEffect, useState } from "react";
import { HashRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { PanelLeft, Plus } from "lucide-react";
import {
  Button,
  Keycaps,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  Spinner,
  ThemeProvider,
  Tooltip,
} from "./ui";
import { QuickAddDialog } from "./components/QuickAddDialog";
import { Sidebar } from "./components/Sidebar";
import { TitleBar } from "./components/TitleBar";
import { Toast } from "./components/Toast";
import { useMainWindowIntegration, useStorageSync } from "./hooks/useDesktopIntegration";
import { useT } from "./i18n/useT";
import { QuickAddPage } from "./pages/QuickAddPage";
import { TodayPage } from "./pages/TodayPage";
import { useUpdater } from "./services/updater";
import { DocsPage } from "./pages/DocsPage";
import { HomePage } from "./pages/HomePage";
import { ListDetailPage } from "./pages/ListDetailPage";
import { ListsPage } from "./pages/ListsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ShortcutsPage } from "./pages/ShortcutsPage";
import { TrashPage } from "./pages/TrashPage";
import { WidgetPage } from "./pages/WidgetPage";
import { storageApi } from "./services/storageApi";
import { useListyStore } from "./store/useListyStore";

function useResolvedTheme(preference: "system" | "light" | "dark"): "light" | "dark" {
  const [systemDark, setSystemDark] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : false
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  if (preference === "dark") return "dark";
  if (preference === "light") return "light";
  return systemDark ? "dark" : "light";
}

function AppShell() {
  const init = useListyStore((s) => s.init);
  const initialized = useListyStore((s) => s.initialized);
  const error = useListyStore((s) => s.error);
  const clearError = useListyStore((s) => s.clearError);
  const refreshAll = useListyStore((s) => s.refreshAll);
  const listsCount = useListyStore((s) => s.lists.length);
  const undo = useListyStore((s) => s.undo);
  const showToast = useListyStore((s) => s.showToast);
  const update = useUpdater((s) => s.available);
  const installUpdate = useUpdater((s) => s.install);
  const installingUpdate = useUpdater((s) => s.installing);
  const [updateDismissed, setUpdateDismissed] = useState(false);
  const t = useT();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isWidget = location.pathname === "/widget";
  const isQuickAddWindow = location.pathname === "/quick-add";

  useEffect(() => {
    init();
  }, [init]);

  // Keep every window (main, widget, quick add) in step with the files on disk.
  useStorageSync();
  useMainWindowIntegration();

  useEffect(() => {
    if (!storageApi.isTauri()) {
      const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
      document.addEventListener("fullscreenchange", onFs);
      return () => document.removeEventListener("fullscreenchange", onFs);
    }
    const win = getCurrentWindow();
    win.isFullscreen().then(setIsFullscreen).catch(() => {});
    const unlisten = win.onResized(() => {
      win.isFullscreen().then(setIsFullscreen).catch(() => {});
    });
    return () => {
      unlisten.then((fn) => fn()).catch(() => {});
    };
  }, []);

  useEffect(() => {
    const blockContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;
      if (!isEditable) {
        e.preventDefault();
      }
    };

    const blockBrowserShortcuts = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (
        e.key === "F12" ||
        e.key === "F5" ||
        e.key === "F3" ||
        (e.ctrlKey && e.shiftKey && (key === "i" || key === "j" || key === "c")) ||
        (e.ctrlKey && !e.shiftKey && ["p", "s", "u", "r", "f", "g", "h"].includes(key))
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.print = () => {};
    document.addEventListener("contextmenu", blockContextMenu);
    window.addEventListener("keydown", blockBrowserShortcuts, true);
    return () => {
      document.removeEventListener("contextmenu", blockContextMenu);
      window.removeEventListener("keydown", blockBrowserShortcuts, true);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const editing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        Boolean(target?.isContentEditable);
      if (e.ctrlKey && !e.shiftKey && (e.key === "z" || e.key === "Z") && !editing) {
        e.preventDefault();
        undo().then((ok) => {
          if (!ok) showToast(t("store.nothingToUndo"));
        });
      } else if (e.ctrlKey && (e.key === "t" || e.key === "T") && !e.shiftKey) {
        e.preventDefault();
        navigate("/today");
      } else if (e.ctrlKey && e.shiftKey && e.code === "Space") {
        e.preventDefault();
        setQuickAddOpen(true);
      } else if (e.ctrlKey && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        setSidebarCollapsed((c) => !c);
      } else if (e.ctrlKey && e.key === ",") {
        e.preventDefault();
        navigate("/settings");
      } else if (e.ctrlKey && e.key === "1") {
        e.preventDefault();
        navigate("/");
      } else if (e.ctrlKey && e.key === "2") {
        e.preventDefault();
        navigate("/all");
      } else if (e.ctrlKey && e.key === "3") {
        e.preventDefault();
        navigate("/favorites");
      } else if (e.ctrlKey && e.key === "4") {
        e.preventDefault();
        navigate("/trash");
      } else if (e.ctrlKey && e.key === "5") {
        e.preventDefault();
        navigate("/shortcuts");
      } else if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        navigate(-1);
      } else if (e.key === "F11") {
        e.preventDefault();
        if (storageApi.isTauri()) {
          const win = getCurrentWindow();
          win.isFullscreen().then((fs) => {
            const next = !fs;
            win.setFullscreen(next);
            setIsFullscreen(next);
          });
        } else if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate, undo, showToast, t]);

  if (isWidget) {
    return <WidgetPage />;
  }
  if (isQuickAddWindow) {
    return <QuickAddPage />;
  }

  return (
    <>
      {!isFullscreen && <TitleBar />}
      <div className="listy-shell">
        <Sidebar
          collapsed={sidebarCollapsed}
          isFullscreen={isFullscreen}
          onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
          onQuickAdd={() => setQuickAddOpen(true)}
        />
        <main className={`listy-main ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
          {sidebarCollapsed && (
            <div
              style={{
                position: "fixed",
                left: "14px",
                top: isFullscreen ? "16px" : "54px",
                zIndex: 700,
              }}
            >
              <Tooltip
                content={
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                    <span>{t("app.showSidebar")}</span>
                    <Keycaps keys={["Ctrl", "B"]} size="small" />
                  </span>
                }
                placement="bottom"
              >
                <Button
                  appearance="secondary"
                  size="small"
                  icon={<PanelLeft size={16} />}
                  aria-label={t("app.showSidebar")}
                  style={{ width: "34px", height: "34px", borderRadius: "8px" }}
                  onClick={() => setSidebarCollapsed(false)}
                />
              </Tooltip>
            </div>
          )}
          {update && !updateDismissed && (
            <MessageBar style={{ marginBottom: "16px" }}>
              <MessageBarBody>
                {installingUpdate
                  ? t("app.updateInstalling", { version: update.version })
                  : t("app.updateAvailable", { version: update.version })}
              </MessageBarBody>
              <MessageBarActions
                containerAction={
                  <Button
                    appearance="transparent"
                    size="small"
                    onClick={() => setUpdateDismissed(true)}
                  >
                    {t("app.later")}
                  </Button>
                }
              >
                <Button
                  size="small"
                  appearance="primary"
                  disabled={installingUpdate}
                  onClick={() => void installUpdate()}
                >
                  {t("app.installRestart")}
                </Button>
              </MessageBarActions>
            </MessageBar>
          )}
          {error && (
            <MessageBar style={{ marginBottom: "16px" }}>
              <MessageBarBody>{error}</MessageBarBody>
              <MessageBarActions
                containerAction={
                  <Button
                    appearance="transparent"
                    size="small"
                    onClick={clearError}
                  >
                    {t("common.dismiss")}
                  </Button>
                }
              >
                <Button
                  size="small"
                  onClick={() => {
                    clearError();
                    refreshAll();
                  }}
                >
                  {t("common.reload")}
                </Button>
              </MessageBarActions>
            </MessageBar>
          )}

          {!initialized ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
              }}
            >
              <Spinner label={t("common.loading")} />
            </div>
          ) : (
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/today" element={<TodayPage />} />
              <Route path="/all" element={<ListsPage mode="all" />} />
              <Route
                path="/favorites"
                element={<ListsPage mode="favorites" />}
              />
              <Route path="/list/:id" element={<ListDetailPage />} />
              <Route path="/trash" element={<TrashPage />} />
              <Route path="/shortcuts" element={<ShortcutsPage />} />
              <Route path="/docs" element={<DocsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          )}
        </main>
      </div>
      {isFullscreen && listsCount > 0 && (
        <div className="listy-fab-wrap">
          <Tooltip
            content={
              <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                <span>{t("app.quickAdd")}</span>
                <Keycaps keys={["Ctrl", "Shift", "Space"]} size="small" />
              </span>
            }
            placement="top"
          >
            <button
              type="button"
              className="listy-fab"
              aria-label={t("app.quickAdd")}
              onClick={() => setQuickAddOpen(true)}
            >
              <Plus size={22} />
            </button>
          </Tooltip>
        </div>
      )}
      <QuickAddDialog
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
      />
      <Toast />
    </>
  );
}

export function App() {
  const themePref = useListyStore((s) => s.appState.settings.theme);
  const theme = useResolvedTheme(themePref);

  return (
    <ThemeProvider theme={theme}>
      <HashRouter>
        <AppShell />
      </HashRouter>
    </ThemeProvider>
  );
}

export default App;
