import HistoryContent from "@/components/ui/historycontent";

const HistoryPage = () => {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Watch History</h1>
        <p className="mt-1 text-sm text-gray-600">Videos you&apos;ve watched recently.</p>
      </div>

      <HistoryContent />
    </div>
  );
};

export default HistoryPage;
