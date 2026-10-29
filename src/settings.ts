import { t } from "./i18n";

export type BackgroundMode = "art" | "gradient" | "dark";
export type FocusStyle = "white" | "accent";

export interface Settings {
  enabled: boolean;
  /** Replace Steam's home with the plugin's PS5-style home screen. */
  ps5Home: boolean;
  /** Repaint Steam's own blues and blue-greys with the PS5 palette, everywhere. */
  palette: boolean;
  accent: string;
  background: BackgroundMode;
  /** Free space above the Recent row, in vh, so the game art shows like the PS5 hero area. */
  heroSpace: number;
  /** Tile corner radius, in px. */
  radius: number;
  focus: FocusStyle;
  /** Restyle the Steam menu and Quick Access menu like the PS5 Control Center. */
  controlCenter: boolean;
  /** Hide the shelves below Recent (What's New, Friends, Recommended). */
  hideShelves: boolean;
  /** Hide the bottom button hint footer bar (A, B, X, Y). */
  hideBottomBar: boolean;
  /** Use an SST (PlayStation) style font. */
  font: boolean;
  /** Cards under the Play button: HowLongToBeat, achievements, playtime, reviews. */
  infoCards: boolean;
  /** Look up HowLongToBeat times (one request per game, cached for a week). */
  hltb: boolean;
  /** Restyle Steam's own library (capsules, focus, tabs). Off leaves it to Steam or plugins like TabMaster. */
  steamLibrary: boolean;
  /** The Game Library tile and shortcuts open Steam's own library (with TabMaster's tabs) instead of the PS5 one. */
  openSteamLibrary: boolean;
}

/** PlayStation blues plus the DualSense / console cover colors. */
export const ACCENTS: { id: string; label: string; color: string }[] = [
  { id: "ps", label: t.accentPs, color: "#0070D1" },
  { id: "light", label: t.accentLight, color: "#1F9BFF" },
  { id: "starlight", label: t.accentStarlight, color: "#6CACE4" },
  { id: "cobalt", label: t.accentCobalt, color: "#2F5BD3" },
  { id: "cosmic", label: t.accentCosmic, color: "#C8102E" },
  { id: "nova", label: t.accentNova, color: "#E58FB5" },
  { id: "purple", label: t.accentPurple, color: "#7B4BC4" },
  { id: "volcanic", label: t.accentVolcanic, color: "#E2532A" },
  { id: "white", label: t.accentWhite, color: "#E6E6E6" },
];

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  ps5Home: true,
  palette: true,
  accent: "ps",
  background: "art",
  heroSpace: 18,
  radius: 12,
  focus: "white",
  controlCenter: true,
  hideShelves: false,
  hideBottomBar: false,
  font: true,
  infoCards: true,
  hltb: true,
  steamLibrary: true,
  openSteamLibrary: false,
};

export function accentColor(id: string): string {
  return (ACCENTS.find((a) => a.id === id) ?? ACCENTS[0]).color;
}

/** Fill in any keys missing from stored settings (e.g. after an update adds a new option). */
export function withDefaults(stored: Partial<Settings> | null | undefined): Settings {
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
}

let current: Settings = DEFAULT_SETTINGS;
/** The settings in effect, for screens that read them while rendering (set by the plugin's entry point). */
export const currentSettings = () => current;
export function setCurrentSettings(next: Settings) {
  current = next;
}
