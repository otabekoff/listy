import React, { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { X } from "lucide-react";
import { Keycaps, Spinner, Text } from "../ui";
import { ListyLogo } from "../components/ListyLogo";
import { QuickAddForm } from "../components/QuickAddForm";
import { useT } from "../i18n/useT";
import { storageApi } from "../services/storageApi";
import { useListyStore } from "../store/useListyStore";

/**
 * The small always-on-top window opened by the global Quick Add shortcut (Ctrl+Alt+Space)
 * or the tray menu. It hides itself after adding, on Esc, or when it loses focus.
 */
export const QuickAddPage: React.FC = () => {
  const t = useT();
  const initialized = useListyStore((s) => s.initialized);
  const listsCount = useListyStore((s) => s.lists.length);
  const [openCount, setOpenCount] = useState(0);

  const hide = () => void storageApi.hideCurrentWindow();

  useEffect(() => {
    if (!storageApi.isTauri()) return;
    const stopOpened = listen("listy://quick-add-opened", () => {
      setOpenCount((n) => n + 1);
    });
    // Like a launcher: clicking elsewhere puts it away.
    const stopFocus = getCurrentWindow().onFocusChanged(({ payload: focused }) => {
      if (!focused) hide();
    });
    return () => {
      stopOpened.then((fn) => fn()).catch(() => {});
      stopFocus.then((fn) => fn()).catch(() => {});
    };
  }, []);

  return (
    <div className="listy-quick-add-window">
      <header className="listy-quick-add-header" data-tauri-drag-region>
        <span
          style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
          data-tauri-drag-region
        >
          <ListyLogo size={18} />
          <span style={{ fontWeight: 600, fontSize: "14px" }} data-tauri-drag-region>
            {t("quickAdd.title")}
          </span>
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
          <Keycaps keys={["Ctrl", "Alt", "Space"]} size="small" />
          <button
            type="button"
            className="listy-win-btn"
            aria-label={t("common.close")}
            onClick={hide}
            style={{ width: "32px", height: "28px" }}
          >
            <X size={14} />
          </button>
        </span>
      </header>
      <div style={{ padding: "16px" }}>
        {!initialized ? (
          <Spinner label={t("common.loading")} />
        ) : listsCount === 0 ? (
          <Text>{t("quickAdd.noListsYet")}</Text>
        ) : (
          <QuickAddForm
            key={openCount}
            resetKey={openCount}
            onDone={hide}
            onCancel={hide}
          />
        )}
      </div>
    </div>
  );
};
