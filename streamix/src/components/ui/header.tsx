import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Menu,
  Search,
  Video,
  Bell,
  User,
  PlusCircle,
} from "lucide-react";

import ChannelDialogue from "./channeldialogue";
import { useUser } from "@/lib/AuthContext";


interface HeaderProps {
  onMenuClick: () => void;
}


export default function Header({ onMenuClick }: HeaderProps) {

  const router = useRouter();

  const {
    user,
    logout,
    handlegooglesignin,
    loading
  } = useUser();


  const [isDialogueOpen,setIsDialogueOpen] = useState(false);

  const [search,setSearch] = useState("");



  const handleSearch = (e:React.FormEvent)=>{

    e.preventDefault();

    if(search.trim()){

      router.push(
        `/search?q=${encodeURIComponent(search.trim())}`
      );

    }

  };



  if(loading){
    return null;
  }



  return (
    <>


<header
className="
w-full h-14 bg-white border-b border-gray-200 
fixed top-0 left-0 right-0 z-50 px-4 
flex items-center justify-between gap-4
"
>


{/* LEFT */}

<div className="flex items-center gap-3">

<button
onClick={onMenuClick}
className="p-2 rounded-full hover:bg-gray-100"
>

<Menu className="h-5 w-5"/>

</button>


<Link
href="/"
className="text-xl font-bold"
>

Streamix

</Link>

</div>




{/* SEARCH */}

<form
onSubmit={handleSearch}
className="hidden sm:flex flex-1 max-w-xl relative"
>

<input

value={search}

onChange={(e)=>setSearch(e.target.value)}

placeholder="Search creators, videos, topics..."

className="
w-full h-10 px-4 pr-10
border rounded-full bg-gray-50
"

/>


<Search
className="
absolute right-3 top-3
h-4 w-4 text-gray-400
"
/>


</form>





{/* RIGHT */}


<div className="flex items-center gap-3">


{
user ? (

<>


<button className="p-2 hover:bg-gray-100 rounded-full">

<Video className="h-5 w-5"/>

</button>



<button className="p-2 hover:bg-gray-100 rounded-full">

<Bell className="h-5 w-5"/>

</button>




{/* PROFILE */}

<div className="relative group">


<button>

<img

src={user.image}

alt="profile"

className="
h-9 w-9 rounded-full
"

/>

</button>




<div
className="
hidden group-hover:block
absolute right-0 mt-2
w-52 bg-white
border rounded-lg shadow-lg
p-2 z-50
"
>


{
user.channelname ?

<Link
href={`/channel/${user._id}`}
className="block px-3 py-2 hover:bg-gray-100 rounded"
>

Your Channel

</Link>

:

<button

onClick={()=>setIsDialogueOpen(true)}

className="
w-full text-left px-3 py-2 
hover:bg-gray-100 rounded
"

>

Create Channel

</button>

}



<Link
href="/history"
className="block px-3 py-2 hover:bg-gray-100 rounded"
>

History

</Link>



<Link
href="/liked"
className="block px-3 py-2 hover:bg-gray-100 rounded"
>

Liked Videos

</Link>



<Link
href="/watch-later"
className="block px-3 py-2 hover:bg-gray-100 rounded"
>

Watch Later

</Link>




<button

onClick={logout}

className="
w-full text-left px-3 py-2
hover:bg-gray-100 rounded
"

>

Sign Out

</button>


</div>


</div>





<button

onClick={()=>setIsDialogueOpen(true)}

className="
flex items-center gap-2
px-3 py-2
bg-red-600 text-white
rounded-full text-sm
"

>

<PlusCircle className="h-4 w-4"/>

Create

</button>


</>


)

:(


<button

onClick={handlegooglesignin}

className="
flex items-center gap-2
px-4 py-2
bg-red-600 text-white
rounded-full
"

>

<User className="h-4 w-4"/>

Sign In

</button>


)

}


</div>


</header>



<ChannelDialogue
  isOpen={isDialogueOpen}
  onClose={() => setIsDialogueOpen(false)}
  mode="create"
  onSave={(data: { name: string; description: string }) => {
    console.log("Channel Created:", data);
    setIsDialogueOpen(false);
  }}
/>

</>

  );

}
