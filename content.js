const STORAGE_KEY = 'autoClickRound';
const MAX_KEY = 'autoClickMax';

function deepClick(selector) {
  function search(root) {
    const found = root.querySelector(selector);
    if (found) return found;
    for (const el of root.querySelectorAll('*')) {
      if (el.shadowRoot) {
        const result = search(el.shadowRoot);
        if (result) return result;
      }
    }
    return null;
  }
  return search(document);
}

function runRound() {
  let round = parseInt(localStorage.getItem(STORAGE_KEY) || '0');
  let max = parseInt(localStorage.getItem(MAX_KEY) || '0');

  if (max === 0 || round >= max) {
    console.log('🎉 全部完成或未启动');
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(MAX_KEY);
    return;
  }

  round++;
  localStorage.setItem(STORAGE_KEY, round);
  console.log(`🔄 第 ${round}/${max} 次执行`);

  const btn = deepClick('.increase-button button');
  if (btn) {
    btn.click();
    console.log('✅ 已点击 Increase Task');
  } else {
    console.warn('❌ 未找到 Increase Task');
  }

  async function delay(ms = 10000) {   // 默认10秒
    return new Promise(r => setTimeout(r, ms));
}

  setTimeout(() => {
    const acceptLink = [...document.querySelectorAll('a')]
      .find(a => a.textContent.trim() === 'Accept');
    if (acceptLink) {
      acceptLink.click();
      console.log('✅ 已点击 Accept');
      deplay();
      
    } else {
      console.warn('❌ 未找到 Accept');
    }
  }, 6000);
  // 最简单的空等待
}

// 监听来自 popup 或快捷键的消息
browser.runtime.onMessage.addListener((message) => {
  if (message.action === 'start') {
    localStorage.setItem(STORAGE_KEY, '0');
    localStorage.setItem(MAX_KEY, message.maxRounds);
    console.log(`🚀 启动，共 ${message.maxRounds} 次`);
    runRound();
  }
});

// 页面加载时检查是否有未完成的任务（处理跳转后继续执行）
(function checkOnLoad() {
  const round = parseInt(localStorage.getItem(STORAGE_KEY) || '0');
  const max = parseInt(localStorage.getItem(MAX_KEY) || '0');
  if (max > 0 && round < max) {
    console.log('📌 检测到未完成任务，继续执行...');
    runRound();
  }
})();
