function collectCandidates() {
  const nodes = [
    ...document.querySelectorAll('button'),
    ...document.querySelectorAll('a'),
    ...document.querySelectorAll('[role="button"]'),
    ...document.querySelectorAll('input[type="button"]'),
    ...document.querySelectorAll('input[type="submit"]')
  ];

  const seen = new Set();
  const list = [];
  for (const el of nodes) {
    if (!el || seen.has(el)) continue;
    seen.add(el);
    list.push(el);
  }
  return list;
}

function textOf(el) {
  if (!el) return '';
  if (el.tagName === 'INPUT') return (el.value || '').trim();
  return (el.innerText || el.textContent || '').trim();
}

function isVisible(el) {
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const style = window.getComputedStyle(el);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

function matchKeyword(upperText, keyword) {
  const kw = String(keyword || '').toUpperCase().trim();
  if (!kw) return false;

  if (kw === 'ID') {
    return /(^|[^A-Z0-9])ID([^A-Z0-9]|$)/.test(upperText);
  }
  return upperText.includes(kw);
}

function findAndClick(keywords) {
  const candidates = collectCandidates();

  for (const el of candidates) {
    if (!isVisible(el)) continue;
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') continue;

    const text = textOf(el);
    if (!text) continue;

    const upper = text.toUpperCase();
    const matched = keywords.some((kw) => matchKeyword(upper, kw));
    if (!matched) continue;

    el.click();
    return { clicked: true, text: text.slice(0, 120) };
  }

  return { clicked: false };
}

browser.runtime.onMessage.addListener((message) => {
  if (!message || message.action !== 'scan-and-click') return;

  const keywords = Array.isArray(message.keywords) ? message.keywords : [];
  return Promise.resolve(findAndClick(keywords));
});
