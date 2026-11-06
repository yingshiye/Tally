import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const MAX_JD_CHARS = 20_000;
const GEMINI_MODEL = "gemini-3.1-flash-lite";

const EXTRACTED_JOB_SCHEMA = {
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
};

interface ExtractedJob {
  company: string;
  role: string;
  location: string;
  deadline: string;
  sponsorship: "sponsors" | "no_sponsorship" | "not_mentioned";
  sponsorship_quote: string;
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured on the server" },
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

  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Extract structured fields from this job posting. Leave a field as an empty string if the posting doesn't state it — never guess.\n\n${trimmedJd}`,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: EXTRACTED_JOB_SCHEMA,
          },
        }),
      }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Extraction request failed" },
      { status: 502 }
    );
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    return NextResponse.json(
      { error: `Gemini request failed (${response.status}): ${errText}` },
      { status: 502 }
    );
  }

  const data = await response.json();
  const textPart: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textPart) {
    return NextResponse.json({ error: "Model did not return structured data" }, { status: 502 });
  }

  let extracted: ExtractedJob;
  try {
    extracted = JSON.parse(textPart);
  } catch {
    return NextResponse.json({ error: "Model returned malformed JSON" }, { status: 502 });
  }

  return NextResponse.json({ extracted });
}
