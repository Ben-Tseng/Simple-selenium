const statusEl = document.getElementById('status');

document.getElementById('startBtn').addEventListener('click', async () => {
  statusEl.textContent = '正在启动扫描...';
  try {
    const res = await browser.runtime.sendMessage({ action: 'start-scan' });
    statusEl.textContent = res && res.started ? '已开始，后台扫描中' : '启动失败，请重试';
  } catch (err) {
    statusEl.textContent = `启动失败：${err && err.message ? err.message : '未知错误'}`;
  }
});

browser.runtime.onMessage.addListener((msg) => {
  if (!msg || msg.action !== 'scan-progress') return;
  statusEl.textContent = msg.text || '扫描中';
});
