'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { ComponentStats } from '@/lib/types';

interface ComponentPieChartProps {
  stats: ComponentStats;
}

const COLORS = {
  non_processed: '#22c55e', // green-500
  restaurant: '#eab308', // yellow-500
  processed: '#ef4444', // red-500
};

const LABELS = {
  non_processed: 'Home Cooked',
  restaurant: 'Restaurant',
  processed: 'Processed',
};

export default function ComponentPieChart({ stats }: ComponentPieChartProps) {
  const data = [
    {
      name: LABELS.non_processed,
      value: stats.byCategory.non_processed,
      color: COLORS.non_processed,
    },
    {
      name: LABELS.restaurant,
      value: stats.byCategory.restaurant,
      color: COLORS.restaurant,
    },
    {
      name: LABELS.processed,
      value: stats.byCategory.processed,
      color: COLORS.processed,
    },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400">
        No component data yet
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [`${value} items`, '']}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => <span className="text-sm text-gray-600">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
