/**
 * The plugin's text in Steam's own UI language. Each language lives in src/locales and has the exact
 * shape of the English file, so TypeScript flags any missing string. Languages without a translation
 * fall back to English. Steam reloads its whole UI (and this plugin) when the language changes, so
 * it's read once.
 */

import de from "./locales/de";
import en, { Strings } from "./locales/en";
import es from "./locales/es";
import fr from "./locales/fr";
import it from "./locales/it";
import ja from "./locales/ja";
import ko from "./locales/ko";
import pl from "./locales/pl";
import pt from "./locales/pt";
import ru from "./locales/ru";
import tr from "./locales/tr";
import uk from "./locales/uk";
import zhCN from "./locales/zh-CN";
import zhTW from "./locales/zh-TW";

export type { Strings };

const LOCALES: Record<string, Strings> = { en, pt, de, fr, es, it, pl, ru, uk, tr, ja, ko, "zh-CN": zhCN, "zh-TW": zhTW };

/** Steam's API names for its languages (the LANGUAGE value it gives the UI) mapped to our locales. */
const STEAM_LANGUAGES: Record<string, string> = {
  english: "en",
  brazilian: "pt",
  portuguese: "pt",
  german: "de",
  french: "fr",
  spanish: "es",
  latam: "es",
  italian: "it",
  polish: "pl",
  russian: "ru",
  ukrainian: "uk",
  turkish: "tr",
  japanese: "ja",
  koreana: "ko",
  schinese: "zh-CN",
  tchinese: "zh-TW",
};

/** Maps a language name or tag ("brazilian", "pt-BR", "zh-Hant", "es-419"...) to one of our locales. */
function toLocale(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const v = value.trim().toLowerCase().replace("_", "-");
  if (STEAM_LANGUAGES[v]) return STEAM_LANGUAGES[v];
  if (v.startsWith("zh")) return /tw|hk|mo|hant/.test(v) ? "zh-TW" : "zh-CN";
  const base = v.split("-")[0];
  return LOCALES[base] ? base : undefined;
}

/**
 * Steam's UI language as one of our locales. The first source that answers decides: a Steam set to a
 * language we don't translate gets English, never the operating system's language.
 */
function detectLocale(): string {
  const sources: (() => string | null | undefined)[] = [
    // Steam passes its language name ("brazilian", "schinese"...) to its UI page.
    () => new URLSearchParams(window.location.search).get("LANGUAGE"),
    () => (window as any).LocalizationManager?.GetPreferredLocales?.()?.[0],
    // Only when Steam says nothing at all.
    () => navigator.language,
  ];
  for (const get of sources) {
    let value: string | null | undefined;
    try {
      value = get();
    } catch {
      continue;
    }
    if (value) return toLocale(value) ?? "en";
  }
  return "en";
}

export const locale = detectLocale();
export const t: Strings = LOCALES[locale] ?? en;
