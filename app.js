(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var AVATARS = ["🦊", "🐼", "🐸", "🦄", "🐙", "🦖", "🐧", "🦉", "🐯", "🐳", "🦔", "🐝"];
  var THROWS = ["🎉", "🍅", "💘", "🧻", "🔥"];
  var CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ";

  function mk(l, n) { return { l: String(l), n: n === undefined ? null : n }; }
  var DECKS = {
    fib: { name: "Fibonacci", cards: [mk(0, 0), mk(1, 1), mk(2, 2), mk(3, 3), mk(5, 5), mk(8, 8), mk(13, 13), mk(21, 21), mk("?"), mk("☕")] },
    tshirt: { name: "T-shirt sizes", cards: [mk("XS", 1), mk("S", 2), mk("M", 3), mk("L", 5), mk("XL", 8), mk("XXL", 13), mk("?"), mk("☕")] },
    animals: { name: "Animals 🐘", cards: [mk("🐜", 1), mk("🐁", 2), mk("🐈", 3), mk("🐕", 5), mk("🐎", 8), mk("🐘", 13), mk("🐋", 21), mk("?"), mk("☕")] },
    pizza: { name: "Pizza slices 🍕", cards: [mk("½", 0.5), mk("1", 1), mk("2", 2), mk("3", 3), mk("4", 4), mk("6", 6), mk("8", 8), mk("🍕", 12), mk("?"), mk("☕")] }
  };

  /* ---------- helpers ---------- */
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function rid() { return Math.random().toString(36).slice(2, 10); }
  function newCode() { var s = ""; for (var i = 0; i < 4; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]; return s; }
  function toast(t) { var el = $("#toast"); el.textContent = t; el.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(function () { el.classList.remove("show"); }, 2600); }

  /* ---------- sound ---------- */
  var muted = store("pp-muted") === "1";
  var actx = null;
  function beep(freq, dur, type, delay) {
    if (muted) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      var o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + (delay || 0);
      o.type = type || "sine"; o.frequency.value = freq;
      g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur);
    } catch (e) {}
  }
  var sfx = {
    vote: function () { beep(520, 0.1, "triangle"); },
    reveal: function () { beep(392, 0.12, "square"); beep(523, 0.12, "square", 0.1); beep(659, 0.2, "square", 0.2); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { beep(f, 0.18, "triangle", i * 0.09); }); },
    throwIt: function () { beep(300, 0.15, "sawtooth"); },
    tick: function () { beep(880, 0.05, "square"); }
  };
  function syncSoundBtn() { $("#soundBtn").textContent = muted ? "🔇" : "🔊"; }

  /* ---------- confetti ---------- */
  var parts = [], raf = null;
  function confetti() {
    var cv = $("#confetti"), cx = cv.getContext("2d");
    cv.width = innerWidth; cv.height = innerHeight;
    var colors = ["#7c4dff", "#ff5fa2", "#ffd93d", "#22c55e", "#38bdf8"];
    for (var i = 0; i < 160; i++) parts.push({ x: innerWidth / 2, y: innerHeight * 0.45, vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 15 - 3, s: 5 + Math.random() * 7, c: colors[i % colors.length], r: Math.random() * 6, life: 140 });
    if (raf) return;
    (function step() {
      cx.clearRect(0, 0, cv.width, cv.height);
      parts = parts.filter(function (p) { return p.life > 0; });
      parts.forEach(function (p) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.4; p.r += 0.2; p.life--;
        cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.fillStyle = p.c; cx.globalAlpha = Math.min(1, p.life / 40);
        cx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); cx.restore();
      });
      if (parts.length) raf = requestAnimationFrame(step); else { raf = null; cx.clearRect(0, 0, cv.width, cv.height); }
    })();
  }

  /* ---------- networking (host is the hub) ---------- */
  function PeerNet() { this.conns = {}; }
  PeerNet.prototype.host = function (code, cb) {
    var self = this;
    this.peer = new Peer("pointpals-" + code);
    this.peer.on("open", function (id) { cb.open(id); });
    this.peer.on("error", function (e) { cb.error(e.type === "unavailable-id" ? "taken" : e.type); });
    this.peer.on("connection", function (c) {
      c.on("open", function () { self.conns[c.peer] = c; });
      c.on("data", function (m) { self.onmsg(c.peer, m); });
      c.on("close", function () { delete self.conns[c.peer]; self.onleave(c.peer); });
    });
  };
  PeerNet.prototype.join = function (code, cb) {
    var self = this, done = false;
    this.peer = new Peer();
    this.peer.on("error", function (e) { if (!done) { done = true; cb.error(e.type === "peer-unavailable" ? "notfound" : e.type); } });
    this.peer.on("open", function (id) {
      var c = self.peer.connect("pointpals-" + code, { reliable: true });
      self.hostConn = c;
      c.on("open", function () { done = true; cb.open(id); });
      c.on("data", function (m) { self.onmsg("host", m); });
      c.on("close", function () { self.onclose(); });
    });
    setTimeout(function () { if (!done) { done = true; cb.error("notfound"); } }, 9000);
  };
  PeerNet.prototype.toHost = function (m) { if (this.hostConn && this.hostConn.open) this.hostConn.send(m); };
  PeerNet.prototype.broadcast = function (m) { var c = this.conns; Object.keys(c).forEach(function (k) { if (c[k].open) c[k].send(m); }); };
  PeerNet.prototype.close = function () { try { this.peer.destroy(); } catch (e) {} };

  // Fallback when PeerJS cannot load: works across tabs of one browser (demo / offline).
  function LocalNet() { this.id = rid(); }
  LocalNet.prototype._open = function (code) {
    var self = this;
    this.ch = new BroadcastChannel("pointpals-" + code);
    this.ch.onmessage = function (ev) { self._rx(ev.data); };
    window.addEventListener("beforeunload", function () { if (!self.isHost) self.ch.postMessage({ from: self.id, to: "host", m: { t: "bye" } }); });
  };
  LocalNet.prototype.host = function (code, cb) {
    this.isHost = true; this._open(code); this.hostId = this.id; cb.open(this.id);
  };
  LocalNet.prototype.join = function (code, cb) {
    var self = this, ok = false;
    this._open(code);
    this._pong = function () { ok = true; cb.open(self.id); };
    this.ch.postMessage({ from: this.id, to: "host", m: { t: "ping" } });
    setTimeout(function () { if (!ok) cb.error("notfound"); }, 1500);
  };
  LocalNet.prototype._rx = function (d) {
    if (this.isHost) {
      if (d.to !== "host") return;
      if (d.m.t === "ping") { this.ch.postMessage({ from: "host", to: d.from, m: { t: "pong" } }); return; }
      if (d.m.t === "bye") { this.onleave(d.from); return; }
      this.onmsg(d.from, d.m);
    } else {
      if (d.to !== this.id && d.to !== "all") return;
      if (d.m.t === "pong") { if (this._pong) this._pong(); return; }
      this.onmsg("host", d.m);
    }
  };
  LocalNet.prototype.toHost = function (m) { this.ch.postMessage({ from: this.id, to: "host", m: m }); };
  LocalNet.prototype.broadcast = function (m) { this.ch.postMessage({ from: "host", to: "all", m: m }); };
  LocalNet.prototype.close = function () { try { this.ch.close(); } catch (e) {} };

  /* ---------- app state ---------- */
  var forceLocal = /[?&]local=1/.test(location.search);
  var usePeer = typeof Peer !== "undefined" && !forceLocal;
  var me = { id: null, name: store("pp-name") || "", avatar: store("pp-avatar") || AVATARS[Math.floor(Math.random() * AVATARS.length)] };
  var net = null, isHost = false, code = "", S = null, myVote = null, throwEmoji = THROWS[0];
  var timerEnd = 0, timerInt = null, storyDebounce = null;

  function newState() { return { round: 1, story: "", deck: "fib", revealed: false, players: {}, timerLeft: null, history: [] }; }

  /* ---------- host logic ---------- */
  function publicState() {
    var out = JSON.parse(JSON.stringify(S));
    Object.keys(out.players).forEach(function (id) {
      var p = out.players[id];
      p.voted = p.vote !== null && p.vote !== undefined;
      if (!out.revealed) delete p.vote;
    });
    return out;
  }
  function push() { var s = publicState(); net.broadcast({ t: "state", s: s }); apply(s); }

  function cardByLabel(l) { var d = DECKS[S.deck].cards; for (var i = 0; i < d.length; i++) if (d[i].l === l) return d[i]; return null; }
  function stats(s) {
    var deck = DECKS[s.deck].cards, ids = Object.keys(s.players);
    var votes = ids.map(function (i) { return s.players[i].vote; }).filter(function (v) { return v !== null && v !== undefined; });
    var nums = votes.map(function (l) { for (var i = 0; i < deck.length; i++) if (deck[i].l === l) return deck[i].n; return null; }).filter(function (n) { return n !== null; });
    var r = { count: votes.length, total: ids.length, consensus: votes.length > 1 && votes.every(function (v) { return v === votes[0]; }) };
    var tally = {}; votes.forEach(function (v) { tally[v] = (tally[v] || 0) + 1; });
    var best = 0; Object.keys(tally).forEach(function (k) { if (tally[k] > best) { best = tally[k]; r.mode = k; } });
    if (nums.length) {
      var sum = nums.reduce(function (a, b) { return a + b; }, 0); r.avg = sum / nums.length;
      var sorted = nums.slice().sort(function (a, b) { return a - b; }), m = Math.floor(sorted.length / 2);
      r.median = sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
      r.min = sorted[0]; r.max = sorted[sorted.length - 1];
      r.chaos = nums.length > 1 && r.min > 0 && r.max / r.min >= 5;
      for (var i = 0; i < deck.length; i++) if (deck[i].n !== null && deck[i].n >= r.avg) { r.suggest = deck[i].l; break; }
      if (!r.suggest) r.suggest = deck.filter(function (c) { return c.n !== null; }).pop().l;
    }
    return r;
  }

  function hostHandle(from, m) {
    if (m.t === "join") {
      S.players[from] = { name: String(m.name || "Anon").slice(0, 18), avatar: String(m.avatar || "🙂").slice(0, 4), vote: null };
      push();
    } else if (m.t === "vote") {
      if (S.players[from] && !S.revealed && typeof m.v === "string") { S.players[from].vote = m.v; push(); }
    } else if (m.t === "emoji") {
      net.broadcast({ t: "emoji", to: m.to, e: m.e, from: from }); onEmoji(m);
    } else if (m.t === "cmd") {
      if (m.a === "reveal" && !S.revealed) {
        S.revealed = true; S.timerLeft = null;
        var st = stats(S);
        S.history.unshift({ round: S.round, story: S.story || "(untitled)", mode: st.mode || "-", avg: st.avg !== undefined ? Math.round(st.avg * 10) / 10 : null, consensus: st.consensus });
        S.history = S.history.slice(0, 30);
        push();
      } else if (m.a === "reset") {
        S.round++; S.revealed = false; S.timerLeft = null; S.story = m.keepStory ? S.story : "";
        Object.keys(S.players).forEach(function (id) { S.players[id].vote = null; });
        push();
      } else if (m.a === "story") { S.story = String(m.v || "").slice(0, 120); push(); }
      else if (m.a === "deck" && DECKS[m.v]) {
        S.deck = m.v; S.revealed = false;
        Object.keys(S.players).forEach(function (id) { S.players[id].vote = null; });
        push();
      } else if (m.a === "timer") { S.timerLeft = Math.max(5, Math.min(300, +m.v || 30)) * 1000; push(); }
    }
  }
  function hostLeave(id) { if (S.players[id]) { delete S.players[id]; push(); } }

  /* ---------- client handling ---------- */
  function clientHandle(m) {
    if (m.t === "state") apply(m.s);
    else if (m.t === "emoji") onEmoji(m);
  }

  function act(m) { if (isHost) hostHandle(me.id, m); else net.toHost(m); }
  function cmd(a, v, extra) { var m = { t: "cmd", a: a, v: v }; if (extra) for (var k in extra) m[k] = extra[k]; act(m); }

  /* ---------- rendering ---------- */
  var cur = null;
  function apply(s) {
    var before = cur;
    if (before && (before.round !== s.round || before.deck !== s.deck)) myVote = null;
    cur = s;
    render(s, before);
  }

  function render(s, before) {
    var deck = DECKS[s.deck] || DECKS.fib;
    // story / deck inputs (do not clobber while typing)
    if (document.activeElement !== $("#storyInput")) $("#storyInput").value = s.story;
    $("#deckSelect").value = s.deck;

    // seats
    var ids = Object.keys(s.players), html = "";
    ids.forEach(function (id, i) {
      var p = s.players[id], up = s.revealed, label = up ? p.vote : null;
      var back = p.voted ? '<div class="face back">✓</div>' : '<div class="face back empty">…</div>';
      var front = '<div class="face front">' + esc(label === null || label === undefined ? "–" : label) + "</div>";
      html += '<div class="seat' + (id === me.id ? " me" : "") + '" data-id="' + esc(id) + '">' +
        '<div class="who">' + esc(p.avatar) + '</div><div class="nm">' + esc(p.name) + (id === me.id ? " (you)" : "") + "</div>" +
        '<div class="flip' + (up ? " up" : "") + '"><div class="flip-in" style="transition-delay:' + (up ? i * 90 : 0) + 'ms">' + back + front + "</div></div></div>";
    });
    $("#seats").innerHTML = html;
    if (before) ids.forEach(function (id) {
      if (s.players[id].voted && !(before.players[id] && before.players[id].voted) && id !== me.id) {
        var el = document.querySelector('.seat[data-id="' + id + '"]'); if (el) { el.classList.add("bump"); }
        sfx.vote();
      }
    });

    // hand
    var hh = "";
    deck.cards.forEach(function (c) {
      hh += '<button class="pcard' + (myVote === c.l ? " sel" : "") + '"' + (s.revealed ? " disabled" : "") + ' data-l="' + esc(c.l) + '">' + esc(c.l) + "</button>";
    });
    $("#hand").innerHTML = hh;

    // result
    var res = $("#result");
    if (s.revealed) {
      var st = stats(s), h = "";
      if (st.consensus) h = '<div class="big">🎉 Consensus: ' + esc(st.mode) + "!</div>";
      else if (st.chaos) h = '<div class="big">🌪 Chaos! ' + esc(st.min) + " vs " + esc(st.max) + " — talk it out</div>";
      else h = '<div class="big">Most votes: ' + esc(st.mode || "–") + "</div>";
      h += '<div class="stats">';
      if (st.avg !== undefined) h += '<div class="stat"><small>Average</small>' + Math.round(st.avg * 10) / 10 + '</div><div class="stat"><small>Median</small>' + st.median + '</div><div class="stat"><small>Suggested</small>' + esc(st.suggest) + "</div>";
      h += '<div class="stat"><small>Votes</small>' + st.count + "/" + st.total + "</div></div>";
      res.innerHTML = h; res.classList.remove("hidden");
      if (before && !before.revealed) {
        sfx.reveal();
        if (st.consensus) { setTimeout(function () { confetti(); sfx.win(); }, 650); }
      }
    } else res.classList.add("hidden");

    // buttons + history
    var voted = ids.filter(function (i) { return s.players[i].voted; }).length;
    $("#revealBtn").textContent = s.revealed ? "✅ Revealed" : "👀 Reveal cards (" + voted + "/" + ids.length + ")";
    $("#revealBtn").disabled = s.revealed || voted === 0;
    var hist = s.history.map(function (r) {
      return "<li><b>" + esc(r.mode) + "</b> — " + esc(r.story) + (r.consensus ? " 🎉" : "") + "</li>";
    }).join("");
    $("#history").innerHTML = hist || '<li class="empty">Nothing yet. Reveal a round!</li>';

    // timer
    if (s.timerLeft && (!before || before.timerLeft !== s.timerLeft || before.round !== s.round)) startTimer(s.timerLeft);
    if (!s.timerLeft && timerInt) stopTimer();
  }

  function startTimer(ms) {
    timerEnd = Date.now() + ms; clearInterval(timerInt);
    timerInt = setInterval(function () {
      var left = Math.ceil((timerEnd - Date.now()) / 1000), el = $("#timerOut");
      if (left <= 0) { stopTimer(); beep(220, 0.5, "sawtooth"); toast("⏰ Time's up! Reveal the cards."); return; }
      el.textContent = left + "s"; el.classList.toggle("low", left <= 5); if (left <= 5) sfx.tick();
    }, 250);
  }
  function stopTimer() { clearInterval(timerInt); timerInt = null; var el = $("#timerOut"); el.textContent = ""; el.classList.remove("low"); }

  /* ---------- emoji throwing ---------- */
  function onEmoji(m) {
    var seat = document.querySelector('.seat[data-id="' + m.to + '"]'); if (!seat) return;
    var r = seat.getBoundingClientRect(), el = document.createElement("div");
    el.className = "fly"; el.textContent = m.e;
    var sx = innerWidth * (0.2 + Math.random() * 0.6), sy = innerHeight + 20;
    var tx = r.left + r.width / 2 - 16, ty = r.top + 20;
    document.body.appendChild(el);
    var a = el.animate([{ transform: "translate(" + sx + "px," + sy + "px) rotate(0deg) scale(1)" }, { transform: "translate(" + tx + "px," + ty + "px) rotate(540deg) scale(1.6)" }], { duration: 650, easing: "cubic-bezier(.2,.7,.3,1)" });
    a.onfinish = function () { el.remove(); seat.classList.remove("bump"); void seat.offsetWidth; seat.classList.add("bump"); sfx.throwIt(); };
  }

  /* ---------- lobby / room flow ---------- */
  function setMsg(t) { $("#lobbyMsg").textContent = t || ""; }
  function validName() {
    var n = $("#nameInput").value.trim();
    if (!n) { setMsg("Pick a name first, pal."); $("#nameInput").focus(); return false; }
    me.name = n; store("pp-name", n); store("pp-avatar", me.avatar); return true;
  }

  function wire(n) {
    n.onmsg = function (from, m) { if (isHost) hostHandle(from, m); else clientHandle(m); };
    n.onleave = function (id) { if (isHost) hostLeave(id); };
    n.onclose = function () { toast("The host left, room closed."); leaveRoom(); };
  }
  function enterRoom() {
    $("#lobby").classList.add("hidden"); $("#room").classList.remove("hidden");
    $("#roomChip").classList.remove("hidden"); $("#roomCode").textContent = code;
    var link = location.origin + location.pathname + "#" + code;
    if (location.protocol === "file:") link = location.href.split("#")[0] + "#" + code;
    $("#inviteLink").value = link;
    $("#netNote").textContent = usePeer ? "Keep this tab open: you're the host. If you close it, the room ends." : "Offline demo mode: only tabs in this browser can join.";
    history.replaceState(null, "", "#" + code);
  }
  function leaveRoom() {
    if (net) net.close(); net = null; S = null; cur = null; myVote = null; stopTimer();
    $("#room").classList.add("hidden"); $("#lobby").classList.remove("hidden"); $("#roomChip").classList.add("hidden");
    history.replaceState(null, "", location.pathname + location.search);
  }

  function createRoom(tries) {
    if (!validName()) return;
    setMsg("Setting up your room…");
    code = newCode(); net = usePeer ? new PeerNet() : new LocalNet(); wire(net); isHost = true;
    net.host(code, {
      open: function (id) {
        me.id = id; S = newState(); enterRoom(); setMsg("");
        S.players[id] = { name: me.name, avatar: me.avatar, vote: null }; push();
      },
      error: function (e) {
        if (e === "taken" && (tries || 0) < 4) { net.close(); createRoom((tries || 0) + 1); return; }
        setMsg("Couldn't create a room (" + e + "). Check your connection."); net = null;
      }
    });
  }
  function joinRoom(c) {
    if (!validName()) return;
    c = (c || $("#codeInput").value).trim().toUpperCase();
    if (c.length !== 4) { setMsg("Room codes have 4 letters."); return; }
    setMsg("Looking for room " + c + "…");
    code = c; net = usePeer ? new PeerNet() : new LocalNet(); wire(net); isHost = false;
    net.join(c, {
      open: function (id) {
        me.id = id; enterRoom(); setMsg("");
        net.toHost({ t: "join", name: me.name, avatar: me.avatar });
      },
      error: function (e) { setMsg(e === "notfound" ? "No room " + c + " found. Is the host still online?" : "Connection problem (" + e + ")."); if (net) net.close(); net = null; }
    });
  }

  /* ---------- init ---------- */
  function init() {
    $("#nameInput").value = me.name;
    $("#avatars").innerHTML = AVATARS.map(function (a) { return '<button class="av' + (a === me.avatar ? " sel" : "") + '" data-a="' + a + '">' + a + "</button>"; }).join("");
    $("#avatars").addEventListener("click", function (e) {
      var b = e.target.closest(".av"); if (!b) return; me.avatar = b.dataset.a;
      document.querySelectorAll(".av").forEach(function (x) { x.classList.toggle("sel", x === b); });
    });
    $("#deckSelect").innerHTML = Object.keys(DECKS).map(function (k) { return '<option value="' + k + '">' + DECKS[k].name + "</option>"; }).join("");
    $("#throwBar").innerHTML = THROWS.map(function (t, i) { return '<button class="' + (i === 0 ? "sel" : "") + '">' + t + "</button>"; }).join("");
    syncSoundBtn();

    $("#createBtn").onclick = function () { createRoom(0); };
    $("#joinBtn").onclick = function () { joinRoom(); };
    $("#codeInput").addEventListener("keydown", function (e) { if (e.key === "Enter") joinRoom(); });
    $("#soundBtn").onclick = function () { muted = !muted; store("pp-muted", muted ? "1" : "0"); syncSoundBtn(); };
    $("#roomChip").onclick = function () { copy($("#inviteLink").value, "Invite link copied!"); };
    $("#inviteLink").onclick = function () { this.select(); };
    $("#revealBtn").onclick = function () { cmd("reveal"); };
    $("#resetBtn").onclick = function () { cmd("reset"); };
    $("#timerBtn").onclick = function () { cmd("timer", 30); };
    $("#deckSelect").onchange = function () { cmd("deck", this.value); };
    $("#storyInput").addEventListener("input", function () { var v = this.value; clearTimeout(storyDebounce); storyDebounce = setTimeout(function () { cmd("story", v); }, 350); });
    $("#hand").addEventListener("click", function (e) {
      var b = e.target.closest(".pcard"); if (!b || b.disabled) return;
      myVote = b.dataset.l; sfx.vote(); act({ t: "vote", v: myVote });
      document.querySelectorAll(".pcard").forEach(function (x) { x.classList.toggle("sel", x === b); });
    });
    $("#throwBar").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return; throwEmoji = b.textContent;
      document.querySelectorAll("#throwBar button").forEach(function (x) { x.classList.toggle("sel", x === b); });
    });
    $("#seats").addEventListener("click", function (e) {
      var s = e.target.closest(".seat"); if (!s) return;
      act({ t: "emoji", to: s.dataset.id, e: throwEmoji });
    });
    $("#copyHist").onclick = function () {
      if (!cur) return;
      copy(cur.history.slice().reverse().map(function (r) { return "R" + r.round + ": " + r.story + " = " + r.mode + (r.avg !== null ? " (avg " + r.avg + ")" : ""); }).join("\n") || "No rounds yet", "History copied!");
    };

    var h = location.hash.replace("#", "").toUpperCase();
    if (/^[A-Z]{4}$/.test(h)) { $("#codeInput").value = h; setMsg("Pick a name and hit Join to enter room " + h + "."); }
    if (!usePeer && !forceLocal) setMsg("Heads up: couldn't load the networking library, so only same-browser tabs can connect.");
  }
  function copy(text, ok) {
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { toast(ok); }, function () { toast("Copy failed"); });
    else toast("Copy not supported here");
  }
  init();
  window.__pp = { stats: stats, DECKS: DECKS };
})();
