import GtfsRealtimeBindings from "gtfs-realtime-bindings";

const GTFS_RT_URL = process.env.GTFS_RT_URL || "";
const parsedTtl = Number.parseInt(process.env.CACHE_TTL_MS || "5000", 10);
const CACHE_TTL_MS =
  Number.isFinite(parsedTtl) && parsedTtl > 0 ? parsedTtl : 5000;

let cachedVehicles = null;
let cacheTimestamp = 0;
let inflightVehicles = null;

async function loadFeed() {
  if (!GTFS_RT_URL) {
    throw new Error(
      "GTFS_RT_URL is required. Set it in the environment or use the UI to provide a feed URL."
    );
  }

  const res = await fetch(GTFS_RT_URL, {
    headers: { "User-Agent": "GTFS-RT-Viewer/1.0" },
  });
  if (!res.ok) {
    throw new Error(`GTFS-RT fetch failed: ${res.status}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  return GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buffer);
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

export async function getVehiclesCached() {
  const now = Date.now();
  if (cachedVehicles && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedVehicles;
  }

  if (inflightVehicles) {
    return inflightVehicles;
  }

  inflightVehicles = (async () => {
    const feed = await loadFeed();
    const payload = toVehiclePayload(feed);
    cachedVehicles = payload;
    cacheTimestamp = Date.now();
    return payload;
  })().finally(() => {
    inflightVehicles = null;
  });

  return inflightVehicles;
}
