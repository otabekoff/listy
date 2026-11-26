import { useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { t } from "../i18n";
import { collectDue, markReminded, shouldRemind } from "../services/due";
import { storageApi } from "../services/storageApi";
import { useUpdater } from "../services/updater";
import { useListyStore } from "../store/useListyStore";

const inTauri = () => storageApi.isTauri();

/** Label of the window this page runs in ("main", "widget", "quickadd"). */
export function windowLabel(): string {
  return inTauri() ? getCurrentWindow().label : "main";
}

/**
 * Reload from disk when the data may have changed: the window regains focus, another
 * window saved, or the file watcher saw a change (listy-cli, listy-mcp, a sync client).
 * Bursts are coalesced into one reload.
 */
export function useStorageSync(): void {
  const refreshAll = useListyStore((s) => s.refreshAll);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void refreshAll(), 120);
    };
    window.addEventListener("focus", schedule);
    const stopSync = storageApi.onExternalChange(schedule);
    const stopWatch = storageApi.onStorageChanged(schedule);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", schedule);
      stopSync();
      stopWatch();
    };
  }, [refreshAll]);
}

/** Desktop behaviour that belongs to the main window only. */
export function useMainWindowIntegration(): void {
  const initialized = useListyStore((s) => s.initialized);
  const settings = useListyStore((s) => s.appState.settings);
  const lists = useListyStore((s) => s.lists);
  const showToast = useListyStore((s) => s.showToast);
  const isMain = windowLabel() === "main";

  // Closing the window hides it to the tray (the tray menu has Quit).
  const closeToTray = useRef(settings.closeToTray);
  closeToTray.current = settings.closeToTray;
  useEffect(() => {
    if (!inTauri() || !isMain) return;
    const unlisten = getCurrentWindow().onCloseRequested((event) => {
      if (closeToTray.current) {
        event.preventDefault();
        void storageApi.hideMainWindow();
      }
    });
    return () => {
      unlisten.then((fn) => fn()).catch(() => {});
    };
  }, [isMain]);

  // System-wide Quick Add shortcut follows the setting.
  useEffect(() => {
    if (!inTauri() || !isMain || !initialized) return;
    storageApi.setGlobalQuickAdd(settings.globalQuickAdd).catch((err) => {
      showToast(err instanceof Error ? err.message : String(err));
    });
  }, [isMain, initialized, settings.globalQuickAdd, showToast]);

  // Daily reminder about items due today or overdue, once per day from 9:00.
  const listsRef = useRef(lists);
  listsRef.current = lists;
  useEffect(() => {
    if (!inTauri() || !isMain || !initialized || !settings.dueReminders) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled || !shouldRemind()) return;
      const { overdue, today } = collectDue(listsRef.current, new Date(), 0);
      if (overdue.length + today.length === 0) return;
      try {
        const notif = await import("@tauri-apps/plugin-notification");
        let granted = await notif.isPermissionGranted();
        if (!granted) granted = (await notif.requestPermission()) === "granted";
        if (!granted || cancelled) return;
        const names = [...overdue, ...today].slice(0, 3).map((e) => e.item.title);
        notif.sendNotification({
          title: t("reminders.title", { count: overdue.length + today.length }),
          body: [
            overdue.length > 0 ? t("reminders.overdue", { count: overdue.length }) : "",
            today.length > 0 ? t("reminders.today", { count: today.length }) : "",
            names.join(", "),
          ]
            .filter(Boolean)
            .join(" · "),
        });
        markReminded();
      } catch {
        // Notifications unavailable: nothing else to do.
      }
    };
    const timer = setInterval(() => void tick(), 60_000);
    void tick();
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isMain, initialized, settings.dueReminders]);

  // Look for a new version shortly after start; failures stay silent here.
  useEffect(() => {
    if (!inTauri() || !isMain || import.meta.env.DEV) return;
    const timer = setTimeout(() => {
      useUpdater
        .getState()
        .check()
        .catch(() => undefined);
    }, 15_000);
    return () => clearTimeout(timer);
  }, [isMain]);
}
