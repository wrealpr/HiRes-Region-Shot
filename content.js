(() => {
  if (window.__hiresShotInstalled) return;
  window.__hiresShotInstalled = true;
  const MAX = 16384;

  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === 'arm') arm(msg.preset, msg.format);
  });

  function calcScale(preset, w, h) {
    const [type, val] = preset.split(':');
    let s = type === 'scale' ? +val : +val / w;
    return Math.max(0.1, Math.min(s, MAX / Math.max(w, h)));
  }

  function arm(preset, format) {
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', zIndex: 2147483647,
      cursor: 'crosshair', background: 'rgba(0,0,0,.25)', userSelect: 'none'
    });
    const box = document.createElement('div');
    Object.assign(box.style, {
      position: 'fixed', border: '1px solid #4da3ff', background: 'rgba(77,163,255,.15)',
      display: 'none', pointerEvents: 'none', boxSizing: 'border-box'
    });
    const label = document.createElement('div');
    Object.assign(label.style, {
      position: 'fixed', font: '12px/1.2 system-ui,sans-serif', color: '#fff',
      background: '#111c', padding: '3px 6px', borderRadius: '4px',
      display: 'none', pointerEvents: 'none', whiteSpace: 'nowrap'
    });
    overlay.append(box, label);
    document.documentElement.appendChild(overlay);

    let sx, sy, rect = null;

    const cleanup = () => {
      overlay.remove();
      window.removeEventListener('keydown', onKey, true);
    };
    const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); cleanup(); } };
    window.addEventListener('keydown', onKey, true);

    overlay.addEventListener('mousedown', e => {
      e.preventDefault();
      sx = e.clientX; sy = e.clientY;
      box.style.display = label.style.display = 'block';
    });
    overlay.addEventListener('mousemove', e => {
      if (sx === undefined) return;
      const x = Math.min(sx, e.clientX), y = Math.min(sy, e.clientY);
      const w = Math.abs(e.clientX - sx), h = Math.abs(e.clientY - sy);
      rect = { x, y, w, h };
      Object.assign(box.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
      const s = calcScale(preset, Math.max(w, 1), Math.max(h, 1));
      label.textContent = `${w}×${h} css → ${Math.round(w * s)}×${Math.round(h * s)} px (${s.toFixed(2)}x)`;
      label.style.left = x + 'px';
      label.style.top = Math.max(0, y - 24) + 'px';
    });
    overlay.addEventListener('mouseup', async () => {
      const r = rect;
      cleanup();
      if (!r || r.w < 4 || r.h < 4) return;
      // let the overlay disappear before capture
      await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
      chrome.runtime.sendMessage({
        type: 'capture', preset, format,
        rect: { ...r, sx: window.scrollX, sy: window.scrollY }
      });
    });
  }
})();
