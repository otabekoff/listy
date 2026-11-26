import { create } from "zustand";
import { storageApi } from "./storageApi";

type UpdateHandle = Awaited<ReturnType<typeof import("@tauri-apps/plugin-updater").check>>;

interface UpdaterState {
  /** The update found by the last check, if any. */
  available: NonNullable<UpdateHandle> | null;
  checking: boolean;
  installing: boolean;
  /** Download progress 0..1 while installing, when the size is known. */
  progress: number | null;
  error: string | null;
  /** Check for a newer release. Resolves to its version, or null when up to date. */
  check: () => Promise<string | null>;
  /** Download and install the available update, then restart Listy. */
  install: () => Promise<void>;
}

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

export const useUpdater = create<UpdaterState>((set, get) => ({
  available: null,
  checking: false,
  installing: false,
  progress: null,
  error: null,

  check: async () => {
    if (!storageApi.isTauri() || get().checking) return null;
    set({ checking: true, error: null });
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      set({ available: update ?? null, checking: false });
      return update?.version ?? null;
    } catch (err) {
      set({ checking: false, error: message(err) });
      throw err;
    }
  },

  install: async () => {
    const update = get().available;
    if (!update || get().installing) return;
    set({ installing: true, progress: null, error: null });
    try {
      let total = 0;
      let done = 0;
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") total = event.data.contentLength ?? 0;
        if (event.event === "Progress") {
          done += event.data.chunkLength;
          if (total > 0) set({ progress: Math.min(1, done / total) });
        }
      });
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch (err) {
      set({ installing: false, error: message(err) });
    }
  },
}));
