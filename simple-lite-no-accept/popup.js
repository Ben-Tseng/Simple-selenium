document.getElementById('startBtn').addEventListener('click', () => {
  const val = parseInt(document.getElementById('roundInput').value);
  if (!val || val < 1) {
    document.getElementById('status').textContent = '❌ 请输入有效数字';
    return;
  }
  startExecution(val);
});

// 按回车也可以触发
document.getElementById('roundInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('startBtn').click();
  }
});

function startExecution(maxRounds) {
  // 写入 localStorage 通过 content script 读取
  browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
    browser.tabs.sendMessage(tabs[0].id, {
      action: 'start',
      maxRounds: maxRounds
    }).then(() => {
      document.getElementById('status').textContent = `✅ 已启动 Increase 循环，共 ${maxRounds} 次`;
      setTimeout(() => window.close(), 1000);
    }).catch(() => {
      document.getElementById('status').textContent = '❌ 请刷新页面后重试';
    });
  });
}
