// Window Shop: UI for the first build (budget, expense log, wallet, total saved).
// Money rules live in money.js; this file only renders and saves.
(function () {
  "use strict";
  const M = window.Money;
  const app = document.getElementById("app");
  const toastEl = document.getElementById("toast");

  // ---------- time & storage ----------
  // Dev hook: open index.html?today=2026-11-23 to pretend it's that date.
  // Test mode saves to a separate key so it never touches real data.
  const fakeToday = (() => {
    const v = new URLSearchParams(location.search).get("today");
    return /^\d{4}-\d{2}-\d{2}$/.test(v || "") ? v : null;
  })();
  const STORAGE_KEY = fakeToday ? "windowshop:v1:test" : "windowshop:v1";
  const today = () => fakeToday || M.toYmd(new Date());
  const MAX_CENTS = 100000000; // $1,000,000 sanity cap

  function load() {
    let raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (s && s.version === 1 && s.current) return s;
    } catch (e) {
      /* fall through */
    }
    // Unreadable data: keep a copy instead of silently overwriting it.
    try {
      if (raw) localStorage.setItem(STORAGE_KEY + ":unreadable", raw);
    } catch (e) {
      /* ignore */
    }
    return null;
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      showToast("Couldn't save. This browser may be blocking storage.");
    }
  }

  const uid = () =>
    (window.crypto && crypto.randomUUID && crypto.randomUUID()) ||
    Date.now().toString(36) + Math.random().toString(36).slice(2);

  // ---------- formatting ----------
  const usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const usd2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
  const money = (c) => (c % 100 === 0 ? usd0 : usd2).format(c / 100);
  const inputMoney = (c) => (c % 100 === 0 ? String(c / 100) : (c / 100).toFixed(2));

  const asDate = (ymd) => {
    const [y, m, d] = ymd.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
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
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);

  // "That's 3 pairs of jeans you didn't buy." (spec §3.4)
  const COMPARISONS = [
    { cents: 30000, one: "a designer-style bag", many: "designer-style bags" },
    { cents: 9000, one: "a sundress", many: "sundresses" },
    { cents: 6000, one: "a pair of jeans", many: "pairs of jeans" },
    { cents: 3500, one: "a going-out top", many: "going-out tops" },
    { cents: 650, one: "an iced latte", many: "iced lattes" },
  ];
  function comparison(total) {
    for (const c of COMPARISONS) {
      const n = Math.floor(total / c.cents);
      if (n >= 2) return `That's ${n} ${c.many} you didn't buy.`;
    }
    for (const c of COMPARISONS) {
      if (total >= c.cents) return `That's ${c.one} you didn't buy.`;
    }
    return null;
  }

  // ---------- state ----------
  let state = load();
  let editingId = null;
  const draft = { onboard: { period: "week", amount: "" }, settings: null };
  let renderedDay = null;

  // Close any periods that ended while the app was closed.
  function catchUp() {
    if (!state) return;
    const events = M.closeDuePeriods(state, today());
    if (events.length) {
      editingId = null;
      save();
      render();
      celebrate(events);
    }
  }

  // ---------- views ----------
  function segmented(action, value) {
    return `<div class="seg" role="group" aria-label="Budget period">${["day", "week", "month"]
      .map(
        (t) =>
          `<button type="button" data-action="${action}" data-value="${t}" aria-pressed="${t === value}">${ADJ[t]}</button>`
      )
      .join("")}</div>`;
  }

  function header() {
    const total = state.stats.totalSavedCents;
    return `<header class="topbar">
      <div class="wordmark">Window <span>Shop</span></div>
      <span class="pill saved" title="Real money you've kept">💰 ${money(total)} saved</span>
    </header>
    ${fakeToday ? `<div class="note warn tiny" style="margin:0 0 14px">Test mode: pretending today is ${dayDate(fakeToday)}. Uses separate test data.</div>` : ""}`;
  }

  function tabbar(route) {
    const tab = (id, ico, label) =>
      `<a href="#${id}" ${route === id ? 'aria-current="page"' : ""}><span class="ico" aria-hidden="true">${ico}</span>${label}</a>`;
    return `<div class="tabbar"><nav aria-label="Main">${tab("home", "🏠", "Home")}${tab("log", "🧾", "Log")}${tab(
      "settings",
      "⚙️",
      "Settings"
    )}</nav></div>`;
  }

  function onboardPreview() {
    const d = draft.onboard;
    const cents = M.parseDollars(d.amount);
    if (!cents || cents > MAX_CENTS) return "";
    const p = M.makePeriod(d.period, cents, today());
    if (p.prorated) {
      return `<div class="note small">Your first ${NOUN[d.period]} is short (${p.days} of ${p.fullDays} days, ${rangeLabel(
        p
      )}), so its budget is <strong>${money(p.budgetCents)}</strong>. After that it's ${money(cents)} every ${
        NOUN[d.period]
      }.</div>`;
    }
    return "";
  }

  function renderOnboarding() {
    const d = draft.onboard;
    return `<div class="onboard">
      <div class="wordmark">Window <span>Shop</span></div>
      <p class="tagline">Shop like crazy and spend nothing real.</p>
      <ol class="how">
        <li><span class="n">1</span><span>Set a real-life budget and log what you actually spend.</span></li>
        <li><span class="n">2</span><span>Whatever you <strong>don't</strong> spend becomes in-game cash.</span></li>
        <li><span class="n">3</span><span>Spend it dressing your avatar. Stores and closet are coming next.</span></li>
      </ol>
      <form class="card" data-form="onboard" novalidate>
        <h2>Your budget</h2>
        ${segmented("onboard-period", d.period)}
        <label class="field"><span>How much can you spend each ${NOUN[d.period]}?</span>
          <div class="money-input"><input inputmode="decimal" name="amount" placeholder="300" value="${esc(
            d.amount
          )}" autocomplete="off"></div>
        </label>
        <div class="error" data-slot="error" hidden></div>
        <div data-slot="preview">${onboardPreview()}</div>
        <button class="btn block" type="submit" style="margin-top:14px">Start saving</button>
        <p class="tiny muted" style="margin-top:10px">No bank connection. You type in what you spend; the game takes your word for it.</p>
      </form>
    </div>`;
  }

  function renderHome() {
    const t = today();
    const p = state.current;
    const s = M.currentSummary(state, t);
    const st = state.stats;
    const noun = NOUN[p.type];
    const pct = p.budgetCents > 0 ? Math.min(100, (s.spentCents / p.budgetCents) * 100) : 100;
    const payday = s.daysLeft === 1 ? "tomorrow" : `on ${dayDate(p.end)}`;
    const cmp = comparison(st.totalSavedCents);
    const next = M.nextMilestone(st.totalSavedCents);

    // Name the streak after the periods it's made of (they may predate a budget change).
    const streakPeriods = state.history.slice(0, st.currentStreak);
    const streakNoun = streakPeriods.every((h) => h.type === streakPeriods[0].type)
      ? NOUN[streakPeriods[0] ? streakPeriods[0].type : p.type]
      : "period";
    const streakChip =
      st.currentStreak > 0
        ? `<span class="chip">🔥 ${st.currentStreak}-${streakNoun} streak</span>`
        : `<span class="chip">🔥 Stay under budget to start a streak</span>`;

    const history = state.history.slice(0, 6);
    const oneType = history.every((h) => h.type === history[0].type);
    const historyCard = history.length
      ? `<section class="card"><h2>${oneType ? `Past ${NOUN[history[0].type]}s` : "History"}</h2><ul class="list">${history
          .map((h) => {
            const over = h.spentCents > h.budgetCents;
            return `<li><div class="grow"><div class="title">${rangeLabel(h)}</div><div class="tiny muted">Spent ${money(
              h.spentCents
            )} of ${money(h.budgetCents)}${over ? ` · over by ${money(h.spentCents - h.budgetCents)}` : ""}</div></div>
            <div class="amt ${h.earnedCents > 0 ? "earned" : "zero"}">+${money(h.earnedCents)}</div></li>`;
          })
          .join("")}</ul></section>`
      : "";

    const pendingNote = state.pending
      ? `<div class="note small">From ${dayDate(p.end)}: ${money(state.pending.budgetCents)} per ${NOUN[state.pending.period]}.</div>`
      : "";

    return `${header()}
      <section class="card hero">
        <div class="label">Total saved</div>
        <div class="big">${money(st.totalSavedCents)}</div>
        <p class="small muted" style="margin-top:6px">${
          cmp ? esc(cmp) : `Real money you kept. Your first payout lands ${payday}.`
        }</p>
        <div class="chips">
          ${streakChip}
          ${st.bestStreak > 0 ? `<span class="chip">Best: ${st.bestStreak}</span>` : ""}
          <span class="chip">🏅 Next: ${money(next)}</span>
        </div>
      </section>

      <section class="card wallet">
        <div class="label">In-game cash</div>
        <div class="mid">✦ ${money(state.wallet.balanceCents)}</div>
        <p class="small muted">Fake money for your avatar's shopping. It carries over, so you can save up.</p>
        ${
          s.overspent
            ? `<div class="note warn">You're over budget this ${noun}, so no new cash this time. Your wallet stays safe.</div>`
            : `<div class="note cash">On track to earn <strong>+${money(s.onTrackToEarnCents)}</strong> when this ${noun} ends ${payday}.</div>`
        }
      </section>

      <section class="card">
        <div class="row"><div class="label">${THIS[p.type]} · ${rangeLabel(p)}</div>
          <span class="tiny muted">${p.type === "day" ? "Resets at midnight" : `${plural(s.daysLeft, "day")} left`}</span></div>
        <div class="mid">${money(Math.abs(s.leftCents))} <span class="small muted" style="font-family:var(--body);font-weight:400">${
          s.leftCents >= 0 ? "real money left" : "over budget"
        }</span></div>
        <div class="bar ${s.overspent ? "over" : ""}" role="progressbar" aria-label="Spent ${THIS[p.type].toLowerCase()}"
          aria-valuemin="0" aria-valuemax="${p.budgetCents}" aria-valuenow="${Math.min(s.spentCents, p.budgetCents)}">
          <div style="width:${pct}%"></div></div>
        <p class="small muted">${money(s.spentCents)} spent of ${money(p.budgetCents)}</p>
        ${
          p.prorated
            ? `<p class="tiny muted" style="margin-top:4px">Short ${noun} (${p.days} of ${p.fullDays} days), so the budget is prorated from ${money(
                p.fullBudgetCents
              )}.</p>`
            : ""
        }
        ${pendingNote}
        <a class="btn block" href="#log" style="margin-top:14px">+ Log spending</a>
      </section>
      ${historyCard}`;
  }

  function expenseForm(kind, e) {
    const t = today();
    const p = state.current;
    const dateField =
      p.type === "day"
        ? ""
        : `<label class="field"><span>Date</span><input type="date" name="date" value="${e ? e.date : t}" min="${
            p.start
          }" max="${t}"></label>`;
    return `<form data-form="${kind}" ${e ? `data-id="${e.id}"` : ""} novalidate>
      <label class="field"><span>Amount</span><div class="money-input"><input inputmode="decimal" name="amount" placeholder="0.00"
        value="${e ? inputMoney(e.amountCents) : ""}" autocomplete="off"></div></label>
      <label class="field"><span>Note <span class="muted" style="font-weight:400">(optional)</span></span>
        <input type="text" name="note" maxlength="80" placeholder="Target run" value="${e ? esc(e.note) : ""}" autocomplete="off"></label>
      ${dateField}
      <div class="error" data-slot="error" hidden></div>
      ${
        e
          ? `<div class="grid2"><button class="btn ghost" type="button" data-action="cancel-edit">Cancel</button><button class="btn" type="submit">Save</button></div>`
          : `<button class="btn block" type="submit">Add expense</button>`
      }
    </form>`;
  }

  function renderLog() {
    const t = today();
    const p = state.current;
    const s = M.currentSummary(state, t);
    const items = state.expenses
      .filter((e) => M.inPeriod(p, e.date))
      .sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1));

    const rows = items
      .map((e) =>
        e.id === editingId
          ? `<li class="editing">${expenseForm("edit", e)}</li>`
          : `<li><div class="grow"><div class="title">${e.note ? esc(e.note) : '<span class="muted">Purchase</span>'}</div>
              <div class="tiny muted">${dayDate(e.date)}</div></div>
              <div class="amt">${money(e.amountCents)}</div>
              <button class="icon-btn" type="button" data-action="edit" data-id="${e.id}" aria-label="Edit ${money(
                e.amountCents
              )} expense">Edit</button>
              <button class="icon-btn" type="button" data-action="delete" data-id="${e.id}" aria-label="Delete ${money(
                e.amountCents
              )} expense">Delete</button></li>`
      )
      .join("");

    return `${header()}
      <h1>Log spending</h1>
      <p class="muted" style="margin-bottom:14px">Real-life purchases, anything that counts against your budget.</p>
      <section class="card">${expenseForm("add")}</section>
      <section class="card">
        <div class="row"><h2>${THIS[p.type]}</h2><span class="small muted">${rangeLabel(p)}</span></div>
        ${
          items.length
            ? `<ul class="list">${rows}</ul>`
            : `<p class="empty muted">Nothing logged yet ${THIS[p.type].toLowerCase()}.</p>`
        }
        <div class="row" style="border-top:1px solid var(--line);padding-top:12px;margin-top:4px">
          <strong>Total</strong>
          <strong class="num">${money(s.spentCents)} <span class="muted" style="font-weight:400">of ${money(p.budgetCents)}</span></strong>
        </div>
        <p class="tiny muted" style="margin-top:8px">${
          p.type === "day"
            ? "Entries are for today."
            : `You can log anything from ${dayDate(p.start)} to today. Past ${NOUN[p.type]}s are locked once they've paid out.`
        }</p>
      </section>`;
  }

  function renderSettings() {
    const p = state.current;
    const cur = state.settings;
    if (!draft.settings) {
      const src = state.pending || cur;
      draft.settings = { period: src.period, amount: inputMoney(src.budgetCents) };
    }
    const d = draft.settings;
    return `${header()}
      <h1>Settings</h1>
      <form class="card" data-form="budget" novalidate style="margin-top:14px">
        <h2>Budget</h2>
        <p class="small muted" style="margin-bottom:12px">Now ${money(cur.budgetCents)} per ${NOUN[cur.period]}. Changes start with your next period, on ${dayDate(
          p.end
        )}.</p>
        ${segmented("settings-period", d.period)}
        <label class="field"><span>Amount per ${NOUN[d.period]}</span>
          <div class="money-input"><input inputmode="decimal" name="amount" value="${esc(d.amount)}" autocomplete="off"></div></label>
        <div class="error" data-slot="error" hidden></div>
        <button class="btn block" type="submit">Save change</button>
        ${
          state.pending
            ? `<div class="note small row" style="align-items:center">
                <span>Scheduled: ${money(state.pending.budgetCents)} per ${NOUN[state.pending.period]} from ${dayDate(p.end)}.</span>
                <button class="btn small ghost" type="button" data-action="cancel-pending">Cancel</button></div>`
            : ""
        }
      </form>
      <section class="card">
        <h2>Your data</h2>
        <p class="small muted" style="margin-bottom:12px">Everything stays in this browser on this device. No account, no bank connection.</p>
        <button class="btn danger block" type="button" data-action="reset">Erase everything and start over</button>
      </section>`;
  }

  function route() {
    const h = location.hash.slice(1);
    return ["home", "log", "settings"].includes(h) ? h : "home";
  }

  function render() {
    renderedDay = today();
    if (!state) {
      app.innerHTML = renderOnboarding();
      return;
    }
    const r = route();
    if (r !== "settings") draft.settings = null;
    if (r !== "log") editingId = null;
    const body = r === "log" ? renderLog() : r === "settings" ? renderSettings() : renderHome();
    app.innerHTML = body + tabbar(r);
  }

  // ---------- feedback ----------
  let toastTimer = null;
  function showToast(msg, action) {
    toastEl.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button">${esc(action.label)}</button>` : ""}`;
    toastEl.hidden = false;
    if (action) {
      toastEl.querySelector("button").onclick = () => {
        hideToast();
        action.run();
      };
    }
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, action ? 6000 : 2500);
  }
  function hideToast() {
    toastEl.hidden = true;
    toastEl.innerHTML = "";
  }

  function showError(form, msg) {
    const el = form.querySelector('[data-slot="error"]');
    el.textContent = msg;
    el.hidden = false;
  }

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

  // The payday moment: shown when one or more periods close.
  function celebrate(events) {
    const earned = events.reduce((sum, e) => sum + e.period.earnedCents, 0);
    const badges = events.flatMap((e) => e.newMilestones);
    let emoji, title, body;
    if (events.length === 1) {
      const p = events[0].period;
      const noun = NOUN[p.type];
      const spent = `You spent ${money(p.spentCents)} of ${money(p.budgetCents)}.`;
      if (events[0].overspent) {
        emoji = "🌱";
        title = `Your ${noun} is done`;
        body = `${spent} No new cash this time, but your wallet is untouched. Fresh start!`;
      } else if (p.earnedCents === 0) {
        emoji = "😮‍💨";
        title = `Your ${noun} is done`;
        body = `${spent} Right on budget, so your streak lives on.`;
      } else {
        emoji = "🛍️";
        title = `Your ${noun} is done!`;
        body = spent;
      }
    } else {
      const types = new Set(events.map((e) => e.period.type));
      const word = types.size === 1 ? NOUN[events[0].period.type] + "s" : "periods";
      emoji = earned > 0 ? "🛍️" : "🌱";
      title = `${events.length} ${word} wrapped up`;
      body = `These ended while you were away.`;
    }

    const scrim = document.createElement("div");
    scrim.className = "scrim";
    scrim.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="m-title">
      <div class="emoji" aria-hidden="true">${emoji}</div>
      <h2 id="m-title">${esc(title)}</h2>
      <p class="muted">${esc(body)}</p>
      ${
        earned > 0
          ? `<div class="mid" style="color:var(--cash)">+${money(earned)}</div><p class="small muted">in-game cash added to your wallet</p>`
          : ""
      }
      ${badges.length ? `<div class="badges">${badges.map((b) => `<span class="badge">🏅 ${money(b)} saved</span>`).join("")}</div>` : ""}
      <button class="btn block" type="button">${earned > 0 ? "Yay!" : "Got it"}</button>
    </div>`;
    const close = () => {
      scrim.remove();
      document.removeEventListener("keydown", onKey);
    };
    const onKey = (e) => e.key === "Escape" && close();
    scrim.addEventListener("click", (e) => {
      if (e.target === scrim || e.target.closest("button")) close();
    });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(scrim);
    scrim.querySelector("button").focus();
    if (earned > 0 || badges.length) confetti();
  }

  // ---------- actions ----------
  function readExpense(form) {
    const fd = new FormData(form);
    const cents = M.parseDollars(fd.get("amount") || "");
    const date = state.current.type === "day" ? today() : String(fd.get("date") || "");
    if (!cents) return showError(form, "Enter an amount like 12 or 12.50.");
    if (cents > MAX_CENTS) return showError(form, "That's more than $1,000,000. Typo?");
    if (!M.validExpenseDate(state, date, today())) {
      return showError(form, `Pick a date from ${dayDate(state.current.start)} to today.`);
    }
    return { amountCents: cents, note: String(fd.get("note") || "").trim().slice(0, 80), date };
  }

  function focusAmount() {
    const input = app.querySelector('form [name="amount"]');
    if (input) input.focus();
  }

  app.addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-action]");
    if (!el) return;
    const { action, value, id } = el.dataset;

    if (action === "onboard-period") {
      draft.onboard.period = value;
      render();
    } else if (action === "settings-period") {
      draft.settings.period = value;
      render();
    } else if (action === "edit") {
      editingId = id;
      render();
      const input = app.querySelector('form[data-form="edit"] [name="amount"]');
      if (input) input.focus();
    } else if (action === "cancel-edit") {
      editingId = null;
      render();
    } else if (action === "delete") {
      const idx = state.expenses.findIndex((e) => e.id === id);
      if (idx < 0) return;
      const [removed] = state.expenses.splice(idx, 1);
      save();
      render();
      showToast(`Deleted ${money(removed.amountCents)}`, {
        label: "Undo",
        run: () => {
          if (state && M.validExpenseDate(state, removed.date, today())) {
            state.expenses.push(removed);
            save();
            render();
          }
        },
      });
    } else if (action === "cancel-pending") {
      state.pending = null;
      draft.settings = null;
      save();
      render();
      showToast("Budget change cancelled");
    } else if (action === "reset") {
      if (!confirm("Erase all Window Shop data in this browser? This can't be undone.")) return;
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        /* ignore */
      }
      state = null;
      draft.onboard = { period: "week", amount: "" };
      history.replaceState(null, "", location.pathname + location.search);
      render();
    }
  });

  app.addEventListener("input", (ev) => {
    const form = ev.target.form;
    if (!form) return;
    const err = form.querySelector('[data-slot="error"]');
    if (err) err.hidden = true;
    if (ev.target.name !== "amount") return;
    if (form.dataset.form === "onboard") {
      draft.onboard.amount = ev.target.value;
      form.querySelector('[data-slot="preview"]').innerHTML = onboardPreview();
    } else if (form.dataset.form === "budget") {
      draft.settings.amount = ev.target.value;
    }
  });

  app.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const form = ev.target;
    const kind = form.dataset.form;

    if (kind === "onboard") {
      const cents = M.parseDollars(draft.onboard.amount);
      if (!cents) return showError(form, "Enter an amount like 300 or 300.00.");
      if (cents > MAX_CENTS) return showError(form, "That's more than $1,000,000. Typo?");
      state = M.newState(draft.onboard.period, cents, today());
      save();
      if (location.hash !== "#home") location.hash = "home";
      render();
      return;
    }

    catchUp(); // in case a period ended while this screen was open
    if (!form.isConnected) return; // catchUp re-rendered; the user will see why

    if (kind === "add") {
      const e = readExpense(form);
      if (!e) return;
      state.expenses.push({ id: uid(), createdAt: Date.now(), ...e });
      save();
      render();
      showToast(`Logged ${money(e.amountCents)}`);
      focusAmount();
    } else if (kind === "edit") {
      const e = readExpense(form);
      if (!e) return;
      const target = state.expenses.find((x) => x.id === form.dataset.id);
      if (target) Object.assign(target, e);
      editingId = null;
      save();
      render();
      showToast("Saved");
    } else if (kind === "budget") {
      const cents = M.parseDollars(draft.settings.amount);
      if (!cents) return showError(form, "Enter an amount like 300 or 300.00.");
      if (cents > MAX_CENTS) return showError(form, "That's more than $1,000,000. Typo?");
      const same = cents === state.settings.budgetCents && draft.settings.period === state.settings.period;
      state.pending = same ? null : { period: draft.settings.period, budgetCents: cents };
      draft.settings = null;
      save();
      render();
      showToast(same ? "No change from your current budget" : `Saved. Starts ${dayDate(state.current.end)}.`);
    }
  });

  window.addEventListener("hashchange", render);

  // Another tab changed the data: pick it up.
  window.addEventListener("storage", (ev) => {
    if (ev.key === STORAGE_KEY) {
      state = load();
      render();
    }
  });

  // If the app stays open past midnight / Monday / the 1st, roll over.
  function tick() {
    catchUp();
    const typing = document.activeElement && document.activeElement.tagName === "INPUT";
    if (today() !== renderedDay && !typing) render();
  }
  setInterval(tick, 60000);
  document.addEventListener("visibilitychange", () => !document.hidden && tick());

  // ---------- start ----------
  render();
  catchUp();
})();
