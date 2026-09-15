"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { compactPkr } from "@/lib/format";

export function MonthArea({ data }: { data: { label: string; total: number }[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="emberFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E24A16" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#E24A16" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(18,14,10,0.06)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#8a7a68", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v) => compactPkr(Number(v))} tick={{ fill: "#8a7a68", fontSize: 12 }} axisLine={false} tickLine={false} width={64} />
          <Tooltip formatter={(v) => compactPkr(Number(v))} />
          <Area type="monotone" dataKey="total" stroke="#E24A16" strokeWidth={3} fill="url(#emberFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MixBars({ data }: { data: { label: string; cash: number; card: number; wallet: number }[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="rgba(18,14,10,0.06)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#8a7a68", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v) => compactPkr(Number(v))} tick={{ fill: "#8a7a68", fontSize: 12 }} axisLine={false} tickLine={false} width={64} />
          <Tooltip formatter={(v) => compactPkr(Number(v))} />
          <Bar dataKey="cash" stackId="a" fill="#3F6F52" radius={[0, 0, 0, 0]} />
          <Bar dataKey="card" stackId="a" fill="#D4B36A" />
          <Bar dataKey="wallet" stackId="a" fill="#E24A16" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
