import { BADGES } from "../constants/badges";
import { OFFSET_FACTORS } from "../constants/emission";
import { useCarbonStore } from "../stores/carbonStore";
import type { CarbonRecord, OffsetRecord } from "../types/carbon";
import { calcOffset, calcOffsetPoints } from "./calculator";

(globalThis as any).indexedDB = {
  open: () => ({
    onupgradeneeded: null,
    onsuccess: null,
    onerror: null,
    result: {
      objectStoreNames: { contains: () => true },
      createObjectStore: () => {},
      transaction: () => ({
        objectStore: () => ({
          getAll: () => ({ onsuccess: null, result: [] }),
          clear: () => {},
          put: () => {}
        })
      })
    }
  }) as any
};

function makeEmission(emission: number, label = "car"): CarbonRecord {
  return {
    id: crypto.randomUUID(),
    date: "2026-06-11",
    category: "transport",
    label,
    amount: 1,
    unit: "公里",
    emission,
    points: 1
  };
}

function makeTree(amount: number): OffsetRecord {
  const offset = calcOffset("tree", amount);
  return {
    id: crypto.randomUUID(),
    date: "2026-06-11",
    type: "tree",
    label: "种树",
    amount,
    unit: "棵",
    offset,
    points: calcOffsetPoints("tree", offset)
  };
}

function makeRecycle(amount: number): OffsetRecord {
  const offset = calcOffset("recycle", amount);
  return {
    id: crypto.randomUUID(),
    date: "2026-06-11",
    type: "recycle",
    label: "回收利用",
    amount,
    unit: "kg",
    offset,
    points: calcOffsetPoints("recycle", offset)
  };
}

function resetStore() {
  useCarbonStore.setState({
    records: [],
    offsets: [],
    badges: BADGES.map((b) => ({ ...b, unlocked: false }))
  });
}

function getTotalEmission(): number {
  return useCarbonStore.getState().records.reduce((s, r) => s + r.emission, 0);
}

function getTotalOffset(): number {
  return useCarbonStore.getState().offsets.reduce((s, o) => s + o.offset, 0);
}

function getNetEmission(): number {
  return Number((getTotalEmission() - getTotalOffset()).toFixed(2));
}

function isBadgeUnlocked(id: string): boolean {
  return useCarbonStore.getState().badges.find((b) => b.id === id)?.unlocked ?? false;
}

function unlockedCount(): number {
  return useCarbonStore.getState().badges.filter((b) => b.unlocked).length;
}

let hasError = false;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ${message}`);
    hasError = true;
    return;
  }
  console.log(`✅ ${message}`);
}

function runTests() {
  console.log("\n=== 抵消功能状态链测试（真实 carbonStore）===\n");

  // ---------- 测试 1: 抵消系数计算 ----------
  console.log("--- 测试 1: 抵消系数计算 ---");
  resetStore();
  assert(calcOffset("tree", 1) === OFFSET_FACTORS.tree, "1棵树应抵消 18kg");
  assert(calcOffset("tree", 10) === 180, "10棵树应抵消 180kg");
  assert(calcOffset("recycle", 1) === 0.5, "1kg回收应抵消 0.5kg");
  assert(calcOffset("recycle", 100) === 50, "100kg回收应抵消 50kg");

  // ---------- 测试 2: 抵消积分计算 ----------
  console.log("\n--- 测试 2: 抵消积分计算 ---");
  assert(calcOffsetPoints("tree", 18) >= 15, "种树积分基础奖励 15");
  assert(calcOffsetPoints("recycle", 0.5) >= 8, "回收积分基础奖励 8");

  // ---------- 测试 3: 初始状态 ----------
  console.log("\n--- 测试 3: store 初始状态 ---");
  resetStore();
  assert(useCarbonStore.getState().records.length === 0, "初始 records 为空");
  assert(useCarbonStore.getState().offsets.length === 0, "初始 offsets 为空");
  assert(getNetEmission() === 0, "初始净排放为 0");
  assert(unlockedCount() === 0, "初始没有勋章解锁");

  // ---------- 测试 4: 仅添加排放记录的状态变化 ----------
  console.log("\n--- 测试 4: 仅添加排放记录的状态变化 ---");
  resetStore();
  const e1 = makeEmission(100);
  useCarbonStore.getState().addRecord(e1);
  assert(useCarbonStore.getState().records.length === 1, "records 数量应为 1");
  assert(getTotalEmission() === 100, "总排放应为 100");
  assert(getTotalOffset() === 0, "总抵消应为 0");
  assert(getNetEmission() === 100, "净排放应为 100");
  assert(!isBadgeUnlocked("planter"), "无种树记录不应解锁森林守护者");
  assert(!isBadgeUnlocked("recycler"), "无回收记录不应解锁循环先锋");
  assert(!isBadgeUnlocked("carbon-zero"), "净排放>0不应解锁净零先锋");

  // ---------- 测试 5: 净排放计算（排放+抵消） ----------
  console.log("\n--- 测试 5: 添加抵消记录后净排放计算 ---");
  resetStore();
  useCarbonStore.getState().addRecord(makeEmission(100));
  useCarbonStore.getState().addRecord(makeEmission(80));
  useCarbonStore.getState().addOffset(makeTree(5));
  assert(getTotalEmission() === 180, `总排放应为 180，实际 ${getTotalEmission()}`);
  assert(getTotalOffset() === 90, `总抵消应为 90，实际 ${getTotalOffset()}`);
  assert(getNetEmission() === 90, `净排放应为 90，实际 ${getNetEmission()}`);
  assert(useCarbonStore.getState().offsets.length === 1, "offsets 数量应为 1");

  // ---------- 测试 6: 种树勋章解锁链路 ----------
  console.log("\n--- 测试 6: 种树勋章解锁状态链 ---");
  resetStore();
  for (let i = 0; i < 9; i++) {
    useCarbonStore.getState().addOffset(makeTree(1));
  }
  assert(useCarbonStore.getState().offsets.length === 9, "offsets 数量应为 9");
  assert(!isBadgeUnlocked("planter"), "种树9棵不应解锁森林守护者");
  useCarbonStore.getState().addOffset(makeTree(1));
  assert(useCarbonStore.getState().offsets.length === 10, "offsets 数量应为 10");
  assert(isBadgeUnlocked("planter"), "种树10棵应解锁森林守护者");
  assert(!isBadgeUnlocked("recycler"), "未达到回收条件不应解锁循环先锋");
  assert(!isBadgeUnlocked("carbon-zero"), "无排放记录不应解锁净零先锋");

  // ---------- 测试 7: 回收勋章解锁链路 ----------
  console.log("\n--- 测试 7: 回收勋章解锁状态链 ---");
  resetStore();
  useCarbonStore.getState().addOffset(makeRecycle(49));
  assert(!isBadgeUnlocked("recycler"), "回收49kg不应解锁循环先锋");
  useCarbonStore.getState().addOffset(makeRecycle(1));
  const totalRecycleKg = useCarbonStore
    .getState()
    .offsets.filter((o) => o.type === "recycle")
    .reduce((s, o) => s + o.amount, 0);
  assert(totalRecycleKg === 50, `累计回收应为 50kg，实际 ${totalRecycleKg}`);
  assert(isBadgeUnlocked("recycler"), "回收50kg应解锁循环先锋");
  assert(!isBadgeUnlocked("planter"), "未达到种树条件不应解锁森林守护者");

  // ---------- 测试 8: 净零徽章边界 - 刚好抵消 ----------
  console.log("\n--- 测试 8: 净排放=0 时净零徽章解锁 ---");
  resetStore();
  useCarbonStore.getState().addRecord(makeEmission(180));
  useCarbonStore.getState().addOffset(makeTree(10));
  assert(getNetEmission() === 0, `净排放应为 0，实际 ${getNetEmission()}`);
  assert(isBadgeUnlocked("carbon-zero"), "净排放=0且有排放记录应解锁净零先锋");
  assert(isBadgeUnlocked("planter"), "同时应解锁森林守护者");

  // ---------- 测试 9: 净零徽章 - 超额抵消 ----------
  console.log("\n--- 测试 9: 净排放<0 时净零徽章解锁 ---");
  resetStore();
  useCarbonStore.getState().addRecord(makeEmission(100));
  useCarbonStore.getState().addOffset(makeTree(6));
  const net = getNetEmission();
  assert(net === -8, `净排放应为 -8，实际 ${net}`);
  assert(isBadgeUnlocked("carbon-zero"), "净排放≤0应解锁净零先锋");

  // ---------- 测试 10: 净零徽章 - 无排放不解锁 ----------
  console.log("\n--- 测试 10: 无排放记录不解锁净零徽章 ---");
  resetStore();
  useCarbonStore.getState().addOffset(makeTree(5));
  assert(getNetEmission() === -90, `净排放应为 -90，实际 ${getNetEmission()}`);
  assert(!isBadgeUnlocked("carbon-zero"), "无排放记录不应解锁净零先锋");

  // ---------- 测试 11: 综合场景链路 ----------
  console.log("\n--- 测试 11: 综合场景（排放+种树+回收）状态链 ---");
  resetStore();
  useCarbonStore.getState().addRecord(makeEmission(200));
  useCarbonStore.getState().addRecord(makeEmission(150));
  useCarbonStore.getState().addOffset(makeTree(5));
  useCarbonStore.getState().addOffset(makeRecycle(100));
  useCarbonStore.getState().addOffset(makeTree(10));
  const totalE = getTotalEmission();
  const totalO = getTotalOffset();
  const netFinal = getNetEmission();
  assert(totalE === 350, `总排放应为 350，实际 ${totalE}`);
  assert(totalO === 320, `总抵消应为 320，实际 ${totalO}`);
  assert(netFinal === 30, `净排放应为 30，实际 ${netFinal}`);
  assert(useCarbonStore.getState().records.length === 2, "records 数量应为 2");
  assert(useCarbonStore.getState().offsets.length === 3, "offsets 数量应为 3");
  assert(isBadgeUnlocked("planter"), "种树15棵应解锁森林守护者");
  assert(isBadgeUnlocked("recycler"), "回收100kg应解锁循环先锋");
  assert(!isBadgeUnlocked("carbon-zero"), "净排放>0不应解锁净零先锋");

  // ---------- 测试 12: 完整渐进链路 ----------
  console.log("\n--- 测试 12: 完整渐进链路（逐步观察状态变化）---");
  resetStore();

  // Step 1: 只有 500kg 排放
  useCarbonStore.getState().addRecord(makeEmission(500));
  assert(unlockedCount() === 0, "Step1: 只有排放不应有勋章");
  assert(getNetEmission() === 500, "Step1: 净排放应为 500");

  // Step 2: 种 9 棵树（抵消 162kg，净排放 338kg）
  for (let i = 0; i < 9; i++) {
    useCarbonStore.getState().addOffset(makeTree(1));
  }
  assert(useCarbonStore.getState().offsets.length === 9, "Step2: offsets 数量应为 9");
  assert(!isBadgeUnlocked("planter"), "Step2: 种树9棵不应解锁森林守护者");
  assert(!isBadgeUnlocked("carbon-zero"), "Step2: 净排放>0不应解锁净零");
  const step2Net = getNetEmission();
  assert(step2Net === 338, `Step2: 净排放应为 338，实际 ${step2Net}`);

  // Step 3: 再种 1 棵（共 10 棵，抵消 180kg，净排放 320kg）
  useCarbonStore.getState().addOffset(makeTree(1));
  assert(useCarbonStore.getState().offsets.length === 10, "Step3: offsets 数量应为 10");
  assert(isBadgeUnlocked("planter"), "Step3: 种树10棵解锁森林守护者");
  const step3Ids = useCarbonStore.getState().badges.filter((b) => b.unlocked).map((b) => b.id);
  assert(step3Ids.includes("planter"), "Step3: 应包含森林守护者");
  assert(step3Ids.includes("tree"), "Step3: 种树积分达标也应解锁种树徽章");
  assert(!step3Ids.includes("carbon-zero"), "Step3: 净排放>0不应解锁净零");
  const step3Net = getNetEmission();
  assert(step3Net === 320, `Step3: 净排放应为 320，实际 ${step3Net}`);

  // Step 4: 再种 20 棵（共 30 棵，抵消 540kg，净排放 -40kg）
  for (let i = 0; i < 20; i++) {
    useCarbonStore.getState().addOffset(makeTree(1));
  }
  assert(useCarbonStore.getState().offsets.length === 30, "Step4: offsets 数量应为 30");
  const step4Net = getNetEmission();
  assert(step4Net === -40, `Step4: 净排放应为 -40，实际 ${step4Net}`);
  assert(isBadgeUnlocked("carbon-zero"), "Step4: 净排放≤0解锁净零先锋");
  const unlockedIds = useCarbonStore
    .getState()
    .badges.filter((b) => b.unlocked)
    .map((b) => b.id);
  assert(unlockedIds.includes("planter"), "Step4: 应包含森林守护者");
  assert(unlockedIds.includes("carbon-zero"), "Step4: 应包含净零先锋");
  assert(unlockedIds.includes("tree"), "Step4: 种树积分达标应也解锁种树徽章");
  assert(unlockedIds.length === 3, `Step4: 应解锁3枚勋章，实际 ${unlockedIds.length}`);

  // ---------- 测试 13: 新增排放会影响净零状态 ----------
  console.log("\n--- 测试 13: 新增排放使净零状态回退 ---");
  resetStore();
  useCarbonStore.getState().addRecord(makeEmission(180));
  useCarbonStore.getState().addOffset(makeTree(10));
  assert(getNetEmission() === 0, "抵消完成，净排放=0");
  assert(isBadgeUnlocked("carbon-zero"), "净排放=0应解锁净零先锋");
  useCarbonStore.getState().addRecord(makeEmission(1));
  assert(getNetEmission() === 1, "新增排放后净排放=1");
  // 勋章一旦解锁不应回退？这里和实际 store 行为一致，当前实现会重新计算
  const carbonZeroUnlocked = isBadgeUnlocked("carbon-zero");
  assert(!carbonZeroUnlocked, "净排放>0后净零先锋应重新变为未解锁");

  if (hasError) {
    console.error("\n❌ 部分测试失败\n");
    throw new Error("Test failed");
  }
  console.log("\n🎉 所有状态链测试通过！\n");
}

runTests();
