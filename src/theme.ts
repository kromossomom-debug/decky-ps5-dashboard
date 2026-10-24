import { Selectors } from "./classes";
import { Settings, accentColor } from "./settings";

/**
 * Steam's weights of "Motiva Sans", each pointed at an SST-like local face (the PS5's font), with
 * Noto Sans when SST isn't installed. Redefining the family swaps the font everywhere without a
 * selector touching every element.
 */
const FONT_FACES: [number, string[]][] = [
  [100, ["SST Light", "SST W55 Light", "Noto Sans Light"]],
  [300, ["SST Light", "SST W55 Light", "Noto Sans Light"]],
  [400, ["SST", "SST Roman", "SST W55 Regular", "Noto Sans Regular", "Noto Sans"]],
  [500, ["SST Medium", "SST W55 Medium", "Noto Sans Medium"]],
  [700, ["SST Bold", "SST W55 Bold", "Noto Sans Bold"]],
  [800, ["SST Bold", "SST W55 Bold", "Noto Sans Bold"]],
  [900, ["SST Heavy", "SST W55 Heavy", "Noto Sans Black"]],
];

/** Builds the whole theme stylesheet. Every Steam class comes from `s`, resolved at runtime. */
export function buildCss(st: Settings, s: Selectors): string {
  const {
    ui,
    recent,
    carousel,
    portrait,
    asset,
    header,
    mainMenu,
    tabs,
    focusRing,
    qam,
    dialog,
    slider,
    appAction,
    contextMenu,
    contextMenuPanel,
  } = s;
  const accent = accentColor(st.accent);
  const focus = st.focus === "white" ? "#FFFFFF" : accent;
  const parts: string[] = [];

  parts.push(`
:root {
  --psd-accent: ${accent};
  --psd-accent-soft: color-mix(in srgb, ${accent} 35%, transparent);
  --psd-focus: ${focus};
  --psd-radius: ${st.radius}px;
  --psd-panel: rgba(16, 19, 28, 0.96);
  --psd-glow: 0 0 0 3px var(--psd-focus), 0 0 24px color-mix(in srgb, var(--psd-focus) 45%, transparent);
}`);

  if (st.font) {
    for (const [weight, names] of FONT_FACES) {
      const src = names.map((n) => `local("${n}")`).join(", ");
      parts.push(`@font-face { font-family: "Motiva Sans"; font-style: normal; font-weight: ${weight}; src: ${src}; }`);
    }
  }

  // ---------- Home background: the focused game's art, full bleed, like the PS5 ----------
  if (st.background === "art") {
    parts.push(`
${recent.RecentGamesBackground}, ${recent.RecentGamesBackgroundContainer},
${recent.RecentGamesBackgroundImages}, ${recent.RecentGamesBackgroundImage} {
  filter: none !important;
}
${recent.RecentGamesBackgroundContainer}::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 24%, rgba(0,0,0,0.2) 55%, rgba(4,6,12,0.92) 85%, #04060c 100%),
    linear-gradient(to right, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 50%);
}`);
  } else {
    const bg =
      st.background === "gradient"
        ? `radial-gradient(ellipse at 85% -10%, color-mix(in srgb, ${accent} 60%, #000) 0%, color-mix(in srgb, ${accent} 16%, #04060c) 45%, #04060c 80%)`
        : `#05070d`;
    parts.push(`
${recent.RecentGamesBackgroundImages}, ${recent.RecentGamesBackgroundImage} { display: none !important; }
${recent.RecentGamesBackground} { background: ${bg} !important; }
${ui.BasicHome} { background: ${bg} !important; }`);
  }

  // ---------- Layout: push the Recent row down so the art has room ----------
  parts.push(`
${recent.RecentGamesContainer} {
  padding-top: calc(${st.heroSpace}vh + 24px) !important;
}
${recent.RecentGamesHeader} {
  opacity: 0.85 !important;
}
${recent.RecentGamesHeaderLabel} {
  font-size: 15px !important;
  font-weight: 500 !important;
  letter-spacing: 0.01em;
  text-transform: none !important;
}`);

  // ---------- Tiles: rounded squares, flat, no Steam glow/shine ----------
  parts.push(`
${carousel.BasicGameCarouselItemMediaContainer},
${portrait.LibraryItemBox}, ${portrait.PortraitImage}, ${portrait.Capsule},
${asset.Container}, ${asset.PortraitImage}, ${asset.LandscapeImage} {
  border-radius: var(--psd-radius) !important;
}
${carousel.BasicGameCarouselItemMediaContainer}, ${portrait.LibraryItemBox} {
  overflow: hidden;
}
${carousel.CarouselCapsuleBackgroundGlow}, ${portrait.LibraryItemBoxShine} {
  display: none !important;
}
${carousel.CarouselGameLabel} {
  font-size: 15px !important;
  font-weight: 500 !important;
  text-shadow: 0 1px 4px rgba(0,0,0,0.85);
}`);

  // ---------- Focus: the PS5's white outline with a soft glow ----------
  parts.push(`
${carousel.BasicGameCarouselItem}${carousel.IsFocused} ${carousel.BasicGameCarouselItemMediaContainer},
${carousel.BasicGameCarouselItem}.gpfocus ${carousel.BasicGameCarouselItemMediaContainer} {
  box-shadow: var(--psd-glow) !important;
}
/* Library capsules: a crisp white edge and a soft lift, not a wide bloom over the neighbours. */
.gpfocus > ${portrait.LibraryItemBox}, ${portrait.LibraryItemBox}.gpfocus,
${portrait.Capsule}.gpfocus ${portrait.LibraryItemBox} {
  box-shadow: 0 0 0 3px var(--psd-focus), 0 0 14px color-mix(in srgb, var(--psd-focus) 22%, transparent),
    0 12px 28px rgba(0,0,0,0.55) !important;
}
${focusRing.FocusRing} {
  border-color: var(--psd-focus) !important;
  border-radius: var(--psd-radius) !important;
  box-shadow: 0 0 18px color-mix(in srgb, var(--psd-focus) 40%, transparent);
}`);

  // ---------- Top bar: transparent, round avatar ----------
  parts.push(`
${header.Clock} {
  font-size: 18px !important;
  font-weight: 500 !important;
}
${header.CurrentUserAvatar}, ${header.CurrentUserAvatar} img, ${header.Avatar}, ${header.Avatar} img {
  border-radius: 50% !important;
}
${header.HeaderOpaque} {
  background: rgba(5,7,13,0.9) !important;
}`);

  // ---------- Tabbed pages (Library...): PS5 pills in sentence case on a navy page ----------
  parts.push(`
${tabs.GamepadTabbedPage} {
  background: radial-gradient(ellipse at 85% -20%, color-mix(in srgb, var(--psd-accent) 26%, #05070d) 0%, #070b16 40%, #05070d 75%);
}
${tabs.TabHeaderRowWrapper} {
  background: transparent !important;
}
${tabs.Tab} {
  border-radius: 999px !important;
  padding-left: 16px !important;
  padding-right: 16px !important;
  transition: background-color 120ms ease;
}
${tabs.TabTitle} {
  text-transform: none !important;
  letter-spacing: 0 !important;
  font-weight: 500 !important;
}
${tabs.TabCount} {
  margin-left: 6px;
  opacity: 0.6;
  font-weight: 400 !important;
}
${tabs.Tab}${tabs.Selected} {
  background: rgba(255,255,255,0.16) !important;
  color: #fff !important;
  font-weight: 600 !important;
}
${tabs.Tab}.gpfocus {
  background: #fff !important;
  color: #000 !important;
  box-shadow: 0 0 18px rgba(255,255,255,0.35);
}
${tabs.Tab}.gpfocus * { color: #000 !important; }`);

  // ---------- Play button: the PS5's white button; controls in the accent color ----------
  parts.push(`
${appAction.PlayButton}${appAction.Green} {
  background: rgba(255,255,255,0.9) !important;
  color: #000 !important;
  border-radius: var(--psd-radius) !important;
}
${appAction.PlayButton}${appAction.Green} * { color: #000 !important; fill: #000 !important; }
${appAction.PlayButton}${appAction.Green}.gpfocus {
  background: #fff !important;
  box-shadow: var(--psd-glow) !important;
}
${dialog.On} ${dialog.ToggleRail} {
  background: var(--psd-accent) !important;
}
${slider.SliderHandle} {
  background: #fff !important;
}`);

  // ---------- Steam menu + Quick Access styled like the PS5 Control Center ----------
  if (st.controlCenter) {
    // Dark rounded panel, white focused item with dark text and a glow, accent mark on the current page.
    parts.push(`
${mainMenu.Menu}, ${mainMenu.DashboardMenu} {
  --menu-background: transparent;
  background: linear-gradient(180deg, rgba(18,22,38,0.96) 0%, rgba(8,10,20,0.97) 100%) !important;
  border-right: 1px solid rgba(255,255,255,0.07);
  border-radius: 0 calc(var(--psd-radius) * 1.5) calc(var(--psd-radius) * 1.5) 0;
  box-shadow: 18px 0 60px rgba(0,0,0,0.65);
}
${mainMenu.MainMenuEmbedded}, ${mainMenu.NavigationColumn} {
  background: transparent !important;
}
${mainMenu.NavigationColumn}::before { display: none !important; }
/* Visible overflow so the focused pill's glow isn't cut into a hard band by its row. */
${mainMenu.ItemOuter} {
  background: transparent !important;
  overflow: visible !important;
  animation: none !important;
}
/*
 * Steam scales the focused and the current item to 110%, which pushed the pill past the panel's edge
 * (where ItemOuter clips it, losing its right corners). Border-box sizing and a tighter padding keep
 * labels inside the item, so Steam doesn't switch them to its scrolling marquee.
 */
${mainMenu.Item} {
  position: relative;
  box-sizing: border-box !important;
  border-radius: calc(var(--psd-radius) * 0.9) !important;
  margin: 3px 12px !important;
  width: calc(100% - 24px) !important;
  padding: 0 10px 0 18px !important;
  transform: none !important;
  color: rgba(255,255,255,0.82) !important;
  font-weight: 400 !important;
  background: transparent !important;
  animation: none !important;
  transition: background-color 120ms ease, color 120ms ease, box-shadow 120ms ease;
}
${mainMenu.ItemIcon} { color: rgba(255,255,255,0.85) !important; fill: currentColor !important; }
${mainMenu.ItemLabel} { max-width: none !important; overflow: hidden; text-overflow: ellipsis; font-size: 15px !important; }
${mainMenu.Item}:hover { background: rgba(255,255,255,0.1) !important; }
/* PS5 focus: a white pill with black text and a soft glow (Steam's translucent focus animation is dropped). */
${mainMenu.Item}.gpfocus, ${mainMenu.ItemOuter}.gpfocus ${mainMenu.Item} {
  background: #fff !important;
  color: #000 !important;
  animation: none !important;
  transform: scale(1.02) !important;
  box-shadow: 0 0 16px rgba(255,255,255,0.3);
}
${mainMenu.Item}.gpfocus *, ${mainMenu.ItemOuter}.gpfocus ${mainMenu.Item} *,
${mainMenu.Item}.gpfocus ${mainMenu.ItemLabel}, ${mainMenu.Item}.gpfocus ${mainMenu.ItemIcon} {
  color: #000 !important;
  fill: #000 !important;
}
/* The page you're on: bold white text and a small PlayStation-blue dot. */
${mainMenu.Item}${mainMenu.Active}:not(.gpfocus) {
  color: #fff !important;
  font-weight: 600 !important;
  background: rgba(255,255,255,0.06) !important;
}
${mainMenu.ActiveDot} {
  width: 6px !important; height: 6px !important; border-radius: 50% !important;
  left: 8px !important; top: calc(50% - 3px) !important;
  background: var(--psd-accent) !important;
  box-shadow: 0 0 8px var(--psd-accent);
}
${mainMenu.ItemOuter}::after { background: rgba(255,255,255,0.07) !important; }
${mainMenu.CurrentUserAvatar} {
  border-radius: 50% !important;
}
${qam.Tabs} {
  background: #0b0e16 !important;
}
${qam.TabGroupPanel} {
  background: var(--psd-panel) !important;
}
/*
 * Steam's tabs are 48 px wide and 64 px tall, so rounding the tab itself gives an oval, and focus adds
 * a 110% scale with a clip. The tab stays transparent; a fixed 42 px circle behind the icon is the
 * highlight instead.
 */
${qam.Tab}, ${qam.Tab}${qam.Selected}, ${qam.Tab}.gpfocus, ${qam.Tab}${qam.Selected}.gpfocus {
  position: relative;
  background: transparent !important;
  border-radius: 0 !important;
  transform: none !important;
  clip-path: none !important;
  animation: none !important;
}
${qam.Tab}::before {
  content: "";
  position: absolute;
  left: 50%; top: 50%;
  width: 42px; height: 42px;
  margin: -21px 0 0 -21px;
  border-radius: 50%;
  background: transparent;
  transition: background-color 120ms ease, box-shadow 120ms ease;
}
${qam.Tab}${qam.Selected}::before { background: rgba(255,255,255,0.16); }
${qam.Tab}.gpfocus::before { background: #fff; box-shadow: 0 0 16px rgba(255,255,255,0.35); }
${qam.Tab} svg { position: relative; z-index: 1; transform: none !important; }
${qam.Tab}${qam.Selected}:not(.gpfocus) { color: #fff !important; }
${qam.Tab}.gpfocus, ${qam.Tab}.gpfocus svg, ${qam.Tab}.gpfocus * {
  color: #000 !important;
  fill: #000 !important;
}
${dialog.Field}.gpfocus {
  background: rgba(255,255,255,0.08);
  box-shadow: inset 0 0 0 2px #fff, 0 0 16px rgba(255,255,255,0.25);
  border-radius: var(--psd-radius);
}
${qam.TabGroupPanel} .DialogButton {
  background: rgba(255,255,255,0.08) !important;
  border-radius: calc(var(--psd-radius) * 0.75) !important;
  color: #fff !important;
}
${qam.TabGroupPanel} .DialogButton.gpfocus {
  background: #fff !important;
  color: #000 !important;
  box-shadow: 0 0 16px rgba(255,255,255,0.3) !important;
}
${qam.TabGroupPanel} .DialogButton.gpfocus * { color: #000 !important; fill: #000 !important; }`);

    // Power menu and every other gamepad context menu: the PS5 options panel. Steam paints the
    // focused "destructive" item (Switch to Desktop, Shut down...) red-orange and "positive" ones
    // green; on the PS5 every focused option is the same white.
    parts.push(`
${contextMenuPanel.BasicContextMenuContainer} {
  background: var(--psd-panel) !important;
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: calc(var(--psd-radius) * 1.2) !important;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0,0,0,0.7);
}
${contextMenuPanel.BasicContextMenuHeader} {
  color: #fff !important;
  font-weight: 500 !important;
}
${contextMenu.contextMenuItem} {
  background: transparent !important;
  color: rgba(255,255,255,0.85) !important;
  border-radius: calc(var(--psd-radius) * 0.75) !important;
  margin: 2px 6px;
  width: calc(100% - 12px);
}
${contextMenu.contextMenuItem}${contextMenu.Focused},
${contextMenu.contextMenuItem}.gpfocus,
${contextMenu.contextMenuItem}${contextMenu.Focused}${contextMenu.Destructive},
${contextMenu.contextMenuItem}${contextMenu.Focused}${contextMenu.Positive},
${contextMenu.contextMenuItem}${contextMenu.Focused}${contextMenu.Emphasis} {
  background: #fff !important;
  color: #000 !important;
  box-shadow: 0 0 18px rgba(255,255,255,0.3);
}
${contextMenu.contextMenuItem}${contextMenu.Focused} *, ${contextMenu.contextMenuItem}.gpfocus * {
  color: #000 !important;
  fill: #000 !important;
}
${contextMenu.contextMenuItem}${contextMenu.Selected} {
  background: rgba(255,255,255,0.1) !important;
  box-shadow: inset 3px 0 0 var(--psd-accent);
}
${contextMenu.ContextMenuSeparator}, .contextMenuItemHR {
  background: rgba(255,255,255,0.08) !important;
}`);
  }

  // ---------- Cleaner home ----------
  if (st.hideShelves) {
    parts.push(`
${s.whatsNew.LibraryHomeWhatsNew}, ${s.friends.LibraryHomeFriends}, ${s.playNext.PlayNextCarousel} {
  display: none !important;
}`);
  }

  return parts.join("\n");
}
