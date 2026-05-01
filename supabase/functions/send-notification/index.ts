import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const RESEND_API_KEY = "re_WvAQPCtG_P4xKaQXRQdghfDKghmZMKyz7";
const FROM_EMAIL = "HiramEase <notifications@hiramease.com>";

interface NotificationPayload {
  action?: string;
  notification_id?: string;
  user_id?: string;
  title?: string;
  message?: string;
  type?: string;
  email?: string;
  email_body?: string;
  tenant_id?: string;
  application_id?: string;
  loan_amount?: number;
  loan_purpose?: string;
}

async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  try {
    const apiKey = Deno.env.get("RESEND_API_KEY") || RESEND_API_KEY;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject: subject || "Notification from HiramEase",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #1d4ed8; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">HiramEase</h1>
            </div>
            <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <h2 style="color: #111827; margin-top: 0;">${subject || "Notification"}</h2>
              <div style="color: #4b5563; line-height: 1.6;">${body}</div>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
              <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                This is an automated notification from HiramEase. Please do not reply to this email.
              </p>
            </div>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Resend email failed:", response.status, errorText);
    }
    return response.ok;
  } catch (err) {
    console.error("Email send exception:", err);
    return false;
  }
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

    const results: {
      email_sent: boolean;
      in_app_created: boolean;
      admin_notified: boolean;
    } = {
      email_sent: false,
      in_app_created: false,
      admin_notified: false,
    };

    // --- New loan application: notify all lending admins for this tenant ---
    if (payload.action === "new_application" && payload.tenant_id) {
      const { data: admins } = await supabase
        .from("user_profiles")
        .select("id, email, first_name, last_name")
        .eq("tenant_id", payload.tenant_id)
        .eq("role", "lending_admin")
        .eq("is_active", true);

      if (admins && admins.length > 0) {
        const loanAmountStr = payload.loan_amount
          ? `PHP ${Number(payload.loan_amount).toLocaleString()}`
          : "N/A";

        const notifications = admins.map((admin) => ({
          user_id: admin.id,
          tenant_id: payload.tenant_id,
          title: "New Loan Application",
          message: `A new loan application for ${loanAmountStr} (${payload.loan_purpose || "General"}) has been submitted and requires your review.`,
          type: "new_application",
          metadata: {
            application_id: payload.application_id,
            loan_amount: payload.loan_amount,
            loan_purpose: payload.loan_purpose,
          },
        }));

        const { error: insertError } = await supabase
          .from("notifications")
          .insert(notifications);

        results.admin_notified = !insertError;

        // Email all admins
        for (const admin of admins) {
          if (admin.email) {
            await sendEmail(
              admin.email,
              "New Loan Application Received",
              `<p>Dear ${admin.first_name},</p>
               <p>A new loan application for <strong>${loanAmountStr}</strong> (${payload.loan_purpose || "General"}) has been submitted and requires your review.</p>
               <p>Please log in to the HiramEase dashboard to review the application.</p>`
            );
          }
        }
        if (admins[0]?.email) results.email_sent = true;
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Payment success: notify tenant admin and all superadmins ---
    if (payload.action === "payment_success" && payload.tenant_id) {
      // Superadmins
      const { data: superAdmins } = await supabase
        .from("user_profiles")
        .select("id, email, first_name, last_name")
        .eq("role", "super_admin")
        .eq("is_active", true);

      // Tenant admins
      const { data: tenantAdmins } = await supabase
        .from("user_profiles")
        .select("id, email, first_name, last_name")
        .eq("tenant_id", payload.tenant_id)
        .eq("role", "lending_admin")
        .eq("is_active", true);

      const allRecipients = [
        ...(superAdmins || []),
        ...(tenantAdmins || []),
      ];

      if (allRecipients.length > 0) {
        const notifications = allRecipients.map((u) => ({
          user_id: u.id,
          tenant_id: payload.tenant_id,
          title: payload.title || "Payment Received",
          message: payload.message || "A subscription payment has been received.",
          type: "payment_success",
          metadata: { notification_id: payload.notification_id },
        }));

        const { error: insertError } = await supabase
          .from("notifications")
          .insert(notifications);

        results.admin_notified = !insertError;

        for (const u of allRecipients) {
          if (u.email) {
            const sent = await sendEmail(
              u.email,
              payload.title || "Payment Received",
              payload.email_body ||
                `<p>Dear ${u.first_name},</p><p>${payload.message || "A subscription payment has been received and the subscription is now active."}</p>`
            );
            if (sent) results.email_sent = true;
          }
        }
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Generic in-app + email notification ---
    if (payload.user_id && payload.title) {
      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          user_id: payload.user_id,
          tenant_id: payload.tenant_id || null,
          title: payload.title,
          message: payload.message || "",
          type: payload.type || "system",
          metadata: {
            notification_id: payload.notification_id,
            email: payload.email,
          },
        });
      results.in_app_created = !notifError;
    }

    if (payload.email && payload.email_body) {
      results.email_sent = await sendEmail(
        payload.email,
        payload.title || "Notification from HiramEase",
        payload.email_body
      );
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
