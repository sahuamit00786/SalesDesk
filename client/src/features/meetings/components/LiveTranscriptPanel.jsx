import {useEffect,useState} from 'react'
import io from 'socket.io-client'

const socket=
io(
import.meta.env.VITE_API_URL
)

export function LiveTranscriptPanel({
meetingId
}){

const [lines,setLines]=useState([])

useEffect(()=>{

socket.emit(
'join_room',
meetingId
)

socket.on(
'transcript_update',
(chunk)=>{
setLines(
prev=>[
...prev,
chunk
]
)
}
)

return()=>{
socket.off(
'transcript_update'
)
}

},[])

return(

<div className="border rounded-xl p-4 h-full">

<h3 className="font-semibold mb-4">
Live Transcript
</h3>

<div className="space-y-3 overflow-auto h-[500px]">

{
lines.map(
(item,i)=>(

<div
key={i}
className="bg-slate-50 rounded-lg p-3"
>
<p className="text-xs text-gray-400">
{item.speaker}
</p>

<p>
{item.text}
</p>
</div>

))
}

</div>

</div>

)

}