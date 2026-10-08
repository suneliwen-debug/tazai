var MYLOGO = 'LOGO_URL', LOGOP = null;
function getLogo() { if (!LOGOP) LOGOP = loadImg(MYLOGO).catch(function () { LOGOP = null; return null; }); return LOGOP; }
function myWM(x, w, h, logo) {
  // 右下角：我的 logo（加上水印文字，可以在设定里改或留空）
  var m = Math.min(w, h), pad = Math.round(m * 0.03), t = String(FRWM.text || '').trim();
  var F = '"Helvetica Neue",Arial,"PingFang SC","Noto Sans SC",sans-serif';
  if (logo) {
    var s = Math.round(m * (FRWM.pos === 'c' ? 0.45 : 0.2)), lw = s, lh = Math.round(s * logo.naturalHeight / logo.naturalWidth);
    var lx = FRWM.pos === 'br' ? w - pad - lw : (w - lw) / 2, ly = FRWM.pos === 'c' ? (h - lh) / 2 : h - pad - lh;
    x.save(); x.globalAlpha = FRWM.pos === 'c' ? 0.4 : 0.6;
    x.drawImage(logo, lx, ly, lw, lh); x.restore();
    if (t && FRWM.pos !== 'c') {
      var fs = Math.max(12, Math.round(m * 0.03)); x.save(); x.font = '700 ' + fs + 'px ' + F; x.textAlign = 'right'; x.textBaseline = 'middle';
      x.globalAlpha = 0.95; x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = Math.max(2, fs * 0.2); x.fillStyle = '#fff';
      x.fillText(t, FRWM.pos === 'br' ? lx - pad * 0.5 : w / 2 + x.measureText(t).width / 2, FRWM.pos === 'br' ? ly + lh / 2 : ly - fs); x.restore();
    }
    return;
  }
  if (!t) return;
  var fs2 = Math.max(14, Math.round(m * 0.038)); x.save(); x.font = '700 ' + fs2 + 'px ' + F;
  var tw = x.measureText(t).width; x.globalAlpha = 0.9; x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowBlur = Math.max(2, fs2 * 0.15); x.fillStyle = '#fff';
  x.fillText(t, FRWM.pos === 'br' ? w - pad - tw : (w - tw) / 2, h - pad); x.restore();
}
function coverLogo(x, pl, logo) {
  // 在朋友水印的位置盖上我的大 logo
  if (!logo) return wmCover(x, pl, FRWM.text);
  // 跟朋友水印一样大、一样位置，半透明
  var s = Math.max(pl.w, pl.h) * 0.92, lh = s * logo.naturalHeight / logo.naturalWidth, cx = pl.x + pl.w * 0.49, cy = pl.y + pl.h * 0.5;
  x.save(); x.globalAlpha = 0.42;
  x.drawImage(logo, cx - s / 2, cy - lh / 2, s, lh); x.restore();
}
function frProcess(p, i) {
  var ph = p.photos[i];
  return Promise.all([loadImg(ph.url), getTpl(p.channel), getLogo()]).then(function (r) {
    var im = r[0], tpl = r[1], logo = r[2], s = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight));
    var c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s);
    var x = c.getContext('2d'); x.drawImage(im, 0, 0, c.width, c.height);
    var covered = false;
    if (tpl) { var wpl = unWM(x, c.width, c.height, tpl, chOf(p.channel).wm); if (wpl) { coverLogo(x, wpl, logo); covered = true; } }
    myWM(x, c.width, c.height, covered ? null : logo);
    if (covered && String(FRWM.text || '').trim()) { var keep = FRWM.pos; FRWM.pos = 'br'; myWM(x, c.width, c.height, null); FRWM.pos = keep; }
    return c;
  });
}
