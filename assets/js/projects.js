/**
 * Last Bastion · projects.js
 * 外部專案入口：讀取 data/projects.json，填入房間內的 [data-projects] 容器。
 * 容器寫 data-projects="房間-id" 只顯示該房列出的專案；留空或 all 顯示全部。
 * 沒有 url 的項目會顯示為「連結待補」，不會產生空連結。
 */

const URL_PROJECTS = new URL('data/projects.json', document.baseURI);

export const STATUS = {
  live: { label: '已發布', tone: 'live', rank: 0 },
  wip: { label: '開發中', tone: 'draft', rank: 1 },
  draft: { label: '規劃中', tone: 'hold', rank: 2 },
  hold: { label: '暫停', tone: 'hold', rank: 3 },
};

let cache = null;

/** 讀取全部專案資料；醫療站的支援區也共用同一份。 */
export function loadProjects() {
  if (!cache) {
    cache = fetch(URL_PROJECTS, { cache: 'no-cache' })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`外部專案資料讀取失敗（HTTP ${response.status}）：${URL_PROJECTS.href}`);
        }
        return response.json();
      })
      .then((data) => (Array.isArray(data.projects) ? data.projects : []))
      .catch((error) => {
        cache = null;
        throw error;
      });
  }
  return cache;
}

/**
 * 把房間內所有 [data-projects] 容器填上專案清單。
 * 失敗時只留一行提示，不影響房間其餘內容。
 */
export async function mountProjects(root) {
  const hosts = root.querySelectorAll('[data-projects]');
  if (hosts.length === 0) return;

  let projects = [];
  let failed = false;

  try {
    projects = await loadProjects();
  } catch (error) {
    console.error(error);
    failed = true;
  }

  for (const host of hosts) {
    host.replaceChildren(buildList(projects, host.dataset.projects, failed));
  }
}

function buildList(projects, scope, failed) {
  const wrap = document.createElement('div');
  wrap.className = 'project-list';

  if (failed) {
    wrap.append(note('外部專案資料暫時無法載入。'));
    return wrap;
  }

  const visible = projects
    .filter((project) => project && project.name)
    .filter((project) => {
      if (!scope || scope === 'all') return true;
      return Array.isArray(project.rooms) && project.rooms.includes(scope);
    })
    .sort(compareProjects);

  if (visible.length === 0) {
    wrap.append(note('目前沒有已登錄的外部專案。'));
    return wrap;
  }

  for (const project of visible) {
    wrap.append(buildItem(project));
  }

  return wrap;
}

function compareProjects(a, b) {
  const order = (project) => (STATUS[project.status] ? STATUS[project.status].rank : 9);
  const byStatus = order(a) - order(b);
  if (byStatus !== 0) return byStatus;

  const byYear = Number(b.year || 0) - Number(a.year || 0);
  if (byYear !== 0) return byYear;

  return String(a.name).localeCompare(String(b.name), 'zh-Hant');
}

function buildItem(project) {
  const published = typeof project.url === 'string' && project.url.trim() !== '';
  const status = STATUS[project.status] || STATUS.draft;
  const item = document.createElement(published ? 'a' : 'div');
  item.className = published ? 'project' : 'project project--pending';

  if (published) {
    item.href = project.url;
    item.target = '_blank';
    item.rel = 'noopener noreferrer';
  }

  const head = document.createElement('span');
  head.className = 'project__head';

  const name = document.createElement('span');
  name.className = 'project__name';
  name.textContent = project.name;
  head.append(name);
  head.append(badge(published ? status.label : '連結待補', published ? status.tone : 'hold'));

  const text = document.createElement('span');
  text.className = 'project__text';
  text.textContent = project.summary || '尚未填寫說明。';

  const meta = document.createElement('span');
  meta.className = 'project__meta';

  if (project.year) {
    meta.append(part(String(project.year)));
  }
  if (published) {
    const host = hostnameOf(project.url);
    if (host) meta.append(part(host));
  }
  for (const tag of (Array.isArray(project.tags) ? project.tags : []).slice(0, 3)) {
    meta.append(part(String(tag)));
  }

  if (published) {
    const go = document.createElement('span');
    go.className = 'project__go';
    go.setAttribute('aria-hidden', 'true');
    go.textContent = '↗';
    meta.append(go);
  }

  item.append(head, text, meta);
  return item;
}

function part(text) {
  const span = document.createElement('span');
  span.textContent = text;
  return span;
}

function badge(text, tone) {
  const span = document.createElement('span');
  span.className = `badge badge--${tone}`;
  span.textContent = text;
  return span;
}

function note(text) {
  const p = document.createElement('p');
  p.className = 'project-empty';
  p.textContent = text;
  return p;
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch (error) {
    return '';
  }
}
