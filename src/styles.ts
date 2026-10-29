/**
 * Styles for the plugin's own screens (tab bar, home, Game Library, Media cards). Sizes are in vh so the
 * layout holds on the Deck screen (800px tall) and when docked. Colors come from the theme's
 * --psd-* variables, with PS5 defaults if the theme stylesheet isn't there.
 */
export const PS5_CSS = `
.psd-root {
  --a: var(--psd-accent, #0070D1);
  --f: var(--psd-focus, #FFFFFF);
  --r: var(--psd-radius, 12px);
  --glow: 0 0 0 0.4vh var(--f), 0 0 3.2vh color-mix(in srgb, var(--f) 45%, transparent);
  position: absolute; top: 0; left: 0; width: 100%; height: 100vh;
  overflow: hidden; color: #fff;
  background: radial-gradient(ellipse at 85% -10%, color-mix(in srgb, var(--a) 55%, #04060c) 0%, #070b16 45%, #04060c 80%);
  font-family: "SST", "SST Pro", "SST W55 Regular", "Noto Sans", sans-serif;
}
.psd-root * { box-sizing: border-box; }
.psd-content { position: absolute; inset: 0; }
.psd-page { position: absolute; top: calc(46px + 10vh); left: 0; right: 0; bottom: 0; }

/* ---------- top: Games / Media on the left (L1 / R1), icons on the right ---------- */
.psd-tabbar {
  position: absolute; top: 46px; left: 4vw; z-index: 4; height: 5.4vh;
  display: flex; align-items: center; gap: 3.2vh; font-size: 2.7vh;
}
.psd-tab {
  display: flex; align-items: center; gap: 1vh;
  font-weight: 400; color: rgba(255,255,255,0.55); text-shadow: 0 1px 6px rgba(0,0,0,0.6);
  transition: color 150ms ease;
}
.psd-tab-active { color: #fff; font-weight: 600; }
.psd-bumper {
  padding: 0.2vh 0.8vh; border-radius: 0.6vh; background: rgba(255,255,255,0.16);
  font-size: 1.4vh; font-weight: 700; opacity: 0.85;
}
.psd-topicons {
  position: absolute; top: 38px; right: 4vw; z-index: 4;
  display: flex; align-items: center; gap: 1.6vh;
}
.psd-icon-button {
  position: relative; width: 4.8vh; height: 4.8vh; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; font-size: 2.5vh;
  color: #fff; background: rgba(255,255,255,0.08);
  transition: background-color 150ms ease, color 150ms ease, box-shadow 150ms ease;
}
.psd-icon-button svg { display: block; }
.psd-icon-button.psd-focused { background: #fff; color: #000; box-shadow: var(--glow); }
.psd-avatar { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
.psd-icon-label {
  position: absolute; top: calc(100% + 0.6vh); right: 0; white-space: nowrap;
  font-size: 1.5vh; color: #fff; text-shadow: 0 1px 4px rgba(0,0,0,0.8);
  opacity: 0; transition: opacity 150ms ease; pointer-events: none;
  background: rgba(0,0,0,0.6); padding: 0.2vh 0.8vh; border-radius: 0.4vh;
}
.psd-icon-button.psd-focused .psd-icon-label { opacity: 1; }

/* ---------- background art ---------- */
.psd-backdrop { position: absolute; inset: 0; }
/* Dimming with a black layer's opacity is composited; a blur filter on a full-screen image is not. */
.psd-backdrop::after {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(to bottom, rgba(6,12,30,0.82), #040814 70%);
  opacity: 0; transition: opacity 300ms ease;
}
.psd-backdrop.psd-dim::after { opacity: 1; }
.psd-backdrop-art { position: absolute; inset: 0; transition: opacity 400ms ease; }
.psd-backdrop-empty .psd-backdrop-art { opacity: 0; }
.psd-backdrop-layer { position: absolute; inset: 0; }
/* PS5 crossfade: the new art fades in over the old one while settling from a slight zoom. */
.psd-backdrop-new { animation: psd-art-in 700ms cubic-bezier(0.2, 0.7, 0.2, 1) both; }
.psd-backdrop-img {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover; object-position: center top;
}
.psd-backdrop-none { background: #04060c; }
.psd-backdrop-shade {
  position: absolute; inset: 0;
  background:
    linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.1) 22%, rgba(0,0,0,0) 45%, rgba(4,6,12,0.55) 75%, #04060c 100%),
    linear-gradient(to right, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.12) 38%, rgba(0,0,0,0) 58%);
}
@keyframes psd-art-in { from { opacity: 0; transform: scale(1.04); } to { opacity: 1; transform: none; } }
@keyframes psd-rise { from { opacity: 0; transform: translateY(1.2vh); } to { opacity: 1; transform: none; } }
@keyframes psd-intro { from { opacity: 0; transform: translateX(8vh); } to { opacity: 1; transform: none; } }

/* ---------- home ---------- */
.psd-scroller { position: absolute; inset: 0; z-index: 2; overflow: hidden; }
/* Going down to the lower rows fades the game row and info out, so nothing slides under the tabs. */
.psd-home-row, .psd-hero { transition: opacity 250ms ease; }
.psd-lowered .psd-home-row, .psd-lowered .psd-hero { opacity: 0; }
.psd-top-space { height: calc(46px + 8vh); }
.psd-section { margin-top: 1.5vh; }
.psd-section-title { margin: 0 0 0 4vw; font-size: 2.4vh; font-weight: 500; }
.psd-row {
  display: flex; align-items: flex-end; gap: 1.6vh;
  overflow: hidden; padding: 1.6vh 4vw 2vh; scroll-padding: 0 4vw;
}

/*
 * The PS5 home row. Every move is a transform or an opacity change, so the GPU animates it without
 * the page being laid out again:
 *  - the row slides by whole slots (set from JS) so the selected game sits at the left edge;
 *  - tiles keep a small fixed slot; the selected one scales its art box up to full size;
 *  - tiles after it shift right just enough for the big tile, and its name sits under them;
 *  - the tile right before it peeks in at the left edge; earlier ones fade out.
 * The section clips (overflow: clip can't be scrolled, so focus can't push the row away).
 */
.psd-home-row {
  --psd-slot: 12vh; --psd-big: 18vh; --psd-gap: 1.8vh;
  margin-top: 0; padding: 3vh 0 3.6vh; overflow: hidden; overflow: clip;
  animation: psd-intro 600ms cubic-bezier(0.2, 0.8, 0.2, 1) backwards;
}
.psd-row-anchor {
  overflow: visible; align-items: flex-start; gap: var(--psd-gap);
  height: var(--psd-big); padding: 0 4vw;
  transition: transform 340ms cubic-bezier(0.22, 0.8, 0.24, 1); will-change: transform;
}
/* Bottom padding keeps the cards clear of Steam's button-hint footer. */
.psd-hero {
  position: relative; height: 57vh; padding: 0 4vw 7vh;
  display: flex; flex-direction: column; justify-content: flex-end;
}
.psd-info { animation: psd-rise 400ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }
.psd-info-logo {
  display: block; max-width: 36vw; max-height: 14vh;
  object-fit: contain; object-position: left bottom;
  filter: drop-shadow(0 0.4vh 1.6vh rgba(0,0,0,0.55));
}
.psd-info-icon { font-size: 7vh; line-height: 1; margin-bottom: 1vh; }
.psd-info-icon svg { display: block; }
.psd-info-title {
  max-width: 60vw; font-size: 5vh; font-weight: 600; line-height: 1.1; text-shadow: 0 2px 10px rgba(0,0,0,0.75);
}
.psd-info-sub { margin-top: 1.4vh; font-size: 2vh; opacity: 0.88; text-shadow: 0 1px 4px rgba(0,0,0,0.8); }
.psd-buttons { display: flex; align-items: center; gap: 1.6vh; margin-top: 2.4vh; }

/* ---------- info cards under Play (HowLongToBeat, playtime, reviews, achievements) ---------- */
.psd-infocards { display: flex; align-items: stretch; gap: 1.6vh; margin-top: 2.6vh; }
.psd-infocard {
  position: relative; flex: 0 0 auto; height: 14vh; padding: 1.3vh 1.8vh;
  display: flex; flex-direction: column; gap: 0.7vh;
  border-radius: var(--r); background: rgba(10,14,26,0.74);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);
  animation: psd-rise 380ms cubic-bezier(0.2, 0.8, 0.2, 1) backwards;
  transition: background-color 150ms ease, transform 150ms ease;
}
.psd-infocard:nth-child(2) { animation-delay: 50ms; }
.psd-infocard:nth-child(3) { animation-delay: 100ms; }
.psd-infocard:nth-child(4) { animation-delay: 150ms; }
.psd-infocard::after {
  content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  box-shadow: var(--glow); opacity: 0; transition: opacity 150ms ease;
}
.psd-infocard.psd-focused { background: rgba(28,36,58,0.92); transform: scale(1.03); }
.psd-infocard.psd-focused::after { opacity: 1; }
.psd-infocard-s { width: 22vh; }
.psd-infocard-m { width: 31vh; }
.psd-infocard-l { width: 40vh; }
.psd-infocard-head {
  display: flex; align-items: center; gap: 0.8vh;
  font-size: 1.6vh; font-weight: 600; letter-spacing: 0.02em; color: rgba(255,255,255,0.7);
}
.psd-infocard-icon { display: flex; font-size: 2.1vh; color: color-mix(in srgb, var(--a) 55%, #fff); }
.psd-infocard-body { flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: flex-end; gap: 0.5vh; }
.psd-infocard-big { font-size: 2.9vh; font-weight: 600; line-height: 1.1; white-space: nowrap; }
.psd-infocard-unit { margin-left: 0.7vh; font-size: 1.6vh; font-weight: 400; color: rgba(255,255,255,0.7); }
.psd-infocard-caption, .psd-infocard-muted {
  font-size: 1.55vh; color: rgba(255,255,255,0.7); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.psd-infocard-muted { margin-bottom: auto; margin-top: 0.6vh; }
.psd-pulse { animation: psd-pulse 1.2s ease-in-out 3; }
@keyframes psd-pulse { 50% { opacity: 0.45; } }
.psd-hltb { display: flex; gap: 2.2vh; }
.psd-hltb-time { font-size: 2.6vh; font-weight: 600; line-height: 1.1; }
.psd-hltb-label { font-size: 1.45vh; color: rgba(255,255,255,0.65); }
.psd-bar { height: 0.6vh; border-radius: 999px; background: rgba(255,255,255,0.14); overflow: hidden; }
.psd-bar-fill {
  height: 100%; border-radius: inherit; transform-origin: 0 50%;
  background: linear-gradient(90deg, var(--a), color-mix(in srgb, var(--a) 45%, #fff));
}
.psd-ach-top { display: flex; align-items: flex-end; justify-content: space-between; gap: 1vh; }
.psd-ach-icons { display: flex; gap: 0.5vh; }
.psd-ach-icon { width: 3.4vh; height: 3.4vh; border-radius: 0.6vh; object-fit: cover; box-shadow: 0 0 0 1px rgba(255,255,255,0.15); }
.psd-chips-mini { display: flex; flex-wrap: wrap; gap: 0.5vh; }
.psd-mini {
  padding: 0.2vh 0.7vh; border-radius: 0.5vh; font-size: 1.35vh; white-space: nowrap;
  background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.85);
}
.psd-button {
  position: relative; display: flex; align-items: center; justify-content: center; gap: 1vh;
  height: 6.4vh; color: #fff; background: rgba(255,255,255,0.18);
  font-size: 2.3vh; font-weight: 600;
  transition: background-color 150ms ease, color 150ms ease, transform 150ms ease;
}
/* The glow is its own layer that fades in, cheaper than animating a box-shadow. */
.psd-button::after {
  content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  box-shadow: var(--glow); opacity: 0; transition: opacity 150ms ease;
}
.psd-button svg { display: block; font-size: 3.2vh; }
.psd-button-main { min-width: 28vh; padding: 0 3.6vh; border-radius: calc(var(--r) * 0.8); }
.psd-button-round { width: 6.4vh; border-radius: 50%; }
.psd-button.psd-focused { background: #fff; color: #000; transform: scale(1.04); }
.psd-button.psd-focused::after { opacity: 1; }
.psd-bottom-space { height: 40vh; }

/* ---------- tiles ---------- */
.psd-tile { position: relative; flex: 0 0 auto; border-radius: var(--r); transition: transform 150ms ease; }
.psd-tile-normal { width: 22vh; height: 22vh; }
.psd-tile-small { width: 17vh; height: 17vh; }
.psd-tile-box { position: absolute; inset: 0; border-radius: var(--r); }
.psd-tile-art { position: absolute; inset: 0; overflow: hidden; border-radius: inherit; background: #151a26; }
.psd-tile-ring {
  position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  box-shadow: var(--glow); opacity: 0; transition: opacity 160ms ease;
}
.psd-tile.psd-focused { z-index: 1; }
.psd-tile.psd-focused .psd-tile-ring { opacity: 1; }
.psd-tile-small.psd-focused, .psd-tile-normal.psd-focused { transform: scale(1.06); }
.psd-cover { display: block; width: 100%; height: 100%; object-fit: cover; object-position: center 20%; }
.psd-cover-text {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  padding: 1.2vh; text-align: center; font-size: 1.9vh; font-weight: 600;
  background: linear-gradient(135deg, #24324d, #121826);
}
.psd-tile-name {
  position: absolute; left: 0; right: 0; bottom: 0; padding: 2.6vh 1vh 0.9vh;
  font-size: 1.8vh; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  border-radius: 0 0 var(--r) var(--r); background: linear-gradient(transparent, rgba(0,0,0,0.88));
  opacity: 0; transition: opacity 150ms ease;
}
.psd-tile.psd-focused .psd-tile-name { opacity: 1; }
/* Shortcut tiles always show their name under the icon. */
.psd-tile-action:not(.psd-tile-home) .psd-tile-name, .psd-tile-accent:not(.psd-tile-home) .psd-tile-name {
  opacity: 1; background: none; text-align: center; padding-bottom: 1.4vh;
}

/* Home row tiles (see .psd-home-row). The art box is drawn at full size and scaled down when not
   selected, so the picture stays sharp when it grows. */
.psd-tile-home {
  width: var(--psd-slot); height: var(--psd-slot); border-radius: 0;
  transition: transform 340ms cubic-bezier(0.22, 0.8, 0.24, 1), opacity 220ms ease;
}
.psd-tile-home .psd-tile-box {
  right: auto; bottom: auto; width: var(--psd-big); height: var(--psd-big);
  border-radius: calc(var(--r) * 1.3);
  transform: scale(0.6667); transform-origin: 0 0;
  transition: transform 340ms cubic-bezier(0.22, 0.8, 0.24, 1);
}
.psd-tile-home.psd-selected .psd-tile-box { transform: none; }
/* Focused: the tile lifts a little, like the PS5. */
.psd-tile-home.psd-focused .psd-tile-box { transform: translate3d(0, -0.7vh, 0); }
.psd-tile-home.psd-selected ~ .psd-tile-home {
  transform: translate3d(calc(var(--psd-big) - var(--psd-slot)), 0, 0);
}
.psd-tile-home:has(~ .psd-selected):not(:has(+ .psd-selected)) { opacity: 0; }
/* Soft glow and a drop shadow; the edge itself is the aura below. */
.psd-tile-home .psd-tile-ring {
  box-shadow: 0 0 2.6vh color-mix(in srgb, var(--f) 30%, transparent), 0 1.6vh 3.2vh rgba(0,0,0,0.55);
}
/*
 * The PS5 glass aura: a light band that keeps circling the focused tile's edge. A conic gradient
 * sits behind the art, a hair bigger than it, and only rotates: a transform the GPU runs on its
 * own, with nothing repainted per frame. It exists only on the focused tile.
 */
.psd-tile-aura {
  position: absolute; inset: -0.45vh; border-radius: calc(var(--r) * 1.3 + 0.45vh);
  overflow: hidden; opacity: 0; transition: opacity 200ms ease;
}
.psd-tile-aura-spin {
  position: absolute; left: -50%; top: -50%; width: 200%; height: 200%;
  background: conic-gradient(
    var(--f), rgba(255,255,255,0.18) 18%, rgba(0,0,0,0.35) 32%, color-mix(in srgb, var(--f) 75%, transparent) 50%,
    rgba(255,255,255,0.22) 68%, rgba(0,0,0,0.3) 84%, var(--f)
  );
}
.psd-tile-home.psd-focused .psd-tile-aura { opacity: 1; }
.psd-tile-home.psd-focused .psd-tile-aura-spin { animation: psd-spin 3.2s linear infinite; }
@keyframes psd-spin { to { transform: rotate(1turn); } }
/* The name goes under the next tiles, like the PS5. */
.psd-tile-home .psd-tile-name {
  left: calc(var(--psd-big) + var(--psd-gap)); right: auto; bottom: auto; top: calc(var(--psd-slot) + 1.4vh);
  width: max-content; max-width: 60vh; padding: 0; background: none; border-radius: 0;
  font-size: 2.6vh; font-weight: 500; line-height: 1.25;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  text-shadow: 0 1px 6px rgba(0,0,0,0.85);
  transform: translate3d(0, -0.8vh, 0); transition: opacity 200ms ease, transform 260ms ease;
}
.psd-tile-home.psd-selected .psd-tile-name, .psd-tile-home.psd-focused .psd-tile-name {
  opacity: 1; transform: none;
}

.psd-not-installed .psd-cover { opacity: 0.55; }
.psd-badge {
  position: absolute; top: 0.8vh; left: 0.8vh; padding: 0.3vh 0.8vh; border-radius: 0.6vh;
  background: var(--a); font-size: 1.4vh; font-weight: 600;
}
.psd-action {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(160deg, rgba(60,74,110,0.75), rgba(16,22,38,0.9));
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.12);
  transition: background-color 150ms ease, color 150ms ease;
}
.psd-tile-accent .psd-action { background: linear-gradient(135deg, color-mix(in srgb, var(--a) 70%, #fff), var(--a) 60%); }
.psd-tile-action.psd-focused .psd-action { background: #fff; color: #000; }
.psd-action-icon { font-size: 5vh; line-height: 1; }
.psd-tile-home .psd-action-icon { font-size: 6.4vh; }
.psd-action-icon svg { display: block; }
.psd-tile-small .psd-action { padding-bottom: 3vh; }
.psd-tile-small.psd-tile-action .psd-action-icon {
  display: flex; align-items: center; justify-content: center;
  width: 7vh; height: 7vh; border-radius: 50%; font-size: 3.6vh;
  background: color-mix(in srgb, var(--a) 35%, transparent);
}
.psd-tile-small.psd-tile-action.psd-focused .psd-action-icon { background: color-mix(in srgb, var(--a) 18%, #fff); }
.psd-tile-small.psd-tile-action.psd-focused .psd-tile-name { color: #000; text-shadow: none; }

/* ---------- Game Library ---------- */
.psd-lib { display: flex; flex-direction: column; padding: 0 0 0 4vw; }
.psd-chips {
  flex: 0 0 auto; display: flex; align-items: center; gap: 1.2vh;
  overflow: hidden; padding: 1vh 4vw 1.4vh 0.6vh;
}
.psd-chip {
  flex: 0 0 auto; display: flex; align-items: center; gap: 1vh; padding: 1vh 2.2vh;
  border-radius: 999px; font-size: 2vh; white-space: nowrap;
  color: rgba(255,255,255,0.75); background: rgba(255,255,255,0.08);
  transition: background-color 150ms ease, color 150ms ease, box-shadow 150ms ease;
}
.psd-chip.psd-active { color: #fff; font-weight: 600; background: rgba(255,255,255,0.2); }
.psd-chip.psd-focused { background: #fff; color: #000; box-shadow: var(--glow); }
.psd-chip-icon { display: flex; font-size: 2.5vh; }
.psd-chip-sep { flex: 0 0 auto; width: 1px; height: 3.4vh; background: rgba(255,255,255,0.18); }
.psd-lib-head { flex: 0 0 auto; padding: 0.6vh 0 0.6vh 0.6vh; font-size: 2.2vh; font-weight: 500; }
.psd-lib-count { margin-left: 0.6vh; font-weight: 400; opacity: 0.6; }
.psd-lib-empty { padding: 2vh 0.6vh; font-size: 2vh; opacity: 0.6; }
.psd-grid {
  flex: 1; min-height: 0; overflow: hidden;
  display: grid; grid-template-columns: repeat(auto-fill, 17vh); gap: 2vh; align-content: start;
  padding: 1.4vh 4vw 30vh 0.6vh; scroll-padding: 2vh 0;
}

/* ---------- Media cards ---------- */
.psd-cards {
  display: grid; grid-template-columns: repeat(auto-fill, 36vh); gap: 2vh; align-content: start;
  padding: 1.6vh 4vw 30vh; overflow: hidden;
}
.psd-card {
  height: 18vh; padding: 2vh; border-radius: var(--r);
  display: flex; flex-direction: column; justify-content: space-between;
  background: rgba(255,255,255,0.08); transition: transform 150ms ease, box-shadow 150ms ease, background-color 150ms ease;
}
.psd-card-accent { background: linear-gradient(135deg, color-mix(in srgb, var(--a) 80%, #fff), var(--a)); }
.psd-card.psd-focused { transform: scale(1.03); box-shadow: var(--glow); }
.psd-card:not(.psd-card-accent).psd-focused { background: rgba(255,255,255,0.16); }
.psd-card-icon { font-size: 4.6vh; line-height: 1; }
.psd-card-icon svg { display: block; }
.psd-card-title { font-size: 2.4vh; font-weight: 600; }
.psd-card-desc { margin-top: 0.4vh; font-size: 1.7vh; opacity: 0.75; }
`;
