/* Chamber backdoor: the parts of a member site that were never meant to be found.
   Loaded after oddities.js. Adds:
   - a hidden terminal (#hole-terminal): a shell into the site, built from its own pages, rooms,
     staff and trapped character, which can ssh into its siblings. Press ` anywhere to find it.
   - asks: now and then the site asks, in its own voice, for your camera, microphone or location.
     Say no and it lets it go. Say yes and the browser asks too; then strange things happen.
     Everything happens in this tab. Nothing from the camera, microphone or location is stored,
     sent anywhere, or shared over the network; it all stops when the overlay closes.
   On phones it may also ask for the motion sensors (the page comes loose) or for a fingertip over the
   back camera (a real, rough pulse reading from the light through your skin).
   Try by hand: ?odd=camera, ?odd=mic, ?odd=gps, ?odd=motion, ?odd=pulse, ?odd=hatch, or #hole-terminal. */
(function(){
"use strict";
var S = window.SITE, O = window.Oddities; if (!S || !O || !O.extend) return;
var M = O.material, $ = function(s, r){ return (r || document).querySelector(s); };
function esc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]; }); }
function pick(a){ return a.length ? a[Math.floor(Math.random() * a.length)] : ""; }
function noDot(s){ return String(s || "").replace(/[.!?…]+$/, ""); }
function low(s){ s = String(s || ""); return /^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
function hashStr(t){ var h = 2166136261; t = String(t); for (var i = 0; i < t.length; i++){ h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
var W = M.W, HW = M.HW, WHO = M.WHO, WL = M.WL, LINES = M.LINES, WORDS = M.WORDS, ROOMS = M.ROOMS, CL = M.CL, NAME = M.NAME;
var SLUG = S.slug, CO = String(NAME).replace(/[!?…]+$/, "");
var reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

/* =====================================================================
   THE TERMINAL
   ===================================================================== */
var siblings = null;
function loadSiblings(cb){
  if (siblings) return cb(siblings);
  fetch("../directory.json").then(function(r){ return r.json(); }).then(function(d){ siblings = (d.members || d).filter(function(m){ return m.live && String(m.path || "").indexOf("../") !== 0 && m.slug !== SLUG; }); cb(siblings); }).catch(function(){ siblings = []; cb(siblings); });
}
function user(){ var n = M.visitorName(); return (n ? n.toLowerCase().replace(/[^a-z0-9]+/g, "") : "") || "guest"; }
function fs(){
  var me = user(), pages = (S.pages || []).filter(function(p){ return p.id !== "notfound"; });
  var root = {
    home: { _: "dir", [me]: { _: "dir",
      "notes.txt": WL.slice(0, 4).map(function(l){ return "- " + l; }).join("\n") + "\n- (I didn’t write these.)",
      ".history": "cd /vault\nsudo cat /vault/" + WHO.toLowerCase().replace(/\W+/g, "") + ".txt\nexit\nexit\nexit" } },
    etc: { _: "dir", motd: CO + "\n" + LINES.slice(0, 3).join("\n") + "\nAuthorised staff only. You are authorised.", passwd: "root:x:0:0\n" + WHO.toLowerCase().replace(/\W+/g, "") + ":x:1:1:never logs out\n" + me + ":x:1000:1000:pending" },
    var: { _: "dir", log: { _: "dir", "visitors.log": (function(){ var o = [], t = Date.now(); for (var i = 9; i > 0; i--){ o.push(new Date(t - i * 3.7e6).toISOString().slice(0, 19).replace("T", " ") + "  10.0." + (hashStr(i + SLUG) % 255) + "." + (hashStr(SLUG + i) % 255) + "  " + (i % 4 === 0 && CL.length ? low(noDot(pick(CL))) : "left") ); } o.push(new Date().toISOString().slice(0, 19).replace("T", " ") + "  you  still here"); return o.join("\n"); })() } },
    srv: { _: "dir", www: (function(){ var d = { _: "dir" }; pages.forEach(function(p){ d[p.id + ".html"] = { _: "page", id: p.id }; }); return d; })() },
    rooms: (function(){ var d = { _: "dir" }; ROOMS.forEach(function(R){ d[R.key] = { _: "room", key: R.key, text: (R.t + "\n" + (R.lede || "") + (R.where ? "\nWhere: " + R.where : "")) }; }); return d; })(),
    staff: { _: "link", to: "#hole-staff-1" },
    vault: { _: "dir", locked: 1, [WHO.toLowerCase().replace(/\W+/g, "") + ".txt"]: WL.join("\n"), "exit.sh": { _: "link", to: "#hole-corridor-" + (hashStr(SLUG) % 9000 + 1) + "-1" }, "door": { _: "link", to: "#hole-basement-1" } },
    dev: { _: "dir", you: "you" , null: "", [W]: (W + " ").repeat(60) }
  };
  return root;
}
var T = null;   /* the open terminal */
function termRender(rest, box){
  var tree = fs(), cwd = ["home", user()], hist = [], hi = 0, tries = 0, sudo = false, n = 0, idle = 0;
  box.innerHTML = "<div class='odd-term' role='application' aria-label='Terminal'><div class='odd-term-out' aria-live='polite'></div><div class='odd-term-in'><span class='odd-term-ps'></span><input aria-label='Command' autocomplete='off' autocapitalize='off' spellcheck='false'></div></div>" +
    "<p class='room-up' style='text-align:center'><a href='#home'>&uarr; Log out</a></p><div style='height:60px'></div>";
  var out = $(".odd-term-out", box), inp = $("input", box), ps = $(".odd-term-ps", box), wrap = $(".odd-term", box);
  function prompt(){ ps.textContent = (sudo ? "root" : user()) + "@" + SLUG + ":" + path() + (sudo ? "# " : "$ "); }
  function path(){ var p = "/" + cwd.join("/"); return p.replace("/home/" + user(), "~") || "/"; }
  function say(t, cls){ var d = document.createElement("div"); if (cls) d.className = cls; d.textContent = t; out.appendChild(d); out.scrollTop = 1e9; wrap.scrollTop = 1e9; }
  function slow(lines, cls, gap){ lines.forEach(function(l, i){ setTimeout(function(){ say(l, cls); }, i * (gap || 400)); }); }
  function node(p){
    var parts = p.indexOf("/") === 0 ? [] : cwd.slice();
    p.split("/").forEach(function(x){ if (!x || x === ".") return; if (x === "..") parts.pop(); else if (x === "~") parts = ["home", user()]; else parts.push(x); });
    var cur = tree; for (var i = 0; i < parts.length; i++){ if (!cur || typeof cur !== "object" || !(parts[i] in cur) || parts[i] === "_") return [null, parts]; cur = cur[parts[i]]; }
    return [cur, parts];
  }
  function locked(parts){ return parts[0] === "vault" && !sudo; }
  var CMD = {
    help: function(){ return ["ls, cd, cat, pwd, whoami, who, finger <name>, ps, kill <pid>, rm <file>, sudo <cmd>, ssh <member>, open <file>, talk, date, uname, history, clear, exit", "There is no man page. Ask " + WHO + "."]; },
    ls: function(a){ var r = node(a[0] || "."), d = r[0]; if (!d) return ["ls: " + (a[0] || ".") + ": No such file or directory"]; if (locked(r[1])) return ["ls: /vault: Permission denied"]; if (typeof d !== "object" || d._ !== "dir") return [a[0]];
      return [Object.keys(d).filter(function(k){ return k !== "_" && k !== "locked" && (k.charAt(0) !== "." || a.indexOf("-a") >= 0); }).map(function(k){ var v = d[k]; return typeof v === "object" && v._ === "dir" ? k + "/" : typeof v === "object" && v._ === "link" ? k + "@" : k; }).join("   ") || "(empty)"]; },
    cd: function(a){ var r = node(a[0] || "~"), d = r[0]; if (!d || typeof d !== "object") return ["cd: " + (a[0] || "") + ": No such directory"]; if (d._ === "link"){ location.hash = d.to; return ["Following " + a[0] + "…"]; } if (d._ !== "dir") return ["cd: " + a[0] + ": Not a directory"]; if (locked(r[1])) return ["cd: /vault: Permission denied"]; cwd = r[1]; return []; },
    cat: function(a){ if (!a[0]) return ["cat: what?"]; var r = node(a[0]), d = r[0]; if (d == null) return ["cat: " + a[0] + ": No such file or directory"]; if (locked(r[1])) return ["cat: " + a[0] + ": Permission denied"];
      if (typeof d === "string"){ if (d === "you") return you(); return d.split("\n"); }
      if (d._ === "dir") return ["cat: " + a[0] + ": Is a directory"]; if (d._ === "room") return d.text.split("\n").concat(["(open " + a[0] + " to go in)"]); if (d._ === "page") return ["<html> … " + d.id + " … </html>", "(open " + a[0] + " to view)"]; if (d._ === "link"){ location.hash = d.to; return ["…"]; } return []; },
    open: function(a){ var r = node(a[0] || ""), d = r[0]; if (!d || typeof d !== "object") return ["open: " + (a[0] || "") + ": nothing there"]; if (locked(r[1])) return ["open: Permission denied"]; if (d._ === "page") location.hash = d.id; else if (d._ === "room") location.hash = "room-" + d.key; else if (d._ === "link") location.hash = d.to; else return ["open: " + a[0] + ": Is a directory"]; return ["Opening…"]; },
    pwd: function(){ return ["/" + cwd.join("/")]; },
    whoami: function(){ return [sudo ? "root (borrowed)" : user(), n > 12 ? "Are you sure?" : ""].filter(Boolean); },
    who: function(){ return [user() + "    pts/0    " + new Date().toTimeString().slice(0, 5), WHO.toLowerCase().replace(/\W+/g, "") + "    tty1     before records began", "(" + (3 + hashStr(SLUG) % 40) + " others, idle)"]; },
    finger: function(a){ var q = (a[0] || "").toLowerCase(); if (q && WHO.toLowerCase().replace(/\W+/g, "").indexOf(q) === 0 || q === "root") return ["Login: " + WHO, "Directory: /vault", "On since: the beginning", "Plan: " + noDot(pick(WL)) + "."]; if (q === user() || q === "me" || !q) return ["Login: " + user(), "Directory: ~", "On since: " + new Date().toTimeString().slice(0, 5), "Plan: to leave."]; return ["finger: " + q + ": no such user. Not any more."]; },
    ps: function(){ var o = ["  PID  COMMAND"]; WORDS.slice(0, 6).forEach(function(w, i){ o.push("  " + (100 + i * 17) + "  " + w + "d --keep"); }); o.push("    1  " + WHO.toLowerCase().replace(/\W+/g, "") + " (cannot be stopped)"); o.push(" " + (4000 + n) + "  you"); return o; },
    kill: function(a){ var p = +(a[0] || 0); if (p === 1) return ["kill: (1): Operation not permitted. " + WHO + " noticed."]; if (p >= 4000) { setTimeout(function(){ location.hash = "home"; }, 900); return ["Terminated."]; } return ["kill: (" + p + "): it came back"]; },
    rm: function(a){ return ["rm: " + (a[a.length - 1] || "") + ": " + WHO + " is using it"]; },
    sudo: function(a){ if (sudo) return run(a.join(" ")); inp.type = "password"; ps.textContent = "[sudo] password for " + user() + ": "; pending = function(pw){ inp.type = "text"; if (pw.toLowerCase() === HW || pw.toLowerCase() === W){ sudo = true; say("Access granted. It was always going to be."); prompt(); return a.length ? run(a.join(" ")) : []; } tries++; prompt(); return [tries < 3 ? "Sorry, try again." : "Hint: it’s the word nobody says. " + HW.length + " letters."]; }; return null; },
    ssh: function(a){ var to = (a[0] || "").toLowerCase().replace(/^.*@/, ""); loadSiblings(function(sib){ var m = sib.filter(function(x){ return x.slug === to || (x.name || "").toLowerCase().indexOf(to) === 0; })[0];
      if (!to || !m){ say("ssh: usage: ssh <member>. Members answering: " + sib.slice(0, 12).map(function(x){ return x.slug; }).join(", ") + " …"); return; }
      slow(["Connecting to " + m.slug + "…", "The authenticity of host '" + m.slug + "' can’t be established.", "Continuing anyway."], "", 450);
      setTimeout(function(){ location.href = "../" + (m.path || m.slug + "/") + "#hole-terminal"; }, 1700); }); return []; },
    talk: function(){ slow([WHO + " is typing…"].concat(WL.slice().sort(function(){ return Math.random() - 0.5; }).slice(0, 3).map(function(l){ return WHO + ": " + l; })), "odd-term-voice", 1300); return []; },
    date: function(){ var d = new Date(); return [d.toString().slice(0, 24) + (n > 8 ? " (it’s always this time down here)" : "")]; },
    uname: function(){ return [CO + "OS 4.0." + (hashStr(SLUG) % 99) + " " + W + "-kernel #1 SMP " + HW]; },
    history: function(){ return hist.slice(-12).map(function(h, i){ return "  " + (i + 1) + "  " + h; }).concat(["  " + (hist.length + 1) + "  cd /vault (not you)"]); },
    clear: function(){ out.innerHTML = ""; return []; },
    exit: function(){ if (sudo){ sudo = false; return ["logout"]; } setTimeout(function(){ location.hash = "home"; }, 500); return ["logout", "Connection to " + SLUG + " closed. Mostly."]; },
    echo: function(a){ return [a.join(" ")]; }
  };
  CMD.dir = CMD.ls; CMD.type = CMD.cat; CMD.more = CMD.cat; CMD.less = CMD.cat; CMD.logout = CMD.exit; CMD.quit = CMD.exit; CMD.man = function(){ return ["No manual entry. " + WHO + " remembers how."]; };
  var pending = null;
  function you(){
    var o = ["user      " + user(), "screen    " + screen.width + "×" + screen.height + " at " + devicePixelRatio + "x", "language  " + navigator.language, "zone      " + (Intl.DateTimeFormat().resolvedOptions().timeZone || "?"), "local     " + new Date().toLocaleTimeString(), "here for  " + Math.round((Date.now() - performance.timeOrigin) / 1000) + " s", "visits    " + (O.stats().n + 1), "(this file is made in your browser and goes nowhere)"];
    return o;
  }
  function run(line){
    var a = line.trim().split(/\s+/), c = (a.shift() || "").toLowerCase(); if (!c) return [];
    var f = CMD[c]; if (f) return f(a);
    if (c === HW || c === W) return ["…", WHO + ": you said it."];
    return [c + ": command not found" + (Math.random() < 0.25 ? ". Did you mean " + pick(WORDS) + "?" : "")];
  }
  inp.addEventListener("keydown", function(e){
    if (e.key === "Enter"){
      var line = inp.value; inp.value = ""; idle = 0;
      if (pending){ var p = pending; pending = null; say(ps.textContent); var r0 = p(line); if (r0) r0.forEach(function(l){ say(l); }); return; }
      say(ps.textContent + line, "odd-term-echo"); if (line.trim()) { hist.push(line); hi = hist.length; } n++;
      var r = run(line); if (r) r.forEach(function(l){ say(n > 14 && Math.random() < 0.3 ? O.rot(l, Math.min(0.5, n * 0.02)) : l); });
      if (r !== null) prompt();
      if (n === 7 || n === 19) setTimeout(function(){ say(WHO + ": " + pick(WL), "odd-term-voice"); }, 1600);
    } else if (e.key === "ArrowUp"){ if (hi > 0){ hi--; inp.value = hist[hi]; } e.preventDefault(); }
    else if (e.key === "ArrowDown"){ if (hi < hist.length){ hi++; inp.value = hist[hi] || ""; } e.preventDefault(); }
    else if (e.key === "Tab"){ e.preventDefault(); var w = inp.value.split(" "), last = w.pop(), r1 = node("."), d = r1[0]; if (d && d._ === "dir"){ var m = Object.keys(d).filter(function(k){ return k !== "_" && k.indexOf(last) === 0; }); if (m.length === 1){ w.push(m[0]); inp.value = w.join(" "); } } }
  });
  wrap.addEventListener("click", function(){ inp.focus(); });
  var motd = ["Last login: " + new Date(Date.now() - 86400000 * (1 + hashStr(SLUG) % 400)).toString().slice(0, 24) + " from " + WHO.toLowerCase().replace(/\W+/g, ""), "", CO.toUpperCase() + " INTERNAL", noDot(pick(LINES)) + ".", "", "Type help."];
  slow(motd, "", 120);
  prompt(); setTimeout(function(){ inp.focus({ preventScroll: true }); }, 50);
  if (T) clearInterval(T);
  T = setInterval(function(){ if (!document.body.contains(inp)){ clearInterval(T); T = null; return; } if (++idle === 4) say(WHO + ": " + pick(WL), "odd-term-voice"); if (idle === 9){ say(user() + "@" + SLUG + ":~$ cd /vault", "odd-term-echo"); say("(you didn’t type that)", "odd-term-voice"); } }, 6000);
  return 4;
}

/* a terminal window that slides in from the corner of an ordinary page */
function hatch(){
  var L = O.layer(), d = document.createElement("div"); d.className = "odd-hatch";
  d.innerHTML = "<pre></pre><a href='#hole-terminal'>Answer</a>";
  L.appendChild(d); requestAnimationFrame(function(){ d.classList.add("on"); });
  var lines = ["incoming connection from " + WHO.toLowerCase().replace(/\W+/g, "") + "@" + SLUG, "login: " + user(), "password: ********", "", noDot(pick(WL)) + "."], pre = $("pre", d), i = 0, k = 0, txt = "";
  var t = setInterval(function(){ if (i >= lines.length){ clearInterval(t); return; } var l = lines[i]; if (k < l.length){ txt += l[k++]; } else { txt += "\n"; i++; k = 0; } pre.textContent = txt + "▌"; }, 35);
  O.onStop(function(){ clearInterval(t); d.remove(); });
  O.later(function(){ d.classList.remove("on"); }, 11000); O.later(function(){ d.remove(); }, 11800);
  $("a", d).addEventListener("click", function(){ d.remove(); });
  return 3000;
}

/* =====================================================================
   ASKS: camera, microphone, location
   ===================================================================== */
var asked = {}; try { asked = JSON.parse(sessionStorage.getItem("odd-asked:" + SLUG) || "{}"); } catch (e) {}
function mark(k){ asked[k] = 1; try { sessionStorage.setItem("odd-asked:" + SLUG, JSON.stringify(asked)); } catch (e) {} }
var WHY = {
  camera: [CO + " would like to use your camera", "to match your face to your " + W + " profile.", "Your face is processed on this device."],
  mic: [CO + " would like to use your microphone", "so " + WHO + " can hear you.", "Your voice stays on this device."],
  gps: [CO + " would like to know your location", "to find the nearest " + W + ".", "Your location stays on this device."],
  motion: [CO + " would like to use your phone’s motion sensors", "to keep the page level.", "Motion stays on this device."],
  pulse: [CO + " needs to confirm you’re alive", "Hold a fingertip over the camera on the back of your phone.", "Your pulse is measured on this device."]
};
function dialog(kind, onYes){
  var w = WHY[kind], d = document.createElement("div"); d.className = "odd-ask";
  d.innerHTML = "<div class='odd-ask-box' role='dialog' aria-modal='true' aria-label='" + esc(w[0]) + "'><p class='eyebrow'>" + esc(CO) + " · permissions</p><h3>" + esc(w[0]) + "</h3><p>" + esc(w[1]) + "</p><p class='muted small'>" + esc(w[2]) + " Nothing is recorded or sent.</p><div class='odd-ask-btns'><button class='btn btn-ghost' data-no>Not now</button><button class='btn btn-primary' data-yes>Allow</button></div></div>";
  document.body.appendChild(d); requestAnimationFrame(function(){ d.classList.add("on"); });
  var close = function(){ d.remove(); };
  $("[data-no]", d).onclick = function(){ mark(kind); close(); if (window.Engine) Engine.toast(pick(["That’s fine. We’ll ask again.", WHO + " says that’s fine.", "Noted."])); };
  $("[data-yes]", d).onclick = function(){ mark(kind); close(); onYes(); };
  O.onStop(close);
  $("[data-yes]", d).focus({ preventScroll: true });
  return 20000;
}
function stage(cls){
  var st = document.createElement("div"); st.className = "odd-stage " + (cls || "");
  st.innerHTML = "<button class='odd-stage-x' aria-label='Close'>Close &times;</button><p class='odd-stage-line'></p><p class='odd-stage-fine'>Live in this tab only. Nothing is recorded or sent.</p>";
  document.body.appendChild(st); requestAnimationFrame(function(){ st.classList.add("on"); });
  return st;
}
function typeLines(el, lines, gap){ var i = 0; var go = function(){ if (!el.isConnected || i >= lines.length) return; el.textContent = lines[i++]; setTimeout(go, gap || 3200); }; go(); }

/* the camera: your face, redrawn out of the company's motif */
function camera(){
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return 0;
  return dialog("camera", function(){
    navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" }, audio: false }).then(function(stream){
      var st = stage("odd-cam"), v = document.createElement("video"); v.muted = true; v.playsInline = true; v.srcObject = stream; v.play();
      var cv = document.createElement("canvas"); st.insertBefore(cv, st.firstChild);
      var g = cv.getContext("2d"), sm = document.createElement("canvas"), sg = sm.getContext("2d", { willReadFrequently: true });
      var shape = new Path2D(window.Engine && Engine.icon || "M-.4-.4h.8v.8h-.8z"), ink = (S.motif && S.motif.ink) || "#EDE6D3", acc = getComputedStyle(document.body).getPropertyValue("--accent").trim() || "#c33";
      var raf = 0, t0 = performance.now(), cols = 72;
      function fit(){ cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; }
      fit(); addEventListener("resize", fit);
      function frame(now){
        raf = requestAnimationFrame(frame); if (v.readyState < 2) return;
        var t = (now - t0) / 1000, c = Math.round(cols - Math.min(40, t * 1.6)), rws = Math.round(c * 0.75); sm.width = c; sm.height = rws;
        sg.save(); sg.translate(c, 0); sg.scale(-1, 1); sg.drawImage(v, 0, 0, c, rws); sg.restore();
        var px = sg.getImageData(0, 0, c, rws).data, cw = cv.width / c, ch = cv.height / rws, s = Math.min(cw, ch);
        g.fillStyle = "#000"; g.fillRect(0, 0, cv.width, cv.height);
        for (var y = 0; y < rws; y++) for (var x = 0; x < c; x++){
          var i = (y * c + x) * 4, l = (px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11) / 255; if (l < 0.12) continue;
          var wob = reduced ? 0 : Math.sin(t * 2 + x * 0.4 + y * 0.3) * 0.25;
          g.save(); g.translate((x + 0.5) * cw, (y + 0.5) * ch); g.rotate(wob + (x * 7 + y * 13) % 5 * 0.08); g.scale(s * l * 1.15, s * l * 1.15);
          g.fillStyle = l > 0.8 && (x + y) % 7 === 0 ? acc : ink; g.fill(shape); g.restore();
        }
      }
      raf = requestAnimationFrame(frame);
      typeLines($(".odd-stage-line", st), ["There you are.", "Hold still. We’re matching you.", "Match found: " + W + ".", noDot(pick(WL)) + ".", WHO + " would like to keep this one."], 3400);
      var stop = function(){ cancelAnimationFrame(raf); removeEventListener("resize", fit); stream.getTracks().forEach(function(k){ k.stop(); }); v.srcObject = null; st.remove(); };
      $(".odd-stage-x", st).onclick = stop; setTimeout(stop, 30000); O.onStop(stop);
    }).catch(function(){ if (window.Engine) Engine.toast("No camera. " + WHO + " will wait."); });
  });
}

/* the microphone: what you say comes back slower, lower, and the wrong way round */
function mic(){
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !(window.AudioContext || window.webkitAudioContext)) return 0;
  return dialog("mic", function(){
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false }).then(function(stream){
      var ac = new (window.AudioContext || window.webkitAudioContext)(), src = ac.createMediaStreamSource(stream), st = stage("odd-mic");
      var an = ac.createAnalyser(); an.fftSize = 1024; src.connect(an);
      /* live: a ring modulator under a long, dark echo, kept quiet so speakers don't howl */
      var ring = ac.createGain(); ring.gain.value = 0; var osc = ac.createOscillator(); osc.frequency.value = 31 + (hashStr(SLUG) % 40); osc.connect(ring.gain); osc.start();
      var lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1400;
      var dl = ac.createDelay(2); dl.delayTime.value = 0.9; var fb = ac.createGain(); fb.gain.value = 0.35; var out = ac.createGain(); out.gain.value = 0.32;
      src.connect(ring); ring.connect(lp); lp.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(out); out.connect(ac.destination);
      /* and every few seconds, the last stretch played back reversed and slowed */
      var len = Math.round(ac.sampleRate * 3), buf = new Float32Array(len), wp = 0, sp = ac.createScriptProcessor(2048, 1, 1), sink = ac.createGain(); sink.gain.value = 0;
      sp.onaudioprocess = function(e){ var d = e.inputBuffer.getChannelData(0); for (var i = 0; i < d.length; i++){ buf[wp] = d[i]; wp = (wp + 1) % len; } };
      src.connect(sp); sp.connect(sink); sink.connect(ac.destination);
      var back = setInterval(function(){ var b = ac.createBuffer(1, len, ac.sampleRate), ch = b.getChannelData(0); for (var i = 0; i < len; i++) ch[i] = buf[(wp - 1 - i + len * 2) % len]; var s = ac.createBufferSource(); s.buffer = b; s.playbackRate.value = 0.62; var gg = ac.createGain(); gg.gain.value = 0.5; s.connect(gg); gg.connect(lp); gg.connect(ac.destination); s.start(); }, 5200);
      var cv = document.createElement("canvas"); st.insertBefore(cv, st.firstChild); var g = cv.getContext("2d"), data = new Uint8Array(an.fftSize), raf = 0;
      var shape = new Path2D(window.Engine && Engine.icon || "M-.4-.4h.8v.8h-.8z"), ink = (S.motif && S.motif.ink) || "#EDE6D3";
      function fit(){ cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; } fit(); addEventListener("resize", fit);
      function frame(){ raf = requestAnimationFrame(frame); an.getByteTimeDomainData(data); g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(0, 0, cv.width, cv.height); var n = 48, mid = cv.height / 2;
        for (var i = 0; i < n; i++){ var v = (data[Math.floor(i / n * data.length)] - 128) / 128, x = (i + 0.5) / n * cv.width, s = cv.width / n * (0.4 + Math.abs(v) * 3); g.save(); g.translate(x, mid + v * cv.height * 0.4); g.rotate(v * 3); g.scale(s, s); g.fillStyle = ink; g.fill(shape); g.restore(); } }
      frame();
      typeLines($(".odd-stage-line", st), ["Say something.", "Again. Slower.", WHO + " is repeating you.", "That isn’t what you said.", "Use headphones next time. We’ll hear you better."], 4200);
      var stop = function(){ cancelAnimationFrame(raf); clearInterval(back); removeEventListener("resize", fit); try { sp.disconnect(); src.disconnect(); osc.stop(); } catch (e) {} stream.getTracks().forEach(function(k){ k.stop(); }); ac.close(); st.remove(); };
      $(".odd-stage-x", st).onclick = stop; setTimeout(stop, 30000); O.onStop(stop);
    }).catch(function(){ if (window.Engine) Engine.toast("No microphone. " + WHO + " will speak up."); });
  });
}

/* location: oddly specific, entirely made up, worked out here and never sent */
function gps(){
  if (!navigator.geolocation) return 0;
  return dialog("gps", function(){
    navigator.geolocation.getCurrentPosition(function(pos){
      var c = pos.coords, la = c.latitude, lo = c.longitude, h = hashStr(la.toFixed(3) + "," + lo.toFixed(3) + SLUG), r = function(k){ return ((h >>> k) & 255) / 255; };
      var DIRS = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"], dir = DIRS[h % 8], back = DIRS[(h + 4) % 8];
      var near = (0.1 + r(3) * 0.6).toFixed(1), count = 3 + (h % 60), hr = new Date().getHours(), dark = hr < 7 || hr >= 17;
      var fmt = function(v, p, n){ return Math.abs(v).toFixed(4) + "° " + (v >= 0 ? p : n); };
      var lines = [
        "We have you at " + fmt(la, "N", "S") + ", " + fmt(lo, "E", "W") + ".",
        c.accuracy ? "To within " + Math.round(c.accuracy) + " metres. Close enough." : "Close enough.",
        "There are " + count + " " + W + "s within a mile of you.",
        "The nearest one is " + near + " miles " + dir + ".",
        dark ? "It’s dark where you are. The lights are on." : "It’s light where you are. For now.",
        "Don’t look " + back + ".",
        c.speed ? "You’re moving. " + WHO + " can keep up." : "You haven’t moved. Good.",
        WHO + " has been to " + la.toFixed(1) + ", " + lo.toFixed(1) + " before.",
        "(None of this is true. None of it left your browser.)"
      ];
      var st = stage("odd-gps"), cv = document.createElement("canvas"); st.insertBefore(cv, st.firstChild);
      var g = cv.getContext("2d"), raf = 0, t0 = performance.now(), shape = new Path2D(window.Engine && Engine.icon || "M-.4-.4h.8v.8h-.8z"), ink = (S.motif && S.motif.ink) || "#EDE6D3";
      var blips = []; for (var i = 0; i < Math.min(count, 40); i++) blips.push([r(i % 24) * Math.PI * 2 + i, 0.15 + ((h * (i + 3)) % 1000) / 1000 * 0.8]);
      function fit(){ cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; } fit(); addEventListener("resize", fit);
      function frame(now){ raf = requestAnimationFrame(frame); var t = (now - t0) / 1000, W2 = cv.width, H2 = cv.height, R = Math.min(W2, H2) * 0.42, cx = W2 / 2, cy = H2 / 2, sweep = t * 1.1;
        g.fillStyle = "rgba(0,8,4,.2)"; g.fillRect(0, 0, W2, H2); g.strokeStyle = "rgba(80,255,140,.25)"; g.lineWidth = devicePixelRatio;
        for (var k = 1; k <= 4; k++){ g.beginPath(); g.arc(cx, cy, R * k / 4, 0, 7); g.stroke(); }
        g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(sweep) * R, cy + Math.sin(sweep) * R); g.strokeStyle = "rgba(80,255,140,.7)"; g.stroke();
        blips.forEach(function(b, j){ var a = b[0], d = b[1] * (1 - Math.min(0.6, t / 60)), seen = ((sweep - a) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2); if (seen > 2.5) return; var s = R * 0.05 * (1 - seen / 2.5); g.save(); g.translate(cx + Math.cos(a) * d * R, cy + Math.sin(a) * d * R); g.scale(s, s); g.fillStyle = ink; g.globalAlpha = 1 - seen / 2.5; g.fill(shape); g.restore(); });
        g.fillStyle = "#EDE6D3"; g.beginPath(); g.arc(cx, cy, 4 * devicePixelRatio, 0, 7); g.fill(); }
      raf = requestAnimationFrame(frame);
      typeLines($(".odd-stage-line", st), lines, 3000);
      var stop = function(){ cancelAnimationFrame(raf); removeEventListener("resize", fit); st.remove(); la = lo = null; };
      $(".odd-stage-x", st).onclick = stop; setTimeout(stop, 32000); O.onStop(stop);
    }, function(){ if (window.Engine) Engine.toast("We’ll find you another way."); }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
  });
}

/* ---------- phones only: motion sensors ---------- */
var touch = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches) && ("ontouchstart" in window);
function chip(label, onStop){
  var c = document.createElement("button"); c.className = "odd-chip"; c.textContent = label; document.body.appendChild(c);
  c.onclick = onStop; return c;
}
/* the page comes loose: it slides with the phone, the motif pools at the bottom, shaking tears it, upside down it tells you the word */
function motion(){
  if (!window.DeviceMotionEvent && !window.DeviceOrientationEvent) return 0;
  return dialog("motion", function(){
    var ask = window.DeviceMotionEvent && DeviceMotionEvent.requestPermission ? DeviceMotionEvent.requestPermission() : Promise.resolve("granted");
    var ask2 = window.DeviceOrientationEvent && DeviceOrientationEvent.requestPermission ? DeviceOrientationEvent.requestPermission() : Promise.resolve("granted");
    Promise.all([ask, ask2]).then(function(r){ if (r[0] !== "granted") throw 0; loose(); }).catch(function(e){ if (e) try { console.error(e); } catch (x) {} if (window.Engine) Engine.toast("Hold the page still yourself, then."); });
  });
}
function loose(){
  var main = $("main"), L = O.layer(), bugs = [], uri = "", gx = 0, gy = 1, tx = 0, ty = 0, shakes = 0, lastShake = 0, still = 0, upside = false, alive = true, t0 = Date.now(), lastMove = Date.now();
  var d = window.Engine && Engine.icon, ink = (S.motif && S.motif.ink) || "#EDE6D3";
  var img = d ? "url(\"data:image/svg+xml," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='-0.5 -0.5 1 1'><path d='" + d + "' fill='" + ink + "' stroke='#111' stroke-width='0.05'/></svg>").replace(/'/g, "%27") + "\")" : "";
  for (var i = 0; i < 46 && img; i++){ var b = document.createElement("i"); b.className = "odd-grain"; b.style.backgroundImage = img; var s = 14 + Math.random() * 22; b.style.width = b.style.height = s + "px"; L.appendChild(b); bugs.push({ el: b, x: Math.random() * innerWidth, y: -Math.random() * innerHeight, vx: 0, vy: 0, s: s, r: Math.random() * 360 }); }
  var word = document.createElement("div"); word.className = "odd-upside"; word.textContent = HW; L.appendChild(word);
  main.style.transition = "transform .25s ease-out";
  function onMotion(e){
    var a = e.accelerationIncludingGravity || {}, x = a.x || 0, y = a.y || 0, z = a.z || 0, n = Math.sqrt(x * x + y * y + z * z) || 1;
    /* screen coordinates: x right, y down (phones report y up) */
    var ang = (screen.orientation && screen.orientation.angle) || window.orientation || 0, sx = x, sy = -y;
    if (ang === 90){ sx = -y; sy = -x; } else if (ang === -90 || ang === 270){ sx = y; sy = x; } else if (ang === 180){ sx = -x; sy = y; }
    gx = sx / 9.8; gy = sy / 9.8;
    var lin = e.acceleration ? Math.sqrt(Math.pow(e.acceleration.x || 0, 2) + Math.pow(e.acceleration.y || 0, 2) + Math.pow(e.acceleration.z || 0, 2)) : Math.abs(n - 9.8);
    if (lin > 2.5) lastMove = Date.now();
    if (lin > 16 && Date.now() - lastShake > 900){ lastShake = Date.now(); shook(); }
    upside = gy < -0.6;
  }
  function shook(){
    shakes++; bugs.forEach(function(b){ b.vx += (Math.random() - 0.5) * 60; b.vy += (Math.random() - 0.5) * 60; });
    if (navigator.vibrate) try { navigator.vibrate([30, 40, 30]); } catch (e) {}
    if (shakes === 1) Engine.toast(WHO + ": " + pick(["Don’t.", "Stop that.", "You’re hurting it."]));
    if (shakes === 2) O.glitch("tear");
    if (shakes >= 3){ stop(); O.rift(); }
  }
  var raf = 0, last = performance.now();
  function frame(now){
    if (!alive) return; raf = requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    /* the page slides a little way, as if it isn't stuck down */
    tx += (gx * 26 - tx) * 0.1; ty += (gy * 18 - ty) * 0.1;
    main.style.transform = "translate(" + tx.toFixed(1) + "px," + (ty - 10).toFixed(1) + "px) rotate(" + (gx * 1.6).toFixed(2) + "deg)";
    var W2 = innerWidth, H2 = innerHeight;
    bugs.forEach(function(b){
      b.vx += gx * 900 * dt; b.vy += gy * 900 * dt; b.vx *= 0.985; b.vy *= 0.985; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < 0){ b.x = 0; b.vx *= -0.3; } if (b.x > W2 - b.s){ b.x = W2 - b.s; b.vx *= -0.3; }
      if (b.y > H2 - b.s){ b.y = H2 - b.s; b.vy *= -0.3; } if (b.y < -b.s * 3 && gy < 0){ b.y = -b.s * 3; b.vy *= -0.3; }
      b.r += b.vx * dt * 2; b.el.style.transform = "translate(" + b.x.toFixed(1) + "px," + b.y.toFixed(1) + "px) rotate(" + b.r.toFixed(0) + "deg)";
    });
    word.classList.toggle("on", upside);
    if (Date.now() - lastMove > 12000 && !still){ still = 1; O.glitch("dark"); }
    if (Date.now() - lastMove < 2000) still = 0;
  }
  window.addEventListener("devicemotion", onMotion);
  raf = requestAnimationFrame(frame);
  var c = chip("Hold the page still ×", function(){ stop(); });
  Engine.toast(pick(["The page is loose. Tilt it.", "Careful. It’s not stuck down any more.", "Tilt the phone. Something will settle."]));
  var timer = setTimeout(stop, 60000);
  function stop(){ if (!alive) return; alive = false; clearTimeout(timer); cancelAnimationFrame(raf); window.removeEventListener("devicemotion", onMotion); main.style.transform = ""; setTimeout(function(){ main.style.transition = ""; }, 300); bugs.forEach(function(b){ b.el.remove(); }); word.remove(); c.remove(); }
  window.addEventListener("hashchange", stop, { once: true });
}

/* ---------- a pulse, from a fingertip on the camera ---------- */
/* Real photoplethysmography: blood flowing through the fingertip changes how much light gets through it,
   so the red channel of the camera rises and falls with each heartbeat. Rough, but real. */
function pulse(){
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return 0;
  return dialog("pulse", function(){
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: 320, height: 240, frameRate: { ideal: 30 } }, audio: false }).then(function(stream){
      var track = stream.getVideoTracks()[0];
      try { track.applyConstraints({ advanced: [{ torch: true }] }).catch(function(){}); } catch (e) {}
      var st = stage("odd-pulse"), v = document.createElement("video"); v.muted = true; v.playsInline = true; v.srcObject = stream; v.play();
      v.className = "odd-pulse-cam"; st.appendChild(v);
      var cv = document.createElement("canvas"); st.insertBefore(cv, st.firstChild);
      var g = cv.getContext("2d"), sm = document.createElement("canvas"), sg = sm.getContext("2d", { willReadFrequently: true }); sm.width = 40; sm.height = 30;
      var xs = [], ts = [], bpm = 0, quality = 0, raf = 0, t0 = performance.now(), acc = getComputedStyle(document.body).getPropertyValue("--accent").trim() || "#c33", said = {};
      var line = $(".odd-stage-line", st); line.textContent = "Cover the back camera with a fingertip. Hold still.";
      function fit(){ cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; } fit(); addEventListener("resize", fit);
      function estimate(){
        var n = xs.length; if (n < 90) return;
        var span = (ts[n - 1] - ts[0]) / 1000, fs = n / span, a = [], m, k, i;
        /* detrend: subtract a 1 s moving mean */
        var win = Math.max(3, Math.round(fs)); for (i = 0; i < n; i++){ var s0 = 0, c0 = 0; for (k = Math.max(0, i - win); k < Math.min(n, i + win); k++){ s0 += xs[k]; c0++; } a.push(xs[i] - s0 / c0); }
        m = 0; for (i = 0; i < n; i++) m += a[i] * a[i]; if (!m) return;
        var best = 0, bestLag = 0, lo = Math.round(fs * 60 / 180), hi = Math.round(fs * 60 / 45);
        for (var lag = lo; lag <= hi && lag < n - 10; lag++){ var r = 0; for (i = 0; i + lag < n; i++) r += a[i] * a[i + lag]; r /= m; if (r > best){ best = r; bestLag = lag; } }
        quality = best; if (best > 0.35 && bestLag) bpm = Math.round(60 * fs / bestLag);
      }
      function frame(now){
        raf = requestAnimationFrame(frame); if (v.readyState < 2) return;
        sg.drawImage(v, 0, 0, 40, 30); var px = sg.getImageData(10, 8, 20, 14).data, r = 0, gsum = 0;
        for (var i = 0; i < px.length; i += 4){ r += px[i]; gsum += px[i + 1]; }
        var cnt = px.length / 4, red = r / cnt, covered = red > 90 && red > (gsum / cnt) * 1.6;
        if (covered){ xs.push(red); ts.push(now); if (xs.length > 300){ xs.shift(); ts.shift(); } } else { xs = []; ts = []; bpm = 0; }
        if (xs.length % 15 === 0) estimate();
        /* draw: the trace, and the room flushing in time */
        var W2 = cv.width, H2 = cv.height, beat = bpm ? Math.pow(0.5 + 0.5 * Math.cos((now / 1000) * bpm / 60 * Math.PI * 2), 6) : 0;
        g.fillStyle = "#000"; g.fillRect(0, 0, W2, H2);
        if (beat){ g.fillStyle = acc; g.globalAlpha = beat * 0.35; g.fillRect(0, 0, W2, H2); g.globalAlpha = 1; }
        if (xs.length > 10){ var mn = Infinity, mx = -Infinity, j; for (j = 0; j < xs.length; j++){ mn = Math.min(mn, xs[j]); mx = Math.max(mx, xs[j]); } g.beginPath(); for (j = 0; j < xs.length; j++){ var x = j / 300 * W2, y = H2 * 0.45 - ((xs[j] - mn) / ((mx - mn) || 1) - 0.5) * H2 * 0.25; j ? g.lineTo(x, y) : g.moveTo(x, y); } g.strokeStyle = "#EDE6D3"; g.lineWidth = 2 * devicePixelRatio; g.stroke(); }
        if (bpm){ g.fillStyle = "#EDE6D3"; g.font = (90 * devicePixelRatio) + "px ui-monospace,monospace"; g.textAlign = "center"; g.fillText(bpm, W2 / 2, H2 * 0.3); }
        var t = (now - t0) / 1000;
        if (!covered && t > 3 && !said.c){ line.textContent = "We can’t see your finger. Cover the camera on the back."; }
        if (covered && !bpm && t > 6 && !said.w){ said.w = 1; line.textContent = "Press a little harder. Keep still."; }
        if (bpm && !said.b){ said.b = 1; var l = bpm > 100 ? [bpm + ". You’re frightened. Good.", "Faster than " + WHO + " likes."] : bpm < 58 ? [bpm + ". Very calm.", "Too calm. Are you sure you’re here?"] : [bpm + ".", "The same as " + WHO + ". That’s not possible."]; typeLines(line, l.concat(["We’ll keep this for your " + W + ".", "(We won’t. It never leaves this tab.)"]), 3000); }
        if (covered && !bpm && t > 18 && !said.n){ said.n = 1; line.textContent = "No pulse found. " + WHO + " didn’t have one either."; }
      }
      raf = requestAnimationFrame(frame);
      var stop = function(){ cancelAnimationFrame(raf); removeEventListener("resize", fit); try { track.applyConstraints({ advanced: [{ torch: false }] }).catch(function(){}); } catch (e) {} stream.getTracks().forEach(function(k){ k.stop(); }); v.srcObject = null; st.remove(); if (bpm) thump(bpm); xs = ts = null; };
      $(".odd-stage-x", st).onclick = stop; setTimeout(stop, 40000); O.onStop(stop);
    }).catch(function(){ if (window.Engine) Engine.toast("No camera. We’ll assume you’re alive."); });
  });
}
/* after a reading, the page keeps your heartbeat for a while */
function thump(bpm){
  if (reduced) return;
  document.documentElement.style.setProperty("--odd-beat", (60 / bpm).toFixed(3) + "s"); document.body.classList.add("odd-thump");
  var end = function(){ document.body.classList.remove("odd-thump"); };
  setTimeout(end, 30000); window.addEventListener("hashchange", end, { once: true });
}

/* =====================================================================
   WIRING
   ===================================================================== */
O.extend({
  holes: { terminal: termRender },
  entries: { terminal: "terminal" },
  glitches: { hatch: hatch },
  asks: (function(){ var a = { camera: function(){ return asked.camera ? 0 : camera(); }, mic: function(){ return asked.mic ? 0 : mic(); }, gps: function(){ return asked.gps ? 0 : gps(); } };
    if (touch){ a.motion = function(){ return asked.motion ? 0 : motion(); }; a.motion2 = a.motion; a.pulse = function(){ return asked.pulse ? 0 : pulse(); }; }
    return a; })(),
  /* by hand these ask even if you said no earlier */
  byHand: { camera: camera, mic: mic, gps: gps, motion: motion, pulse: pulse }
});

/* the backtick opens the back door, from anywhere that isn't a text field */
document.addEventListener("keydown", function(e){
  if ((e.key === "`" || e.key === "~") && !e.metaKey && !e.ctrlKey && !(e.target && e.target.closest && e.target.closest("input,textarea,select,[contenteditable]"))){ location.hash = "hole-terminal"; e.preventDefault(); }
});
try { console.log("%c" + CO + " · there is a door. Press ` to use it.", "font-family:monospace;color:#888"); } catch (e) {}
})();
