const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

export const checkTraffic = async (lat, lng) => {
  // FIXED: Check if the key is missing, undefined, or still set to a placeholder
  if (!GOOGLE_API_KEY || GOOGLE_API_KEY === 'your_actual_long_api_key_goes_here') {
    console.warn("No API Key detected! Returning simulated traffic data.");
    return Math.random() > 0.5 ? 'Traffic Idle 🚦' : 'Genuine Idle 🛑';
  }

  try {
    // 1. We need a "destination" to check traffic against. 
    // We simulate a point roughly 100 meters north of the current location.
    const destLat = lat + 0.0009; 
    const destLng = lng;

    // 2. Build the Google Distance Matrix API URL
    // Note: If deployed to production, the CORS proxy may need to be removed or replaced 
    // with a dedicated backend function depending on Google's exact CORS policies.
    const url = `https://cors-anywhere.herokuapp.com/https://maps.googleapis.com/maps/api/distancematrix/json?origins=${lat},${lng}&destinations=${destLat},${destLng}&departure_time=now&key=${GOOGLE_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.rows[0].elements[0].duration_in_traffic) {
      console.warn("Google API Error or No Traffic Data:", data);
      return 'Genuine Idle 🛑';
    }

    // 3. Compare normal travel time vs. current traffic time
    const normalDuration = data.rows[0].elements[0].duration.value; // in seconds
    const trafficDuration = data.rows[0].elements[0].duration_in_traffic.value; // in seconds

    console.log(`Normal Time: ${normalDuration}s | Traffic Time: ${trafficDuration}s`);

    // 4. The Logic: If it takes 50% longer than normal, it's traffic!
    if (trafficDuration > (normalDuration * 1.5)) {
      return 'Traffic Idle 🚦';
    } else {
      return 'Genuine Idle 🛑';
    }

  } catch (error) {
    console.error("Traffic API Fetch Error:", error);
    return 'Genuine Idle 🛑'; 
  }
};