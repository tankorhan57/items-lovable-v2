import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lng } = await req.json();

    if (typeof lat !== "number" || typeof lng !== "number") {
      return new Response(JSON.stringify({ city: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use free OpenStreetMap Nominatim reverse geocoding
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&addressdetails=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Items-App/1.0" },
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ city: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const address = data.address || {};
    // Prefer city, then town, then village, then county
    const city = address.city || address.town || address.village || address.county || null;

    return new Response(JSON.stringify({ city }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ city: null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
