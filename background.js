const MAX = 16384;
const sleep = ms => new Promise(r => setTimeout(r, ms));

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'start') start(msg);
  if (msg.type === 'capture') capture(sender.tab.id, msg).catch(err => notify(err));
});

async function start({ tabId, preset, format }) {
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
    await chrome.tabs.sendMessage(tabId, { type: 'arm', preset, format });
  } catch (e) {
    console.error('Cannot run on this page (chrome:// pages and the Web Store are blocked).', e);
  }
}

async function capture(tabId, { rect: r, preset, format }) {
  const target = { tabId };
  const send = (m, p) => chrome.debugger.sendCommand(target, m, p);
  const [type, val] = preset.split(':');
  let scale = type === 'scale' ? +val : +val / r.w;
  scale = Math.max(0.1, Math.min(scale, MAX / Math.max(r.w, r.h)));

  await chrome.debugger.attach(target, '1.3');
  try {
    // width/height 0 = keep current viewport size, only change the pixel density
    await send('Emulation.setDeviceMetricsOverride', {
      width: 0, height: 0, deviceScaleFactor: scale, mobile: false
    });
    await sleep(600); // let the page re-layout / swap in higher-res images
    const params = {
      format,
      clip: { x: r.x + r.sx, y: r.y + r.sy, width: r.w, height: r.h, scale: 1 },
      fromSurface: true,
      captureBeyondViewport: false
    };
    if (format === 'jpeg') params.quality = 95;
    const { data } = await send('Page.captureScreenshot', params);
    const w = Math.round(r.w * scale), h = Math.round(r.h * scale);
    await chrome.downloads.download({
      url: `data:image/${format};base64,${data}`,
      filename: `hires-${w}x${h}-${Date.now()}.${format === 'jpeg' ? 'jpg' : 'png'}`,
      saveAs: false
    });
  } finally {
    try { await send('Emulation.clearDeviceMetricsOverride'); } catch {}
    try { await chrome.debugger.detach(target); } catch {}
  }
}

function notify(err) {
  console.error('HiRes capture failed:', err);
  chrome.action.setBadgeText({ text: 'ERR' });
  chrome.action.setBadgeBackgroundColor({ color: '#c00' });
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), 4000);
}
