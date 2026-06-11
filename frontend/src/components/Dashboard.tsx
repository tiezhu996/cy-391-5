import { Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { NATIONAL_MONTH_AVERAGE } from "../constants/emission";
import { useCarbonStore } from "../stores/carbonStore";
import { categoryTotals, currentLevel, totalEmission, trend } from "../utils/analytics";
import { Card } from "./ui";

export function Dashboard() {
  const records = useCarbonStore((s) => s.records);
  const offsets = useCarbonStore((s) => s.offsets);
  const total = totalEmission(records);
  const totalOffset = Number(offsets.reduce((sum, o) => sum + o.offset, 0).toFixed(2));
  const net = Number((total - totalOffset).toFixed(2));
  const level = currentLevel(Math.max(0, net));
  const categoryData = categoryTotals(records);
  return <div className="grid gap-4 lg:grid-cols-3">
    <Card><p className="text-sm text-slate-500">总排放</p><strong className="text-3xl text-rose-600">{total} kg</strong><p className="text-sm text-slate-500 mt-1">全国人均月参考 {NATIONAL_MONTH_AVERAGE} kg</p></Card>
    <Card><p className="text-sm text-slate-500">总抵消</p><strong className="text-3xl text-emerald-600">{totalOffset} kg</strong><p className="text-sm text-slate-500 mt-1">共 {offsets.length} 条抵消记录</p></Card>
    <Card>
      <p className="text-sm text-slate-500">净排放</p>
      <strong className={`text-3xl ${net <= 0 ? "text-emerald-600" : level.color}`}>{net > 0 ? `${net} kg` : `${Math.abs(net)} kg 盈余`}</strong>
      <p className={`${level.color} mt-1`}>等级：{level.name}</p>
      {net <= 0 && total > 0 && <p className="text-sm text-emerald-600 mt-1">🎉 已达成净零排放！</p>}
    </Card>
    <Card className="lg:col-span-3"><h2 className="mb-2 font-semibold">日趋势</h2><ResponsiveContainer height={220}><LineChart data={trend(records)}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Line dataKey="emission" stroke="#047857" strokeWidth={2} /></LineChart></ResponsiveContainer></Card>
    <Card className="lg:col-span-2"><h2 className="mb-2 font-semibold">类别排放</h2><ResponsiveContainer height={240}><BarChart data={categoryData}><XAxis dataKey="category" /><YAxis /><Tooltip /><Bar dataKey="emission" stackId="a" fill="#0f766e" /></BarChart></ResponsiveContainer></Card>
    <Card><h2 className="mb-2 font-semibold">排放占比</h2><ResponsiveContainer height={240}><PieChart><Pie data={categoryData} dataKey="emission" nameKey="category" fill="#10b981" label /></PieChart></ResponsiveContainer></Card>
  </div>;
}
