import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

export const dynamic = "force-dynamic"

// Verify Retell webhook signature
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const hmac = crypto.createHmac("sha256", secret)
    const digest = hmac.update(payload).digest("hex")
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(digest)
    )
  } catch (error) {
    return false
  }
}

// POST /api/webhooks/retell - Handle Retell webhooks
export async function POST(req: NextRequest) {
  try {
    const payload = await req.text()
    const signature = req.headers.get("x-retell-signature")

    // Verify signature
    const webhookSecret = process.env.RETELL_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error("RETELL_WEBHOOK_SECRET not configured")
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 }
      )
    }

    if (!signature || !verifyWebhookSignature(payload, signature, webhookSecret)) {
      console.error("Invalid webhook signature")
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      )
    }

    const data = JSON.parse(payload)
    const { event, call } = data

    console.log(`Received webhook event: ${event} for call ${call.call_id}`)

    // Extract organizationId from metadata
    const organizationId = call.metadata?.organizationId
    if (!organizationId) {
      console.error("No organizationId in webhook metadata")
      await logWebhookError(data, "No organizationId in metadata")
      return NextResponse.json(
        { error: "Invalid metadata" },
        { status: 400 }
      )
    }

    // Find call in database
    const dbCall = await prisma.call.findFirst({
      where: {
        retellCallId: call.call_id,
        organizationId
      }
    })

    if (!dbCall) {
      console.error(`Call not found: ${call.call_id}`)
      await logWebhookError(data, "Call not found in database", organizationId)
      return NextResponse.json(
        { error: "Call not found" },
        { status: 404 }
      )
    }

    // Process webhook based on event type
    switch (event) {
      case "call_started":
        await handleCallStarted(dbCall.id, call, organizationId, data)
        break
      case "call_ended":
        await handleCallEnded(dbCall.id, call, organizationId, data)
        break
      case "call_analyzed":
        await handleCallAnalyzed(dbCall.id, call, organizationId, data)
        break
      default:
        console.warn(`Unknown event type: ${event}`)
        await logWebhookError(data, `Unknown event type: ${event}`, organizationId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error processing webhook:", error)
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    )
  }
}

async function handleCallStarted(
  callId: string,
  callData: any,
  organizationId: string,
  fullPayload: any
) {
  console.log(`Processing call_started for call ${callId}`)

  await prisma.$transaction([
    prisma.call.update({
      where: { id: callId },
      data: {
        status: "IN_PROGRESS",
        startedAt: callData.start_timestamp
          ? new Date(callData.start_timestamp)
          : new Date()
      }
    }),
    prisma.webhookLog.create({
      data: {
        callId,
        organizationId,
        eventType: "CALL_STARTED",
        payload: fullPayload,
        processed: true
      }
    })
  ])

  console.log(`✓ Call ${callId} marked as IN_PROGRESS`)
}

async function handleCallEnded(
  callId: string,
  callData: any,
  organizationId: string,
  fullPayload: any
) {
  console.log(`Processing call_ended for call ${callId}`)

  const transcript = callData.transcript
    ? typeof callData.transcript === "string"
      ? callData.transcript
      : JSON.stringify(callData.transcript)
    : null

  const durationMs = callData.end_timestamp && callData.start_timestamp
    ? callData.end_timestamp - callData.start_timestamp
    : null

  await prisma.$transaction(async (tx) => {
    // Update call
    await tx.call.update({
      where: { id: callId },
      data: {
        status: "ENDED",
        endedAt: callData.end_timestamp
          ? new Date(callData.end_timestamp)
          : new Date(),
        durationMs,
        transcript,
        recordingUrl: callData.recording_url || null,
        // Enhanced transcript data
        transcriptObject: callData.transcript_object || null,
        transcriptWithToolCalls: callData.transcript_with_tool_calls || null,
        // Multi-channel & advanced recording
        recordingMultiChannelUrl: callData.recording_multi_channel_url || null,
        scrubbedRecordingUrl: callData.scrubbed_recording_url || null,
        // Debugging & analysis URLs
        publicLogUrl: callData.public_log_url || null,
        knowledgeBaseUrl: callData.knowledge_base_url || null,
        // Call flow
        disconnectionReason: callData.disconnection_reason || null,
        transferDestination: callData.opt_out_sensitive_data_storage
          ? null
          : callData.call_transfer?.to_number || null,
        // Cost & token usage
        llmTokenUsage: callData.llm_token_count || null,
        callCost: callData.call_cost || null,
      }
    })

    // Update organization quota (track usage)
    if (durationMs) {
      const durationMinutes = Math.ceil(durationMs / 60000) // Round up to nearest minute
      await tx.organization.update({
        where: { id: organizationId },
        data: {
          monthlyCallMinutes: {
            increment: durationMinutes
          }
        }
      })
      console.log(`✓ Added ${durationMinutes} minutes to organization ${organizationId} quota`)
    }

    // Webhook log
    await tx.webhookLog.create({
      data: {
        callId,
        organizationId,
        eventType: "CALL_ENDED",
        payload: fullPayload,
        processed: true
      }
    })
  })

  console.log(`✓ Call ${callId} marked as ENDED`)
}

async function handleCallAnalyzed(
  callId: string,
  callData: any,
  organizationId: string,
  fullPayload: any
) {
  console.log(`Processing call_analyzed for call ${callId}`)

  const analysis = callData.call_analysis
  const latency = callData.latency

  const transcript = callData.transcript
    ? typeof callData.transcript === "string"
      ? callData.transcript
      : JSON.stringify(callData.transcript)
    : null

  // Get call details to find customer (restaurant/hotel owner)
  const call = await prisma.call.findUnique({
    where: { id: callId },
    include: {
      initiatedBy: {
        select: { id: true, customerType: true }
      }
    }
  })

  // Extract order/reservation info from custom analysis
  const customAnalysisData = analysis?.custom_analysis_data

  await prisma.$transaction(async (tx) => {
    // Update call
    await tx.call.update({
      where: { id: callId },
      data: {
        status: "ANALYZED",
        ...(transcript && { transcript }),
        // Enhanced transcript data (if not already set in call_ended)
        transcriptObject: callData.transcript_object || null,
        transcriptWithToolCalls: callData.transcript_with_tool_calls || null,
        // Multi-channel & advanced recording
        recordingMultiChannelUrl: callData.recording_multi_channel_url || null,
        scrubbedRecordingUrl: callData.scrubbed_recording_url || null,
        // Debugging & analysis URLs
        publicLogUrl: callData.public_log_url || null,
        knowledgeBaseUrl: callData.knowledge_base_url || null,
        // Call flow
        disconnectionReason: callData.disconnection_reason || null,
        transferDestination: callData.opt_out_sensitive_data_storage
          ? null
          : callData.call_transfer?.to_number || null,
        // Cost & token usage
        llmTokenUsage: callData.llm_token_count || null,
        callCost: callData.call_cost || null,
      }
    })

    // Create order or reservation based on customer type and analysis data
    if (call && customAnalysisData) {
      if (call.initiatedBy.customerType === "RESTAURANT" && customAnalysisData.order) {
        // Create order for restaurant
        await tx.order.create({
          data: {
            customerId: call.initiatedById,
            callId: callId,
            customerName: customAnalysisData.order.customer_name || "Unknown",
            customerPhone: callData.from_number || call.fromNumber,
            items: customAnalysisData.order.items || transcript || "No items specified",
            totalAmount: customAnalysisData.order.total_amount ? parseFloat(customAnalysisData.order.total_amount) : null,
            deliveryAddress: customAnalysisData.order.delivery_address || null,
            notes: customAnalysisData.order.notes || null,
            status: "PENDING"
          }
        })
        console.log(`✓ Created order for call ${callId}`)
      } else if (call.initiatedBy.customerType === "HOTEL" && customAnalysisData.reservation) {
        // Create reservation for hotel
        await tx.reservation.create({
          data: {
            customerId: call.initiatedById,
            callId: callId,
            guestName: customAnalysisData.reservation.guest_name || "Unknown",
            guestPhone: callData.from_number || call.fromNumber,
            guestEmail: customAnalysisData.reservation.guest_email || null,
            checkIn: customAnalysisData.reservation.check_in ? new Date(customAnalysisData.reservation.check_in) : new Date(),
            checkOut: customAnalysisData.reservation.check_out ? new Date(customAnalysisData.reservation.check_out) : new Date(),
            roomType: customAnalysisData.reservation.room_type || null,
            numberOfGuests: customAnalysisData.reservation.number_of_guests || 1,
            specialRequests: customAnalysisData.reservation.special_requests || null,
            status: "PENDING"
          }
        })
        console.log(`✓ Created reservation for call ${callId}`)
      }
    }

    // Create analytics
    await tx.callAnalytics.upsert({
      where: { callId },
      create: {
        callId,
        summary: analysis?.call_summary || null,
        sentiment: analysis?.sentiment || null,
        successEvaluation: analysis?.call_successful?.toString() || null,
        customAnalysis: analysis?.custom_analysis_data || null,
        // E2E latency
        e2eLatencyP50: latency?.e2e_latency?.p50 || null,
        e2eLatencyP90: latency?.e2e_latency?.p90 || null,
        e2eLatencyP95: latency?.e2e_latency?.p95 || null,
        e2eLatencyP99: latency?.e2e_latency?.p99 || null,
        // LLM latency
        llmLatencyP50: latency?.llm_latency?.p50 || null,
        llmLatencyP90: latency?.llm_latency?.p90 || null,
        llmLatencyP95: latency?.llm_latency?.p95 || null,
        llmLatencyP99: latency?.llm_latency?.p99 || null,
        // ASR (Speech Recognition) latency
        asrLatencyP50: latency?.asr_latency?.p50 || null,
        asrLatencyP90: latency?.asr_latency?.p90 || null,
        asrLatencyP95: latency?.asr_latency?.p95 || null,
        asrLatencyP99: latency?.asr_latency?.p99 || null,
        // TTS (Text-to-Speech) latency
        ttsLatencyP50: latency?.tts_latency?.p50 || null,
        ttsLatencyP90: latency?.tts_latency?.p90 || null,
        ttsLatencyP95: latency?.tts_latency?.p95 || null,
        ttsLatencyP99: latency?.tts_latency?.p99 || null,
        // Knowledge Base latency
        kbLatencyP50: latency?.knowledge_base_latency?.p50 || null,
        kbLatencyP90: latency?.knowledge_base_latency?.p90 || null,
        kbLatencyP95: latency?.knowledge_base_latency?.p95 || null,
        kbLatencyP99: latency?.knowledge_base_latency?.p99 || null,
        // Network latency
        llmWebsocketNetworkRttP50: latency?.llm_websocket_network_rtt_latency?.p50 || null,
        llmWebsocketNetworkRttP90: latency?.llm_websocket_network_rtt_latency?.p90 || null,
        llmWebsocketNetworkRttP95: latency?.llm_websocket_network_rtt_latency?.p95 || null,
        llmWebsocketNetworkRttP99: latency?.llm_websocket_network_rtt_latency?.p99 || null
      },
      update: {
        summary: analysis?.call_summary || null,
        sentiment: analysis?.sentiment || null,
        successEvaluation: analysis?.call_successful?.toString() || null,
        customAnalysis: analysis?.custom_analysis_data || null,
        // E2E latency
        e2eLatencyP50: latency?.e2e_latency?.p50 || null,
        e2eLatencyP90: latency?.e2e_latency?.p90 || null,
        e2eLatencyP95: latency?.e2e_latency?.p95 || null,
        e2eLatencyP99: latency?.e2e_latency?.p99 || null,
        // LLM latency
        llmLatencyP50: latency?.llm_latency?.p50 || null,
        llmLatencyP90: latency?.llm_latency?.p90 || null,
        llmLatencyP95: latency?.llm_latency?.p95 || null,
        llmLatencyP99: latency?.llm_latency?.p99 || null,
        // ASR (Speech Recognition) latency
        asrLatencyP50: latency?.asr_latency?.p50 || null,
        asrLatencyP90: latency?.asr_latency?.p90 || null,
        asrLatencyP95: latency?.asr_latency?.p95 || null,
        asrLatencyP99: latency?.asr_latency?.p99 || null,
        // TTS (Text-to-Speech) latency
        ttsLatencyP50: latency?.tts_latency?.p50 || null,
        ttsLatencyP90: latency?.tts_latency?.p90 || null,
        ttsLatencyP95: latency?.tts_latency?.p95 || null,
        ttsLatencyP99: latency?.tts_latency?.p99 || null,
        // Knowledge Base latency
        kbLatencyP50: latency?.knowledge_base_latency?.p50 || null,
        kbLatencyP90: latency?.knowledge_base_latency?.p90 || null,
        kbLatencyP95: latency?.knowledge_base_latency?.p95 || null,
        kbLatencyP99: latency?.knowledge_base_latency?.p99 || null,
        // Network latency
        llmWebsocketNetworkRttP50: latency?.llm_websocket_network_rtt_latency?.p50 || null,
        llmWebsocketNetworkRttP90: latency?.llm_websocket_network_rtt_latency?.p90 || null,
        llmWebsocketNetworkRttP95: latency?.llm_websocket_network_rtt_latency?.p95 || null,
        llmWebsocketNetworkRttP99: latency?.llm_websocket_network_rtt_latency?.p99 || null
      }
    })

    // Log webhook
    await tx.webhookLog.create({
      data: {
        callId,
        organizationId,
        eventType: "CALL_ANALYZED",
        payload: fullPayload,
        processed: true
      }
    })
  })

  console.log(`✓ Call ${callId} analyzed with sentiment: ${analysis?.sentiment}`)
}

// Helper function to extract order from transcript (fallback if no custom_analysis_data)
function extractOrderFromTranscript(transcript: string): any {
  // Simple extraction - can be improved with AI/regex
  return {
    customer_name: "Unknown",
    items: transcript,
    total_amount: null,
    delivery_address: null,
    notes: null
  }
}

async function logWebhookError(payload: any, errorMessage: string, organizationId?: string) {
  try {
    await prisma.webhookLog.create({
      data: {
        organizationId: organizationId || "unknown",
        eventType: payload.event?.toUpperCase().replace(".", "_") || "CALL_STARTED",
        payload,
        processed: false,
        error: errorMessage
      }
    })
  } catch (err) {
    console.error("Failed to log webhook error:", err)
  }
}
