import {CallLog} from '../../../models/CallLog.js'

export async function createCall(user,payload){

return CallLog.create({
...payload,
ownerUserId:user.id
})

}

export async function getCalls(filters={}){

return CallLog.findAll({
where:filters,
order:[
['createdAt','DESC']
]
})

}

export async function getCallById(id){

const call=await CallLog.findByPk(id)

if(!call){
throw new Error('Call not found')
}

return call

}

export async function updateCall(id,payload){

const call=await getCallById(id)

await call.update(payload)

return call

}

export async function deleteCall(id){

const call=await getCallById(id)

await call.destroy()

}