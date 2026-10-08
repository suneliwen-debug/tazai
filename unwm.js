// ===== 去水印 v2：模板（上半 = 水印颜色×透明度，下半 = 透明度）+ 自动找位置 =====
function wmPlace(w, h, wm) {
  var S = Math.max(w, 0.75 * h) / wm.base;
  var tw = wm.ow * S, th = wm.oh * S;
  var cx = wm.cx * w, cy = wm.cyA * h + wm.cyB * S;
  return { x: cx - tw / 2, y: cy - th / 2, w: tw, h: th };
}
function wmTplData(tpl, wm) {
  if (tpl._d) return tpl._d;
  var c = document.createElement('canvas'); c.width = wm.tw; c.height = wm.th * 2;
  var x = c.getContext('2d'); x.drawImage(tpl, 0, 0);
  tpl._d = x.getImageData(0, 0, wm.tw, wm.th * 2).data;
  return tpl._d;
}
function wmSample(D, tw, th, u, v, ch, half) {
  // 双线性取样（u,v 是模板坐标）
  if (u < 0 || v < 0 || u > tw - 1 || v > th - 1) return 0;
  var x0 = Math.floor(u), y0 = Math.floor(v), x1 = Math.min(x0 + 1, tw - 1), y1 = Math.min(y0 + 1, th - 1), fx = u - x0, fy = v - y0, o = half ? th : 0;
  var a = D[((y0 + o) * tw + x0) * 4 + ch], b = D[((y0 + o) * tw + x1) * 4 + ch], c = D[((y1 + o) * tw + x0) * 4 + ch], d = D[((y1 + o) * tw + x1) * 4 + ch];
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
}
function wmEdges(G, w, h) {
  var E = new Float32Array(w * h);
  for (var y = 1; y < h - 1; y++) for (var x = 1; x < w - 1; x++) {
    var i = y * w + x, gx = G[i + 1] - G[i - 1], gy = G[i + w] - G[i - w];
    E[i] = Math.min(40, Math.sqrt(gx * gx + gy * gy));
  }
  return E;
}
function wmRefine(x, w, h, D, wm, pl) {
  // 在小图上用边缘相关找最准的位置和大小
  var f = Math.min(1, 260 / pl.w), sw = Math.round(w * f), sh = Math.round(h * f);
  var c = document.createElement('canvas'); c.width = sw; c.height = sh;
  var cx = c.getContext('2d'); cx.drawImage(x.canvas, 0, 0, sw, sh);
  var d = cx.getImageData(0, 0, sw, sh).data, G = new Float32Array(sw * sh);
  for (var i = 0; i < sw * sh; i++) G[i] = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 3;
  var EI = wmEdges(G, sw, sh);
  var best = { s: 1, dx: 0, dy: 0, v: -1e9 };
  var scales = [0.96, 0.98, 1, 1.02, 1.04], R = 0.04;
  scales.forEach(function (s) {
    var tw = Math.round(pl.w * f * s), th = Math.round(pl.h * f * s);
    if (tw < 20 || th < 20) return;
    var TG = new Float32Array(tw * th);
    for (var yy = 0; yy < th; yy++) for (var xx = 0; xx < tw; xx++) {
      var u = xx / tw * wm.tw, v = yy / th * wm.th;
      TG[yy * tw + xx] = (wmSample(D, wm.tw, wm.th, u, v, 0) + wmSample(D, wm.tw, wm.th, u, v, 1) + wmSample(D, wm.tw, wm.th, u, v, 2)) / 3;
    }
    var ET = wmEdges(TG, tw, th), idx = [], tm = 0;
    for (var k = 0; k < ET.length; k++) if (ET[k] > 4) { idx.push(k); tm += ET[k]; }
    if (!idx.length) return;
    tm /= idx.length;
    var bx = (pl.x + pl.w / 2) * f - tw / 2, by = (pl.y + pl.h / 2) * f - th / 2, st = Math.max(1, Math.round(R * tw / 6));
    for (var oy = -6; oy <= 6; oy++) for (var ox = -6; ox <= 6; ox++) {
      var X0 = Math.round(bx + ox * st), Y0 = Math.round(by + oy * st), sum = 0, si = 0, sii = 0, n = 0;
      for (var q = 0; q < idx.length; q++) {
        var k2 = idx[q], ty = (k2 / tw) | 0, tx = k2 - ty * tw, X = X0 + tx, Y = Y0 + ty;
        if (X < 0 || Y < 0 || X >= sw || Y >= sh) continue;
        var e = EI[Y * sw + X], t = ET[k2] - tm;
        sum += e * t; si += e; sii += e * e; n++;
      }
      if (n < idx.length * 0.6) continue;
      var mean = si / n, vr = Math.sqrt(Math.max(1e-6, sii / n - mean * mean));
      var score = (sum / n) / vr;
      if (score > best.v) best = { s: s, dx: X0 / f, dy: Y0 / f, v: score, tw: tw / f, th: th / f };
    }
  });
  if (best.v < -1e8) return pl;
  return { x: best.dx, y: best.dy, w: best.tw, h: best.th };
}
function unWM(x, w, h, tpl, wm) {
  var D = wmTplData(tpl, wm);
  var pl = wmRefine(x, w, h, D, wm, wmPlace(w, h, wm));
  var X0 = Math.max(0, Math.floor(pl.x)), Y0 = Math.max(0, Math.floor(pl.y)), X1 = Math.min(w, Math.ceil(pl.x + pl.w)), Y1 = Math.min(h, Math.ceil(pl.y + pl.h));
  if (X1 <= X0 || Y1 <= Y0) return;
  var rw = X1 - X0, rh = Y1 - Y0, im = x.getImageData(X0, Y0, rw, rh), Dt = im.data;
  var A = new Float32Array(rw * rh), sx = wm.tw / pl.w, sy = wm.th / pl.h;
  for (var yy = 0; yy < rh; yy++) for (var xx = 0; xx < rw; xx++) {
    var u = (X0 + xx - pl.x) * sx, v = (Y0 + yy - pl.y) * sy, i = yy * rw + xx;
    var a = wmSample(D, wm.tw, wm.th, u, v, 0, true) / 255;
    A[i] = a; if (a <= 0.004) continue; if (a > 0.9) a = 0.9;
    for (var c = 0; c < 3; c++) {
      var P = wmSample(D, wm.tw, wm.th, u, v, c);
      var val = (Dt[i * 4 + c] - P) / (1 - a);
      Dt[i * 4 + c] = val < 0 ? 0 : val > 255 ? 255 : val;
    }
  }
  // 水印边缘的细线：用旁边的像素补
  var band = new Uint8Array(rw * rh), r = Math.max(1, Math.round(pl.w / 600));
  for (var y2 = 1; y2 < rh - 1; y2++) for (var x2 = 1; x2 < rw - 1; x2++) {
    var j = y2 * rw + x2, g = Math.abs(A[j + 1] - A[j - 1]) + Math.abs(A[j + rw] - A[j - rw]);
    if (g > 0.04) for (var by2 = -r; by2 <= r; by2++) for (var bx2 = -r; bx2 <= r; bx2++) { var yy3 = y2 + by2, xx3 = x2 + bx2; if (yy3 >= 0 && xx3 >= 0 && yy3 < rh && xx3 < rw) band[yy3 * rw + xx3] = 1; }
  }
  var src = new Uint8ClampedArray(Dt), R2 = r + 2;
  for (var y4 = 0; y4 < rh; y4++) for (var x4 = 0; x4 < rw; x4++) {
    var k4 = y4 * rw + x4; if (!band[k4]) continue;
    var s0 = 0, s1 = 0, s2 = 0, n4 = 0;
    for (var dy = -R2; dy <= R2; dy++) for (var dx = -R2; dx <= R2; dx++) {
      var Y = y4 + dy, X = x4 + dx; if (Y < 0 || X < 0 || Y >= rh || X >= rw) continue;
      var kk = Y * rw + X; if (band[kk]) continue;
      s0 += src[kk * 4]; s1 += src[kk * 4 + 1]; s2 += src[kk * 4 + 2]; n4++;
    }
    if (n4) { Dt[k4 * 4] = s0 / n4; Dt[k4 * 4 + 1] = s1 / n4; Dt[k4 * 4 + 2] = s2 / n4; }
  }
  x.putImageData(im, X0, Y0);
}
