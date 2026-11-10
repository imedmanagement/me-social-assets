// Canvas renderer for Medication Evidence social images.
// Feed cards are 1080 x 1350 (4:5): light background, Newsreader headline with teal italic emphasis, photo in an arch frame, teal footer.
// Stories are 1080 x 1920 (9:16), keeping 150px clear at the top and 250px at the bottom.
(() => {
  const ASSETS = '../assets';
  const W = 1080, H = 1350, FOOT = 150, PAD = 96;
  const pexels = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1600`;
  const load = (src) => new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => rej(new Error('image failed: ' + src)); i.src = src; });
  async function fonts() {
    if (window.__fontsReady) return;
    const faces = ['500 40px Newsreader', 'italic 600 40px Newsreader', '400 40px Manrope', '500 40px Manrope', '600 40px Manrope', '700 40px Manrope'];
    await Promise.all(faces.map((f) => document.fonts.load(f)));
    for (const f of faces) if (!document.fonts.check(f)) throw new Error('font not loaded: ' + f);
    window.__fontsReady = true;
  }
  let logoCache = null;
  async function logo() {
    if (logoCache) return logoCache;
    const img = await load(`${ASSETS}/brand/logo-white.png`);
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    let minX = c.width, minY = c.height, maxX = 0, maxY = 0;
    for (let y = 0; y < c.height; y++) for (let xx = 0; xx < c.width; xx++) { if (d[(y * c.width + xx) * 4 + 3] > 10) { if (xx < minX) minX = xx; if (xx > maxX) maxX = xx; if (y < minY) minY = y; if (y > maxY) maxY = y; } }
    logoCache = { img, sx: minX, sy: minY, sw: maxX - minX + 1, sh: maxY - minY + 1 };
    return logoCache;
  }
  function cover(ctx, img, x, y, w, h, fx = 0.5, fy = 0.5) { const s = Math.max(w / img.naturalWidth, h / img.naturalHeight); const sw = w / s, sh = h / s; ctx.drawImage(img, (img.naturalWidth - sw) * fx, (img.naturalHeight - sh) * fy, sw, sh, x, y, w, h); }
  function tokens(text) { const out = []; let it = false; text.split(/(\*)/).forEach((p) => { if (p === '*') { it = !it; return; } p.split(/\s+/).filter(Boolean).forEach((w) => out.push({ w, italic: it })); }); return out; }
  const HF = { reg: (s) => `500 ${s}px Newsreader`, ital: (s) => `italic 600 ${s}px Newsreader` };
  function layout(ctx, text, size, maxW) {
    const lines = []; let line = [], lw = 0; ctx.font = HF.reg(size); const sp = ctx.measureText(' ').width;
    for (const t of tokens(text)) { ctx.font = t.italic ? HF.ital(size) : HF.reg(size); const ww = ctx.measureText(t.w).width; if (line.length && lw + sp + ww > maxW) { lines.push(line); line = []; lw = 0; } line.push({ ...t, ww }); lw += (line.length > 1 ? sp : 0) + ww; }
    if (line.length) lines.push(line); return { lines, sp };
  }
  function wrap(ctx, text, maxW) { const ws = text.split(/\s+/); const ls = []; let cur = ''; for (const w of ws) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { ls.push(cur); cur = w; } else cur = t; } if (cur) ls.push(cur); return ls; }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  const toBlob = (cv) => new Promise((r) => cv.toBlob(r, 'image/jpeg', 0.92));

  async function card(spec) {
    await fonts();
    const c = document.createElement('canvas'); c.width = W; c.height = H; const ctx = c.getContext('2d');
    const photo = await load(String(spec.photo).startsWith('pexels:') ? pexels(String(spec.photo).slice(7)) : `${ASSETS}/photos/${spec.photo}`);
    let hs = spec.headlineSize || 72; const ss = spec.subSize || 31, lh = 1.06, top0 = 104, maxBottom = 620;
    const measure = (h) => { const lay = layout(ctx, spec.headline, h, W - PAD * 2); ctx.font = `400 ${ss}px Manrope`; const sub = wrap(ctx, spec.sub, W - PAD * 2 - 20); const hH = lay.lines.length * h * lh; return { lay, sub, hH, total: 25 + 44 + hH + 30 + sub.length * ss * 1.42 }; };
    let m = measure(hs); while (top0 + m.total > maxBottom && hs > 50) { hs -= 2; m = measure(hs); }
    ctx.fillStyle = '#F3F7F7'; ctx.fillRect(0, 0, W, H);
    let y = top0;
    ctx.fillStyle = '#0F4C5C'; ctx.fillRect(PAD, y + 5, 56, 3);
    ctx.font = '700 25px Manrope'; ctx.letterSpacing = '4px'; ctx.fillText(spec.eyebrow.toUpperCase(), PAD + 78, y + 17); ctx.letterSpacing = '0px';
    y += 25 + 44 + hs * 0.82;
    m.lay.lines.forEach((line, i) => { let cx = PAD; line.forEach((t) => { ctx.font = t.italic ? HF.ital(hs) : HF.reg(hs); ctx.fillStyle = t.italic ? '#0F4C5C' : '#2F3E46'; ctx.fillText(t.w, cx, y + i * hs * lh); cx += t.ww + m.lay.sp; }); });
    y += m.hH - hs * 0.82 + 30;
    ctx.font = `400 ${ss}px Manrope`; ctx.fillStyle = '#3B4A50'; m.sub.forEach((l, i) => ctx.fillText(l, PAD, y + ss * 0.9 + i * ss * 1.42)); y += m.sub.length * ss * 1.42;
    const ax = PAD, aw = W - PAD * 2, aTop = Math.max(y + 52, 560), aBottom = H - FOOT, r = Math.min(aw / 2, aBottom - aTop - 40);
    ctx.save(); ctx.beginPath(); ctx.moveTo(ax, aBottom); ctx.lineTo(ax, aTop + r); ctx.arc(ax + aw / 2, aTop + r, r, Math.PI, 0); ctx.lineTo(ax + aw, aBottom); ctx.closePath(); ctx.clip();
    ctx.fillStyle = '#0C3039'; ctx.fillRect(ax, aTop, aw, aBottom - aTop); cover(ctx, photo, ax, aTop, aw, aBottom - aTop, spec.fx ?? 0.5, spec.fy ?? 0.5); ctx.restore();
    ctx.fillStyle = '#0F4C5C'; ctx.fillRect(0, H - FOOT, W, FOOT);
    const L = await logo(); const lhgt = 29, lw = L.sw * (lhgt / L.sh); ctx.drawImage(L.img, L.sx, L.sy, L.sw, L.sh, PAD, H - FOOT / 2 - lhgt / 2, lw, lhgt);
    ctx.font = '600 27px Manrope'; ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'right'; ctx.fillText('medicationevidence.com', W - PAD, H - FOOT / 2 + 10); ctx.textAlign = 'left';
    return toBlob(c);
  }

  // 9:16 Story: the feed card framed on a teal background, eyebrow above, one or two lines below.
  async function story(cardBlob, o) {
    const img = new Image(); img.src = URL.createObjectURL(cardBlob); await img.decode();
    const SW = 1080, SH = 1920, cw = 940, ch = Math.round(cw * img.naturalHeight / img.naturalWidth), x = (SW - cw) / 2, y = 290, r = 26;
    const cv = document.createElement('canvas'); cv.width = SW; cv.height = SH; const ctx = cv.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, SH); g.addColorStop(0, '#0F4C5C'); g.addColorStop(1, '#0C3039'); ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8BC4B9'; ctx.font = '700 26px Manrope'; ctx.letterSpacing = '6px'; ctx.fillText(o.eyebrow.toUpperCase(), SW / 2, 225); ctx.letterSpacing = '0px';
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 44; ctx.shadowOffsetY = 16; rr(ctx, x, y, cw, ch, r); ctx.fillStyle = '#0C3039'; ctx.fill(); ctx.restore();
    ctx.save(); rr(ctx, x, y, cw, ch, r); ctx.clip(); ctx.drawImage(img, x, y, cw, ch); ctx.restore();
    ctx.fillStyle = '#ffffff'; ctx.font = '600 36px Manrope'; ctx.fillText(o.line, SW / 2, y + ch + 96);
    if (o.line2) { ctx.fillStyle = '#8BC4B9'; ctx.font = '500 29px Manrope'; ctx.fillText(o.line2, SW / 2, y + ch + 148); }
    ctx.textAlign = 'left';
    return toBlob(cv);
  }

  const b64 = async (blob) => { const u8 = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  window.renderJob = async (job) => {
    const c = await card(job.card);
    const st = job.story ? await story(c, job.story) : null;
    return { card: await b64(c), story: st ? await b64(st) : null };
  };
})();
