/**
 * Repaints Steam with the PlayStation 5 palette. Steam hardcodes its colors in thousands of
 * rules, so this edits the window's own stylesheets: Steam's blue and green become the accent
 * color and its slate greys become the PS5's deeper, cooler near-blacks. Editing in place keeps
 * the cascade exactly as Steam wrote it and adds no CSS for the browser to parse.
 */

const COLOR_PROPS =
  /^(color|background-color|background-image|border-(top|right|bottom|left)-color|outline-color|box-shadow|text-shadow|fill|stroke|caret-color|text-decoration-color|--.*)$/;
const COLOR_TOKEN = /rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}\b/g;

type RGBA = [number, number, number, number];
type HSL = [number, number, number];

function parse(token: string): RGBA | null {
  if (token[0] === "#") {
    let h = token.slice(1);
    if (h.length === 3 || h.length === 4) h = [...h].map((x) => x + x).join("");
    if (h.length !== 6 && h.length !== 8) return null;
    const n = parseInt(h.slice(0, 6), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1];
  }
  const m = token.match(/[\d.]+%?/g);
  if (!m || m.length < 3) return null;
  const alpha = m[3] === undefined ? 1 : m[3].endsWith("%") ? parseFloat(m[3]) / 100 : parseFloat(m[3]);
  return [parseFloat(m[0]), parseFloat(m[1]), parseFloat(m[2]), alpha];
}

function toHsl([r, g, b]: RGBA): HSL {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function fromHsl([h, s, l]: HSL): [number, number, number] {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const rgba = ([r, g, b]: [number, number, number], a: number) => (a >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${+a.toFixed(3)})`);

/** Lightness Steam's main blue (#1a9fff) sits at; other blues are shifted relative to it. */
const STEAM_BLUE_L = 0.55;

/** Text drawn in the accent color must stay readable on the PS5's dark greys. */
const TEXT_PROPS = /^(color|fill|caret-color|text-decoration-color)$/;
const TEXT_MIN_L = 0.5;

/** The PS5's greys: a faint blue cast, a little darker than Steam's. */
const PS_GREY_HUE = 222;
const PS_GREY_SAT = 0.14;
const PS_GREY_DARKEN = 0.82;

function makeMapper(accentHex: string) {
  const accent = toHsl(parse(accentHex) ?? [0, 112, 209, 1]);
  return (token: string, prop: string): string => {
    const c = parse(token);
    if (!c) return token;
    const [h, s, l] = toHsl(c);
    const isBlue = s >= 0.45 && h >= 185 && h <= 235;
    const isGreen = s >= 0.35 && h >= 80 && h <= 140;
    if ((isBlue || isGreen) && l >= 0.3 && l < 0.85) {
      let nl = clamp(accent[2] + (l - STEAM_BLUE_L) * 0.9, 0.22, 0.92);
      if (TEXT_PROPS.test(prop)) nl = Math.max(nl, TEXT_MIN_L);
      return rgba(fromHsl([accent[0], accent[1], nl]), c[3]);
    }
    // Steam's slate greys and its darkest blues: the PS5 keeps a cool tint but goes deeper and less saturated.
    if ((isBlue && l < 0.3) || (s > 0.04 && s < 0.45 && h >= 185 && h <= 240)) {
      return rgba(fromHsl([PS_GREY_HUE, Math.min(s, PS_GREY_SAT), l * PS_GREY_DARKEN]), c[3]);
    }
    return token;
  };
}

interface Edit {
  style: CSSStyleDeclaration;
  prop: string;
  original: string;
  priority: string;
}

interface DocState {
  accent: string;
  sheetCount: number;
  done: WeakSet<CSSStyleSheet>;
  edits: Edit[];
}

const states = new Map<Document, DocState>();

function repaintStyle(style: CSSStyleDeclaration, map: ReturnType<typeof makeMapper>, edits: Edit[]) {
  for (let i = 0; i < style.length; i++) {
    const prop = style[i];
    if (!COLOR_PROPS.test(prop)) continue;
    const value = style.getPropertyValue(prop);
    if (!value.match(COLOR_TOKEN)) continue;
    const next = value.replace(COLOR_TOKEN, (t) => map(t, prop));
    if (next === value) continue;
    const priority = style.getPropertyPriority(prop);
    edits.push({ style, prop, original: value, priority });
    style.setProperty(prop, next, priority);
  }
}

function repaintRules(rules: CSSRuleList, map: ReturnType<typeof makeMapper>, edits: Edit[]) {
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i] as CSSRule & { style?: CSSStyleDeclaration; cssRules?: CSSRuleList };
    if (rule.style) repaintStyle(rule.style, map, edits);
    // @media, @supports and @keyframes hold their own rules (keyframe steps have a .style too).
    if (rule.cssRules) repaintRules(rule.cssRules, map, edits);
  }
}

/**
 * Repaints a window's stylesheets in place: no copy of Steam's CSS is added, the existing
 * declarations get their colors swapped. Only sheets not seen before are walked, so calling this
 * on every keepalive tick costs one length check unless Steam loaded a new sheet.
 */
export function repaint(doc: Document, accentHex: string, skip: Element | null) {
  let st = states.get(doc);
  if (st && st.accent !== accentHex) {
    restore(doc);
    st = undefined;
  }
  if (st && st.sheetCount === doc.styleSheets.length) return;
  if (!st) {
    st = { accent: accentHex, sheetCount: 0, done: new WeakSet(), edits: [] };
    states.set(doc, st);
  }
  const map = makeMapper(accentHex);
  for (const sheet of Array.from(doc.styleSheets)) {
    if (st.done.has(sheet) || (skip && sheet.ownerNode === skip)) continue;
    st.done.add(sheet);
    try {
      repaintRules(sheet.cssRules, map, st.edits);
    } catch {
      // Cross-origin sheet; its rules can't be read.
    }
  }
  st.sheetCount = doc.styleSheets.length;
}

/** Puts back every color the repaint changed in this window. */
export function restore(doc: Document) {
  const st = states.get(doc);
  if (!st) return;
  for (const e of st.edits) {
    try {
      e.style.setProperty(e.prop, e.original, e.priority);
    } catch {
      // The sheet is gone (window closed or Steam replaced it); nothing to put back.
    }
  }
  states.delete(doc);
}

export function restoreAll() {
  for (const doc of [...states.keys()]) restore(doc);
}

/** Forgets windows Steam has closed, so their stylesheets can be freed. */
export function prune() {
  for (const doc of [...states.keys()]) if (!doc.defaultView) states.delete(doc);
}
