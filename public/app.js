document.getElementById("load").addEventListener("click", () => {
    loadReports();
    loadChart();
    loadFavorites();
  });
  
  // FETCH #1 — External API via server
  async function loadReports() {
    const res = await fetch(
      "https://www.thereportoftheweekapi.com/api/v1/reports/"
    );
    const data = await res.json();
  
    const slides = document.getElementById("slides");
    slides.innerHTML = "";
  
    data.slice(0, 5).forEach(r => {
      slides.innerHTML += `
        <div class="swiper-slide">
          <h4>${r.product}</h4>
          <p>Rating: ${r.rating}</p>
          <button onclick='saveFavorite(${JSON.stringify(r)})'>
            Save
          </button>
        </div>`;
    });
  
    new Swiper(".swiper");
  }
  
  // FETCH #2 — API you wrote (external manipulation)
  async function loadChart() {
    const res = await fetch("/api/reports-summary");
    const data = await res.json();
  
    new Chart(document.getElementById("chart"), {
      type: "bar",
      data: {
        labels: data.map(d => d.category),
        datasets: [{
          data: data.map(d => d.avgRating)
        }]
      }
    });
  }
  
  // FETCH #3 — Supabase READ
  async function loadFavorites() {
    const res = await fetch("/api/favorites");
    const data = await res.json();
  
    const ul = document.getElementById("favorites");
    ul.innerHTML = "";
  
    data.forEach(f => {
      ul.innerHTML += `<li>${f.title} (${f.rating})</li>`;
    });
  }
  
  // Supabase WRITE
  async function saveFavorite(r) {
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
  }
  