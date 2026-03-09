function getPageTextUpper() {
  const bodyText = (document.body && (document.body.innerText || document.body.textContent)) || '';
  return bodyText.toUpperCase();
}

function matchRule(upperText, rule) {
  if (!rule || !rule.enabled) return false;

  const keyword = String(rule.keyword || '').trim();
  if (!keyword) return false;

  const type = rule.matchType === 'regex' ? 'regex' : 'contains';

  if (type === 'regex') {
    try {
      const reg = new RegExp(keyword, 'i');
      return reg.test(upperText);
    } catch (_) {
      return false;
    }
  }

  return upperText.includes(keyword.toUpperCase());
}

function scanRules(rules) {
  const upperText = getPageTextUpper();
  const matched = [];

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    if (matchRule(upperText, rule)) {
      matched.push({ index: i, name: String(rule.name || `rule-${i + 1}`) });
    }
  }

  return { matched };
}

browser.runtime.onMessage.addListener((message) => {
  if (!message || message.action !== 'scan-rules') return;

  const rules = Array.isArray(message.rules) ? message.rules : [];
  return Promise.resolve(scanRules(rules));
});
