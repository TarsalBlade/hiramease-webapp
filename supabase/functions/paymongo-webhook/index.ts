import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function notifyPaymentSuccess(
  supabaseUrl: string,
  tenantId: string,
  amountPhp: number,
  paymentId: string,
  paymentMethod: string
) {
  try {
    await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "payment_success",
        tenant_id: tenantId,
        title: "Payment Received",
        message: `A subscription payment of PHP ${amountPhp.toLocaleString()} has been received via ${paymentMethod}. Subscription is now active.`,
        email_body: `<p>A subscription payment of <strong>PHP ${amountPhp.toLocaleString()}</strong> has been received and processed.</p>
          <p><strong>Payment ID:</strong> ${paymentId}<br/><strong>Method:</strong> ${paymentMethod}</p>
          <p>The subscription is now active.</p>`,
      }),
    });
  } catch (err) {
    console.error("Failed to send payment notification:", err);
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

    const webhookData = await req.json();
    const eventType = webhookData.data?.attributes?.type;
    const resourceData = webhookData.data?.attributes?.data;

    console.log("Webhook event type:", eventType);
    console.log("Resource ID:", resourceData?.id);

    if (!eventType || !resourceData) {
      return new Response(JSON.stringify({ error: "Invalid webhook payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resourceId = resourceData.id;

    if (eventType === "checkout_session.payment.paid") {
      const checkoutAttrs = resourceData.attributes || {};
      const metadata = checkoutAttrs.metadata || {};
      const payments = checkoutAttrs.payments || [];

      let paymentMethodType = "card";
      if (payments.length > 0) {
        const firstPayment = payments[0];
        const paymentAttrs = firstPayment?.attributes || firstPayment;
        const source = paymentAttrs?.source || {};
        paymentMethodType = source?.type || paymentAttrs?.payment_method_type || "card";
      }

      const amountCentavos: number = checkoutAttrs.line_items?.[0]?.amount || 0;
      const amountPhp = amountCentavos / 100;

      // Update or create payment record
      const { data: existingPayment } = await supabase
        .from("paymongo_payments")
        .select("id, status")
        .eq("paymongo_payment_id", resourceId)
        .maybeSingle();

      if (existingPayment) {
        await supabase
          .from("paymongo_payments")
          .update({
            status: "succeeded",
            payment_method_type: paymentMethodType,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingPayment.id);
      } else if (metadata?.user_id && metadata?.tenant_id) {
        await supabase.from("paymongo_payments").insert({
          user_id: metadata.user_id,
          tenant_id: metadata.tenant_id,
          paymongo_payment_id: resourceId,
          amount: amountCentavos,
          currency: "PHP",
          status: "succeeded",
          payment_method_type: paymentMethodType,
          description: checkoutAttrs.description || "Subscription Payment",
          metadata: {
            plan_id: metadata.plan_id,
            checkout_session_id: resourceId,
            source: "webhook_fallback",
          },
        });
      }

      // Activate subscription
      if (metadata?.tenant_id && metadata?.plan_id) {
        const { error: rpcError } = await supabase.rpc("activate_paid_subscription", {
          p_tenant_id: metadata.tenant_id,
          p_plan_id: metadata.plan_id,
          p_payment_id: resourceId,
        });

        if (rpcError) {
          console.error("Error activating subscription:", rpcError);
        } else {
          console.log("Subscription activated for tenant:", metadata.tenant_id);
          // Notify superadmin + tenant admin via email and in-app
          await notifyPaymentSuccess(supabaseUrl, metadata.tenant_id, amountPhp, resourceId, paymentMethodType);
        }
      }

    } else if (
      eventType === "payment.paid" ||
      eventType === "payment_intent.succeeded"
    ) {
      const metadata = resourceData.attributes?.metadata;

      await supabase
        .from("paymongo_payments")
        .update({ status: "succeeded", updated_at: new Date().toISOString() })
        .eq("paymongo_payment_id", resourceId);

      if (metadata?.tenant_id && metadata?.plan_id) {
        const { error: rpcError } = await supabase.rpc("activate_paid_subscription", {
          p_tenant_id: metadata.tenant_id,
          p_plan_id: metadata.plan_id,
          p_payment_id: resourceId,
        });
        if (!rpcError) {
          const amountPhp = (resourceData.attributes?.amount || 0) / 100;
          await notifyPaymentSuccess(supabaseUrl, metadata.tenant_id, amountPhp, resourceId, "card");
        }
      }

    } else if (
      eventType === "payment.failed" ||
      eventType === "payment_intent.payment_failed" ||
      eventType === "checkout_session.payment.failed"
    ) {
      await supabase
        .from("paymongo_payments")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("paymongo_payment_id", resourceId);
    } else {
      console.log("Unhandled event type:", eventType);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
