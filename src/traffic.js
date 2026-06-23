const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

export const checkTraffic = async (lat, lng) => {
  if (!GOOGLE_API_KEY || GOOGLE_API_KEY === 'AIzaSyDzqNHlv2Or0EAC07NLQdluRaWJosjExGU') {
    console.warn("No API Key detected! Returning simulated traffic data.");
    return Math.random() > 0.5 ? 'Traffic Idle 🚦' : 'Genuine Idle 🛑';
  }

  try {
    const destLat = lat + 0.0009; 
    const destLng = lng;

    const url = `https://cors-anywhere.herokuapp.com/https://maps.googleapis.com/maps/api/distancematrix/json?origins=${lat},${lng}&destinations=${destLat},${destLng}&departure_time=now&key=${'AIzaSyDzqNHlv2Or0EAC07NLQdluRaWJosjExGU'}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.rows[0].elements[0].duration_in_traffic) {
      console.warn("Google API Error or No Traffic Data:", data);
      return 'Genuine Idle 🛑';
    }

    
    const normalDuration = data.rows[0].elements[0].duration.value; // in seconds
    const trafficDuration = data.rows[0].elements[0].duration_in_traffic.value; // in seconds

    console.log(`Normal Time: ${normalDuration}s | Traffic Time: ${trafficDuration}s`);

    
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