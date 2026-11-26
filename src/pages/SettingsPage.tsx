import React, { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  AppWindow,
  ArrowUpDown,
  Bell,
  Download,
  ExternalLink,
  Folder,
  FolderOpen,
  Globe,
  Heart,
  Info,
  Keyboard,
  Languages,
  LayoutGrid,
  LogIn,
  Palette,
  PanelBottomClose,
  RefreshCw,
  Scale,
  Upload,
  User,
} from "lucide-react";
import { LANGUAGES } from "../i18n";
import { useT } from "../i18n/useT";
import { storageApi } from "../services/storageApi";
import { useUpdater } from "../services/updater";
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Dropdown,
  Input,
  Keycaps,
  Option,
  SettingsCard,
  SettingsSection,
  Switch,
  Text,
  Title2,
} from "../ui";
import { useListyStore } from "../store/useListyStore";
import { AppSettings } from "../types/listy";

const LICENSE_TEXT = `MIT License

Copyright (c) 2026 Otabek Sadiridinov (MohirLab.uz)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`;

const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err));

export const SettingsPage: React.FC = () => {
  const t = useT();
  const storagePath = useListyStore((s) => s.storagePath);
  const settings = useListyStore((s) => s.appState.settings);
  const selectStorageFolder = useListyStore((s) => s.selectStorageFolder);
  const openStorageFolder = useListyStore((s) => s.openStorageFolder);
  const updateSettings = useListyStore((s) => s.updateSettings);
  const importList = useListyStore((s) => s.importList);
  const exportBackup = useListyStore((s) => s.exportBackup);
  const importBackup = useListyStore((s) => s.importBackup);
  const reportError = useListyStore((s) => s.reportError);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [restoreNotice, setRestoreNotice] = useState<string | null>(null);
  const [licenseOpen, setLicenseOpen] = useState(false);
  const [version, setVersion] = useState("0.1.0");
  const [autostart, setAutostart] = useState(false);
  const [updateNotice, setUpdateNotice] = useState<string | null>(null);
  const update = useUpdater((s) => s.available);
  const checking = useUpdater((s) => s.checking);
  const installing = useUpdater((s) => s.installing);
  const checkUpdate = useUpdater((s) => s.check);
  const installUpdate = useUpdater((s) => s.install);
  const inTauri = storageApi.isTauri();

  useEffect(() => {
    if (!inTauri) return;
    getVersion().then(setVersion).catch(() => undefined);
    storageApi.isAutostartEnabled().then(setAutostart).catch(() => undefined);
  }, [inTauri]);

  const openExternal = (url: string) => {
    if (inTauri) {
      openUrl(url);
    } else {
      window.open(url, "_blank", "noreferrer");
    }
  };

  const themeLabel = (theme: AppSettings["theme"]) => t(`settings.theme.${theme}`);
  const sortLabel = (sortBy: AppSettings["sortBy"]) => t(`settings.sort.${sortBy}`);
  const languageLabel = (lang: AppSettings["language"]) =>
    lang === "auto" ? t("settings.languageAuto") : LANGUAGES.find((l) => l.id === lang)?.label;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        maxWidth: "840px",
        width: "100%",
        margin: "0 auto",
      }}
    >
      <Title2>{t("settings.title")}</Title2>

      <SettingsSection title={t("settings.storage")}>
        <SettingsCard
          icon={<Folder size={18} />}
          title={t("settings.storageLocation")}
          description={t("settings.storageLocationDesc")}
          action={
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <Input
                value={storagePath}
                readOnly
                style={{ width: "clamp(160px, 24vw, 260px)" }}
              />
              <Button appearance="primary" onClick={() => selectStorageFolder()}>
                {t("settings.change")}
              </Button>
              <Button
                appearance="secondary"
                icon={<FolderOpen size={15} />}
                onClick={() => openStorageFolder()}
                aria-label={t("settings.openFolder")}
                title={t("settings.openFolder")}
              />
            </div>
          }
        />
      </SettingsSection>

      <SettingsSection title={t("settings.personalization")}>
        <SettingsCard
          icon={<Languages size={18} />}
          title={t("settings.language")}
          description={t("settings.languageDesc")}
          action={
            <Dropdown
              style={{ minWidth: "170px" }}
              value={languageLabel(settings.language) ?? ""}
              selectedOptions={[settings.language]}
              onOptionSelect={(_, d) =>
                updateSettings({
                  language: (d.optionValue as AppSettings["language"]) ?? "auto",
                })
              }
            >
              <Option value="auto">{t("settings.languageAuto")}</Option>
              {LANGUAGES.map((l) => (
                <Option key={l.id} value={l.id}>
                  {l.label}
                </Option>
              ))}
            </Dropdown>
          }
        />

        <SettingsCard
          icon={<Palette size={18} />}
          title={t("settings.colorMode")}
          description={t("settings.colorModeDesc")}
          action={
            <Dropdown
              style={{ minWidth: "150px" }}
              value={themeLabel(settings.theme)}
              selectedOptions={[settings.theme]}
              onOptionSelect={(_, d) =>
                updateSettings({
                  theme: (d.optionValue as AppSettings["theme"]) ?? "system",
                })
              }
            >
              {(["system", "light", "dark"] as const).map((th) => (
                <Option key={th} value={th}>
                  {themeLabel(th)}
                </Option>
              ))}
            </Dropdown>
          }
        />

        <SettingsCard
          icon={<LayoutGrid size={18} />}
          title={t("settings.defaultView")}
          description={t("settings.defaultViewDesc")}
          action={
            <Dropdown
              style={{ minWidth: "150px" }}
              value={t(`settings.view.${settings.defaultView}`)}
              selectedOptions={[settings.defaultView]}
              onOptionSelect={(_, d) =>
                updateSettings({
                  defaultView: (d.optionValue as AppSettings["defaultView"]) ?? "grid",
                })
              }
            >
              <Option value="grid">{t("settings.view.grid")}</Option>
              <Option value="list">{t("settings.view.list")}</Option>
            </Dropdown>
          }
        />

        <SettingsCard
          icon={<ArrowUpDown size={18} />}
          title={t("settings.defaultSort")}
          description={t("settings.defaultSortDesc")}
          action={
            <Dropdown
              style={{ minWidth: "150px" }}
              value={sortLabel(settings.sortBy)}
              selectedOptions={[settings.sortBy]}
              onOptionSelect={(_, d) =>
                updateSettings({
                  sortBy: (d.optionValue as AppSettings["sortBy"]) ?? "updatedAt",
                })
              }
            >
              {(["updatedAt", "createdAt", "name", "itemCount"] as const).map((sb) => (
                <Option key={sb} value={sb}>
                  {sortLabel(sb)}
                </Option>
              ))}
            </Dropdown>
          }
        />
      </SettingsSection>

      <SettingsSection title={t("settings.desktop")}>
        <SettingsCard
          icon={<PanelBottomClose size={18} />}
          title={t("settings.closeToTray")}
          description={t("settings.closeToTrayDesc")}
          action={
            <Switch
              checked={settings.closeToTray}
              onChange={(_, d) => updateSettings({ closeToTray: d.checked })}
            />
          }
        />

        {inTauri && (
          <SettingsCard
            icon={<LogIn size={18} />}
            title={t("settings.autostart")}
            description={t("settings.autostartDesc")}
            action={
              <Switch
                checked={autostart}
                onChange={async (_, d) => {
                  try {
                    await storageApi.setAutostart(d.checked);
                    setAutostart(d.checked);
                  } catch (err) {
                    reportError(err);
                  }
                }}
              />
            }
          />
        )}

        <SettingsCard
          icon={<Keyboard size={18} />}
          title={t("settings.globalQuickAdd")}
          description={
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              {t("settings.globalQuickAddDesc")}
              <Keycaps keys={["Ctrl", "Alt", "Space"]} size="small" />
            </span>
          }
          action={
            <Switch
              checked={settings.globalQuickAdd}
              onChange={(_, d) => updateSettings({ globalQuickAdd: d.checked })}
            />
          }
        />

        <SettingsCard
          icon={<Bell size={18} />}
          title={t("settings.dueReminders")}
          description={t("settings.dueRemindersDesc")}
          action={
            <Switch
              checked={settings.dueReminders}
              onChange={(_, d) => updateSettings({ dueReminders: d.checked })}
            />
          }
        />

        <SettingsCard
          icon={<AppWindow size={18} />}
          title={t("settings.widget")}
          description={t("settings.widgetDesc")}
          action={
            <Button appearance="secondary" onClick={() => storageApi.toggleDesktopWidget()}>
              {t("settings.toggleWidget")}
            </Button>
          }
        />
      </SettingsSection>

      <SettingsSection title={t("settings.backup")}>
        <SettingsCard
          icon={<Download size={18} />}
          title={t("settings.exportBackup")}
          description={exportNotice ?? t("settings.exportBackupDesc")}
          action={
            <Button
              appearance="primary"
              onClick={async () => {
                const ok = await exportBackup();
                if (ok) setExportNotice(t("settings.exportDone"));
              }}
            >
              {t("settings.export")}
            </Button>
          }
        />
        <SettingsCard
          icon={<Upload size={18} />}
          title={t("settings.restore")}
          description={restoreNotice ?? t("settings.restoreDesc")}
          action={
            <div style={{ display: "flex", gap: "8px" }}>
              <Button
                appearance="secondary"
                onClick={async () => {
                  const report = await importBackup();
                  if (report) {
                    setRestoreNotice(
                      [
                        t("settings.restoredLists", { count: report.lists }),
                        report.trashed > 0
                          ? t("settings.restoredTrashed", { count: report.trashed })
                          : "",
                        report.attachments > 0
                          ? t("settings.restoredFiles", { count: report.attachments })
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    );
                  }
                }}
              >
                {t("settings.restoreBackup")}
              </Button>
              <Button
                appearance="secondary"
                onClick={async () => {
                  const imported = await importList();
                  if (imported) {
                    setRestoreNotice(t("settings.imported", { name: imported.name }));
                  }
                }}
              >
                {t("settings.importList")}
              </Button>
            </div>
          }
        />
      </SettingsSection>

      <SettingsSection title={t("settings.about")}>
        <SettingsCard
          icon={<Info size={18} />}
          title={t("settings.version", { version })}
          description={t("settings.tagline")}
          action={
            <Text size={200} style={{ color: "var(--win-fg-3)" }}>
              {t("settings.localFirst")}
            </Text>
          }
        />
        {inTauri && (
          <SettingsCard
            icon={<RefreshCw size={18} />}
            title={t("settings.updates")}
            description={
              updateNotice ??
              (update
                ? t("settings.updateReady", { version: update.version })
                : t("settings.updatesDesc"))
            }
            action={
              update ? (
                <Button
                  appearance="primary"
                  disabled={installing}
                  onClick={() => void installUpdate()}
                >
                  {installing ? t("settings.installing") : t("settings.installUpdate")}
                </Button>
              ) : (
                <Button
                  appearance="secondary"
                  disabled={checking}
                  onClick={async () => {
                    try {
                      const found = await checkUpdate();
                      setUpdateNotice(
                        found
                          ? t("settings.updateReady", { version: found })
                          : t("settings.upToDate", { version })
                      );
                    } catch (err) {
                      setUpdateNotice(t("settings.updateFailed", { error: errorText(err) }));
                    }
                  }}
                >
                  {checking ? t("settings.checking") : t("settings.checkUpdates")}
                </Button>
              )
            }
          />
        )}
        <SettingsCard
          icon={<User size={18} />}
          title={t("settings.developer", { name: "Otabek Sadiridinov" })}
          description="https://github.com/otabekoff"
          action={
            <Button
              appearance="secondary"
              icon={<ExternalLink size={14} />}
              onClick={() => openExternal("https://github.com/otabekoff")}
            >
              GitHub
            </Button>
          }
        />
        <SettingsCard
          icon={<Globe size={18} />}
          title="MohirLab.uz"
          description={t("settings.builtAt")}
          action={
            <Button
              appearance="secondary"
              icon={<ExternalLink size={14} />}
              onClick={() => openExternal("https://mohirlab.uz")}
            >
              {t("settings.visit")}
            </Button>
          }
        />
        <SettingsCard
          icon={<Heart size={18} color="#EC4899" />}
          title={t("settings.donate")}
          description="https://taps.uz/uzhandy"
          action={
            <Button
              appearance="primary"
              icon={<ExternalLink size={14} />}
              onClick={() => openExternal("https://taps.uz/uzhandy")}
            >
              {t("settings.donateButton")}
            </Button>
          }
        />
        <SettingsCard
          icon={<Scale size={18} />}
          title={t("settings.license")}
          description="Copyright (c) 2026 Otabek Sadiridinov (MohirLab.uz)"
          action={
            <Button appearance="secondary" onClick={() => setLicenseOpen(true)}>
              {t("settings.viewLicense")}
            </Button>
          }
        />
      </SettingsSection>

      <Dialog open={licenseOpen} onOpenChange={(_, d) => !d.open && setLicenseOpen(false)}>
        <DialogSurface style={{ maxWidth: "560px" }}>
          <DialogBody>
            <DialogTitle>MIT License</DialogTitle>
            <DialogContent>
              <pre
                style={{
                  margin: "8px 0 0 0",
                  padding: "12px",
                  borderRadius: "8px",
                  backgroundColor: "var(--win-bg-subtle)",
                  border: "1px solid var(--win-border-1)",
                  fontSize: "12px",
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                  color: "var(--win-fg-2)",
                  fontFamily: "inherit",
                }}
              >
                {LICENSE_TEXT}
              </pre>
            </DialogContent>
            <DialogActions>
              <Button appearance="primary" onClick={() => setLicenseOpen(false)}>
                {t("common.close")}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};
