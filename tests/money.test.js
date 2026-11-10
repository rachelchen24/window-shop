// Run with: node --test
const test = require("node:test");
const assert = require("node:assert/strict");
const M = require("../src/money.js");

const exp = (id, dollars, date) => ({ id, amountCents: dollars * 100, note: "", date });

test("week periods reset on Monday", () => {
  // 2026-11-10 is a Tuesday
  assert.equal(M.periodStart("week", "2026-11-10"), "2026-11-09");
  assert.equal(M.nextBoundary("week", "2026-11-10"), "2026-11-16");
  assert.equal(M.nextBoundary("week", "2026-11-16"), "2026-11-23"); // a Monday starts a new week
  assert.equal(M.nextBoundary("week", "2026-11-15"), "2026-11-16"); // Sunday is the last day
});

test("month periods reset on the 1st, including across the year", () => {
  assert.equal(M.nextBoundary("month", "2026-11-10"), "2026-12-01");
  assert.equal(M.nextBoundary("month", "2026-12-31"), "2027-01-01");
  assert.equal(M.makePeriod("month", 100000, "2028-02-01").days, 29); // leap year
});

test("day periods reset at midnight and are never prorated", () => {
  const p = M.makePeriod("day", 2000, "2026-11-10");
  assert.equal(p.end, "2026-11-11");
  assert.equal(p.budgetCents, 2000);
  assert.equal(p.prorated, false);
});

test("a partial first period is prorated by days", () => {
  // Start on Tuesday: Tue..Sun = 6 of 7 days
  const w = M.makePeriod("week", 30000, "2026-11-10");
  assert.equal(w.days, 6);
  assert.equal(w.budgetCents, Math.round((30000 * 6) / 7));
  assert.equal(w.prorated, true);
  // Starting on a Monday is a full week
  assert.equal(M.makePeriod("week", 30000, "2026-11-16").budgetCents, 30000);
  // November has 30 days; Nov 10..30 = 21 days
  assert.equal(M.makePeriod("month", 120000, "2026-11-10").budgetCents, 84000);
});

test("spec example: spend $160 of $300 → $140 in-game cash", () => {
  const s = M.newState("week", 30000, "2026-11-16"); // a Monday, full week
  s.expenses.push(exp("a", 100, "2026-11-16"), exp("b", 60, "2026-11-20"));
  assert.equal(M.currentSummary(s, "2026-11-20").onTrackToEarnCents, 14000);
  assert.equal(s.wallet.balanceCents, 0, "cash only arrives when the period closes");

  const events = M.closeDuePeriods(s, "2026-11-23");
  assert.equal(events.length, 1);
  assert.equal(s.wallet.balanceCents, 14000);
  assert.equal(s.stats.totalSavedCents, 14000);
  assert.equal(s.stats.currentStreak, 1);
  assert.equal(s.current.start, "2026-11-23");
  assert.equal(s.current.closed, false);
});

test("nothing closes before the period ends", () => {
  const s = M.newState("week", 30000, "2026-11-16");
  assert.equal(M.closeDuePeriods(s, "2026-11-22").length, 0);
  assert.equal(s.wallet.balanceCents, 0);
});

test("overspending earns $0, keeps the wallet, and resets only the streak", () => {
  const s = M.newState("day", 5000, "2026-11-10");
  M.closeDuePeriods(s, "2026-11-12"); // two clean days
  assert.equal(s.wallet.balanceCents, 10000);
  assert.equal(s.stats.currentStreak, 2);

  s.wallet.balanceCents -= 3000; // spent some in-game
  s.expenses.push(exp("x", 80, "2026-11-12")); // $80 on a $50 day
  const [ev] = M.closeDuePeriods(s, "2026-11-13");
  assert.equal(ev.overspent, true);
  assert.equal(ev.period.earnedCents, 0);
  assert.equal(s.wallet.balanceCents, 7000, "wallet is never reduced by overspending");
  assert.equal(s.stats.totalSavedCents, 10000, "total saved never goes down");
  assert.equal(s.stats.currentStreak, 0);
  assert.equal(s.stats.bestStreak, 2);
});

test("spending exactly the budget earns $0 but keeps the streak", () => {
  const s = M.newState("day", 5000, "2026-11-10");
  s.expenses.push(exp("x", 50, "2026-11-10"));
  const [ev] = M.closeDuePeriods(s, "2026-11-11");
  assert.equal(ev.period.earnedCents, 0);
  assert.equal(s.stats.currentStreak, 1);
});

test("several missed periods all close in order when the app reopens", () => {
  const s = M.newState("day", 1000, "2026-11-10");
  const events = M.closeDuePeriods(s, "2026-11-15");
  assert.equal(events.length, 5);
  assert.deepEqual(events.map((e) => e.period.start), [
    "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14",
  ]);
  assert.equal(s.history[0].start, "2026-11-14", "history is newest first");
  assert.equal(s.current.start, "2026-11-15");
});

test("a budget change applies from the next period", () => {
  const s = M.newState("week", 30000, "2026-11-16");
  s.pending = { period: "week", budgetCents: 20000 };
  assert.equal(s.current.budgetCents, 30000);
  M.closeDuePeriods(s, "2026-11-23");
  assert.equal(s.current.budgetCents, 20000);
  assert.equal(s.settings.budgetCents, 20000);
  assert.equal(s.pending, null);
});

test("switching week → month starts a prorated stub up to the 1st", () => {
  const s = M.newState("week", 30000, "2026-11-16");
  s.pending = { period: "month", budgetCents: 120000 };
  M.closeDuePeriods(s, "2026-11-23");
  assert.equal(s.current.type, "month");
  assert.equal(s.current.start, "2026-11-23");
  assert.equal(s.current.end, "2026-12-01");
  assert.equal(s.current.budgetCents, 32000); // 8 of 30 days of $1,200
});

test("milestones: $50, $100, $250, $500, $1k, ... reported once each", () => {
  assert.deepEqual(M.milestonesUpTo(4999), []);
  assert.deepEqual(M.milestonesUpTo(30000), [5000, 10000, 25000]);
  assert.deepEqual(M.milestonesUpTo(260000), [5000, 10000, 25000, 50000, 100000, 250000]);
  assert.equal(M.nextMilestone(0), 5000);
  assert.equal(M.nextMilestone(5000), 10000);
  assert.equal(M.nextMilestone(124000), 250000);

  const s = M.newState("day", 6000, "2026-11-10");
  const [first] = M.closeDuePeriods(s, "2026-11-11"); // $60 saved
  assert.deepEqual(first.newMilestones, [5000]);
  const [second] = M.closeDuePeriods(s, "2026-11-12"); // $120 saved
  assert.deepEqual(second.newMilestones, [10000]);
});

test("expense dates must be inside the open period and not in the future", () => {
  const s = M.newState("week", 30000, "2026-11-16");
  assert.equal(M.validExpenseDate(s, "2026-11-18", "2026-11-18"), true);
  assert.equal(M.validExpenseDate(s, "2026-11-19", "2026-11-18"), false, "future");
  assert.equal(M.validExpenseDate(s, "2026-11-15", "2026-11-18"), false, "closed period");
  assert.equal(M.validExpenseDate(s, "garbage", "2026-11-18"), false);
});

test("parseDollars", () => {
  assert.equal(M.parseDollars("12"), 1200);
  assert.equal(M.parseDollars("$12.5"), 1250);
  assert.equal(M.parseDollars("1,234.56"), 123456);
  assert.equal(M.parseDollars(".99"), 99);
  assert.equal(M.parseDollars("0"), null);
  assert.equal(M.parseDollars("-5"), null);
  assert.equal(M.parseDollars("12.345"), null);
  assert.equal(M.parseDollars("abc"), null);
  assert.equal(M.parseDollars(""), null);
});

test("no float drift: 0.1 + 0.2 style amounts add exactly", () => {
  const s = M.newState("day", 100, "2026-11-10");
  s.expenses.push({ id: "a", amountCents: M.parseDollars("0.10"), note: "", date: "2026-11-10" });
  s.expenses.push({ id: "b", amountCents: M.parseDollars("0.20"), note: "", date: "2026-11-10" });
  assert.equal(M.currentSummary(s, "2026-11-10").leftCents, 70);
});
