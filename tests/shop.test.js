const test = require("node:test");
const assert = require("node:assert/strict");
require("../data/palette.js");
require("../data/patterns.js");
require("../data/parts.js");
require("../data/catalog.js");
const M = require("../src/money.js");
const S = require("../src/shop.js");
const D = require("../src/doll.js");

const fresh = () => S.upgrade(M.newState("week", 30000, "2026-11-16"));

test("new players start in the free starter outfit with two stores open", () => {
  const s = fresh();
  assert.equal(Object.keys(s.avatar.equipped).length, 3);
  assert.deepEqual(s.unlockedStores, ["linen", "velvet"]);
});

test("a dress replaces top and bottoms, and a top replaces a dress", () => {
  let eq = fresh().avatar.equipped;
  eq = S.equip(eq, S.item("velvet-slip"));
  assert.equal(eq.top, undefined);
  assert.equal(eq.bottom, undefined);
  assert.equal(eq.onepiece, "velvet-slip");
  eq = S.equip(eq, S.item("linen-crew"));
  assert.equal(eq.onepiece, undefined);
});

test("accessories stack across kinds but not within one", () => {
  let eq = {};
  eq = S.equip(eq, S.item("linen-hoops"));
  eq = S.equip(eq, S.item("maison-pearls"));
  eq = S.equip(eq, S.item("y2k-sunnies"));
  eq = S.equip(eq, S.item("y2k-clips")); // replaces sunnies (both head)
  assert.deepEqual(Object.values(eq).sort(), ["linen-hoops", "maison-pearls", "y2k-clips"]);
});

test("buying spends wallet cash only, never total saved, and can be undone", () => {
  const s = fresh();
  s.wallet.balanceCents = 10000;
  s.stats.totalSavedCents = 10000;
  assert.equal(S.buy(s, ["velvet-slip", "velvet-heels"]).error, "Not enough in-game cash");
  const r = S.buy(s, ["velvet-slip"]);
  assert.equal(s.wallet.balanceCents, 500);
  assert.equal(s.stats.totalSavedCents, 10000);
  assert.equal(s.avatar.equipped.onepiece, "velvet-slip");
  S.undoBuy(s, r);
  assert.equal(s.wallet.balanceCents, 10000);
  assert.equal(S.owns(s, "velvet-slip"), false);
  assert.equal(s.avatar.equipped.top, "starter-tank");
});

test("stores unlock from saving, stay unlocked, and are announced once", () => {
  const s = fresh();
  s.history.push({ spentCents: 100, budgetCents: 300 });
  s.stats.totalSavedCents = 12000;
  const fresh1 = S.checkUnlocks(s).map((x) => x.id);
  assert.deepEqual(fresh1, ["studio", "y2k"]);
  assert.deepEqual(S.checkUnlocks(s), []);
  s.stats.bestStreak = 3;
  assert.deepEqual(S.checkUnlocks(s).map((x) => x.id), ["thrift"]);
  assert.equal(S.unlockStatus(S.allItems && { id: "maison", unlock: { type: "totalSaved", value: 500 } }, s).detail, "$380 to go");
});

test("outfits save and re-wear", () => {
  const s = fresh();
  const o = S.saveOutfit(s, "  Casual  ", "o1");
  s.avatar.equipped = {};
  S.wearOutfit(s, "o1");
  assert.equal(o.name, "Casual");
  assert.equal(Object.keys(s.avatar.equipped).length, 3);
});

test("every catalog item builds and draws something inside the canvas", () => {
  for (const it of S.allItems()) {
    const pix = D.render({}, [it], { itemOnly: true });
    assert.ok(D.bbox(pix), `${it.id} drew nothing`);
  }
  const pix = D.render(S.DEFAULT_LOOK, S.equippedItems(fresh().avatar.equipped));
  assert.ok(D.bbox(pix).h > 110, "doll is full height");
});
