// index.js (Backend)
// - Endpoint #1 (DB): GET /api/favorites  (reads Supabase)
// - Endpoint #2 (External+manipulate): GET /api/fruits (proxies Fruityvice + optional filters)
// - Also includes POST /api/favorites (write to Supabase) so your front-end can save favorites.

const express = require("express");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Fruityvice base
const FRUITS_BASE = "https://www.fruityvice.com/api/fruit";

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ------------------------------------
// ENDPOINT #1 (DB): GET favorites
// GET /api/favorites
// ------------------------------------
app.get("/api/favorites", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("favorites")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ favorites: data });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// POST /api/favorites (write to DB)
app.post("/api/favorites", async (req, res) => {
  try {
    const fruit_name = (req.body?.fruit_name || "").trim();
    const notes = (req.body?.notes || "").trim();

    if (!fruit_name) {
      return res.status(400).json({ error: "fruit_name is required" });
    }

    const { data, error } = await supabase
      .from("favorites")
      .insert([{ fruit_name, notes }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ favorite: data });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ------------------------------------
// ENDPOINT #2 (External + manipulate):
// GET /api/fruits
//   - all fruits: /api/fruits
//   - one fruit:  /api/fruits?name=banana
//   - filters (optional): ?minSugar=5&maxCalories=80&family=Rosaceae
// ------------------------------------
app.get("/api/fruits", async (req, res) => {
  try {
    const name = (req.query.name || "").trim();
    const minSugar = req.query.minSugar !== undefined ? Number(req.query.minSugar) : null;
    const maxCalories = req.query.maxCalories !== undefined ? Number(req.query.maxCalories) : null;
    const family = (req.query.family || "").trim().toLowerCase();

    // Single fruit
    if (name) {
      const r = await fetch(`${FRUITS_BASE}/${encodeURIComponent(name)}`);
      if (!r.ok) return res.status(r.status).json({ error: `Fruityvice HTTP ${r.status}` });

      const fruit = await r.json();
      return res.json({ fruit });
    }

    // All fruits
    const r = await fetch(`${FRUITS_BASE}/all`);
    if (!r.ok) return res.status(r.status).json({ error: `Fruityvice HTTP ${r.status}` });

    let fruits = await r.json();
    if (!Array.isArray(fruits)) {
      return res.status(500).json({ error: "Fruityvice returned non-array" });
    }

    // Manipulation: filter
    fruits = fruits.filter((f) => {
      const n = f.nutritions || {};
      const sugarOk = minSugar === null ? true : Number(n.sugar || 0) >= minSugar;
      const calOk = maxCalories === null ? true : Number(n.calories || 0) <= maxCalories;
      const famOk = !family ? true : String(f.family || "").toLowerCase() === family;
      return sugarOk && calOk && famOk;
    });

    return res.json({
      count: fruits.length,
      fruits,
      filters: { minSugar, maxCalories, family: family || null }
    });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

app.listen(PORT, () => console.log(`✅ Server running: http://localhost:${PORT}`));
