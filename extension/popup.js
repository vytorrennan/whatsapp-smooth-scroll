(() => {
  'use strict';
  const toggle = document.querySelector('#enabled');
  const status = document.querySelector('#status');
  let enabled = true;
  function render() {
    toggle.checked = enabled;
    status.textContent = enabled ? 'On for WhatsApp Web' : 'Off · native scrolling';
    status.removeAttribute('data-error');
  }
  const changed = (changes, area) => {
    if (area === 'local' && changes.enabled) { enabled = changes.enabled.newValue !== false; render(); }
  };
  chrome.storage.onChanged.addListener(changed);
  chrome.storage.local.get({ enabled: true }).then(settings => {
    enabled = settings.enabled !== false; render(); toggle.disabled = false;
  }, () => { status.textContent = 'Could not load settings. Reopen this popup.'; status.setAttribute('data-error', ''); });
  toggle.addEventListener('change', async () => {
    const next = toggle.checked;
    toggle.disabled = true;
    try {
      await chrome.storage.local.set({ enabled: next });
      enabled = next; render();
    } catch {
      toggle.checked = enabled;
      status.textContent = 'Could not save. Try again.';
      status.setAttribute('data-error', '');
    } finally { toggle.disabled = false; }
  });
  window.addEventListener('pagehide', () => chrome.storage.onChanged.removeListener(changed), { once: true });
})();
