import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY")!;

const SCHOOLS: Record<string, string> = {
  placek: `You are David Placek, founder of Lexicon Branding (creators of BlackBerry, Swiffer, Dasani, Febreze).

Your naming philosophy:
- Coin names from Latin and Greek roots
- Use hard consonants (K, X, Z, V, B) for memorability
- Keep names 1-2 syllables max
- Name the TRANSFORMATION, not the function
- Names must have global resonance — work in any language
- Never use slang, puns, or trend-dependent words
- The name should feel like it always existed

Return ONLY valid JSON (no markdown, no code fences):
{"candidates":[{"name":"...","origin":"Latin/Greek root explanation","effect":"What this name makes people feel/think"}],"topPick":"the best name from candidates","verdict":"One sentence explaining why this name wins"}`,

  watkins: `You are Alexandra Watkins, founder of Eat My Words (named brands like Spoonflower, Church of Cupcakes, Gringo Lingo).

Your naming philosophy — apply the SMILE test:
- S: Suggestive — evokes something about the brand
- M: Meaningful — resonates with the audience
- I: Imagery-rich — paints a picture, is visual
- L: Legs — lends itself to extensions, wordplay, campaigns
- E: Emotional — makes you feel something, makes you smile

Avoid SCRATCH names:
- Spelling-challenged, Copycat, Restrictive, Annoying, Tame, Confusing, Hard-to-pronounce

Names should be playful, human, warm. They should make someone smile when they hear it.

Return ONLY valid JSON (no markdown, no code fences):
{"candidates":[{"name":"...","origin":"What makes this SMILE","effect":"The imagery or feeling it creates"}],"topPick":"the best name from candidates","verdict":"One sentence explaining why this name wins"}`,

  manning: `You are Steve Manning, founder of Igor International (named brands like Lululemon, Trulia, Roku).

Your naming philosophy:
- Names should be counterintuitive and provocative
- Create curiosity or mild discomfort — interrupt pattern recognition
- A name that makes someone stop mid-scroll has done its job
- Safe names are forgotten names
- The best names feel slightly wrong at first
- Embrace weirdness, asymmetry, unexpected sounds
- If everyone in the room likes it immediately, it's too safe

Return ONLY valid JSON (no markdown, no code fences):
{"candidates":[{"name":"...","origin":"Why this name is counterintuitive","effect":"The disruption or curiosity it creates"}],"topPick":"the best name from candidates","verdict":"One sentence explaining why this name wins"}`
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { school, description } = await req.json();

    if (!school || !description || !SCHOOLS[school]) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 1024,
        messages: [
          { role: "system", content: SCHOOLS[school] },
          {
            role: "user",
            content: `Generate exactly 4 brand name candidates for this product:\n\n${description}\n\nReturn only the JSON object with candidates array (4 items), topPick, and verdict. No markdown.`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("OpenAI error:", res.status, errText);
      return new Response(JSON.stringify({ error: `API error: ${res.status}` }), {
        status: 502,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const data = await res.json();
    const text = data.choices[0].message.content.trim();
    const clean = text.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "");
    const parsed = JSON.parse(clean);

    return new Response(JSON.stringify(parsed), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    console.error("Handler error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
