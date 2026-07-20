import WatchLaterContent from "@/components/ui/watchlatercontent";

const WatchLaterPage = () => {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Watch Later</h1>
        <p className="mt-1 text-sm text-gray-600">Videos you&apos;ve saved to watch later.</p>
      </div>

      <WatchLaterContent />
    </div>
  );
};

export default WatchLaterPage;
