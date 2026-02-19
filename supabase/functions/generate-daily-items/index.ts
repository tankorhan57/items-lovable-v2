import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ═══════════════════════════════════════════════════
// PROMPT LIBRARY — visually tangible, immediately photographable
// Every prompt must pass the "3 photos in 5 seconds" test
// ═══════════════════════════════════════════════════

const PROMPTS: Record<string, { depth: number; texts: string[] }[]> = {
  object: [
    {
      depth: 1,
      texts: [
        "Something worn",
        "Something heavy",
        "Something small enough to hold",
        "Something with a handle",
        "Something metal",
        "Something handmade",
        "Something broken",
        "Something transparent",
        "Something you carry every day",
        "A tool",
        "Something with a lid",
        "Something round",
        "Something with a label",
        "Something stacked",
        "Something folded",
        "Something plugged in",
        "Something wooden",
        "Something with buttons",
        "Something sharp",
        "Something soft",
      ],
    },
    {
      depth: 2,
      texts: [
        "Something with a crack or scratch",
        "Something no one else has noticed today",
        "Something doing its job perfectly",
        "Something held together",
        "Something left behind",
        "Something someone uses every day",
        "Something that has been repaired",
        "Something that gets touched a lot",
        "Something kept in a pocket",
        "An object older than you",
      ],
    },
  ],
  surface: [
    {
      depth: 1,
      texts: [
        "A surface with marks",
        "Something rough",
        "Something smooth",
        "Paint peeling",
        "A scratch",
        "A stain",
        "A crack in a wall",
        "Something rusty",
        "A worn edge",
        "A surface that has been cleaned",
        "Something polished",
        "Something dusty",
        "A dent",
        "Tape residue",
        "Something scuffed",
      ],
    },
    {
      depth: 2,
      texts: [
        "A surface that shows its age",
        "A wall with layers",
        "A floor nobody looks at",
        "Marks left by weather",
        "A surface that tells you something happened",
        "Wear from repeated use",
      ],
    },
  ],
  light: [
    {
      depth: 1,
      texts: [
        "A shadow",
        "Something that reflects light",
        "Light through a window",
        "A reflection",
        "Sunlight on a surface",
        "A bright spot in a dark room",
        "Light on water",
        "A shadow of something moving",
        "Something backlit",
        "Light between two buildings",
        "A lamp that's on",
        "A screen glow",
        "Light on skin",
      ],
    },
    {
      depth: 2,
      texts: [
        "The last light of the day",
        "A shadow that won't be here later",
        "Light falling where you didn't expect it",
        "Two light sources mixing",
        "A reflection you almost missed",
      ],
    },
  ],
  color: [
    {
      depth: 1,
      texts: [
        "Something blue",
        "Something yellow",
        "Something red",
        "Something green that isn't a plant",
        "The brightest color near you",
        "Something orange",
        "Something white",
        "Something black",
        "Two colors next to each other",
        "A faded color",
        "Something pink",
        "A color on a sign",
        "A color you're wearing",
      ],
    },
    {
      depth: 2,
      texts: [
        "A color that doesn't belong where you found it",
        "A color you usually ignore",
        "The most saturated thing near you",
        "A color repeated three times in one view",
        "A color that is disappearing",
      ],
    },
  ],
  texture: [
    {
      depth: 1,
      texts: [
        "Something rough to the touch",
        "Something smooth",
        "Something woven",
        "Something with a pattern",
        "Fabric",
        "Something knitted",
        "Concrete",
        "Bark",
        "Something with grain",
        "Something with ridges",
        "Something with holes",
        "Something layered",
        "Something crumpled",
      ],
    },
    {
      depth: 2,
      texts: [
        "A texture you want to touch",
        "Two textures side by side",
        "Something that looks soft but isn't",
        "A texture made by nature",
        "A texture made by a machine",
      ],
    },
  ],
  movement: [
    {
      depth: 1,
      texts: [
        "Something moving",
        "Something swaying",
        "Something spinning",
        "Something dripping",
        "Smoke or steam",
        "Something falling",
        "Something blowing in the wind",
        "Something rolling",
        "Flowing water",
        "Something vibrating",
        "A flag",
        "Something being carried",
      ],
    },
    {
      depth: 2,
      texts: [
        "Something that just stopped moving",
        "Something about to fall",
        "Motion captured in stillness",
        "Something being poured",
        "Something mid-action",
      ],
    },
  ],
  environment: [
    {
      depth: 1,
      texts: [
        "The ground beneath your feet",
        "A doorway",
        "A window from outside",
        "A corner",
        "A ceiling",
        "A staircase",
        "An empty chair",
        "A shelf",
        "A path",
        "A fence",
        "A pipe",
        "A drain",
        "A curb",
        "Something on a wall",
        "A bench",
      ],
    },
    {
      depth: 2,
      texts: [
        "A place you pass every day",
        "Where nature is winning",
        "A threshold between inside and outside",
        "Where water collects",
        "A place no one sits",
        "An entrance nobody uses",
        "A space between two buildings",
        "Something growing out of concrete",
      ],
    },
    {
      depth: 3,
      texts: [
        "A place that is changing",
        "Somewhere that looks different at night",
        "A place you'd photograph but never visit again",
      ],
    },
  ],
  human: [
    {
      depth: 2,
      texts: [
        "Someone's hands at work",
        "A person waiting",
        "Someone walking",
        "Someone carrying something",
        "Shoes on pavement",
        "Someone looking at their phone",
        "A gesture",
        "Someone's bag",
        "Someone sitting alone",
        "A crowd from a distance",
        "Someone in uniform",
        "Hair",
      ],
    },
    {
      depth: 3,
      texts: [
        "Someone doing the same thing they do every day",
        "Two people standing close",
        "Someone who doesn't know you're looking",
        "A moment of concentration",
      ],
    },
  ],
  contrast: [
    {
      depth: 1,
      texts: [
        "Old next to new",
        "Big and small together",
        "Rough beside smooth",
        "Natural and man-made side by side",
        "Clean and dirty",
        "Something straight next to something curved",
      ],
    },
    {
      depth: 2,
      texts: [
        "Something beautiful in an ugly place",
        "Order and mess in the same frame",
        "Something temporary next to something permanent",
        "Light and dark touching",
      ],
    },
  ],
  time: [
    {
      depth: 1,
      texts: [
        "Something temporary",
        "Something brand new",
        "Evidence that time passed here",
        "Something drying",
        "Something melting",
        "Condensation",
        "A clock",
        "Something half-finished",
        "Footprints",
        "Tire marks",
      ],
    },
    {
      depth: 2,
      texts: [
        "Something aging",
        "Something that changes by the hour",
        "Something that wasn't here yesterday",
        "Something that will be gone by tomorrow",
      ],
    },
    {
      depth: 3,
      texts: [
        "Something worth preserving",
        "Something that remains after everything else is gone",
      ],
    },
  ],
  perspective: [
    {
      depth: 1,
      texts: [
        "Look straight up",
        "The view from ground level",
        "What's behind you right now",
        "Through a window",
        "As close as possible",
        "From far away",
        "Through a gap",
        "Looking down",
        "The edge of something",
        "Around a corner",
      ],
    },
    {
      depth: 2,
      texts: [
        "Something you see differently up close",
        "The underside of something",
        "A view no one else is seeing right now",
        "Something framed by architecture",
      ],
    },
  ],
};

const CATEGORIES = Object.keys(PROMPTS);

// ═══════════════════════════════════════════════════
// WEEK PLAN — 70% depth 1-2, 20% grounded human/env, 10% reflective
// ═══════════════════════════════════════════════════

function buildWeekPlan(weekNumber: number): Array<{ category: string; depth: number }> {
  const allowReflective = weekNumber >= 3;
  const plan: Array<{ category: string; depth: number }> = [];

  const pick = (pool: string[], exclude?: string): string => {
    const filtered = exclude ? pool.filter((c) => c !== exclude) : pool;
    return filtered[Math.floor(Math.random() * filtered.length)] || pool[0];
  };

  const concreteCats = ["object", "surface", "light", "color", "texture", "movement", "contrast", "time", "perspective"];
  const groundedCats = ["human", "environment"];
  let lastCat = "";

  // 5 fully concrete (depth 1-2) — 71%
  for (let i = 0; i < 5; i++) {
    const cat = pick(concreteCats, lastCat);
    lastCat = cat;
    const depth = Math.random() < 0.6 ? 1 : 2;
    plan.push({ category: cat, depth });
  }

  // 1-2 grounded human/environment (depth 2) — ~21%
  for (let i = 0; i < 1 + (Math.random() < 0.5 ? 1 : 0); i++) {
    const cat = pick(groundedCats, lastCat);
    lastCat = cat;
    plan.push({ category: cat, depth: 2 });
  }

  // Fill to 7 with remaining
  while (plan.length < 7) {
    if (allowReflective && plan.length === 6) {
      // Max 1 reflective per week (depth 3), still must be photographable
      const cat = pick(["environment", "time", "human"], lastCat);
      lastCat = cat;
      plan.push({ category: cat, depth: 3 });
    } else {
      const cat = pick(concreteCats, lastCat);
      lastCat = cat;
      plan.push({ category: cat, depth: Math.random() < 0.5 ? 1 : 2 });
    }
  }

  // Shuffle avoiding same category back-to-back and no consecutive depth 3
  for (let attempt = 0; attempt < 50; attempt++) {
    for (let i = plan.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [plan[i], plan[j]] = [plan[j], plan[i]];
    }
    const valid = plan.every(
      (p, i) =>
        i === 0 ||
        (p.category !== plan[i - 1].category &&
          !(p.depth >= 3 && plan[i - 1].depth >= 3))
    );
    if (valid) break;
  }

  return plan;
}

function pickPrompt(category: string, depth: number, usedPrompts: Set<string>): string {
  const buckets = PROMPTS[category] || [];
  // Find exact depth bucket, then fall back to nearest lower depth
  let texts: string[] = [];
  for (let d = depth; d >= 1; d--) {
    const bucket = buckets.find((b) => b.depth === d);
    if (bucket) {
      texts = bucket.texts;
      break;
    }
  }
  if (texts.length === 0 && buckets.length > 0) {
    texts = buckets[0].texts;
  }

  const available = texts.filter((t) => !usedPrompts.has(t));
  if (available.length > 0) {
    const p = available[Math.floor(Math.random() * available.length)];
    usedPrompts.add(p);
    return p;
  }
  // Fallback: reuse from pool
  const p = texts[Math.floor(Math.random() * texts.length)] || "Something that caught your eye";
  return p;
}

// ═══════════════════════════════════════════════════
// HANDLER
// ═══════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: latest } = await supabase
      .from("daily_items")
      .select("active_date, week_number")
      .order("active_date", { ascending: false })
      .limit(1)
      .single();

    const lastDate = latest ? new Date(latest.active_date) : new Date();
    const lastWeek = latest?.week_number || 1;

    const { data: existing } = await supabase
      .from("daily_items")
      .select("prompt_text")
      .order("active_date", { ascending: false })
      .limit(200);

    const usedPrompts = new Set((existing || []).map((e: any) => e.prompt_text));

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const daysAhead = Math.floor((lastDate.getTime() - today.getTime()) / 86400000);

    if (daysAhead >= 30) {
      return new Response(
        JSON.stringify({ message: "Already have 30+ days ahead", daysAhead }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const daysToGenerate = 35 - Math.max(daysAhead, 0);
    const weeksNeeded = Math.ceil(daysToGenerate / 7);
    const items: any[] = [];

    let currentDate = new Date(lastDate);
    let currentWeek = lastWeek;

    // Map depth to tone for DB compatibility
    const depthToTone = (d: number) => (d <= 1 ? "concrete" : d === 2 ? "interpretive" : "reflective");

    for (let w = 0; w < weeksNeeded; w++) {
      currentWeek++;
      const weekPlan = buildWeekPlan(currentWeek);

      for (const dayPlan of weekPlan) {
        currentDate.setDate(currentDate.getDate() + 1);
        const dateStr = currentDate.toISOString().split("T")[0];
        const prompt = pickPrompt(dayPlan.category, dayPlan.depth, usedPrompts);

        items.push({
          active_date: dateStr,
          prompt_text: prompt,
          category: dayPlan.category,
          depth_level: dayPlan.depth,
          tone: depthToTone(dayPlan.depth),
          week_number: currentWeek,
        });
      }
    }

    if (items.length > 0) {
      const { error } = await supabase.from("daily_items").insert(items);
      if (error) throw error;
    }

    return new Response(
      JSON.stringify({ message: `Generated ${items.length} prompts`, daysAhead: daysAhead + items.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
