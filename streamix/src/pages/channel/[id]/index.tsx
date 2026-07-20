import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import ChannelHeader from "../../../components/ui/channelheader";
import ChannelTabs from "../../../components/ui/channeltabs";
import VideoUploader from "../../../components/ui/videouploader";
import ChannelVideos from "../../../components/ui/channelvideos";

import AxiosInstance from "../../../lib/AxiosInstance";


interface Channel {

  id: string;
  name: string;
  username: string;
  email: string;
  image: string;
  description: string;
  subscribers: string;

}


interface Video {

  id: string;
  title: string;
  thumbnail: string;
  views: string;
  duration: string;
  uploadedOn: string;
  channel: string;

}



export default function ChannelPage() {


  const router = useRouter();

  const { id } = router.query;



  const [channel, setChannel] = useState<Channel | null>(null);

  const [videos, setVideos] = useState<Video[]>([]);

  const [loading, setLoading] = useState(true);



  useEffect(() => {


    if (!id) return;



    const loadChannel = async () => {


      try {


        const response = await AxiosInstance.get(
          `/user/${id}`
        );



        const user =
          response.data.result ||
          response.data;



        const channelData: Channel = {

          id: user._id,

          name: user.channelname || user.name,

          username: `@${user.channelname || user.name}`,

          email: user.email,

          image: user.image,

          description: user.description ||
            "Welcome to my channel",

          subscribers: "0 Subscribers"

        };



        setChannel(channelData);



      } catch (error) {


        console.error(
          "Error loading channel:",
          error
        );


      }

    };





    const loadVideos = async () => {


      try {


        // Video API will be connected in next lecture

        const mockVideos: Video[] = [];

        setVideos(mockVideos);



      } catch (error) {


        console.error(
          "Error loading videos:",
          error
        );


      } finally {


        setLoading(false);


      }


    };



    loadChannel();

    loadVideos();



  }, [id]);





  if (loading) {


    return (

      <div className="flex h-[70vh] items-center justify-center">

        <h2 className="text-xl font-semibold">
          Loading Channel...
        </h2>

      </div>

    );

  }






  if (!channel) {


    return (

      <div className="flex h-[70vh] items-center justify-center">

        <h2 className="text-xl font-semibold">
          Channel Not Found
        </h2>

      </div>

    );


  }






  return (

    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">


      <ChannelHeader
        channel={channel}
      />



      <ChannelTabs />



      <VideoUploader

        channelId={channel.id}

        channelName={channel.name}

      />



      <ChannelVideos

        videos={videos}

      />


    </div>

  );


}