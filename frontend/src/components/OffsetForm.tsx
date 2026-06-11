import { useState } from "react";
import { calcOffset, calcOffsetPoints } from "../utils/calculator";
import { useCarbonStore } from "../stores/carbonStore";
import type { OffsetType } from "../types/carbon";
import { Button, Card } from "./ui";

const labels = {
  tree: ["种树"],
  recycle: ["回收利用"]
};

const unitMap = {
  tree: "棵",
  recycle: "kg"
};

export function OffsetForm() {
  const addOffset = useCarbonStore((s) => s.addOffset);
  const offsets = useCarbonStore((s) => s.offsets);
  const [type, setType] = useState<OffsetType>("tree");
  const [label, setLabel] = useState("种树");
  const [amount, setAmount] = useState(1);

  function submit() {
    const offset = calcOffset(type, amount);
    addOffset({
      id: crypto.randomUUID(),
      date: new Date().toISOString().slice(0, 10),
      type,
      label,
      amount,
      unit: unitMap[type],
      offset,
      points: calcOffsetPoints(type, offset)
    });
  }

  const totalOffset = offsets.reduce((sum, o) => sum + o.offset, 0);

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold">抵消记录</h2>
      <div className="grid gap-3 sm:grid-cols-4">
        <select
          className="input"
          value={type}
          onChange={(e) => {
            const next = e.target.value as OffsetType;
            setType(next);
            setLabel(labels[next][0]);
          }}
        >
          <option value="tree">种树</option>
          <option value="recycle">回收利用</option>
        </select>
        <select className="input" value={label} onChange={(e) => setLabel(e.target.value)}>
          {labels[type].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <input
          className="input"
          type="number"
          min="0"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          placeholder={type === "tree" ? "棵数" : "重量(kg)"}
        />
        <Button onClick={submit}>记录抵消</Button>
      </div>
      <div className="mt-3 text-sm text-slate-500">
        本次抵消：≈ {calcOffset(type, amount).toFixed(2)} kg CO₂ ｜ 累计抵消：{totalOffset.toFixed(2)} kg
      </div>
      {offsets.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-medium text-slate-700">最近抵消记录</h3>
          <div className="max-h-40 space-y-1 overflow-y-auto text-sm">
            {offsets.slice(0, 10).map((o) => (
              <div key={o.id} className="flex justify-between rounded bg-slate-50 px-3 py-2">
                <span>
                  {o.date} · {o.label} {o.amount}
                  {o.unit}
                </span>
                <span className="text-emerald-600">-{o.offset.toFixed(2)} kg</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
