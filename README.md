# 🚖 Cab Tracker PWA

A high-performance, offline-capable Progressive Web App (PWA) designed to track fleet/cab locations in real-time. This application features edge-computing geospatial mathematics to calculate distance moved, integrates with live traffic APIs to smartly detect idling, and displays the vehicle's real-time position on an interactive map.

## ✨ Core Features

- **Interactive Live Map:** Utilizes the official `@vis.gl/react-google-maps` library to render a live, draggable, and zoomable map that automatically tracks the vehicle's coordinates.
- **Offline-First Architecture:** Utilizes `IndexedDB` to safely store thousands of GPS coordinates locally. If the device loses internet connection in a tunnel or rural area, no tracking data is lost.
- **Smart Idle Detection:** Uses the Haversine formula to calculate the distance between coordinates on the client side. If the vehicle moves less than 5 meters in 30 seconds, it triggers an Idle evaluation.
- **Traffic-Aware Logic:** Integrates the **Google Maps Distance Matrix API**. When an idle state is detected, the app checks live traffic conditions ahead of the vehicle to categorize the stop as `Traffic Idle 🚦` or `Genuine Idle 🛑`.
- **Persistent Wake Lock:** Implements the Screen Wake Lock API to prevent the mobile device from sleeping, ensuring the `navigator.geolocation` loop runs uninterrupted.
- **Data Export:** Built-in CSV generator that parses IndexedDB records into an easily exportable spreadsheet for fleet managers.
- **Installable PWA:** Passes all Lighthouse PWA requirements. It can be installed directly to an iOS or Android home screen with a standalone, native app experience (no browser UI).

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js, Vite |
| Styling | Custom CSS (Dark/Glassmorphism Theme), Inter Font |
| Local Database | IndexedDB (via `idb` wrapper) |
| Map Rendering | Google Maps JavaScript API |
| Traffic Logic | Google Maps Distance Matrix API |
| Device APIs | HTML5 Geolocation API, Screen Wake Lock API |

---

## 🧮 The Math: Distance Tracking

To determine if the cab is idling, the app calculates the shortest distance over the earth's surface between the current GPS ping and the previous one (captured 30 seconds prior). This is achieved using the **Haversine formula**:

$$a = \sin^2\left(\frac{\Delta \varphi}{2}\right) + \cos(\varphi_1) \cdot \cos(\varphi_2) \cdot \sin^2\left(\frac{\Delta \lambda}{2}\right)$$

$$c = 2 \cdot \operatorname{atan2}\left(\sqrt{a}, \sqrt{1-a}\right)$$

$$d = R \cdot c$$

Where $\varphi$ is latitude, $\lambda$ is longitude, and $R$ is the Earth's radius (6,371 km). All calculations happen natively in the browser to save server costs.

---

## 🚀 Installation & Local Setup

To run this project locally, you will need [Node.js](https://nodejs.org/) installed on your machine.

**1. Clone the repository:**

```bash
git clone https://github.com/YOUR_USERNAME/cab-tracker-pwa.git
cd cab-tracker-pwa
```

**2. Install dependencies:**

```bash
npm install
```

**3. Configure Environment Variables:**

Create a new file in the root directory named exactly `.env` and add your Google Maps API Key:

```env
VITE_GOOGLE_API_KEY="your_actual_api_key_here"
```

> **Note:** Ensure both the **Maps JavaScript API** and the **Distance Matrix API** are enabled in your Google Cloud Console.

**4. Start the development server:**

```bash
npm run dev
```

> **Note:** Accept the browser's location permission prompt for the tracker to function.

---

## 📱 Deployment

This application is optimized to be hosted on **Vercel**, **Netlify**, or any static hosting provider.

**Deploying to Vercel:**

1. Import the repository from your GitHub.
2. Before clicking **Deploy**, navigate to **Environment Variables**.
3. Add `VITE_GOOGLE_API_KEY` as the **Key** and your actual API key as the **Value**.
4. Click **Deploy**.

> **Important:** After deployment, add your new live URL to your API Key's **Website Restrictions** in the Google Cloud Console so the map renders securely.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).