import { Focusable, Navigation } from "@decky/ui";
import { ReactNode, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaSteam } from "react-icons/fa";
import { IoLibrary } from "react-icons/io5";
import {
  MdApps,
  MdCheckCircle,
  MdDownload,
  MdFavorite,
  MdGridView,
  MdLocalOffer,
  MdMoreHoriz,
  MdPhotoLibrary,
  MdPlayArrow,
  MdSearch,
  MdSettings,
  MdShoppingBag,
} from "react-icons/md";

import { ActionTile, Art, Button, GameTile, Row } from "./components";
import { ActionCard, ActionCards, GameCards } from "./InfoCards";
import { t } from "./i18n";
import {
  APP_TYPE_SHORTCUT,
  App,
  byRecent,
  favoriteApps,
  gameApps,
  heroUrls,
  installedApps,
  landscapeUrls,
  lastPlayedText,
  launch,
  logoUrls,
  openGameMenu,
  openStore,
  playtimeText,
  recentApps,
  runningAppId,
  ROUTES,
  softwareApps,
} from "./steam";
import type { TabId } from "./Shell";

const RECENT_COUNT = 10;
const ROW_COUNT = 14;
/** Wait a moment before swapping the big background, so flicking through tiles doesn't strobe. */
const BACKDROP_DELAY_MS = 140;
/** Where a lower row sits once focused, as a share of the screen height from the top. */
const LOWER_ROW_ANCHOR = 0.3;
/** Kept on the top-row tile the game info belongs to, so it stays big while the Play button has focus. */
const SELECTED_CLASS = "psd-selected";

/** What the top row has selected: a game, or one of the Store / Game Library tiles at its ends. */
type Pick = { app: App } | { title: string; description: string; icon: ReactNode; go: () => void; cards: ActionCard[] };
type GoTab = (tab: TabId, view?: string) => void;

/** Elements the browser may scroll on its own when Steam focuses something; the home never scrolls them. */
const PINNED = ".psd-root, .psd-content, .psd-section-clip, .psd-row-anchor";

/**
 * Slides the home row so the selected tile sits at the left edge, like the PS5. Index times a fixed
 * slot width gives the offset, so nothing is measured (no layout read mid-animation) and the move is a
 * transform the GPU runs on its own.
 */
function slideTo(el: HTMLElement) {
  const row = el.parentElement;
  if (!row) return;
  const i = Array.prototype.indexOf.call(row.children, el);
  row.style.transform = `translate3d(calc(${-i} * (var(--psd-slot) + var(--psd-gap))), 0, 0)`;
}

/**
 * The full-screen game art. The new picture fades in over the old one (a PS5 crossfade) and the old
 * one is dropped once it's covered, so at most two images are ever on screen.
 */
function Backdrop({ app, dim }: { app?: App; dim: boolean }) {
  const [layers, setLayers] = useState<App[]>(app ? [app] : []);
  useEffect(() => {
    if (app) setLayers((l) => (l[l.length - 1]?.appid === app.appid ? l : [...l.slice(-1), app]));
  }, [app]);
  const drop = () => setLayers((l) => (l.length > 1 ? l.slice(-1) : l));
  return (
    <div className={`psd-backdrop ${dim ? "psd-dim" : ""} ${app ? "" : "psd-backdrop-empty"}`}>
      <div className="psd-backdrop-art">
        {layers.map((a, i) => (
          <div
            key={a.appid}
            className={`psd-backdrop-layer ${i === layers.length - 1 ? "psd-backdrop-new" : ""}`}
            onAnimationEnd={i === layers.length - 1 ? drop : undefined}
          >
            <Art
              className="psd-backdrop-img"
              sources={[...heroUrls(a), ...landscapeUrls(a)]}
              fallback={<div className="psd-backdrop-img psd-backdrop-none" />}
            />
          </div>
        ))}
      </div>
      <div className="psd-backdrop-shade" />
    </div>
  );
}

/** Logo (or name), "Played today · 42 h played", then the white Play pill and the round "…" button. */
function GameInfo({ pick, onFocus }: { pick?: Pick; onFocus: () => void }) {
  if (!pick) return null;
  if (!("app" in pick)) {
    return (
      <div className="psd-info" key={pick.title}>
        <div className="psd-info-icon">{pick.icon}</div>
        <div className="psd-info-title">{pick.title}</div>
        <div className="psd-info-sub">{pick.description}</div>
        <Focusable className="psd-buttons" flow-children="row">
          <Button label={t.open} preferredFocus onActivate={pick.go} onFocus={onFocus}>
            {t.open}
          </Button>
        </Focusable>
        <ActionCards cards={pick.cards} onFocus={onFocus} />
      </div>
    );
  }
  const { app } = pick;
  const running = runningAppId() === app.appid;
  const playable = app.installed || app.app_type === APP_TYPE_SHORTCUT;
  const label = running ? t.resume : playable ? t.play : t.viewGame;
  const sub = [lastPlayedText(app), playtimeText(app)].filter(Boolean).join("  ·  ");
  return (
    <div className="psd-info" key={app.appid}>
      <Art
        className="psd-info-logo"
        sources={logoUrls(app)}
        fallback={<div className="psd-info-title">{app.display_name}</div>}
      />
      <div className="psd-info-sub">{sub}</div>
      <Focusable className="psd-buttons" flow-children="row">
        <Button label={label} preferredFocus onActivate={() => launch(app)} onFocus={onFocus}>
          {playable && <MdPlayArrow />}
          {label}
        </Button>
        <Button round label={t.moreOptions} onActivate={(anchor) => openGameMenu(app, anchor)} onFocus={onFocus}>
          <MdMoreHoriz />
        </Button>
      </Focusable>
      <GameCards app={app} onFocus={onFocus} />
    </div>
  );
}

interface TopRowProps {
  recents: App[];
  goTab: GoTab;
  onTopRow: (pick: Pick, el: HTMLElement) => void;
}

interface LowerRowsProps {
  favorites: App[];
  installed: App[];
  goTab: GoTab;
  onLowerRow: (el: HTMLElement) => void;
}

/**
 * All the tiles. Memoized with stable props, so moving the focus only re-renders the background
 * and the game info, not every tile (each one is a Steam focus node, which is costly to update).
 */
const TopRow = memo(function TopRow({ recents, goTab, onTopRow }: TopRowProps) {
  const store: Pick = {
    title: t.storeTitle,
    description: t.storeDesc,
    icon: <MdShoppingBag />,
    go: () => openStore(),
    cards: [
      { icon: <MdLocalOffer />, title: t.specialsTitle, caption: t.specialsDesc, go: () => openStore("specials") },
      { icon: <MdFavorite />, title: t.wishlistTitle, caption: t.wishlistDesc, go: () => openStore("wishlist") },
      { icon: <MdSearch />, title: t.search, caption: t.searchDesc, go: () => Navigation.Navigate(ROUTES.search) },
    ],
  };
  const count = (n: number) => String(n);
  const library: Pick = {
    title: t.library,
    description: t.libraryDesc,
    icon: <IoLibrary />,
    go: () => goTab("library"),
    cards: [
      { icon: <MdCheckCircle />, title: t.cardInstalled, caption: count(installedApps().length), go: () => goTab("library", "installed") },
      { icon: <MdGridView />, title: t.cardGames, caption: count(gameApps().length), go: () => goTab("library", "collection") },
      { icon: <MdApps />, title: t.cardApps, caption: count(softwareApps().length), go: () => goTab("library", "apps") },
    ],
  };
  // Store first, recent games, Game Library last: the PS5 home row.
  return (
    <Row anchor className="psd-home-row">
        <ActionTile
          icon={store.icon}
          label={store.title}
          size="home"
          accent
          onFocus={(el) => onTopRow(store, el)}
          onActivate={store.go}
        />
        {recents.map((app, i) => (
          <GameTile
            key={app.appid}
            app={app}
            size="home"
            preferredFocus={i === 0}
            onFocus={(a, el) => onTopRow({ app: a }, el)}
          />
        ))}
        <ActionTile
          icon={library.icon}
          label={library.title}
          size="home"
          onFocus={(el) => onTopRow(library, el)}
          onActivate={library.go}
        />
    </Row>
  );
});

/** The rows further down, under the game info. Same memo trick as TopRow. */
const LowerRows = memo(function LowerRows({ favorites, installed, goTab, onLowerRow }: LowerRowsProps) {
  return (
    <>
      {favorites.length > 0 && (
        <Row title={t.rowFavorites}>
          {favorites.map((app) => (
            <GameTile key={app.appid} app={app} size="small" onFocus={(_a, el) => onLowerRow(el)} />
          ))}
        </Row>
      )}

      {installed.length > 0 && (
        <Row title={t.rowInstalled}>
          {installed.map((app) => (
            <GameTile key={app.appid} app={app} size="small" onFocus={(_a, el) => onLowerRow(el)} />
          ))}
        </Row>
      )}

      <Row title={t.rowShortcuts}>
        {[
          { icon: <IoLibrary />, label: t.library, go: () => goTab("library") },
          { icon: <FaSteam />, label: t.steamLibrary, go: () => Navigation.Navigate(ROUTES.library) },
          { icon: <MdShoppingBag />, label: t.storeTitle, go: () => openStore() },
          { icon: <MdDownload />, label: t.downloads, go: () => Navigation.Navigate(ROUTES.downloads) },
          { icon: <MdPhotoLibrary />, label: t.media, go: () => Navigation.Navigate(ROUTES.media) },
          { icon: <MdSearch />, label: t.search, go: () => Navigation.Navigate(ROUTES.search) },
          { icon: <MdSettings />, label: t.settings, go: () => Navigation.Navigate(ROUTES.settings) },
        ].map((s) => (
          <ActionTile key={s.label} icon={s.icon} label={s.label} size="small" onFocus={onLowerRow} onActivate={s.go} />
        ))}
      </Row>
    </>
  );
});

export function HomeTab({ goTab }: { goTab: GoTab }) {
  const recents = useMemo(() => recentApps(RECENT_COUNT), []);
  const favorites = useMemo(() => favoriteApps().sort(byRecent).slice(0, ROW_COUNT), []);
  const installed = useMemo(() => installedApps().sort(byRecent).slice(0, ROW_COUNT), []);

  const [pick, setPick] = useState<Pick | undefined>(recents[0] ? { app: recents[0] } : undefined);
  const [backdrop, setBackdrop] = useState<App | undefined>(recents[0]);
  const [lowered, setLowered] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const selectedEl = useRef<HTMLElement | null>(null);

  const pickedApp = pick && "app" in pick ? pick.app : undefined;
  useEffect(() => {
    const t = window.setTimeout(() => setBackdrop(pickedApp), BACKDROP_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [pickedApp]);

  // Steam focuses tiles with element.focus(), which can make the browser scroll a clipped box by itself
  // and push the selected game out of view. Undo that the moment it happens.
  useEffect(() => {
    const root = scroller.current?.closest<HTMLElement>(".psd-root");
    if (!root) return;
    const onScroll = (e: Event) => {
      const el = e.target;
      if (el instanceof HTMLElement && el.matches(PINNED) && (el.scrollLeft || el.scrollTop)) {
        el.scrollLeft = 0;
        el.scrollTop = 0;
      }
    };
    root.addEventListener("scroll", onScroll, true);
    return () => root.removeEventListener("scroll", onScroll, true);
  }, []);

  const toTop = useCallback(() => {
    setLowered(false);
    scroller.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  const onTopRow = useCallback(
    (next: Pick, el: HTMLElement) => {
      selectedEl.current?.classList.remove(SELECTED_CLASS);
      el.classList.add(SELECTED_CLASS);
      selectedEl.current = el;
      slideTo(el);
      setPick(next);
      toTop();
    },
    [toTop],
  );
  const onLowerRow = useCallback((el: HTMLElement) => {
    setLowered(true);
    const section = el.closest<HTMLElement>(".psd-section");
    const s = scroller.current;
    if (section && s) s.scrollTo({ top: section.offsetTop - s.clientHeight * LOWER_ROW_ANCHOR, behavior: "smooth" });
  }, []);

  return (
    <>
      <Backdrop app={backdrop} dim={lowered} />
      <Focusable className={`psd-scroller ${lowered ? "psd-lowered" : ""}`} ref={scroller} flow-children="column">
        <div className="psd-top-space" />
        <TopRow recents={recents} goTab={goTab} onTopRow={onTopRow} />
        <div className="psd-hero">
          <GameInfo pick={pick} onFocus={toTop} />
        </div>
        <LowerRows favorites={favorites} installed={installed} goTab={goTab} onLowerRow={onLowerRow} />
        <div className="psd-bottom-space" />
      </Focusable>
    </>
  );
}
