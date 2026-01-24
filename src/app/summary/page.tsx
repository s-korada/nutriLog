import WeeklySummary from '@/components/WeeklySummary';

export default function SummaryPage() {
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Weekly Summary</h2>
      <WeeklySummary />
    </div>
  );
}
