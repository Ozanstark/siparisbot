import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

export const dynamic = "force-dynamic"

/**
 * Webhook endpoint for Retell tool execution callbacks
 * This endpoint is called when an agent invokes a custom tool during a call
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Extract tool call information
    const {
      call_id,
      tool_call_id,
      tool_name,
      arguments: toolArgs,
    } = body

    console.log("Tool call received:", {
      call_id,
      tool_call_id,
      tool_name,
      arguments: toolArgs
    })

    // Find the call in database to get organization context
    const call = await prisma.call.findUnique({
      where: { retellCallId: call_id },
      include: {
        bot: {
          select: {
            customTools: true,
            organizationId: true
          }
        }
      }
    })

    if (!call) {
      console.error("Call not found:", call_id)
      return NextResponse.json(
        { error: "Call not found" },
        { status: 404 }
      )
    }

    // Find the tool definition
    const tools = (call.bot.customTools as any[]) || []
    const toolDef = tools.find(t => t.function?.name === tool_name)

    if (!toolDef) {
      console.error("Tool not found:", tool_name)
      return NextResponse.json(
        {
          result: `Error: Tool '${tool_name}' not found`,
          error: true
        },
        { status: 200 } // Return 200 so Retell doesn't retry
      )
    }

    // Execute the tool based on its configuration
    let result: any

    if (toolDef.function.url) {
      // External webhook-based tool
      try {
        const response = await fetch(toolDef.function.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            call_id,
            tool_call_id,
            tool_name,
            arguments: toolArgs,
            organization_id: call.bot.organizationId
          })
        })

        if (!response.ok) {
          throw new Error(`Tool webhook returned ${response.status}`)
        }

        result = await response.json()
      } catch (error: any) {
        console.error("Tool webhook error:", error)
        result = {
          error: true,
          message: `Tool execution failed: ${error.message}`
        }
      }
    } else {
      // Built-in tool execution logic
      // This is where you would implement custom tool logic
      // For now, return a placeholder response
      result = await executeBuiltInTool(tool_name, toolArgs, call)
    }

    // Return result to Retell
    return NextResponse.json({
      result: typeof result === "string" ? result : JSON.stringify(result),
      tool_call_id
    })
  } catch (error) {
    console.error("Tool call webhook error:", error)
    return NextResponse.json(
      {
        result: "Error executing tool",
        error: true
      },
      { status: 500 }
    )
  }
}

/**
 * Execute built-in tools
 * Add custom tool logic here based on tool_name
 */
async function executeBuiltInTool(
  toolName: string,
  args: any,
  call: any
): Promise<any> {
  switch (toolName) {
    case "create_order":
      // Validated Logic for creating an order
      try {
        console.log("Creating order with args:", args)

        // we need the customer (restaurant) ID from the call
        if (!call || !call.bot || !call.bot.organizationId) {
          throw new Error("Call context missing organization/bot info")
        }

        // Get the call's initiator to link the customer
        // If the call doesn't have an initiator (e.g. inbound), we might need to rely on the organization owner or find a default user
        // For now, we'll try to find the user associated with the organization
        const organizationId = call.bot.organizationId

        // Find a default user for this org to assign the order to (usually the admin/owner)
        // In a real scenario, this might be based on the specific phone number or department
        const defaultUser = await prisma.user.findFirst({
          where: { organizationId: organizationId }
        })

        if (!defaultUser) {
          throw new Error("No user found for this organization to assign order")
        }

        const newOrder = await prisma.order.create({
          data: {
            customerId: defaultUser.id,
            callId: call.id,
            customerName: args.customer_name || args.name || "Misafir Müşteri",
            customerPhone: args.customer_phone || args.phone || call.fromNumber || "Bilinmiyor",
            items: args.items || args.order_details || "Belirtilmedi",
            deliveryAddress: args.delivery_address || args.address || "Teslimat adresi belirtilmedi",
            totalAmount: args.total_amount ? parseFloat(args.total_amount) : 0,
            notes: args.notes || "",
            status: "PENDING"
          }
        })

        return {
          success: true,
          order_id: newOrder.id,
          message: `Siparişiniz alındı. Sipariş numaranız: ${newOrder.id.slice(-4)}. Hazırlanmaya başlıyor.`
        }

      } catch (err: any) {
        console.error("Failed to create order:", err)
        return {
          error: true,
          message: "Sipariş oluşturulurken bir hata oluştu. Lütfen yetkiliyi bağlayın."
        }
      }

    case "check_order_status":
      // Logic to check order status
      try {
        const orderId = args.order_id
        if (!orderId) throw new Error("Order ID required")

        // Find order (fuzzy match last 4 chars if short id provided)
        let order = null
        if (orderId.length < 10) {
          order = await prisma.order.findFirst({
            where: {
              id: { endsWith: orderId },
              call: { retellCallId: call.retellCallId } // Security: scope to this call or customer phone
            }
          })
        } else {
          order = await prisma.order.findUnique({ where: { id: orderId } })
        }

        if (!order) return { error: true, message: "Sipariş bulunamadı." }

        return {
          status: order.status,
          items: order.items,
          message: `Siparişinizin durumu: ${order.status === 'PENDING' ? 'Bekliyor' : order.status === 'PREPARING' ? 'Hazırlanıyor' : order.status === 'READY' ? 'Teslime Hazır' : 'Tamamlandı'}.`
        }

      } catch (err) {
        return { error: true, message: "Sipariş durumu sorgulanamadı." }
      }

    case "get_call_info":
      // Example: Return call information
      return {
        call_id: call.id,
        status: call.status,
        duration: call.durationMs,
        to_number: call.toNumber
      }

    case "lookup_customer":
      // Example: Customer lookup
      // Implement your custom logic here
      return {
        customer_id: args.customer_id || "unknown",
        name: "John Doe",
        status: "active"
      }

    case "check_availability":
      // Example: Availability check
      const date = args.date || new Date().toISOString().split("T")[0]
      return {
        date,
        available: true,
        slots: ["09:00", "10:00", "14:00", "15:00"]
      }

    default:
      console.warn(`Unknown tool call: ${toolName}`, args)
      return {
        error: true,
        message: `Unknown tool: ${toolName}`
      }
  }
}
