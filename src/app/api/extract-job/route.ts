import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const MAX_JD_CHARS = 20_000;

const EXTRACT_TOOL: Anthropic.Tool = {
  name: "extracted_job",
  description: "Structured fields extracted from a job posting description.",
  input_schema: {
    type: "object",
    properties: {
      company: { type: "string", description: "Company name, or empty string if not stated." },
      role: { type: "string", description: "Job title/role, or empty string if not stated." },
      location: { type: "string", description: "Location (city/state, or 'Remote'), or empty string if not stated." },
      deadline: { type: "string", description: "Application deadline as YYYY-MM-DD if explicitly stated, else empty string." },
      sponsorship: {
        type: "string",
        enum: ["sponsors", "no_sponsorship", "not_mentioned"],
        description: "Whether the posting mentions visa sponsorship / work authorization requirements.",
      },
      sponsorship_quote: { type: "string", description: "Short verbatim quote backing the sponsorship field, or empty string if not_mentioned." },
    },
    required: ["company", "role", "location", "deadline", "sponsorship", "sponsorship_quote"],
  },
};

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server" },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const jdText = (body as { jdText?: unknown })?.jdText;
  if (typeof jdText !== "string" || !jdText.trim()) {
    return NextResponse.json({ error: "jdText is required" }, { status: 400 });
  }

  const trimmedJd = jdText.trim().slice(0, MAX_JD_CHARS);

  const client = new Anthropic({ apiKey });

  let message: Anthropic.Message;
  try {
    message = await client.messages.create({
      model: "claude-haiku-5-5",
      max_tokens: 500,
      tools: [EXTRACT_TOOL],
      tool_choice: { type: "tool", name: "extracted_job" },
      messages: [
        {
          role: "user",
          content: `Extract structured fields from this job posting. Leave a field as an empty string if the posting doesn't state it — never guess.\n\n${trimmedJd}`,
        },
      ],
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Extraction request failed" },
      { status: 502 }
    );
  }

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) {
    return NextResponse.json({ error: "Model did not return structured data" }, { status: 502 });
  }

  return NextResponse.json({ extracted: toolUse.input });
}
