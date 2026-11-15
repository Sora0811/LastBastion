/**
 * Last Bastion · app.js
 * 以 hash 路由（#/房間 id）切換房間，內容來自 content/ 下的 HTML 片段。
 * 使用 hash 是為了 GitHub Pages 專案站重新整理後仍能回到同一間房。
 */

import { loadNavigation, indexRooms, renderNav, syncNav } from './navigation.js';
import { mountProjects } from './projects.js';
import { mountMedical } from './medical.js';

const els = {};
const fragmentCache = new Map();

let model = null;
let renderToken = 0;

const SKELETON = `
  <div class="skeleton" aria-hidden="true">
    <span class="skeleton__line" style="width: 32%"></span>
    <span class="skeleton__line" style="width: 94%"></span>
    <span class="skeleton__line" style="width: 86%"></span>
    <span class="skeleton__line" style="width: 72%"></span>
    <span class="skeleton__line" style="width: 58%"></span>
  </div>`;

function boot() {
  els.sheet = document.getElementById('room');
  els.title = document.getElementById('room-title');
  els.lead = document.getElementById('room-lead');
  els.body = document.getElementById('room-body');
  els.chipFloor = document.getElementById('chip-floor');
  els.chipZone = document.getElementById('chip-zone');
  els.crumbs = document.getElementById('crumbs');
  els.footRoom = document.getElementById('foot-room');
  els.nav = document.getElementById('site-nav');
  els.toggle = document.getElementById('rail-toggle');
  els.live = document.getElementById('live');

  bindChrome();

  loadNavigation()
    .then((data) => {
      model = indexRooms(data);
      renderNav(els.nav, model);
      window.addEventListener('hashchange', () => route());
      route({ initial: true });
    })
    .catch((error) => {
      console.error(error);
      paintFatal(error);
    });
}

function bindChrome() {
  els.toggle.addEventListener('click', () => {
    setNavOpen(!document.body.classList.contains('is-nav-open'));
  });

  for (const veil of document.querySelectorAll('[data-close-nav]')) {
    veil.addEventListener('click', () => setNavOpen(false));
  }

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (!document.body.classList.contains('is-nav-open')) return;
    setNavOpen(false);
    els.toggle.focus();
  });

  const wide = window.matchMedia('(min-width: 961px)');
  if (wide.addEventListener) {
    wide.addEventListener('change', (event) => {
      if (event.matches) setNavOpen(false);
    });
  }

  const skip = document.querySelector('[data-skip-link]');
  if (skip) {
    skip.addEventListener('click', (event) => {
      event.preventDefault();
      els.sheet.focus();
    });
  }

  els.nav.addEventListener('click', (event) => {
    if (event.target.closest('a.link')) setNavOpen(false);
  });
}

function setNavOpen(open) {
  const isOpen = document.body.classList.contains('is-nav-open');
  if (open === isOpen) return;

  document.body.classList.toggle('is-nav-open', open);
  els.toggle.setAttribute('aria-expanded', String(open));

  if (open) {
    const target = els.nav.querySelector('a[aria-current="page"]') || els.nav.querySelector('a.link');
    if (target) target.focus({ preventScroll: true });
  }
}

async function route({ initial = false } = {}) {
  const id = currentRouteId();
  const room = model.byId.get(id);
  const token = ++renderToken;

  syncNav(els.nav, room ? room.id : null, model);
  setNavOpen(false);

  if (!room) {
    paintMissing(id);
    window.scrollTo({ top: 0, behavior: 'auto' });
    return;
  }

  paintRoom(room);
  els.body.setAttribute('aria-busy', 'true');
  els.body.innerHTML = SKELETON;

  try {
    const html = await loadFragment(room);
    if (token !== renderToken) return;
    els.body.innerHTML = html;
    bindDemos(els.body);
    mountProjects(els.body).catch((error) => console.error(error));
    mountMedical(els.body).catch((error) => console.error(error));
  } catch (error) {
    if (token !== renderToken) return;
    console.error(error);
    paintContentError(room, error);
  } finally {
    if (token === renderToken) els.body.removeAttribute('aria-busy');
  }

  if (!initial) window.scrollTo({ top: 0, behavior: 'auto' });
  els.title.focus({ preventScroll: true });
  announce(`${room.floor.code} ${room.label}，${room.summary}`);
}

function currentRouteId() {
  const raw = window.location.hash.replace(/^#\/?/, '');
  let id = raw;
  try {
    id = decodeURIComponent(raw);
  } catch (error) {
    /* 編碼壞掉時直接用原字串查表，查不到會顯示找不到房間 */
  }
  return id.replace(/\/+$/, '').trim() || model.data.home;
}

async function loadFragment(room) {
  const url = new URL(room.path, document.baseURI).href;
  if (fragmentCache.has(url)) return fragmentCache.get(url);

  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`無法讀取 ${room.path}（HTTP ${response.status}）`);
  }

  const html = await response.text();
  fragmentCache.set(url, html);
  return html;
}

function paintRoom(room) {
  els.sheet.dataset.room = room.id;
  els.chipFloor.textContent = room.floor.code || '—';
  els.chipZone.textContent = room.floor.name || '未分層';
  els.title.textContent = room.label;
  els.lead.textContent = room.summary;
  els.footRoom.textContent = room.code || room.id;
  document.title = `${room.label} · 最後堡壘 LAST BASTION`;
  paintCrumbs(room);
}

function paintCrumbs(room) {
  const parts = [];
  const floor = document.createElement('span');
  floor.className = 'crumbs__floor';
  floor.textContent = [room.floor.code, room.floor.name].filter(Boolean).join(' ');
  parts.push(floor);

  const separator = () => {
    const span = document.createElement('span');
    span.className = 'crumbs__sep';
    span.setAttribute('aria-hidden', 'true');
    span.textContent = '/';
    return span;
  };

  for (const parent of room.trail) {
    parts.push(separator());
    const link = document.createElement('a');
    link.href = `#/${parent.id}`;
    link.textContent = parent.label;
    parts.push(link);
  }

  parts.push(separator());
  const here = document.createElement('span');
  here.className = 'crumbs__here';
  here.setAttribute('aria-current', 'location');
  here.textContent = room.label;
  parts.push(here);

  els.crumbs.replaceChildren(...parts);
}

function paintMissing(id) {
  document.title = '找不到房間 · 最後堡壘';
  els.sheet.dataset.room = 'missing';
  els.chipFloor.textContent = '??';
  els.chipZone.textContent = '未知區域';
  els.title.textContent = '這條通道沒有盡頭';
  els.lead.textContent = '通道圖上沒有這個房間，可能是連結有誤，或房間還沒搬進來。';
  els.footRoom.textContent = 'NOT FOUND';
  els.crumbs.replaceChildren();
  els.body.removeAttribute('aria-busy');
  els.body.innerHTML = `
    <div class="panel-note">
      <strong>查無房間：</strong> <code>${escapeHtml(id)}</code><br>
      請從左側通道圖重新選擇，或回到交誼廳。
    </div>
    <p><a class="btn btn--ghost" href="#/${escapeHtml(model.data.home)}">回到交誼廳</a></p>`;
  els.title.focus({ preventScroll: true });
  announce('找不到房間');
}

function paintContentError(room, error) {
  els.body.removeAttribute('aria-busy');
  els.body.innerHTML = `
    <div class="panel-note">
      <strong>房間內容載入失敗。</strong><br>
      請確認 <code>${escapeHtml(room.path)}</code> 存在，且網站是透過 HTTP 開啟（<code>file://</code> 會被瀏覽器阻擋）。<br>
      <span style="font-family: var(--font-mono); font-size: 12px;">${escapeHtml(error.message)}</span>
    </div>
    <p>本機預覽：在專案目錄執行 <code>python -m http.server 8080</code>，再開啟 <code>http://localhost:8080/</code>。</p>`;
  announce('房間內容載入失敗');
}

function paintFatal(error) {
  els.chipFloor.textContent = '!!';
  els.chipZone.textContent = '通道圖離線';
  els.title.textContent = '通道圖無法載入';
  els.lead.textContent = '網站需要讀取 data/navigation.json。請以靜態 HTTP 伺服器開啟，不要直接雙擊 index.html。';
  els.footRoom.textContent = 'OFFLINE';
  els.body.innerHTML = `
    <div class="panel-note">
      <strong>${escapeHtml(error.message)}</strong><br>
      本機預覽：在專案目錄執行 <code>python -m http.server 8080</code>，再開啟 <code>http://localhost:8080/</code>。<br>
      GitHub Pages 請確認 <code>data/navigation.json</code> 已提交，且 Pages 來源設定正確。
    </div>`;
  announce('通道圖無法載入');
}

function bindDemos(root) {
  for (const demo of root.querySelectorAll('[data-demo]')) {
    const button = demo.querySelector('[data-demo-toggle]');
    const readout = demo.querySelector('[data-demo-readout]');
    if (!button) continue;

    button.addEventListener('click', () => {
      const on = demo.classList.toggle('is-on');
      button.setAttribute('aria-pressed', String(on));
      button.textContent = on ? '關閉照明' : '開啟照明';
      if (readout) {
        readout.dataset.state = on ? 'on' : 'off';
        readout.textContent = on ? 'ON · 照明正常' : 'OFF · 待機中';
      }
    });
  }
}

function announce(text) {
  if (els.live) els.live.textContent = text;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
