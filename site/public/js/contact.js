// Révélation des coordonnées (anti-spam) : 1er clic = affiche, 2e clic = agit.
// Le numéro devient un lien tel: après révélation, pour rester appelable sur mobile.
(() => {
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  document.querySelectorAll(".reveal-mail, .reveal-phone, .reveal-wa").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (el.classList.contains("revealed")) return;
      e.preventDefault();
      try {
        const hint = el.querySelector(".way-hint");
        const label = el.querySelector(".way-label");

        if (el.dataset.m) {
          const mail = atob(el.dataset.m);
          const subject = el.dataset.subject ? "?subject=" + encodeURIComponent(el.dataset.subject) : "";
          el.href = "mailto:" + mail + subject;
          if (hint) hint.textContent = mail;
          else if (label) label.textContent = "Écrire à " + mail;
          else el.textContent = "Écrire un email";
        } else if (el.dataset.w) {
          el.href = atob(el.dataset.w);
          if (hint) hint.textContent = "Cliquez à nouveau pour ouvrir WhatsApp";
          else if (label) label.textContent = "Ouvrir WhatsApp";
          else el.textContent = "Ouvrir WhatsApp";
        } else if (el.dataset.n) {
          const num = atob(el.dataset.n);
          el.href = "tel:" + num.replace(/\s+/g, "");
          if (hint) hint.textContent = num + " — cliquez pour appeler";
          else if (label) label.textContent = "Appeler le " + num;
          else el.textContent = num;
        }

        el.classList.add("revealed");
      } catch (err) {}
    });
  });
})();
