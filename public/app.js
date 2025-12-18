// ===============================
// Safe DOM load (prevents crashes)
// ===============================
document.addEventListener("DOMContentLoaded", () => {
    const loadBtn = document.getElementById("load");
  
    // Only run Explore page logic if button exists
    if (loadBtn) {
      loadBtn.addEventListener("click", () => {
        loadReports();
        loadChart();
        loadFavorites();
      });
    }
  });
  
  // ===============================
  // FETCH #1 — External Reviews API
  // ===============================
  async function loadReports() {
    try {
      const res = await fetch(
        "https://www.thereportoftheweekapi.com/api/v1/reports/"
      );
  
      if (!res.ok) throw new Error("Failed to load reviews");
  
      const data = await res.json();
      const slides = document.getElementById("slides");
      slides.innerHTML = "";
  
      data.slice(0, 5).forEach(r => {
        const slide = document.createElement("div");
        slide.className = "swiper-slide";
  
        slide.innerHTML = `
          <h4>${r.product}</h4>
          <p>Category: ${r.category}</p>
          <p>Rating: ${r.rating ?? "N/A"}</p>
          <button class="save-btn">Save to Favorites</button>
        `;
  
        slide.querySelector(".save-btn").addEventListener("click", () => {
          saveFavorite(r);
        });
  
        slides.appendChild(slide);
      });
  
      new Swiper(".swiper");
    } catch (err) {
      console.error(err);
      alert("Error loading reviews");
    }
  }
  
  // ===================================
  // FETCH #2 — Your API (Chart Summary)
  // ===================================
  async function loadChart() {
    try {
      const res = await fetch("/api/reports-summary");
      if (!res.ok) throw new Error("Chart API failed");
  
      const data = await res.json();
  
      const ctx = document.getElementById("chart");
      if (!ctx) return;
  
      new Chart(ctx, {
        type: "bar",
        data: {
          labels: data.map(d => d.category),
          datasets: [
            {
              label: "Average Rating",
              data: data.map(d => d.avgRating)
            }
          ]
        }
      });
    } catch (err) {
      console.error(err);
    }
  }
  
  // ===============================
  // FETCH #3 — Supabase READ
  // ===============================
  async function loadFavorites() {
    try {
      const res = await fetch("/api/favorites");
      if (!res.ok) throw new Error("Favorites API failed");
  
      const data = await res.json();
      const ul = document.getElementById("favorites");
      if (!ul) return;
  
      ul.innerHTML = "";
  
      data.forEach(f => {
        const li = document.createElement("li");
        li.textContent = `${f.title} (${f.rating ?? "N/A"})`;
        ul.appendChild(li);
      });
    } catch (err) {
      console.error(err);
    }
  }
  
  // ===============================
  // Supabase WRITE
  // ===============================
  async function saveFavorite(r) {
    try {
      await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: r.product,
          rating: r.rating,
          category: r.category,
          video_code: r.videoCode
        })
      });
  
      loadFavorites();
    } catch (err) {
      console.error("Save failed", err);
    }
  }
  