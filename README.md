# Project 7: NASA API - Space Explorer App
NASA releases a new "Astronomy Picture of the Day" (APOD) every day—spotlighting breathtaking images of galaxies, stars, planets, and more.

Your task is to build an interactive web app that fetches and displays these photos using [NASA's API](https://api.nasa.gov/). Users will pick a date range and instantly view stunning photos from across the cosmos, along with titles and descriptions.

You'll get to use your skills to build something that's actually connected to real-world data from one of the most iconic organizations in the world.

## Starter Files
- The provided files include a NASA logo, date inputs, a button, a placeholder for your gallery, and basic layout and styling to help you get started.
- It also includes built-in logic (in `dateRange.js`) to handle the valid APOD date range—from June 16, 1995 to today. No need to modify it.
- All your custom JavaScript should go in `script.js`. That's where you'll write the code that fetches data and displays your gallery.

## Run the app with the proxy

The browser must not receive the NASA API key. The included `server.js` serves the frontend and provides `/api/apod`; it reads `NASA_API_KEY` from the server environment and validates the selected dates before calling NASA's fixed APOD endpoint.

```bash
NASA_API_KEY="$NASA_API_KEY" node server.js
```

Open the Codespace forwarded port (usually `3000`) in the browser. The browser sends only `start_date` and `end_date`.

## Deploy the proxy for GitHub Pages

GitHub Pages can host the frontend but cannot run `server.js` or keep a secret. Deploy `server.js` separately to a Node host such as Render, Railway, or Fly.io. Set the host's start command to `node server.js` and add `NASA_API_KEY` as a secret/environment variable in that host's dashboard; never paste the value into this repository.

Before publishing the frontend, change the `data-proxy-url` value on the `<body>` in `index.html` to the deployed proxy URL ending in `/api/apod`. The GitHub Pages frontend will then continue using that proxy after the Codespace stops. Configure the host to allow requests from your GitHub Pages origin if it enforces CORS.
