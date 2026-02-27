browser.commands.onCommand.addListener((command) => {
  if (command === 'run-auto-click') {
    browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
      // 快捷键默认执行1次，可以按需修改
      browser.tabs.sendMessage(tabs[0].id, {
        action: 'start',
        maxRounds: 1
      });
    });
  }
});
