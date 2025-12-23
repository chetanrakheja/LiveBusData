/* global L */

const statusEl = document.getElementById("status");
const countEl = document.getElementById("vehicleCount");
const lastUpdateEl = document.getElementById("lastUpdate");
const changeFeedBtn = document.getElementById("changeFeed");
const feedModal = document.getElementById("feedModal");
const feedUrlInput = document.getElementById("feedUrlInput");
const useServerBtn = document.getElementById("useServerBtn");
const useCustomBtn = document.getElementById("useCustomBtn");
const feedModalNote = document.getElementById("feedModalNote");
const panelEl = document.querySelector(".panel");
const toggleSnapshotBtn = document.getElementById("toggleSnapshot");
const expandSnapshotBtn = document.getElementById("expandSnapshot");
const layoutEl = document.querySelector(".layout");

const map = L.map("map", {
  zoomControl: false,
}).setView([28.6139, 77.209], 11);

L.control.zoom({ position: "topright" }).addTo(map);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

const layerGroup = L.layerGroup().addTo(map);
let lastUpdated = 0;
let customFeedUrl = loadCustomFeedUrl();
let gtfsBindingsPromise;

function setStatus(text) {
  statusEl.textContent = text;
}

function formatTimestamp(ts) {
  if (!ts) return "-";
  const dt = new Date(ts * 1000);
  return dt.toLocaleString();
}

async function fetchVehicles() {
  if (customFeedUrl) {
    return fetchVehiclesFromCustomUrl(customFeedUrl);
  }
  const res = await fetch("/api/vehicles");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function renderVehicles(data) {
  layerGroup.clearLayers();
  let count = 0;

  for (const v of data.vehicles) {
    if (typeof v.latitude !== "number" || typeof v.longitude !== "number") {
      continue;
    }

    const marker = L.circleMarker([v.latitude, v.longitude], {
      radius: 6,
      color: "#d65c1b",
      weight: 1,
      fillColor: "#d65c1b",
      fillOpacity: 0.85,
    });

    marker.bindPopup(
      `<b>${v.vehicle_label || v.vehicle_id || "Vehicle"}</b><br>` +
        `Route: ${v.route_id || ""}<br>` +
        `Trip: ${v.trip_id || ""}<br>` +
        `Speed: ${v.speed ?? ""}<br>` +
        `Timestamp: ${formatTimestamp(v.timestamp)}`
    );

    marker.addTo(layerGroup);
    count += 1;
  }

  if (data.header_timestamp) {
    lastUpdated = data.header_timestamp;
  }

  setStatus(`Vehicles: ${count}`);
  countEl.textContent = String(count);
  lastUpdateEl.textContent = formatTimestamp(lastUpdated);
}

async function refresh() {
  try {
    const data = await fetchVehicles();
    renderVehicles(data);
  } catch (err) {
    setStatus(`Error loading vehicles: ${err.message}`);
  }
}

function loadCustomFeedUrl() {
  const stored = localStorage.getItem("customFeedUrl");
  return stored ? stored : "";
}

function setCustomFeedUrl(url) {
  customFeedUrl = url;
  if (url) {
    localStorage.setItem("customFeedUrl", url);
  } else {
    localStorage.removeItem("customFeedUrl");
  }
}

function openFeedModal(message) {
  feedModalNote.textContent = message || "";
  feedUrlInput.value = customFeedUrl;
  feedModal.classList.add("is-open");
  feedModal.setAttribute("aria-hidden", "false");
}

function closeFeedModal() {
  feedModal.classList.remove("is-open");
  feedModal.setAttribute("aria-hidden", "true");
}

async function getGtfsBindings() {
  if (!gtfsBindingsPromise) {
    gtfsBindingsPromise = import(
      "https://esm.sh/gtfs-realtime-bindings@1.1.1"
    );
  }
  const mod = await gtfsBindingsPromise;
  return mod.default ?? mod;
}

function toNumber(value) {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value.toNumber === "function") return value.toNumber();
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toVehiclePayload(feed) {
  const vehicles = [];
  for (const entity of feed.entity || []) {
    const veh = entity.vehicle || {};
    const trip = veh.trip || {};
    const pos = veh.position || {};
    const v = veh.vehicle || {};

    vehicles.push({
      entity_id: entity.id || "",
      trip_id: trip.tripId || trip.trip_id || "",
      route_id: trip.routeId || trip.route_id || "",
      start_time: trip.startTime || trip.start_time || "",
      start_date: trip.startDate || trip.start_date || "",
      schedule_relationship: String(
        trip.scheduleRelationship || trip.schedule_relationship || ""
      ),
      latitude: typeof pos.latitude === "number" ? pos.latitude : null,
      longitude: typeof pos.longitude === "number" ? pos.longitude : null,
      speed: typeof pos.speed === "number" ? pos.speed : null,
      vehicle_id: v.id || "",
      vehicle_label: v.label || "",
      timestamp: toNumber(veh.timestamp),
    });
  }

  return {
    header_timestamp: toNumber(feed.header?.timestamp),
    vehicles,
  };
}

async function fetchVehiclesFromCustomUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }

  const buffer = await res.arrayBuffer();
  const bindings = await getGtfsBindings();
  const feed = bindings.transit_realtime.FeedMessage.decode(
    new Uint8Array(buffer)
  );
  return toVehiclePayload(feed);
}

changeFeedBtn.addEventListener("click", () => {
  openFeedModal("");
});

function setSnapshotCollapsed(collapsed) {
  if (!layoutEl) return;
  document.body.classList.toggle("panel-collapsed", collapsed);
  layoutEl.classList.toggle("is-collapsed", collapsed);
  if (toggleSnapshotBtn) {
    toggleSnapshotBtn.textContent = collapsed ? "Expand" : "Collapse";
  }
  setTimeout(() => {
    map.invalidateSize();
  }, 150);
}

if (toggleSnapshotBtn) {
  toggleSnapshotBtn.addEventListener("click", () => {
    setSnapshotCollapsed(true);
  });
}

if (expandSnapshotBtn) {
  expandSnapshotBtn.addEventListener("click", () => {
    setSnapshotCollapsed(false);
  });
}

useServerBtn.addEventListener("click", () => {
  setCustomFeedUrl("");
  closeFeedModal();
  refresh();
});

useCustomBtn.addEventListener("click", () => {
  const url = feedUrlInput.value.trim();
  if (!url) {
    feedModalNote.textContent = "Please enter a feed URL.";
    return;
  }
  setCustomFeedUrl(url);
  closeFeedModal();
  refresh();
});

refresh();
setInterval(refresh, 5000);
