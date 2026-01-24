import LogViewer from '@/components/LogViewer';

export default function LogsPage() {
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Agent Activity Logs</h2>
      <LogViewer />
    </div>
  );
}
