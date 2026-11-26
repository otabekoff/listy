import { useMemo } from "react";
import { useListyStore } from "../store/useListyStore";
import { Translate, intlLocale, resolveLang, setLanguage, translate } from "./index";

/** The translator for the language chosen in Settings; re-renders when it changes. */
export function useT(): Translate {
  const pref = useListyStore((s) => s.appState.settings.language);
  const lang = resolveLang(pref);
  // Keep the module-level language (used by helpers such as describeDueDate) in step.
  setLanguage(lang);
  return useMemo<Translate>(() => (key, vars) => translate(lang, key, vars), [lang]);
}

/** The `Intl` locale tag for the chosen language. */
export function useLocale(): string {
  const pref = useListyStore((s) => s.appState.settings.language);
  return intlLocale(resolveLang(pref));
}
