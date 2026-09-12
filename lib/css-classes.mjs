/*
 * css-classes — which CSS class tokens UI5 itself renders, and which a view
 * defines for itself.
 *
 * A `class` attribute on a control adds the token to the control's root DOM
 * element. Three things can define what it means: UI5's own stylesheets
 * (`sapUiSmallMargin`, `sapMTB`), a `<style>` block the view injects through a
 * `core:HTML` content attribute, and CSS shipped from OUTSIDE the class — an
 * app that serves its own stylesheet, a custom theme. The rule
 * (`undefined-css-class` in properties.mjs) knows the first two and cannot see
 * the third, which is why it is a hint.
 *
 * HOW THE PREFIX LIST WAS DERIVED (2026-09-12, OpenUI5 1.152 sources under
 * samples-controls/node_modules/@openui5 — sap.f, sap.m, sap.tnt,
 * sap.ui.codeeditor, sap.ui.core, sap.ui.integration, sap.ui.layout,
 * sap.ui.table, sap.ui.unified, sap.uxap, themelib_sap_horizon):
 *
 *   1. every class SELECTOR in the LESS/CSS sources — `\.sap[A-Z][A-Za-z0-9]*`
 *   2. every class NAME a renderer or control writes — the string argument of
 *      `class( )`, `addClass( )`, `addStyleClass( )`, `toggleStyleClass( )`,
 *      `hasStyleClass( )`, `writeClasses( )`, plus every quoted
 *      `"sapXxx sapYyy"` string literal in the JS
 *
 *   5,148 distinct tokens. Their leading segment (the `sap` prefix up to the
 *   next capital) groups them almost completely: sapM 2,353, sapUi 2,066,
 *   sapF 434, sapUxAP 144, sapTnt 72, sapUshell 11, sapTheme 10, sapSuite 7,
 *   sapContrast 2 (the theme-parameter names, `sapButton_Background` and the
 *   like, are NOT classes and were excluded by reading selectors and class
 *   writes only). The list below is those families plus the handful of
 *   library-owned singletons that a view legitimately names (`sapIllus`,
 *   `sapMe`, `sapUnified`, `sapViz`, `sapMdc`, `sapSmart`, `sapCEd`) — a
 *   prefix, not an enumeration, because the family is what UI5 owns and a
 *   new class inside it must not become a finding on the next release.
 *
 *   Everything the harvest turned up that is NOT here is either a theme
 *   parameter, a debug/support-tool class (`sapDbg…`, `sapUISupport…`) or a
 *   one-off in the bootstrap (`sapAllowlistService`), none of which a view
 *   writes into `class`.
 *
 * Not gated by check-upstream: the source is UI5, not abap2UI5, and a family
 * prefix moves only when SAP starts a new library — the same day its controls
 * enter data/properties.json, which is the regeneration to add it in.
 */

/** The class families UI5's own stylesheets define, as prefixes. Compared
 *  case-SENSITIVELY: `sapUiSmallMargin` is a class and `sapuismallmargin` is
 *  not — CSS class names are case-sensitive in every browser. */
export const UI5_CLASS_PREFIXES = Object.freeze([
  'sapM',        // sap.m
  'sapUi',       // sap.ui.core, sap.ui.layout, sap.ui.table, sap.ui.unified, the margin/padding utilities, sapUiSizeCompact/Cozy
  'sapF',        // sap.f
  'sapUxAP',     // sap.uxap
  'sapTnt',      // sap.tnt
  'sapUshell',   // the Fiori launchpad shell classes a themed control may carry
  'sapTheme',    // sapThemeBrand, sapThemeText, … the theme-colour helper classes
  'sapContrast', // sapContrast, sapContrastPlus
  'sapSuite',    // sap.suite.ui.*
  'sapIllus',    // sap.m.IllustratedMessage's SVG classes
  'sapMe',       // sap.me (deprecated, still rendered)
  'sapUnified',  // sap.ui.unified colour picker
  'sapViz',      // sap.viz
  'sapMdc',      // sap.ui.mdc
  'sapSmart',    // sap.ui.comp smart controls
  'sapCEd',      // sap.ui.codeeditor
]);

/** Whether a class token is one UI5 owns. */
export const isUi5Class = (token) => UI5_CLASS_PREFIXES.some((p) => token.startsWith(p));

/** The tokens of a `class` attribute value, whitespace-separated. */
export const classTokens = (value) => String(value).trim().split(/\s+/).filter(Boolean);

/**
 * Every class a `<style>` block in `text` defines: the `.token` selectors
 * between `<style>` and `</style>`, in every block the text carries. A
 * selector like `.demoBox .inner` or `.sapMBtn.myBtn` contributes each of its
 * class tokens. An escaped brace (`\{`, the way an ABAP view writes CSS so the
 * XMLView parser does not read a binding) does not get in the way — only the
 * dot-prefixed identifiers are read. Returns `null` when there is no style
 * block at all, so a caller can tell "no stylesheet" from "a stylesheet that
 * defines nothing".
 */
export function definedCssClasses(text) {
  const s = String(text);
  let defined = null;
  const re = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  for (const m of s.matchAll(re)) {
    defined ??= new Set();
    for (const c of m[1].matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) defined.add(c[1]);
  }
  return defined;
}

/** Whether `text` opens a `<style>` block at all (closed or not). */
export const hasStyleBlock = (text) => /<style\b/i.test(String(text));
