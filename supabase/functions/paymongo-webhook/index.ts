import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const paymongoSecretKey = Deno.env.get("PAYMONGO_SECRET_KEY");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const webhookData = await req.json();
    const eventType = webhookData.data?.attributes?.type;
    const resourceData = webhookData.data?.attributes?.data;

    console.log("Webhook event type:", eventType);
    console.log("Resource ID:", resourceData?.id);

    if (!eventType || !resourceData) {
      console.error("Invalid webhook payload - missing eventType or resourceData");
      return new Response(
        JSON.stringify({ error: "Invalid webhook payload" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
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

      console.log("Checkout session paid:", resourceId, "method:", paymentMethodType, "metadata:", JSON.stringify(metadata));

      const { data: existingPayment, error: findError } = await supabase
        .from("paymongo_payments")
        .select("id, status")
        .eq("paymongo_payment_id", resourceId)
        .maybeSingle();

      if (findError) {
        console.error("Error finding payment record:", findError);
      }

      if (existingPayment) {
        const { error: updateError } = await supabase
          .from("paymongo_payments")
          .update({
            status: "succeeded",
            payment_method_type: paymentMethodType,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingPayment.id);

        if (updateError) {
          console.error("Error updating payment:", updateError);
        } else {
          console.log("Payment record updated to succeeded:", existingPayment.id);
        }
      } else {
        console.log("No matching payment record found for checkout session:", resourceId);

        if (metadata?.user_id && metadata?.tenant_id) {
          const { error: insertError } = await supabase
            .from("paymongo_payments")
            .insert({
              user_id: metadata.user_id,
              tenant_id: metadata.tenant_id,
              paymongo_payment_id: resourceId,
              amount: checkoutAttrs.line_items?.[0]?.amount || 0,
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

          if (insertError) {
            console.error("Error inserting fallback payment record:", insertError);
          } else {
            console.log("Created fallback payment record for:", resourceId);
          }
        }
      }

      if (metadata?.tenant_id && metadata?.plan_id) {
        const { error: rpcError } = await supabase.rpc(
          "activate_paid_subscription",
          {
            p_tenant_id: metadata.tenant_id,
            p_plan_id: metadata.plan_id,
            p_payment_id: resourceId,
          }
        );

        if (rpcError) {
          console.error("Error activating subscription:", rpcError);
        } else {
          console.log("Subscription activated for tenant:", metadata.tenant_id);
        }
      } else {
        console.log("Missing metadata for subscription activation. tenant_id:", metadata?.tenant_id, "plan_id:", metadata?.plan_id);
      }
    } else if (
      eventType === "payment.paid" ||
      eventType === "payment_intent.succeeded"
    ) {
      const metadata = resourceData.attributes?.metadata;

      await supabase
        .from("paymongo_payments")
        .update({
          status: "succeeded",
          updated_at: new Date().toISOString(),
        })
        .eq("paymongo_payment_id", resourceId);

      if (metadata?.tenant_id && metadata?.plan_id) {
        const { error: rpcError } = await supabase.rpc(
          "activate_paid_subscription",
          {
            p_tenant_id: metadata.tenant_id,
            p_plan_id: metadata.plan_id,
            p_payment_id: resourceId,
          }
        );

        if (rpcError) {
          console.error("Error activating subscription:", rpcError);
        }
      }
    } else if (
      eventType === "payment.failed" ||
      eventType === "payment_intent.payment_failed" ||
      eventType === "checkout_session.payment.failed"
    ) {
      await supabase
        .from("paymongo_payments")
        .update({
          status: "failed",
          updated_at: new Date().toISOString(),
        })
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
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
