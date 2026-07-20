import LikedContent from "@/components/ui/likedcontent";

const LikedPage = () => {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Liked Videos</h1>
        <p className="mt-1 text-sm text-gray-600">Videos you&apos;ve liked recently.</p>
      </div>

      <LikedContent />
    </div>
  );
};

export default LikedPage;
