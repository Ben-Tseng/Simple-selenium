const WAIT_MS = 1200;
const KEY_STORAGE = 'liteKeyword';
let running = false;

function isScriptableUrl(url = '') {
  return /^https?:\/\//i.test(url);
}

async function notify(text) {
  try {
    await browser.runtime.sendMessage({ action: 'scan-progress', text });
  } catch (_) {
    // popup未打开时忽略
  }
}

function waitForLoading(tabId, timeoutMs = WAIT_MS) {
  return new Promise((resolve) => {
    let done = false;
    let timer = null;

    const finish = (value) => {
      if (done) return;
      done = true;
      browser.tabs.onUpdated.removeListener(onUpdated);
      if (timer) clearTimeout(timer);
      resolve(value);
    };

    const onUpdated = (updatedTabId, changeInfo) => {
      if (updatedTabId !== tabId) return;
      if (changeInfo.status === 'loading') finish(true);
    };

    browser.tabs.onUpdated.addListener(onUpdated);
    timer = setTimeout(() => finish(false), timeoutMs);
  });
}

function waitForTabJump(windowId, fromTabId, timeoutMs = WAIT_MS) {
  return new Promise((resolve) => {
    let done = false;
    let timer = null;

    const finish = (value) => {
      if (done) return;
      done = true;
      browser.tabs.onActivated.removeListener(onActivated);
      if (timer) clearTimeout(timer);
      resolve(value);
    };

    const onActivated = (info) => {
      if (info.windowId !== windowId) return;
      if (info.tabId === fromTabId) return;
      finish(true);
    };

    browser.tabs.onActivated.addListener(onActivated);
    timer = setTimeout(() => finish(false), timeoutMs);
  });
}

function scanCode(keyword) {
  return `(() => {
    const kw = ${JSON.stringify(keyword)}.trim().toUpperCase();
    if (!kw) return { clicked: false };

    function textOf(el) {
      if (!el) return '';
      if (el.tagName === 'INPUT') return (el.value || '').trim();
      return (el.innerText || el.textContent || '').trim();
    }

    function isVisible(el) {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    }

    const nodes = [
      ...document.querySelectorAll('a[href]'),
      ...document.querySelectorAll('button'),
      ...document.querySelectorAll('[role="button"]'),
      ...document.querySelectorAll('input[type="button"], input[type="submit"]')
    ];

    const seen = new Set();
    for (const el of nodes) {
      if (!el || seen.has(el)) continue;
      seen.add(el);
      if (!isVisible(el)) continue;
      if (el.disabled || el.getAttribute('aria-disabled') === 'true') continue;

      const text = textOf(el);
      if (!text) continue;
      if (!text.toUpperCase().includes(kw)) continue;

      const type = el.tagName === 'A' ? 'link' : 'button';
      el.click();
      return { clicked: true, type, text: text.slice(0, 120) };
    }

    return { clicked: false };
  })();`;
}

async function getKeyword() {
  const data = await browser.storage.local.get(KEY_STORAGE);
  return String(data[KEY_STORAGE] || '').trim();
}

async function scanTab(tab, idx, total, keyword) {
  if (!isScriptableUrl(tab.url)) {
    await notify(`[${idx}/${total}] 跳过不可注入页面`);
    return;
  }

  if (tab.status === 'loading') {
    await notify(`[${idx}/${total}] Tab加载中，跳过`);
    return;
  }

  await notify(`[${idx}/${total}] 检测中`);

  try {
    const loadingPromise = waitForLoading(tab.id);
    const jumpPromise = waitForTabJump(tab.windowId, tab.id);

    const results = await browser.tabs.executeScript(tab.id, {
      code: scanCode(keyword),
      allFrames: true
    });

    const hit = (Array.isArray(results) ? results : []).find((r) => r && r.clicked);
    if (!hit) {
      await notify(`[${idx}/${total}] 未命中`);
      return;
    }

    const [loading, jumped] = await Promise.all([loadingPromise, jumpPromise]);
    const behavior = loading || jumped ? '（触发了加载/跳转）' : '';
    await notify(`[${idx}/${total}] 已${hit.type === 'link' ? '打开链接' : '点击按钮'}：${hit.text}${behavior}`);
  } catch (_) {
    await notify(`[${idx}/${total}] 检测失败，已跳过`);
  }
}

async function runScan() {
  if (running) {
    await notify('已有扫描在执行');
    return;
  }

  running = true;
  try {
    const keyword = await getKeyword();
    if (!keyword) {
      await notify('请先在弹窗输入并保存关键词');
      return;
    }

    const tabs = await browser.tabs.query({});
    tabs.sort((a, b) => {
      if (a.windowId !== b.windowId) return a.windowId - b.windowId;
      return a.index - b.index;
    });

    await notify(`开始扫描，共 ${tabs.length} 个Tab，关键词：${keyword}`);

    for (let i = 0; i < tabs.length; i++) {
      const t = await browser.tabs.get(tabs[i].id).catch(() => null);
      if (!t) continue;
      await scanTab(t, i + 1, tabs.length, keyword);
    }

    await notify('扫描完成');
  } finally {
    running = false;
  }
}

browser.runtime.onMessage.addListener((message) => {
  if (!message || message.action !== 'start-scan') return;
  runScan();
  return Promise.resolve({ started: true });
});
