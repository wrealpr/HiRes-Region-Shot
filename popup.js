const $ = id => document.getElementById(id);
chrome.storage.local.get({ preset: 'scale:4', format: 'png' }, s => {
  $('preset').value = s.preset;
  $('format').value = s.format;
});
$('go').onclick = async () => {
  const preset = $('preset').value, format = $('format').value;
  await chrome.storage.local.set({ preset, format });
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.runtime.sendMessage({ type: 'start', tabId: tab.id, preset, format });
  window.close();
};
