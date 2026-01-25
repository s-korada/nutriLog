'use client';

interface StatCardProps {
  label: string;
  count: number;
  percentage: string;
  color: 'green' | 'yellow' | 'red' | 'blue';
  icon: string;
}

const colorClasses = {
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    badge: 'bg-green-100 text-green-800',
  },
  yellow: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
    badge: 'bg-yellow-100 text-yellow-800',
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    badge: 'bg-red-100 text-red-800',
  },
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-800',
  },
};

export default function StatCard({ label, count, percentage, color, icon }: StatCardProps) {
  const colors = colorClasses[color];

  return (
    <div className={`rounded-xl p-4 border ${colors.bg} ${colors.border}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${colors.badge}`}>
          {percentage}%
        </span>
      </div>
      <p className={`text-3xl font-bold ${colors.text}`}>{count}</p>
      <p className="text-sm text-gray-600 mt-1">{label}</p>
    </div>
  );
}
