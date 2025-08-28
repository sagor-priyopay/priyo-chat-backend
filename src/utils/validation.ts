import Joi from 'joi';

export const authValidation = {
  register: Joi.object({
    email: Joi.string().email().required(),
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('USER').optional().default('USER'),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().required(),
  }),
};

export const conversationValidation = {
  create: Joi.object({
    participantIds: Joi.array().items(Joi.string()).min(1).required(),
    name: Joi.string().max(100).optional(),
    type: Joi.string().valid('DIRECT', 'GROUP').required(),
  }),
};

export const messageValidation = {
  send: Joi.object({
    conversationId: Joi.string().required(),
    content: Joi.string().max(2000).required(),
    type: Joi.string().valid('TEXT', 'FILE', 'IMAGE').optional(),
  }),

  markAsRead: Joi.object({
    messageIds: Joi.array().items(Joi.string()).required(),
  }),
};

export const messageSchemas = {
  send: Joi.object({
    content: Joi.string().required().min(1).max(5000),
    conversationId: Joi.string().required(),
    type: Joi.string().valid('TEXT', 'IMAGE', 'FILE').default('TEXT')
  }),
  markRead: Joi.object({
    messageIds: Joi.array().items(Joi.string()).required()
  })
};

export const widgetSchemas = {
  auth: Joi.object({
    visitorId: Joi.string().required(),
    email: Joi.string().email().optional(),
    name: Joi.string().optional()
  }),
  conversation: Joi.object({
    visitorId: Joi.string().required()
  }),
  message: Joi.object({
    message: Joi.string().required().min(1).max(5000),
    conversationId: Joi.string().required(),
    visitorId: Joi.string().required()
  })
};
