import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CheckoutRequest {
  amount: number;
  description: string;
  planId: string;
  tenantId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const paymongoSecretKey = Deno.env.get("PAYMONGO_SECRET_KEY");

    if (!paymongoSecretKey) {
      return new Response(
        JSON.stringify({
          error:
            "Payment service is not configured. Please contact support.",
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const authClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          error: "Your session has expired. Please log in again.",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { amount, description, planId, tenantId }: CheckoutRequest =
      await req.json();

    if (!amount || !planId || !tenantId) {
      return new Response(
        JSON.stringify({ error: "Missing required payment information." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const origin = req.headers.get("origin") || "";
    const baseUrl = origin || supabaseUrl;

    const checkoutPayload = {
      data: {
        attributes: {
          line_items: [
            {
              currency: "PHP",
              amount: amount,
              name: description || "Subscription",
              quantity: 1,
            },
          ],
          payment_method_types: ["card", "gcash", "grab_pay", "paymaya", "qrph"],
          success_url: `${baseUrl}?payment=success`,
          cancel_url: `${baseUrl}?payment=cancelled`,
          description: description || "HiramEase Subscription",
          statement_descriptor: "HiramEase",
          metadata: {
            user_id: user.id,
            tenant_id: tenantId,
            plan_id: planId,
          },
        },
      },
    };

    const paymongoResponse = await fetch(
      "https://api.paymongo.com/v1/checkout_sessions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(paymongoSecretKey + ":")}`,
        },
        body: JSON.stringify(checkoutPayload),
      }
    );

    const paymongoData = await paymongoResponse.json();

    if (!paymongoResponse.ok) {
      const errorDetail =
        paymongoData?.errors?.[0]?.detail ||
        paymongoData?.errors?.[0]?.code ||
        "Payment service encountered an error. Please try again.";

      console.error("PayMongo API error:", JSON.stringify(paymongoData));

      return new Response(JSON.stringify({ error: errorDetail }), {
        status: paymongoResponse.status >= 500 ? 503 : paymongoResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const checkoutSession = paymongoData.data;
    const checkoutUrl = checkoutSession?.attributes?.checkout_url;

    if (!checkoutUrl) {
      console.error(
        "No checkout URL in response:",
        JSON.stringify(paymongoData)
      );
      return new Response(
        JSON.stringify({
          error: "Payment service returned an unexpected response.",
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { error: dbError } = await adminClient
      .from("paymongo_payments")
      .insert({
        user_id: user.id,
        tenant_id: tenantId,
        paymongo_payment_id: checkoutSession.id,
        amount: amount,
        currency: "PHP",
        status: "pending",
        payment_method_type: "card",
        description: description,
        metadata: {
          plan_id: planId,
          checkout_session_id: checkoutSession.id,
        },
      });

    if (dbError) {
      console.error("Error saving payment record:", dbError);
    }

    return new Response(
      JSON.stringify({ checkoutUrl, sessionId: checkoutSession.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in create-payment-intent:", error);
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred. Please try again.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
