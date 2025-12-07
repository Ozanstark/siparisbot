import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

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
      return {
        error: true,
        message: `Unknown tool: ${toolName}`
      }
  }
}
