const statusEl = document.getElementById('status');
const rulesListEl = document.getElementById('rulesList');

function createRuleItem(rule = {}) {
  const item = document.createElement('div');
  item.className = 'rule-item';

  const keywordLabel = document.createElement('label');
  keywordLabel.className = 'field-label';
  keywordLabel.textContent = 'Keyword';

  const keywordInput = document.createElement('input');
  keywordInput.className = 'text-input';
  keywordInput.type = 'text';
  keywordInput.placeholder = '例如：WORKFLOW HISTORY';
  keywordInput.value = String(rule.keyword || '');

  const scriptLabel = document.createElement('label');
  scriptLabel.className = 'field-label';
  scriptLabel.textContent = 'Script (JavaScript)';

  const scriptInput = document.createElement('textarea');
  scriptInput.className = 'script-input';
  scriptInput.placeholder = "例如：document.body.style.outline='3px solid red';";
  scriptInput.value = String(rule.script || '');

  const actions = document.createElement('div');
  actions.className = 'rule-actions';

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.type = 'button';
  deleteBtn.textContent = '删除';
  deleteBtn.addEventListener('click', () => {
    item.remove();
    if (rulesListEl.children.length === 0) {
      addRule();
    }
  });

  actions.appendChild(deleteBtn);
  item.appendChild(keywordLabel);
  item.appendChild(keywordInput);
  item.appendChild(scriptLabel);
  item.appendChild(scriptInput);
  item.appendChild(actions);
  return item;
}

function addRule(rule = {}) {
  rulesListEl.appendChild(createRuleItem(rule));
}

function collectRules() {
  const items = Array.from(rulesListEl.querySelectorAll('.rule-item'));
  const rules = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const keyword = item.querySelector('.text-input').value.trim();
    const script = item.querySelector('.script-input').value.trim();
    if (!keyword || !script) continue;

    rules.push({
      name: `Rule ${i + 1}: ${keyword.slice(0, 30)}`,
      keyword,
      matchType: 'contains',
      enabled: true,
      script
    });
  }

  return rules;
}

function renderRules(rules) {
  rulesListEl.innerHTML = '';
  const list = Array.isArray(rules) && rules.length ? rules : [{}];
  for (const rule of list) {
    addRule(rule);
  }
}

async function loadRules() {
  try {
    const res = await browser.runtime.sendMessage({ action: 'get-rules' });
    const rules = Array.isArray(res && res.rules) ? res.rules : [];
    renderRules(rules);
    statusEl.textContent = `已加载 ${rules.length} 条规则`;
  } catch (err) {
    statusEl.textContent = `加载规则失败：${err && err.message ? err.message : '未知错误'}`;
    renderRules([{}]);
  }
}

document.getElementById('addBtn').addEventListener('click', () => {
  addRule();
});

document.getElementById('saveBtn').addEventListener('click', async () => {
  statusEl.textContent = '保存中...';
  try {
    const rules = collectRules();
    const res = await browser.runtime.sendMessage({ action: 'save-rules', rules });
    statusEl.textContent = `保存成功，共 ${res && typeof res.count === 'number' ? res.count : 0} 条可用规则`;
  } catch (err) {
    statusEl.textContent = `保存失败：${err && err.message ? err.message : '未知错误'}`;
  }
});

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

loadRules();
