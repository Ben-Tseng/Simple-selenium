const WAIT_MS = 1200;
const STORAGE_KEY = 'tabRuleRunnerRules';
let running = false;

const DEFAULT_RULES = [
  {
    name: 'Workflow history click',
    keyword: 'WORKFLOW HISTORY',
    matchType: 'contains',
    enabled: true,
    script: "(function(){var el=[...document.querySelectorAll('button,a,[role=\"button\"]')].find(n=>/workflow history/i.test((n.innerText||n.textContent||'').trim())); if(el) el.click();})();"
  }
];

function isScriptableUrl(url = '') {
  return /^https?:\/\//i.test(url);
}

async function notify(text) {
  try {
    await browser.runtime.sendMessage({ action: 'scan-progress', text });
  } catch (_) {
    // popup可能未打开
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

function normalizeRules(input) {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      const rule = {
        name: String((item && item.name) || '').trim(),
        keyword: String((item && item.keyword) || '').trim(),
        matchType: item && item.matchType === 'regex' ? 'regex' : 'contains',
        enabled: item && item.enabled !== false,
        script: String((item && item.script) || '').trim()
      };

      if (!rule.name) rule.name = 'Unnamed Rule';
      return rule;
    })
    .filter((rule) => rule.keyword && rule.script);
}

async function getRules() {
  const stored = await browser.storage.local.get(STORAGE_KEY);
  const normalized = normalizeRules(stored[STORAGE_KEY]);
  if (normalized.length > 0) return normalized;

  await browser.storage.local.set({ [STORAGE_KEY]: DEFAULT_RULES });
  return DEFAULT_RULES;
}

async function executeRuleScript(tabId, script) {
  return browser.tabs.executeScript(tabId, { code: script });
}

async function scanTab(tab, idx, total, rules) {
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
    const result = await browser.tabs.sendMessage(tab.id, {
      action: 'scan-rules',
      rules
    });

    const matched = Array.isArray(result && result.matched) ? result.matched : [];
    if (matched.length === 0) {
      await notify(`[${idx}/${total}] 未命中`);
      return;
    }

    await notify(`[${idx}/${total}] 命中 ${matched.length} 条规则，执行脚本中`);

    for (const hit of matched) {
      const rule = rules[hit.index];
      if (!rule || !rule.enabled) continue;

      const loadingPromise = waitForLoading(tab.id);
      const jumpPromise = waitForTabJump(tab.windowId, tab.id);

      try {
        await executeRuleScript(tab.id, rule.script);
        const [loading, jumped] = await Promise.all([loadingPromise, jumpPromise]);
        const behavior = loading || jumped ? '（触发了加载/跳转）' : '';
        await notify(`[${idx}/${total}] 已执行：${rule.name}${behavior}`);
      } catch (err) {
        await notify(`[${idx}/${total}] 执行失败：${rule.name} - ${err && err.message ? err.message : '未知错误'}`);
      }
    }
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
    const rules = await getRules();
    if (rules.length === 0) {
      await notify('没有可用规则，请先在弹窗保存规则');
      return;
    }

    const tabs = await browser.tabs.query({});
    tabs.sort((a, b) => {
      if (a.windowId !== b.windowId) return a.windowId - b.windowId;
      return a.index - b.index;
    });

    await notify(`开始扫描，共 ${tabs.length} 个Tab，规则 ${rules.length} 条`);

    for (let i = 0; i < tabs.length; i++) {
      const t = await browser.tabs.get(tabs[i].id).catch(() => null);
      if (!t) continue;
      await scanTab(t, i + 1, tabs.length, rules);
    }

    await notify('扫描完成');
  } finally {
    running = false;
  }
}

browser.runtime.onMessage.addListener((message) => {
  if (!message || !message.action) return;

  if (message.action === 'start-scan') {
    runScan();
    return Promise.resolve({ started: true });
  }

  if (message.action === 'get-rules') {
    return getRules().then((rules) => ({ rules }));
  }

  if (message.action === 'save-rules') {
    const rules = normalizeRules(message.rules);
    return browser.storage.local
      .set({ [STORAGE_KEY]: rules })
      .then(() => ({ ok: true, count: rules.length }));
  }
});
