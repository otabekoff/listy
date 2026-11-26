/**
 * Minimal i18n for Listy.
 *
 * Messages live in `./locales/<namespace>.ts`, each exporting `{ en, uz, ru }` maps; a key
 * `name` in `locales/settings.ts` is used as `t("settings.name")`. English is the source
 * and the fallback for anything missing.
 *
 * Interpolation: `{name}` is replaced by `vars.name`. Plurals: when `vars.count` is a
 * number and the key has variants (`key_one`, `key_few`, `key_many`, `key_other`), the
 * variant for the language's plural rule is used.
 */

export type Lang = "en" | "uz" | "ru";
export type LangPref = "auto" | Lang;
export type Vars = Record<string, string | number>;
export type Translate = (key: string, vars?: Vars) => string;

type Dict = Record<string, string>;
export interface Namespace {
  en: Dict;
  uz: Partial<Dict>;
  ru: Partial<Dict>;
}

export const LANGUAGES: { id: Lang; label: string }[] = [
  { id: "en", label: "English" },
  { id: "uz", label: "O‘zbekcha" },
  { id: "ru", label: "Русский" },
];

const INTL_LOCALE: Record<Lang, string> = { en: "en-US", uz: "uz-Latn-UZ", ru: "ru-RU" };

const modules = import.meta.glob<{ default: Namespace }>("./locales/*.ts", { eager: true });

const dictionaries: Record<Lang, Map<string, string>> = {
  en: new Map(),
  uz: new Map(),
  ru: new Map(),
};

for (const [path, mod] of Object.entries(modules)) {
  const ns = path.replace(/^.*\/(.+)\.ts$/, "$1");
  for (const lang of ["en", "uz", "ru"] as Lang[]) {
    for (const [key, value] of Object.entries(mod.default[lang] ?? {})) {
      if (value !== undefined) dictionaries[lang].set(`${ns}.${key}`, value);
    }
  }
}

export function resolveLang(pref: LangPref | undefined): Lang {
  if (pref === "en" || pref === "uz" || pref === "ru") return pref;
  const nav = typeof navigator !== "undefined" ? navigator.language.toLowerCase() : "en";
  if (nav.startsWith("uz")) return "uz";
  if (nav.startsWith("ru")) return "ru";
  return "en";
}

const pluralRules = new Map<Lang, Intl.PluralRules>();
function pluralCategory(lang: Lang, count: number): string {
  let rules = pluralRules.get(lang);
  if (!rules) {
    rules = new Intl.PluralRules(INTL_LOCALE[lang]);
    pluralRules.set(lang, rules);
  }
  return rules.select(count);
}

function lookup(lang: Lang, key: string): string | undefined {
  return dictionaries[lang].get(key) ?? dictionaries.en.get(key);
}

export function translate(lang: Lang, key: string, vars?: Vars): string {
  let message: string | undefined;
  const count = vars?.count;
  if (typeof count === "number") {
    message =
      dictionaries[lang].get(`${key}_${pluralCategory(lang, count)}`) ??
      dictionaries[lang].get(`${key}_other`) ??
      dictionaries.en.get(`${key}_${pluralCategory("en", count)}`) ??
      dictionaries.en.get(`${key}_other`);
  }
  message ??= lookup(lang, key);
  if (message === undefined) {
    if (import.meta.env?.DEV) console.warn(`[i18n] missing key: ${key}`);
    return key;
  }
  if (!vars) return message;
  return message.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match
  );
}

// The active language, for code outside React components (store messages, helpers).
let current: Lang = "en";

export function setLanguage(lang: Lang): void {
  current = lang;
  if (typeof document !== "undefined") document.documentElement.lang = lang;
}

export function getLanguage(): Lang {
  return current;
}

/** BCP 47 tag of the active language, for `Intl` / `toLocaleDateString`. */
export function intlLocale(lang: Lang = current): string {
  return INTL_LOCALE[lang];
}

/** Translate with the active language. Prefer `useT()` inside components. */
export const t: Translate = (key, vars) => translate(current, key, vars);
