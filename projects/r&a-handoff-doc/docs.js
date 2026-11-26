/* Requests & Approval · handoff docs — the shell every page shares.
   - Top bar: logo + pages in capitals; each page opens its numbered sections (Figma 3313:49654). A menu button on narrow screens.
   - Section tabs: one tab per section on the left, following the scroll; a sticky dropdown under 860px.
   - Live frames ([data-live]): the real prototype in an iframe you can resize.
   - "Create Jira task" at the end of every section: a modal with a ready description, built from the section itself.
   Pages and sections are listed once, here; each page's <section class="panel" id="…"> must match. */
(function () {
  'use strict';

  const DOCS = location.origin + '/';
  const PROTO_PROD = 'https://github.com/itziarmozochica/Resquest-approvals/tree/main/projects/request-%26-approvals-prototype';
  const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const PROTO = LOCAL ? 'http://localhost:6400/project-management/projects' : PROTO_PROD;
  const JIRA = { site: 'https://example.invalid', pid: '', key: 'KEY', board: 'Requests & Approval', types: [] };
  const figmaUrl = (node) => '#' + node;

  /* Each page lists its sections (menu order) and its features. A feature is one Jira task: a piece the developers can
     build and ship, covering one or more sections. "refs" points a section to the task, on another page, that builds it. */
  // The pages menu: two groups (the calendar's parts, then the project's pages) and one 16px line glyph a page, drawn in
// currentColor with a 1.3px stroke. Split is the prototype's own glyph (arrows-left-right-to-line), as a line.
const MENU_GROUPS = [['Project', ['home', 'impact', 'gap', 'versions']]];
const MENU_ICONS = {
  headbar: '<rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M2 6.2h12"/>',
  toolbar: '<path d="M2 4h6M12 4h2M2 8h1.5M7.5 8H14M2 12h7M13 12h1"/><circle cx="10" cy="4" r="1.6"/><circle cx="5.5" cy="8" r="1.6"/><circle cx="11" cy="12" r="1.6"/>',
  grids: '<rect x="2" y="2" width="12" height="12" rx="1.5"/><path d="M6 2v12M10 2v12M2 6h12M2 10h12"/>',
  ranges: '<rect x="2" y="3.2" width="12" height="10.8" rx="1.5"/><path d="M2 6.6h12M5 1.8v2.6M11 1.8v2.6M5 10.2h6"/>',
  display: '<rect x="2" y="2.5" width="12" height="11" rx="1.5"/><path d="M2 6.4h12M6.4 6.4v7.1"/>',
  capacity: '<circle cx="6" cy="5.4" r="2.2"/><path d="M2 13.2c0-2.2 1.8-3.8 4-3.8s4 1.6 4 3.8"/><circle cx="11.6" cy="6" r="1.7"/><path d="M11.8 9.6c1.4.1 2.4 1.3 2.4 3"/>',
  cards: '<rect x="2.5" y="2" width="11" height="12" rx="1.5"/><path d="M5.2 2v12M7.8 5.8h3.2"/>',
  holds: '<rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/>',
  split: '<path d="M2 3v10M14 3v10M4.6 8h6.8M6.6 6l-2 2 2 2M9.4 6l2 2-2 2"/>',
  journey: '<circle cx="3.8" cy="12.2" r="1.5"/><circle cx="12.2" cy="3.8" r="1.5"/><path d="M5.3 12.2H10a2.1 2.1 0 0 0 0-4.2H6a2.1 2.1 0 0 1 0-4.2h4.7"/>',
  panel: '<rect x="2" y="2.5" width="12" height="11" rx="1.5"/><path d="M9.6 2.5v11M11.2 5.6h1.2M11.2 8h1.2"/>',
  alerts: '<path d="M4 11V7.4a4 4 0 0 1 8 0V11l1.2 1.6H2.8z"/><path d="M6.7 14.2a1.4 1.4 0 0 0 2.6 0"/>',
  tooltips: '<path d="M3 3h10a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H8.6L6 13.6V11H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/>',
  shortcuts: '<rect x="1.5" y="4" width="13" height="8" rx="1.5"/><path d="M4.2 6.8h.01M6.7 6.8h.01M9.3 6.8h.01M11.8 6.8h.01M5 9.4h6"/>',
  home: '<path d="M2.4 7.6 8 2.8l5.6 4.8M4 6.6V13.2h8V6.6"/>',
  impact: '<path d="M2.5 2.5v11h11M5 10.2l2.4-3 2 2L13 4.6"/>',
  gap: '<rect x="2.3" y="3" width="4.6" height="10" rx="1"/><path d="M9.1 3h3.6a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H9.1" stroke-dasharray="1.8 1.6"/>',
  versions: '<circle cx="8" cy="8" r="5.7"/><path d="M8 4.8V8l2.2 1.5"/>'
};
const PAGES = [
    { id: 'home', label: 'Home', title: 'Requests & Approval handoff', href: 'index.html', sections: [] },
    { id: 'impact', label: 'Impact', href: 'impact.html', title: 'Impact of Requests & Approval', sections: [
      ['question', 'The question'], ['numbers', 'In numbers'], ['next', 'Next reads']] },
    { id: 'gap', label: 'Gap review', href: 'gap.html', title: 'Gap review', sections: [
      ['start', 'Start here'], ['archived', 'Archived']] },
    { id: 'versions', label: 'Versions', href: 'versions.html', sections: [
      ['r1', 'Release 1']] },
  ];
  const curId = document.body.dataset.page || 'home';
  const cur = PAGES.find(p => p.id === curId) || PAGES[0];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const CHEV = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.84 6.77c.07-.1.17-.15.29-.15.07 0 .16.03.23.1l4.62 4.24 4.64-4.24a.37.37 0 0 1 .52.02c.14.14.14.38-.03.52l-4.87 4.5a.35.35 0 0 1-.5 0L2.87 7.26a.36.36 0 0 1-.03-.49Z" fill="currentColor"/></svg>';
  const ARROW = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 11 11 5M6.5 5H11v4.5" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  window.DOCS = { PROTO, PROTO_PROD, DOCS, figmaUrl, ARROW };
  // The hero's "Open prototype" button: the local prototype (port 6400) on localhost, its GitHub folder elsewhere.
  document.querySelectorAll('a.hero-link').forEach((a) => { a.href = PROTO; });

  /* ================= Top bar ================= */
  // the logo's CALENDAR label is Montserrat Black (Figma 3313:49654)
  if (!document.querySelector('link[data-brand-font]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@900&display=swap'; l.dataset.brandFont = ''; document.head.appendChild(l); }
  const ic = (d) => '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="' + d + '" fill="currentColor"/></svg>';
  const SEARCH = ic('M17.8438 17.1562L13.4062 12.75C14.4062 11.5938 14.9688 10.125 14.9688 8.5C14.9688 4.9375 12.0312 2 8.46875 2C4.875 2 2 4.9375 2 8.5C2 12.0938 4.90625 15 8.46875 15C10.0625 15 11.5312 14.4375 12.6875 13.4375L17.0938 17.875C17.2188 17.9688 17.3438 18 17.5 18C17.625 18 17.75 17.9688 17.8438 17.875C18.0312 17.6875 18.0312 17.3438 17.8438 17.1562ZM8.5 14C5.4375 14 3 11.5312 3 8.5C3 5.46875 5.4375 3 8.5 3C11.5312 3 14 5.46875 14 8.5C14 11.5625 11.5312 14 8.5 14Z');
  const ANGLE_DOWN = '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.9766 10.4219L12.3867 15.4844C12.1758 15.6953 11.8594 15.6953 11.6484 15.4844L5.98828 10.4219C5.74219 10.2109 5.74219 9.85938 5.95313 9.64844C6.16406 9.40234 6.51563 9.40234 6.72656 9.61328L12 14.3242L17.2383 9.61328C17.4492 9.40234 17.8008 9.40234 18.0117 9.64844C18.2227 9.85938 18.2227 10.2109 17.9766 10.4219Z" fill="currentColor"/></svg>';
  let bar = document.getElementById('topbar');   // each page reserves the bar, so nothing jumps when it fills in
  if (!bar) { bar = document.createElement('header'); bar.id = 'topbar'; document.body.prepend(bar); }
  bar.className = 'topbar';
  bar.innerHTML = '<div class="topbar-in">' +
    '<a class="brand" href="index.html" aria-label="Fever Zone Requests &amp; Approval handoff, home"><span class="brand-logo"><img class="logo-light" src="Assets/fever-zone-logo.svg" alt="Fever Zone" width="95" height="20"><img class="logo-dark" src="Assets/fever-zone%20-%20logo%20-%20dark.svg" alt="" width="95" height="20"></span><span class="brand-sep" aria-hidden="true"></span><span class="brand-tag">Requests &amp; Approval</span></a>' +
    '<div class="tools">' +
      '<div class="srch" role="search"><input class="srch-in" type="search" placeholder="Go to page or section" aria-label="Go to page or section" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="false" aria-controls="srch-res" aria-autocomplete="list">' +
        '<button class="tool srch-go" type="button" aria-label="Search pages and sections">' + SEARCH + '</button>' +
        '<ul class="srch-res" id="srch-res" role="listbox" aria-label="Pages and sections" hidden></ul></div>' +
      '<span class="tools-sep" aria-hidden="true"></span>' +
      '<button class="tool mbtn" type="button" aria-expanded="false" aria-controls="mpanel" aria-label="Pages"><span class="burger" aria-hidden="true"><i></i><i></i><i></i></span></button>' +
    '</div>' +
    '<nav class="mpanel" id="mpanel" aria-label="Pages" hidden>' + MENU_GROUPS.map(([title, ids]) => { const ps = PAGES.filter(p => ids ? ids.includes(p.id) : !MENU_GROUPS[0][1].includes(p.id));
      return '<section><h3>' + title + '</h3><ol style="--rows:' + Math.ceil(ps.length / 2) + '">' + ps.map(p => '<li><a href="' + p.href + '"' + (p.id === cur.id ? ' aria-current="page"' : '') + '><svg viewBox="0 0 16 16" aria-hidden="true">' + (MENU_ICONS[p.id] || '') + '</svg><span>' + esc(p.short || p.label) + '</span></a></li>').join('') + '</ol></section>'; }).join('') + '</nav>' +
    '</div>';

  // Menu: the bars open every page in a panel under them and turn into an X; Escape, the X or a click outside closes it
  const mbtn = bar.querySelector('.mbtn'), panel = bar.querySelector('.mpanel');
  const menuOpen = (on, focus) => {
    panel.hidden = !on; mbtn.setAttribute('aria-expanded', on ? 'true' : 'false');   // the three bars turn into the X in CSS
    mbtn.setAttribute('aria-label', on ? 'Close pages' : 'Pages');
    if (on) { searchOpen(false); if (focus) panel.querySelector('a').focus(); }
  };
  mbtn.addEventListener('click', (e) => { e.stopPropagation(); menuOpen(panel.hidden, e.detail === 0); });

  // Search: pages and their sections, by any word of the name; arrows move, Enter goes, Escape clears.
  // On phones the magnifier opens the field across the bar. "/" or Cmd/Ctrl+K jump to it from anywhere.
  const sbox = bar.querySelector('.srch'), sin = bar.querySelector('.srch-in'), sres = bar.querySelector('.srch-res'), sgo = bar.querySelector('.srch-go');
  const INDEX = [];
  PAGES.forEach(p => {
    INDEX.push({ t: p.title || p.label, pg: 'Page', also: p.label, href: p.href, page: true });
    p.sections.forEach(s => INDEX.push({ t: s[1], pg: p.short || p.label, href: p.href + '#' + s[0] }));
  });
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const mark = (t, q) => { const i = norm(t).indexOf(q); return i < 0 ? esc(t) : esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + q.length)) + '</mark>' + esc(t.slice(i + q.length)); };
  let hits = [], sel = -1;
  const phone = () => window.matchMedia('(max-width:860px)').matches;
  const showRes = () => {
    const q = norm(sin.value.trim());
    sbox.classList.toggle('has-q', !!q);
    if (!q) { sres.hidden = true; sin.setAttribute('aria-expanded', 'false'); hits = []; return; }
    const words = q.split(/\s+/);
    hits = INDEX.map(e => { const n = norm(e.t), pn = norm(e.pg + ' ' + (e.also || ''));
        if (!words.every(w => n.includes(w) || pn.includes(w)) || !words.some(w => n.includes(w))) return null;   // a page's name narrows its sections, it never lists them all
        const score = (n.startsWith(q) ? 0 : n.includes(q) ? 1 : 2) + (e.page ? 0 : 0.5);
        return { e, score }; })
      .filter(Boolean).sort((a, b) => a.score - b.score).slice(0, 8).map(x => x.e);
    sel = hits.length ? 0 : -1;
    sres.innerHTML = hits.length ? hits.map((e, i) => '<li><a id="srch-o' + i + '" role="option" href="' + e.href + '"' + (i === sel ? ' aria-selected="true"' : '') + '><span>' + mark(e.t, q) + '</span><span class="pg">' + esc(e.pg) + '</span></a></li>').join('')
      : '<li><span class="none">Nothing found</span></li>';
    sres.hidden = false; sin.setAttribute('aria-expanded', 'true');
    if (sel >= 0) sin.setAttribute('aria-activedescendant', 'srch-o0'); else sin.removeAttribute('aria-activedescendant');
  };
  const moveSel = (d) => {
    if (!hits.length) return;
    sel = (sel + d + hits.length) % hits.length;
    sres.querySelectorAll('a').forEach((a, i) => { if (i === sel) { a.setAttribute('aria-selected', 'true'); a.scrollIntoView({ block: 'nearest' }); } else a.removeAttribute('aria-selected'); });
    sin.setAttribute('aria-activedescendant', 'srch-o' + sel);
  };
  const searchOpen = (on) => {
    if (on) { menuOpen(false); bar.classList.add('searching'); sin.focus(); showRes(); return; }
    bar.classList.remove('searching'); sres.hidden = true; sin.setAttribute('aria-expanded', 'false');
    if (document.activeElement !== sin) { sin.value = ''; sbox.classList.remove('has-q'); }   // closed from outside: the field empties
  };
  const go = (href) => { sin.blur(); searchOpen(false); location.href = href; };
  sin.addEventListener('input', showRes);
  sin.addEventListener('focus', () => { menuOpen(false); showRes(); });
  sin.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); moveSel(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveSel(-1); }
    else if (e.key === 'Enter' && sel >= 0) { e.preventDefault(); go(hits[sel].href); }
  });
  sres.addEventListener('click', (e) => { const a = e.target.closest('a'); if (a) { e.preventDefault(); go(a.getAttribute('href')); } });
  sgo.addEventListener('click', (e) => {
    e.stopPropagation();
    if (phone() && bar.classList.contains('searching') && !sin.value.trim()) { searchOpen(false); return; }
    if (phone()) searchOpen(true); else { sin.focus(); if (sel >= 0 && hits[sel]) go(hits[sel].href); }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.mpanel')) menuOpen(false);
    if (!e.target.closest('.srch')) searchOpen(false);
    if (!e.target.closest('.secdd')) ddOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    const typing = e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"]');
    if ((e.key === '/' && !typing) || (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey))) { e.preventDefault(); phone() ? searchOpen(true) : sin.focus(); return; }
    if (e.key !== 'Escape') return;
    if (!panel.hidden) { menuOpen(false); mbtn.focus(); }
    if (e.target === sin) { if (sin.value) { sin.value = ''; showRes(); } else { sin.blur(); searchOpen(false); if (phone()) sgo.focus(); } }
    if (ddList && !ddList.hidden) { ddOpen(false); ddBtn.focus(); }
  });
  window.addEventListener('resize', () => { if (!phone()) bar.classList.remove('searching'); });

  // Dark over the hero; white once the hero has gone under the bar
  const heroBand = document.querySelector('.hero-band');
  const onScroll = () => {
    const under = heroBand ? heroBand.getBoundingClientRect().bottom <= bar.offsetHeight : window.scrollY > 4;
    bar.classList.toggle('scrolled', under);
  };
  window.addEventListener('scroll', onScroll, { passive: true }); window.addEventListener('resize', onScroll); onScroll();

  /* ================= Section tabs =================
     Every page with sections gets the tabs on the left (one per section, its own title), which follow the scroll and jump on
     a click. Under 860px they become one sticky dropdown that carries the section's title, with a divider between sections. */
  const pageWrap = document.querySelector('.wrap');
  const secs = cur.sections.map(s => document.getElementById(s[0])).filter(Boolean);
  const secTitle = (el) => { const h = el.querySelector('.sec-head h2'); return h ? h.textContent.trim() : (cur.sections.find(s => s[0] === el.id) || ['', el.id])[1]; };
  let ddBtn = null, ddList = null;
  const ddOpen = (on) => { if (!ddList) return; ddList.hidden = !on; ddBtn.setAttribute('aria-expanded', on ? 'true' : 'false'); };
  if (pageWrap && secs.length) {
    const main = document.createElement('div');
    main.className = 'doc-main';
    while (pageWrap.firstChild) main.appendChild(pageWrap.firstChild);
    const tabList = () => '<ol>' + secs.map((el, i) => '<li><a class="stab" href="#' + el.id + '" data-tab="' + el.id + '"><span class="b">' + (i + 1) + '</span><span class="t">' + esc(secTitle(el)) + '</span></a></li>').join('') + '</ol>';
    const aside = document.createElement('nav');
    aside.className = 'sectabs'; aside.setAttribute('aria-label', 'Sections of this page');
    aside.innerHTML = tabList();
    const dd = document.createElement('div');
    dd.className = 'secdd';
    dd.innerHTML = '<button class="secdd-b" type="button" aria-expanded="false" aria-controls="secdd-l"><span class="b">1</span><span class="t">' + esc(secTitle(secs[0])) + '</span>' + ANGLE_DOWN + '</button>' +
      '<div class="secdd-l" id="secdd-l" hidden>' + tabList() + '</div>';
    main.prepend(dd);
    secs.forEach((el, i) => { if (!i) return; const d = document.createElement('div'); d.className = 'sec-div'; d.setAttribute('aria-hidden', 'true'); d.textContent = secTitle(el); el.before(d); });
    pageWrap.classList.add('has-tabs');
    pageWrap.append(aside, main);
    ddBtn = dd.querySelector('.secdd-b'); ddList = dd.querySelector('.secdd-l');
    ddBtn.addEventListener('click', (e) => { e.stopPropagation(); ddOpen(ddList.hidden); });
    ddList.querySelectorAll('a').forEach(a => a.addEventListener('click', () => ddOpen(false)));
  }

  // The section in view is marked in the tabs, the dropdown and the menus
  let spied = null;
  const spy = () => {
    let id = secs.length ? secs[0].id : null;
    const y = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) + 60;
    secs.forEach(s => { if (s.getBoundingClientRect().top <= y) id = s.id; });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2 && secs.length) id = secs[secs.length - 1].id;
    if (id === spied) return; spied = id;
    bar.querySelectorAll('[data-sec]').forEach(a => { if (a.dataset.sec === cur.id + ':' + id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    document.querySelectorAll('.stab').forEach(a => { if (a.dataset.tab === id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    const tab = document.querySelector('.sectabs .stab[aria-current]');
    if (tab) { const box = tab.closest('.sectabs'), r = tab.getBoundingClientRect(), b = box.getBoundingClientRect(); if (r.top < b.top || r.bottom > b.bottom) box.scrollTop += r.top - b.top - b.height / 2 + r.height / 2; }
    if (ddBtn && id) { const i = secs.findIndex(s => s.id === id); ddBtn.querySelector('.b').textContent = i + 1; ddBtn.querySelector('.t').textContent = secTitle(secs[i]); }
  };
  window.addEventListener('scroll', spy, { passive: true }); window.addEventListener('resize', spy); spy();

  /* ================= Footer ================= */
  const foot = document.createElement('footer');
  foot.className = 'foot';
  foot.innerHTML = '<div class="foot-in"><span>' + esc(document.body.dataset.foot || (cur.id === 'home' ? 'Requests & Approval handoff' : [cur.short || cur.label, ((document.querySelector('header.hero h1') || {}).textContent || '').trim()].filter((s, i, a) => s && a.indexOf(s) === i).join(' · '))) + '</span><span class="sp"></span>' +
    '<a href="#top"><span>Back to top</span><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8.51562 3.48438L12.2656 7.23438C12.5703 7.51562 12.5703 8.00781 12.2656 8.28906C11.9844 8.59375 11.4922 8.59375 11.2109 8.28906L8.75 5.82812V13C8.75 13.4219 8.39844 13.75 8 13.75C7.57812 13.75 7.25 13.4219 7.25 13V5.82812L4.76562 8.28906C4.48438 8.59375 3.99219 8.59375 3.71094 8.28906C3.40625 8.00781 3.40625 7.51562 3.71094 7.23438L7.46094 3.48438C7.74219 3.17969 8.23438 3.17969 8.51562 3.48438Z" fill="currentColor"/></svg></a></div>';
  document.body.appendChild(foot);

  /* ================= Live frames =================
     <div data-live data-widths="1920,1440,870,375" data-w="1440" data-h="520" data-params="now=19:00" data-nav="closed"
          data-zoom="6" data-lane="5" data-range="320-1920" data-at="14:00"
          data-opts="bar|Toolbar|:Shown,closed:Collapsed;dots|⋮ panel|:Closed,open:Open"></div>
     The iframe keeps the chosen width (the prototype lays out for it) and is scaled down to fit the column.
     Parameters go after # so every frame shares one cached copy of the prototype; a change loads a fresh frame. */
  const ZOOM_NAMES = ['Glance', 'Dense', 'Day', '1h', '30 min', '20 min', '15 min', '10 min'];
  const LANE_NAMES = ['Thread', 'Sliver', 'Slim', 'Narrow', 'Compact', 'Standard', 'Wide', 'Extra wide'];
  document.querySelectorAll('[data-live]').forEach((el) => {
    const widths = (el.dataset.widths || '1440').split(',').map(Number);
    const st = { w: +el.dataset.w || widths[0], h: +el.dataset.h || 560, nav: el.dataset.nav || null,
      zoom: el.dataset.zoom != null ? +el.dataset.zoom : null, lane: el.dataset.lane != null ? +el.dataset.lane : null };
    const opts = (el.dataset.opts || '').split(';').filter(Boolean).map(s => { const [k, label, vals] = s.split('|'); return { k, label, vals: vals.split(',').map(v => v.split(':')) }; });
    opts.forEach(o => { st[o.k] = o.vals[0][0]; });
    const [rMin, rMax] = (el.dataset.range || '').split('-').map(Number);
    const hFor = (w) => { const hs = (el.dataset.hs || '').split(',').map(x => x.split(':').map(Number)).filter(x => x.length === 2); const m = hs.find(x => w <= x[0]); return m ? m[1] : st.h; };
    const segBtns = (items, curV, key) => items.map(([v, l]) => '<button type="button" data-k="' + key + '" data-v="' + v + '" aria-pressed="' + (String(v) === String(curV)) + '">' + esc(l) + '</button>').join('');
    let html = '<div class="live-bar"><div class="grp"><span class="lab">Width</span><div class="seg">' + segBtns(widths.map(w => [w, String(w)]), st.w, 'w') + '</div></div>';
    if (rMin) html += '<label class="live-range"><span class="lab">Drag</span><input type="range" min="' + rMin + '" max="' + rMax + '" step="1" value="' + st.w + '" aria-label="Frame width in pixels"><output>' + st.w + 'px</output></label>';
    if (st.nav) html += '<div class="grp"><span class="lab">Side nav</span><div class="seg">' + segBtns([['closed', 'Closed'], ['open', 'Open']], st.nav, 'nav') + '</div></div>';
    if (st.zoom != null) html += '<div class="grp"><span class="lab">Time</span><div class="seg">' + segBtns(ZOOM_NAMES.map((n, i) => [i, n]), st.zoom, 'zoom') + '</div></div>';
    if (st.lane != null) html += '<div class="grp"><span class="lab">Lanes</span><div class="seg">' + segBtns(LANE_NAMES.map((n, i) => [i, n]), st.lane, 'lane') + '</div></div>';
    opts.forEach(o => { html += '<div class="grp"><span class="lab">' + esc(o.label) + '</span><div class="seg">' + segBtns(o.vals, st[o.k], o.k) + '</div></div>'; });
    html += '</div><div class="live-stage"><iframe title="' + esc(el.dataset.title || 'Live prototype') + '" loading="lazy"></iframe></div>' +
      '<div class="live-cap"><span class="sz"></span><a target="_blank" rel="noopener">Open the prototype ↗</a></div>';
    el.classList.add('live'); el.innerHTML = html;
    const stage = el.querySelector('.live-stage'), cap = el.querySelector('.sz'), open = el.querySelector('.live-cap a');
    let ifr = stage.querySelector('iframe');
    const range = el.querySelector('.live-range input'), out = el.querySelector('.live-range output');
    const src = () => {
      const q = new URLSearchParams(el.dataset.params || '');
      if (st.nav === 'open') q.set('nav', 'open');
      if (st.zoom != null) q.set('zoom', st.zoom);
      if (st.lane != null) q.set('lane', st.lane);
      opts.forEach(o => { if (st[o.k]) q.set(o.k, st[o.k]); });
      if (el.dataset.at) q.set('at', el.dataset.at);
      q.set('lanes', 'shared');   // the docs describe the bowling lanes under one title
      const s = q.toString().replace(/%3A/gi, ':');   // keep HH:MM readable: the prototype reads now= and at= as written
      return PROTO + (s ? '#' + s : '');
    };
    const fit = () => {
      const avail = stage.clientWidth, h = hFor(st.w), s = Math.min(1, avail / st.w);
      ifr.style.width = st.w + 'px'; ifr.style.height = h + 'px';
      ifr.style.transform = 'scale(' + s + ')';
      ifr.style.left = Math.max(0, (avail - st.w * s) / 2) + 'px';
      stage.style.height = Math.ceil(h * s) + 'px';
      cap.textContent = st.w + ' × ' + h + ' px' + (s < 1 ? ' · shown at ' + Math.round(s * 100) + '%' : ' · actual size');
      el.dispatchEvent(new CustomEvent('livewidth', { detail: { w: st.w, nav: st.nav } }));
    };
    const reload = (fresh) => {   // a new frame each time: with the parameters after #, setting src again would not reload
      if (fresh) { const n = document.createElement('iframe'); n.title = ifr.title; n.setAttribute('loading', 'lazy'); ifr.replaceWith(n); ifr = n; }
      ifr.src = src(); open.href = src();
    };
    el.addEventListener('click', (e) => {
      const b = e.target.closest('.seg button'); if (!b) return;
      const k = b.dataset.k, v = b.dataset.v;
      b.parentNode.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      if (k === 'w') { st.w = +v; if (range) { range.value = v; out.textContent = v + 'px'; } fit(); return; }
      st[k] = (k === 'zoom' || k === 'lane') ? +v : v; reload(true); fit();
    });
    if (range) range.addEventListener('input', () => {
      st.w = +range.value; out.textContent = st.w + 'px';
      el.querySelectorAll('.seg button[data-k="w"]').forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.v === st.w)));
      fit();
    });
    reload(); fit();
    try { new ResizeObserver(fit).observe(stage); } catch (e) { window.addEventListener('resize', fit); }
    el.liveState = st;
  });

  /* ================= Annotated captures =================
     <figure class="shot" data-shot="tb-anatomy" data-alt="…" data-of="1920"><figcaption>…</figcaption></figure>
     Images and pin positions come from Assets/shots/shots.js (window.SHOTS), written by the capture script from the
     prototype's own DOM. data-of: show at the same scale as a capture of that width (strips of different widths).
     data-pins="1,2": only those pins. <span class="crop" data-shot="…" data-box="hub" data-h="28"> shows one element. */
  const SHOTS = window.SHOTS || {};
  const shotSrc = (id) => 'Assets/shots/' + id + '.webp';
  const lightbox = (id) => {
    const S = SHOTS[id]; if (!S) return;
    const back = document.createElement('div');
    back.className = 'lb';
    back.innerHTML = '<div class="lb-in" style="width:' + S.w + 'px"><img src="' + shotSrc(id) + '" alt="" width="' + S.w + '" height="' + S.h + '">' +
      (S.pins || []).map(p => '<span class="pin" style="left:' + p[1] + '%;top:' + p[2] + '%">' + esc(p[0]) + '</span>').join('') + '</div>' +
      '<button class="lb-x" type="button" aria-label="Close">×</button>';
    const close = () => { back.remove(); document.removeEventListener('keydown', onK); };
    const onK = (e) => { if (e.key === 'Escape') close(); };
    back.addEventListener('click', close); document.addEventListener('keydown', onK);
    document.body.appendChild(back);
  };
  document.querySelectorAll('figure.shot[data-shot]').forEach((fig) => {
    const id = fig.dataset.shot, S = SHOTS[id]; if (!S) return;
    const only = fig.dataset.pins ? fig.dataset.pins.split(',') : null;
    const box = document.createElement('button');
    box.type = 'button'; box.className = 'shot-img'; box.setAttribute('aria-label', 'Enlarge: ' + (fig.dataset.alt || id));
    box.style.maxWidth = S.w + 'px';
    if (fig.dataset.of) box.style.width = Math.min(100, S.w / +fig.dataset.of * 100) + '%';
    const pins = (S.pins || []).filter(p => !only || only.includes(p[0]));
    const row = fig.hasAttribute('data-pinrow');   // thin captures: the numbers sit on a ruler under the image, a tick up to each item
    box.innerHTML = '<img src="' + shotSrc(id) + '" alt="' + esc(fig.dataset.alt || '') + '" loading="lazy" decoding="async" width="' + S.w + '" height="' + S.h + '">' +
      (row ? '' : pins.map(p => '<span class="pin" style="left:' + p[1] + '%;top:' + p[2] + '%">' + esc(p[0]) + '</span>').join(''));
    box.addEventListener('click', () => lightbox(id));
    if (row) {
      const r = document.createElement('div');
      r.className = 'pinrow'; r.setAttribute('aria-hidden', 'true');
      r.style.maxWidth = box.style.maxWidth; if (box.style.width) r.style.width = box.style.width;
      r.innerHTML = pins.map(p => '<span class="pin" style="left:' + p[1] + '%">' + esc(p[0]) + '</span>').join('');
      fig.prepend(r);
    }
    fig.prepend(box);
  });
  document.querySelectorAll('.crop[data-shot][data-box]').forEach((c) => {
    const S = SHOTS[c.dataset.shot]; const b = S && S.boxes && S.boxes[c.dataset.box]; if (!b) return;
    const k = (+c.dataset.h || 28) / b[3];
    Object.assign(c.style, { width: Math.round(b[2] * k) + 'px', height: Math.round(b[3] * k) + 'px',
      backgroundImage: 'url(' + shotSrc(c.dataset.shot) + ')', backgroundSize: (S.w * k) + 'px ' + (S.h * k) + 'px',
      backgroundPosition: (-b[0] * k) + 'px ' + (-b[1] * k) + 'px' });
    c.setAttribute('role', 'img');
  });

  /* ================= Phone diagram =================
     <div data-phone="headbar | grid | touch"></div>: a schematic phone with numbered marks and their key. */
  const PHONE_KEYS = {
    headbar: [
      ['1', 'The headbar is fixed at the top and grows by the status bar\'s safe area, so its dark runs up behind the clock.'],
      ['2', '72px at every width: logo, bell and menu at 870px and below.'],
      ['3', 'A dark block above the bar: pulling the page never shows white.'],
    ],
    grid: [
      ['1', 'Safari 26: 100vh and bottom: 0 stop here, at the top of the floating bar.'],
      ['2', 'The app runs 160px past it, so the grid carries on behind the see-through bar.'],
      ['3', 'Scrolled to the end, the last row sits 40px above the bar.'],
      ['4', 'Headbar, toolbar and column titles never move; the page never scrolls.'],
    ],
    touch: [
      ['1', 'Still: headbar, toolbar and column titles do not scroll or zoom under a finger.'],
      ['2', 'One finger scrolls the grid both ways; the titles follow it sideways.'],
      ['3', 'Two fingers zoom the grid through the steps.'],
    ],
  };
  const phoneHTML = (v) => {
    const bk = (l, t, w, hh, bg, bar) => '<div class="bk" style="left:' + l + 'px;top:' + t + 'px;width:' + w + 'px;height:' + hh + 'px;background:' + bg + '"><i style="background:' + bar + '"></i></div>';
    let m = '';
    if (v === 'headbar') m = '<span class="mk" style="left:150px;top:7px">1</span><span class="mk" style="left:110px;top:44px">2</span><span class="mk" style="left:2px;top:7px">3</span>';
    if (v === 'grid') m = '<div class="ln" style="top:446px"><span>100vh ends here</span></div><span class="mk" style="left:204px;top:436px">1</span>' +
      '<span class="mk" style="left:2px;top:476px">2</span><div class="lastrow" style="top:376px"></div><div class="gap40" style="top:422px;height:24px"></div><span class="mk" style="left:16px;top:398px">3</span><span class="mk" style="left:2px;top:84px">4</span>';
    if (v === 'touch') m = '<span class="mk" style="left:2px;top:84px">1</span><span class="arr" style="left:96px;top:250px">↕</span><span class="arr" style="left:120px;top:262px">↔</span><span class="mk" style="left:140px;top:250px">2</span>' +
      '<span class="mk" style="left:58px;top:330px">3</span><svg style="position:absolute;left:70px;top:316px;z-index:2" width="90" height="60" aria-hidden="true"><circle cx="18" cy="40" r="11" fill="rgba(0,121,202,.18)" stroke="#0079CA" stroke-width="2"/><circle cx="70" cy="14" r="11" fill="rgba(0,121,202,.18)" stroke="#0079CA" stroke-width="2"/><path d="M28 32 L60 20" stroke="#0079CA" stroke-width="1.5" stroke-dasharray="3 3"/></svg>';
    return '<div class="phone" aria-hidden="true"><div class="scr">' +
      '<div class="gr">' + bk(44, 10, 44, 80, '#E9F7EF', '#2E9E6B') + bk(96, 56, 44, 100, '#FFF0F4', '#D10047') + bk(148, 20, 44, 60, '#EAF1FB', '#3B7CD8') + bk(44, 150, 44, 120, '#FFF4E6', '#DF7B00') + bk(148, 130, 44, 150, '#F0EBFD', '#7C5CE0') + bk(96, 230, 44, 110, '#E9F7EF', '#2E9E6B') + bk(200, 90, 44, 90, '#EAF1FB', '#3B7CD8') + bk(200, 250, 44, 120, '#FFF0F4', '#D10047') + '</div>' +
      '<div class="sb"><span>9:41</span><span>●●● ▮</span></div><div class="isl"></div>' +
      '<div class="hb"><img src="Assets/fever-zone-logo.svg" alt=""><i></i></div><div class="tb"><span></span><span></span><b></b></div><div class="hd"></div>' +
      '<div class="url">requests & approval · prototype</div><div class="home"></div>' + m + '</div></div>';
  };
  document.querySelectorAll('[data-phone]').forEach((el) => {
    const v = el.dataset.phone, keys = PHONE_KEYS[v] || [];
    el.className = 'phone-wrap';
    el.innerHTML = phoneHTML(v) + '<div class="phone-key">' + keys.map(k => '<div><span class="k">' + k[0] + '</span><span>' + esc(k[1]) + '</span></div>').join('') + '</div>';
  });

  /* ================= Overscroll demo =================
     <div data-ovsdemo></div>: the grid's soft edges on a small grid (the real numbers, slowed down a little to read). */
  document.querySelectorAll('[data-ovsdemo]').forEach((el) => {
    const bk = (l, t, w, hh, bg, bar) => '<div class="bk" style="left:' + l + 'px;top:' + t + 'px;width:' + w + 'px;height:' + hh + 'px;background:' + bg + '"><i style="background:' + bar + '"></i></div>';
    el.className = 'ovsd';
    el.innerHTML = '<div class="box" aria-hidden="true"><div class="gap"><img src="Assets/fever-zone%20-%20logo%20-%20dark.svg" alt=""></div><div class="cnt">' +
      bk(44, 30, 88, 110, '#E9F7EF', '#2E9E6B') + bk(140, 90, 88, 150, '#FFF0F4', '#D10047') + bk(236, 20, 88, 80, '#EAF1FB', '#3B7CD8') + bk(332, 150, 88, 120, '#FFF4E6', '#DF7B00') +
      bk(44, 300, 88, 130, '#F0EBFD', '#7C5CE0') + bk(236, 360, 88, 110, '#E9F7EF', '#2E9E6B') + bk(140, 470, 88, 120, '#EAF1FB', '#3B7CD8') + bk(332, 520, 88, 90, '#FFF0F4', '#D10047') + '</div></div>' +
      '<div class="btns"><button class="btn" type="button" data-a="arrive">Arrive fast at the top</button><button class="btn" type="button" data-a="pull">Pull again from the top</button>' +
      '<button class="btn" type="button" data-a="bottom">Reach the bottom</button><p aria-live="polite"></p></div>';
    const cnt = el.querySelector('.cnt'), gap = el.querySelector('.gap'), logo = gap.querySelector('img'), msg = el.querySelector('p');
    let y = 0;   // where the small grid is scrolled to: 0 (top) or the bottom
    const bottomY = () => -(cnt.offsetHeight - el.querySelector('.box').clientHeight);
    const T = (x, yy) => 'translate(' + x + 'px,' + yy + 'px)';
    const run = (a) => {
      cnt.getAnimations().forEach(x => x.cancel()); gap.getAnimations().forEach(x => x.cancel()); logo.getAnimations().forEach(x => x.cancel());
      if (a === 'arrive' || a === 'pull') {
        const from = y; y = 0;
        if (from !== 0) cnt.animate([{ transform: T(0, from) }, { transform: T(0, 0) }], { duration: 450, easing: 'cubic-bezier(.3,.7,.3,1)' });
        const d = from !== 0 ? 450 : 0;
        if (a === 'arrive') {
          cnt.animate([{ transform: T(0, 0) }, { transform: T(0, 14), offset: .18 }, { transform: T(0, 0) }], { duration: 700, delay: d, easing: 'cubic-bezier(.2,.8,.25,1)', fill: 'backwards' });
          msg.textContent = 'One soft bump, 6 to 18px with the speed, peak at 120ms, settled by about 0.7s. No logo.';
        } else {
          const k = [{ offset: 0, v: 0 }, { offset: .3, v: 59 }, { offset: .72, v: 59 }, { offset: 1, v: 0 }];
          cnt.animate(k.map(f => ({ offset: f.offset, transform: T(0, f.v) })), { duration: 1900, delay: d, easing: 'ease-in-out', fill: 'backwards' });
          gap.animate(k.map(f => ({ offset: f.offset, height: f.v + 'px' })), { duration: 1900, delay: d, easing: 'ease-in-out', fill: 'backwards' });
          logo.animate([{ opacity: 0, transform: 'scale(.9)' }, { opacity: 0, offset: .2 }, { opacity: 1, transform: 'scale(1)', offset: .4 }, { opacity: 1, offset: .7 }, { opacity: 0 }], { duration: 1900, delay: d, fill: 'backwards' });
          msg.textContent = 'A new pull from the top: the gap opens in the grid\'s grey, the logo draws, it holds, then springs back.';
        }
      } else if (a === 'bottom') {
        const from = y; y = bottomY();
        cnt.animate([{ transform: T(0, from) }, { transform: T(0, y), offset: .55 }, { transform: T(0, y - 14), offset: .68 }, { transform: T(0, y) }], { duration: 1200, easing: 'cubic-bezier(.3,.7,.3,1)' });
        msg.textContent = 'One bump of 6 to 18px, peak at 120ms, settled by about 0.7s; the rest of the momentum is ignored. The sides have no bounce: the grid just stops.';
      }
      cnt.style.transform = T(0, y);
    };
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-a]'); if (b) run(b.dataset.a); });
  });

  /* ================= Hand off =================
     One per feature (a piece the designer or the developers can pick up), at the end of the feature's last section, and
     a plan at the top of the page. The modal has three tabs, all written from the feature's own sections:
       Design task · a Jira Design Task for the designer: evolve it in Figma, prototype it.
       Dev task    · a Jira Task, Story or Bug for the developers: build it.
       Claude prompt · build it, update it or check it in someone's own copy of the prototype, or explain it.
     Every text can be edited before it is copied or opened. Features carry a short change log (changes) and pointers into
     the prototype's source (code), both in PAGES. */
  const HAND_ICON = '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3 9h9.2M8.6 5l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.2 3.8v10.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  const SKIP = '.jira-row,.jira-part,.live,[data-live],.play,.specimens,.scroll,.player,.toolbar,.cal,.tipdemo,.flow,.demo,.map,figure,.shots,.film,.phone-wrap,[data-phone],[data-ovsdemo],.ovsd,.mini,.picto,.chart,svg,canvas,iframe,button,input,select,output,script,style,[data-jira-skip],.num';
  const text = (n) => (n.textContent || '').replace(/\s+/g, ' ').trim();

  // walk a section into blocks: {h} {p} {li:[...]} {dl:[[t,d]]} {table:{head,rows}} {code}
  const blocks = (root) => {
    const out = [];
    const walk = (el) => {
      for (const c of el.children) {
        if (c.matches(SKIP)) continue;
        const tag = c.tagName;
        if (tag === 'H2' || c.classList.contains('sec-head')) continue;
        if (tag === 'H3' || tag === 'H4') { const t = text(c); if (t) out.push({ h: t }); continue; }
        if (tag === 'P') { const t = text(c); if (t) out.push({ p: (c.classList.contains('callout') ? 'Note: ' : '') + t }); continue; }
        if (tag === 'DL') { const pairs = []; let t = null; for (const d of c.children) { if (d.tagName === 'DT') t = text(d); else if (d.tagName === 'DD') pairs.push([t, text(d)]); } if (pairs.length) out.push({ dl: pairs }); continue; }
        if (tag === 'UL' || tag === 'OL') { const li = [...c.children].filter(x => x.tagName === 'LI').map(text).filter(Boolean); if (li.length) out.push({ li }); continue; }
        if (tag === 'TABLE') {
          const head = [...c.querySelectorAll('thead th')].map(text);
          const rows = [...c.querySelectorAll('tbody tr')].map(tr => [...tr.children].map(text));
          if (rows.length) out.push({ table: { head, rows } }); continue;
        }
        if (tag === 'PRE') { out.push({ code: c.textContent.trim() }); continue; }
        if (c.classList.contains('callout')) { const t = text(c); if (t) out.push({ p: 'Note: ' + t }); continue; }
        if (c.hasAttribute('data-jira-list')) { const li = [...c.children].map(text).filter(Boolean); if (li.length) out.push({ li }); continue; }
        if (c.classList.contains('box')) { const hh = c.querySelector('h4'); const pp = c.querySelector('p'); if (hh) out.push({ h: text(hh) }); if (pp) out.push({ p: text(pp) }); continue; }
        walk(c);
      }
    };
    walk(root);
    return out;
  };
  const secLabel = (page, id) => { const i = page.sections.findIndex(s => s[0] === id); return i < 0 ? id : (i + 1) + ' · ' + page.sections[i][1]; };
  const lastSec = (page, f) => f.sections.slice().sort((a, b) => page.sections.findIndex(s => s[0] === a) - page.sections.findIndex(s => s[0] === b)).pop();
  const fmtDate = (d) => { try { return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return d; } };
  const model = (f) => {
    const out = [], covers = [];
    f.sections.map(id => document.getElementById(id)).filter(Boolean).forEach((sec) => {
      const title = sec.querySelector('h2') ? text(sec.querySelector('h2')) : sec.id;
      const introEl = sec.querySelector('.intro');
      covers.push({ label: secLabel(cur, sec.id), title, url: DOCS + cur.href + '#' + sec.id });
      out.push({ sec: title });
      if (introEl) out.push({ p: text(introEl) });
      out.push(...blocks(sec).filter(b => !(introEl && b.p === text(introEl))));
    });
    const ac = (f.ac || []).slice();
    ac.push('Matches every rule and value in the linked doc sections, at every width and step they list.');
    ac.push('Behaves like the live prototype linked above.');
    return { f, page: cur.label, name: f.name, covers, figma: f.figma || [], intro: f.desc || '', blocks: out, ac,
      changes: f.changes || [], code: f.code || [], summary: f.summary };
  };

  /* ---- the texts, as HTML (preview, editable, rich clipboard) ---- */
  const linksHTML = (m) => '<ul><li><strong>Doc:</strong> ' + m.covers.map(c => '<a href="' + c.url + '">' + esc(m.page + ' · ' + c.title) + '</a>').join(', ') + '</li>' +
    '<li><strong>Prototype:</strong> <a href="' + PROTO_PROD + '">' + PROTO_PROD + '</a></li>' +
    (m.figma.length ? '<li><strong>Figma:</strong> ' + m.figma.map(n => '<a href="' + figmaUrl(n) + '">' + n + '</a>').join(', ') + '</li>' : '') +
    (m.changes.length ? '<li><strong>Last updated:</strong> ' + esc(fmtDate(m.changes[0][0]) + ': ' + m.changes[0][1]) + '</li>' : '') + '</ul>';
  const specHTML = (m) => m.blocks.map(b => {
    if (b.sec) return '<h4>' + esc(b.sec) + '</h4>';
    if (b.h) return '<h5>' + esc(b.h) + '</h5>';
    if (b.p) return '<p>' + esc(b.p) + '</p>';
    if (b.li) return '<ul>' + b.li.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>';
    if (b.dl) return '<ul>' + b.dl.map(([t, d]) => '<li><strong>' + esc(t || '') + ':</strong> ' + esc(d) + '</li>').join('') + '</ul>';
    if (b.table) return '<table>' + (b.table.head.length ? '<tr>' + b.table.head.map(x => '<th>' + esc(x) + '</th>').join('') + '</tr>' : '') + b.table.rows.map(r => '<tr>' + r.map(x => '<td>' + esc(x) + '</td>').join('') + '</tr>').join('') + '</table>';
    if (b.code) return '<pre>' + esc(b.code) + '</pre>';
    return '';
  }).join('');
  const devHTML = (m) => '<h3>Context</h3>' + (m.intro ? '<p>' + esc(m.intro) + '</p>' : '') + linksHTML(m) +
    '<h3>What to build</h3>' + specHTML(m) +
    '<h3>Acceptance criteria</h3><ul>' + m.ac.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' +
    '<h3>Test</h3><ul><li>Desktop: mouse and trackpad, at every width and step the spec lists.</li><li>Phone: touch, in iOS Safari and Android Chrome.</li><li>Side by side with the live prototype.</li></ul>' +
    (m.code.length ? '<h3>In the prototype\'s source</h3><p>' + m.code.map(c => '<code>' + esc(c) + '</code>').join(', ') + '</p>' : '');
  const designHTML = (m) => '<h3>Context</h3>' + (m.intro ? '<p>' + esc(m.intro) + '</p>' : '') + linksHTML(m) +
    '<h3>What we want to change</h3><p><em>Describe the evolution: the problem, the idea, who asked for it.</em></p>' +
    '<h3>What to design</h3><ul><li>Update the Figma frames of this feature, starting from the nodes above, for the change described.</li>' +
    '<li>Keep every state and size of the current spec below, or mark the ones that change.</li>' +
    '<li>Cover the widths and steps the spec lists, from desktop to phone.</li>' +
    '<li>Show how it behaves with a finger, if that changes.</li>' +
    '<li>Prototype the interaction, in Figma or in the HTML prototype with Claude, and record a short video for the review.</li></ul>' +
    '<h3>Done when</h3><ul><li>The Figma frames are updated and linked in this task.</li><li>The prototype is reviewed with product.</li><li>The handoff docs section is updated, and a dev task is created from it.</li></ul>' +
    '<h3>Current spec (from the doc)</h3>' + specHTML(m);

  /* ---- the edited preview, turned into Jira wiki (the create link) and Markdown (plain clipboard, Claude) ---- */
  const wikiEsc = (s) => String(s).replace(/([{}\[\]|*_])/g, '\\$1');
  const inl = (n, md) => [...n.childNodes].map((c) => {
    if (c.nodeType === 3) return md ? c.textContent.replace(/\s+/g, ' ') : wikiEsc(c.textContent.replace(/\s+/g, ' '));
    if (c.nodeType !== 1) return '';
    const t = c.tagName, inner = () => inl(c, md).trim();
    if (t === 'STRONG' || t === 'B') return md ? '**' + inner() + '**' : '*' + inner() + '*';
    if (t === 'EM' || t === 'I') return md ? '_' + inner() + '_' : '_' + inner() + '_';
    if (t === 'CODE') return md ? '`' + c.textContent + '`' : '{{' + c.textContent + '}}';
    if (t === 'A') return md ? '[' + c.textContent + '](' + c.href + ')' : '[' + wikiEsc(c.textContent) + '|' + c.href + ']';
    if (t === 'BR') return '\n';
    return inl(c, md);
  }).join('');
  const BLOCK = /^(P|UL|OL|TABLE|H3|H4|H5|PRE|DIV)$/;
  const convert = (root, md) => {
    let w = '';
    const head = (lvl, c) => { w += (md ? '\n' + '#'.repeat(lvl) + ' ' : '\nh' + lvl + '. ') + inl(c, md).trim() + '\n'; };
    const walk = (el) => {
      for (const c of el.children) {
        const t = c.tagName;
        if (t === 'H3') head(3, c); else if (t === 'H4') head(4, c); else if (t === 'H5') head(5, c);
        else if (t === 'UL' || t === 'OL') [...c.children].forEach((li, i) => { w += (md ? (t === 'UL' ? '- ' : (i + 1) + '. ') : (t === 'UL' ? '* ' : '# ')) + inl(li, md).trim() + '\n'; });
        else if (t === 'TABLE') [...c.querySelectorAll('tr')].forEach((tr, i) => {
          const cells = [...tr.children], th = cells.every(x => x.tagName === 'TH');
          if (md) { w += '| ' + cells.map(x => inl(x, md).trim()).join(' | ') + ' |\n'; if (i === 0) w += '|' + cells.map(() => ' --- ').join('|') + '|\n'; }
          else w += (th ? '||' : '|') + cells.map(x => inl(x, md).trim() || ' ').join(th ? '||' : '|') + (th ? '||' : '|') + '\n';
        });
        else if (t === 'PRE') w += md ? '```\n' + c.textContent + '\n```\n' : '{noformat}\n' + c.textContent + '\n{noformat}\n';
        else if (t === 'DIV' && [...c.children].some(x => BLOCK.test(x.tagName))) walk(c);
        else { const s = inl(c, md).trim(); if (s) w += s + '\n'; }
      }
    };
    walk(root);
    return w.replace(/\n{3,}/g, '\n\n').trim() + '\n';
  };
  const shortWiki = (m, kind) => 'h3. Context\n' + (m.intro ? wikiEsc(m.intro) + '\n' : '') +
    '* *Doc:* ' + m.covers.map(c => '[' + wikiEsc(m.page + ' · ' + c.title) + '|' + c.url + ']').join(', ') + '\n' +
    '* *Prototype:* [' + PROTO_PROD + '|' + PROTO_PROD + ']\n' + (m.figma.length ? '* *Figma:* ' + m.figma.map(n => '[' + n + '|' + figmaUrl(n) + ']').join(', ') + '\n' : '') +
    '\nThe full description is on your clipboard: paste it here.\n' +
    (kind === 'design' ? '\nh3. Done when\n* The Figma frames are updated and linked in this task.\n* The prototype is reviewed with product.\n* The handoff docs section is updated, and a dev task is created from it.'
      : '\nh3. Acceptance criteria\n' + m.ac.map(x => '* ' + wikiEsc(x)).join('\n'));

  /* ---- Claude prompts, for someone's own copy of the prototype ---- */
  const CLAUDE_MODES = [
    ['build', 'Build it in my prototype'], ['update', 'Update mine to the latest'], ['check', 'Check mine against the spec'], ['explain', 'Explain it to me']];
  const claudePrompt = (m, mode) => {
    const head = 'Feature: ' + m.page + ' · ' + m.name + ' (Requests & Approval)\n' +
      'Spec, the source of truth: ' + m.covers.map(c => c.url).join(' , ') + '\n' +
      'Live reference: ' + PROTO_PROD + ' (one HTML file' + (m.code.length ? '; in its source look for ' + m.code.join(', ') : '') + ')\n' +
      (m.figma.length ? 'Figma: ' + m.figma.map(figmaUrl).join(' , ') + '\n' : '') +
      (m.changes.length ? 'Last updated: ' + m.changes[0][0] + ', ' + m.changes[0][1] + '\n' : '');
    if (mode === 'build') return head + '\nYou are working on my own copy of the Requests & Approval prototype. Build this feature as the spec describes: every value, rule, state and responsive behaviour, with mouse, trackpad and touch.\n' +
      'Read the spec pages first. Use the live reference to see it working and to read how it is built, but fit it to my code instead of copying blindly. Change only what this feature needs.\n' +
      'When you are done, tell me what you changed, how to test it, and anything where my prototype still differs from the spec.';
    if (mode === 'update') return head + '\nMy own copy of the prototype already has an earlier version of this feature. Bring it up to date with the spec.\n' +
      'What changed in the spec, newest first:\n' + (m.changes.length ? m.changes.map(c => '- ' + c[0] + ': ' + c[1]).join('\n') : '- (no change log for this feature yet)') + '\n' +
      'Compare my implementation with the spec and the live reference, list the differences, then fix them. Change nothing else, and finish with a short summary of what you changed.';
    if (mode === 'check') return head + '\nReview the implementation of this feature in my own copy of the prototype against the spec. List every difference (value, rule, state, responsive behaviour, touch), most important first, with where it lives in my code.\n' +
      'Do not change anything yet: wait for my go-ahead.';
    return head + '\nExplain this feature to me in plain language, from the spec: what it does and why, the rules that matter, and how it behaves on a phone and with touch. Then answer my questions.';
  };

  const copyRich = async (html, plain) => {
    try {
      if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
        await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([plain], { type: 'text/plain' }) })]);
        return true;
      }
    } catch (e) {}
    try { await navigator.clipboard.writeText(plain); return true; } catch (e) {}
    try { const ta = document.createElement('textarea'); ta.value = plain; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok; } catch (e) { return false; }
  };

  let lastFocus = null;
  const TABS = [['design', 'Design task'], ['dev', 'Dev task'], ['claude', 'Claude prompt']];
  const DEV_TYPES = JIRA.types.filter(t => t[1] !== 'Design Task');
  const DESIGN_TYPE = (JIRA.types.find(t => t[1] === 'Design Task') || ['15699'])[0];
  const openHandoff = (f) => {
    const m = model(f);
    lastFocus = document.activeElement;
    let tab = 'dev'; try { tab = localStorage.getItem('docs-handoff-tab') || 'dev'; } catch (e) {}
    if (!TABS.some(t => t[0] === tab)) tab = 'dev';
    let devType = (DEV_TYPES.find(t => t[1] === (f.type || 'Task')) || DEV_TYPES[0])[0], mode = 'build';
    const sum = { design: '[R&A] [Design] ' + m.name + ': evolve the design and prototype it', dev: m.summary };
    const back = document.createElement('div');
    back.className = 'jm-back';
    back.innerHTML = '<div class="jm" role="dialog" aria-modal="true" aria-labelledby="jm-t">' +
      '<div class="jm-head"><div><h2 id="jm-t">Hand off · ' + esc(m.name) + '</h2><p>' + esc(m.page) + ' · covers ' + esc(m.covers.map(c => c.label).join(', ')) +
        (m.changes.length ? ' · updated ' + esc(fmtDate(m.changes[0][0])) : '') + '</p></div>' +
      '<button class="jm-x" type="button" aria-label="Close"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4.5 4.5l9 9M13.5 4.5l-9 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></div>' +
      '<div class="jm-tabs" role="tablist">' + TABS.map(([k, l]) => '<button type="button" role="tab" data-tab="' + k + '" aria-selected="false">' + l + '</button>').join('') + '</div>' +
      '<div class="jm-body">' +
        ['design', 'dev'].map(k => '<div class="jm-panel" data-p="' + k + '" role="tabpanel" hidden>' +
          '<div class="jm-f"><label for="jm-s-' + k + '">Summary</label><input id="jm-s-' + k + '" type="text" value="' + esc(sum[k]) + '"></div>' +
          '<div class="jm-f"><span class="lab">Jira type</span>' + (k === 'design' ? '<div><span class="jm-chip">Design Task · ' + JIRA.key + '</span></div>'
            : '<div class="seg" role="group" aria-label="Issue type">' + DEV_TYPES.map(([id, n]) => '<button type="button" data-type="' + id + '" aria-pressed="' + (id === devType) + '">' + n + '</button>').join('') + '</div>') + '</div>' +
          '<div class="jm-f"><span class="lab">Description <span class="jm-ed" hidden>· edited · <button type="button" class="jm-reset" data-reset="' + k + '">Reset</button></span></span>' +
            '<div class="jm-desc" contenteditable="true" spellcheck="false" data-desc="' + k + '">' + (k === 'design' ? designHTML(m) : devHTML(m)) + '</div></div>' +
          '<p class="jm-hint">' + (k === 'design'
            ? 'For the designer: fill in "What we want to change", then open it in Jira. The current spec rides along as the starting point.'
            : 'For the developers. Edit anything above; <b>Open in Jira</b> opens the ' + JIRA.key + ' create screen with summary and description filled in, and puts the formatted text on your clipboard too. Nothing is created until you press Create in Jira.') + '</p>' +
          '</div>').join('') +
        '<div class="jm-panel" data-p="claude" role="tabpanel" hidden>' +
          '<div class="jm-f"><span class="lab">What should Claude do?</span><div class="seg" role="group" aria-label="Prompt">' + CLAUDE_MODES.map(([k, l]) => '<button type="button" data-mode="' + k + '" aria-pressed="' + (k === mode) + '">' + l + '</button>').join('') + '</div></div>' +
          '<div class="jm-f"><label for="jm-prompt">Prompt</label><textarea id="jm-prompt" class="jm-prompt" rows="13" spellcheck="false"></textarea></div>' +
          '<p class="jm-hint">Paste it in Claude where your own copy of the prototype lives (Claude Code in its folder, for example). <b>Update mine to the latest</b> carries this feature\'s change log, so whoever iterates on a separate copy can catch up with the doc. Working in the same repository? A git pull already brings the latest.</p>' +
        '</div>' +
      '</div>' +
      '<div class="jm-foot"><span class="status" role="status" aria-live="polite"></span>' +
        '<button class="btn" type="button" data-act="claude-jira">Copy prompt: create it with Claude</button>' +
        '<button class="btn" type="button" data-act="copy">Copy description</button>' +
        '<button class="btn primary" type="button" data-act="open">Open in Jira ' + ARROW + '</button>' +
        '<button class="btn primary" type="button" data-act="copy-prompt">Copy prompt</button></div></div>';
    document.body.appendChild(back);
    document.documentElement.style.overflow = 'hidden';
    const dlg = back.querySelector('.jm'), status = back.querySelector('.status'), ta = back.querySelector('#jm-prompt');
    let tmo = 0, promptEdited = false;
    const say = (t) => { status.textContent = t; clearTimeout(tmo); tmo = setTimeout(() => { status.textContent = ''; }, 3600); };
    const fillPrompt = () => { ta.value = claudePrompt(m, mode); promptEdited = false; };
    fillPrompt();
    const show = (k) => {
      tab = k; try { localStorage.setItem('docs-handoff-tab', k); } catch (e) {}
      back.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === k)));
      back.querySelectorAll('.jm-panel').forEach(p => { p.hidden = p.dataset.p !== k; });
      const jira = k !== 'claude';
      back.querySelectorAll('[data-act="claude-jira"],[data-act="copy"],[data-act="open"]').forEach(b => { b.hidden = !jira; });
      back.querySelector('[data-act="copy-prompt"]').hidden = jira;
    };
    show(tab);
    back.querySelectorAll('.jm-desc').forEach(d => d.addEventListener('input', () => { d.closest('.jm-panel').querySelector('.jm-ed').hidden = false; }));
    ta.addEventListener('input', () => { promptEdited = true; });
    const close = () => { back.remove(); document.documentElement.style.overflow = ''; document.removeEventListener('keydown', onKey, true); if (lastFocus) lastFocus.focus(); };
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
      if (e.key === 'Tab') {
        const fo = [...dlg.querySelectorAll('button, input, textarea, a[href], [contenteditable="true"]')].filter(x => !x.disabled && x.offsetParent !== null);
        if (!fo.length) return;
        if (e.shiftKey && document.activeElement === fo[0]) { e.preventDefault(); fo[fo.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === fo[fo.length - 1]) { e.preventDefault(); fo[0].focus(); }
      }
    };
    document.addEventListener('keydown', onKey, true);
    back.addEventListener('click', async (e) => {
      if (e.target === back || e.target.closest('.jm-x')) return close();
      const tb = e.target.closest('[data-tab]'); if (tb) return show(tb.dataset.tab);
      const ty = e.target.closest('[data-type]');
      if (ty) { devType = ty.dataset.type; ty.parentNode.querySelectorAll('[data-type]').forEach(x => x.setAttribute('aria-pressed', String(x === ty))); return; }
      const md = e.target.closest('[data-mode]');
      if (md) { mode = md.dataset.mode; md.parentNode.querySelectorAll('[data-mode]').forEach(x => x.setAttribute('aria-pressed', String(x === md))); fillPrompt(); return; }
      const rs = e.target.closest('[data-reset]');
      if (rs) { const k = rs.dataset.reset, d = back.querySelector('[data-desc="' + k + '"]'); d.innerHTML = k === 'design' ? designHTML(m) : devHTML(m); rs.closest('.jm-ed').hidden = true; return; }
      const act = e.target.closest('[data-act]'); if (!act) return;
      if (act.dataset.act === 'copy-prompt') { say(await copyRich('<p>' + esc(ta.value).replace(/\n/g, '<br>') + '</p>', ta.value) ? 'Prompt copied. Paste it into Claude.' : 'Could not copy. Select the text and copy it.'); return; }
      const desc = back.querySelector('[data-desc="' + tab + '"]');
      const summary = (back.querySelector('#jm-s-' + tab).value || '').trim() || sum[tab];
      const typeId = tab === 'design' ? DESIGN_TYPE : devType, typeName = (JIRA.types.find(t => t[0] === typeId) || ['', 'Task'])[1];
      if (act.dataset.act === 'copy') { say(await copyRich(desc.innerHTML, convert(desc, true)) ? 'Description copied, formatted. Paste it into Jira.' : 'Could not copy. Select the text and copy it.'); return; }
      if (act.dataset.act === 'claude-jira') {
        const prompt = 'Create a Jira ' + typeName + ' in project ' + JIRA.key + ' (' + JIRA.site.replace('https://', '') + ').\nSummary: ' + summary + '\nDescription (Markdown, use it as it is):\n\n' + convert(desc, true) + '\nShow me the issue before creating it.';
        say(await copyRich('<p>' + esc(prompt).replace(/\n/g, '<br>') + '</p>', prompt) ? 'Prompt copied. Paste it into Claude.' : 'Could not copy.');
        return;
      }
      if (act.dataset.act === 'open') {
        await copyRich('<p><strong>' + esc(summary) + '</strong></p>' + desc.innerHTML, '# ' + summary + '\n\n' + convert(desc, true));
        let wiki = convert(desc, false);
        if (encodeURIComponent(wiki).length > 6500) wiki = shortWiki(m, tab);   // long texts: links in the link, the full text on the clipboard
        window.open(JIRA.site + '/secure/CreateIssueDetails!init.jspa?pid=' + JIRA.pid + '&issuetype=' + typeId + '&summary=' + encodeURIComponent(summary) + '&description=' + encodeURIComponent(wiki), '_blank', 'noopener');
        say('Opened in Jira. The full description is on your clipboard too.');
      }
    });
    setTimeout(() => { const s0 = back.querySelector(tab === 'claude' ? '#jm-prompt' : '#jm-s-' + tab); if (s0) s0.focus(); }, 30);
  };

  /* ---- placement: the plan at the top, the button after each feature's last section, chips elsewhere ---- */
  const feats = cur.features || [];
  feats.forEach((f) => {
    const last = document.getElementById(lastSec(cur, f)); if (!last) return;
    const row = document.createElement('div');
    row.className = 'jira-row';
    row.id = 'jira-' + f.id;
    row.innerHTML = '<div class="jr-t"><b>Hand off · ' + esc(f.name) + '</b><span>Covers ' + f.sections.map(id => '<a href="#' + id + '">' + esc(secLabel(cur, id)) + '</a>').join(', ') +
      ((f.changes || []).length ? ' · updated ' + esc(fmtDate(f.changes[0][0])) : '') + '</span><span class="jr-k">Design task · Dev task · Claude prompt</span></div>' +
      '<button class="jira-btn" type="button">' + HAND_ICON + 'Hand off</button>';
    row.querySelector('button').addEventListener('click', () => openHandoff(f));
    last.appendChild(row);
    f.sections.filter(id => id !== last.id).forEach((id) => {
      const sec = document.getElementById(id); if (!sec) return;
      const chip = document.createElement('p');
      chip.className = 'jira-part';
      chip.innerHTML = HAND_ICON + '<span>Part of the feature <b>' + esc(f.name) + '</b>; hand it off at the end of <a href="#jira-' + f.id + '">' + esc(secLabel(cur, last.id)) + '</a>.</span>';
      sec.appendChild(chip);
    });
  });
  Object.entries(cur.refs || {}).forEach(([id, list]) => {
    const sec = document.getElementById(id); if (!sec) return;
    const chip = document.createElement('p');
    chip.className = 'jira-part';
    chip.innerHTML = HAND_ICON + '<span>Built as part of ' + list.map(([pid, fid]) => {
      const pg = PAGES.find(p => p.id === pid), ft = (pg.features || []).find(x => x.id === fid);
      return '<a href="' + pg.href + '#jira-' + fid + '"><b>' + esc(pg.label + ' · ' + ft.name) + '</b></a>';
    }).join(', ') + '.</span>';
    sec.appendChild(chip);
  });
  const wrap = document.querySelector('.doc-main') || document.querySelector('.wrap');   // the sections' column, under the dropdown
  if (feats.length && wrap) {
    const plan = document.createElement('details');
    plan.className = 'jplan';
    plan.innerHTML = '<summary>' + HAND_ICON + '<span><b>Hand-off for this page</b> · ' + feats.length + ' ' + (feats.length === 1 ? 'feature' : 'features') + ', each a design task, a dev task or a Claude prompt</span>' + CHEV + '</summary>' +
      '<ol>' + feats.map(f => '<li><div><b>' + esc(f.name) + '</b><span>' + esc(f.summary) + '</span><span class="cv">Covers ' + f.sections.map(id => '<a href="#' + id + '">' + esc(secLabel(cur, id)) + '</a>').join(', ') +
        ((f.changes || []).length ? ' · updated ' + esc(fmtDate(f.changes[0][0])) + ': ' + esc(f.changes[0][1]) : '') + '</span></div>' +
        '<button class="jira-btn" type="button" data-f="' + f.id + '">' + HAND_ICON + 'Hand off</button></li>').join('') + '</ol>' +
      (cur.refs ? '<p class="jp-note">' + Object.keys(cur.refs).map(id => esc(secLabel(cur, id))).join(', ') + ': built as part of other pages\' features.</p>' : '') +
      '<div class="jp-foot"><span class="status" role="status" aria-live="polite"></span>' +
        '<button class="btn" type="button" data-all="update">Copy prompt: update my prototype with this page</button>' +
        '<button class="btn" type="button" data-all="jira">Copy prompt: create all ' + feats.length + ' dev tasks</button></div>';
    plan.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-f]');
      if (b) { e.preventDefault(); openHandoff(feats.find(f => f.id === b.dataset.f)); return; }
      const all = e.target.closest('[data-all]'); if (!all) return;
      let prompt;
      if (all.dataset.all === 'jira') prompt = 'Create ' + feats.length + ' Jira tasks in project ' + JIRA.key + ' (' + JIRA.site.replace('https://', '') + '), all for the calendar\'s ' + cur.label + ', under one epic "Calendar · ' + cur.label + '" (create it if it does not exist).\n' +
        feats.map((f, i) => (i + 1) + '. ' + f.summary + '\n   Source of truth: ' + f.sections.map(id => DOCS + cur.href + '#' + id).join(' , ')).join('\n') +
        '\nFor each one, read its doc sections and the live prototype (' + PROTO_PROD + ') and write the description for the developers: context, what to build with every value and rule, the responsive behaviour, acceptance criteria, and links to the doc sections, the prototype and the Figma nodes. Show me all the texts before creating anything.';
      else prompt = 'My own copy of the Requests & Approval prototype is behind the handoff docs for the ' + cur.label + ' page (' + DOCS + cur.href + '). Bring it up to date, feature by feature.\n' +
        'Live reference: ' + PROTO_PROD + ' (one HTML file).\n\n' +
        feats.map((f, i) => (i + 1) + '. ' + f.name + ': spec at ' + f.sections.map(id => DOCS + cur.href + '#' + id).join(' , ') + ((f.code || []).length ? '\n   In the reference source: ' + f.code.join(', ') : '') +
          ((f.changes || []).length ? '\n   What changed: ' + f.changes.map(c => c[0] + ' ' + c[1]).join('; ') : '')).join('\n') +
        '\n\nFor each feature: compare my implementation with the spec and the live reference, list the differences, then fix them. Change nothing else. Finish with a summary per feature.';
      const st = plan.querySelector('.status');
      st.textContent = (await copyRich('<p>' + esc(prompt).replace(/\n/g, '<br>') + '</p>', prompt)) ? 'Prompt copied. Paste it into Claude.' : 'Could not copy.';
      setTimeout(() => { st.textContent = ''; }, 3600);
    });
    const dd = wrap.querySelector(':scope > .secdd');
    if (dd) dd.after(plan); else wrap.prepend(plan);
  }
})();
