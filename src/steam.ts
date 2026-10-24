import { Navigation, Router, findModuleByExport, showContextMenu } from "@decky/ui";
import { createElement } from "react";

import { t } from "./i18n";

/** The subset of Steam's SteamAppOverview this plugin reads. */
export interface App {
  appid: number;
  display_name: string;
  app_type: number;
  installed: boolean;
  gameid?: string;
  rt_last_time_played?: number;
  minutes_playtime_forever?: number;
  minutes_playtime_last_two_weeks?: number;
  /** Bytes, as a string. */
  size_on_disk?: string;
  review_percentage_with_bombs?: number;
  metacritic_score?: number;
}

declare const collectionStore: any;
declare const appStore: any;
declare const friendStore: any;
declare const SteamClient: any;

export const APP_TYPE_GAME = 1;
export const APP_TYPE_SOFTWARE = 2;
export const APP_TYPE_SHORTCUT = 1073741824;
const LISTED_TYPES = new Set([APP_TYPE_GAME, APP_TYPE_SOFTWARE, APP_TYPE_SHORTCUT]);

const CDN = "https://shared.steamstatic.com/store_item_assets/steam/apps";
/** Steam's ELaunchSource for a launch started from the library. */
const LAUNCH_SOURCE = 100;

export const LIBRARY_ROUTE = "/ps5-dashboard/library";

/** Game Mode routes, as Steam's own menus open them ("/media" alone renders an empty page). */
export const ROUTES = {
  library: "/library",
  downloads: "/library/downloads",
  media: "/media/grid",
  search: "/search",
  settings: "/settings",
};

export const STORE_URL = "https://store.steampowered.com/";
export const DONATE_URL = "https://buymeacoffee.com/kromossomoc";

/** Opens the author's Buy Me a Coffee page in Steam's browser (closing the Quick Access menu first). */
export function openDonate() {
  Navigation.CloseSideMenus();
  Navigation.NavigateToExternalWeb(DONATE_URL);
}

/** The Store in Game Mode is a Steam web page, not a route of its own. */
export function openStore(path = "") {
  Navigation.NavigateToSteamWeb(STORE_URL + path);
}

function apps(collectionId: string): App[] {
  try {
    return [...(collectionStore.GetCollection(collectionId)?.visibleApps ?? [])];
  } catch {
    return [];
  }
}

export const byRecent = (a: App, b: App) => (b.rt_last_time_played ?? 0) - (a.rt_last_time_played ?? 0);
export const byName = (a: App, b: App) => a.display_name.localeCompare(b.display_name, undefined, { sensitivity: "base" });

export function recentApps(limit: number): App[] {
  let list: App[] = [];
  try {
    list = [...(collectionStore.recentAppsCollection?.visibleApps ?? [])].filter((a: App) => LISTED_TYPES.has(a.app_type));
  } catch {
    // fall through to the library sorted by last played
  }
  if (list.length === 0) list = gameApps().sort(byRecent).filter((a) => a.rt_last_time_played);
  return list.slice(0, limit);
}

export const gameApps = () => apps("type-games");
export const softwareApps = () => apps("type-software");
export const favoriteApps = () => apps("favorite");
export const nonSteamApps = () => gameApps().filter((a) => a.app_type === APP_TYPE_SHORTCUT);
export const installedApps = () => [...gameApps(), ...softwareApps()].filter((a) => a.installed);

/** Collections the user made themselves (system ones like Favorites are listed separately). */
export function userCollections(): { id: string; name: string; apps: () => App[] }[] {
  try {
    return [...(collectionStore.userCollections ?? [])]
      .filter((c: any) => !["favorite", "uncategorized", "hidden"].includes(c.id) && !c.id.startsWith("type-"))
      .map((c: any) => ({ id: c.id, name: c.displayName, apps: () => [...(c.visibleApps ?? [])] }));
  } catch {
    return [];
  }
}

function custom(fn: string, app: App): string[] {
  try {
    const urls = appStore[fn]?.(app);
    return Array.isArray(urls) ? urls : [];
  } catch {
    return [];
  }
}

function steamAsset(app: App, file: string): string[] {
  if (app.app_type === APP_TYPE_SHORTCUT) return [];
  return [`/assets/${app.appid}/${file}`, `${CDN}/${app.appid}/${file}`];
}

export const heroUrls = (app: App) => [...custom("GetCustomHeroImageURLs", app), ...steamAsset(app, "library_hero.jpg")];
export const logoUrls = (app: App) => [...custom("GetCustomLogoImageURLs", app), ...steamAsset(app, "logo.png")];
export const landscapeUrls = (app: App) => [
  ...custom("GetCustomLandcapeImageURLs", app),
  ...steamAsset(app, "header.jpg"),
];
export const portraitUrls = (app: App) => [
  ...custom("GetCustomVerticalCapsuleURLs", app),
  ...custom("GetCachedVerticalCapsuleURL", app),
  ...steamAsset(app, "library_600x900.jpg"),
];

export function runningAppId(): number | undefined {
  try {
    return Router.MainRunningAppID;
  } catch {
    return undefined;
  }
}

export function openDetails(app: App) {
  Navigation.Navigate(`/library/app/${app.appid}`);
}

type AnyFn = (...args: any[]) => any;
/** Steam's game context menu: the component that renders it and its placement options. */
let gameMenu: { component: AnyFn; options?: AnyFn } | null | undefined;

function findGameMenu() {
  if (gameMenu !== undefined) return gameMenu;
  gameMenu = null;
  try {
    // The module that builds the library's game menu; the same one SteamGridDB hooks to add "Change artwork".
    const isOptions = (e: any) => typeof e === "function" && String(e).includes("().LibraryContextMenu");
    const mod = findModuleByExport(isOptions);
    const exports: any[] = mod ? Object.values(mod) : [];
    // The wrapper hands Steam's navigator to the menu class; it's what Steam itself renders.
    const component = exports.find((e) => typeof e === "function" && String(e).includes("navigator:"));
    if (component) gameMenu = { component, options: exports.find(isOptions) };
  } catch (e) {
    console.error("[ps5-dashboard] game menu not found", e);
  }
  return gameMenu;
}

/**
 * Opens Steam's own menu for a game (Play, Favorites, Manage, Properties...), with whatever other
 * plugins add to it, like SteamGridDB's "Change artwork". Falls back to the game's page.
 */
export function openGameMenu(app: App, anchor?: EventTarget | null) {
  const menu = findGameMenu();
  if (menu) {
    try {
      const props = { overview: app, client: "mostavailable", launchSource: LAUNCH_SOURCE, bInGamepadUI: true };
      showContextMenu(createElement(menu.component, props), anchor ?? undefined, menu.options?.());
      return;
    } catch (e) {
      console.error("[ps5-dashboard] game menu failed", e);
    }
  }
  openDetails(app);
}

export function openAchievements(app: App) {
  Navigation.Navigate(`/library/app/${app.appid}/achievements/my/individual`);
}

export function openExternal(url: string) {
  Navigation.NavigateToExternalWeb(url);
}

/** X (A) on a tile: start the game like on the PS5; open its page when it can't start right away. */
export function launch(app: App) {
  const playable = app.installed || app.app_type === APP_TYPE_SHORTCUT;
  if (!playable || runningAppId() === app.appid) {
    openDetails(app);
    return;
  }
  try {
    SteamClient.Apps.RunGame(app.gameid ?? String(app.appid), "", -1, LAUNCH_SOURCE);
  } catch (e) {
    console.error("[ps5-dashboard] RunGame failed", e);
    openDetails(app);
  }
}

export function persona(): { name: string; avatar?: string } {
  try {
    const p = friendStore.m_FriendsUIFriendStore.self.m_persona;
    return { name: p.m_strPlayerName ?? "", avatar: p.avatar_url_full ?? p.avatar_url_medium };
  } catch {
    return { name: "" };
  }
}

export function lastPlayedText(app: App): string {
  const last = app.rt_last_time_played ?? 0;
  if (!last) return app.installed ? t.installed : t.notInstalled;
  const days = Math.floor((Date.now() / 1000 - last) / 86400);
  if (days <= 0) return t.playedToday;
  if (days === 1) return t.playedYesterday;
  if (days < 30) return t.playedDaysAgo(days);
  const months = Math.floor(days / 30);
  if (months < 12) return t.playedMonthsAgo(months);
  return t.playedOverAYear;
}

export function playtimeText(app: App): string {
  const m = app.minutes_playtime_forever ?? 0;
  if (m < 60) return m > 0 ? t.minutesPlayed(m) : "";
  return t.hoursPlayed(Math.round(m / 60));
}
