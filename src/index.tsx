import { callable, definePlugin, routerHook } from "@decky/api";
import {
  ButtonItem,
  DropdownItem,
  Navigation,
  PanelSection,
  PanelSectionRow,
  SliderField,
  ToggleField,
  staticClasses,
} from "@decky/ui";
import { useState } from "react";
import { FaCoffee, FaPlaystation } from "react-icons/fa";

import { resolveClasses, ResolvedClasses } from "./classes";
import { Fallback } from "./components";
import { t } from "./i18n";
import { applyCss, removeCss } from "./injector";
import {
  ACCENTS,
  BackgroundMode,
  accentColor,
  DEFAULT_SETTINGS,
  FocusStyle,
  Settings,
  setCurrentSettings,
  withDefaults,
} from "./settings";
import { LIBRARY_ROUTE, openDonate } from "./steam";
import { buildCss } from "./theme";
import { Ps5Shell } from "./Shell";

/** Shown in the panel so you can tell which build Steam has loaded. Kept in sync with package.json by scripts/package.sh. */
const VERSION = "1.6.0";

const getSettings = callable<[], Partial<Settings>>("get_settings");
const setSettings = callable<[settings: Settings], boolean>("set_settings");

/** Some Steam class modules load lazily (e.g. home shelves), so keep looking for a while after start. */
const RESOLVE_RETRY_MS = 5000;
const RESOLVE_RETRY_MAX = 24;

let settings: Settings = DEFAULT_SETTINGS;
let classes: ResolvedClasses = resolveClasses();
let retryTimer: number | undefined;
let unloaded = false;

const HOME_ROUTE = "/library/home";
const LibraryRoute = () => <Ps5Shell initialTab="library" />;
type RoutePatch = Parameters<typeof routerHook.addPatch>[1];
let homePatch: RoutePatch | undefined;

/** Swaps Steam's home for the PS5 one, or puts Steam's back, to match the settings. */
function syncHomePatch() {
  const want = !unloaded && settings.enabled && settings.ps5Home;
  if (want && !homePatch) {
    homePatch = routerHook.addPatch(HOME_ROUTE, (props) => ({
      ...props,
      children: (
        <Fallback fallback={props.children}>
          <Ps5Shell initialTab="games" />
        </Fallback>
      ),
      component: undefined,
      render: undefined,
    }));
  } else if (!want && homePatch) {
    routerHook.removePatch(HOME_ROUTE, homePatch);
    homePatch = undefined;
  }
}

function render() {
  setCurrentSettings(settings);
  syncHomePatch();
  if (unloaded) return;
  if (settings.enabled) applyCss(buildCss(settings, classes.sel), settings.palette ? accentColor(settings.accent) : null);
  else removeCss();
}

function startClassRetry() {
  let tries = 0;
  retryTimer = window.setInterval(() => {
    tries++;
    // Rescan webpack: Steam loads some modules (and extra copies of others) only when they're first shown.
    const next = resolveClasses(true);
    if (buildCss(settings, next.sel) !== buildCss(settings, classes.sel)) {
      classes = next;
      render();
    }
    if (tries >= RESOLVE_RETRY_MAX) {
      window.clearInterval(retryTimer);
      retryTimer = undefined;
    }
  }, RESOLVE_RETRY_MS);
}

function update(patch: Partial<Settings>) {
  settings = { ...settings, ...patch };
  render();
  setSettings(settings).catch((e) => console.error("[ps5-dashboard] save failed", e));
}

function Content() {
  const [st, setSt] = useState<Settings>(settings);
  const change = (patch: Partial<Settings>) => {
    update(patch);
    setSt(settings);
  };

  return (
    <>
      <PanelSection>
        <PanelSectionRow>
          <ToggleField
            label={t.enableLabel}
            description={t.enableDesc}
            checked={st.enabled}
            onChange={(enabled) => change({ enabled })}
          />
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title={t.screensSection}>
        <PanelSectionRow>
          <ToggleField
            label={t.homeLabel}
            description={t.homeDesc}
            checked={st.ps5Home}
            onChange={(ps5Home) => change({ ps5Home })}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ToggleField
            label={t.infoCardsLabel}
            description={t.infoCardsDesc}
            checked={st.infoCards}
            onChange={(infoCards) => change({ infoCards })}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ToggleField
            label={t.hltbLabel}
            description={t.hltbDesc}
            checked={st.hltb}
            onChange={(hltb) => change({ hltb })}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => Navigation.Navigate(LIBRARY_ROUTE)}>
            {t.openLibrary}
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title={t.lookSection}>
        <PanelSectionRow>
          <ToggleField
            label={t.paletteLabel}
            description={t.paletteDesc}
            checked={st.palette}
            onChange={(palette) => change({ palette })}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <DropdownItem
            label={t.accentLabel}
            rgOptions={ACCENTS.map((a) => ({ data: a.id, label: a.label }))}
            selectedOption={st.accent}
            onChange={(o) => change({ accent: o.data })}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <DropdownItem
            label={t.backgroundLabel}
            rgOptions={[
              { data: "art", label: t.bgArt },
              { data: "gradient", label: t.bgGradient },
              { data: "dark", label: t.bgDark },
            ]}
            selectedOption={st.background}
            onChange={(o) => change({ background: o.data as BackgroundMode })}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <DropdownItem
            label={t.focusLabel}
            rgOptions={[
              { data: "white", label: t.focusWhite },
              { data: "accent", label: t.focusAccent },
            ]}
            selectedOption={st.focus}
            onChange={(o) => change({ focus: o.data as FocusStyle })}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <SliderField
            label={t.heroSpaceLabel}
            description={t.heroSpaceDesc}
            value={st.heroSpace}
            min={0}
            max={40}
            step={2}
            showValue
            valueSuffix="vh"
            onChange={(heroSpace) => change({ heroSpace })}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <SliderField
            label={t.radiusLabel}
            value={st.radius}
            min={0}
            max={24}
            step={1}
            showValue
            valueSuffix="px"
            onChange={(radius) => change({ radius })}
          />
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title={t.layoutSection}>
        <PanelSectionRow>
          <ToggleField
            label={t.controlCenterLabel}
            description={t.controlCenterDesc}
            checked={st.controlCenter}
            onChange={(controlCenter) => change({ controlCenter })}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ToggleField
            label={t.cleanHomeLabel}
            description={t.cleanHomeDesc}
            checked={st.hideShelves}
            onChange={(hideShelves) => change({ hideShelves })}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ToggleField
            label={t.fontLabel}
            checked={st.font}
            onChange={(font) => change({ font })}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => change({ ...DEFAULT_SETTINGS })}>
            {t.resetDefaults}
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title={t.supportSection}>
        <PanelSectionRow>
          <div style={{ fontSize: "12px", opacity: 0.8, marginBottom: "6px" }}>
            {t.supportText}
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={openDonate}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <FaCoffee /> Buy Me a Coffee
            </span>
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <div style={{ fontSize: "11px", opacity: 0.55, textAlign: "center", width: "100%" }}>PS5 Dashboard v{VERSION}</div>
        </PanelSectionRow>
      </PanelSection>
    </>
  );
}

export default definePlugin(() => {
  unloaded = false;
  routerHook.addRoute(LIBRARY_ROUTE, LibraryRoute, { exact: true });
  startClassRetry();
  // Render only once stored settings are in, so a disabled theme never flashes on at boot.
  getSettings()
    .then((stored) => {
      settings = withDefaults(stored);
    })
    .catch((e) => console.error("[ps5-dashboard] load failed", e))
    .finally(render);

  return {
    name: "PS5 Dashboard",
    titleView: <div className={staticClasses.Title}>PS5 Dashboard</div>,
    content: <Content />,
    icon: <FaPlaystation />,
    onDismount() {
      unloaded = true;
      if (retryTimer !== undefined) window.clearInterval(retryTimer);
      syncHomePatch();
      routerHook.removeRoute(LIBRARY_ROUTE);
      removeCss();
    },
  };
});
