const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = async (req, res) => {
  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("favorites")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json(error);
    return res.json(data);
  }

  if (req.method === "POST") {
    const { title, rating, category, video_code } = req.body;

    const { data, error } = await supabase.from("favorites").insert([
      { title, rating, category, video_code }
    ]);

    if (error) return res.status(500).json(error);
    return res.json(data);
  }

  res.status(405).end();
};
