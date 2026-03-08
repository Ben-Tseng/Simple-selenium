const WAIT_MS = 1200;
const KEYWORDS = ['WORKFLOW HISTORY', 'BIV', 'ID', 'LOA'];
let running = false;

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

async function scanTab(tab, idx, total, windowId) {
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
    const jumpPromise = waitForTabJump(windowId, tab.id);

    const result = await browser.tabs.sendMessage(tab.id, {
      action: 'scan-and-click',
      keywords: KEYWORDS
    });

    if (!result || !result.clicked) {
      await notify(`[${idx}/${total}] 未命中`);
      return;
    }

    const [loading, jumped] = await Promise.all([loadingPromise, jumpPromise]);
    if (loading || jumped) {
      await notify(`[${idx}/${total}] 已点击并发生loading/跳转，继续下一个`);
    } else {
      await notify(`[${idx}/${total}] 已点击：${result.text || '命中目标'}`);
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
    const currentWindow = await browser.windows.getCurrent();
    const tabs = await browser.tabs.query({ windowId: currentWindow.id });
    tabs.sort((a, b) => a.index - b.index);

    await notify(`开始扫描，共 ${tabs.length} 个Tab`);

    for (let i = 0; i < tabs.length; i++) {
      const t = await browser.tabs.get(tabs[i].id).catch(() => null);
      if (!t) continue;
      await scanTab(t, i + 1, tabs.length, currentWindow.id);
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
