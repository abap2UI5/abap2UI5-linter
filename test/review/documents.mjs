/*
 * The 2026-09-12 round - the four DOCUMENT-level view rules (lib/properties.mjs
 * `checkDocument`): a declared prefix nothing uses, a class token nothing
 * defines, an absolute link with no target, and a plain-http asset on an
 * https page. Fixtures: test/fixtures/docrules.clas.abap (the builder form)
 * and docrules.view.xml (the raw-XML form). See test/review/README.md for the
 * harness.
 */
import fs from 'fs';
import { applyFixes } from '../../lib/fix.mjs';
import { definedCssClasses, isUi5Class, UI5_CLASS_PREFIXES } from '../../lib/css-classes.mjs';

export default async function ({ section, assert, f, checkAbapSource, checkXmlSource }) {
  const opts = { render: false, properties: true };
  const abap = fs.readFileSync(f('docrules.clas.abap'), 'utf8');
  const xml = fs.readFileSync(f('docrules.view.xml'), 'utf8');
  const lineOf = (src, needle, nth = 0) => {
    let at = -1;
    for (let i = 0; i <= nth; i++) at = src.indexOf(needle, at + 1);
    return src.slice(0, at).split('\n').length;
  };
  const found = (findings, type) => findings.filter((x) => x.type === type);

  section('documents: an xmlns prefix nothing uses is reported once per declaration, the used ones and the default never', () => {
    const r = checkAbapSource(abap, opts);
    const hits = found(r.findings, 'unused-namespace-declaration');
    assert(hits.map((x) => x.member).sort().join(',') === 'f,l,uxap',
      `f, l and uxap are the stale prefixes (${hits.map((x) => x.member).join(',')})`);
    assert(hits.every((x) => x.severity === 'hint'), 'a stale declaration is a hint');
    assert(hits.every((x) => x.control === 'View'), 'the finding names the root it sits on');
    // mvc is the root's own prefix, core is used in-name (core:HTML), app by an attribute (app:role)
    assert(!hits.some((x) => ['mvc', 'core', 'app'].includes(x.member)), 'a prefix used by a tag name or an attribute name is not stale');
    assert(hits.find((x) => x.member === 'f').line === lineOf(abap, '`xmlns:f`'), 'the finding sits on the declaring write');
  });

  section('documents: the unused-namespace fix deletes the declaring line only when the call has the line to itself', () => {
    const r = checkAbapSource(abap, opts);
    const hits = found(r.findings, 'unused-namespace-declaration');
    const byPrefix = Object.fromEntries(hits.map((x) => [x.member, x]));
    assert(byPrefix.f.fixes?.length === 1, 'the house-layout line (closing paren on the next line) carries a fix');
    assert(!byPrefix.l.fixes && !byPrefix.uxap.fixes, 'two declarations sharing a line carry none - deleting either would be a guess');
    const out = applyFixes(abap, hits).output;
    assert(!out.includes('`xmlns:f`'), 'the f declaration is gone');
    assert(out.includes('`xmlns:l`') && out.includes('`xmlns:uxap`'), 'the shared line is untouched');
    assert(out.split('\n').length === abap.split('\n').length - 1, 'exactly one line was removed, no blank left behind');
    const again = checkAbapSource(out, opts);
    assert(found(again.findings, 'unused-namespace-declaration').map((x) => x.member).sort().join(',') === 'l,uxap',
      'the fixed source still reconstructs and reports only the two unfixable ones');
    assert(found(again.findings, 'undeclared-namespace').length === 0 && found(again.findings, 'excess-shut').length === 0,
      'the chain stays balanced after the deletion');
  });

  section('documents: a class token is judged against UI5\'s prefixes and the document\'s own <style> blocks', () => {
    const r = checkAbapSource(abap, opts);
    const hits = found(r.findings, 'undefined-css-class');
    assert(hits.length === 1 && hits[0].value === 'undefinedBox', `only undefinedBox is undefined (${hits.map((x) => x.value).join(',')})`);
    assert(hits[0].control === 'sap.m.Page' && hits[0].member === 'class' && hits[0].severity === 'hint', 'control, member and severity');
    // sapUiSmallMargin is UI5's, demoBox and inner are defined by the core:HTML stylesheet, the Input's class is bound
    assert(!hits.some((x) => ['sapUiSmallMargin', 'demoBox', 'inner'].includes(x.value)), 'UI5 and stylesheet-defined tokens stay silent');
    const noStyle = abap.replace(/<style>.*?<\/style>/, '');
    const bare = found(checkAbapSource(noStyle, opts).findings, 'undefined-css-class').map((x) => x.value).sort();
    assert(bare.join(',') === 'demoBox,inner,undefinedBox', `with no stylesheet every custom token is undefined (${bare.join(',')})`);
    const runtime = abap.replace(/v = `<style>.*?<\/style>`/, 'v = mv_text');
    assert(found(checkAbapSource(runtime, opts).findings, 'undefined-css-class').length === 0,
      'a stylesheet the reconstructor cannot follow makes the document unjudged rather than reported');
  });

  section('documents: the css-classes knowledge file - the harvested prefixes and the selector reader', () => {
    assert(UI5_CLASS_PREFIXES.includes('sapUi') && UI5_CLASS_PREFIXES.includes('sapM') && UI5_CLASS_PREFIXES.includes('sapUxAP'),
      'the three big families are listed');
    assert(isUi5Class('sapUiSizeCompact') && isUi5Class('sapMTB') && isUi5Class('sapContrastPlus') && !isUi5Class('sapuismallmargin') && !isUi5Class('demoBox'),
      'prefix match is case-sensitive, like the class names');
    const defined = definedCssClasses('<style>.a \\{x\\} .b.c > .d-e \\{ y \\} #id \\{ z \\}</style> text <style>.f{}</style>');
    assert([...defined].sort().join(',') === 'a,b,c,d-e,f', `every dot-prefixed selector of every block (${[...defined].join(',')})`);
    assert(definedCssClasses('no stylesheet here') === null && definedCssClasses('<style></style>').size === 0,
      'null for no block at all, an empty set for an empty one');
  });

  section('documents: an absolute href with no target is reported, paired with its own target attribute', () => {
    const r = checkAbapSource(abap, opts);
    const hits = found(r.findings, 'external-link-without-target');
    assert(hits.length === 2, `two links leave the page without a target (${hits.length})`);
    assert(hits.some((x) => x.control === 'sap.m.Link' && x.member === 'href' && x.value === 'http://sap.com'), 'the Link with no target');
    assert(hits.some((x) => x.control === 'sap.m.ObjectHeader' && x.member === 'introHref'), 'introHref against introTarget');
    assert(!hits.some((x) => x.member === 'titleHref'), 'titleHref with a titleTarget is fine');
    assert(!hits.some((x) => x.value === 'https://sap.com' && x.member === 'href'), 'the Link with target="_blank" is fine');
    assert(hits.every((x) => x.severity === 'hint'), 'a navigation the author wrote is a hint');
  });

  section('documents: a plain-http URI is an error where the browser loads it and a hint where it navigates', () => {
    const r = checkAbapSource(abap, opts);
    const hits = found(r.findings, 'insecure-asset-url');
    const img = hits.find((x) => x.control === 'sap.m.Image');
    const link = hits.find((x) => x.control === 'sap.m.Link');
    assert(hits.length === 2 && img && link, `the http image and the http link (${hits.length})`);
    assert(img.severity === 'error' && img.member === 'src', 'a loaded asset is blocked as mixed content: error');
    assert(link.severity === 'hint' && link.member === 'href', 'a navigated href only warns in the browser: hint');
    assert(link.line === lineOf(abap, '`http://sap.com`'), 'positioned on the write');
    assert(!hits.some((x) => String(x.value).startsWith('https')), 'https is never reported');
    const introHttp = abap.replace('n = `introHref` v = `https://sap.com`', 'n = `introHref` v = `http://sap.com`');
    const intro = found(checkAbapSource(introHttp, opts).findings, 'insecure-asset-url').find((x) => x.member === 'introHref');
    assert(intro && intro.severity === 'hint', 'the ObjectHeader\'s introHref is a hyperlink too');
  });

  section('documents: the raw-XML form of all four', () => {
    const r = checkXmlSource(xml, { ...opts, file: f('docrules.view.xml') });
    const ns = found(r.findings, 'unused-namespace-declaration');
    assert(ns.map((x) => x.member).sort().join(',') === 'f,l', `xmlns:l and xmlns:f are stale, core (a tag) and template (an attribute) are not (${ns.map((x) => x.member).join(',')})`);
    assert(ns.every((x) => !x.fixes), 'no fix on XML - its declaration grammar is its own');
    assert(ns.every((x) => x.line === 1), 'positioned on the root line');
    const css = found(r.findings, 'undefined-css-class');
    assert(css.length === 1 && css[0].value === 'myPage', 'myPage is undefined, sapUiContentPadding is UI5\'s');
    const links = found(r.findings, 'external-link-without-target');
    assert(links.length === 1 && links[0].line === 4, 'one absolute link without a target; the targeted, relative and bound ones are silent');
    const http = found(r.findings, 'insecure-asset-url');
    assert(http.length === 1 && http[0].control === 'sap.m.Image' && http[0].severity === 'error', 'the http image');
  });
}
