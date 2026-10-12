(() => {
  'use strict';
  const EVENT = 'wa-smooth-scroll-dispose';
  document.dispatchEvent(new Event(EVENT));
  const root = document.documentElement;
  let disposed = false;
  const apply = enabled => root.toggleAttribute('data-wa-smooth-scroll-disabled', enabled === false);
  // Wait for storage so a saved OFF preference never briefly enables the layer.
  apply(false);
  const changed = (changes, area) => {
    if (!disposed && area === 'local' && changes.enabled) apply(changes.enabled.newValue);
  };
  function dispose() {
    disposed = true;
    chrome.storage.onChanged.removeListener(changed);
    document.removeEventListener(EVENT, dispose);
    apply(false);
  }
  chrome.storage.onChanged.addListener(changed);
  document.addEventListener(EVENT, dispose);
  chrome.storage.local.get({ enabled: true }).then(
    settings => { if (!disposed) apply(settings.enabled); },
    () => { if (!disposed) apply(false); }
  );
})();
