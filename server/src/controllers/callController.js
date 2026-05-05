import * as callService from '../services/callService.js'

export async function createCall(req,res,next){
try{

const call=await callService.createCall(
req.user,
req.body
)

return res.status(201).json({
success:true,
data:call
})

}catch(err){
next(err)
}
}

export async function getCalls(req,res,next){
try{

const data=await callService.getCalls(
req.query
)

res.json({
success:true,
data
})

}catch(err){
next(err)
}
}

export async function getCallById(req,res,next){
try{

const data=await callService.getCallById(
req.params.id
)

res.json({
success:true,
data
})

}catch(err){
next(err)
}
}

export async function updateCall(req,res,next){
try{

const data=await callService.updateCall(
req.params.id,
req.body
)

res.json({
success:true,
data
})

}catch(err){
next(err)
}
}

export async function deleteCall(req,res,next){
try{

await callService.deleteCall(
req.params.id
)

res.json({
success:true,
message:'Call deleted'
})

}catch(err){
next(err)
}
}