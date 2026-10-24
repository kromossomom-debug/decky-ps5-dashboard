import { callable } from "@decky/api";
import { useEffect, useState } from "react";

import { currentSettings } from "./settings";
import { APP_TYPE_SHORTCUT, App } from "./steam";

declare const SteamClient: any;

/** HowLongToBeat times, in seconds (0 when HowLongToBeat has no data for that category). */
export interface HltbTimes {
  id: number;
  name: string;
  main: number;
  plus: number;
  full: number;
}

export interface Achievements {
  done: number;
  total: number;
  /** The last few unlocked, newest first. */
  recent: { name: string; image: string }[];
}

/** Loading, a result, or nothing to show (not found, turned off, or no achievements). */
export type Loadable<T> = { state: "loading" } | { state: "done"; value: T | null };

const fetchHltb = callable<[appid: number, name: string], HltbTimes | null>("hltb_times");

/** One lookup per game per session; the backend also keeps a week-long cache on disk. */
const hltbCache = new Map<number, Promise<HltbTimes | null>>();
/** Achievements change while you play, so they're only kept for a few minutes. */
const ACHIEVEMENTS_TTL_MS = 5 * 60 * 1000;
const achievementsCache = new Map<number, { at: number; p: Promise<Achievements | null> }>();

function hltbFor(app: App): Promise<HltbTimes | null> {
  let p = hltbCache.get(app.appid);
  if (!p) {
    p = fetchHltb(app.appid, app.display_name).catch(() => null);
    hltbCache.set(app.appid, p);
    // A miss may have been a network hiccup: let a later visit try again (the backend caches real misses).
    p.then((r) => {
      if (!r) hltbCache.delete(app.appid);
    });
  }
  return p;
}

async function loadAchievements(appid: number): Promise<Achievements | null> {
  const res = await SteamClient.Apps.GetMyAchievementsForApp(String(appid));
  const data = typeof res === "string" ? JSON.parse(res) : res;
  const list: any[] = data?.data?.rgAchievements ?? [];
  if (list.length === 0) return null;
  const unlocked = list.filter((a) => a.bAchieved).sort((a, b) => (b.rtUnlocked ?? 0) - (a.rtUnlocked ?? 0));
  return {
    done: unlocked.length,
    total: list.length,
    recent: unlocked.slice(0, 3).map((a) => ({ name: a.strName ?? "", image: a.strImage ?? "" })),
  };
}

function achievementsFor(app: App): Promise<Achievements | null> {
  const hit = achievementsCache.get(app.appid);
  if (hit && Date.now() - hit.at < ACHIEVEMENTS_TTL_MS) return hit.p;
  const p = loadAchievements(app.appid).catch(() => null);
  achievementsCache.set(app.appid, { at: Date.now(), p });
  return p;
}

/**
 * Runs `load` for `app` once the selection has stayed on it for `delayMs`, so flicking through the
 * home row doesn't start a lookup for every tile that passes by.
 */
function useDelayed<T>(app: App | undefined, delayMs: number, load: ((app: App) => Promise<T | null>) | null) {
  const [value, setValue] = useState<Loadable<T>>({ state: "loading" });
  useEffect(() => {
    if (!app || !load) {
      setValue({ state: "done", value: null });
      return;
    }
    setValue({ state: "loading" });
    let alive = true;
    const timer = window.setTimeout(() => {
      load(app).then((v) => {
        if (alive) setValue({ state: "done", value: v });
      });
    }, delayMs);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [app?.appid]);
  return value;
}

export function useHltb(app: App | undefined): Loadable<HltbTimes> {
  return useDelayed(app, 450, currentSettings().hltb ? hltbFor : null);
}

export function useAchievements(app: App | undefined): Loadable<Achievements> {
  // Non-Steam shortcuts have no achievements.
  const steam = app && app.app_type !== APP_TYPE_SHORTCUT ? app : undefined;
  return useDelayed(steam, 300, achievementsFor);
}

/** "45 min", "12 h", "12½ h". */
export function formatDuration(seconds: number): string {
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))} min`;
  const halves = Math.round(seconds / 1800);
  const whole = Math.floor(halves / 2);
  return halves % 2 ? `${whole}½ h` : `${whole} h`;
}

/** "77,8 GB" in the user's number format. */
export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toLocaleString(undefined, { maximumFractionDigits: n < 10 ? 1 : 0 })} ${units[i]}`;
}
