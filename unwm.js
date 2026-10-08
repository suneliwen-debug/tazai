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
function wmGray(src, sx, sy, sw, sh, w, h) {
  var c = document.createElement('canvas'); c.width = w; c.height = h;
  var x = c.getContext('2d'); x.drawImage(src, sx, sy, sw, sh, 0, 0, w, h);
  var d = x.getImageData(0, 0, w, h).data, G = new Float32Array(w * h);
  for (var i = 0; i < w * h; i++) G[i] = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 3;
  return G;
}
function wmTplPts(tpl, wm, tw, th, maxPts) {
  // 模板缩到 tw×th，找水印边缘的点（和右边/下面邻居差很多的地方）
  var P = wmGray(tpl, 0, 0, wm.tw, wm.th, tw, th), A = wmGray(tpl, 0, wm.th, wm.tw, wm.th, tw, th);
  for (var i = 0; i < A.length; i++) A[i] /= 255;
  var pts = [];
  for (var y = 0; y < th - 1; y++) for (var x = 0; x < tw - 1; x++) {
    var k = y * tw + x;
    if (Math.abs(A[k + 1] - A[k]) + Math.abs(P[k + 1] - P[k]) / 255 > 0.06) pts.push([y, x, 0, 1]);
    if (Math.abs(A[k + tw] - A[k]) + Math.abs(P[k + tw] - P[k]) / 255 > 0.06) pts.push([y, x, 1, 0]);
  }
  if (pts.length > maxPts) { var step = pts.length / maxPts, q = []; for (var j = 0; j < maxPts; j++) q.push(pts[Math.floor(j * step)]); pts = q; }
  return pts.map(function (p) { var k1 = p[0] * tw + p[1], k2 = (p[0] + p[2]) * tw + p[1] + p[3]; return [p[0], p[1], p[2], p[3], P[k1], P[k2], Math.min(0.9, A[k1]), Math.min(0.9, A[k2])]; });
}
function wmRatio(G, sw, sh, pts, X0, Y0) {
  // 去水印后边缘变弱多少：越小越对
  var num = 0, den = 0, n = 0;
  for (var q = 0; q < pts.length; q++) {
    var p = pts[q], y = Y0 + p[0], x = X0 + p[1], y2 = y + p[2], x2 = x + p[3];
    if (x < 0 || y < 0 || x2 >= sw || y2 >= sh) continue;
    var i1 = G[y * sw + x], i2 = G[y2 * sw + x2];
    num += Math.abs((i2 - p[5]) / (1 - p[7]) - (i1 - p[4]) / (1 - p[6])); den += Math.abs(i2 - i1); n++;
  }
  return n < pts.length * 0.7 ? 9 : (num + 1) / (den + 1);
}
function wmFind(canvas, w, h, tpl, wm) {
  var ar = wm.oh / wm.ow;
  // 第一轮：最长边 200px，整张图找，大小 30%–125% 图宽
  var f1 = 200 / Math.max(w, h), sw = Math.max(8, Math.round(w * f1)), sh = Math.max(8, Math.round(h * f1));
  var G = wmGray(canvas, 0, 0, w, h, sw, sh), best = { r: 9 };
  for (var fr = 0.3; fr <= 1.25; fr *= 1.06) {
    var tw = Math.round(sw * fr), th = Math.round(tw * ar);
    if (tw < 16 || th > sh * 1.3) continue;
    var pts = wmTplPts(tpl, wm, tw, th, 500);
    if (pts.length < 20) continue;
    var cand = { r: 9 };
    for (var Y0 = Math.round(-th / 4); Y0 <= sh - th * 0.75; Y0 += 2) for (var X0 = Math.round(-tw / 4); X0 <= sw - tw * 0.75; X0 += 2) {
      var r = wmRatio(G, sw, sh, pts, X0, Y0);
      if (r < cand.r) cand = { r: r, X: X0, Y: Y0 };
    }
    if (cand.r >= 9) continue;
    for (var oy = -1; oy <= 1; oy++) for (var ox = -1; ox <= 1; ox++) {
      var r2 = wmRatio(G, sw, sh, pts, cand.X + ox, cand.Y + oy);
      if (r2 < best.r) best = { r: r2, x: (cand.X + ox) / f1, y: (cand.Y + oy) / f1, w: tw / f1, h: th / f1 };
    }
  }
  if (best.r >= 9) return null;
  // 第二轮：水印约 450px 宽，附近细找
  var f2 = Math.min(1, 450 / best.w), sw2 = Math.round(w * f2), sh2 = Math.round(h * f2);
  var G2 = wmGray(canvas, 0, 0, w, h, sw2, sh2), b2 = { r: 9 }, R = Math.max(2, Math.round(1.5 * f2 / f1));
  for (var s = 0.96; s <= 1.041; s += 0.01) {
    var tw2 = Math.round(best.w * f2 * s), th2 = Math.round(tw2 * ar), pts2 = wmTplPts(tpl, wm, tw2, th2, 900);
    var cx = (best.x + best.w / 2) * f2, cy = (best.y + best.h / 2) * f2;
    for (var oy2 = -R; oy2 <= R; oy2++) for (var ox2 = -R; ox2 <= R; ox2++) {
      var X1 = Math.round(cx - tw2 / 2 + ox2), Y1 = Math.round(cy - th2 / 2 + oy2), r3 = wmRatio(G2, sw2, sh2, pts2, X1, Y1);
      if (r3 < b2.r) b2 = { r: r3, x: X1 / f2, y: Y1 / f2, w: tw2 / f2, h: th2 / f2 };
    }
  }
  return b2.r < 9 ? b2 : null;
}
function unWM(x, w, h, tpl, wm) {
  var D = wmTplData(tpl, wm);
  var pl = wmFind(x.canvas, w, h, tpl, wm);
  if (!pl || pl.r > (wm.maxRatio || 2.5)) return false;
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
  return pl.r;
}
