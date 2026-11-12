document.addEventListener("DOMContentLoaded", () => {
  const arrow = `<svg class="flat-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;

  const card = (app) => `
    <article class="card ${app.family === "media" ? "card-wide" : ""}" data-id="${app.id}">
      <div class="card-media" data-screenshot="${app.screenshot || ""}">
        <picture>
          <source srcset="${(app.screenshot || "").replace(/\.png$/, ".webp")}" type="image/webp">
          <img src="${app.screenshot}" alt="Capture d'écran de ${app.name}" loading="lazy"
             onerror="this.closest('.card-media').classList.add('no-img'); this.remove();" />
        </picture>
        <div class="media-fallback"><span>${app.icon}</span></div>
        <span class="status-chip status-${app.family}">${app.status}</span>
        <div class="media-overlay">
          <p>${app.description}</p>
          <span class="overlay-cta">${app.cta} ${arrow}</span>
        </div>
      </div>
      <div class="card-body">
        <h3>${app.name}</h3>
        <div class="card-tags">${app.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>
        <p class="card-desc">${app.description}</p>
        <a class="btn primary small try-btn" href="${app.url}" target="_blank" rel="noopener">${app.cta} ${arrow}</a>
        ${app.note ? `<p class="card-note">${app.note}</p>` : ""}
      </div>
    </article>`;

  const grids = {
    app: document.getElementById("appGridApps"),
    game: document.getElementById("appGridGames"),
    demo: document.getElementById("appGridDemo"),
    media: document.getElementById("appGridMedia"),
  };

  Object.entries(grids).forEach(([family, grid]) => {
    if (!grid) return;
    grid.innerHTML = APPS
      .filter((a) => a.family === family)
      .sort((a, b) => (a.order || 99) - (b.order || 99))
      .map(card)
      .join("");
  });

  document.querySelectorAll(".card-media").forEach((media) => {
    const img = media.querySelector("img");
    if (img) {
      img.addEventListener("load", () => media.classList.add("has-img"));
      if (img.complete && img.naturalWidth > 0) media.classList.add("has-img");
    }
    media.addEventListener("click", () => {
      const link = media.closest(".card").querySelector(".try-btn");
      if (link) link.click();
    });
  });

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
});
