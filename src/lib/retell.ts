import { RetellClient } from "retell-sdk"
import { prisma } from "./prisma"

// Default client using env variable (fallback for backwards compatibility)
export const retellClient = new RetellClient({
  apiKey: process.env.RETELL_API_KEY || "fallback_key",
})

// Helper to get API key string (for raw fetch calls)
export async function getRetellApiKey(organizationId: string): Promise<string> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { retellApiKey: true }
  })

  if (organization?.retellApiKey) {
    return organization.retellApiKey
  }

  if (!process.env.RETELL_API_KEY) {
    throw new Error("Retell API key not configured. Please add it in admin settings.")
  }

  return process.env.RETELL_API_KEY
}

// Helper for raw Retell API calls (for methods missing in SDK v2)
export async function callRetellApi(
  method: string,
  endpoint: string,
  body: any = null,
  organizationId?: string
) {
  let apiKey = process.env.RETELL_API_KEY || "fallback_key"

  if (organizationId) {
    try {
      apiKey = await getRetellApiKey(organizationId)
    } catch (e) {
      console.warn("Could not get org API key, using fallback", e)
    }
  }

  const url = `https://api.retellai.com${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`

  const response = await fetch(url, {
    method,
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Retell API Error ${response.status}: ${errorText}`)
  }

  return response.json()
}

// Get organization-specific Retell client
export async function getRetellClient(organizationId: string): Promise<RetellClient> {
  const apiKey = await getRetellApiKey(organizationId)

  return new RetellClient({
    apiKey,
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
  llmWebsocketUrl: string
}) {
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/retell`

  return retellClient.createAgent({
    agentName: config.name,
    voiceId: config.voiceId,
    llmWebsocketUrl: config.llmWebsocketUrl,
    webhookUrl: webhookUrl,
  })
}
