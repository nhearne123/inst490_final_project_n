const fetch = require("node-fetch");

module.exports = async (req, res) => {
  const response = await fetch(
    "https://www.thereportoftheweekapi.com/api/v1/reports/"
  );

  const reports = await response.json();

  const summary = {};

  reports.forEach(r => {
    if (!summary[r.category]) summary[r.category] = [];
    summary[r.category].push(Number(r.rating || 0));
  });

  const averages = Object.entries(summary).map(([cat, arr]) => ({
    category: cat,
    avgRating: (
      arr.reduce((a, b) => a + b, 0) / arr.length
    ).toFixed(2)
  }));

  res.json(averages);
};
