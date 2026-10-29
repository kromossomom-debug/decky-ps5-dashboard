import { classMap, createModuleMapping } from "@decky/ui";

/**
 * Steam's CSS class names are hashed and change between client updates, so each module
 * is found at runtime by a few of its (stable) key names instead of hard-coding hashes.
 */
const MODULE_KEYS = {
  ui: ["BasicUiRoot", "MainNavMenuAnchor"],
  home: ["RecentSection", "BackstackRootTest"],
  recent: ["RecentGamesContainer", "RecentGamesInnerContainer", "RecentGamesBackground"],
  carousel: ["BasicGameCarousel", "BasicGameCarouselItem", "CarouselGameLabel"],
  portrait: ["LibraryItemBox", "PortraitImage", "InRecentGames"],
  asset: ["LandscapeImage", "PortraitImage", "GreyBackground"],
  header: ["DashboardBar", "HeaderItem", "CurrentUserAvatar", "Clock"],
  // Steam ships three copies of the main menu module (one has no "Menu" key), so match on what all share.
  mainMenu: ["ItemOuter", "Item", "ActiveDot", "RunningAppIcon"],
  tabs: ["GamepadTabbedPage", "TabRowTabs", "TabTitle"],
  focusRing: ["FocusRing", "FocusRingOnHiddenItem", "growOutline"],
  whatsNew: ["LibraryHomeWhatsNew", "Empty"],
  friends: ["LibraryHomeFriends", "FavoritesCarousel"],
  playNext: ["PlayNextCarousel", "PlayNextCarouselTitle"],
  qam: ["QuickAccessMenu", "Tabs", "TabGroupPanel"],
  dialog: ["GamepadDialogContent", "ToggleRail", "ToggleSwitch"],
  slider: ["SliderTrack", "SliderHandle", "SliderControl"],
  appAction: ["PlayButton", "PlayButtonContainer", "ShutdownAppButton"],
  // Gamepad context menus: the Power menu, a game's "…" menu and so on.
  contextMenu: ["contextMenuItem", "Destructive", "Positive", "Emphasis", "Focused"],
  contextMenuPanel: ["BasicContextMenuModal", "BasicContextMenuContainer", "BasicContextMenuHeader"],
  // Bottom bar: the controller button hints footer (A, B, X, Y glyphs).
  footer: ["BasicFooter", "FooterLegend"],
  actionLegend: ["ActionButtonLegend", "ActionButtonGlyph", "ActionButtonLabel", "FooterGlyphSize"],
} as const;

export type ModuleName = keyof typeof MODULE_KEYS;

/** A selector that matches nothing, used when a class can't be resolved so the rule is inert. */
const MISSING = ".psd-missing-class";

export type Selectors = Record<ModuleName, Record<string, string>>;

export interface ResolvedClasses {
  sel: Selectors;
  missing: ModuleName[];
}

type ClassModule = Record<string, string>;

const isClassModule = (m: any) =>
  typeof m == "object" &&
  m !== null &&
  !m.__esModule &&
  Object.keys(m).length > 0 &&
  Object.values(m).every((v) => typeof v == "string");

/**
 * decky's classMap is taken once when it loads; later passes rescan webpack so modules from
 * chunks Steam loaded since (Quick Access, context menus...) are found too.
 */
function allClassModules(rescan: boolean): ClassModule[] {
  if (!rescan) return classMap as ClassModule[];
  try {
    return [...createModuleMapping(isClassModule).values()];
  } catch {
    return classMap as ClassModule[];
  }
}

export function resolveClasses(rescan = false): ResolvedClasses {
  const modules = allClassModules(rescan);
  const sel = {} as Selectors;
  const missing: ModuleName[] = [];
  for (const [name, keys] of Object.entries(MODULE_KEYS) as [ModuleName, readonly string[]][]) {
    // Every copy of the module, not just the first: Steam bundles the same component more than once
    // and Game Mode doesn't always use the copy that comes first.
    const found = modules.filter((m) => keys.every((k) => typeof m?.[k] === "string"));
    if (found.length === 0) missing.push(name);
    // `sel.mainMenu.Item` -> ".hash" or ":is(.hashA, .hashB)", or an inert selector if no copy has the key.
    sel[name] = new Proxy({} as Record<string, string>, {
      get: (_t, key: string) => {
        const hashes = [...new Set(found.map((m) => m[key]).filter((v) => typeof v === "string"))];
        if (hashes.length === 0) return MISSING;
        const classes = hashes.map((h) => `.${CSS.escape(h)}`);
        return classes.length === 1 ? classes[0] : `:is(${classes.join(", ")})`;
      },
    });
  }
  return { sel, missing };
}
