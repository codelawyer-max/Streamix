import { useEffect, useState } from "react";


interface SearchResultProps {
  query: string;
}


interface VideoData {
  id: string;
  title: string;
  channel: string;
  subscribers: string;
  views: string;
  uploaded: string;
  likes: number;
  dislikes: number;
  description: string;
  thumbnail: string;
  duration: string;
}


export default function SearchResult({ query }: SearchResultProps) {

  const [videos, setVideos] = useState<VideoData[]>([]);


  const allVideos: VideoData[] = [
    {
      id: "1",
      title: "Building a YouTube Clone using Next.js & TypeScript",
      channel: "Code With Kartik",
      subscribers: "25.3K",
      views: "132K",
      uploaded: "3 weeks ago",
      likes: 1542,
      dislikes: 32,
      description:
        "This is a sample description for the video. It explains what the video is about and demonstrates how a YouTube clone can be built using Next.js, TypeScript, Tailwind CSS and reusable components.",
      thumbnail:
        "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
      duration: "12:34",
    },

    {
      id: "2",
      title: "Next.js Full Course For Beginners",
      channel: "Code With Kartik",
      subscribers: "25.3K",
      views: "85K",
      uploaded: "1 month ago",
      likes: 1200,
      dislikes: 20,
      description:
        "Learn Next.js and build modern web applications.",
      thumbnail:
        "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
      duration: "18:20",
    },
  ];


  useEffect(() => {

    const result = allVideos.filter((video) => {

      return (
        video.title
          .toLowerCase()
          .includes(query?.toLowerCase()) ||

        video.channel
          .toLowerCase()
          .includes(query?.toLowerCase())
      );

    });


    setVideos(result);

  }, [query]);


  const hasResult = videos.length > 0;


  if (!hasResult) {
    return (
      <h2 className="text-lg font-semibold">
        No result found
      </h2>
    );
  }


  return (
    <div className="space-y-6">

      {videos.map((video) => (

        <div
          key={video.id}
          className="flex gap-5"
        >

          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-72 h-40 object-cover rounded-xl"
          />


          <div>

            <h2 className="text-xl font-semibold">
              {video.title}
            </h2>


            <p className="text-gray-600 mt-2">
              {video.channel}
            </p>


            <p className="text-gray-500 text-sm mt-1">
              {video.views} views • {video.uploaded}
            </p>


            <p className="mt-3 text-sm">
              {video.description}
            </p>

          </div>

        </div>

      ))}

    </div>
  );
}