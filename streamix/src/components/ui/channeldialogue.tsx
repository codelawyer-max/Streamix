import React,{useState} from "react";

import AxiosInstance from "@/lib/AxiosInstance";

import {useUser} from "@/lib/AuthContext";



interface ChannelDialogueProps{

    isOpen:boolean;

    onClose:()=>void;

    mode:"create"|"edit";

    onSave?:
    (data:{
        name:string;
        description:string;
    })=>void;

}




export default function ChannelDialogue({

    isOpen,

    onClose,

    mode,

    onSave

}:ChannelDialogueProps){



const {
    user,
    login
}=useUser();



const [name,setName]=useState("");

const [description,setDescription]=useState("");

const [loading,setLoading]=useState(false);






const handleSubmit=async(
e:React.FormEvent
)=>{


e.preventDefault();



if(!name.trim()) return;



if(!user?._id){

console.log("User missing");

return;

}



try{


setLoading(true);




const response =
await AxiosInstance.patch(

`/user/update/${user._id}`,

{

channelname:name,

description:description

}

);





login(response.data);





if(onSave){

onSave({

name,

description

});

}





setName("");

setDescription("");

onClose();




}catch(error){


console.error(
"Channel update error",
error
);



}finally{


setLoading(false);


}



};





if(!isOpen)
return null;






return (

<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">


<div className="bg-white rounded-xl p-6 w-full max-w-md">


<h2 className="text-xl font-semibold mb-4">

{
mode==="create"
?
"Create Channel"
:
"Edit Channel"
}

</h2>



<form onSubmit={handleSubmit}>


<input

value={name}

onChange={(e)=>
setName(e.target.value)
}

placeholder="Channel name"

className="w-full border p-3 rounded mb-3"

/>




<textarea

value={description}

onChange={(e)=>
setDescription(e.target.value)
}

placeholder="Description"

className="w-full border p-3 rounded mb-4"

/>




<div className="flex justify-end gap-3">


<button

type="button"

onClick={onClose}

className="px-4 py-2 bg-gray-200 rounded"

>

Cancel

</button>




<button

disabled={loading}

className="px-4 py-2 bg-red-600 text-white rounded"

>


{
loading
?
"Saving..."
:
"Create"
}


</button>



</div>



</form>



</div>


</div>

);


}
