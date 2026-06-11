import { create } from "zustand";
import { BADGES } from "../constants/badges";
import { loadOffsets, loadRecords, saveOffsets, saveRecords } from "../storage/indexedDb";
import type { Badge, CarbonRecord, OffsetRecord } from "../types/carbon";

interface CarbonState {
  records: CarbonRecord[];
  offsets: OffsetRecord[];
  badges: Badge[];
  hydrate: () => Promise<void>;
  addRecord: (record: CarbonRecord) => void;
  replaceRecords: (records: CarbonRecord[]) => void;
  addOffset: (offset: OffsetRecord) => void;
}

export const useCarbonStore = create<CarbonState>((set, get) => ({
  records: [],
  offsets: [],
  badges: BADGES.map((b) => ({ ...b, unlocked: false })),
  hydrate: async () => set({ records: await loadRecords(), offsets: await loadOffsets() })),
  addRecord: (record) => {
    const records = [record, ...get().records];
    saveRecords(records);
    set({ records, badges: unlockBadges(records, get().offsets) });
  },
  replaceRecords: (records) => {
    saveRecords(records);
    set({ records, badges: unlockBadges(records, get().offsets) });
  },
  addOffset: (offset) => {
    const offsets = [offset, ...get().offsets];
    saveOffsets(offsets);
    set({ offsets, badges: unlockBadges(get().records, offsets) });
  }
}));

function unlockBadges(records: CarbonRecord[], offsets: OffsetRecord[]): Badge[] {
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
