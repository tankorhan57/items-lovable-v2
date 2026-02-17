import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Prompt templates organized by category and tone
const PROMPT_TEMPLATES: Record<string, Record<string, string[]>> = {
  color: {
    concrete: [
      "Something blue you passed today",
      "The brightest color near you right now",
      "A color that doesn't belong where you found it",
      "Yellow, but not obvious",
      "Red, somewhere unexpected",
      "Green that isn't a plant",
      "The most faded color you can find",
      "A color you usually ignore",
    ],
    interpretive: [
      "A color that feels warm to you",
      "The color of your morning",
      "A color that reminds you of someone",
      "A color that feels like silence",
    ],
  },
  object: {
    concrete: [
      "Something you carry every day",
      "An object that's older than you",
      "Something with a crack or scratch",
      "A tool someone left behind",
      "Something no one else has noticed today",
      "An object doing its job perfectly",
      "Something held together",
      "A door you usually ignore",
    ],
    interpretive: [
      "An object that tells a story",
      "Something waiting to be used",
      "An object out of place",
      "Something that survived",
    ],
  },
  human: {
    concrete: [
      "Someone's hands at work",
      "A person waiting",
      "Someone walking with purpose",
      "A gesture between two people",
      "A face in concentration",
      "Someone carrying something heavy",
    ],
    interpretive: [
      "A moment of stillness in a crowd",
      "Someone who doesn't know you're watching",
      "A stranger's routine",
      "Connection without words",
    ],
    reflective: [
      "What trust looks like",
      "A moment that won't happen again",
      "Where you feel at home",
    ],
  },
  perspective: {
    concrete: [
      "Look up from where you are",
      "The view from the lowest point you can reach",
      "What's behind you right now",
      "Through a window",
      "From as close as possible",
      "The edge of something",
    ],
    interpretive: [
      "What you see when you stop moving",
      "The space between two things",
      "Where light meets dark",
    ],
  },
  emotion: {
    interpretive: [
      "Something that made you pause today",
      "What calm looks like here",
      "A small comfort",
      "Something that surprised you",
      "What patience looks like",
    ],
    reflective: [
      "What you're grateful for today",
      "Something you'll miss someday",
      "Where you feel most yourself",
      "What hope looks like right now",
    ],
  },
  time: {
    concrete: [
      "Something temporary",
      "Evidence that time passed here",
      "Something brand new",
      "Something that changes by the hour",
      "A shadow that won't be here later",
    ],
    interpretive: [
      "A moment between before and after",
      "Something aging beautifully",
      "The last light of the day",
    ],
    reflective: [
      "What remains",
      "Something worth preserving",
    ],
  },
  contrast: {
    concrete: [
      "Old next to new",
      "Big and small together",
      "Natural and man-made side by side",
      "Rough beside smooth",
    ],
    interpretive: [
      "Order and chaos in the same frame",
      "Stillness next to motion",
      "Something beautiful in an ugly place",
    ],
  },
  environment: {
    concrete: [
      "The weather right now",
      "Where water collects",
      "A surface no one touches",
      "The ground beneath your feet",
      "Where nature is winning",
      "A threshold between inside and outside",
    ],
    interpretive: [
      "A place that feels forgotten",
      "Where silence lives",
      "Somewhere that feels like the future",
    ],
    reflective: [
      "A place you'd like to return to",
      "Where you belong",
    ],
  },
};

const CATEGORIES = Object.keys(PROMPT_TEMPLATES);

// Weekly tone distribution: 2 concrete, 2 human/environment, 2 interpretive, 1 reflective
function buildWeekPlan(weekNumber: number): Array<{ category: string; tone: string; depth: number }> {
  const maxDepth = weekNumber <= 2 ? 2 : weekNumber <= 4 ? 3 : 4;
  const allowReflective = weekNumber >= 3;

  const plan: Array<{ category: string; tone: string; depth: number }> = [];
  const usedCategories: string[] = [];

  const pickCategory = (exclude: string[], preferred?: string[]): string => {
    const pool = preferred?.filter((c) => !exclude.includes(c)) || 
                 CATEGORIES.filter((c) => !exclude.includes(c));
    return pool[Math.floor(Math.random() * pool.length)] || CATEGORIES[0];
  };

  // 2 concrete
  for (let i = 0; i < 2; i++) {
    const cat = pickCategory(usedCategories.length > 0 ? [usedCategories[usedCategories.length - 1]] : []);
    usedCategories.push(cat);
    plan.push({ category: cat, tone: "concrete", depth: Math.min(1 + Math.floor(Math.random() * 2), maxDepth) });
  }

  // 2 human/environment (concrete or interpretive)
  for (let i = 0; i < 2; i++) {
    const cat = pickCategory([usedCategories[usedCategories.length - 1]], ["human", "environment"]);
    usedCategories.push(cat);
    const tone = Math.random() > 0.5 ? "interpretive" : "concrete";
    plan.push({ category: cat, tone, depth: Math.min(2, maxDepth) });
  }

  // 2 interpretive
  for (let i = 0; i < 2; i++) {
    const cat = pickCategory([usedCategories[usedCategories.length - 1]]);
    usedCategories.push(cat);
    plan.push({ category: cat, tone: "interpretive", depth: Math.min(2, maxDepth) });
  }

  // 1 reflective (if allowed)
  const reflCat = pickCategory([usedCategories[usedCategories.length - 1]]);
  usedCategories.push(reflCat);
  if (allowReflective) {
    plan.push({ category: reflCat, tone: "reflective", depth: Math.min(3, maxDepth) });
  } else {
    plan.push({ category: reflCat, tone: "interpretive", depth: Math.min(2, maxDepth) });
  }

  // Shuffle to avoid predictable ordering, but ensure no same category back-to-back
  for (let attempt = 0; attempt < 50; attempt++) {
    for (let i = plan.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [plan[i], plan[j]] = [plan[j], plan[i]];
    }
    const valid = plan.every((p, i) => i === 0 || p.category !== plan[i - 1].category);
    if (valid) break;
  }

  return plan;
}

function pickPrompt(category: string, tone: string, usedPrompts: Set<string>): string {
  const templates = PROMPT_TEMPLATES[category]?.[tone] || PROMPT_TEMPLATES[category]?.concrete || [];
  const available = templates.filter((t) => !usedPrompts.has(t));
  if (available.length > 0) {
    const pick = available[Math.floor(Math.random() * available.length)];
    usedPrompts.add(pick);
    return pick;
  }
  // Fallback: reuse
  const pick = templates[Math.floor(Math.random() * templates.length)] || "Something that caught your eye";
  return pick;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find the latest date we have prompts for
    const { data: latest } = await supabase
      .from("daily_items")
      .select("active_date, week_number")
      .order("active_date", { ascending: false })
      .limit(1)
      .single();

    const lastDate = latest ? new Date(latest.active_date) : new Date();
    const lastWeek = latest?.week_number || 1;

    // Get all existing prompts to avoid duplicates
    const { data: existing } = await supabase
      .from("daily_items")
      .select("prompt_text")
      .order("active_date", { ascending: false })
      .limit(200);

    const usedPrompts = new Set((existing || []).map((e: any) => e.prompt_text));

    // Calculate how many days ahead we have
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const daysAhead = Math.floor((lastDate.getTime() - today.getTime()) / (86400000));

    if (daysAhead >= 30) {
      return new Response(
        JSON.stringify({ message: "Already have 30+ days ahead", daysAhead }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate enough weeks to get to 35 days ahead
    const daysToGenerate = 35 - Math.max(daysAhead, 0);
    const weeksNeeded = Math.ceil(daysToGenerate / 7);
    const items: any[] = [];

    let currentDate = new Date(lastDate);
    let currentWeek = lastWeek;

    for (let w = 0; w < weeksNeeded; w++) {
      currentWeek++;
      const weekPlan = buildWeekPlan(currentWeek);

      for (const dayPlan of weekPlan) {
        currentDate.setDate(currentDate.getDate() + 1);
        const dateStr = currentDate.toISOString().split("T")[0];

        const prompt = pickPrompt(dayPlan.category, dayPlan.tone, usedPrompts);

        items.push({
          active_date: dateStr,
          prompt_text: prompt,
          category: dayPlan.category,
          depth_level: dayPlan.depth,
          tone: dayPlan.tone,
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
