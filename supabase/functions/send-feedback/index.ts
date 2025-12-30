import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.finoritrade.com",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FeedbackRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const sendEmail = async (
  resendApiKey: string,
  to: string[],
  from: string,
  subject: string,
  html: string
) => {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
};

serve(async (req: Request) => {
  // ✅ CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY missing");
    }

    const { name, email, subject, message }: FeedbackRequest = await req.json();

    if (!name || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: "All fields are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // email to you
    await sendEmail(
      resendApiKey,
      ["finoritrade.privacy@gmail.com"],
      "FinoriTrade <noreply@finoritrade.com>",
      `[Feedback] ${subject}`,
      `<p>${message}</p>`
    );

    // confirmation
    await sendEmail(
      resendApiKey,
      [email],
      "FinoriTrade <noreply@finoritrade.com>",
      "We received your feedback",
      `<p>Thanks ${name}, we got it.</p>`
    );

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
