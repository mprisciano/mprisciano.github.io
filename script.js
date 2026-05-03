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

// ================== Lecture note download counts (CounterAPI) ==================
// Docs: https://docs.counterapi.dev/api/endpoints/v1/
// Configure window.COUNTER_API_CONFIG before script.js loads (see index.html).
const COUNTER_ORIGIN = "https://api.counterapi.dev";

function readCounterApiConfig() {
  const raw = window.COUNTER_API_CONFIG;
  const c =
    typeof raw === "object" && raw !== null ? raw : Object.create(null);
  let namespace = typeof c.namespace === "string" ? c.namespace.trim() : "";

  /** Default CounterAPI namespace for GitHub Pages (avoids forgetting inline config after deploy). */
  if (
    !namespace &&
    typeof location !== "undefined" &&
    /\.github\.io$/i.test(location.hostname || "")
  ) {
    namespace = `${String(location.hostname).replace(/\./g, "-")}-notes`;
  }

  return {
    version: c.version === "v2" ? "v2" : "v1",
    namespace,
    workspace: typeof c.workspace === "string" ? c.workspace.trim() : "",
    accessToken: typeof c.accessToken === "string" ? c.accessToken.trim() : "",
  };
}

function counterLabel(n) {
  const num =
    typeof n === "number" && Number.isFinite(n)
      ? Math.max(0, Math.floor(n))
      : Math.max(0, parseInt(String(n), 10) || 0);
  const nStr = num.toLocaleString();
  return num === 1 ? `${nStr} download` : `${nStr} downloads`;
}

function extractCount(payload) {
  if (!payload || typeof payload !== "object") return null;
  if (typeof payload.count === "number") return payload.count;
  if (typeof payload.value === "number") return payload.value;
  if (payload.data && typeof payload.data.count === "number")
    return payload.data.count;
  return null;
}

function counterConfigured(cfg) {
  if (cfg.version === "v2")
    return Boolean(cfg.workspace && cfg.accessToken);
  return Boolean(cfg.namespace);
}

function counterUrl(cfg, counterName, action) {
  const nameSeg = encodeURIComponent(counterName);
  if (cfg.version === "v2") {
    const ws = encodeURIComponent(cfg.workspace);
    if (action === "get") return `${COUNTER_ORIGIN}/v2/${ws}/${nameSeg}/`;
    if (action === "up") return `${COUNTER_ORIGIN}/v2/${ws}/${nameSeg}/up`;
  } else {
    const ns = encodeURIComponent(cfg.namespace);
    if (action === "get") return `${COUNTER_ORIGIN}/v1/${ns}/${nameSeg}/`;
    if (action === "up") return `${COUNTER_ORIGIN}/v1/${ns}/${nameSeg}/up`;
  }
  return "";
}

function counterFetchHeaders(cfg) {
  const h = {};
  if (cfg.version === "v2") h.Authorization = `Bearer ${cfg.accessToken}`;
  return h;
}

async function counterApiGet(cfg, counterName) {
  const url = counterUrl(cfg, counterName, "get");
  if (!url) return null;
  try {
    const res = await fetch(url, {
      method: "GET",
      credentials: "omit",
      mode: "cors",
      headers: counterFetchHeaders(cfg),
      redirect: "follow",
    });
    /** Counter exists only after the first `/up`; API returns HTTP 404 until then. */
    if (res.status === 404) return { count: 0 };
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    const count = extractCount(data);
    return count !== null ? { count } : null;
  } catch {
    return null;
  }
}

async function counterApiUp(cfg, counterName) {
  const url = counterUrl(cfg, counterName, "up");
  if (!url) return null;
  try {
    const res = await fetch(url, {
      method: "GET",
      credentials: "omit",
      mode: "cors",
      headers: counterFetchHeaders(cfg),
      redirect: "follow",
    });
    if (!res.ok) return null;
    return res.json().catch(() => null);
  } catch {
    return null;
  }
}

async function initCounterApiLabels() {
  try {
    const cfg = readCounterApiConfig();
    if (!counterConfigured(cfg)) return;

    const anchors = [...document.querySelectorAll("a[data-counter-name]")];
    if (anchors.length === 0) return;

    const names = [
      ...new Set(
        anchors
          .map((a) => a.getAttribute("data-counter-name"))
          .filter((n) => n && /^[\w.-]{1,128}$/.test(n)),
      ),
    ];
    if (names.length === 0) return;

    await Promise.all(
      names.map(async (counterName) => {
        const fetched = await counterApiGet(cfg, counterName);

        anchors.forEach((a) => {
          if (a.getAttribute("data-counter-name") !== counterName) return;
          const meta = a.closest("li")?.querySelector(".download-count-meta");
          if (!meta) return;

          if (fetched !== null && typeof fetched.count === "number") {
            meta.textContent = counterLabel(fetched.count);
          } else {
            meta.textContent = "";
          }
        });
      }),
    );

    anchors.forEach((a) => {
      const counterName = a.getAttribute("data-counter-name");
      if (!counterName || !/^[\w.-]{1,128}$/.test(counterName)) return;

      a.addEventListener("click", () => {
        const meta = a.closest("li")?.querySelector(".download-count-meta");
        void counterApiUp(cfg, counterName).then((payload) => {
          const next = extractCount(payload);
          if (next !== null && meta) meta.textContent = counterLabel(next);
        });
      });
    });
  } catch (e) {
    console.warn("CounterAPI counters failed:", e);
  }
}

initCounterApiLabels();
