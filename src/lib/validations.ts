import { z } from "zod"

// Auth schemas
export const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  organizationName: z.string().min(2, "Organization name required"),
})

export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

// Bot schemas
export const createBotSchema = z.object({
  name: z.string().min(1, "Bot name is required"),
  description: z.string().optional(),
  voiceId: z.string().default("11labs-Adrian"),
  model: z.string().default("gpt-4.1"),
  language: z.string().default("en-US"),
  generalPrompt: z.string().min(10, "Prompt must be at least 10 characters"),
  beginMessage: z.string().optional(),
  webhookUrl: z.string().url().optional().or(z.literal("")),

  // Advanced Voice Settings
  voiceTemperature: z.number().min(0).max(2).optional(),
  voiceSpeed: z.number().min(0.5).max(2).optional(),
  responsiveness: z.number().min(0).max(1).optional(),
  interruptionSensitivity: z.number().min(0).max(1).optional(),
  enableBackchannel: z.boolean().optional(),
  ambientSound: z.string().optional(),

  // Pronunciation & Boosting
  boostedKeywords: z.array(z.string()).optional(),

  // Call Settings
  normalizeForSpeech: z.boolean().optional(),
  optOutSensitiveDataStorage: z.boolean().optional(),
})

export const updateBotSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  voiceId: z.string().optional(),
  model: z.string().optional(),
  language: z.string().optional(),
  generalPrompt: z.string().min(10).optional(),
  beginMessage: z.string().optional(),
  webhookUrl: z.string().url().optional().or(z.literal("")),
  isActive: z.boolean().optional(),

  // Advanced Voice Settings
  voiceTemperature: z.number().min(0).max(2).optional(),
  voiceSpeed: z.number().min(0.5).max(2).optional(),
  responsiveness: z.number().min(0).max(1).optional(),
  interruptionSensitivity: z.number().min(0).max(1).optional(),
  enableBackchannel: z.boolean().optional(),
  ambientSound: z.string().optional(),

  // Pronunciation & Boosting
  boostedKeywords: z.array(z.string()).optional(),

  // Call Settings
  normalizeForSpeech: z.boolean().optional(),
  optOutSensitiveDataStorage: z.boolean().optional(),
})

// Call schemas
export const createCallSchema = z.object({
  botId: z.string().cuid(),
  fromNumberId: z.string().cuid().optional(),
  toNumber: z.string().regex(/^\+[1-9]\d{1,14}$/, "Invalid phone number format (use E.164)"),
  metadata: z.record(z.string()).optional(),
  // Agent overrides for call-time customization
  overrides: z.object({
    voiceId: z.string().optional(),
    voiceTemperature: z.number().min(0).max(2).optional(),
    voiceSpeed: z.number().min(0.5).max(2).optional(),
    responsiveness: z.number().min(0).max(1).optional(),
    interruptionSensitivity: z.number().min(0).max(1).optional(),
    generalPrompt: z.string().optional(),
    beginMessage: z.string().optional(),
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxDuration: z.number().positive().optional(), // Max call duration in seconds
  }).optional(),
})

// Phone number schemas
export const createPhoneNumberSchema = z.object({
  number: z.string().regex(/^\+[1-9]\d{1,14}$/, "Invalid phone number format (use E.164)"),
  nickname: z.string().optional(),
})

export const purchasePhoneNumberSchema = z.object({
  areaCode: z.string().length(3).optional(), // US area code like "415"
  agentId: z.string().cuid().optional(), // Bot ID to bind
  nickname: z.string().optional(),
})

export const importPhoneNumberSchema = z.object({
  phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/, "Invalid phone number format (use E.164)"),
  agentId: z.string().cuid().optional(),
  nickname: z.string().optional(),
  // SIP Trunking Credentials (for NetGSM etc.)
  sipUri: z.string().optional(),
  sipUsername: z.string().optional(),
  sipPassword: z.string().optional(),
})

export const updatePhoneNumberSchema = z.object({
  agentId: z.string().cuid().nullable().optional(), // Legacy: Bind/unbind agent for both directions
  inboundAgentId: z.string().cuid().nullable().optional(), // Bind/unbind inbound agent
  outboundAgentId: z.string().cuid().nullable().optional(), // Bind/unbind outbound agent
  nickname: z.string().optional(),
  isActive: z.boolean().optional(),
})

// Customer schemas
export const createCustomerSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  customerType: z.enum(["RESTAURANT", "HOTEL"]).default("RESTAURANT"),
})

export type SignUpInput = z.infer<typeof signUpSchema>
export type SignInInput = z.infer<typeof signInSchema>
export type CreateBotInput = z.infer<typeof createBotSchema>
export type UpdateBotInput = z.infer<typeof updateBotSchema>
export type CreateCallInput = z.infer<typeof createCallSchema>
export type CreatePhoneNumberInput = z.infer<typeof createPhoneNumberSchema>
export type PurchasePhoneNumberInput = z.infer<typeof purchasePhoneNumberSchema>
export type ImportPhoneNumberInput = z.infer<typeof importPhoneNumberSchema>
export type UpdatePhoneNumberInput = z.infer<typeof updatePhoneNumberSchema>
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>
