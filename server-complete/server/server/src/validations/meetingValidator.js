import Joi from 'joi'

export const createMeetingSchema=Joi.object({

title:Joi.string().required(),

leadId:Joi.string().uuid().required(),

meetingType:Joi.string().valid(
'demo',
'follow_up',
'closing',
'internal'
),

scheduledStart:Joi.date().required(),

scheduledEnd:Joi.date().required(),

agenda:Joi.string().allow(''),

participants:Joi.array()

})