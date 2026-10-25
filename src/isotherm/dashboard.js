const $ = (id) => document.getElementById(id);
const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const fmt = { nats: (v) => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(4), usd: (v) => (v >= 0 ? "+$" : "−$") + Math.abs(Math.round(v)).toLocaleString("en-US") };
const LBL = D.labels;
let READ = "d1_16", CELL = "d1_16 · taker";

function theme() {
  return { ink: css("--ink"), muted: css("--muted"), rule: css("--rule"), model: css("--model"), base: css("--base"),
           neg: css("--neg"), pos: css("--pos"), mid: css("--mid"), c2: css("--c2"), c3: css("--c3"), c4: css("--c4"),
           c5: css("--c5"), c6: css("--c6"), surface: css("--surface") };
}
function layout(t, extra) {
  return Object.assign({
    paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)", margin: { l: 56, r: 14, t: 8, b: 40 },
    font: { family: css("--sans"), size: 11.5, color: t.muted }, showlegend: false,
    hoverlabel: { bgcolor: t.surface, bordercolor: t.rule, font: { color: t.ink, family: css("--mono"), size: 11.5 } },
    xaxis: { gridcolor: t.rule, zerolinecolor: t.ink, linecolor: t.rule, tickfont: { color: t.muted } },
    yaxis: { gridcolor: t.rule, zerolinecolor: t.ink, linecolor: t.rule, tickfont: { color: t.muted } },
    legend: { orientation: "h", x: 0, y: 1.12, font: { color: t.ink, size: 11 } },
  }, extra || {});
}
const CFG = { displayModeBar: false, responsive: true };
function plot(id, traces, lay) { Plotly.react($(id), traces, lay, CFG); }

/* ---------- header ---------- */
function header() {
  const s = D.sealed, sh = D.shadow;
  const pills = [
    ["good", "isotherm beats the market at every read"],
    ["warn", "Highs sealed test: pass, shrinking monthly"],
    ["bad", "Lows sealed test: flat"],
    ["bad", "MLB: no edge"],
    ["warn", "G3 pretraining: fails the gate"],
    ["warn", "Transformer: still learning, fails its gate"], ["good", "Weather model: passes both gates"], ["warn", "Forward tests: 8 arms, scored Apr 2027"], ["good", "Rain: beats the market the day before"], ["bad", "Gas: the crowd already knows"], ["warn", "Commodities a day out: better score, no profit"], ["warn", "19 cities: retest Jan to Apr 2027"],
    [sh.decay && sh.decay.status === "STOP" ? "bad" : (sh.decay && sh.decay.status === "OK" ? "good" : "warn"),
     "Live: " + (sh.decay ? sh.decay.status.replace("_", " ").toLowerCase() : "collecting, " + (sh.settled_ladders || 0) + " settled")],
  ];
  $("pills").innerHTML = pills.map(([k, t]) => `<span class="pill ${k}"><i></i>${t}</span>`).join("");
  const best = D.reads.map((r) => [r, D.recent[r].isotherm]).sort((a, b) => b[1].gain - a[1].gain)[0];
  const k = [
    ["Model vs market, last 12 months", fmt.nats(best[1].gain), `nats per ladder at ${LBL[best[0]]} · CI ${fmt.nats(best[1].ci[0])} to ${fmt.nats(best[1].ci[1])}`],
    ["Highs sealed test", fmt.usd(s.highs.lb.pnl), `Newey-West t ${s.highs.lb.nw_t} · ${s.highs.lb.trades} trades · 95 days`],
    ["Best backtest (highs, 4pm d-1)", `${D.cells["d1_16 · taker"].sharpe} Sharpe`, `DSR ${D.cells["d1_16 · taker"].dsr} · PBO ${D.cells["d1_16 · taker"].pbo} · bars 0.95 / 0.20`],
    ["Lows sealed test", fmt.usd(s.lows.lb.pnl), `backtest ${fmt.usd(s.lows.bt.pnl)} in 7 months · t ${s.lows.lb.nw_t}`],
  ];
  $("kpis").innerHTML = k.map(([a, b, c]) => `<div class="kpi"><div class="k">${a}</div><div class="v">${b}</div><div class="s">${c}</div></div>`).join("");
}

/* ---------- probabilities ---------- */
function readSeg() {
  $("seg-read").innerHTML = D.reads.map((r) => `<button type="button" data-r="${r}" aria-pressed="${r === READ}">${LBL[r]}</button>`).join("");
  $("seg-read").querySelectorAll("button").forEach((b) => b.onclick = () => { READ = b.dataset.r; readSeg(); prob(); });
}
function prob() {
  const t = theme();
  const dec = D.decay[READ], xs = Object.keys(dec.isotherm);
  const tr = [{ x: xs, y: xs.map((x) => dec.isotherm[x]), name: "isotherm", mode: "lines+markers", line: { color: t.model, width: 2.5 }, marker: { size: 7 }, hovertemplate: "%{x}<br>isotherm %{y:+.4f} nats<extra></extra>" }];
  if (Object.keys(dec.pool).length) tr.push({ x: xs, y: xs.map((x) => dec.pool[x] ?? null), name: "best simple pool", mode: "lines+markers", line: { color: t.base, width: 2, dash: "dash" }, marker: { size: 5 }, hovertemplate: "%{x}<br>pool %{y:+.4f} nats<extra></extra>" });
  plot("c-decay", tr, layout(t, { showlegend: true, yaxis: Object.assign(layout(t).yaxis, { title: { text: "nats", font: { size: 11 } }, zeroline: true }) }));

  const keep = ["isotherm", "pool · market+GFS+obs · 365d", "pool · all", "pool · market+GFS", "pool · market+NBM", "market (tempered)", "isotherm · market-sampled labels (control)"];
  const rows = D.leaderboard[READ].filter((r) => keep.includes(r.model)).sort((a, b) => keep.indexOf(a.model) - keep.indexOf(b.model));
  const nm = (m) => m.replace("isotherm · market-sampled labels (control)", "control (market labels)");
  plot("c-board", [{
    x: rows.map((r) => r.gain), y: rows.map((r) => nm(r.model)), mode: "markers", type: "scatter",
    error_x: { type: "data", symmetric: false, array: rows.map((r) => r.ci[1] - r.gain), arrayminus: rows.map((r) => r.gain - r.ci[0]), color: t.muted, thickness: 1.2, width: 3 },
    marker: { size: 9, color: rows.map((r) => r.model === "isotherm" ? t.model : (r.model.includes("control") ? t.ink : t.base)) },
    customdata: rows.map((r) => [r.ci[0], r.ci[1], r.ece]),
    hovertemplate: "%{y}<br>Δ %{x:+.4f} [%{customdata[0]:+.4f}, %{customdata[1]:+.4f}]<br>ECE %{customdata[2]:.4f}<extra></extra>",
  }], layout(t, { margin: { l: 190, r: 14, t: 8, b: 40 }, yaxis: Object.assign(layout(t).yaxis, { autorange: "reversed" }), xaxis: Object.assign(layout(t).xaxis, { title: { text: "Δ log score vs market (nats)", font: { size: 11 } }, zeroline: true }) }));

  const rel = D.reliability[READ];
  plot("c-calib", [
    { x: [0, 1], y: [0, 1], mode: "lines", line: { color: t.rule, width: 1.5 }, hoverinfo: "skip", showlegend: false },
    { x: rel.market.mean_prob, y: rel.market.freq, name: "market", mode: "lines+markers", line: { color: t.base, width: 2 }, customdata: rel.market.n, hovertemplate: "market<br>predicted %{x:.2f} · observed %{y:.2f}<br>n %{customdata}<extra></extra>" },
    { x: rel.isotherm.mean_prob, y: rel.isotherm.freq, name: "isotherm", mode: "lines+markers", line: { color: t.model, width: 2.5 }, customdata: rel.isotherm.n, hovertemplate: "isotherm<br>predicted %{x:.2f} · observed %{y:.2f}<br>n %{customdata}<extra></extra>" },
  ], layout(t, { showlegend: true, xaxis: Object.assign(layout(t).xaxis, { title: { text: "predicted probability", font: { size: 11 } }, range: [0, 1] }), yaxis: Object.assign(layout(t).yaxis, { title: { text: "observed frequency", font: { size: 11 } }, range: [0, 1] }) }));

  const reads = D.reads, lab = reads.map((r) => LBL[r]);
  const bar = (key, name, color) => ({ x: lab, y: reads.map((r) => D.recent[r][key].gain), name, type: "bar", marker: { color },
    error_y: { type: "data", symmetric: false, array: reads.map((r) => D.recent[r][key].ci[1] - D.recent[r][key].gain), arrayminus: reads.map((r) => D.recent[r][key].gain - D.recent[r][key].ci[0]), color: t.ink, thickness: 1.2, width: 4 },
    customdata: reads.map((r) => D.recent[r][key].ci), hovertemplate: name + "<br>%{x}: %{y:+.4f} [%{customdata[0]:+.4f}, %{customdata[1]:+.4f}]<extra></extra>" });
  plot("c-split", [bar("pool · market+NBM", "market + NBM", t.base), bar("pool · market+GFS", "market + GFS MOS", t.model)], layout(t, { showlegend: true, barmode: "group", bargap: 0.35, yaxis: Object.assign(layout(t).yaxis, { title: { text: "Δ log score, nats", font: { size: 11 } }, zeroline: true }) }));

  const cities = Object.keys(D.cities[reads[0]]).sort();
  const z = cities.map((c) => reads.map((r) => D.cities[r][c].gain));
  const lim = Math.max(...z.flat().map(Math.abs));
  const sig = cities.map((c) => reads.map((r) => D.cities[r][c].ci[0] > 0 || D.cities[r][c].ci[1] < 0));
  const text = z.map((row, i) => row.map((v, j) => fmt.nats(v).slice(0, 6) + (sig[i][j] ? " ●" : "")));
  plot("c-city", [{ z, x: lab, y: cities, type: "heatmap", zmin: -lim, zmax: lim, colorscale: [[0, t.neg], [0.5, t.mid], [1, t.pos]], showscale: false, text, texttemplate: "%{text}", textfont: { family: css("--mono"), size: 11, color: t.ink },
    customdata: cities.map((c) => reads.map((r) => D.cities[r][c].ci)), hovertemplate: "%{y} · %{x}<br>Δ %{z:+.4f} [%{customdata[0]:+.4f}, %{customdata[1]:+.4f}]<extra></extra>", xgap: 2, ygap: 2 }],
    layout(t, { margin: { l: 52, r: 10, t: 8, b: 34 }, xaxis: { side: "bottom", tickfont: { color: t.muted } }, yaxis: { tickfont: { color: t.muted }, autorange: "reversed" } }));
}

/* ---------- trading ---------- */
function cellLabel(k) { const [r, e] = k.split(" · "); return LBL[r] + " · " + e; }
function trade() {
  const t = theme(), c = D.cells[CELL];
  const eq = c.equity || [];
  plot("c-equity", [{ x: eq.map((p) => p[0]), y: eq.map((p) => p[1]), mode: "lines", line: { color: c.pnl >= 0 ? t.model : t.neg, width: 2 }, fill: "tozeroy", fillcolor: (c.pnl >= 0 ? t.model : t.neg) + "1f", hovertemplate: "%{x}<br>%{y:$,.0f}<extra></extra>" }],
    layout(t, { yaxis: Object.assign(layout(t).yaxis, { tickprefix: "$", tickformat: ",.0f", zeroline: true }) }));
  const rows = [["PnL, out of sample", fmt.usd(c.pnl)], ["Sharpe (95% CI)", `${c.sharpe} [${c.sharpe_ci[0]}, ${c.sharpe_ci[1]}]`], ["Newey-West t", c.nw_t], ["Deflated Sharpe", c.dsr], ["PBO (CSCV)", c.pbo], ["Max drawdown", "$" + c.max_dd.toLocaleString("en-US")], ["Trades", c.trades.toLocaleString("en-US")], ["Hit rate", (100 * c.hit).toFixed(1) + "%"], ["Noise, same turnover", fmt.usd(c.noise)]];
  if (c.touch !== null && c.touch !== undefined) rows.push(["At-touch fills (upper bound)", fmt.usd(c.touch)]);
  $("t-cell").innerHTML = rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join("");

  const groups = { "highs G1": t.base, "highs G2": t.model, "daily lows": t.c2, "MLB": t.c3 };
  const over = Object.entries(groups).map(([g, col]) => {
    const pts = D.overfitting.filter((p) => p.group === g);
    return { x: pts.map((p) => p.pbo), y: pts.map((p) => p.dsr), name: g, mode: "markers", marker: { size: 10, color: col, line: { color: t.surface, width: 1.5 } }, customdata: pts.map((p) => [p.cell, p.pnl]), hovertemplate: g + " · %{customdata[0]}<br>DSR %{y:.3f} · PBO %{x:.2f}<br>PnL %{customdata[1]:$,.0f}<extra></extra>" };
  });
  plot("c-over", over, layout(t, { showlegend: true, shapes: [
    { type: "rect", x0: 0, x1: 0.2, y0: 0.95, y1: 1.05, fillcolor: t.model, opacity: 0.12, line: { width: 0 } },
    { type: "line", x0: 0.2, x1: 0.2, y0: -0.05, y1: 1.05, line: { color: t.muted, width: 1, dash: "dot" } },
    { type: "line", x0: -0.02, x1: 0.7, y0: 0.95, y1: 0.95, line: { color: t.muted, width: 1, dash: "dot" } }],
    annotations: [{ x: 0.01, y: 1.03, text: "believable", showarrow: false, xanchor: "left", font: { color: t.model, size: 11 } }],
    xaxis: Object.assign(layout(t).xaxis, { title: { text: "PBO (lower is better)", font: { size: 11 } }, range: [-0.02, 0.7] }), yaxis: Object.assign(layout(t).yaxis, { title: { text: "deflated Sharpe", font: { size: 11 } }, range: [-0.05, 1.07] }) }));

  const ks = Object.keys(D.cells).filter((k) => D.cells[k].attribution && Object.keys(D.cells[k].attribution).length);
  const at = (key, name, col) => ({ y: ks.map(cellLabel), x: ks.map((k) => D.cells[k].attribution[key]), name, type: "bar", orientation: "h", marker: { color: col }, hovertemplate: name + "<br>%{y}: %{x:$,.0f}<extra></extra>" });
  plot("c-attr", [at("alpha_vs_mid", "alpha vs mid", t.model), at("spread_paid", "spread (paid or earned)", t.neg), at("fees", "fees", t.c2),
    { y: ks.map(cellLabel), x: ks.map((k) => D.cells[k].pnl), name: "net PnL", mode: "markers", marker: { symbol: "diamond", size: 10, color: t.ink }, hovertemplate: "net<br>%{y}: %{x:$,.0f}<extra></extra>" }],
    layout(t, { showlegend: true, barmode: "group", margin: { l: 110, r: 14, t: 30, b: 40 }, yaxis: Object.assign(layout(t).yaxis, { autorange: "reversed" }), xaxis: Object.assign(layout(t).xaxis, { tickprefix: "$", tickformat: ",.0f", zeroline: true }) }));

  const rb = c.robustness || [];
  plot("c-robust", [{ y: rb.map((r) => r.s), x: rb.map((r) => r.pnl), type: "bar", orientation: "h", marker: { color: rb.map((r) => r.pnl >= 0 ? t.model : t.neg) }, text: rb.map((r) => fmt.usd(r.pnl)), textposition: "outside", textfont: { family: css("--mono"), color: t.ink, size: 11 }, cliponaxis: false, hovertemplate: "%{y}: %{x:$,.0f}<extra></extra>" }],
    layout(t, { margin: { l: 190, r: 70, t: 8, b: 30 }, yaxis: Object.assign(layout(t).yaxis, { autorange: "reversed" }), xaxis: Object.assign(layout(t).xaxis, { tickprefix: "$", tickformat: ",.0f", zeroline: true }), annotations: [{ x: 1, y: 1.08, xref: "paper", yref: "paper", xanchor: "right", showarrow: false, text: "config: " + (c.robust_cfg || ""), font: { color: t.muted, size: 11, family: css("--mono") } }] }));
}

/* ---------- sealed tests ---------- */
function sealedPair(which, id, tid, vid) {
  const t = theme(), s = D.sealed[which], bt = s.bt.equity, lb = s.lb.equity, base = bt[bt.length - 1][1];
  plot(id, [
    { x: bt.map((p) => p[0]), y: bt.map((p) => p[1]), name: "backtest", mode: "lines", line: { color: t.model, width: 1.8 }, hovertemplate: "%{x}<br>backtest %{y:$,.0f}<extra></extra>" },
    { x: lb.map((p) => p[0]), y: lb.map((p) => p[1] + base), name: "sealed test", mode: "lines", line: { color: t.ink, width: 3 }, hovertemplate: "%{x}<br>sealed %{y:$,.0f}<extra></extra>" },
  ], layout(t, { showlegend: true, shapes: [{ type: "rect", xref: "x", yref: "paper", x0: lb[0][0], x1: lb[lb.length - 1][0], y0: 0, y1: 1, fillcolor: t.rule, opacity: 0.5, line: { width: 0 } }], yaxis: Object.assign(layout(t).yaxis, { tickprefix: "$", tickformat: ",.0f" }) }));
  const v = s.lb.verdict, cls = v === "PASS" ? "good" : (s.lb.pnl > 100 ? "warn" : "bad");
  $(vid).className = "verdict " + cls; $(vid).textContent = v.toLowerCase();
  const sc = s.lb.score;
  $(tid).innerHTML = [["Sealed PnL", fmt.usd(s.lb.pnl)], ["Newey-West t (pass > 1.645)", s.lb.nw_t], ["Sharpe (95% CI)", `${s.lb.sharpe} [${s.lb.sharpe_ci[0]}, ${s.lb.sharpe_ci[1]}]`], ["Trades · hit rate", `${s.lb.trades} · ${(100 * s.lb.hit).toFixed(0)}%`], ["Log score vs market", `${fmt.nats(sc.gain_vs_market)} [${fmt.nats(sc.ci[0])}, ${fmt.nats(sc.ci[1])}]`], ["Noise, same turnover", fmt.usd(s.lb.noise)], ["Backtest before it", `${fmt.usd(s.bt.pnl)} · DSR ${s.bt.dsr} · PBO ${s.bt.pbo}`]].map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join("");
}
function sealed() {
  sealedPair("highs", "c-sh", "t-sh", "v-highs");
  sealedPair("lows", "c-sl", "t-sl", "v-lows");
  const t = theme(), h = D.sealed.highs.lb.by_month || {}, l = D.sealed.lows.lb.by_month || {};
  const months = [...new Set([...Object.keys(h), ...Object.keys(l)])].sort();
  const name = (m) => new Date(m + "-15").toLocaleString("en-US", { month: "short" }) + (m.endsWith("10") ? " (3 days)" : "");
  plot("c-months", [
    { x: months.map(name), y: months.map((m) => h[m] ?? null), name: "highs", type: "bar", marker: { color: t.model }, hovertemplate: "highs %{x}: %{y:$,.0f}<extra></extra>" },
    { x: months.map(name), y: months.map((m) => l[m] ?? null), name: "lows", type: "bar", marker: { color: t.c2 }, hovertemplate: "lows %{x}: %{y:$,.0f}<extra></extra>" },
  ], layout(t, { showlegend: true, barmode: "group", yaxis: Object.assign(layout(t).yaxis, { tickprefix: "$", tickformat: ",.0f", zeroline: true }) }));
}

/* ---------- markets & ablations ---------- */
function ablate() {
  const t = theme();
  const cats = { weather: t.model, sports: t.c2, commodities: t.c3, economics: t.c4, financials: t.c5, crypto: t.c6 };
  plot("c-survey", Object.entries(cats).map(([cat, col]) => {
    const p = D.survey.filter((s) => s.cat === cat && s.spread > 0);
    return { x: p.map((s) => s.events), y: p.map((s) => s.spread), name: cat, mode: "markers+text", text: p.map((s) => s.series), textposition: "top right", textfont: { size: 9.5, color: t.ink, family: css("--mono") }, marker: { color: col, size: p.map((s) => 7 + 2.2 * Math.log10(Math.max(s.volume, 10))), line: { color: t.surface, width: 1.5 } }, customdata: p.map((s) => [s.series, s.volume]), hovertemplate: "%{customdata[0]}<br>%{x:,} events · %{y}¢ spread<br>median volume %{customdata[1]:,.0f}<extra></extra>" };
  }), layout(t, { showlegend: true, xaxis: Object.assign(layout(t).xaxis, { type: "log", title: { text: "settled events (log)", font: { size: 11 } } }), yaxis: Object.assign(layout(t).yaxis, { title: { text: "median spread at mid-life (¢)", font: { size: 11 } } }) }));

  const fr = Object.keys(D.g3), arm = (k, name, col) => ({ x: fr, y: fr.map((f) => D.g3[f][k].gain), name, mode: "lines+markers", line: { color: col, width: 2.5 }, marker: { size: 8 },
    error_y: { type: "data", symmetric: false, array: fr.map((f) => D.g3[f][k].ci[1] - D.g3[f][k].gain), arrayminus: fr.map((f) => D.g3[f][k].gain - D.g3[f][k].ci[0]), color: col, thickness: 1.2, width: 4 },
    hovertemplate: name + "<br>%{x} of real data: %{y:+.4f}<extra></extra>" });
  plot("c-g3", [arm("none", "no pretraining", t.base), arm("pretrained", "pretrained", t.model)], layout(t, { showlegend: true, xaxis: Object.assign(layout(t).xaxis, { title: { text: "share of real training data", font: { size: 11 } }, type: "category" }), yaxis: Object.assign(layout(t).yaxis, { title: { text: "Δ log score vs market", font: { size: 11 } } }) }));

  const gate = (obj, order, lab, keys, cols, id) => {
    const xs = order.filter((r) => obj[r]).map(lab);
    plot(id, keys.map((k, i) => ({ x: xs, y: order.filter((r) => obj[r]).map((r) => obj[r][k].gain), name: "market + " + k, type: "bar", marker: { color: cols[i] },
      error_y: { type: "data", symmetric: false, array: order.filter((r) => obj[r]).map((r) => obj[r][k].ci[1] - obj[r][k].gain), arrayminus: order.filter((r) => obj[r]).map((r) => obj[r][k].gain - obj[r][k].ci[0]), color: t.ink, thickness: 1.2, width: 4 },
      hovertemplate: "market + " + k + "<br>%{x}: %{y:+.4f}<extra></extra>" })), layout(t, { showlegend: true, barmode: "group", bargap: 0.35, yaxis: Object.assign(layout(t).yaxis, { title: { text: "Δ log score, nats", font: { size: 11 } }, zeroline: true }) }));
  };
  const tf = D.transformer || {}, tr = D.reads.filter((r) => tf[r]);
  plot("c-tf", [{ x: tr.map((r) => LBL[r]), y: tr.map((r) => tf[r].diff), type: "bar",
    marker: { color: tr.map((r) => (tf[r].ci[0] > 0 ? t.model : t.base)) },
    error_y: { type: "data", symmetric: false, array: tr.map((r) => tf[r].ci[1] - tf[r].diff), arrayminus: tr.map((r) => tf[r].diff - tf[r].ci[0]), color: t.ink, thickness: 1.2, width: 4 },
    customdata: tr.map((r) => [tf[r].ci[0], tf[r].ci[1], tf[r].control]),
    hovertemplate: "%{x}<br>transformer − isotherm %{y:+.4f} [%{customdata[0]:+.4f}, %{customdata[1]:+.4f}]<br>control vs market %{customdata[2]:+.4f}<extra></extra>" }],
    layout(t, { bargap: 0.45, yaxis: Object.assign(layout(t).yaxis, { title: { text: "Δ log score vs isotherm", font: { size: 11 } }, zeroline: true }) }));
  gate(D.mlb, ["t_24h", "t_3h", "t_15m"], (r) => ({ t_24h: "24h before", t_3h: "3h before", t_15m: "15 min before" })[r], ["Elo", "Elo + starters"], [t.base, t.model], "c-mlb");
  gate(D.lows_gate, ["d1_16", "d1_22"], (r) => ({ d1_16: "4pm day before", d1_22: "10pm day before" })[r], ["NBM", "GFS MOS"], [t.base, t.model], "c-lows");
}

/* ---------- research ---------- */
function research() {
  const t = theme(), R = D.research || {}, order = D.reads;
  const ax = (title) => Object.assign(layout(t).yaxis, { title: { text: title, font: { size: 11 } }, zeroline: true });
  const head = "<tr><th>Variant</th><th>kind</th>" + order.map((r) => `<th>${LBL[r]}</th>`).join("") + "</tr>";
  $("t-arms").innerHTML = head + (R.arms || []).map((a) => "<tr><td>" + a.name + "</td><td class=kind>" + a.kind + " " + a.sec + "</td>" +
    order.map((r) => { const v = a.reads[r]; if (!v) return "<td>–</td>";
      return `<td class="${v.ci[0] > 0 ? "hit" : ""}">${fmt.nats(v.d)}<small>[${fmt.nats(v.ci[0])}, ${fmt.nats(v.ci[1])}]</small></td>`; }).join("") + "</tr>").join("");

  if (R.wx) {
    const w = R.wx, ci = (v) => `${fmt.nats(v.d)} [${fmt.nats(v.ci[0])}, ${fmt.nats(v.ci[1])}]`;
    $("card-wx").hidden = false;
    $("t-wx").innerHTML = [["Forecast vs EMOS-NBM with spread", ci(w.forecast)], ["MLP vs market", fmt.nats(w.mlp_vs_market)], ["MLP on the weather model vs market", fmt.nats(w.wx_vs_market)]]
      .map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join("");
  }

  if (R.signals) {
    $("card-signals").hidden = false;
    $("t-signals").innerHTML = "<tr><th>Signal</th>" + order.map((r) => `<th>${LBL[r]}</th>`).join("") + "</tr>" +
      R.signals.map((a) => "<tr><td>" + a.name + "</td>" + order.map((r) => { const v = a.reads[r]; if (!v) return "<td>–</td>";
        return `<td class="${v.ci[0] > 0 ? "hit" : ""}">${fmt.nats(v.d)}<small>[${fmt.nats(v.ci[0])}, ${fmt.nats(v.ci[1])}]</small></td>`; }).join("") + "</tr>").join("");
  }

  if (R.bench) {
    $("card-bench").hidden = false;
    const c = (v) => `<td class="${v.ci[0] > 0 ? "hit" : ""}">${fmt.nats(v.d)}<small>[${fmt.nats(v.ci[0])}, ${fmt.nats(v.ci[1])}]</small></td>`;
    $("t-bench").innerHTML = "<tr><th>Series</th><th>Before close</th><th>Ladders</th><th>Bid vs mid</th><th>Outside vs in-quote</th></tr>" +
      R.bench.map((a) => `<tr><td>${a.name}</td><td>${a.lead}</td><td>${a.n}</td>${c(a.bid)}${c(a.clip)}</tr>`).join("");
  }

  if (R.typed) {
    const T = R.typed;
    $("card-typed").hidden = false;
    $("t-typed").innerHTML = "<tr><th>Read</th><th>Noul calibration error, market → isotherm</th><th>80% interval excess coverage, market → isotherm</th><th>Score: Δ CRPS</th><th>Coherence violations</th></tr>" +
      order.filter((r) => T[r]).map((r) => { const x = T[r];
        return `<tr><td>${LBL[r]}</td><td>${x.ece[0].toFixed(3)} → ${x.ece[1].toFixed(3)}</td><td>${x.cover[0].toFixed(1)} → ${x.cover[1].toFixed(1)} pts</td><td class="${x.crps.ci[0] > 0 ? "hit" : ""}">${fmt.nats(x.crps.d)}<small>[${fmt.nats(x.crps.ci[0])}, ${fmt.nats(x.crps.ci[1])}]</small></td><td>${x.violations}</td></tr>`; }).join("");
  }

  if (R.cities) {
    const C = R.cities, cell = (v) => `<td class="${v.ci[0] > 0 ? "hit" : ""}">${fmt.nats(v.d)}<small>[${fmt.nats(v.ci[0])}, ${fmt.nats(v.ci[1])}]</small></td>`;
    $("card-cities").hidden = false;
    $("t-cities").innerHTML = "<tr><th>Read</th><th>MLP 19 − 7, on the seven</th><th>Transformer 19 − 7, on the seven</th><th>Transformer 19 − 7, on the twelve</th><th>Transformer − MLP, both on 19, on the seven</th></tr>" +
      order.filter((r) => C[r]).map((r) => `<tr><td>${LBL[r]}</td>` + ["mlp_seven", "tf_seven", "tf_twelve", "tf_vs_mlp"].map((k) => cell(C[r][k])).join("") + "</tr>").join("");
  }

  const c = R.curve || {}, fr = Object.keys(c);
  plot("c-curve", [["mlp", "MLP", t.base], ["tf", "transformer-L", t.model]].map(([k, name, col]) => ({ x: fr, y: fr.map((f) => c[f][k]), name, mode: "lines+markers", line: { color: col, width: 2.5 }, marker: { size: 8 }, hovertemplate: name + "<br>%{x} of dates: %{y:+.4f}<extra></extra>" })),
    layout(t, { showlegend: true, xaxis: Object.assign(layout(t).xaxis, { type: "category", title: { text: "share of training dates", font: { size: 11 } } }), yaxis: ax("Δ log score vs market") }));

  const u = R.unseen;
  if (u) {
    $("n-unseen").textContent = `Frozen on the seven scored cities, scored once on ${u.ladders.toLocaleString("en-US")} ladders from twelve newer ones, July to October 2026. No read clears zero. The frozen strategy made ${fmt.usd(u.pnl)} on paper, Newey-West t ${u.t}.`;
    const ur = order.filter((r) => u.reads[r]);
    plot("c-unseen", [{ x: ur.map((r) => LBL[r]), y: ur.map((r) => u.reads[r].g), type: "bar", marker: { color: ur.map((r) => (u.reads[r].ci[0] > 0 ? t.model : t.base)) },
      error_y: { type: "data", symmetric: false, array: ur.map((r) => u.reads[r].ci[1] - u.reads[r].g), arrayminus: ur.map((r) => u.reads[r].g - u.reads[r].ci[0]), color: t.ink, thickness: 1.2, width: 4 },
      hovertemplate: "%{x}<br>isotherm vs market %{y:+.4f}<extra></extra>" }], layout(t, { bargap: 0.45, yaxis: ax("Δ log score vs market") }));
  }

  const g = R.regime || {}, ms = Object.keys(g);
  plot("c-regime", [["mkt", "market", t.model], ["nbm", "EMOS-NBM", t.base]].map(([k, name, col]) => ({ x: ms, y: ms.map((m) => g[m][k]), name, mode: "lines+markers", line: { color: col, width: 2 }, marker: { size: 6 }, hovertemplate: name + "<br>%{x}: %{y:.3f}<extra></extra>" })),
    layout(t, { showlegend: true, yaxis: Object.assign(layout(t).yaxis, { title: { text: "log loss, nats", font: { size: 11 } } }) }));
  plot("c-wgfs", [{ x: ms, y: ms.map((m) => g[m].w_gfs), mode: "lines+markers", line: { color: t.model, width: 2.5 }, marker: { size: 6 }, hovertemplate: "%{x}: weight %{y:.2f}<extra></extra>" }],
    layout(t, { yaxis: ax("weight on EMOS-GFS") }));

  const f = R.forward || {}, res = f.result;
  const rows = (f.arms || []).map((a) => {
    let st = "collecting";
    if (res) {
      const k = { "Transformer, 8x larger": "transformer_minus_isotherm", "NBM's own spread": "spread_minus_isotherm", "Ensemble of three": "ensemble_minus_isotherm", "Order flow": "flow_minus_isotherm" }[a.name];
      const r = a.name.startsWith("Weather model") ? (res.weather_model || {}).wx_mlp_minus_isotherm : k && res[k];
      st = r ? `${fmt.nats(r.diff)} [${fmt.nats(r.ci[0])}, ${fmt.nats(r.ci[1])}]` + (res.complete ? "" : " · interim") : a.name.startsWith("MLP") ? "reference" : "collecting";
    }
    return [`${a.name} <span class="kind">${a.sha}</span>`, a.name.startsWith("MLP") ? "reference" : st];
  });
  if (R.sharpen) { const sr = R.sharpen.result, x = sr && sr.reads && sr.reads.d1_16;
    rows.push([`Market sharpened, 19 cities, from 2026-10-10 <span class="kind">${R.sharpen.sha}</span>`, x ? `${fmt.nats(x.diff)} [${fmt.nats(x.ci[0])}, ${fmt.nats(x.ci[1])}] vs market` + (sr.complete ? "" : " · interim") : "collecting"]); }
  if (R.rain) { const rr = R.rain.result, x = rr && rr.primary_stack_minus_mid;
    rows.push([`Rain stack, KXRAIN 25 cities, from 2026-10-11 <span class="kind">${R.rain.sha}</span>`, x && x.ci ? `${fmt.nats(x.mean)} [${fmt.nats(x.ci[0])}, ${fmt.nats(x.ci[1])}] vs market` + (rr.complete ? "" : " · interim") : "collecting"]); }
  rows.push(["Ladders scored", res ? `${res.ladders} through ${res.through}` : "none yet"]);
  $("t-forward").innerHTML = rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join("");
}

/* ---------- live ---------- */
function live() {
  const t = theme(), s = D.shadow, dec = s.decay;
  const rows = [["Status", dec ? dec.status.replace("_", " ").toLowerCase() : "collecting data"], ["Settled ladders", s.settled_ladders || 0]];
  if (s.log_score_gain_vs_market !== undefined) rows.push(["Log score vs market", fmt.nats(s.log_score_gain_vs_market)]);
  if (s.pnl !== undefined) rows.push(["Paper PnL", fmt.usd(s.pnl)], ["Trades", s.trades]);
  rows.push(["Schedule", "16:00 local daily, settled next morning"], ["Frozen model", "pool · market+GFS · Kelly 0.25"]);
  $("t-live").innerHTML = rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join("");
  const w = (dec && dec.windows) || [];
  if (!w.length) {
    plot("c-live", [], layout(t, { xaxis: { visible: false }, yaxis: { visible: false }, annotations: [{ text: "No settled live days yet. The first ladders settle the morning after the first 16:00 run.<br>The rolling window fills in after 20 settled days.", showarrow: false, font: { color: t.muted, size: 12 }, x: 0.5, y: 0.5, xref: "paper", yref: "paper" }] }));
    return;
  }
  const ws = w.slice().reverse();
  plot("c-live", [{ x: ws.map((x) => x.to), y: ws.map((x) => x.gain), mode: "lines+markers", line: { color: t.model, width: 2.5 },
    error_y: { type: "data", symmetric: false, array: ws.map((x) => x.ci ? x.ci[1] - x.gain : 0), arrayminus: ws.map((x) => x.ci ? x.gain - x.ci[0] : 0), color: t.muted },
    hovertemplate: "window to %{x}<br>%{y:+.4f} nats<extra></extra>" }], layout(t, { yaxis: Object.assign(layout(t).yaxis, { zeroline: true }) }));
}

/* ---------- tabs, theme, boot ---------- */
const RENDER = { prob, trade, sealed, ablate, research, live };
let shown = new Set();
function show(id) {
  document.querySelectorAll('[role="tab"]').forEach((b) => b.setAttribute("aria-selected", b.getAttribute("aria-controls") === id));
  document.querySelectorAll("section.panel").forEach((p) => { p.hidden = p.id !== id; });
  RENDER[id](); shown.add(id);
  try { localStorage.setItem("iso-tab", id); } catch (e) {}
}
document.querySelectorAll('[role="tab"]').forEach((b) => b.onclick = () => show(b.getAttribute("aria-controls")));
$("sel-cell").innerHTML = Object.keys(D.cells).map((k) => `<option value="${k}" ${k === CELL ? "selected" : ""}>${cellLabel(k)} · ${fmt.usd(D.cells[k].pnl)}</option>`).join("");
$("sel-cell").onchange = (e) => { CELL = e.target.value; trade(); };

function iso() {
  const c = $("iso"), r = c.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
  c.width = r.width * dpr; c.height = r.height * dpr;
  const x = c.getContext("2d"); x.scale(dpr, dpr); x.clearRect(0, 0, r.width, r.height);
  x.strokeStyle = css("--rule"); x.lineWidth = 1;
  for (let k = 0; k < 6; k++) {
    x.beginPath();
    for (let i = 0; i <= 120; i++) {
      const px = r.width * (0.45 + 0.55 * i / 120), py = r.height * (0.15 + 0.13 * k) + 10 * Math.sin(i / 14 + k * 0.9) + 6 * Math.sin(i / 5.5 + k);
      i ? x.lineTo(px, py) : x.moveTo(px, py);
    }
    x.stroke();
  }
}
function rerender() { iso(); shown.forEach((id) => { if (!$(id).hidden) RENDER[id](); }); }
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", rerender);
new MutationObserver(rerender).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
addEventListener("resize", () => iso());

header(); readSeg(); iso();
let start = "prob";
try { const h = location.hash.slice(1); start = RENDER[h] ? h : (localStorage.getItem("iso-tab") || "prob"); } catch (e) {}
if (!RENDER[start]) start = "prob";
// The ledger moves daily; read it fresh so every copy of this page stays current.
fetch("https://raw.githubusercontent.com/physicalreasoning/isotherm/shadow-ledger/metrics.json", { cache: "no-store" })
  .then((r) => (r.ok ? r.json() : null))
  .then((m) => { if (m && typeof m.settled_ladders === "number") { D.shadow = m; header(); if (!$("live").hidden) live(); } })
  .catch(() => {});
if (typeof Plotly === "undefined") { document.querySelectorAll(".chart").forEach((el) => { el.textContent = "Charts could not load. The tables and summary above still hold every headline number."; }); }
else show(start);
