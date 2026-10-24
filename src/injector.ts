import { findSP } from "@decky/ui";

import { prune, repaint, restore, restoreAll } from "./palette";

const STYLE_ID = "ps5-dashboard-theme";
/** Game Mode windows to style: the main UI, Quick Access and the Steam menu. Desktop windows are left alone. */
const POPUP_NAME = /^(SP(?! Desktop)|QuickAccess|MainMenu)/;
const KEEPALIVE_MS = 2000;

let css = "";
/** Accent color for the PS5 repaint of Steam's own colors, or null to leave them alone. */
let paletteAccent: string | null = null;
let timer: number | undefined;

function targetDocuments(): Document[] {
  const docs = new Set<Document>();
  try {
    const sp = findSP();
    if (sp?.document) docs.add(sp.document);
  } catch {
    // findSP throws while Game Mode's main window doesn't exist yet.
  }
  try {
    const popups: Map<string, any> | undefined = (window as any).g_PopupManager?.m_mapPopups;
    popups?.forEach((popup, name) => {
      const doc: Document | undefined = popup?.m_popup?.document;
      if (doc && POPUP_NAME.test(name)) docs.add(doc);
    });
  } catch {
    // Popup manager internals changed; the main window above is still covered.
  }
  return [...docs];
}

/** Puts the theme in every target window (re-adding it to windows Steam recreated) and repaints new Steam sheets. */
function sync() {
  for (const doc of targetDocuments()) {
    if (!doc.head) continue;
    let el = doc.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!el) {
      el = doc.createElement("style");
      el.id = STYLE_ID;
      doc.head.appendChild(el);
    }
    if (el.textContent !== css) el.textContent = css;
    if (paletteAccent) repaint(doc, paletteAccent, el);
    else restore(doc);
  }
  prune();
}

export function applyCss(next: string, accent: string | null) {
  css = next;
  paletteAccent = accent;
  sync();
  if (timer === undefined) timer = window.setInterval(sync, KEEPALIVE_MS);
}

export function removeCss() {
  if (timer !== undefined) {
    window.clearInterval(timer);
    timer = undefined;
  }
  css = "";
  paletteAccent = null;
  restoreAll();
  for (const doc of targetDocuments()) doc.getElementById(STYLE_ID)?.remove();
}
