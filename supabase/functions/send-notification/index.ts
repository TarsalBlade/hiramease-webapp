import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NotificationPayload {
  notification_id?: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  email?: string;
  phone?: string;
  email_body?: string;
  sms_body?: string;
  tenant_id?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const payload: NotificationPayload = await req.json();

    const results: { email_sent: boolean; sms_sent: boolean; in_app_created: boolean } = {
      email_sent: false,
      sms_sent: false,
      in_app_created: false,
    };

    if (payload.user_id && payload.title) {
      const { error: notifError } = await supabase.from("notifications").insert({
        user_id: payload.user_id,
        tenant_id: payload.tenant_id || null,
        title: payload.title,
        message: payload.message || "",
        type: payload.type || "system",
        metadata: {
          notification_id: payload.notification_id,
          email: payload.email,
          phone: payload.phone,
        },
      });
      results.in_app_created = !notifError;
    }

    if (payload.email && payload.email_body) {
      try {
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        if (resendApiKey) {
          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "HiramEase <notifications@hiramease.com>",
              to: [payload.email],
              subject: payload.title,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background: #0f766e; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">HiramEase</h1>
                  </div>
                  <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                    <h2 style="color: #111827; margin-top: 0;">${payload.title}</h2>
                    <div style="color: #4b5563; line-height: 1.6;">${payload.email_body}</div>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                    <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                      This is an automated notification from HiramEase. Please do not reply to this email.
                    </p>
                  </div>
                </div>
              `,
            }),
          });
          results.email_sent = emailResponse.ok;
        }
      } catch (emailErr) {
        console.error("Email send failed:", emailErr);
      }
    }

    if (payload.phone && payload.sms_body) {
      try {
        const semaphoreApiKey = Deno.env.get("SEMAPHORE_API_KEY");
        if (semaphoreApiKey) {
          const smsResponse = await fetch(
            "https://api.semaphore.co/api/v4/messages",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                apikey: semaphoreApiKey,
                number: payload.phone,
                message: payload.sms_body,
                sendername: "HiramEase",
              }),
            }
          );
          results.sms_sent = smsResponse.ok;
        }
      } catch (smsErr) {
        console.error("SMS send failed:", smsErr);
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Notification error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
