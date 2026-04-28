// ================== Theme toggle ==================
const themeToggle = document.getElementById("themeToggle");
const root = document.documentElement;

const savedTheme =
  localStorage.getItem("theme") ||
  (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
root.setAttribute("data-theme", savedTheme);

themeToggle?.addEventListener("click", () => {
  const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
});

// ================== Mobile nav ==================
const burger = document.getElementById("navBurger");
const navLinks = document.querySelector(".nav-links");

burger?.addEventListener("click", () => {
  navLinks?.classList.toggle("open");
});

document.querySelectorAll(".nav-links a").forEach((link) => {
  link.addEventListener("click", () => navLinks?.classList.remove("open"));
});

// ================== Fade-in on scroll ==================
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 },
);

document.querySelectorAll(".fade-in").forEach((el) => observer.observe(el));

// ================== Sticky photo color reveal ==================
const photoCard = document.querySelector(".hero-card.image");
photoCard?.addEventListener(
  "mouseenter",
  () => photoCard.classList.add("revealed"),
  { once: true },
);

// ================== Footer year ==================
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();
