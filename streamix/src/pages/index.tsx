import CategoryTabs from "@/components/ui/category-tabs";
import VideoGrid from "@/components/ui/videogrid";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col">
      <CategoryTabs />
      <VideoGrid />
    </div>
  );
}