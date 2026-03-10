const KEY_STORAGE = 'liteKeyword';
const statusEl = document.getElementById('status');
const keywordInput = document.getElementById('keywordInput');

async function loadKeyword() {
  try {
    const data = await browser.storage.local.get(KEY_STORAGE);
    const keyword = String(data[KEY_STORAGE] || '');
    keywordInput.value = keyword;
    statusEl.textContent = keyword ? '关键词已加载' : '请先输入关键词';
  } catch (err) {
    statusEl.textContent = `读取失败：${err && err.message ? err.message : '未知错误'}`;
  }
}

async function saveKeyword() {
  const keyword = keywordInput.value.trim();
  if (!keyword) {
    statusEl.textContent = '关键词不能为空';
    return;
  }

  try {
    await browser.storage.local.set({ [KEY_STORAGE]: keyword });
    statusEl.textContent = `已保存关键词：${keyword}`;
  } catch (err) {
    statusEl.textContent = `保存失败：${err && err.message ? err.message : '未知错误'}`;
  }
}

document.getElementById('saveBtn').addEventListener('click', saveKeyword);

document.getElementById('startBtn').addEventListener('click', async () => {
  const keyword = keywordInput.value.trim();
  if (!keyword) {
    statusEl.textContent = '请先输入关键词';
    return;
  }

  try {
    await browser.storage.local.set({ [KEY_STORAGE]: keyword });
    const res = await browser.runtime.sendMessage({ action: 'start-scan' });
    statusEl.textContent = res && res.started ? '已开始扫描' : '启动失败';
  } catch (err) {
    statusEl.textContent = `启动失败：${err && err.message ? err.message : '未知错误'}`;
  }
});

browser.runtime.onMessage.addListener((msg) => {
  if (!msg || msg.action !== 'scan-progress') return;
  statusEl.textContent = msg.text || '扫描中';
});

loadKeyword();
