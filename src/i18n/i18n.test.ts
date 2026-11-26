import { describe, expect, it } from "vitest";
import { resolveLang, translate } from "./index";

describe("i18n", () => {
  it("translates, interpolates and falls back to English", () => {
    expect(translate("uz", "nav.today")).toBe("Bugun");
    expect(translate("ru", "nav.today")).toBe("Сегодня");
    expect(translate("en", "dialogs.exportList", { name: "Books" })).toBe("Export Books");
    expect(translate("en", "no.such.key")).toBe("no.such.key");
  });

  it("picks plural forms per language", () => {
    expect(translate("en", "common.updatedDaysAgo", { count: 1 })).toBe("Updated 1 day ago");
    expect(translate("en", "common.updatedDaysAgo", { count: 3 })).toBe("Updated 3 days ago");
    expect(translate("ru", "common.updatedDaysAgo", { count: 1 })).toBe("Обновлено 1 день назад");
    expect(translate("ru", "common.updatedDaysAgo", { count: 3 })).toBe("Обновлено 3 дня назад");
    expect(translate("ru", "common.updatedDaysAgo", { count: 5 })).toBe("Обновлено 5 дней назад");
    expect(translate("uz", "common.updatedDaysAgo", { count: 5 })).toBe("5 kun oldin yangilandi");
  });

  it("resolves explicit languages", () => {
    expect(resolveLang("uz")).toBe("uz");
    expect(resolveLang("ru")).toBe("ru");
    expect(["en", "uz", "ru"]).toContain(resolveLang("auto"));
  });

  it("has every English key in Uzbek and Russian too", () => {
    const modules = import.meta.glob<{ default: Record<string, Record<string, string>> }>(
      "./locales/*.ts",
      { eager: true }
    );
    const missing: string[] = [];
    for (const [path, mod] of Object.entries(modules)) {
      const { en, uz, ru } = mod.default;
      for (const key of Object.keys(en)) {
        // Plural variants differ per language; check the base key has some form.
        const base = key.replace(/_(one|few|many|other)$/, "");
        for (const [lang, dict] of [
          ["uz", uz],
          ["ru", ru],
        ] as const) {
          const has = Object.keys(dict).some(
            (k) => k === key || k.replace(/_(one|few|many|other)$/, "") === base
          );
          if (!has) missing.push(`${lang}: ${path} ${key}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
