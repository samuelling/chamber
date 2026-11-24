/* Chamber kit: turns a member's spec (spec.js) into the window.SITE the engine runs.
   A spec is mostly words. Pages are lists of sections; the kit renders them in one of the skins. */
(function(){
"use strict";
var E = "../engine/img/";
function img(s){ return !s ? "" : s[0] === "@" ? E + s.slice(1) + ".jpg" : s; }
function esc(s){ return String(s == null ? "" : s).replace(/[&<>"]/g, function(c){ return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); }
function ps(a){ return (a || []).map(function(t){ return "<p>" + t + "</p>"; }).join(""); }
function att(s){ return String(s).replace(/"/g, "&quot;"); }
function btns(a, cls){ return (a || []).map(function(b, i){ return "<a class=\"btn " + (i ? "btn-ghost" : "btn-primary") + (cls ? " " + cls : "") + "\" href=\"" + b[0] + "\">" + b[1] + "</a>"; }).join(""); }
function head(s){ return (s.eyebrow || s.h2 || s.p) ? "<div class=\"section-head\">" + (s.eyebrow ? "<span class=\"eyebrow\">" + s.eyebrow + "</span>" : "") + (s.h2 ? "<h2>" + s.h2 + "</h2>" : "") + (s.p ? "<p>" + s.p + "</p>" : "") + "</div>" : ""; }
function fig(src, alt, cls, opt){
  opt = opt || {};
  return "<figure class=\"ph " + (cls || "r43") + "\"" + (opt.swap ? " data-swap=\"" + img(opt.swap) + "\"" : "") + "><img src=\"" + img(src) + "\" alt=\"" + att(alt || "") + "\"" +
    (opt.seen ? " data-seen-src=\"" + img(opt.seen) + "\"" : "") + " style=\"transform-origin:" + (opt.focus || "50% 50%") + "\" loading=\"lazy\">" + (opt.cap ? "<figcaption>" + opt.cap + "</figcaption>" : "") + "</figure>";
}
var chartId = 0;
function chart(c){ chartId++; return "<div class=\"chart-card\"><h4>" + c.title + (c.sub ? " <span>" + c.sub + "</span>" : "") + "</h4><svg data-chart=\"" + att(JSON.stringify(c)) + "\" viewBox=\"0 0 " + (c.kind === "bars" ? 320 : c.kind === "donut" ? 240 : 560) + " " + (c.kind === "donut" ? 240 : 210) + "\" role=\"img\" aria-label=\"" + att(c.title + (c.sub ? ", " + c.sub : "")) + "\"></svg>" + (c.note ? "<p class=\"chart-note\">" + c.note + "</p>" : "") + "</div>"; }

/* ---------- sections ---------- */
var R = {
  head: function(s){ return "<div class=\"container page-head\">" + (s.eyebrow ? "<span class=\"eyebrow\">" + s.eyebrow + "</span>" : "") + "<h1>" + s.h1 + "</h1>" + (s.lede ? "<p class=\"lede\">" + s.lede + "</p>" : "") + "</div>"; },
  hero: function(s, S){
    var lay = s.layout || S.heroLayout || "split", note = s.note ? "<p class=\"hero-note\"" + (s.seenNote ? " data-seen-text=\"" + att(s.seenNote) + "\"" : "") + ">" + s.note + "</p>" : "";
    var pill = s.pill ? "<a class=\"pill-link\" href=\"" + s.pill[0] + "\"><b>" + (s.pill[2] || "NEW") + "</b>" + s.pill[1] + " →</a>" : "";
    var text = "<div class=\"hero-text\">" + pill + (s.eyebrow ? "<span class=\"eyebrow\">" + s.eyebrow + "</span>" : "") + "<h1>" + s.h1 + "</h1><p class=\"lede\">" + s.lede + "</p><div class=\"hero-cta\">" + btns(s.cta) + "</div>" + note + "</div>";
    var art = s.img ? "<div class=\"hero-art\">" + fig(s.img, s.alt, s.ratio || (lay === "full" ? "r219" : "r45"), { focus: s.focus, seen: s.seen, swap: s.swap }) + (s.badge ? "<div class=\"badge\"><b>" + s.badge[0] + "</b>" + s.badge[1] + "</div>" : "") + "</div>" : "";
    if (lay === "dash" && !s.kpis && !s.chart) lay = "split";
    if (lay === "poster"){
      var pt = "<div class=\"poster-text place-" + (s.place || "bottom") + "\">" + (s.eyebrow ? "<span class=\"eyebrow\">" + s.eyebrow + "</span>" : "") + "<h1>" + s.h1 + "</h1>" + (s.sub ? "<p class=\"poster-sub\">" + s.sub + "</p>" : "") + "<div class=\"hero-cta\">" + btns(s.cta) + "</div>" + note + "</div>";
      return "<section class=\"hero hero-poster" + (s.dark === false ? " light" : "") + "\">" + fig(s.img, s.alt, "poster-ph", { focus: s.focus, seen: s.seen, swap: s.swap }) + pt + (s.scroll ? "<span class=\"poster-scroll\">" + s.scroll + "</span>" : "") + "</section>";
    }
    if (lay === "type"){
      return "<section class=\"hero hero-type\"><div class=\"container\">" + (s.eyebrow ? "<span class=\"eyebrow\">" + s.eyebrow + "</span>" : "") + "<h1>" + s.h1 + "</h1><div class=\"type-foot\"><p class=\"lede\">" + (s.lede || "") + "</p><div class=\"hero-cta\">" + btns(s.cta) + "</div></div>" + note + "</div>" + (s.img ? "<div class=\"type-strip\">" + fig(s.img, s.alt, "r31", { focus: s.focus, seen: s.seen, swap: s.swap }) + "</div>" : "") + "</section>";
    }
    if (lay === "mosaic"){
      var ims = (s.imgs || [[s.img, s.alt, s.seen]]).map(function(m, i){ return "<div class=\"m m" + i + "\">" + fig(m[0], m[1], "fill", { seen: m[2], focus: m[3] }) + "</div>"; }).join("");
      return "<section class=\"hero hero-mosaic\"><div class=\"mosaic-grid n" + (s.imgs ? s.imgs.length : 1) + "\">" + ims + "<div class=\"mosaic-card\">" + (s.eyebrow ? "<span class=\"eyebrow\">" + s.eyebrow + "</span>" : "") + "<h1>" + s.h1 + "</h1>" + (s.lede ? "<p class=\"lede\">" + s.lede + "</p>" : "") + "<div class=\"hero-cta\">" + btns(s.cta) + "</div>" + note + "</div></div></section>";
    }
    if (lay === "dash") art = "<div class=\"hero-art hero-dash\">" + R.kpis({ items: s.kpis || [] }, S, true) + (s.chart ? chart(s.chart) : "") + "</div>";
    if (lay === "full") return "<section class=\"hero hero-full\">" + art + "<div class=\"container\">" + text + "</div></section>";
    if (lay === "center") return "<section class=\"hero hero-center\"><div class=\"container\">" + text + art + "</div></section>";
    return "<section class=\"hero hero-" + lay + "\"><div class=\"container hero-grid\">" + text + art + "</div></section>";
  },
  logos: function(s){ return "<div class=\"container\"><div class=\"logos\" aria-label=\"" + att(s.label || "Clients") + "\">" + (s.label ? "<small>" + s.label + "</small>" : "") + s.items.map(function(t){ return "<span><i></i>" + t + "</span>"; }).join("") + "</div></div>"; },
  stats: function(s){ return "<section" + (s.id ? " data-anchor=\"" + s.id + "\"" : "") + "><div class=\"container\">" + head(s) + "<div class=\"stats\">" + s.items.map(function(x){ return "<div class=\"stat\"><b>" + x[0] + "</b><span>" + x[1] + "</span></div>"; }).join("") + "</div>" + (s.charts ? "<div class=\"dash\">" + s.charts.map(chart).join("") + "</div>" : "") + "</div></section>"; },
  charts: function(s){ return "<section><div class=\"container\">" + head(s) + "<div class=\"dash" + (s.items.length === 3 ? " three" : "") + "\">" + s.items.map(chart).join("") + "</div></div></section>"; },
  kpis: function(s, S, bare){
    var h = "<div class=\"kpis\">" + s.items.map(function(k, i){
      var up = String(k[2] || "").trim()[0] !== "-", spark = k[3] || [3, 4, 3, 5, 6, 5, 7, 8].map(function(v){ return v + ((i * 7) % 3); });
      var mx = Math.max.apply(null, spark), mn = Math.min.apply(null, spark), d = spark.map(function(v, j){ return (j ? "L" : "M") + (j * 100 / (spark.length - 1)).toFixed(1) + " " + (28 - (v - mn) / (mx - mn || 1) * 24).toFixed(1); }).join("");
      return "<div class=\"kpi\"><span>" + k[0] + "</span><b>" + k[1] + "</b>" + (k[2] ? "<em class=\"" + (up ? "up" : "down") + "\">" + k[2] + "</em>" : "") + "<svg viewBox=\"0 0 100 30\" preserveAspectRatio=\"none\"><path d=\"" + d + "\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" vector-effect=\"non-scaling-stroke\"/></svg></div>";
    }).join("") + "</div>";
    return bare ? h : "<section><div class=\"container\">" + head(s) + h + "</div></section>";
  },
  cards: function(s){ return "<section" + (s.id ? " data-anchor=\"" + s.id + "\"" : "") + "><div class=\"container\">" + head(s) + "<div class=\"grid-" + (s.cols || 3) + "\">" + s.items.map(function(c){
    var inner = (c[4] ? "<div class=\"card-icon\">" + c[4] + "</div>" : "") + "<h3>" + c[0] + "</h3><p>" + c[1] + "</p>" + (c[2] ? "<span class=\"more\">" + (c[3] || "Learn more") + " →</span>" : "");
    return c[2] ? "<a class=\"card\" href=\"" + c[2] + "\" style=\"text-decoration:none\">" + inner + "</a>" : "<div class=\"card\">" + inner + "</div>"; }).join("") + "</div>" + (s.aside ? "<p class=\"aside\" style=\"margin-top:28px\">" + s.aside + "</p>" : "") + "</div></section>"; },
  split: function(s){
    var a = fig(s.img, s.alt, s.ratio || "r43", { focus: s.focus, seen: s.seen, swap: s.swap, cap: s.cap });
    var b = "<div>" + (s.eyebrow ? "<span class=\"eyebrow\">" + s.eyebrow + "</span>" : "") + (s.h2 ? "<h2 style=\"margin:14px 0 16px\">" + s.h2 + "</h2>" : "") + "<div class=\"prose\">" + ps(s.p) + "</div>" + (s.quote ? "<div class=\"quote\"><blockquote>" + s.quote[0] + "</blockquote><cite>" + s.quote[1] + "</cite></div>" : "") + (s.cta ? "<p style=\"margin-top:22px\">" + btns(s.cta) + "</p>" : "") + "</div>";
    return "<section><div class=\"container split" + (s.flip ? " flip" : "") + "\">" + (s.flip ? b + a : a + b) + "</div></section>";
  },
  quote: function(s){ return "<section><div class=\"container\"><div class=\"quote big\"><blockquote>" + s.text + "</blockquote><cite>" + s.who + "</cite></div></div></section>"; },
  timeline: function(s){ return "<section><div class=\"container" + (s.chart ? " split" : "") + "\"><div>" + head(s) + "<div class=\"timeline\">" + s.items.map(function(x){ return "<div><b>" + x[0] + "</b>" + x[1] + "</div>"; }).join("") + "</div></div>" + (s.chart ? chart(s.chart) : "") + "</div></section>"; },
  table: function(s){ return "<section><div class=\"container\">" + head(s) + "<div class=\"table-wrap\"><table><tr>" + s.head.map(function(h){ return "<th>" + h + "</th>"; }).join("") + "</tr>" + s.rows.map(function(r){ return "<tr>" + r.map(function(c){ return "<td>" + c + "</td>"; }).join("") + "</tr>"; }).join("") + "</table></div>" + (s.note ? "<p class=\"note\" style=\"margin-top:12px\">" + s.note + "</p>" : "") + "</div></section>"; },
  people: function(s){ return "<section><div class=\"container\">" + head(s) + "<div class=\"grid-" + (s.cols || 3) + "\">" + s.items.map(function(x){ return "<div class=\"person\">" + fig(x[0], x[1] + ", " + x[2], "r45", { focus: x[4] }) + "<h3>" + x[1] + "</h3><div class=\"role\">" + x[2] + "</div><p>" + x[3] + "</p></div>"; }).join("") + "</div></div></section>"; },
  faq: function(s){ return "<section><div class=\"container\" style=\"max-width:860px\">" + head(s) + s.items.map(function(x){ return "<details><summary>" + x[0] + "</summary><div class=\"body\"><p>" + x[1] + "</p></div></details>"; }).join("") + "</div></section>"; },
  pricing: function(s){ return "<section><div class=\"container\">" + head(s) + "<div class=\"grid-" + s.items.length + " pricing\">" + s.items.map(function(x){ return "<div class=\"card price" + (x[5] ? " featured" : "") + "\">" + (x[5] ? "<span class=\"tag\">" + x[5] + "</span>" : "") + "<h3>" + x[0] + "</h3><div class=\"amount\"><b>" + x[1] + "</b><span>" + x[2] + "</span></div><ul>" + x[3].map(function(f){ return "<li>" + f + "</li>"; }).join("") + "</ul>" + btns([x[4]], "full") + "</div>"; }).join("") + "</div>" + (s.note ? "<p class=\"note\" style=\"margin-top:16px\">" + s.note + "</p>" : "") + "</div></section>"; },
  products: function(s){ return "<section><div class=\"container\">" + head(s) + "<div class=\"grid-" + (s.cols || 4) + " products\">" + s.items.map(function(x){ return "<div class=\"product\">" + fig(x[0], x[1], "r11", { focus: x[4] }) + "<div class=\"pinfo\"><h3>" + x[1] + "</h3><b>" + x[2] + "</b></div>" + (x[3] ? "<p>" + x[3] + "</p>" : "") + "</div>"; }).join("") + "</div></div></section>"; },
  gallery: function(s){ return "<section><div class=\"container\">" + head(s) + "<div class=\"gallery\">" + s.items.map(function(x){ return fig(x[0], x[1], "r43", { cap: x[2], focus: x[3] }); }).join("") + "</div>" + (s.aside ? "<p class=\"aside\" style=\"margin-top:26px\">" + s.aside + "</p>" : "") + "</div></section>"; },
  counter: function(s){ return "<section><div class=\"container split\"><div><span class=\"eyebrow\">" + s.eyebrow + "</span><div class=\"gauge\"><span data-count>0</span><small>" + s.unit + "</small></div><p class=\"muted\" style=\"margin-top:14px\">" + s.p + "</p><div class=\"log\" data-count-log aria-live=\"off\"></div></div>" + (s.img ? fig(s.img, s.alt, "r45", { focus: s.focus, swap: s.swap, cap: s.cap }) : s.chart ? chart(s.chart) : "") + "</div></section>"; },
  form: function(s){
    var f = s.fields.map(function(x){
      var id = x[0], lab = x[1], ty = x[2] || "text";
      if (ty === "select") return "<label>" + lab + "<select id=\"" + id + "\">" + x[3].map(function(o){ return "<option>" + o + "</option>"; }).join("") + "</select></label>";
      if (ty === "check") return "<label class=\"check full\"><input type=\"checkbox\" id=\"" + id + "\"> " + lab + "</label>";
      return "<label" + (x[3] ? " class=\"full\"" : "") + ">" + lab + "<input type=\"" + ty + "\" id=\"" + id + "\"" + (ty === "email" || id === "name" ? " required" : "") + (id === "name" ? " autocomplete=\"name\"" : ty === "email" ? " autocomplete=\"email\"" : "") + "></label>";
    }).join("");
    return "<section style=\"padding-top:10px\"><div class=\"container\" style=\"max-width:760px;padding-bottom:60px\">" + head(s) + "<form class=\"f\" data-form=\"" + s.id + "\">" + f + "<button class=\"btn btn-primary full\" type=\"submit\">" + s.submit + "</button></form><div class=\"result\" id=\"" + s.id + "-result\" role=\"status\"></div></div></section>";
  },
  cta: function(s){ return "<section class=\"cta\"><div class=\"container\"><h2>" + s.h2 + "</h2><p>" + s.p + "</p>" + btns([s.btn]) + "</div></section>"; },
  prose: function(s){ return "<section><div class=\"container\" style=\"max-width:780px\">" + head(s) + "<div class=\"prose\">" + ps(s.p) + (s.voice ? "<p class=\"voice\">" + s.voice + "</p>" : "") + "</div>" + (s.exits ? R.exitsInner(s) : "") + "</div></section>"; },
  posts: function(){ return "<div class=\"container\" style=\"padding-bottom:90px\"><div class=\"grid-3\" data-posts></div><p style=\"text-align:center;margin-top:34px\"><button class=\"btn btn-ghost\" data-more>Load more posts</button></p></div>"; },
  legal: function(s, S){ return "<div class=\"container legal\" style=\"padding-bottom:100px;max-width:820px\">" + s.items.map(function(x, i){ return "<h2>" + (i + 1) + ". " + x[0] + "</h2><p>" + x[1] + "</p>"; }).join("") +
    "<h2>7. This is not real</h2><p class=\"disclosure\">" + esc(S.name) + " is a work of satire and a member of the <a href=\"../\">Chamber</a>, a set of fictional businesses. None of it is real: no company, no product, no people behind the counter. Nothing here is advice or an offer. The forms send nothing anywhere.</p>" +
    "<h2>8. Photographs</h2><p>Surface photographs are free stock images under the Unsplash License. Other photographs are from Wikimedia Commons, used under the licences listed here; none of the people or places shown has anything to do with this satire.</p><ul class=\"credits\" data-credits><li class=\"muted\">Loading credits…</li></ul></div>"; },
  lamp: function(s){ return "<section style=\"padding-top:10px\"><div class=\"container split\"><div><div class=\"candle\">" + fig(s.img, s.alt, "r45 zoom", { focus: s.focus, swap: s.swap }) + "</div>" + (s.note ? "<p class=\"candle-note\">" + s.note + "</p>" : "") + "</div><div class=\"room-text\">" + ps(s.p) + (s.voice ? "<p class=\"voice\">" + s.voice + "</p>" : "") + R.exitsInner(s) + "</div></div></section>"; },
  exitsInner: function(s){ return (s.exits ? "<nav class=\"exits\" aria-label=\"Ways on\">" + s.exits.map(function(e){ return "<a class=\"exit\" href=\"" + e[1] + "\">" + e[0] + "</a>"; }).join("") + "</nav>" : "") + (s.up ? "<p class=\"room-up\"><a href=\"" + s.up[0] + "\">↑ " + s.up[1] + "</a></p>" : ""); },
  exits: function(s){ return "<div class=\"container\" style=\"padding-bottom:70px\">" + R.exitsInner(s) + "</div>"; },
  dive: function(s, S){ return "<section class=\"dive-sec\" aria-label=\"" + att(s.h2) + "\"><div class=\"container\"><span class=\"eyebrow\">" + S.dive.top + "</span><h2 style=\"font-size:clamp(1.7rem,3vw,2.4rem);margin-top:14px\">" + s.h2 + "</h2><p class=\"muted\" style=\"margin-top:12px;max-width:60ch\">" + s.p + "</p></div><div id=\"dive-track\"><div id=\"dive-stage\"><canvas id=\"dive\" role=\"img\" aria-label=\"" + att(s.aria) + "\"></canvas><div class=\"dive-hud\"><span id=\"dive-depth\">" + S.dive.top + "</span><button class=\"btn btn-ghost btn-sm\" id=\"dive-out\">Climb out ↑</button></div><a id=\"dive-door\" class=\"btn btn-ghost btn-sm\" href=\"#room-" + S.roomOrder[0] + "\" hidden>" + (s.door || "There’s a gap in this one") + " →</a><p id=\"dive-say\">Scroll.</p></div></div></section>"; },
  tiles: function(s){
    var t = s.items.map(function(x, i){ var o = x.length ? { img: x[0], alt: x[1], h: x[2], sub: x[3], cta: x[4], seen: x[5] } : x;
      return "<a class=\"tile" + (o.light ? " light" : "") + (i === 0 && s.lead !== false ? " lead" : "") + "\" href=\"" + (o.cta ? o.cta[0] : "#home") + "\">" + fig(o.img, o.alt, "fill", { seen: o.seen, focus: o.focus }) + "<div class=\"tile-text\"><h2>" + o.h + "</h2>" + (o.sub ? "<p>" + o.sub + "</p>" : "") + (o.cta ? "<span class=\"tile-cta\">" + o.cta[1] + " ›</span>" : "") + "</div></a>"; }).join("");
    return "<section class=\"tiles-sec\">" + (head(s) ? "<div class=\"container\">" + head(s) + "</div>" : "") + "<div class=\"tiles\">" + t + "</div></section>";
  },
  band: function(s){ return "<section class=\"band" + (s.tall ? " tall" : "") + "\">" + fig(s.img, s.alt, "fill", { seen: s.seen, swap: s.swap, focus: s.focus }) + "<div class=\"band-text place-" + (s.place || "bottom") + "\">" + (s.eyebrow ? "<span class=\"eyebrow\">" + s.eyebrow + "</span>" : "") + (s.h2 ? "<h2>" + s.h2 + "</h2>" : "") + (s.cap ? "<p>" + s.cap + "</p>" : "") + (s.cta ? "<div class=\"hero-cta\">" + btns([s.cta]) + "</div>" : "") + "</div></section>"; },
  mosaic: function(s){ return "<section class=\"mosaic-sec\"><div class=\"container" + (s.wide ? " wide" : "") + "\">" + head(s) + "<div class=\"mosaic " + (s.style || "masonry") + "\">" + s.items.map(function(x, i){ return "<div class=\"mo mo" + (i % 7) + "\">" + fig(x[0], x[1], "fill", { seen: x[3], cap: x[2] }) + "</div>"; }).join("") + "</div></div></section>"; },
  ticker: function(s){ var one = s.items.map(function(x){ var d = String(x[2] || ""); return "<span><b>" + x[0] + "</b> " + x[1] + (d ? " <em class=\"" + (d[0] === "-" || d[0] === "\u2212" ? "down" : "up") + "\">" + d + "</em>" : "") + "</span>"; }).join(""); return "<div class=\"ticker\" aria-label=\"" + att(s.label || "Live figures") + "\"><div class=\"ticker-track\">" + one + one + "</div></div>"; },
  marquee: function(s){ var w = "<span>" + s.text + "</span>"; return "<div class=\"marquee\" aria-hidden=\"true\"><div class=\"marquee-track\">" + w + w + w + w + "</div></div>"; },
  statement: function(s){ return "<section class=\"statement\"><div class=\"container\">" + (s.eyebrow ? "<span class=\"eyebrow\">" + s.eyebrow + "</span>" : "") + "<p class=\"statement-text\">" + s.text + "</p>" + (s.by ? "<p class=\"statement-by\">" + s.by + "</p>" : "") + (s.cta ? "<div class=\"hero-cta\">" + btns([s.cta]) + "</div>" : "") + "</div></section>"; },
  index: function(s){ var lead = s.items[0], rest = s.items.slice(1);
    return "<section class=\"index-sec\"><div class=\"container\">" + head(s) + "<div class=\"index-grid\"><a class=\"index-lead\" href=\"" + lead[2] + "\">" + (lead[3] ? fig(lead[3], lead[1], "r32", { seen: lead[4] }) : "") + "<span class=\"kicker\">" + lead[0] + "</span><h3>" + lead[1] + "</h3>" + (lead[5] ? "<p>" + lead[5] + "</p>" : "") + "</a><ol class=\"index-list\">" + rest.map(function(x, i){ return "<li><a href=\"" + x[2] + "\"><span class=\"num\">" + String(i + 2).padStart(2, "0") + "</span><span><span class=\"kicker\">" + x[0] + "</span><b>" + x[1] + "</b></span>" + (x[3] ? fig(x[3], x[1], "r11") : "") + "</a></li>"; }).join("") + "</ol></div></div></section>"; },
  html: function(s){ return s.html; }
};

/* ---------- charts, drawn when their page shows ---------- */
function drawChart(svg){
  var c = JSON.parse(svg.getAttribute("data-chart")), v = c.data, n = v.length, lab = c.labels || [], u = c.unit || "", g = "";
  if (c.kind === "bars"){
    var W = 320, H = 210, B = 24, mx = Math.max.apply(null, v) * 1.15, bw = (W - 20) / n;
    svg.innerHTML = v.map(function(x, i){ var h = (H - B - 12) * x / mx, X = 10 + i * bw + bw * 0.18; return "<rect x='" + X + "' y='" + (H - B - h) + "' width='" + bw * 0.64 + "' height='" + h + "' rx='4' fill='var(--accent)' fill-opacity='" + (0.45 + 0.55 * i / Math.max(1, n - 1)) + "'/><text class='axis' x='" + (X + bw * 0.32) + "' y='" + (H - 6) + "' text-anchor='middle'>" + (lab[i] || "") + "</text><text class='axis' x='" + (X + bw * 0.32) + "' y='" + (H - B - h - 6) + "' text-anchor='middle'>" + x + u + "</text>"; }).join("");
    return;
  }
  if (c.kind === "donut"){
    var tot = v.reduce(function(a, b){ return a + b; }, 0), a0 = -Math.PI / 2, cols = ["var(--accent)", "var(--chart-2,#888)", "var(--chart-3,#bbb)", "var(--chart-4,#ddd)", "var(--chart-5,#555)"];
    v.forEach(function(x, i){ var a1 = a0 + x / tot * Math.PI * 2, l = a1 - a0 > Math.PI ? 1 : 0; g += "<path d='M" + (120 + Math.cos(a0) * 90) + " " + (120 + Math.sin(a0) * 90) + "A90 90 0 " + l + " 1 " + (120 + Math.cos(a1) * 90) + " " + (120 + Math.sin(a1) * 90) + "' fill='none' stroke='" + cols[i % 5] + "' stroke-width='34'/>"; a0 = a1; });
    g += "<text x='120' y='116' text-anchor='middle' class='donut-big'>" + (c.center || Math.round(v[0] / tot * 100) + "%") + "</text><text x='120' y='138' text-anchor='middle' class='axis'>" + (lab[0] || "") + "</text>";
    svg.innerHTML = g; var leg = svg.parentNode.querySelector(".legend");
    if (!leg && lab.length > 1){ leg = document.createElement("div"); leg.className = "legend"; leg.innerHTML = lab.map(function(t, i){ return "<span><i style='background:" + cols[i % 5] + "'></i>" + t + "</span>"; }).join(""); svg.parentNode.appendChild(leg); }
    return;
  }
  var W2 = 560, H2 = 210, L = 38, B2 = 22, series = c.data2 ? [v, c.data2] : [v], all = v.concat(c.data2 || []);
  var mx2 = Math.max.apply(null, all), mn2 = c.zero === false ? Math.min.apply(null, all) : 0, span = (mx2 - mn2) * 1.1 || 1;
  var X2 = function(i){ return L + (W2 - L - 8) * i / (n - 1); }, Y2 = function(x){ return 10 + (H2 - B2 - 10) * (1 - (x - mn2) / span); };
  for (var k = 0; k <= 4; k++){ var val = mn2 + span / 1.1 * k / 4, y = Y2(val); g += "<line x1='" + L + "' x2='" + W2 + "' y1='" + y + "' y2='" + y + "' stroke='currentColor' stroke-opacity='.1'/><text class='axis' x='0' y='" + (y + 4) + "'>" + (Math.abs(val) >= 100 ? Math.round(val) : Math.round(val * 10) / 10) + u + "</text>"; }
  lab.forEach(function(t, i){ if (n < 9 || i % 2 === 0 || i === n - 1) g += "<text class='axis' x='" + X2(i) + "' y='" + (H2 - 4) + "' text-anchor='middle'>" + t + "</text>"; });
  series.forEach(function(sr, si){
    var d = sr.map(function(x, i){ return (i ? "L" : "M") + X2(i).toFixed(1) + " " + Y2(x).toFixed(1); }).join(""), col = si ? "var(--chart-2,#999)" : "var(--accent)";
    if (c.kind !== "line" && si === 0) g += "<path d='" + d + "L" + X2(n - 1) + " " + Y2(mn2) + "L" + X2(0) + " " + Y2(mn2) + "Z' fill='var(--accent)' fill-opacity='.14'/>";
    g += "<path d='" + d + "' fill='none' stroke='" + col + "' stroke-width='2.5' stroke-linejoin='round'" + (si ? " stroke-dasharray='5 4'" : "") + "/>";
  });
  g += "<circle cx='" + X2(n - 1) + "' cy='" + Y2(v[n - 1]) + "' r='4.5' fill='var(--accent)'/>";
  svg.innerHTML = g;
}
function drawCharts(){ Array.prototype.forEach.call(document.querySelectorAll(".view.active svg[data-chart]"), function(s){ if (!s.firstChild) drawChart(s); }); }
var creditsDone = false;
function drawCredits(){
  var ul = document.querySelector("[data-credits]"); if (!ul || creditsDone) return; creditsDone = true;
  fetch("credits.json").then(function(r){ return r.ok ? r.json() : []; }).catch(function(){ return []; }).then(function(cs){
    ul.innerHTML = (cs.length ? cs.map(function(c){ return "<li>" + esc(c.title) + " · " + esc(c.artist) + " · " + esc(c.license) + " · <a href=\"" + att(c.source) + "\" rel=\"noopener\">source</a></li>"; }).join("") : "<li class=\"muted\">Stock photographs only (Unsplash License).</li>");
  });
}
window.addEventListener("scroll", function(){ document.body.classList.toggle("scrolled", window.scrollY > window.innerHeight * 0.7); }, { passive: true });
document.addEventListener("mousemove", function(e){
  var c = e.target.closest && e.target.closest(".candle"); if (!c) return;
  var b = c.getBoundingClientRect();
  c.style.setProperty("--cx", ((e.clientX - b.left) / b.width * 100).toFixed(1) + "%"); c.style.setProperty("--cy", ((e.clientY - b.top) / b.height * 100).toFixed(1) + "%");
}, { passive: true });

/* ---------- the build ---------- */
window.Kit = { img: img, build: function(P){
  var t = P.theme || {}, root = document.documentElement.style;
  var tokens = { bg: t.bg, text: t.text, muted: t.muted, accent: t.accent, "accent-ink": t.accentInk || t.accent, "on-accent": t.onAccent || "#fff", card: t.card, stroke: t.stroke, "header-bg": t.header, field: t.field || t.card,
    display: t.display, body: t.body, mono: t.mono || "\"JetBrains Mono\",ui-monospace,Menlo,monospace", radius: t.radius, "display-weight": t.weight, voice: t.voice, "chart-2": t.chart2, "chart-3": t.chart3,
    "d3-bg": t.d3 && t.d3[0], "d3-text": t.d3 && t.d3[1], "d3-muted": t.d3 && t.d3[2], "d3-accent": t.d3 && t.d3[3], "d4-bg": t.d4 && t.d4[0], "d4-text": t.d4 && t.d4[1], "d4-muted": t.d4 && t.d4[2], "d4-accent": t.d4 && t.d4[3], "footer-bg": t.footer, "cta-bg": t.ctaBg };
  for (var k in tokens) if (tokens[k] != null) root.setProperty("--" + k, tokens[k]);
  if (t.fonts){ var l = document.createElement("link"); l.rel = "stylesheet"; l.href = "https://fonts.googleapis.com/css2?" + t.fonts.split("|").map(function(f){ return "family=" + f; }).join("&") + "&display=swap"; document.head.appendChild(l); }
  document.body.classList.add("skin-" + (P.skin || "saas")); if (P.header) document.body.classList.add("hdr-" + P.header);
  if (P.css){ var st = document.createElement("style"); st.textContent = P.css; document.head.appendChild(st); }
  var S = { slug: P.slug, name: P.name, dive: { top: P.dive.top }, roomOrder: P.roomOrder || Object.keys(P.rooms), heroLayout: P.heroLayout };
  var pages = P.pages.map(function(pg){ return { id: pg.id, depth: pg.depth, html: pg.s.map(function(s){ var f = R[s.t]; if (!f) throw new Error("no section " + s.t); return f(s, S); }).join("") }; });
  if (!pages.some(function(p){ return p.id === "notfound"; })) pages.push({ id: "notfound", depth: 2, html: "<div class=\"container page-head\" style=\"padding-bottom:120px\"><span class=\"eyebrow\">Error 404</span><h1>" + (P.notfound ? P.notfound[0] : "This page isn’t here.") + "</h1><p class=\"lede\">" + (P.notfound ? P.notfound[1] : "It was here a moment ago.") + "</p><p style=\"margin-top:28px;display:flex;gap:12px;flex-wrap:wrap\"><a class=\"btn btn-primary\" href=\"#home\">Back to the homepage</a></p></div>" });
  var posts = (P.posts || []).map(function(p){ var words = p.body.join(" ").split(/\s+/).length; return { slug: p.slug, tag: p.tag, title: p.title, ex: p.ex, read: Math.max(2, Math.round(words / 90)) + " min read", by: p.by, img: img(p.img), alt: p.alt || p.title, depth: p.depth || 1, body: p.body }; });
  var rooms = {}; Object.keys(P.rooms).forEach(function(k){ var r = P.rooms[k], o = {}; for (var q in r) o[q] = r[q]; if (o.img) o.img = img(o.img); if (o.gallery) o.gallery = o.gallery.map(function(g){ return [img(g[0]), g[1], g[2]]; }); rooms[k] = o; });
  var M = P.motif, forms = {};
  Object.keys(P.forms || {}).forEach(function(id){ var tpl = P.forms[id]; forms[id] = function(d){ return tpl.replace(/\{(\w+)(\?([^|}]*)\|([^}]*))?\}/g, function(_, k2, q, yes, no){ if (q) return d[k2] ? yes : no; return d[k2] || ({ name: "there" }[k2] || "—"); }); }; });
  window.SITE = {
    slug: P.slug, name: P.name, logo: P.logo || "M13 3a10 10 0 1 0 0 20a10 10 0 1 0 0-20Z", tag: P.tag,
    nav: P.nav, cta: P.cta,
    footer: P.footer || [{ h: "Company", links: P.nav.slice(0, 4) }, { h: "Get started", links: [P.cta, ["#legal", "Legal"]] }, { h: "More", links: [["#insights", "Insights"], ["#network", "Network"], ["../", "The Chamber"]] }],
    fine: P.fine || ["© 2026 " + P.name], pages: pages, posts: posts, postsDone: P.postsDone || "That’s every post.", lastPostExit: P.lastPostExit || P.up,
    anchors: P.anchors || {}, rooms: rooms, roomOrder: S.roomOrder, exits: P.exits, special: P.special, up: P.up, levelWord: P.levelWord || "Level",
    word: P.word, hiddenWord: P.hiddenWord || "help", field: P.field,
    motif: { shape: M.shape, polys: function(n, r, w){ var shape = M.alt && n > 1 && n % M.alt[1] === 0 ? M.alt[0] : M.shape; return Motifs.polys(shape, n, r, w); }, inside: Motifs.inside(M.inside), ink: M.ink, gapMode: M.gapMode,
      trayKind: { grid: 0, brick: 1, radial: 2, spiral: 3, wave: 4, checker: 5, scatter: 6 }[M.tray || "grid"], trayStep: M.step || 0.2, trayGap: hex(M.gap), palette: [hex(M.gap)].concat(M.palette.map(hex)) },
    dive: { view: P.dive.view || "dive", top: P.dive.top, unit: P.dive.unit, chant: P.dive.chant, say: P.dive.say, voice: P.dive.voice, still: P.dive.still || "Still here." },
    counter: P.counter, cookie: P.cookie, chat: P.chat, forms: forms,
    onRoute: function(view, st){ document.body.setAttribute("data-page", view); drawCharts(); if (view === "legal") drawCredits(); if (P.onRoute) P.onRoute(view, st); },
    console: P.console, atoms: P.atoms
  };
}};
function hex(h){ h = h.replace("#", ""); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
})();
