// Window Shop: the screens. Money rules are in money.js, game rules in shop.js,
// the doll in doll.js. This file renders, handles taps and saves.
(function () {
  "use strict";
  const M = window.Money, S = window.Shop, D = window.Doll;
  const CAT = window.WS_CATALOG, PAL = window.WS_PALETTE, PARTS = window.WS_PARTS;
  const app = document.getElementById("app");
  const toastEl = document.getElementById("toast");

  // ---------- time & storage ----------
  // Dev hook: ?today=2026-11-23 pretends it's that date, using separate test data.
  const fakeToday = (() => {
    const v = new URLSearchParams(location.search).get("today");
    return /^\d{4}-\d{2}-\d{2}$/.test(v || "") ? v : null;
  })();
  const STORAGE_KEY = fakeToday ? "windowshop:v1:test" : "windowshop:v1";
  const today = () => fakeToday || M.toYmd(new Date());
  const MAX_CENTS = 100000000;

  function load() {
    let raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (s && (s.version === 1 || s.version === 2) && s.current) return S.upgrade(s);
    } catch (e) { /* fall through */ }
    try { if (raw) localStorage.setItem(STORAGE_KEY + ":unreadable", raw); } catch (e) { /* ignore */ }
    return null;
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (e) { showToast("Couldn't save. This browser may be blocking storage."); }
  }
  const uid = () => (window.crypto && crypto.randomUUID && crypto.randomUUID()) || Date.now().toString(36) + Math.random().toString(36).slice(2);

  // ---------- formatting ----------
  const usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const usd2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
  const money = (c) => (c % 100 === 0 ? usd0 : usd2).format(c / 100);
  const inputMoney = (c) => (c % 100 === 0 ? String(c / 100) : (c / 100).toFixed(2));
  const asDate = (ymd) => { const [y, m, d] = ymd.split("-").map(Number); return new Date(y, m - 1, d); };
  const fmtShort = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  const fmtDay = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
  const shortDate = (ymd) => fmtShort.format(asDate(ymd));
  const dayDate = (ymd) => fmtDay.format(asDate(ymd));
  function rangeLabel(p) {
    const last = M.addDays(p.end, -1);
    if (last === p.start) return dayDate(p.start);
    if (p.start.slice(0, 7) === last.slice(0, 7)) return `${shortDate(p.start)}–${asDate(last).getDate()}`;
    return `${shortDate(p.start)} – ${shortDate(last)}`;
  }
  const NOUN = { day: "day", week: "week", month: "month" };
  const THIS = { day: "Today", week: "This week", month: "This month" };
  const ADJ = { day: "Daily", week: "Weekly", month: "Monthly" };
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);

  const COMPARISONS = [
    { cents: 30000, one: "a designer-style bag", many: "designer-style bags" },
    { cents: 9000, one: "a sundress", many: "sundresses" },
    { cents: 6000, one: "a pair of jeans", many: "pairs of jeans" },
    { cents: 3500, one: "a going-out top", many: "going-out tops" },
    { cents: 650, one: "an iced latte", many: "iced lattes" },
  ];
  function comparison(total) {
    for (const c of COMPARISONS) { const n = Math.floor(total / c.cents); if (n >= 2) return `That's ${n} ${c.many} you didn't buy.`; }
    for (const c of COMPARISONS) if (total >= c.cents) return `That's ${c.one} you didn't buy.`;
    return null;
  }

  // ---------- state ----------
  let state = load();
  let editingId = null;
  let renderedDay = null;
  const draft = {
    step: "look",
    look: { ...S.DEFAULT_LOOK },
    name: "",
    onboard: { period: "week", amount: "" },
    settings: null,
    tryOn: {}, // store screen: itemId -> true
    closetFilter: "all",
    closetStore: "all",
  };

  function catchUp() {
    if (!state) return;
    const events = M.closeDuePeriods(state, today());
    const stores = S.checkUnlocks(state);
    if (events.length || stores.length) {
      editingId = null;
      save();
      render();
      celebrate(events, stores);
    }
  }

  // ---------- doll helpers ----------
  const lookOf = () => ({ skin: state.avatar.skin, hair: state.avatar.hair, hairColor: state.avatar.hairColor, eyes: state.avatar.eyes });
  const dollImg = (look, equipped, scale, cls = "") =>
    `<img class="pix doll ${cls}" alt="Your doll" width="${64 * scale}" height="${128 * scale}" src="${D.dollURL(look, S.equippedItems(equipped), scale)}">`;
  const itemImg = (it, px = 96) => `<img class="pix" alt="" src="${D.itemURL(it, px)}">`;

  // ---------- shared pieces ----------
  function segmented(action, options, value, label) {
    return `<div class="seg" role="group" aria-label="${label}" style="grid-template-columns:repeat(${options.length},1fr)">${options
      .map(([v, text]) => `<button type="button" data-action="${action}" data-value="${v}" aria-pressed="${v === value}">${text}</button>`)
      .join("")}</div>`;
  }
  const periodSeg = (action, value) => segmented(action, ["day", "week", "month"].map((t) => [t, ADJ[t]]), value, "Budget period");

  function swatches(action, entries, value, label) {
    return `<div class="swatches" role="group" aria-label="${label}">${entries
      .map(([k, v]) => `<button type="button" class="sw" data-action="${action}" data-value="${k}" aria-pressed="${k === value}" title="${v.label}" style="background:${v.main}"><span class="sr">${v.label}</span></button>`)
      .join("")}</div>`;
  }

  function lookEditor(look, prefix) {
    return `
      <div class="label">Skin tone</div>${swatches(prefix + "-skin", Object.entries(PAL.skins), look.skin, "Skin tone")}
      <div class="label">Hair</div>${segmented(prefix + "-hair", Object.entries(PARTS.hair).map(([k, v]) => [k, v.label]), look.hair, "Hair style")}
      <div class="label">Hair color</div>${swatches(prefix + "-haircolor", Object.entries(PAL.hairColors), look.hairColor, "Hair color")}
      <div class="label">Eyes</div>${swatches(prefix + "-eyes", Object.entries(PAL.eyeColors), look.eyes, "Eye color")}`;
  }

  function header() {
    return `<header class="topbar">
      <div class="wordmark">Window <span>Shop</span></div>
      <div class="topright">
        <span class="pill saved" title="Real money you've kept">💰 ${money(state.stats.totalSavedCents)} saved</span>
        <a class="gear" href="#settings" aria-label="Settings">⚙️</a>
      </div>
    </header>
    ${fakeToday ? `<div class="note warn tiny" style="margin:0 0 14px">Test mode: pretending today is ${dayDate(fakeToday)}. Uses separate test data.</div>` : ""}`;
  }

  function tabbar(route) {
    const base = route.split("/")[0];
    const tab = (id, ico, label) => `<a href="#${id}" ${base === id || (id === "mall" && base === "store") ? 'aria-current="page"' : ""}><span class="ico" aria-hidden="true">${ico}</span>${label}</a>`;
    return `<div class="tabbar"><nav aria-label="Main">${tab("home", "🏠", "Home")}${tab("log", "🧾", "Log")}${tab("mall", "🛍️", "Mall")}${tab("closet", "👗", "Closet")}${tab("stats", "📈", "Stats")}</nav></div>`;
  }

  // ---------- onboarding (spec §6.1) ----------
  function onboardPreview() {
    const d = draft.onboard, cents = M.parseDollars(d.amount);
    if (!cents || cents > MAX_CENTS) return "";
    const p = M.makePeriod(d.period, cents, today());
    if (!p.prorated) return "";
    return `<div class="note small">Your first ${NOUN[d.period]} is short (${p.days} of ${p.fullDays} days, ${rangeLabel(p)}), so its budget is <strong>${money(p.budgetCents)}</strong>. After that it's ${money(cents)} every ${NOUN[d.period]}.</div>`;
  }

  function renderOnboarding() {
    if (draft.step === "look") {
      return `<div class="onboard">
        <div class="wordmark">Window <span>Shop</span></div>
        <p class="tagline">Shop like crazy and spend nothing real.</p>
        <ol class="how">
          <li><span class="n">1</span><span>Set a real-life budget and log what you actually spend.</span></li>
          <li><span class="n">2</span><span>Whatever you <strong>don't</strong> spend becomes in-game cash.</span></li>
          <li><span class="n">3</span><span>Spend it on clothes for your doll.</span></li>
        </ol>
        <section class="card">
          <h2>Make your doll</h2>
          <div class="maker">
            <div class="stage">${dollImg(draft.look, S.equippedItems ? starterEquipped() : {}, 2)}</div>
            <div class="grow">${lookEditor(draft.look, "look")}</div>
          </div>
          <label class="field" style="margin-top:12px"><span>Your name <span class="muted" style="font-weight:400">(optional)</span></span>
            <input type="text" name="name" data-bind="name" maxlength="24" value="${esc(draft.name)}" autocomplete="off"></label>
          <button class="btn block" type="button" data-action="onboard-next">Next: your budget</button>
        </section>
      </div>`;
    }
    const d = draft.onboard;
    return `<div class="onboard">
      <div class="wordmark">Window <span>Shop</span></div>
      <p class="tagline">Last step: your real-life budget.</p>
      <form class="card" data-form="onboard" novalidate>
        <h2>Your budget</h2>
        ${periodSeg("onboard-period", d.period)}
        <label class="field"><span>How much can you spend each ${NOUN[d.period]}?</span>
          <div class="money-input"><input inputmode="decimal" name="amount" placeholder="300" value="${esc(d.amount)}" autocomplete="off"></div></label>
        <div class="error" data-slot="error" hidden></div>
        <div data-slot="preview">${onboardPreview()}</div>
        <button class="btn block" type="submit" style="margin-top:14px">Start saving</button>
        <button class="btn ghost block" type="button" data-action="onboard-back" style="margin-top:8px">Back</button>
        <p class="tiny muted" style="margin-top:10px">No bank connection. You type in what you spend; the game takes your word for it.</p>
      </form>
    </div>`;
  }
  function starterEquipped() {
    let eq = {};
    for (const it of CAT.starter) eq = S.equip(eq, it);
    return eq;
  }

  // ---------- home (spec §6.2) ----------
  function renderHome() {
    const t = today(), p = state.current, s = M.currentSummary(state, t), st = state.stats;
    const noun = NOUN[p.type];
    const pct = p.budgetCents > 0 ? Math.min(100, (s.spentCents / p.budgetCents) * 100) : 100;
    const payday = s.daysLeft === 1 ? "tomorrow" : `on ${dayDate(p.end)}`;
    const cmp = comparison(st.totalSavedCents);
    const streakPeriods = state.history.slice(0, st.currentStreak);
    const streakNoun = streakPeriods.every((h) => h.type === streakPeriods[0].type) ? NOUN[streakPeriods[0] ? streakPeriods[0].type : p.type] : "period";
    const name = state.profile.name;

    return `${header()}
      <section class="card hero home-hero">
        <div class="stage">${dollImg(lookOf(), state.avatar.equipped, 2)}</div>
        <div class="grow">
          ${name ? `<p class="small muted">Hi, ${esc(name)}!</p>` : ""}
          <div class="label">Total saved</div>
          <div class="big">${money(st.totalSavedCents)}</div>
          <p class="small muted" style="margin-top:4px">${cmp ? esc(cmp) : `Real money you kept. Your first payout lands ${payday}.`}</p>
          <div class="chips">
            ${st.currentStreak > 0 ? `<span class="chip">🔥 ${st.currentStreak}-${streakNoun} streak</span>` : `<span class="chip">🔥 No streak yet</span>`}
            <span class="chip">🏅 Next: ${money(M.nextMilestone(st.totalSavedCents))}</span>
          </div>
          <div class="wallet-mini">
            <div class="label">In-game cash</div>
            <div class="mid cash">✦ ${money(state.wallet.balanceCents)}</div>
          </div>
          <a class="btn small" href="#mall">Go shopping</a>
        </div>
      </section>

      <section class="card">
        <div class="row"><div class="label">${THIS[p.type]} · ${rangeLabel(p)}</div>
          <span class="tiny muted">${p.type === "day" ? "Resets at midnight" : `${plural(s.daysLeft, "day")} left`}</span></div>
        <div class="mid">${money(Math.abs(s.leftCents))} <span class="small muted" style="font-family:var(--body);font-weight:400">${s.leftCents >= 0 ? "real money left" : "over budget"}</span></div>
        <div class="bar ${s.overspent ? "over" : ""}" role="progressbar" aria-label="Spent ${THIS[p.type].toLowerCase()}" aria-valuemin="0" aria-valuemax="${p.budgetCents}" aria-valuenow="${Math.min(s.spentCents, p.budgetCents)}"><div style="width:${pct}%"></div></div>
        <p class="small muted">${money(s.spentCents)} spent of ${money(p.budgetCents)}</p>
        ${p.prorated ? `<p class="tiny muted" style="margin-top:4px">Short ${noun} (${p.days} of ${p.fullDays} days), so the budget is prorated from ${money(p.fullBudgetCents)}.</p>` : ""}
        ${s.overspent
          ? `<div class="note warn">You're over budget this ${noun}, so no new cash this time. Your wallet stays safe.</div>`
          : `<div class="note cash">On track to earn <strong>+${money(s.onTrackToEarnCents)}</strong> in-game cash when this ${noun} ends ${payday}.</div>`}
        ${state.pending ? `<div class="note small">From ${dayDate(p.end)}: ${money(state.pending.budgetCents)} per ${NOUN[state.pending.period]}.</div>` : ""}
        <a class="btn block" href="#log" style="margin-top:14px">+ Log spending</a>
      </section>`;
  }

  // ---------- log (spec §6.3) ----------
  function expenseForm(kind, e) {
    const t = today(), p = state.current;
    const dateField = p.type === "day" ? "" : `<label class="field"><span>Date</span><input type="date" name="date" value="${e ? e.date : t}" min="${p.start}" max="${t}"></label>`;
    return `<form data-form="${kind}" ${e ? `data-id="${e.id}"` : ""} novalidate>
      <label class="field"><span>Amount</span><div class="money-input"><input inputmode="decimal" name="amount" placeholder="0.00" value="${e ? inputMoney(e.amountCents) : ""}" autocomplete="off"></div></label>
      <label class="field"><span>Note <span class="muted" style="font-weight:400">(optional)</span></span><input type="text" name="note" maxlength="80" placeholder="Target run" value="${e ? esc(e.note) : ""}" autocomplete="off"></label>
      ${dateField}
      <div class="error" data-slot="error" hidden></div>
      ${e ? `<div class="grid2"><button class="btn ghost" type="button" data-action="cancel-edit">Cancel</button><button class="btn" type="submit">Save</button></div>` : `<button class="btn block" type="submit">Add expense</button>`}
    </form>`;
  }

  function renderLog() {
    const t = today(), p = state.current, s = M.currentSummary(state, t);
    const items = state.expenses.filter((e) => M.inPeriod(p, e.date)).sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1));
    const rows = items.map((e) => e.id === editingId
      ? `<li class="editing">${expenseForm("edit", e)}</li>`
      : `<li><div class="grow"><div class="title">${e.note ? esc(e.note) : '<span class="muted">Purchase</span>'}</div><div class="tiny muted">${dayDate(e.date)}</div></div>
          <div class="amt">${money(e.amountCents)}</div>
          <button class="icon-btn" type="button" data-action="edit" data-id="${e.id}" aria-label="Edit ${money(e.amountCents)} expense">Edit</button>
          <button class="icon-btn" type="button" data-action="delete" data-id="${e.id}" aria-label="Delete ${money(e.amountCents)} expense">Delete</button></li>`).join("");
    return `${header()}
      <h1>Log spending</h1>
      <p class="muted" style="margin-bottom:14px">Real-life purchases, anything that counts against your budget.</p>
      <section class="card">${expenseForm("add")}</section>
      <section class="card">
        <div class="row"><h2>${THIS[p.type]}</h2><span class="small muted">${rangeLabel(p)}</span></div>
        ${items.length ? `<ul class="list">${rows}</ul>` : `<p class="empty muted">Nothing logged yet ${THIS[p.type].toLowerCase()}.</p>`}
        <div class="row" style="border-top:1px solid var(--line);padding-top:12px;margin-top:4px"><strong>Total</strong>
          <strong class="num">${money(s.spentCents)} <span class="muted" style="font-weight:400">of ${money(p.budgetCents)}</span></strong></div>
        <p class="tiny muted" style="margin-top:8px">${p.type === "day" ? "Entries are for today." : `You can log anything from ${dayDate(p.start)} to today. Past ${NOUN[p.type]}s are locked once they've paid out.`}</p>
      </section>`;
  }

  // ---------- mall (spec §6.4) ----------
  function storeStyle(st) {
    const font = { serif: "var(--display)", sans: "var(--body)", round: "'Trebuchet MS', 'Comic Sans MS', var(--body)" }[st.theme.font] || "var(--display)";
    return `--s-bg:${st.theme.bg};--s-ink:${st.theme.ink};--s-accent:${st.theme.accent};--s-font:${font}`;
  }

  function renderMall() {
    const cards = CAT.stores.map((st) => {
      const u = S.unlockStatus(st, state);
      const items = CAT.items.filter((i) => i.storeId === st.id);
      const isNew = u.unlocked && !state.seenStores.includes(st.id);
      if (!u.unlocked) {
        return `<div class="storecard locked" style="${storeStyle(st)}">
          <div class="storename">🔒 ${esc(st.name)}</div>
          <p class="small">${esc(st.tagline)}</p>
          <p class="small" style="margin-top:8px"><strong>${esc(u.label)}</strong></p>
          <div class="bar thin"><div style="width:${Math.min(100, u.progress * 100)}%"></div></div>
          <p class="tiny">${esc(u.detail)}</p>
        </div>`;
      }
      return `<a class="storecard" href="#store/${st.id}" style="${storeStyle(st)}">
        ${isNew ? `<span class="newbadge">New</span>` : ""}
        <div class="storename">${esc(st.name)}</div>
        <p class="small">${esc(st.tagline)}</p>
        <div class="window">${items.slice(0, 4).map((it) => itemImg(it, 44)).join("")}</div>
      </a>`;
    }).join("");
    return `${header()}
      <h1>The Mall</h1>
      <p class="muted" style="margin-bottom:14px">You have <strong class="cash">✦ ${money(state.wallet.balanceCents)}</strong> to spend. Save more to unlock more stores.</p>
      <div class="mallgrid">${cards}</div>`;
  }

  // ---------- store (spec §4.3, §6.5) ----------
  function renderStore(id) {
    const st = CAT.stores.find((s) => s.id === id);
    if (!st || !S.unlockStatus(st, state).unlocked) return renderMall();
    if (!state.seenStores.includes(id)) { state.seenStores.push(id); save(); }
    const items = CAT.items.filter((i) => i.storeId === id);
    const trying = items.filter((i) => draft.tryOn[i.id]);
    let eq = { ...state.avatar.equipped };
    for (const it of trying) eq = S.equip(eq, it);
    const toBuy = trying.filter((i) => !S.owns(state, i.id));
    const total = toBuy.reduce((s, i) => s + S.priceCents(i), 0);
    const short = total - state.wallet.balanceCents;

    const cards = items.map((it) => {
      const owned = S.owns(state, it.id), on = !!draft.tryOn[it.id];
      return `<div class="product ${on ? "on" : ""}">
        <button type="button" class="thumb" data-action="tryon" data-id="${it.id}" aria-pressed="${on}" aria-label="Try on ${esc(it.name)}">${itemImg(it, 96)}</button>
        <div class="pname">${esc(it.name)}</div>
        <div class="row"><span class="price">${money(S.priceCents(it))}</span>${owned ? `<span class="tiny owned">Owned ✓</span>` : ""}</div>
        <button type="button" class="btn small ${on ? "" : "ghost"} block" data-action="tryon" data-id="${it.id}">${on ? "Take off" : "Try on"}</button>
      </div>`;
    }).join("");

    return `<div class="storepage" style="${storeStyle(st)}">
      <div class="storehead">
        <a href="#mall" class="back">← Mall</a>
        <div class="storename big-store">${esc(st.name)}</div>
        <p class="small">${esc(st.tagline)}</p>
      </div>
      <div class="fitting">
        <div class="stage">${dollImg(lookOf(), eq, 2)}</div>
        <div class="grow">
          <div class="label">Fitting room</div>
          ${trying.length
            ? `<ul class="trylist">${trying.map((i) => `<li><span>${esc(i.name)}</span><span>${S.owns(state, i.id) ? "owned" : money(S.priceCents(i))}</span></li>`).join("")}</ul>`
            : `<p class="small">Tap anything to try it on. Trying is free.</p>`}
          <p class="small" style="margin-top:8px">Wallet: <strong>✦ ${money(state.wallet.balanceCents)}</strong></p>
          ${toBuy.length
            ? short > 0
              ? `<button class="btn block" type="button" disabled>Need ${money(short)} more</button><p class="tiny" style="margin-top:6px">Keep saving in real life to afford this.</p>`
              : `<button class="btn block" type="button" data-action="buy">Buy ${toBuy.length > 1 ? toBuy.length + " for " : ""}${money(total)}</button>`
            : trying.length ? `<button class="btn ghost block" type="button" data-action="wear-tried">Wear these</button>` : ""}
          ${trying.length ? `<button class="linkbtn" type="button" data-action="clear-tryon">Clear fitting room</button>` : ""}
        </div>
      </div>
      <div class="products">${cards}</div>
    </div>`;
  }

  // ---------- closet (spec §5.6, §6.6) ----------
  const FILTERS = [["all", "All"], ["top", "Tops"], ["bottom", "Bottoms"], ["onepiece", "Dresses"], ["outer", "Outerwear"], ["shoes", "Shoes"], ["bag", "Bags"], ["accessory", "Accessories"]];

  function renderCloset() {
    const eq = state.avatar.equipped;
    const owned = state.owned.map((o) => S.item(o.itemId)).filter(Boolean)
      .filter((it) => draft.closetFilter === "all" || S.slotOf(it) === draft.closetFilter)
      .filter((it) => draft.closetStore === "all" || it.storeId === draft.closetStore);
    const storeOpts = [["all", "All stores"], ["starter", "Starter"]].concat(CAT.stores.map((s) => [s.id, s.name]));
    return `${header()}
      <h1>Closet</h1>
      <section class="card closet-top">
        <div class="stage">${dollImg(lookOf(), eq, 2)}</div>
        <div class="grow">
          <div class="label">Wearing</div>
          <ul class="trylist">${S.equippedItems(eq).map((i) => `<li><span>${esc(i.name)}</span></li>`).join("") || "<li>Nothing (just the basics)</li>"}</ul>
          <form data-form="outfit" class="outfit-form" novalidate>
            <input type="text" name="outfitName" maxlength="40" placeholder="Name this look" autocomplete="off" aria-label="Outfit name">
            <button class="btn small" type="submit">Save look</button>
          </form>
        </div>
      </section>
      ${state.outfits.length ? `<section class="card"><h2>Saved looks</h2><div class="outfits">${state.outfits.map((o) => `
        <div class="outfit">
          <button type="button" class="thumb" data-action="wear-outfit" data-id="${o.id}" aria-label="Wear ${esc(o.name)}">${dollImg(lookOf(), o.equipped, 1)}</button>
          <div class="tiny">${esc(o.name)}</div>
          <button type="button" class="icon-btn tiny" data-action="delete-outfit" data-id="${o.id}" aria-label="Delete ${esc(o.name)}">Delete</button>
        </div>`).join("")}</div></section>` : ""}
      <div class="chipscroll">${FILTERS.map(([k, v]) => `<button type="button" class="fchip" data-action="closet-filter" data-value="${k}" aria-pressed="${draft.closetFilter === k}">${v}</button>`).join("")}</div>
      <label class="field" style="margin:8px 0 12px"><span class="sr">Store</span>
        <select data-action-change="closet-store">${storeOpts.map(([k, v]) => `<option value="${k}" ${draft.closetStore === k ? "selected" : ""}>${esc(v)}</option>`).join("")}</select></label>
      ${owned.length ? `<div class="products closet">${owned.map((it) => {
        const on = S.isEquipped(eq, it);
        return `<button type="button" class="product ${on ? "on" : ""}" data-action="toggle-wear" data-id="${it.id}" aria-pressed="${on}">
          <span class="thumb">${itemImg(it, 80)}</span>
          <span class="pname">${esc(it.name)}</span>
          <span class="tiny">${on ? "Wearing ✓" : "Tap to wear"}</span></button>`;
      }).join("")}</div>` : `<p class="empty muted">Nothing here yet. Visit the <a href="#mall">Mall</a>.</p>`}`;
  }

  // ---------- stats (spec §6.7) ----------
  function renderStats() {
    const st = state.stats;
    const hist = state.history.slice(0, 12).reverse();
    const max = Math.max(1, ...hist.map((h) => h.budgetCents));
    const chart = hist.length
      ? `<div class="chart" role="img" aria-label="Cash earned in each of the last ${hist.length} periods">${hist.map((h) => {
          const pct = (h.earnedCents / max) * 100;
          return `<div class="col" title="${rangeLabel(h)}: saved ${money(h.earnedCents)} (spent ${money(h.spentCents)} of ${money(h.budgetCents)})">
            <div class="barv" style="height:${Math.max(pct, h.earnedCents ? 2 : 0)}%"></div><span class="tiny">${shortDate(h.start).replace(" ", " ")}</span></div>`;
        }).join("")}</div>`
      : `<p class="empty muted">Your first period hasn't ended yet. Come back after ${dayDate(state.current.end)}.</p>`;
    const reached = new Set(st.milestones);
    const badges = [];
    for (let v = 5000, i = 0; badges.length < 8; i++) { badges.push(v); v = [2, 2.5, 2][i % 3] * v; }
    return `${header()}
      <h1>Stats</h1>
      <div class="statgrid">
        <div class="card stat"><div class="label">Total saved</div><div class="mid saved">${money(st.totalSavedCents)}</div></div>
        <div class="card stat"><div class="label">In-game cash</div><div class="mid cash">✦ ${money(state.wallet.balanceCents)}</div></div>
        <div class="card stat"><div class="label">Streak</div><div class="mid">🔥 ${st.currentStreak}</div><p class="tiny muted">Best: ${st.bestStreak}</p></div>
        <div class="card stat"><div class="label">Under budget</div><div class="mid">${S.periodsUnderBudget(state)}<span class="small muted"> / ${state.history.length}</span></div><p class="tiny muted">periods</p></div>
      </div>
      <section class="card"><h2>Saved each period</h2>${chart}</section>
      <section class="card"><h2>Milestones</h2><div class="badges">${badges.map((b) => `<span class="badge ${reached.has(b) ? "" : "dim"}">🏅 ${money(b)}</span>`).join("")}</div>
        <p class="tiny muted" style="margin-top:8px">Spent in the game so far: ✦ ${money(st.spentInGameCents)} on ${plural(state.owned.filter((o) => o.priceCents > 0).length, "item")}.</p></section>
      ${state.history.length ? `<section class="card"><h2>History</h2><ul class="list">${state.history.map((h) => {
        const over = h.spentCents > h.budgetCents;
        return `<li><div class="grow"><div class="title">${rangeLabel(h)}</div><div class="tiny muted">Spent ${money(h.spentCents)} of ${money(h.budgetCents)}${over ? ` · over by ${money(h.spentCents - h.budgetCents)}` : ""}</div></div><div class="amt ${h.earnedCents > 0 ? "earned" : "zero"}">+${money(h.earnedCents)}</div></li>`;
      }).join("")}</ul></section>` : ""}`;
  }

  // ---------- settings ----------
  function renderSettings() {
    const p = state.current, cur = state.settings;
    if (!draft.settings) {
      const src = state.pending || cur;
      draft.settings = { period: src.period, amount: inputMoney(src.budgetCents) };
    }
    const d = draft.settings;
    return `${header()}
      <h1>Settings</h1>
      <form class="card" data-form="budget" novalidate style="margin-top:14px">
        <h2>Budget</h2>
        <p class="small muted" style="margin-bottom:12px">Now ${money(cur.budgetCents)} per ${NOUN[cur.period]}. Changes start with your next period, on ${dayDate(p.end)}.</p>
        ${periodSeg("settings-period", d.period)}
        <label class="field"><span>Amount per ${NOUN[d.period]}</span><div class="money-input"><input inputmode="decimal" name="amount" value="${esc(d.amount)}" autocomplete="off"></div></label>
        <div class="error" data-slot="error" hidden></div>
        <button class="btn block" type="submit">Save change</button>
        ${state.pending ? `<div class="note small row" style="align-items:center"><span>Scheduled: ${money(state.pending.budgetCents)} per ${NOUN[state.pending.period]} from ${dayDate(p.end)}.</span><button class="btn small ghost" type="button" data-action="cancel-pending">Cancel</button></div>` : ""}
      </form>
      <section class="card">
        <h2>Your doll</h2>
        <div class="maker"><div class="stage">${dollImg(lookOf(), state.avatar.equipped, 2)}</div><div class="grow">${lookEditor(lookOf(), "avatar")}</div></div>
        <label class="field" style="margin-top:12px"><span>Your name</span><input type="text" data-bind="profile-name" maxlength="24" value="${esc(state.profile.name)}" autocomplete="off"></label>
      </section>
      <section class="card">
        <h2>Your data</h2>
        <p class="small muted" style="margin-bottom:12px">Everything stays in this browser on this device. No account, no bank connection.</p>
        <button class="btn danger block" type="button" data-action="reset">Erase everything and start over</button>
      </section>`;
  }

  // ---------- router ----------
  function route() {
    const h = location.hash.slice(1);
    return /^(home|log|mall|closet|stats|settings|store\/[a-z0-9-]+)$/.test(h) ? h : "home";
  }
  let lastRoute = null;
  function render() {
    renderedDay = today();
    if (!state) { app.innerHTML = renderOnboarding(); return; }
    const r = route();
    if (r !== lastRoute) {
      if (r !== "settings") draft.settings = null;
      if (r !== "log") editingId = null;
      if (!r.startsWith("store/") || (lastRoute && lastRoute !== r)) draft.tryOn = {};
      lastRoute = r;
    }
    let body;
    if (r === "log") body = renderLog();
    else if (r === "mall") body = renderMall();
    else if (r.startsWith("store/")) body = renderStore(r.slice(6));
    else if (r === "closet") body = renderCloset();
    else if (r === "stats") body = renderStats();
    else if (r === "settings") body = renderSettings();
    else body = renderHome();
    app.innerHTML = body + tabbar(r);
  }

  // ---------- feedback ----------
  let toastTimer = null;
  function showToast(msg, action) {
    toastEl.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button">${esc(action.label)}</button>` : ""}`;
    toastEl.hidden = false;
    if (action) toastEl.querySelector("button").onclick = () => { hideToast(); action.run(); };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, action ? 6000 : 2500);
  }
  function hideToast() { toastEl.hidden = true; toastEl.innerHTML = ""; }
  function showError(form, msg) { const el = form.querySelector('[data-slot="error"]'); el.textContent = msg; el.hidden = false; }

  function confetti() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const colors = ["#c8476d", "#7a4fc9", "#2f7d5b", "#f2b84b", "#f49ac1"];
    for (let i = 0; i < 70; i++) {
      const c = document.createElement("div");
      c.className = "confetti";
      c.style.left = Math.random() * 100 + "vw";
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = 1.6 + Math.random() * 1.6 + "s";
      c.style.animationDelay = Math.random() * 0.4 + "s";
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 4000);
    }
  }

  function celebrate(events, stores = []) {
    const earned = events.reduce((sum, e) => sum + e.period.earnedCents, 0);
    const badges = events.flatMap((e) => e.newMilestones);
    let emoji = "🛍️", title, body = "";
    if (events.length === 1) {
      const p = events[0].period, noun = NOUN[p.type], spent = `You spent ${money(p.spentCents)} of ${money(p.budgetCents)}.`;
      if (events[0].overspent) { emoji = "🌱"; title = `Your ${noun} is done`; body = `${spent} No new cash this time, but your wallet is untouched. Fresh start!`; }
      else if (p.earnedCents === 0) { emoji = "😮‍💨"; title = `Your ${noun} is done`; body = `${spent} Right on budget, so your streak lives on.`; }
      else { title = `Your ${noun} is done!`; body = spent; }
    } else if (events.length > 1) {
      const types = new Set(events.map((e) => e.period.type));
      emoji = earned > 0 ? "🛍️" : "🌱";
      title = `${events.length} ${types.size === 1 ? NOUN[events[0].period.type] + "s" : "periods"} wrapped up`;
      body = "These ended while you were away.";
    } else {
      emoji = "🔓"; title = "New store unlocked!";
    }
    const scrim = document.createElement("div");
    scrim.className = "scrim";
    scrim.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="m-title">
      <div class="emoji" aria-hidden="true">${emoji}</div>
      <h2 id="m-title">${esc(title)}</h2>
      ${body ? `<p class="muted">${esc(body)}</p>` : ""}
      ${earned > 0 ? `<div class="mid cash">+${money(earned)}</div><p class="small muted">in-game cash added to your wallet</p>` : ""}
      ${badges.length ? `<div class="badges center">${badges.map((b) => `<span class="badge">🏅 ${money(b)} saved</span>`).join("")}</div>` : ""}
      ${stores.length ? `<div class="unlocks">${stores.map((s) => `<p><strong>🔓 ${esc(s.name)}</strong> is open: ${esc(s.tagline.toLowerCase())}.</p>`).join("")}</div>` : ""}
      <button class="btn block" type="button">${earned > 0 || stores.length ? "Yay!" : "Got it"}</button>
    </div>`;
    const close = () => { scrim.remove(); document.removeEventListener("keydown", onKey); };
    const onKey = (e) => e.key === "Escape" && close();
    scrim.addEventListener("click", (e) => { if (e.target === scrim || e.target.closest("button")) close(); });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(scrim);
    scrim.querySelector("button").focus();
    if (earned > 0 || badges.length || stores.length) confetti();
  }

  // ---------- actions ----------
  function readExpense(form) {
    const fd = new FormData(form);
    const cents = M.parseDollars(fd.get("amount") || "");
    const date = state.current.type === "day" ? today() : String(fd.get("date") || "");
    if (!cents) return showError(form, "Enter an amount like 12 or 12.50.");
    if (cents > MAX_CENTS) return showError(form, "That's more than $1,000,000. Typo?");
    if (!M.validExpenseDate(state, date, today())) return showError(form, `Pick a date from ${dayDate(state.current.start)} to today.`);
    return { amountCents: cents, note: String(fd.get("note") || "").trim().slice(0, 80), date };
  }
  const keepScroll = (fn) => { const y = window.scrollY; fn(); window.scrollTo(0, y); };

  app.addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-action]");
    if (!el) return;
    const { action, value, id } = el.dataset;
    const lookAction = action.match(/^(look|avatar)-(skin|hair|haircolor|eyes)$/);
    if (lookAction) {
      const key = { skin: "skin", hair: "hair", haircolor: "hairColor", eyes: "eyes" }[lookAction[2]];
      if (lookAction[1] === "look") draft.look[key] = value;
      else { state.avatar[key] = value; save(); }
      keepScroll(render);
      return;
    }
    switch (action) {
      case "onboard-next": draft.step = "budget"; render(); break;
      case "onboard-back": draft.step = "look"; render(); break;
      case "onboard-period": draft.onboard.period = value; render(); break;
      case "settings-period": draft.settings.period = value; keepScroll(render); break;
      case "edit": editingId = id; render(); { const i = app.querySelector('form[data-form="edit"] [name="amount"]'); if (i) i.focus(); } break;
      case "cancel-edit": editingId = null; render(); break;
      case "delete": {
        const idx = state.expenses.findIndex((e) => e.id === id);
        if (idx < 0) return;
        const [removed] = state.expenses.splice(idx, 1);
        save(); render();
        showToast(`Deleted ${money(removed.amountCents)}`, { label: "Undo", run: () => { if (state && M.validExpenseDate(state, removed.date, today())) { state.expenses.push(removed); save(); render(); } } });
        break;
      }
      case "cancel-pending": state.pending = null; draft.settings = null; save(); render(); showToast("Budget change cancelled"); break;
      case "tryon": if (draft.tryOn[id]) delete draft.tryOn[id]; else draft.tryOn[id] = true; keepScroll(render); break;
      case "clear-tryon": draft.tryOn = {}; keepScroll(render); break;
      case "wear-tried": {
        for (const k of Object.keys(draft.tryOn)) if (S.owns(state, k)) state.avatar.equipped = S.equip(state.avatar.equipped, S.item(k));
        draft.tryOn = {}; save(); keepScroll(render); showToast("Changed your outfit");
        break;
      }
      case "buy": {
        const ids = Object.keys(draft.tryOn).filter((k) => !S.owns(state, k));
        const owned = Object.keys(draft.tryOn).filter((k) => S.owns(state, k));
        const r = S.buy(state, ids);
        if (r.error) { showToast(r.error); return; }
        for (const k of owned) state.avatar.equipped = S.equip(state.avatar.equipped, S.item(k));
        draft.tryOn = {}; save(); keepScroll(render); confetti();
        showToast(`Bought for ${money(r.totalCents)}! It's in your closet.`, { label: "Undo", run: () => { S.undoBuy(state, r); save(); render(); } });
        break;
      }
      case "toggle-wear": {
        const it = S.item(id);
        state.avatar.equipped = S.isEquipped(state.avatar.equipped, it) ? S.unequip(state.avatar.equipped, it) : S.equip(state.avatar.equipped, it);
        save(); keepScroll(render);
        break;
      }
      case "closet-filter": draft.closetFilter = value; keepScroll(render); break;
      case "wear-outfit": S.wearOutfit(state, id); save(); window.scrollTo(0, 0); render(); showToast("Outfit on"); break;
      case "delete-outfit": state.outfits = state.outfits.filter((o) => o.id !== id); save(); keepScroll(render); break;
      case "reset": {
        if (!confirm("Erase all Window Shop data in this browser? This can't be undone.")) return;
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
        state = null;
        draft.step = "look"; draft.look = { ...S.DEFAULT_LOOK }; draft.name = ""; draft.onboard = { period: "week", amount: "" };
        history.replaceState(null, "", location.pathname + location.search);
        render();
        break;
      }
    }
  });

  app.addEventListener("change", (ev) => {
    if (ev.target.dataset.actionChange === "closet-store") { draft.closetStore = ev.target.value; keepScroll(render); }
  });

  app.addEventListener("input", (ev) => {
    const t = ev.target;
    if (t.dataset.bind === "name") { draft.name = t.value; return; }
    if (t.dataset.bind === "profile-name") { state.profile.name = t.value.trim().slice(0, 24); save(); return; }
    const form = t.form;
    if (!form) return;
    const err = form.querySelector('[data-slot="error"]');
    if (err) err.hidden = true;
    if (t.name !== "amount") return;
    if (form.dataset.form === "onboard") { draft.onboard.amount = t.value; form.querySelector('[data-slot="preview"]').innerHTML = onboardPreview(); }
    else if (form.dataset.form === "budget") draft.settings.amount = t.value;
  });

  app.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const form = ev.target, kind = form.dataset.form;
    if (kind === "onboard") {
      const cents = M.parseDollars(draft.onboard.amount);
      if (!cents) return showError(form, "Enter an amount like 300 or 300.00.");
      if (cents > MAX_CENTS) return showError(form, "That's more than $1,000,000. Typo?");
      state = S.upgrade(M.newState(draft.onboard.period, cents, today()));
      Object.assign(state.avatar, draft.look);
      state.profile.name = draft.name.trim().slice(0, 24);
      save();
      if (location.hash !== "#home") location.hash = "home";
      render();
      return;
    }
    if (kind === "outfit") {
      const name = new FormData(form).get("outfitName") || "";
      S.saveOutfit(state, String(name), uid());
      save(); keepScroll(render); showToast("Look saved");
      return;
    }
    catchUp();
    if (!form.isConnected) return;
    if (kind === "add") {
      const e = readExpense(form);
      if (!e) return;
      state.expenses.push({ id: uid(), createdAt: Date.now(), ...e });
      save(); render(); showToast(`Logged ${money(e.amountCents)}`);
      const i = app.querySelector('form [name="amount"]'); if (i) i.focus();
    } else if (kind === "edit") {
      const e = readExpense(form);
      if (!e) return;
      const target = state.expenses.find((x) => x.id === form.dataset.id);
      if (target) Object.assign(target, e);
      editingId = null; save(); render(); showToast("Saved");
    } else if (kind === "budget") {
      const cents = M.parseDollars(draft.settings.amount);
      if (!cents) return showError(form, "Enter an amount like 300 or 300.00.");
      if (cents > MAX_CENTS) return showError(form, "That's more than $1,000,000. Typo?");
      const same = cents === state.settings.budgetCents && draft.settings.period === state.settings.period;
      state.pending = same ? null : { period: draft.settings.period, budgetCents: cents };
      draft.settings = null; save(); render();
      showToast(same ? "No change from your current budget" : `Saved. Starts ${dayDate(state.current.end)}.`);
    }
  });

  window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });
  window.addEventListener("storage", (ev) => { if (ev.key === STORAGE_KEY) { state = load(); render(); } });
  function tick() {
    catchUp();
    const typing = document.activeElement && document.activeElement.tagName === "INPUT";
    if (today() !== renderedDay && !typing) render();
  }
  setInterval(tick, 60000);
  document.addEventListener("visibilitychange", () => !document.hidden && tick());

  if (state) save(); // persist any upgrade from an older save
  render();
  catchUp();
})();
