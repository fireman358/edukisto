document.querySelectorAll(".reveal-mail, .reveal-phone, .reveal-wa").forEach((el) => {
  el.addEventListener("click", (e) => {
    if (el.classList.contains("revealed")) return;
    e.preventDefault();
    try {
      if (el.dataset.m) {
        const mail = atob(el.dataset.m);
        el.href = "mailto:" + mail;
        const hint = el.querySelector(".way-hint");
        if (hint) hint.textContent = mail;
      } else if (el.dataset.w) {
        el.href = atob(el.dataset.w);
        el.target = "_blank";
        el.rel = "noopener";
        const hint = el.querySelector(".way-hint");
        if (hint) hint.textContent = "Ouvrir la discussion";
      } else if (el.dataset.n) {
        const num = atob(el.dataset.n);
        el.href = "tel:+32474812553";
        const hint = el.querySelector(".way-hint");
        if (hint) hint.textContent = num;
      }
      el.classList.add("revealed");
    } catch (err) {}
  });
});
