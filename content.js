const MAX_ROUNDS = 5;
const STORAGE_KEY = 'autoClickRound';

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

  if (round >= MAX_ROUNDS) {
    console.log('🎉 已完成全部 5 次，停止执行');
    localStorage.removeItem(STORAGE_KEY);
    return;
  }

  round++;
  localStorage.setItem(STORAGE_KEY, round);
  console.log(`🔄 第 ${round}/${MAX_ROUNDS} 次执行`);

  // 第一步：点击 Increase Task
  const btn = deepClick('.increase-button button');
  if (btn) {
    btn.click();
    console.log('✅ 已点击 Increase Task');
  } else {
    console.warn('❌ 未找到 Increase Task 按钮');
  }

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

runRound();
