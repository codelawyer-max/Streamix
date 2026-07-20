import React from "react";
import Link from "next/link";

import {
  Home,
  Compass,
  PlaySquare,
  Clock,
  ThumbsUp,
  User,
  PlusCircle,
} from "lucide-react";


import { Button } from "./button";

import ChannelDialogue from "./channeldialogue";

import { useState } from "react";

import { useUser } from "@/lib/AuthContext";



interface SidebarProps {
  isOpen:boolean;
}



export default function Sidebar({
  isOpen
}:SidebarProps){



  const { user } = useUser();


  const [isDialogueOpen,setIsDialogueOpen] = useState(false);




  const mainNavigation = [

    {
      name:"Home",
      href:"/",
      icon:Home
    },

    {
      name:"Explore",
      href:"/",
      icon:Compass
    },

    {
      name:"Subscriptions",
      href:"/",
      icon:PlaySquare
    }

  ];




  const libraryNavigation = [

    {
      name:"History",
      href:"/history",
      icon:Clock
    },

    {
      name:"Liked Videos",
      href:"/liked",
      icon:ThumbsUp
    },

    {
      name:"Watch Later",
      href:"/watch-later",
      icon:Clock
    }

  ];





  return (

    <>


    <aside

      className={`

      ${isOpen ? "flex":"hidden"}

      flex-col w-64 p-4 bg-white

      border-r border-gray-200

      h-[calc(100vh-3.5rem)]

      sticky top-14 gap-4

      `}

    >




      <div className="space-y-1">


        {
          mainNavigation.map((item)=>(


            <Link

              key={item.name}

              href={item.href}

            >


              <Button

                variant="ghost"

                className="w-full justify-start gap-3"

              >

                <item.icon className="h-4 w-4"/>

                {item.name}


              </Button>


            </Link>


          ))
        }


      </div>




      <hr />




      <div className="space-y-1">


        <h3 className="text-xs font-semibold text-gray-500">

          Library

        </h3>



        {
          libraryNavigation.map((item)=>(


            <Link

              key={item.name}

              href={item.href}

            >


              <Button

                variant="ghost"

                className="w-full justify-start gap-3"

              >

                <item.icon className="h-4 w-4"/>

                {item.name}


              </Button>


            </Link>


          ))
        }


      </div>




      <div className="mt-auto">


      {
        user?.channelname ? (


          <Link href={`/channel/${user._id}`}>

            <Button

              variant="secondary"

              className="w-full justify-start gap-3"

            >

              <User className="h-4 w-4"/>

              Your Channel


            </Button>


          </Link>



        ):(


          <Button

            onClick={()=>setIsDialogueOpen(true)}

            variant="secondary"

            className="w-full justify-start gap-3 text-red-600"

          >

            <PlusCircle className="h-4 w-4"/>

            Create Channel


          </Button>


        )
      }



      </div>




    </aside>




    <ChannelDialogue

      isOpen={isDialogueOpen}

      onClose={()=>setIsDialogueOpen(false)}

      mode="create"

    />


    </>

  );


}


