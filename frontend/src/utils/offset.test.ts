import { BADGES } from "../constants/badges";
import { OFFSET_FACTORS } from "../constants/emission";
import type { CarbonRecord, OffsetRecord } from "../types/carbon";
import { calcOffset, calcOffsetPoints } from "./calculator";

function unlockBadges(records: CarbonRecord[], offsets: OffsetRecord[]) {
  const points = records.reduce((sum, r) => sum + r.points, 0) + offsets.reduce((sum, o) => sum + o.points, 0);
  const lowTravel = records.filter((r) => ["bike", "walk", "bus", "metro"].includes(r.label)).length;
  const vegan = records.filter((r) => r.label === "vegan").length;
  const totalTrees = offsets.filter((o) => o.type === "tree").reduce((sum, o) => sum + o.amount, 0);
  const totalRecycle = offsets.filter((o) => o.type === "recycle").reduce((sum, o) => sum + o.amount, 0);
  const totalEmission = records.reduce((sum, r) => sum + r.emission, 0);
  const totalOffset = offsets.reduce((sum, o) => sum + o.offset, 0);
  const netEmission = totalEmission - totalOffset;
  return BADGES.map((b) => ({
    ...b,
    unlocked:
      (b.id === "tree" && points >= 120) ||
      (b.id === "bike" && lowTravel >= 8) ||
      (b.id === "vegan" && vegan >= 10) ||
      (b.id === "planter" && totalTrees >= 10) ||
      (b.id === "recycler" && totalRecycle >= 50) ||
      (b.id === "carbon-zero" && netEmission <= 0 && totalEmission > 0)
  }));
}

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
  return {
    id: crypto.randomUUID(),
    date: "2026-06-11",
    type: "tree",
    label: "种树",
    amount,
    unit: "棵",
    offset: calcOffset("tree", amount),
    points: calcOffsetPoints("tree", calcOffset("tree", amount))
  };
}

function makeRecycle(amount: number): OffsetRecord {
  return {
    id: crypto.randomUUID(),
    date: "2026-06-11",
    type: "recycle",
    label: "回收利用",
    amount,
    unit: "kg",
    offset: calcOffset("recycle", amount),
    points: calcOffsetPoints("recycle", calcOffset("recycle", amount))
  };
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
  console.log("\n=== 抵消功能测试用例 ===\n");

  console.log("--- 测试 1: 抵消系数计算 ---");
  assert(calcOffset("tree", 1) === OFFSET_FACTORS.tree, "1棵树应抵消 18kg");
  assert(calcOffset("tree", 10) === 180, "10棵树应抵消 180kg");
  assert(calcOffset("recycle", 1) === 0.5, "1kg回收应抵消 0.5kg");
  assert(calcOffset("recycle", 100) === 50, "100kg回收应抵消 50kg");

  console.log("\n--- 测试 2: 抵消积分计算 ---");
  assert(calcOffsetPoints("tree", 18) >= 15, "种树积分基础奖励 15");
  assert(calcOffsetPoints("recycle", 0.5) >= 8, "回收积分基础奖励 8");

  console.log("\n--- 测试 3: 净排放计算 ---");
  const records1 = [makeEmission(100), makeEmission(80)];
  const offsets1 = [makeTree(5)];
  const totalE1 = records1.reduce((s, r) => s + r.emission, 0);
  const totalO1 = offsets1.reduce((s, o) => s + o.offset, 0);
  const net1 = totalE1 - totalO1;
  assert(totalE1 === 180, `总排放应为 180，实际 ${totalE1}`);
  assert(totalO1 === 90, `总抵消应为 90，实际 ${totalO1}`);
  assert(net1 === 90, `净排放应为 90，实际 ${net1}`);

  console.log("\n--- 测试 4: 种树勋章解锁 (累计10棵) ---");
  const badges4 = unlockBadges([], [makeTree(10)]);
  assert(badges4.find(b => b.id === "planter")!.unlocked, "种树10棵应解锁'森林守护者'");
  assert(!badges4.find(b => b.id === "recycler")!.unlocked, "未达到回收条件不应解锁'循环先锋'");
  assert(!badges4.find(b => b.id === "carbon-zero")!.unlocked, "无排放记录不应解锁'净零先锋'");

  console.log("\n--- 测试 5: 回收勋章解锁 (累计50kg) ---");
  const badges5 = unlockBadges([], [makeRecycle(50)]);
  assert(badges5.find(b => b.id === "recycler")!.unlocked, "回收50kg应解锁'循环先锋'");
  assert(!badges5.find(b => b.id === "planter")!.unlocked, "未达到种树条件不应解锁'森林守护者'");

  console.log("\n--- 测试 6: 净零排放徽章解锁 ---");
  const records6 = [makeEmission(100)];
  const offsets6 = [makeTree(6)];
  const net6 = 100 - 6 * 18;
  assert(net6 === -8, `净排放应为 -8，实际 ${net6}`);
  const badges6 = unlockBadges(records6, offsets6);
  assert(badges6.find(b => b.id === "carbon-zero")!.unlocked, "净排放≤0且有排放记录应解锁'净零先锋'");

  console.log("\n--- 测试 7: 净排放刚好为0 ---");
  const records7 = [makeEmission(180)];
  const offsets7 = [makeTree(10)];
  const net7 = 180 - 10 * 18;
  assert(net7 === 0, `净排放应为 0，实际 ${net7}`);
  const badges7 = unlockBadges(records7, offsets7);
  assert(badges7.find(b => b.id === "carbon-zero")!.unlocked, "净排放=0也应解锁'净零先锋'");
  assert(badges7.find(b => b.id === "planter")!.unlocked, "同时应解锁'森林守护者'");

  console.log("\n--- 测试 8: 无排放记录时不解锁净零徽章 ---");
  const badges8 = unlockBadges([], [makeTree(5)]);
  assert(!badges8.find(b => b.id === "carbon-zero")!.unlocked, "无排放记录不应解锁'净零先锋'");

  console.log("\n--- 测试 9: 综合场景 (排放+种树+回收) ---");
  const records9 = [makeEmission(200), makeEmission(150)];
  const offsets9 = [makeTree(5), makeRecycle(100), makeTree(10)];
  const totalE9 = 350;
  const totalO9 = 15 * 18 + 50;
  const net9 = totalE9 - totalO9;
  assert(totalO9 === 320, `总抵消应为 320，实际 ${totalO9}`);
  assert(net9 === 30, `净排放应为 30，实际 ${net9}`);
  const badges9 = unlockBadges(records9, offsets9);
  assert(badges9.find(b => b.id === "planter")!.unlocked, "种树15棵应解锁'森林守护者'");
  assert(badges9.find(b => b.id === "recycler")!.unlocked, "回收100kg应解锁'循环先锋'");
  assert(!badges9.find(b => b.id === "carbon-zero")!.unlocked, "净排放>0不应解锁'净零先锋'");

  console.log("\n--- 测试 10: 完整链路验证 ---");
  const step1Records = [makeEmission(500)];
  const step1Badges = unlockBadges(step1Records, []);
  assert(step1Badges.filter(b => b.unlocked).length === 0, "只有排放记录时不应有勋章");

  const step2Offsets = [...Array(9)].map(() => makeTree(1));
  const step2Badges = unlockBadges(step1Records, step2Offsets);
  assert(!step2Badges.find(b => b.id === "planter")!.unlocked, "种树9棵不应解锁");
  assert(!step2Badges.find(b => b.id === "carbon-zero")!.unlocked, "净排放>0不应解锁净零");

  const step3Offsets = [...step2Offsets, makeTree(1)];
  const step3Badges = unlockBadges(step1Records, step3Offsets);
  assert(step3Badges.find(b => b.id === "planter")!.unlocked, "种树10棵解锁森林守护者");

  const step4Offsets = [...step3Offsets, makeTree(20)];
  const step4Net = 500 - 30 * 18;
  assert(step4Net === -40, `净排放应为 -40，实际 ${step4Net}`);
  const step4Badges = unlockBadges(step1Records, step4Offsets);
  assert(step4Badges.find(b => b.id === "carbon-zero")!.unlocked, "净排放≤0解锁净零先锋");

  const unlockedIds = step4Badges.filter(b => b.unlocked).map(b => b.id);
  assert(unlockedIds.includes("planter"), "应包含森林守护者");
  assert(unlockedIds.includes("carbon-zero"), "应包含净零先锋");
  assert(unlockedIds.includes("tree"), "种树积分足够也应解锁种树徽章");
  assert(unlockedIds.length === 3, `应解锁3枚勋章，实际 ${unlockedIds.length}`);

  if (hasError) {
    console.error("\n❌ 部分测试失败\n");
    throw new Error("Test failed");
  }
  console.log("\n🎉 所有测试通过！\n");
}

runTests();
