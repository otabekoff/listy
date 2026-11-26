import React from "react";
import { Keyboard } from "lucide-react";
import { Keycaps, SettingsCard, SettingsSection, Text, Title2 } from "../ui";
import { useT } from "../i18n/useT";

interface ShortcutItem {
  /** Key prefix in the `shortcuts` namespace: `<id>.title` and `<id>.desc`. */
  id: string;
  keys: string[];
}

const GENERAL_SHORTCUTS: ShortcutItem[] = [
  { id: "quickAdd", keys: ["Ctrl", "Shift", "Space"] },
  { id: "globalQuickAdd", keys: ["Ctrl", "Alt", "Space"] },
  { id: "undo", keys: ["Ctrl", "Z"] },
  { id: "search", keys: ["Ctrl", "K"] },
  { id: "settings", keys: ["Ctrl", ","] },
  { id: "back", keys: ["Alt", "Left"] },
  { id: "sidebar", keys: ["Ctrl", "B"] },
  { id: "fullscreen", keys: ["F11"] },
  { id: "close", keys: ["Esc"] },
];

const NAVIGATION_SHORTCUTS: ShortcutItem[] = [
  { id: "goHome", keys: ["Ctrl", "1"] },
  { id: "goToday", keys: ["Ctrl", "T"] },
  { id: "goAll", keys: ["Ctrl", "2"] },
  { id: "goFavorites", keys: ["Ctrl", "3"] },
  { id: "goTrash", keys: ["Ctrl", "4"] },
  { id: "goShortcuts", keys: ["Ctrl", "5"] },
];

export const ShortcutsPage: React.FC = () => {
  const t = useT();

  const renderCard = (s: ShortcutItem) => (
    <SettingsCard
      key={s.id}
      icon={<Keyboard size={18} />}
      title={t(`shortcuts.${s.id}.title`)}
      description={t(`shortcuts.${s.id}.desc`)}
      action={<Keycaps keys={s.keys} />}
    />
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      <div>
        <Title2>{t("nav.shortcuts")}</Title2>
        <Text size={300} style={{ color: "var(--win-fg-3)" }}>
          {t("shortcuts.subtitle")}
        </Text>
      </div>

      <SettingsSection title={t("shortcuts.actions")}>
        {GENERAL_SHORTCUTS.map(renderCard)}
      </SettingsSection>

      <SettingsSection title={t("shortcuts.navigation")}>
        {NAVIGATION_SHORTCUTS.map(renderCard)}
      </SettingsSection>
    </div>
  );
};
