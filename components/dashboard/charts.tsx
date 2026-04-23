"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, PieChart as PieIcon } from "lucide-react";

interface DashboardChartsProps {
  stats: {
    total_sent: number;
    total_opened: number;
    total_clicked: number;
    total_bounced: number;
    open_rate: number;
    click_rate: number;
    bounce_rate: number;
  };
}

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444"];

const tooltipStyle = {
  backgroundColor: "#161b27",
  border: "1px solid #2a3347",
  borderRadius: "8px",
  color: "#e8eaf0",
  fontSize: "12px",
};

export function DashboardCharts({ stats }: DashboardChartsProps) {
  const barData = [
    { name: "Sent", value: stats.total_sent },
    { name: "Opened", value: stats.total_opened },
    { name: "Clicked", value: stats.total_clicked },
    { name: "Bounced", value: stats.total_bounced },
  ];

  const pieData = [
    { name: "Opened", value: stats.open_rate },
    { name: "Clicked", value: stats.click_rate },
    { name: "Not Opened", value: Math.max(0, 100 - stats.open_rate - stats.bounce_rate) },
    { name: "Bounced", value: stats.bounce_rate },
  ].filter((d) => d.value > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Bar Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[var(--accent)]" />
            <CardTitle>Email Activity</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {stats.total_sent === 0 ? (
            <div className="flex items-center justify-center h-48 text-[var(--muted)] text-sm">
              No data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} barSize={32}>
                <XAxis dataKey="name" tick={{ fill: "#8b93a7", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#8b93a7", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(99,102,241,0.08)" }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {barData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Pie Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <PieIcon className="h-4 w-4 text-[var(--accent)]" />
            <CardTitle>Engagement Breakdown</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {stats.total_sent === 0 ? (
            <div className="flex items-center justify-center h-48 text-[var(--muted)] text-sm">
              No data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(val) => `${val}%`} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", color: "#8b93a7" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
