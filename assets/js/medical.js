/**
 * Last Bastion · medical.js
 * B5 醫療站：專案支援、常見問題、診療紀錄。
 * - 支援入口：data/projects.json 中 issuesUrl 有效的專案。
 * - 常見問題：data/faq.json，依專案分組。
 * - 診療紀錄：content/B5-infirmary/cases/index.json 的清單，
 *   案例內文是獨立片段，展開時才載入。
 * 任一資料來源失敗只影響該區塊。
 */

import { loadProjects, STATUS } from './projects.js';

const URL_FAQ = new URL('data/faq.json', document.baseURI);
const URL_CASES = new URL('content/B5-infirmary/cases/index.json', document.baseURI);

export async function mountMedical(root) {
  const supportHost = root.querySelector('[data-support]');
  const faqHost = root.querySelector('[data-faq]');
  const casesHost = root.querySelector('[data-cases]');
  if (!supportHost && !faqHost && !casesHost) return;

  const [projects, faq, cases] = await Promise.all([
    attempt(loadProjects),
    attempt(() => loadList(URL_FAQ, 'faq')),
    attempt(() => loadList(URL_CASES, 'cases')),
  ]);

  const projectList = projects.ok ? projects.value : [];
  const labels = new Map(projectList.map((project) => [project.id, project.name]));
  const order = new Map(projectList.map((project, index) => [project.id, index]));

  if (supportHost) supportHost.replaceChildren(buildSupport(projectList, projects.ok));
  if (faqHost) faqHost.replaceChildren(buildFaq(faq, labels, order));
  if (casesHost) casesHost.replaceChildren(buildCases(cases, labels));
}

async function attempt(task) {
  try {
    return { ok: true, value: await task() };
  } catch (error) {
    console.error(error);
    return { ok: false, value: [] };
  }
}

async function loadList(url, key) {
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`資料讀取失敗（HTTP ${response.status}）：${url.href}`);
  }
  const data = await response.json();
  return Array.isArray(data[key]) ? data[key] : [];
}

/* ---------- 專案支援 ---------- */

function buildSupport(projects, ok) {
  const wrap = document.createElement('div');
  wrap.className = 'support-list';

  if (!ok) {
    wrap.append(note('專案資料暫時無法載入。'));
    return wrap;
  }

  const supported = projects.filter((project) => isHttpUrl(project.issuesUrl));

  if (supported.length === 0) {
    wrap.append(note('目前沒有專案提供問題回報入口。'));
    return wrap;
  }

  for (const project of supported) {
    const card = document.createElement('article');
    card.className = 'support';

    const head = document.createElement('div');
    head.className = 'support__head';

    const name = document.createElement('h3');
    name.className = 'support__name';
    name.textContent = project.name;
    head.append(name);

    const status = STATUS[project.status];
    if (status) {
      const badge = document.createElement('span');
      badge.className = `badge badge--${status.tone}`;
      badge.textContent = status.label;
      head.append(badge);
    }

    const text = document.createElement('p');
    text.className = 'support__text';
    text.textContent = project.summary || '尚未填寫說明。';

    const link = document.createElement('a');
    link.className = 'btn btn--ghost support__link';
    link.href = project.issuesUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.append('問題回報');
    const go = document.createElement('span');
    go.setAttribute('aria-hidden', 'true');
    go.textContent = '↗';
    link.append(go);

    card.append(head, text, link);
    wrap.append(card);
  }

  return wrap;
}

/* ---------- 常見問題 ---------- */

function buildFaq(result, labels, order) {
  const wrap = document.createElement('div');
  wrap.className = 'faq-list';

  if (!result.ok) {
    wrap.append(note('常見問題暫時無法載入。'));
    return wrap;
  }

  const entries = result.value.filter((entry) => entry && entry.question);
  if (entries.length === 0) {
    wrap.append(note('尚無常見問題，內容隨專案累積。'));
    return wrap;
  }

  const groups = new Map();
  for (const entry of entries) {
    const key = entry.project || '';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }

  const sorted = [...groups.entries()].sort((a, b) => rank(a[0]) - rank(b[0]));

  for (const [projectId, items] of sorted) {
    const group = document.createElement('section');
    group.className = 'faq-group';

    const title = document.createElement('h3');
    title.className = 'faq-group__title';
    title.append(labels.get(projectId) || projectId || '一般問題');

    const count = document.createElement('span');
    count.className = 'faq-group__count';
    count.textContent = `${items.length}`;
    title.append(count);

    group.append(title);

    for (const item of items) {
      group.append(buildFaqItem(item));
    }

    wrap.append(group);
  }

  return wrap;

  function rank(projectId) {
    return order.has(projectId) ? order.get(projectId) : 999;
  }
}

function buildFaqItem(entry) {
  const details = document.createElement('details');
  details.className = 'faq';

  const summary = document.createElement('summary');
  summary.className = 'faq__summary';

  const question = document.createElement('span');
  question.className = 'faq__q';
  question.textContent = entry.question;
  summary.append(question);

  if (entry.tag) {
    const tag = document.createElement('span');
    tag.className = 'faq__tag';
    tag.textContent = entry.tag;
    summary.append(tag);
  }

  const answer = document.createElement('div');
  answer.className = 'faq__a';
  for (const paragraph of String(entry.answer || '').split(/\n{2,}/)) {
    if (!paragraph.trim()) continue;
    const p = document.createElement('p');
    p.textContent = paragraph.trim();
    answer.append(p);
  }

  details.append(summary, answer);
  return details;
}

/* ---------- 診療紀錄 ---------- */

function buildCases(result, labels) {
  const wrap = document.createElement('div');
  wrap.className = 'case-list';

  if (!result.ok) {
    wrap.append(note('診療紀錄暫時無法載入。'));
    return wrap;
  }

  const cases = result.value.filter((entry) => entry && entry.title);
  if (cases.length === 0) {
    wrap.append(note('尚無診療紀錄。'));
    return wrap;
  }

  for (const entry of cases) {
    wrap.append(buildCase(entry, labels));
  }

  return wrap;
}

function buildCase(entry, labels) {
  const details = document.createElement('details');
  details.className = 'case';

  const summary = document.createElement('summary');
  summary.className = 'case__summary';

  const title = document.createElement('span');
  title.className = 'case__title';
  title.textContent = entry.title;
  summary.append(title);

  const meta = document.createElement('span');
  meta.className = 'case__meta';
  meta.textContent = [labels.get(entry.project) || entry.project, entry.date]
    .filter(Boolean)
    .join(' · ');
  summary.append(meta);

  const body = document.createElement('div');
  body.className = 'case__body';
  if (entry.id) body.id = `case-body-${entry.id}`;

  details.append(summary, body);

  details.addEventListener('toggle', () => {
    if (!details.open || details.dataset.state) return;
    details.dataset.state = 'loading';
    loadCase(entry, body, details);
  });

  return details;
}

async function loadCase(entry, body, details) {
  if (!entry.file) {
    body.textContent = '這個案例尚未提供內容檔。';
    details.dataset.state = 'error';
    return;
  }

  try {
    const url = new URL(entry.file, URL_CASES);
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    body.innerHTML = await response.text();
    details.dataset.state = 'loaded';
  } catch (error) {
    console.error(error);
    body.textContent = '案例內容載入失敗。';
    details.dataset.state = 'error';
  }
}

/* ---------- 共用 ---------- */

function isHttpUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

function note(text) {
  const p = document.createElement('p');
  p.className = 'project-empty';
  p.textContent = text;
  return p;
}
