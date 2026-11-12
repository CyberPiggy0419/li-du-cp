/* 李杜同聲 — 前端（无框架、无依赖） */
(function () {
  'use strict';

  var D = window.LD;
  if (!D) { document.body.innerHTML = '<p style="padding:40px">数据未加载：assets/data.js 缺失。</p>'; return; }
  var M = D.meta, POEMS = D.poems, PAIRS = D.pairs, HIST = D.hist;
  var LI = 0, DU = 1;
  var MEM_DU = D.memorial.du, MEM_LI = D.memorial.li;
  var MEM = MEM_DU.concat(MEM_LI);

  /* ───────── 工具 ───────── */
  function $(s, r) { return (r || document).querySelector(s); }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function num(n) { return Number(n).toLocaleString('en-US'); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function sim(v) { return (v / 10000).toFixed(4); }
  function poem(pid) { return POEMS[pid]; }
  function title(pid) { return POEMS[pid][0]; }
  function poetName(pid) { return POEMS[pid][1] === LI ? '李白' : '杜甫'; }
  function sideOf(pid) { return POEMS[pid][1] === LI ? 'li' : 'du'; }
  function lineOf(pid, idx) { return POEMS[pid][2][idx]; }
  function push(map, k, v) { var a = map.get(k); if (a) a.push(v); else map.set(k, [v]); }

  /* ───────── 索引 ───────── */
  var byLb = new Map(), byDu = new Map(), byPoem = new Map(), poemBest = new Map();
  PAIRS.forEach(function (p, i) {
    push(byLb, p[1] + ':' + p[2], i);
    push(byDu, p[3] + ':' + p[4], i);
    push(byPoem, p[1], i);
    push(byPoem, p[3], i);
    [p[1], p[3]].forEach(function (pid) {
      var b = poemBest.get(pid);
      if (!b || p[0] > b[0]) poemBest.set(pid, p);
    });
  });
  var ids = Object.keys(POEMS).sort(function (a, b) { return a - b; });

  function matchesFor(pid, idx) {
    var isLi = POEMS[pid][1] === LI;
    var list = (isLi ? byLb : byDu).get(pid + ':' + idx) || [];
    return list.map(function (i) { return PAIRS[i]; })
      .sort(function (a, b) { return b[0] - a[0]; });
  }

  /* ───────── 共字高亮 ───────── */
  function sharedCounts(a, b) {
    var cb = {}, shared = {};
    for (var i = 0; i < b.length; i++) cb[b[i]] = (cb[b[i]] || 0) + 1;
    for (var j = 0; j < a.length; j++) {
      var ch = a[j];
      if (cb[ch]) { cb[ch]--; shared[ch] = (shared[ch] || 0) + 1; }
    }
    return shared;
  }
  function mark(text, shared) {
    var left = {}, out = '';
    for (var k in shared) left[k] = shared[k];
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (left[ch] > 0) { left[ch]--; out += '<mark>' + esc(ch) + '</mark>'; }
      else out += esc(ch);
    }
    return out;
  }

  /* ───────── 总览 ───────── */
  var histMax = Math.max.apply(null, HIST);
  var over75 = HIST.slice(0, 5).reduce(function (a, b) { return a + b; }, 0);
  var over75pct = Math.round(over75 / M.pairs * 1000) / 10;
  var highPairs = PAIRS.filter(function (p) { return p[0] >= 9500; }).length;

  function renderHero() {
    var top = PAIRS[0];
    $('#hero-card').innerHTML =
      '<div class="hc-tag"><span>全库最高相似度</span><span>SAME LINE</span></div>' +
      '<div class="hc-body">' +
        '<p class="hc-line li">' + esc(lineOf(top[1], top[2])) + '</p>' +
        '<p class="hc-src">李白 ·《' + esc(title(top[1])) + '》</p>' +
        '<div class="hc-mid"><span></span><b>' + sim(top[0]) + '</b><span></span></div>' +
        '<p class="hc-line du">' + esc(lineOf(top[3], top[4])) + '</p>' +
        '<p class="hc-src right">杜甫 ·《' + esc(title(top[3])) + '》</p>' +
      '</div>' +
      '<div style="margin-top:18px;text-align:right"><a class="link" href="#/read?poem=' + top[3] + '">整首对读 →</a></div>';

    $('.lede strong').textContent = num(M.pairs);
    var hc = $('#hero-chars');
    if (hc) hc.textContent = (M.lbChars + M.duChars).toLocaleString('en-US') + ' 字';
    var mp = $('#m-pairs'), md = $('#m-dup');
    if (mp) mp.textContent = num(M.pairs);
    if (md) md.textContent = num(M.dupRows);

    var cards = [
      ['li', num(M.lbPoems) + '<small>首</small>', '李白 · ' + num(M.lbLines) + ' 句'],
      ['du', num(M.duPoems) + '<small>首</small>', '杜甫 · ' + num(M.duLines) + ' 句'],
      ['', num(M.pairs) + '<small>对</small>', '相似度 ≥ 0.70'],
      ['', highPairs + '<small>对</small>', '相似度 ≥ 0.95']
    ];
    $('#stats').innerHTML = cards.map(function (c) {
      return '<div class="stat ' + c[0] + '"><b>' + c[1] + '</b><span>' + c[2] + '</span></div>';
    }).join('');
  }

  function renderHist() {
    var wrap = $('#hist'), html = '';
    for (var i = 0; i < HIST.length; i++) {
      var c = HIST[i];
      var h = Math.sqrt(c / histMax) * 100;
      var cls = i >= 25 ? 'hi' : (i >= 15 ? 'mid' : '');
      var lo = (70 + i) / 100;
      var label = lo.toFixed(2) + ' – ' + (lo + 0.01).toFixed(2) + ' · ' + num(c) + ' 对';
      html += '<div class="bar ' + cls + '" style="height:' + Math.max(h, 0.8).toFixed(2) + '%" data-tip="' + label + '"></div>';
    }
    wrap.innerHTML = html;
    var ax = '';
    [0, 5, 10, 15, 20, 25, 30].forEach(function (i) {
      ax += '<span style="left:' + (i / 30 * 100) + '%">' + ((70 + i) / 100).toFixed(2) + '</span>';
    });
    $('#axis').innerHTML = ax;
    $('#hist-hint').innerHTML = '纵轴为平方根刻度（否则低频段全被压平）。<em>' + over75pct +
      '%</em> 的对子挤在 0.70–0.75，真正「几乎同一句」的只有 <em>' + highPairs + '</em> 对。';
  }

  var tipEl = null;
  function bindHistTip() {
    if (tipEl) return;
    tipEl = document.createElement('div');
    tipEl.className = 'tip';
    document.body.appendChild(tipEl);
    var plot = $('#hist');
    plot.addEventListener('mouseover', function (e) {
      var b = e.target.closest('.bar');
      if (!b) return;
      tipEl.textContent = b.dataset.tip;
      tipEl.style.opacity = '1';
    });
    plot.addEventListener('mousemove', function (e) {
      if (tipEl.style.opacity !== '1') return;
      tipEl.style.left = Math.min(Math.max(e.clientX, 80), window.innerWidth - 80) + 'px';
      tipEl.style.top = (e.clientY - 10) + 'px';
    });
    plot.addEventListener('mouseout', function (e) {
      if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest('#hist')) tipEl.style.opacity = '0';
    });
  }

  function renderTop() {
    var html = PAIRS.slice(0, 10).map(function (p) {
      var sh = sharedCounts(lineOf(p[1], p[2]), lineOf(p[3], p[4]));
      return '<li><button class="row" data-pid="' + p[3] + '">' +
        '<span class="tl-line li">' + mark(lineOf(p[1], p[2]), sh) + '</span>' +
        '<span class="tl-sim">' + sim(p[0]) + '</span>' +
        '<span class="tl-line du">' + mark(lineOf(p[3], p[4]), sh) + '</span>' +
        '<span class="tl-go">对读 →</span></button></li>';
    }).join('');
    var list = $('#toplist');
    list.innerHTML = html;
    list.addEventListener('click', function (e) {
      var b = e.target.closest('button.row');
      if (b) location.hash = '#/read?poem=' + b.dataset.pid;
    });
  }

  function renderChars() {
    var C = D.chars;
    function col(list, cls) {
      var max = Math.max.apply(null, list.map(function (r) { return r[cls === 'li' ? 1 : 2]; }));
      return '<div class="col"><div class="col-head ' + cls + '">' +
        (cls === 'li' ? '李白偏用' : '杜甫偏用') + '</div>' +
        list.map(function (r) {
          var rate = cls === 'li' ? r[1] : r[2];
          var other = cls === 'li' ? r[2] : r[1];
          return '<div class="crow ' + cls + '" title="李白 ' + r[3] + ' 字频 ' + r[1] +
            ' / 杜甫 字频 ' + r[2] + '（每万字）">' +
            '<span class="ch">' + esc(r[0]) + '</span>' +
            '<span class="track"><span class="fill" style="width:' + (rate / max * 100).toFixed(1) + '%"></span></span>' +
            '<span class="num">' + rate.toFixed(1) + ' / ' + other.toFixed(1) + '</span></div>';
        }).join('') + '</div>';
    }
    $('#chars').innerHTML = col(C.li, 'li') + col(C.du, 'du');
  }

  function renderMemorial() {
    var box = $('#memorial');
    function row(pid, order) {
      var best = poemBest.get(pid);
      var s = best ? sim(best[0]) : '无';
      var poet = poetName(pid);
      return '<button data-pid="' + pid + '">' +
        '<span class="mt">' + esc(title(pid)) +
          '<span class="who ' + (order === 'li' ? 'li' : 'du') + '">' + poet + '</span>' +
          '<small>' + esc(POEMS[pid][2][0]) + '</small></span>' +
        '<span class="ms">最像 ' + s + '</span></button>';
    }
    box.innerHTML = MEM_DU.map(function (p) { return row(p, 'du'); }).join('') +
      MEM_LI.map(function (p) { return row(p, 'li'); }).join('');
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (b) location.hash = '#/read?poem=' + b.dataset.pid;
    });
  }

  function renderOverview() { renderHero(); renderHist(); bindHistTip(); renderTop(); renderChars(); renderMemorial(); }

  /* ───────── 句对 ───────── */
  var pstate = { q: '', min: 70, sort: 'desc', scope: 'all', shown: 40 };
  var pfiltered = [];
  var randKey = new Map(PAIRS.map(function (p) { return [p, Math.random()]; }));

  function pairText(p) {
    return title(p[1]) + title(p[3]) + lineOf(p[1], p[2]) + lineOf(p[3], p[4]);
  }
  function filterPairs() {
    var q = pstate.q.trim(), floor = pstate.min * 100, out = [];
    var memScope = pstate.scope === 'mem';
    for (var i = 0; i < PAIRS.length; i++) {
      var p = PAIRS[i];
      if (p[0] < floor) continue;
      if (memScope && !(MEM.indexOf(p[1]) >= 0 || MEM.indexOf(p[3]) >= 0)) continue;
      if (q && pairText(p).indexOf(q) < 0) continue;
      out.push(p);
    }
    if (pstate.sort === 'asc') out.reverse();
    else if (pstate.sort === 'rand') out.sort(function (a, b) { return randKey.get(a) - randKey.get(b); });
    return out;
  }
  function renderPairs() {
    pfiltered = filterPairs();
    pstate.shown = 40;
    drawPairs();
  }
  function drawPairs() {
    var list = $('#pair-list');
    var slice = pfiltered.slice(0, pstate.shown);
    if (!slice.length) {
      list.innerHTML = '<div class="empty">没有符合条件的句对。<br>把相似度下限调低，或清空关键词。</div>';
    } else {
      list.innerHTML = slice.map(function (p) {
        var a = lineOf(p[1], p[2]), b = lineOf(p[3], p[4]);
        var sh = sharedCounts(a, b);
        var lvl = p[0] >= 9000 ? 's9' : (p[0] >= 8500 ? 's8' : '');
        return '<article class="pair">' +
          '<div class="side li"><div class="line">' + mark(a, sh) + '</div>' +
            '<div class="src"><button data-pid="' + p[1] + '">李白 ·《' + esc(title(p[1])) + '》第 ' +
            (p[2] + 1) + ' 句</button></div></div>' +
          '<div class="sim ' + lvl + '"><b>' + sim(p[0]) + '</b></div>' +
          '<div class="side du"><div class="line">' + mark(b, sh) + '</div>' +
            '<div class="src"><button data-pid="' + p[3] + '">杜甫 ·《' + esc(title(p[3])) + '》第 ' +
            (p[4] + 1) + ' 句</button></div></div>' +
          '</article>';
      }).join('');
    }
    $('#count').innerHTML = '符合 <b>' + num(pfiltered.length) + '</b> 对，已显示 <b>' +
      num(Math.min(pstate.shown, pfiltered.length)) + '</b> 对';
    $('#more').style.display = pfiltered.length > pstate.shown ? '' : 'none';
    syncHashPairs();
  }
  function syncHashPairs() {
    var q = [];
    if (pstate.q) q.push('q=' + encodeURIComponent(pstate.q));
    if (pstate.min !== 70) q.push('min=' + pstate.min);
    if (pstate.sort !== 'desc') q.push('sort=' + pstate.sort);
    if (pstate.scope !== 'all') q.push('scope=' + pstate.scope);
    var h = '#/pairs' + (q.length ? '?' + q.join('&') : '');
    history.replaceState(null, '', h);
  }
  function applyPairInputs() {
    $('#q').value = pstate.q;
    $('#min').value = pstate.min;
    $('#min-label').textContent = (pstate.min / 100).toFixed(2);
    $('#sort').value = pstate.sort;
    $('#scope').value = pstate.scope;
  }
  function enterPairs(qs) {
    var q = new URLSearchParams(qs || '');
    pstate.q = q.get('q') || '';
    pstate.min = Math.min(100, Math.max(70, parseInt(q.get('min') || '70', 10) || 70));
    pstate.sort = q.get('sort') || 'desc';
    pstate.scope = q.get('scope') || 'all';
    $('#pairs-note').innerHTML = '共 <b>' + num(M.pairs) + '</b> 对，全部 ≥ 0.70（原始 ' +
      num(M.pairsRaw) + ' 行，其中 ' + num(M.dupRows) +
      ' 行因《全唐诗》重复收录而句面完全相同，已合并）。分数越高越像同一句话；0.70 附近多半只是共用几个常用字，读的时候当作线索，不要当作结论。';
    applyPairInputs();
    renderPairs();
  }
  function bindPairs() {
    var t;
    $('#q').addEventListener('input', function (e) {
      clearTimeout(t);
      var v = e.target.value;
      t = setTimeout(function () { pstate.q = v; renderPairs(); }, 130);
    });
    $('#min').addEventListener('input', function (e) {
      pstate.min = +e.target.value;
      $('#min-label').textContent = (pstate.min / 100).toFixed(2);
      renderPairs();
    });
    $('#sort').addEventListener('change', function (e) {
      pstate.sort = e.target.value;
      renderPairs();
    });
    $('#scope').addEventListener('change', function (e) { pstate.scope = e.target.value; renderPairs(); });
    $('#more').addEventListener('click', function () { pstate.shown += 40; drawPairs(); });
    $('#reset').addEventListener('click', function () {
      pstate.q = ''; pstate.min = 70; pstate.sort = 'desc'; pstate.scope = 'all';
      applyPairInputs(); renderPairs();
    });
    $('#pair-list').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-pid]');
      if (b) location.hash = '#/read?poem=' + b.dataset.pid;
    });
  }
  /* ───────── 精读 ───────── */
  var PUNCT = '，。、；：？！“”‘’（）《》〈〉·—…　 ,.;:?!';
  function isP(ch) { return PUNCT.indexOf(ch) >= 0; }
  function stripPunct(s) {
    var o = '';
    for (var i = 0; i < s.length; i++) if (!isP(s[i])) o += s[i];
    return o;
  }
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  /* 编辑距离对齐；相同=0，替换/增/删=1，回溯时优先替换，得到能直接显示的对照 */
  function align(a, b) {
    var n = a.length, m = b.length, i, j, dp = [];
    for (i = 0; i <= n; i++) { dp[i] = new Array(m + 1); dp[i][0] = i; }
    for (j = 0; j <= m; j++) dp[0][j] = j;
    for (i = 1; i <= n; i++) {
      for (j = 1; j <= m; j++) {
        var c = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + c);
      }
    }
    var ops = [], x = n, y = m;
    while (x > 0 && y > 0) {
      var cost = a.charAt(x - 1) === b.charAt(y - 1) ? 0 : 1;
      if (dp[x][y] === dp[x - 1][y - 1] + cost) { ops.push([a.charAt(x - 1), b.charAt(y - 1)]); x--; y--; }
      else if (dp[x][y] === dp[x - 1][y] + 1) { ops.push([a.charAt(x - 1), null]); x--; }
      else { ops.push([null, b.charAt(y - 1)]); y--; }
    }
    while (x > 0) ops.push([a.charAt(--x), null]);
    while (y > 0) ops.push([null, b.charAt(--y)]);
    return { ops: ops.reverse(), dist: dp[n][m] };
  }

  var CAT_NAME = { same: '同一句', one: '差一字', two: '差两字', other: '差三字以上' };
  var STRONG = PAIRS.filter(function (p) { return p[0] >= 8500; }).map(function (p) {
    var a = lineOf(p[1], p[2]), b = lineOf(p[3], p[4]);
    var al = align(stripPunct(a), stripPunct(b));
    var cat = a === b ? 'same' : (al.dist === 1 ? 'one' : (al.dist === 2 ? 'two' : 'other'));
    return { pair: p, a: a, b: b, ops: al.ops, dist: al.dist, cat: cat };
  });

  var cstate = { cat: 'all', shown: 20 };

  function renderMarked(text, ops, side) {
    var k = 0, out = '';
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (isP(ch)) { out += esc(ch); continue; }
      var op = ops[k++] || [ch, ch];
      out += (op[0] !== op[1]) ? '<em>' + esc(ch) + '</em>' : esc(ch);
    }
    return out;
  }
  function diffCaption(item) {
    var parts = [];
    item.ops.forEach(function (op) {
      if (op[0] === op[1]) return;
      if (op[0] && op[1]) parts.push('「' + op[0] + '」→「' + op[1] + '」');
      else if (op[0]) parts.push('多「' + op[0] + '」');
      else parts.push('少「' + op[1] + '」');
    });
    var words = stripPunct(item.a).length;
    var head = '共 ' + words + ' 字 · 异 ' + item.dist + ' 字';
    if (!parts.length) return head + ' · 完全相同';
    var shown = parts.slice(0, 3).join('、');
    if (parts.length > 3) shown += ' 等 ' + parts.length + ' 处';
    return head + ' · ' + shown;
  }

  function closeFiltered() {
    if (cstate.cat === 'all') return STRONG;
    return STRONG.filter(function (x) { return x.cat === cstate.cat; });
  }

  function renderClose(qs) {
    var counts = { all: STRONG.length, same: 0, one: 0, two: 0, other: 0 };
    STRONG.forEach(function (x) { counts[x.cat]++; });
    $('#c-count').textContent = STRONG.length;
    Array.prototype.forEach.call($('#c-filters').querySelectorAll('button'), function (b) {
      var k = b.dataset.cat;
      b.innerHTML = (k === 'all' ? '全部' : CAT_NAME[k]) + '<span>' + counts[k] + '</span>';
      b.setAttribute('aria-pressed', k === cstate.cat ? 'true' : 'false');
    });
    var lbPoems = {}, duPoems = {}, sum = 0;
    STRONG.forEach(function (x) { lbPoems[x.pair[1]] = 1; duPoems[x.pair[3]] = 1; sum += x.dist; });
    var avg = (sum / STRONG.length).toFixed(1);
    $('#cstats').innerHTML =
      '<div><b>' + STRONG.length + '</b><span>对 · 相似度 ≥ 0.85</span></div>' +
      '<div><b>' + Object.keys(lbPoems).length + ' / ' + Object.keys(duPoems).length + '</b><span>涉及 李白 / 杜甫 诗数</span></div>' +
      '<div><b>' + avg + '<small>字</small></b><span>平均差异</span></div>' +
      '<div><b>' + counts.one + '</b><span>对仅差一字</span></div>';
    cstate.shown = 20;
    drawClose();
    if (new URLSearchParams(qs || '').get('stage') === '1') openStage(0);
  }

  function drawClose() {
    var list = closeFiltered();
    var slice = list.slice(0, cstate.shown);
    $('#close-list').innerHTML = slice.map(function (item, i) {
      return '<article class="cc">' +
        '<div class="cc-top"><span class="cc-no">' + pad2(i + 1) + '</span>' +
          '<span class="cc-cat ' + item.cat + '">' + CAT_NAME[item.cat] + '</span>' +
          '<span class="cc-sim">' + sim(item.pair[0]) + '</span></div>' +
        '<div class="cc-pair">' +
          '<div class="cc-side li"><p class="cc-line">' + renderMarked(item.a, item.ops, 0) + '</p>' +
            '<p class="cc-src"><button data-pid="' + item.pair[1] + '">李白 ·《' +
            esc(title(item.pair[1])) + '》</button></p></div>' +
          '<div class="cc-side du"><p class="cc-line">' + renderMarked(item.b, item.ops, 1) + '</p>' +
            '<p class="cc-src"><button data-pid="' + item.pair[3] + '">杜甫 ·《' +
            esc(title(item.pair[3])) + '》</button></p></div>' +
        '</div>' +
        '<div class="cc-diff">' + diffCaption(item) + '</div>' +
      '</article>';
    }).join('');
    $('#c-more').style.display = list.length > cstate.shown ? '' : 'none';
  }

  /* 演示模式 */
  var stg = { list: [], i: 0 };

  function drawStage() {
    var it = stg.list[stg.i];
    if (!it) return;
    $('#stage-idx').textContent = pad2(stg.i + 1) + ' / ' + stg.list.length;
    $('#stage-cat').textContent = CAT_NAME[it.cat];
    $('#stage-sim').textContent = sim(it.pair[0]);
    $('#stage-a').innerHTML = renderMarked(it.a, it.ops, 0);
    $('#stage-b').innerHTML = renderMarked(it.b, it.ops, 1);
    $('#stage-asrc').textContent = '李白 ·《' + title(it.pair[1]) + '》';
    $('#stage-bsrc').textContent = '杜甫 ·《' + title(it.pair[3]) + '》';
    $('#stage-diff').textContent = diffCaption(it);
  }
  function openStage(i) {
    stg.list = closeFiltered();
    if (!stg.list.length) return;
    stg.i = Math.max(0, Math.min(stg.list.length - 1, i || 0));
    $('#stage').hidden = false;
    $('#stage').setAttribute('aria-hidden', 'false');
    document.body.classList.add('stage-open');
    drawStage();
  }
  function closeStage() {
    $('#stage').hidden = true;
    $('#stage').setAttribute('aria-hidden', 'true');
    document.body.classList.remove('stage-open');
  }
  function stepStage(d) {
    if ($('#stage').hidden) return;
    stg.i = (stg.i + d + stg.list.length) % stg.list.length;
    drawStage();
  }

  function bindClose() {
    $('#c-filters').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-cat]');
      if (!b) return;
      cstate.cat = b.dataset.cat;
      Array.prototype.forEach.call(this.querySelectorAll('button'), function (x) {
        x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
      });
      cstate.shown = 20;
      drawClose();
    });
    $('#c-more').addEventListener('click', function () { cstate.shown += 20; drawClose(); });
    $('#close-list').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-pid]');
      if (b) location.hash = '#/read?poem=' + b.dataset.pid;
    });
    $('#c-stage').addEventListener('click', function () { openStage(0); });
    $('#stage-prev').addEventListener('click', function () { stepStage(-1); });
    $('#stage-next').addEventListener('click', function () { stepStage(1); });
    document.addEventListener('keydown', function (e) {
      if ($('#stage').hidden) return;
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); stepStage(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); stepStage(-1); }
      else if (e.key === 'Escape') closeStage();
    });
  }

  /* ───────── 对读 ───────── */
  var rstate = { pid: null, search: '', poet: 'all' };

  function renderPoemList() {
    var list = $('#poem-list'), q = rstate.search.trim(), out = [];
    for (var i = 0; i < ids.length; i++) {
      var pid = ids[i], po = POEMS[pid];
      if (rstate.poet === 'li' && po[1] !== LI) continue;
      if (rstate.poet === 'du' && po[1] !== DU) continue;
      if (rstate.poet === 'mem' && MEM.indexOf(+pid) < 0) continue;
      if (q && po[0].indexOf(q) < 0) continue;
      out.push(pid);
      if (out.length >= 400) break;
    }
    if (!out.length) { list.innerHTML = '<li style="padding:16px 4px;color:var(--ink-3);font-size:13px">没有匹配的诗题</li>'; return; }
    list.innerHTML = out.map(function (pid) {
      return '<li><button data-pid="' + pid + '" aria-current="' + ('' + rstate.pid === pid) + '">' +
        '<span class="pidot ' + sideOf(pid) + '"></span><span class="pt">' + esc(title(pid)) + '</span></button></li>';
    }).join('');
  }

  function renderPoem(pid) {
    if (!POEMS[pid]) pid = '28383';
    rstate.pid = pid;
    var po = POEMS[pid], lines = po[2], side = po[1] === LI ? 'li' : 'du';
    var opp = po[1] === LI ? '杜' : '李';
    var rows = '', hitLines = 0, maxS = 0;
    lines.forEach(function (text, idx) {
      var ms = matchesFor(pid, idx);
      if (ms.length) { hitLines++; maxS = Math.max(maxS, ms[0][0]); }
      var mhtml = ms.slice(0, 3).map(function (p) {
        var isLi = po[1] === LI;
        var opid = isLi ? p[3] : p[1], oidx = isLi ? p[4] : p[2];
        return '<button class="mrow ' + (isLi ? 'du' : 'li') + '" data-pid="' + opid + '">' +
          '<span class="ms">' + sim(p[0]) + '</span>' +
          '<span class="mtx"><span class="ml">' + esc(lineOf(opid, oidx)) + '</span>' +
            '<em>' + esc(title(opid)) + '</em></span>' +
          '</button>';
      }).join('');
      if (ms.length > 3) mhtml += '<div class="mrow zero">另有 ' + (ms.length - 3) + ' 句更弱的相似句</div>';
      if (!ms.length) mhtml = '<div class="mrow zero">对方诗中没有 ≥ 0.70 的相似句</div>';
      rows += '<div class="pline is' + side + '">' +
        '<div class="own"><span class="no">' + (idx + 1) + '</span>' +
        '<span class="txt">' + esc(text) + '</span></div>' +
        '<div class="matchess">' + mhtml + '</div></div>';
    });

    $('#poem-panel').innerHTML =
      '<div class="poem-head">' +
        '<div class="who ' + side + '">' + poetName(pid) + ' · 全唐诗 ' + pid + '</div>' +
        '<h2>' + esc(title(pid)) + '</h2>' +
        '<div class="pmeta">' + lines.length + ' 句 · 其中 ' + hitLines + ' 句在' + opp +
          '白诗里找到相似句 · 最高 ' + (maxS ? sim(maxS) : '—') + '</div>' +
        '<div class="acts"><a class="btn ghost" href="#/pairs?q=' + encodeURIComponent(title(pid)) +
          '&scope=all">看这首诗的句对</a>' +
          '<button class="btn ghost" id="rand-poem">随便换一首</button></div>' +
      '</div>' + rows;

    $('#rand-poem').addEventListener('click', function () { location.hash = '#/read?poem=' + randPoem(); });
    renderPoemList();
  }

  function randPoem() {
    var pool = MEM.length && Math.random() < 0.3 ? MEM : ids;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function enterRead(qs) {
    var q = new URLSearchParams(qs || '');
    var pid = q.get('poem');
    if (!pid || !POEMS[pid]) {
      // 默认：最高的那一对的杜甫诗；否则《春日忆李白》
      pid = POEMS['28383'] ? '28383' : (poemBest.get(PAIRS[0][3]) ? PAIRS[0][3] : ids[0]);
    }
    renderPoem(pid);
  }
  function bindRead() {
    var t;
    $('#poem-search').addEventListener('input', function (e) {
      clearTimeout(t);
      var v = e.target.value;
      t = setTimeout(function () { rstate.search = v; renderPoemList(); }, 120);
    });
    $('#poem-chips').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-poet]');
      if (!b) return;
      rstate.poet = b.dataset.poet;
      Array.prototype.forEach.call(this.querySelectorAll('button'), function (x) {
        x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
      });
      renderPoemList();
    });
    $('#poem-list').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-pid]');
      if (b) {
        history.replaceState(null, '', '#/read?poem=' + b.dataset.pid);
        renderPoem(b.dataset.pid);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
    $('#poem-panel').addEventListener('click', function (e) {
      var b = e.target.closest('button.mrow[data-pid]');
      if (b) {
        history.replaceState(null, '', '#/read?poem=' + b.dataset.pid);
        renderPoem(b.dataset.pid);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  /* ───────── 猜一猜 ───────── */
  var g = { streak: 0, right: 0, total: 0, cur: null, answered: false, t0: 0, timer: null };

  function pickLine() {
    for (var guard = 0; guard < 60; guard++) {
      var pid = ids[Math.floor(Math.random() * ids.length)];
      var lines = POEMS[pid][2];
      var idx = Math.floor(Math.random() * lines.length);
      var text = lines[idx];
      if (text.length < 5) continue;
      if (g.cur && g.cur.pid === pid) continue;
      return { pid: pid, idx: idx, poet: POEMS[pid][1] };
    }
    return { pid: ids[0], idx: 0, poet: POEMS[ids[0]][1] };
  }

  function startRound() {
    g.cur = pickLine(); g.answered = false;
    $('#g-card').innerHTML = '<p class="gline">' + esc(lineOf(g.cur.pid, g.cur.idx)) + '</p>' +
      '<p class="gsub">这两句里，这一句是谁写的？</p>';
    $('#g-actions').innerHTML =
      '<button class="btn ghost lih" data-guess="0">李白</button>' +
      '<button class="btn ghost duh" data-guess="1">杜甫</button>';
    $('#g-note').textContent = '按 1 / 2 也能作答。';
    g.t0 = Date.now();
    clearInterval(g.timer);
    g.timer = setInterval(function () {
      $('#g-timer').textContent = Math.floor((Date.now() - g.t0) / 1000) + 's';
    }, 500);
  }

  function answer(guess) {
    if (!g.cur || g.answered) return;
    g.answered = true;
    clearInterval(g.timer);
    var ok = guess === g.cur.poet;
    g.total++; if (ok) { g.right++; g.streak++; } else g.streak = 0;
    $('#g-streak').textContent = g.streak;
    $('#g-score').textContent = g.right + ' / ' + g.total;

    var pid = g.cur.pid, ms = matchesFor(pid, g.cur.idx);
    var best = ms.length ? ms[0] : null;
    var poemTitle = title(pid);
    var extra = '';
    if (best) {
      var isLi = POEMS[pid][1] === LI;
      var opid = isLi ? best[3] : best[1], oidx = isLi ? best[4] : best[2];
      extra = '<div class="rv"><span class="k">最像</span><span class="v">' +
        sim(best[0]) + ' · ' + esc(poetName(opid)) + '《' + esc(title(opid)) + '》' +
        esc(lineOf(opid, oidx)) + '</span></div>';
    }
    $('#g-card').innerHTML =
      '<p class="gline">' + esc(lineOf(pid, g.cur.idx)) + '</p>' +
      '<div class="reveal">' +
        '<p class="verdict ' + (ok ? 'ok' : 'no') + '">' + (ok ? '✓ 猜对了' : '✗ 是' + poetName(pid)) + '</p>' +
        '<div class="rv"><span class="k">出处</span><span class="v">' + poetName(pid) + '《' +
          esc(poemTitle) + '》第 ' + (g.cur.idx + 1) + ' 句</span></div>' +
        extra +
      '</div>';
    $('#g-actions').innerHTML = '<button class="btn primary" id="g-next">下一句 →</button>';
    $('#g-next').addEventListener('click', startRound);
    $('#g-note').textContent = g.total >= 5
      ? '正确率 ' + Math.round(g.right / g.total * 100) + '%（一直猜李白的基准约 ' +
        Math.round(M.lbPoems / (M.lbPoems + M.duPoems) * 100) + '%）'
      : '';
  }

  function enterGame() { if (!g.cur) startRound(); }
  function bindGame() {
    $('#g-actions').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-guess]');
      if (b) answer(+b.dataset.guess);
    });
    document.addEventListener('keydown', function (e) {
      if ($('#view-game').hidden) return;
      if (e.key === '1') answer(0);
      else if (e.key === '2') answer(1);
      else if ((e.key === 'Enter' || e.key === ' ') && g.answered) { e.preventDefault(); startRound(); }
    });
  }

  /* ───────── 路由 ───────── */
  var views = {
    overview: $('#view-overview'),
    pairs: $('#view-pairs'),
    close: $('#view-close'),
    read: $('#view-read'),
    game: $('#view-game')
  };
  var lastPath = null;

  function route() {
    var hash = location.hash || '#/overview';
    var body = hash.replace(/^#\/?/, '');
    var parts = body.split('?');
    var name = views[parts[0]] ? parts[0] : 'overview';
    var qs = parts[1] || '';

    Object.keys(views).forEach(function (k) { views[k].hidden = k !== name; });
    Array.prototype.forEach.call($('#nav').children, function (a) {
      if (a.dataset.nav === name) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    if (name === 'overview') renderOverview();
    else if (name === 'pairs') enterPairs(qs);
    else if (name === 'close') renderClose(qs);
    else if (name === 'read') enterRead(qs);
    else if (name === 'game') enterGame();

    if (name !== 'close') closeStage();

    if (lastPath !== name) {
      window.scrollTo(0, 0);
      document.title = ({
        overview: '李杜同聲 · 李白与杜甫诗句相似度',
        pairs: '句对 · 李杜同聲',
        close: '精读 · 李杜同聲',
        read: '对读 · 李杜同聲',
        game: '猜一猜 · 李杜同聲'
      })[name];
    }
    lastPath = name;
  }

  /* ───────── 启动 ───────── */
  bindPairs(); bindRead(); bindGame(); bindClose();
  $('#topmeta').textContent = num(M.poems) + ' 首 · ' + num(M.pairs) + ' 对';
  $('#foot-meta').textContent = 'LI BAI × DU FU · ' + num(M.pairs) + ' PAIRS';
  window.addEventListener('hashchange', route);
  route();
})();
