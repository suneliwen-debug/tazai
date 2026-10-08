var MYSERVICE = '我们提供一站式拍卖房服务：\n1. 费用检查\n   帮你确认管理费、门牌税、地税等费用。\n2. 交屋及后续处理\n   协助处理交屋、旧屋主/租客等问题。\n3. 产权确认\n   协助确认产权及相关手续顺利进行。\n4. 贷款资格评估\n   投标前免费评估贷款资格，并协助对接银行及律师。\n5. 换锁 & 交屋后跟进\n   协助换锁及处理交屋后的相关事项。\n6. 出租建议\n   提供长租、短租及 Airbnb 运营建议。';
function frCaption(t) {
  var out = [], lines = String(t || '').split('\n');
  for (var i = 0; i < lines.length; i++) {
    var raw = lines[i], s = raw.normalize('NFKC').trim(), plain = s.replace(/[^\p{L}\p{N}#@:：/.\-+ ]/gu, '').trim();
    // 到了朋友的联络资料 / 服务介绍就停（下面都是他的电话、频道、服务、hashtag）
    if (/^(feel free|contact|call|pm|or |whats\s*app|telegram|wechat|facebook|instagram|tiktok|for (more|enquir|viewing)|enquir|联系|联络|咨询|欢迎|私讯|有兴趣|欲知|想知道|更多详情|我们的服务|我们提供|服务)/i.test(plain)) break;
    if (/https?:\/\/|t\.me\/|wa\.me|wa\.link|@[A-Za-z0-9_]{4,}/i.test(s)) continue;
    if (/(?<![\d,.])(\+?6?0)?1\d[\s-]?\d{3,4}[\s-]?\d{3,4}/.test(s.replace(/[()]/g, ''))) continue;
    if (/^(#\S+\s*)+$/.test(s)) continue;
    out.push(raw);
  }
  var keep = out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  var foot = genCap({}).split('\n').slice(1).join('\n');
  return (keep ? keep + '\n\n' : '') + MYSERVICE + '\n' + foot;
}
