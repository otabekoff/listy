import React, { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Copy, Minus, Square, X } from "lucide-react";
import { storageApi } from "../services/storageApi";
import { useT } from "../i18n/useT";
import { ListyLogo } from "./ListyLogo";

export const TitleBar: React.FC = () => {
  const t = useT();
  const [isMaximized, setIsMaximized] = useState(false);
  const inTauri = storageApi.isTauri();

  useEffect(() => {
    if (!inTauri) return;
    const win = getCurrentWindow();
    win.isMaximized().then(setIsMaximized).catch(() => {});
    const unlisten = win.onResized(() => {
      win.isMaximized().then(setIsMaximized).catch(() => {});
    });
    return () => {
      unlisten.then((fn) => fn()).catch(() => {});
    };
  }, [inTauri]);

  const handleMinimize = () => {
    if (inTauri) getCurrentWindow().minimize();
  };

  const handleToggleMaximize = async () => {
    if (!inTauri) return;
    const win = getCurrentWindow();
    const max = await win.isMaximized();
    if (max) {
      await win.unmaximize();
      setIsMaximized(false);
    } else {
      await win.maximize();
      setIsMaximized(true);
    }
  };

  const handleClose = () => {
    if (inTauri) getCurrentWindow().close();
  };

  return (
    <header
      className="listy-titlebar"
      data-tauri-drag-region
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) return;
        handleToggleMaximize();
      }}
    >
      <div className="listy-titlebar-left" data-tauri-drag-region>
        <ListyLogo size={20} />
        <span className="listy-titlebar-title" data-tauri-drag-region>
          Listy
        </span>
      </div>

      <div className="listy-titlebar-controls">
        <button
          type="button"
          className="listy-win-btn"
          aria-label={t("titlebar.minimize")}
          onClick={handleMinimize}
        >
          <Minus size={14} />
        </button>

        <button
          id="snap-btn"
          type="button"
          className="listy-win-btn"
          aria-label={isMaximized ? t("titlebar.restore") : t("titlebar.maximize")}
          onClick={handleToggleMaximize}
        >
          {isMaximized ? <Copy size={12} /> : <Square size={12} />}
        </button>

        <button
          type="button"
          className="listy-win-btn listy-win-close"
          aria-label={t("titlebar.close")}
          onClick={handleClose}
        >
          <X size={15} />
        </button>
      </div>
    </header>
  );
};
