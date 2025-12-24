import { NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

type LogApiCallOptions = {
  request: NextRequest | Request
  route: string
  requestId?: string
  userId?: string | null
}

/**
 * Record one API call into `api_logs` table.
 * This is intentionally "fire-and-forget": errors are only logged to console
 * and will not block normal API responses.
 */
export async function logApiCall(options: LogApiCallOptions) {
  try {
    const { request, route, requestId, userId } = options
    const url = new URL(request.url)

    const supabase = createAdminClient()

    const { error } = await supabase.from("api_logs").insert({
      path: route || url.pathname,
      method: (request as any).method || "UNKNOWN",
      user_id: userId ?? null,
      query: url.search || null,
      request_id: requestId ?? null,
    })

    if (error) {
      // Do not throw – logging must never break the main API logic
      console.error("[api-logger] Failed to insert api_logs:", error.message)
    }
  } catch (error) {
    console.error("[api-logger] Unexpected error while logging API call:", error)
  }
}











