// Replace this with your actual Google Maps API Key
const GOOGLE_API_KEY = 'AIzaSyDzqNHlv2Or0EAC07NLQdluRaWJosjExGU';

export const checkTraffic = async (lat, lng) => {
  // Fallback if key is missing
  if (GOOGLE_API_KEY === 'AIzaSyDzqNHlv2Or0EAC07NLQdluRaWJosjExGU') {
    console.warn("No API Key detected! Returning simulated traffic data.");
    return Math.random() > 0.5 ? 'Traffic Idle 🚦' : 'Genuine Idle 🛑';
  }

  try {
    // 1. We need a "destination" to check traffic against. 
    // We simulate a point roughly 100 meters north of the current location.
    const destLat = lat + 0.0009; 
    const destLng = lng;

    // 2. Build the Google Distance Matrix API URL
    // departure_time=now is REQUIRED to get real-time traffic data
    const url = `https://cors-anywhere.herokuapp.com/https://maps.googleapis.com/maps/api/distancematrix/json?origins=${lat},${lng}&destinations=${destLat},${destLng}&departure_time=now&key=${'AIzaSyDzqNHlv2Or0EAC07NLQdluRaWJosjExGU'}`;
    
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