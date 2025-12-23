# LiveBusData

Web-based GTFS-RT vehicle map with a simple Node server and a Vercel-ready API.

## Project Setup

### Prerequisites

- Node.js 18+ (for native `fetch`).
- npm.

### Install Dependencies

```bash
npm install
```

### Configure GTFS-RT Source (required)

Set a GTFS-RT VehiclePositions feed URL via `GTFS_RT_URL`.

Example: `GTFS_RT_URL=https://example.com/VehiclePositions.pb`

### Run the App

```bash
GTFS_RT_URL="https://example.com/VehiclePositions.pb" node server.js
```

Open the map at:

```
http://localhost:8000
```

## What’s Included

- Node server (`server.js`) that serves the web app and `/vehicles` + `/api/vehicles`.
- Vercel serverless API (`api/vehicles.js`) that returns the feed JSON.
- Web map app in `public/`.

## Web Map (GTFS-RT)

The app serves a Leaflet map and polls vehicle positions every 5 seconds.

### Setup

```bash
npm install
```

### Run (local server)

```bash
GTFS_RT_URL="https://example.com/VehiclePositions.pb" node server.js
```

Open the map at:

```
http://localhost:8000
```

## Vercel Deployment

- Deploy as a static + serverless app.
- Set `GTFS_RT_URL` in Vercel Environment Variables.
- The client calls `/api/vehicles` on Vercel.

## Custom Feed URL (UI)

- Users can enter a feed URL in the UI.
- The browser fetches the URL directly; this requires CORS to be enabled on the feed.
- The URL is stored locally in the browser (not on the server).

## Notes

- The map refreshes vehicle data every 5 seconds.
