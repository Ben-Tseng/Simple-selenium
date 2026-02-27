const MAX_ROUNDS = 5;
const STORAGE_KEY = 'autoClickRound';

// 读取当前轮次
let round = parseInt(localStorage.getItem(STORAGE_KEY) || '0');

if (round >= MAX_ROUNDS) {
  console.log('🎉 已完成全部 5 次，停止执行');
  localStorage.removeItem(STORAGE_KEY); // 清除记录，方便下次重新开始
} else {
  round += 1;
  localStorage.setItem(STORAGE_KEY, round);
  console.log(`🔄 第 ${round}/${MAX_ROUNDS} 次执行`);

  // 第一步：点击 Increase Task
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
    const el = search(document);
    if (el) {
      el.click();
      console.log('✅ 已点击:', el);
    } else {
      console.warn('❌ 未找到元素:', selector);
    }
  }

  deepClick('.increase-button button');

  // 第二步：1秒后点击 Accept
  setTimeout(() => {
    const acceptLink = [...document.querySelectorAll('a')]
      .find(a => a.textContent.trim() === 'Accept');
    if (acceptLink) {
      acceptLink.click();
      console.log('✅ 已点击 Accept');
    } else {
      console.warn('❌ 未找到 Accept 元素');
    }
  }, 1000);
}
