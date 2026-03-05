const STORAGE_KEY = 'autoClickRound';
const MAX_KEY = 'autoClickMax';

async function delay(ms = 10000) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function deepQuery(selector, root = document) {
  let found = root.querySelector(selector);
  if (found) return found;

  for (const el of root.querySelectorAll('*')) {
    if (el.shadowRoot) {
      found = deepQuery(selector, el.shadowRoot);
      if (found) return found;
    }
  }
  return null;
}

async function runRound() {
  const round = parseInt(localStorage.getItem(STORAGE_KEY) || '0');
  const max = parseInt(localStorage.getItem(MAX_KEY) || '0');

  if (max === 0 || round >= max) {
    console.log('🎉 全部完成或未设置次数');
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(MAX_KEY);
    return;
  }

  const nextRound = round + 1;
  localStorage.setItem(STORAGE_KEY, String(nextRound));
  console.log(`🔄 第 ${nextRound} / ${max} 轮`);

  const btn = deepQuery('.increase-button button');
  if (btn) {
    btn.click();
    console.log('✅ 已点击 Increase Task');
  } else {
    console.warn('❌ 未找到 .increase-button button');
  }

  await delay(5000);
  runRound();
}

browser.runtime.onMessage.addListener((message) => {
  if (message.action === 'start') {
    localStorage.setItem(STORAGE_KEY, '0');
    localStorage.setItem(MAX_KEY, String(message.maxRounds || 10));
    console.log(`🚀 开始自动点击，共 ${message.maxRounds || 10} 次`);
    runRound();
  }
});

(function checkOnLoad() {
  const round = parseInt(localStorage.getItem(STORAGE_KEY) || '0');
  const max = parseInt(localStorage.getItem(MAX_KEY) || '0');

  if (max > 0 && round < max) {
    console.log(`📌 检测到未完成任务（${round}/${max}），2秒后继续...`);
    setTimeout(runRound, 2000);
  }
})();
