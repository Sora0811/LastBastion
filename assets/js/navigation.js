/**
 * Last Bastion · navigation.js
 * 讀取 data/navigation.json，攤平成房間查表，並產生左側「樓梯／走廊」通道圖。
 * 只處理結構，內容載入與路由在 app.js。
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

export async function loadNavigation(url = new URL('data/navigation.json', document.baseURI)) {
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`導覽資料讀取失敗（HTTP ${response.status}）：${url.href}`);
  }

  const data = await response.json();
  if (!Array.isArray(data.floors) || data.floors.length === 0) {
    throw new Error('導覽資料缺少 floors 清單');
  }
  if (!data.home) {
    throw new Error('導覽資料缺少 home（首頁房間）');
  }
  return data;
}

/**
 * 把樓層與房間攤平成 byId，並附上樓層、父層與來時路（trail）。
 * 支援多層子房間，之後要加第三層也不必改選單程式。
 */
export function indexRooms(data) {
  const byId = new Map();
  const groups = [];

  const visit = (room, floor, trail) => {
    if (!room || !room.id || !room.path) {
      throw new Error(`房間資料不完整（需 id 與 path）：${JSON.stringify(room)}`);
    }
    if (byId.has(room.id)) {
      throw new Error(`房間 id 重複：${room.id}`);
    }

    const entry = {
      id: room.id,
      label: room.label || room.id,
      code: room.code || '',
      path: room.path,
      summary: room.summary || '',
      floor,
      trail,
      children: [],
    };

    byId.set(entry.id, entry);
    entry.children = (room.children || []).map((child) => visit(child, floor, [...trail, entry]));
    return entry;
  };

  for (const floor of data.floors) {
    const info = { id: floor.id || '', code: floor.code || '', name: floor.name || '' };
    for (const room of floor.rooms || []) {
      groups.push(visit(room, info, []));
    }
  }

  return { data, byId, groups };
}

export function renderNav(container, model) {
  container.replaceChildren();
  for (const entry of model.groups) {
    container.append(buildGroup(entry));
  }
  syncNav(container, null, model);
}

function buildGroup(entry) {
  const group = document.createElement('section');
  group.className = 'floor';
  group.dataset.roomId = entry.id;

  const row = document.createElement('div');
  row.className = 'floor__row';
  row.append(buildLink(entry, 'stairs', true));
  group.append(row);

  if (entry.children.length > 0) {
    const listId = `nav-children-${entry.id}`;
    const list = document.createElement('ul');
    list.className = 'floor__rooms';
    list.id = listId;
    list.hidden = true;

    for (const child of entry.children) {
      const item = document.createElement('li');
      item.append(buildLink(child, 'corridor', false));
      list.append(item);
    }

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'floor__toggle';
    toggle.setAttribute('aria-controls', listId);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', `展開 ${entry.label} 的走廊`);
    toggle.append(makeIcon('icon-chevron', 'chevron'));
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      const next = !expanded;
      toggle.setAttribute('aria-expanded', String(next));
      toggle.setAttribute('aria-label', `${next ? '收合' : '展開'} ${entry.label} 的走廊`);
      list.hidden = !next;
    });

    row.append(toggle);
    group.append(list);
  }

  return group;
}

function buildLink(entry, kind, withMeta) {
  const link = document.createElement('a');
  link.className = `link link--${kind}`;
  link.href = `#/${entry.id}`;
  link.dataset.roomId = entry.id;
  link.append(makeIcon(kind === 'stairs' ? 'icon-stairs' : 'icon-corridor'));

  const body = document.createElement('span');
  body.className = 'link__body';

  const label = document.createElement('span');
  label.className = 'link__label';
  label.textContent = entry.label;
  body.append(label);

  if (withMeta) {
    const meta = document.createElement('span');
    meta.className = 'link__meta';
    meta.textContent = [entry.floor.code, entry.floor.name].filter(Boolean).join(' · ');
    body.append(meta);
  }

  link.append(body);
  return link;
}

function makeIcon(id, className = 'link__glyph') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', className);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `#${id}`);
  svg.append(use);
  return svg;
}

/** 標記目前位置、走過來的樓層，並展開所在樓層的走廊。 */
export function syncNav(container, currentId, model) {
  const room = currentId ? model.byId.get(currentId) : null;
  const trailIds = new Set((room ? room.trail : []).map((item) => item.id));
  const expandIds = new Set(trailIds);
  if (room && room.children.length > 0) expandIds.add(room.id);

  for (const link of container.querySelectorAll('a.link')) {
    const id = link.dataset.roomId;
    if (id === currentId) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
    link.classList.toggle('is-trail', trailIds.has(id));
  }

  for (const group of container.querySelectorAll('.floor')) {
    if (!expandIds.has(group.dataset.roomId)) continue;

    const toggle = group.querySelector('.floor__toggle');
    const list = group.querySelector('.floor__rooms');
    if (!toggle || !list) continue;

    const label = group.querySelector('.link__label');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', `收合 ${label ? label.textContent : '樓層'} 的走廊`);
    list.hidden = false;
  }
}
