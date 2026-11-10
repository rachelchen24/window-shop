// Window Shop: game rules for stores, buying, the closet and outfits (spec §4, §5).
// Pure functions over the saved state, no DOM. Prices in data are dollars; state uses cents.
(function (root) {
  "use strict";
  const cat = () => root.WS_CATALOG;
  const SLOT = { top: "top", dress: "onepiece", skirt: "bottom", pants: "bottom", shorts: "bottom", jacket: "outer", shoes: "shoes", bag: "bag", accessory: "accessory" };

  function allItems() {
    return cat().starter.map((i) => ({ ...i, storeId: "starter" })).concat(cat().items);
  }
  let byId = null;
  function item(id) {
    if (!byId) byId = new Map(allItems().map((i) => [i.id, i]));
    return byId.get(id);
  }
  const priceCents = (it) => Math.round(it.price * 100);
  const slotOf = (it) => it.slot || SLOT[it.category];

  // Accessories go one per kind (ears / neck / head); everything else one per slot.
  function equipKey(it) {
    if (slotOf(it) !== "accessory") return slotOf(it);
    const def = root.WS_PARTS.accessories[it.style];
    return "acc-" + (def ? def.kind : it.style);
  }

  // Put an item on. A dress replaces top and bottoms, and the reverse (spec §5.6).
  function equip(equipped, it) {
    const next = { ...equipped };
    const s = slotOf(it);
    if (s === "onepiece") { delete next.top; delete next.bottom; }
    if (s === "top" || s === "bottom") delete next.onepiece;
    next[equipKey(it)] = it.id;
    return next;
  }
  function unequip(equipped, it) {
    const next = { ...equipped };
    if (next[equipKey(it)] === it.id) delete next[equipKey(it)];
    return next;
  }
  const isEquipped = (equipped, it) => equipped[equipKey(it)] === it.id;
  const equippedItems = (equipped) => Object.values(equipped).map(item).filter(Boolean);

  // ---------- setup & migration ----------
  const DEFAULT_LOOK = { skin: "medium", hair: "long", hairColor: "espresso", eyes: "brown" };

  // Adds the game parts to a money-only state (new players and saves from the first build).
  function upgrade(state, now = Date.now()) {
    if (!state.profile) state.profile = { name: "" };
    if (!state.avatar) {
      let equipped = {};
      for (const it of cat().starter) equipped = equip(equipped, it);
      state.avatar = { ...DEFAULT_LOOK, equipped };
    }
    if (!state.owned) state.owned = cat().starter.map((it) => ({ itemId: it.id, purchasedAt: now, priceCents: 0 }));
    if (!state.outfits) state.outfits = [];
    if (!state.unlockedStores) state.unlockedStores = [];
    if (!state.seenStores) state.seenStores = [];
    if (state.stats.spentInGameCents === undefined) state.stats.spentInGameCents = 0;
    state.version = 2;
    checkUnlocks(state);
    return state;
  }

  // ---------- unlocks (spec §4.2) ----------
  function periodsUnderBudget(state) {
    return state.history.filter((p) => p.spentCents <= p.budgetCents).length;
  }

  function unlockStatus(store, state) {
    const u = store.unlock;
    if (state.unlockedStores.includes(store.id) || u.type === "start") return { unlocked: true };
    const $ = (c) => "$" + Math.round(c / 100).toLocaleString("en-US");
    if (u.type === "totalSaved") {
      const goal = u.value * 100, have = state.stats.totalSavedCents;
      return { unlocked: have >= goal, progress: have / goal, label: `Save ${$(goal)} to unlock`, detail: `${$(Math.max(0, goal - have))} to go` };
    }
    if (u.type === "periodsUnderBudget") {
      const have = periodsUnderBudget(state);
      return { unlocked: have >= u.value, progress: have / u.value, label: `Finish ${u.value === 1 ? "a period" : u.value + " periods"} under budget to unlock`, detail: `${have} of ${u.value} so far` };
    }
    if (u.type === "streak") {
      const have = state.stats.bestStreak;
      return { unlocked: have >= u.value, progress: have / u.value, label: `Stay under budget ${u.value} periods in a row to unlock`, detail: `Best streak so far: ${have}` };
    }
    return { unlocked: false, progress: 0, label: "Locked" };
  }

  // Unlocking is permanent. Returns the stores unlocked just now.
  function checkUnlocks(state) {
    const fresh = [];
    for (const s of cat().stores) {
      if (state.unlockedStores.includes(s.id)) continue;
      if (unlockStatus(s, state).unlocked) {
        state.unlockedStores.push(s.id);
        if (s.unlock.type !== "start") fresh.push(s);
      }
    }
    return fresh;
  }

  // ---------- buying ----------
  const owns = (state, id) => state.owned.some((o) => o.itemId === id);

  // Buy items with in-game cash and put them on. Returns an undo record, or an error.
  function buy(state, ids, now = Date.now()) {
    const items = ids.map(item).filter((it) => it && !owns(state, it.id));
    if (!items.length) return { error: "Nothing to buy" };
    const total = items.reduce((s, it) => s + priceCents(it), 0);
    if (total > state.wallet.balanceCents) return { error: "Not enough in-game cash", shortCents: total - state.wallet.balanceCents };
    const before = { equipped: { ...state.avatar.equipped } };
    state.wallet.balanceCents -= total;
    state.stats.spentInGameCents += total;
    for (const it of items) {
      state.owned.push({ itemId: it.id, purchasedAt: now, priceCents: priceCents(it) });
      state.avatar.equipped = equip(state.avatar.equipped, it);
    }
    return { ok: true, ids: items.map((i) => i.id), totalCents: total, before };
  }

  function undoBuy(state, receipt) {
    state.wallet.balanceCents += receipt.totalCents;
    state.stats.spentInGameCents -= receipt.totalCents;
    state.owned = state.owned.filter((o) => !receipt.ids.includes(o.itemId));
    state.avatar.equipped = receipt.before.equipped;
  }

  // ---------- outfits ----------
  function saveOutfit(state, name, id) {
    const o = { id, name: name.trim().slice(0, 40) || "My look", equipped: { ...state.avatar.equipped } };
    state.outfits.unshift(o);
    return o;
  }
  function wearOutfit(state, outfitId) {
    const o = state.outfits.find((x) => x.id === outfitId);
    if (!o) return;
    const kept = {};
    for (const [k, id] of Object.entries(o.equipped)) if (owns(state, id)) kept[k] = id;
    state.avatar.equipped = kept;
  }

  const api = { allItems, item, priceCents, slotOf, equipKey, equip, unequip, isEquipped, equippedItems, upgrade, unlockStatus, checkUnlocks, periodsUnderBudget, owns, buy, undoBuy, saveOutfit, wearOutfit, DEFAULT_LOOK };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Shop = api;
})(typeof window !== "undefined" ? window : globalThis);
