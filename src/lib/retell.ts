import { RetellClient } from "retell-sdk"
import { prisma } from "./prisma"

// Default client using env variable (fallback for backwards compatibility)
export const retellClient = new RetellClient({
  apiKey: process.env.RETELL_API_KEY || "fallback_key",
})

// Get organization-specific Retell client
export async function getRetellClient(organizationId: string): Promise<RetellClient> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { retellApiKey: true }
  })

  if (!organization?.retellApiKey) {
    // Fallback to env variable if organization doesn't have API key
    if (!process.env.RETELL_API_KEY) {
      throw new Error("Retell API key not configured. Please add it in admin settings.")
    }
    return retellClient
  }

  return new RetellClient({
    apiKey: organization.retellApiKey,
  })
}

// Helper function to format phone numbers to E.164
export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  return digits.startsWith("+") ? digits : `+${digits}`
}

// Helper to create agent with standard webhook
export async function createAgentWithWebhook(config: {
  name: string
  voiceId: string
  llmId: string
}) {
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/retell`

  return retellClient.agent.create({
    agent_name: config.name,
    voice_id: config.voiceId,
    response_engine: {
      type: "retell-llm",
      llm_id: config.llmId,
    },
    webhook_url: webhookUrl,
  })
}
