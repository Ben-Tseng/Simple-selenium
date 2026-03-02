const STORAGE_KEY = 'autoClickRound';
const MAX_KEY = 'autoClickMax';

// 建议定义在全局，方便复用
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
    let round = parseInt(localStorage.getItem(STORAGE_KEY) || '0');
    let max = parseInt(localStorage.getItem(MAX_KEY) || '0');

    if (max === 0 || round >= max) {
        console.log('🎉 全部完成或未设置次数');
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(MAX_KEY);
        return;
    }

    round++;
    localStorage.setItem(STORAGE_KEY, round.toString());
    console.log(`🔄 第 ${round} / ${max} 轮`);

    // 尝试找并点击 increase 按钮
    const btn = deepQuery('.increase-button button');
    if (btn) {
        btn.click();
        console.log('✅ 已点击 Increase Task');
    } else {
        console.warn('❌ 未找到 .increase-button button');
    }

    // 等待一小段时间，让弹窗/新内容出现
    await delay(5000);   // ← 可根据实际情况调整 4~8 秒

    // 寻找 Accept 链接（这里用更稳的方式）
    const acceptLink = Array.from(document.querySelectorAll('a'))
        .find(a => a.textContent.trim() === 'Accept');

    if (acceptLink) {
        acceptLink.click();
        console.log('✅ 已点击 Accept');
        // Accept 后通常会跳转或刷新，留出较长等待时间
        await delay(12000);   // ← 关键：给页面加载/重定向留时间
    } else {
        console.warn('❌ 未找到 Accept 链接');
        await delay(3000);   // 没点到就短等一下再试下一轮
    }

    // ─── 最重要的一行 ───
    // 等一轮结束后，立刻开始下一轮
    runRound();
}

// 接收 popup 或快捷键指令
browser.runtime.onMessage.addListener((message) => {
    if (message.action === 'start') {
        localStorage.setItem(STORAGE_KEY, '0');
        localStorage.setItem(MAX_KEY, String(message.maxRounds || 10));
        console.log(`🚀 开始自动点击，共 ${message.maxRounds || 10} 次`);
        runRound();
    }
});

// 页面加载/刷新时自动续跑（非常重要）
(function checkOnLoad() {
    const round = parseInt(localStorage.getItem(STORAGE_KEY) || '0');
    const max = parseInt(localStorage.getItem(MAX_KEY) || '0');

    if (max > 0 && round < max) {
        console.log(`📌 检测到未完成任务（${round}/${max}），2秒后继续...`);
        setTimeout(runRound, 2000);   // 给页面一点加载时间
    }
})();
