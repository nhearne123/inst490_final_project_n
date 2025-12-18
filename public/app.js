// public/app.js
// Front-end now calls YOUR backend:
// - Fetch #1: GET /api/fruits        (proxy Fruityvice)
// - Fetch #2: GET /api/fruits?name= (proxy Fruityvice single)
// - Fetch #3: GET /api/favorites    (Supabase DB read)
// - Fetch #4: POST /api/favorites   (Supabase DB write)

const FRUITS_ENDPOINT = "/api/fruits";
const FAVORITES_ENDPOINT = "/api/favorites";

const button = document.getElementById("loadFruits");
const select = document.getElementById("fruitSelect");
const viewBtn = document.getElementById("viewFruitBtn");
const statusMsg = document.getElementById("statusMsg");

const details = document.getElementById("fruitDetails");
const swiperWrapper = document.getElementById("swiperWrapper");

const favList = document.getElementById("favoritesList");
const refreshFavBtn = document.getElementById("refreshFavoritesBtn");
const favStatus = document.getElementById("favoritesStatus");

let allFruits = [];
let swiperInstance = null;

let chartInstance = null;
const chartCanvas = document.getElementById("nutritionChart");

if (button) button.addEventListener("click", loadAllFruits);
if (viewBtn) viewBtn.addEventListener("click", viewSelectedFruit);
if (refreshFavBtn) refreshFavBtn.addEventListener("click", loadFavorites);

// Auto-load favorites on Fruits page
if (favList) loadFavorites();

// -----------------------------
// Fetch #1: GET ALL FRUITS (via backend proxy)
// -----------------------------
async function loadAllFruits() {
  setStatus("Loading fruits...", false);

  try {
    const res = await fetch(FRUITS_ENDPOINT);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const payload = await res.json();
    const data = payload.fruits;

    if (!Array.isArray(data)) throw new Error("API returned non-array");

    allFruits = data;

    // Fill dropdown
    select.innerHTML = `<option value="">Select a fruit</option>`;
    allFruits
      .map((f) => f.name)
      .sort((a, b) => a.localeCompare(b))
      .forEach((name) => {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
      });

    // Build swiper (first 12 fruits)
    buildSwiper(allFruits.slice(0, 12));

    setStatus(`Loaded ${allFruits.length} fruits ✅`, false);
  } catch (err) {
    console.error(err);
    setStatus(`Failed to load fruits: ${err.message}`, true);
  }
}

// -----------------------------
// Fetch #2: GET ONE FRUIT BY NAME (via backend proxy)
// -----------------------------
async function viewSelectedFruit() {
  const name = select.value;
  if (!name) {
    setStatus("Pick a fruit first.", true);
    return;
  }

  setStatus(`Loading ${name}...`, false);

  try {
    const res = await fetch(`${FRUITS_ENDPOINT}?name=${encodeURIComponent(name)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const payload = await res.json();
    const fruit = payload.fruit;

    if (!fruit || !fruit.name) throw new Error("Fruit not found");

    renderDetails(fruit);
    renderChart(fruit);

    setStatus(`Showing: ${fruit.name} ✅`, false);
  } catch (err) {
    console.error(err);
    setStatus(`Failed to load fruit details: ${err.message}`, true);
  }
}

// -----------------------------
// Fetch #3: GET Favorites (Supabase DB read via backend)
// -----------------------------
async function loadFavorites() {
  if (!favList) return;
  setFavStatus("Loading favorites...", false);

  try {
    const res = await fetch(FAVORITES_ENDPOINT);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const favorites = data.favorites;

    if (!Array.isArray(favorites)) throw new Error("Favorites returned non-array");

    renderFavorites(favorites);
    setFavStatus(`Loaded ${favorites.length} favorites ✅`, false);
  } catch (err) {
    console.error(err);
    setFavStatus(`Failed to load favorites: ${err.message}`, true);
  }
}

// -----------------------------
// Fetch #4: POST Favorite (Supabase DB write via backend)
// -----------------------------
async function saveFavorite(fruitName, notes) {
  setFavStatus("Saving favorite...", false);

  try {
    const res = await fetch(FAVORITES_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fruit_name: fruitName, notes })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

    setFavStatus(`Saved "${fruitName}" ✅`, false);
    await loadFavorites();
  } catch (err) {
    console.error(err);
    setFavStatus(`Save failed: ${err.message}`, true);
  }
}

// -----------------------------
// UI HELPERS
// -----------------------------
function setStatus(msg, isError) {
  if (!statusMsg) return;
  statusMsg.textContent = msg;
  statusMsg.className = isError ? "status error" : "status";
}

function setFavStatus(msg, isError) {
  if (!favStatus) return;
  favStatus.textContent = msg;
  favStatus.className = isError ? "status error" : "status";
}

function renderDetails(fruit) {
  const n = fruit.nutritions || {};
  details.innerHTML = `
    <h4>${fruit.name}</h4>
    <p><strong>Genus:</strong> ${fruit.genus || "—"}</p>
    <p><strong>Family:</strong> ${fruit.family || "—"}</p>
    <p><strong>Order:</strong> ${fruit.order || "—"}</p>
    <hr />
    <p><strong>Calories:</strong> ${n.calories ?? "—"}</p>
    <p><strong>Sugar:</strong> ${n.sugar ?? "—"}</p>
    <p><strong>Carbs:</strong> ${n.carbohydrates ?? "—"}</p>
    <p><strong>Protein:</strong> ${n.protein ?? "—"}</p>
    <p><strong>Fat:</strong> ${n.fat ?? "—"}</p>

    <div class="fav-save">
      <input id="favNotes" placeholder="Notes (optional)" />
      <button id="saveFavBtn" class="secondary-btn">Save to Favorites</button>
    </div>
  `;

  const saveBtn = document.getElementById("saveFavBtn");
  const notesEl = document.getElementById("favNotes");

  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      const notes = (notesEl?.value || "").trim();
      await saveFavorite(fruit.name, notes);
      if (notesEl) notesEl.value = "";
    });
  }
}

function renderFavorites(favorites) {
  favList.innerHTML = "";

  if (favorites.length === 0) {
    favList.innerHTML = `<p class="muted center">No favorites yet. Pick a fruit and click “Save to Favorites”.</p>`;
    return;
  }

  favorites.forEach((f) => {
    const item = document.createElement("div");
    item.className = "fav-item";
    item.innerHTML = `
      <div class="fav-title">⭐ ${escapeHtml(f.fruit_name)}</div>
      <div class="fav-notes">${f.notes ? escapeHtml(f.notes) : `<span class="muted">No notes</span>`}</div>
      <div class="fav-time muted">${new Date(f.created_at).toLocaleString()}</div>
    `;
    favList.appendChild(item);
  });
}

function buildSwiper(fruits) {
  swiperWrapper.innerHTML = "";

  fruits.forEach((f) => {
    const slide = document.createElement("div");
    slide.className = "swiper-slide";
    slide.innerHTML = `
      <div class="slide-card">
        <h4>${f.name}</h4>
        <p class="muted">${f.family || ""}</p>
        <button class="mini-btn" data-fruit="${f.name}">View</button>
      </div>
    `;
    swiperWrapper.appendChild(slide);
  });

  // Click handler for slide buttons
  swiperWrapper.querySelectorAll("button[data-fruit]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      select.value = btn.dataset.fruit;
      await viewSelectedFruit();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  // (Re)create swiper
  if (swiperInstance) swiperInstance.destroy(true, true);

  swiperInstance = new Swiper("#fruitSwiper", {
    slidesPerView: 1,
    spaceBetween: 14,
    pagination: { el: ".swiper-pagination", clickable: true },
    navigation: { nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" },
    breakpoints: {
      700: { slidesPerView: 2 },
      1000: { slidesPerView: 3 }
    }
  });
}

function renderChart(fruit) {
  const n = fruit.nutritions || {};

  const labels = ["Calories", "Sugar", "Carbs", "Protein", "Fat"];
  const values = [
    n.calories ?? 0,
    n.sugar ?? 0,
    n.carbohydrates ?? 0,
    n.protein ?? 0,
    n.fat ?? 0
  ];

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(chartCanvas, {
    type: "bar",
    data: {
      labels,
      datasets: [{ label: `${fruit.name} (per 100g)`, data: values }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } }
    }
  });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
