"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { PlatformStat } from "@/lib/types";
import { PLATFORM_LABELS, PLATFORM_COLORS } from "@/lib/mock-data";

interface PlatformBreakdownProps {
  data: PlatformStat[];
}

export default function PlatformBreakdown({ data }: PlatformBreakdownProps) {
  const chartData = data.map((d) => ({
    name: PLATFORM_LABELS[d.platform] ?? d.platform,
    value: d.count,
    share: d.share,
    color: PLATFORM_COLORS[d.platform] ?? "#6366f1",
    platform: d.platform,
  }));

  return (
    <div className="card h-full flex flex-col">
      <h3 className="text-sm font-medium text-slate-300 mb-4">Rozkład platform</h3>
      <div className="flex-1 min-h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: "#64748b", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "8px",
                color: "#f1f5f9",
                fontSize: "12px",
              }}
              formatter={(value: number, _: string, props: { payload?: { share: number } }) => [
                `${value.toLocaleString("pl-PL")} (${props.payload?.share}%)`,
                "dokumenty",
              ]}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
