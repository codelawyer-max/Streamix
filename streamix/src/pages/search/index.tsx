import { Suspense } from "react";
import { useRouter } from "next/router";
import SearchResult from "@/components/ui/searchresult";

export default function SearchPage() {
  const router = useRouter();

  const { q } = router.query;

  if (!router.isReady) {
    return <div>Loading...</div>;
  }

  return (
    <div className="pt-20 px-6">
      <h1 className="text-2xl font-bold mb-6">
        Search Results for {q}
      </h1>

      <Suspense fallback={<div>Loading search results...</div>}>
        <SearchResult query={q as string} />
      </Suspense>
    </div>
  );
}