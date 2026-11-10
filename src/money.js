// Window Shop: money rules (spec §3). Pure functions, no DOM.
// All money is stored as integer cents. All dates are local "YYYY-MM-DD" strings.
// Works as a browser global (window.Money) and as a Node module (for tests).
(function (root) {
  "use strict";

  const MS_PER_DAY = 86400000;

  // ---------- dates ----------

  function toYmd(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function parseYmd(ymd) {
    const [y, m, d] = ymd.split("-").map(Number);
    return { y, m, d };
  }

  // Day number since epoch, computed in UTC so DST never shifts it.
  function dayNumber(ymd) {
    const { y, m, d } = parseYmd(ymd);
    return Math.round(Date.UTC(y, m - 1, d) / MS_PER_DAY);
  }

  function fromDayNumber(n) {
    const dt = new Date(n * MS_PER_DAY);
    const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const d = String(dt.getUTCDate()).padStart(2, "0");
    return `${dt.getUTCFullYear()}-${m}-${d}`;
  }

  function addDays(ymd, days) {
    return fromDayNumber(dayNumber(ymd) + days);
  }

  function daysBetween(a, b) {
    return dayNumber(b) - dayNumber(a);
  }

  function daysInMonth(y, m) {
    return new Date(Date.UTC(y, m, 0)).getUTCDate();
  }

  // ---------- periods (spec §3.1) ----------
  // A period runs from `start` (inclusive) to `end` (exclusive).
  // Day: resets at midnight. Week: resets Monday. Month: resets on the 1st.

  function periodStart(type, ymd) {
    if (type === "day") return ymd;
    if (type === "week") {
      const dow = new Date(dayNumber(ymd) * MS_PER_DAY).getUTCDay(); // 0 = Sun
      return addDays(ymd, -((dow + 6) % 7)); // back to Monday
    }
    if (type === "month") {
      const { y, m } = parseYmd(ymd);
      return `${y}-${String(m).padStart(2, "0")}-01`;
    }
    throw new Error(`Unknown period type: ${type}`);
  }

  function nextBoundary(type, ymd) {
    if (type === "day") return addDays(ymd, 1);
    if (type === "week") return addDays(periodStart("week", ymd), 7);
    if (type === "month") {
      const { y, m } = parseYmd(ymd);
      return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
    }
    throw new Error(`Unknown period type: ${type}`);
  }

  function fullLength(type, ymd) {
    if (type === "day") return 1;
    if (type === "week") return 7;
    const { y, m } = parseYmd(ymd);
    return daysInMonth(y, m);
  }

  // A period starting on `start` runs to the next reset boundary. If that's a
  // partial period (e.g. you start on a Thursday), the budget is prorated by
  // days so total saved isn't inflated by a short first period.
  function makePeriod(type, budgetCents, start) {
    const end = nextBoundary(type, start);
    const days = daysBetween(start, end);
    const full = fullLength(type, start);
    return {
      type,
      start,
      end,
      days,
      fullDays: full,
      fullBudgetCents: budgetCents,
      budgetCents: Math.round((budgetCents * days) / full),
      prorated: days < full,
      spentCents: 0,
      earnedCents: 0,
      closed: false,
    };
  }

  // ---------- spending ----------

  function inPeriod(period, ymd) {
    return ymd >= period.start && ymd < period.end;
  }

  function spentIn(period, expenses) {
    return expenses
      .filter((e) => inPeriod(period, e.date))
      .reduce((sum, e) => sum + e.amountCents, 0);
  }

  // ---------- milestones (spec §3.4) ----------
  // $50, $100, $250, $500, $1k, $2.5k, $5k, $10k, ... (in cents)
  function* milestones() {
    for (let mag = 1000; ; mag *= 10) {
      for (const s of [1, 2.5, 5]) {
        if (s * mag >= 5000) yield s * mag; // first milestone is $50
      }
    }
  }

  function milestonesUpTo(totalCents) {
    const out = [];
    for (const v of milestones()) {
      if (v > totalCents) return out;
      out.push(v);
    }
  }

  function nextMilestone(totalCents) {
    for (const v of milestones()) if (v > totalCents) return v;
  }

  // ---------- state ----------

  function newState(type, budgetCents, today) {
    return {
      version: 1,
      settings: { period: type, budgetCents, startDate: today },
      pending: null, // { period, budgetCents } — applies from next period (spec §3.1)
      expenses: [], // { id, amountCents, note, date }
      current: makePeriod(type, budgetCents, today),
      history: [], // closed periods, newest first
      wallet: { balanceCents: 0 },
      stats: { totalSavedCents: 0, currentStreak: 0, bestStreak: 0, milestones: [] },
    };
  }

  // Close every period that has ended by `today` (spec §3.3, §3.4).
  // Mutates `state`; returns one event per closed period for the UI to celebrate.
  function closeDuePeriods(state, today) {
    const events = [];
    while (state.current.end <= today) {
      const p = state.current;
      p.spentCents = spentIn(p, state.expenses);
      p.earnedCents = Math.max(0, p.budgetCents - p.spentCents);
      p.closed = true;

      // Earnings land in the wallet and in total saved. Overspending earns $0
      // but never takes away cash already in the wallet.
      state.wallet.balanceCents += p.earnedCents;
      state.stats.totalSavedCents += p.earnedCents;

      // Streak: only overspending resets it (spec §11, current plan).
      const overspent = p.spentCents > p.budgetCents;
      if (overspent) {
        state.stats.currentStreak = 0;
      } else {
        state.stats.currentStreak += 1;
        state.stats.bestStreak = Math.max(state.stats.bestStreak, state.stats.currentStreak);
      }

      const reached = milestonesUpTo(state.stats.totalSavedCents);
      const newMilestones = reached.filter((m) => !state.stats.milestones.includes(m));
      state.stats.milestones = reached;

      state.history.unshift(p);
      events.push({ period: p, overspent, newMilestones });

      // A budget change waiting for this period to end takes effect now.
      if (state.pending) {
        state.settings.period = state.pending.period;
        state.settings.budgetCents = state.pending.budgetCents;
        state.pending = null;
      }
      state.current = makePeriod(state.settings.period, state.settings.budgetCents, p.end);
    }
    return events;
  }

  // Live numbers for the open period.
  function currentSummary(state, today) {
    const p = state.current;
    const spent = spentIn(p, state.expenses);
    return {
      spentCents: spent,
      leftCents: p.budgetCents - spent, // negative = over budget
      onTrackToEarnCents: Math.max(0, p.budgetCents - spent),
      daysLeft: daysBetween(today, p.end),
      overspent: spent > p.budgetCents,
    };
  }

  // Expenses can only be dated inside the open period, up to today. Closed
  // periods are final because their cash has already been paid out.
  function validExpenseDate(state, ymd, today) {
    return /^\d{4}-\d{2}-\d{2}$/.test(ymd) && ymd >= state.current.start && ymd <= today;
  }

  // "$12.50" / "12.5" / "12" -> 1250. Returns null if not a positive amount.
  function parseDollars(text) {
    const cleaned = String(text).replace(/[$,\s]/g, "");
    if (!/^\d+(\.\d{0,2})?$/.test(cleaned) && !/^\.\d{1,2}$/.test(cleaned)) return null;
    const cents = Math.round(parseFloat(cleaned) * 100);
    return cents > 0 ? cents : null;
  }

  const api = {
    toYmd,
    addDays,
    daysBetween,
    periodStart,
    nextBoundary,
    makePeriod,
    inPeriod,
    spentIn,
    milestonesUpTo,
    nextMilestone,
    newState,
    closeDuePeriods,
    currentSummary,
    validExpenseDate,
    parseDollars,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Money = api;
})(typeof window !== "undefined" ? window : globalThis);
