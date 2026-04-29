// Supabase Edge Function: OpenAI API Proxy
// This keeps the OpenAI API key server-side only.
//
// Setup:
//   1. Deploy this function: supabase functions deploy openai-proxy
//   2. Set the secret:    supabase secrets set OPENAI_API_KEY=sk-your-key-here
//
// The function expects a POST request with:
//   { "messages": [...], "max_tokens": number, "temperature": number }
//
// Rate limiting: Simple IP-based rate limit (60 requests per minute per IP)

import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const RATE_LIMIT_WINDOW = 60_000 // 1 minute
const RATE_LIMIT_MAX = 60        // max requests per window
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return true
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false
  }

  entry.count++
  return true
}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip)
  }
}, 5 * 60_000)

Deno.serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  }

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // Rate limiting
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown"

  if (!checkRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Please wait a moment." }),
      {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }

  // Get API key from server-side environment variable
  const apiKey = Deno.env.get("OPENAI_API_KEY")
  if (!apiKey) {
    console.error("OPENAI_API_KEY not configured in Supabase secrets")
    return new Response(
      JSON.stringify({ error: "Service not configured" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }

  try {
    const body = await req.json()

    // Validate input
    if (!body.messages || !Array.isArray(body.messages)) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Limit max_tokens to prevent abuse
    const maxTokens = Math.min(body.max_tokens || 500, 1000)
    const temperature = Math.min(Math.max(body.temperature || 0.7, 0), 2)

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: body.model || "gpt-4o-mini",
        messages: body.messages,
        max_tokens: maxTokens,
        temperature,
      }),
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      console.error("OpenAI API error:", response.status, errData)
      return new Response(
        JSON.stringify({
          error: "AI service error",
          status: response.status,
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const data = await response.json()

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("Edge function error:", err)
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})