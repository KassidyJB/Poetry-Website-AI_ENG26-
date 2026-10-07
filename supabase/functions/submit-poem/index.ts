const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function respond(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return respond({ error: "Use POST to submit a poem." }, 405);
  }

  let submitted: unknown;
  try {
    submitted = await request.json();
  } catch {
    return respond({ error: "Send poem details as JSON." }, 400);
  }

  if (!submitted || typeof submitted !== "object") {
    return respond({ error: "The poem details are invalid." }, 400);
  }

  const values = submitted as Record<string, unknown>;
  const poet = typeof values.poet === "string" ? values.poet.trim() : "";
  const title = typeof values.title === "string" ? values.title.trim() : "";
  const poem = typeof values.poem === "string" ? values.poem.trim() : "";

  if (!poet || poet.length > 80 || !title || title.length > 120 || !poem || poem.length > 5000) {
    return respond({ error: "Check the name, title, and poem length, then try again." }, 400);
  }

  const projectUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!projectUrl || !serviceRoleKey) {
    console.error("Supabase function secrets are not configured.");
    return respond({ error: "Publishing is not configured yet." }, 500);
  }

  try {
    const response = await fetch(`${projectUrl}/rest/v1/poems`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({ poet, title, poem })
    });

    if (!response.ok) {
      console.error("Poem insert failed with status", response.status);
      return respond({ error: "The poem could not be saved. Please try again." }, 502);
    }

    return respond({ ok: true }, 201);
  } catch (error) {
    console.error("Poem insert request failed", error);
    return respond({ error: "The poem could not be saved. Please try again." }, 502);
  }
});