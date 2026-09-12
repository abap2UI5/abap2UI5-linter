/*
 * The 2026-09-12 round - the five checks promoted out of samples-controls's
 * pattern-lint (they rest on ABAP, ABAP Doc and reconstructor facts, not on
 * corpus policy) and the IF-shaped dispatcher `event-without-handler` reads.
 * Fixtures: test/fixtures/corpuspolicy.clas.abap (the five, once each) and
 * ifdispatch.clas.abap (one raised event per dispatcher spelling, plus one
 * dead one). See test/review/README.md for the harness.
 */
import fs from 'fs';
import { applyFixes } from '../../lib/fix.mjs';
import { checkSourceRules } from '../observe.mjs';

export default async function ({ section, assert, f, checkAbapSource }) {
  const opts = { render: false, properties: true };
  const policy = fs.readFileSync(f('corpuspolicy.clas.abap'), 'utf8');
  const dispatch = fs.readFileSync(f('ifdispatch.clas.abap'), 'utf8');
  const lineOf = (src, needle) => src.slice(0, src.indexOf(needle)).split('\n').length;
  const found = (findings, type) => findings.filter((x) => x.type === type);

  section('policy: unbound-public-attribute - PUBLIC state no binding reaches, distinct from the unused sibling', () => {
    const r = checkAbapSource(policy, opts);
    const unbound = found(r.findings, 'unbound-public-attribute');
    assert(unbound.length === 1 && unbound[0].member === 'mv_state', `mv_state is used in ABAP and bound by nothing (${unbound.map((x) => x.member).join(',')})`);
    assert(unbound[0].severity === 'warning' && unbound[0].line === lineOf(policy, 'DATA mv_state'), 'a warning, on the declaration');
    // mv_text through _bind( ), mv_flag through b =, mo_ref is a reference, mv_dead appears once
    assert(!unbound.some((x) => ['mv_text', 'mv_flag', 'mo_ref', 'mv_dead'].includes(x.member)), 'a bound name, a reference and a name that appears once are not this rule\'s');
    const unused = found(r.findings, 'unused-public-attribute').map((x) => x.member);
    assert(unused.includes('mv_dead') && !unused.includes('mv_state'), 'the unused sibling keeps its own case and does not double-report');
    const helper = policy.replace(/INTERFACES z2ui5_if_app\.\n/, '');
    assert(found(checkAbapSource(helper, { ...opts, allClasses: true }).findings, 'unbound-public-attribute').length === 0,
      'a class that is not an app has no model to be shipped into - silent');
  });

  section('policy: default-key-table - the implicit default key, DATA and TYPES alike, keyed and non-standard tables silent', () => {
    const r = checkAbapSource(policy, opts);
    const hits = found(r.findings, 'default-key-table');
    assert(hits.map((x) => x.member).sort().join(',') === 'mt_bare,mt_std,ty_t_rows',
      `the bare TABLE OF, the bare STANDARD TABLE OF and the TYPES form (${hits.map((x) => x.member).join(',')})`);
    assert(hits.every((x) => x.severity === 'warning' && !x.fixes), 'warnings without a fix - EMPTY KEY and a real key are different tables');
    assert(hits.find((x) => x.member === 'mt_std').line === lineOf(policy, 'mt_std  TYPE'), 'positioned on the declaration inside the chain');
    assert(!hits.some((x) => ['mt_ok', 'mt_keyed', 'mt_sorted', 'ty_t_named'].includes(x.member)),
      'EMPTY KEY, NON-UNIQUE KEY, a SORTED table and an explicit DEFAULT KEY are all keyed');
    // reaches a helper class under --all-classes: it lives in checkAbapHygiene( )
    const helper = 'CLASS zcl_h DEFINITION PUBLIC.\n  PUBLIC SECTION.\n    DATA mt_x TYPE TABLE OF string.\nENDCLASS.\nCLASS zcl_h IMPLEMENTATION.\nENDCLASS.\n';
    assert(found(checkSourceRules(helper), 'default-key-table').length === 1, 'checkSourceRules( ) reports it for a class that builds no view');
  });

  section('policy: abapdoc-html-tag - a raw tag in a "! line, the ABAP Doc markup tags exempt', () => {
    const r = checkAbapSource(policy, opts);
    const hits = found(r.findings, 'abapdoc-html-tag');
    assert(hits.length === 1 && hits[0].member === 'name', `<name> is reported, <em> is markup (${hits.map((x) => x.member).join(',')})`);
    assert(hits[0].line === 3 && hits[0].severity === 'warning', 'on the ABAP Doc line, a warning');
    const plainComment = policy.replace('"! The app that carries every corpus-policy defect once: a <name> in its', '" a plain comment with a <name> is not ABAP Doc');
    assert(found(checkAbapSource(plainComment, opts).findings, 'abapdoc-html-tag').length === 0, 'a plain " comment is not judged');
    const marked = policy.replace('a <name> in its', 'a <p class="shorttext synchronized" lang="en">name</p> in its');
    assert(found(checkAbapSource(marked, opts).findings, 'abapdoc-html-tag').length === 0, 'the synchronized short-text marker is markup');
  });

  section('policy: event-arg-default-index - both spellings of the default, with the deleting fix', () => {
    const r = checkAbapSource(policy, opts);
    const hits = found(r.findings, 'event-arg-default-index');
    assert(hits.length === 2 && hits.every((x) => x.severity === 'hint' && x.fixes?.length === 1), `get_event_arg( 1 ) and get_event_arg( v = 1 ), both fixable (${hits.length})`);
    assert(!r.findings.some((x) => x.type === 'event-arg-default-index' && x.line === lineOf(policy, 'get_event_arg( 2 )') && x.column > 40),
      'get_event_arg( 2 ) on the same line is not the default');
    const out = applyFixes(policy, hits).output;
    assert(!/get_event_arg\(\s*(?:v\s*=\s*)?1\s*\)/.test(out) && (out.match(/get_event_arg\( \)/g) || []).length === 2,
      'both calls read get_event_arg( ) afterwards');
    assert(out.includes('get_event_arg( 2 )'), 'the second-position read is untouched');
    assert(found(checkAbapSource(out, opts).findings, 'event-arg-default-index').length === 0, 'the fixed source is clean');
  });

  section('policy: client-handle-capture - an inline declaration or an assignment holding a handle, the inline write not', () => {
    const r = checkAbapSource(policy, opts);
    const hits = found(r.findings, 'client-handle-capture');
    assert(hits.map((x) => `${x.member}=${x.value}`).sort().join(',') === 'lv_captured=_bind,lv_later=_event',
      `DATA(lv_captured) = _bind( ) and lv_later = _event( ) (${hits.map((x) => x.member).join(',')})`);
    assert(hits.every((x) => x.severity === 'warning'), 'a warning: the attribute written from the variable vanishes from every gate');
    assert(hits[0].line === lineOf(policy, 'DATA(lv_captured)'), 'on the capturing statement');
    // the fact the rule states: the Input built from lv_captured has no value in the reconstructed document
    assert(r.docs.some((d) => /<Input enabled="[^"]*"\/>/.test(d) || /<Input(?![^>]*value=)[^>]*>/.test(d)), 'the reconstructed Input carries no value attribute');
    assert(r.docs.some((d) => d.includes('text="{/MV_TEXT}"')), 'the inline _bind( ) two lines below it - a continuation line starting with v = - is resolved');
  });

  section('policy: event-without-handler reads the IF-shaped dispatcher in every spelling', () => {
    const r = checkAbapSource(dispatch, opts);
    const dead = found(r.findings, 'event-without-handler');
    assert(dead.length === 1 && dead[0].value === 'DEAD', `only DEAD is unhandled (${dead.map((x) => x.value).join(',')})`);
    // SAVE: IF … = `X`;  RESET / CLEAR: ELSEIF … = 'X' OR … = |X|;  DONE: literal on the left;  GONE: EQ
    assert(!dead.some((x) => ['SAVE', 'RESET', 'CLEAR', 'DONE', 'GONE'].includes(x.value)), 'IF, ELSEIF, OR, the reversed comparand and EQ are all handlers');
    assert(!r.findings.some((x) => x.type === 'separate-lifecycle-ifs' || x.type === 'redundant-init-display'), 'the fixture\'s lifecycle is the canonical one');
  });
}
