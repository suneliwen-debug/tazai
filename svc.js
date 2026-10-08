var SVCIMG = 'https://rekalytrhlytwivctqnt.supabase.co/storage/v1/object/public/friend-img/wm/service_1791498605416.png', SVCB = null;
function getSvcBlob() {
  if (!SVCB) SVCB = fetch(SVCIMG).then(function (r) { if (!r.ok) throw new Error('svc'); return r.blob(); }).then(function (b) {
    return smallThumb(b).then(function (th) { return { blob: new Blob([b], { type: 'image/jpeg' }), th: th }; });
  }).catch(function () { SVCB = null; return null; });
  return SVCB;
}
function addSvc(list, items) {
  // 每个帖子最后一张：我的服务介绍图（影片帖子不加）
  var chain = Promise.resolve();
  list.forEach(function (p, k) {
    var it = items[k];
    if (!it || p.mtype === 'video' || p.media.some(function (m) { return m.svc; })) return;
    chain = chain.then(function () {
      return getSvcBlob().then(function (sv) {
        if (!sv) return;
        return api('psign', { id: p.id, files: [{ ext: 'jpg' }] }).then(function (d) {
          var u = d.urls[0];
          return putFile(u.url, new File([sv.blob], 'service.jpg', { type: 'image/jpeg' })).then(function () {
            var svm = { path: u.path, type: 'image/jpeg', th: sv.th, svc: true }, media;
            if (p.media.length) media = p.media.slice(0, 9).concat([svm]);
            else if (it.fb && it.fb.length) { media = [{ path: it.fb[0], type: 'image/jpeg', th: it.thumb || (p.l && p.l.image_url) || '' }, svm]; delete it.fb; }
            else return;
            return api('pmedia', { id: p.id, media: media, mtype: 'photo', thumb: p.thumb || it.thumb || (p.l && p.l.image_url) || '' });
          });
        });
      }).catch(function () {});
    });
  });
  return chain;
}
