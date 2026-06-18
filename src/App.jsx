/* eslint-disable no-useless-assignment */
import { useState, useEffect, useRef } from 'react'
import { initDB, addLocation, getAllLocations } from './db'
import { calculateDistance } from './math'
import { checkTraffic } from './traffic'
import { APIProvider, Map, Marker, useMap } from '@vis.gl/react-google-maps' 
import './App.css'

const Polyline = ({ positions }) => {
  const map = useMap();
  const polylineRef = useRef(null);

  useEffect(() => {
    if (!map) return;
    
    if (!polylineRef.current) {
      polylineRef.current = new window.google.maps.Polyline({
        path: positions,
        geodesic: true,
        strokeColor: '#3b82f6', 
        strokeOpacity: 0.8,
        strokeWeight: 5, 
      });
      polylineRef.current.setMap(map);
    } else {
      polylineRef.current.setPath(positions);
    }
  }, [map, positions]);

  useEffect(() => {
    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }
    };
  }, []);

  return null;
};

function App() {
  const [isTracking, setIsTracking] = useState(false)
  const [location, setLocation] = useState({ lat: '--', lng: '--' })
  const [idleState, setIdleState] = useState('Genuine Idle 🛑')
  const [distanceMoved, setDistanceMoved] = useState(0)
  const [mapCenter, setMapCenter] = useState(null) 
  const [showHistory, setShowHistory] = useState(false)
  const [historyData, setHistoryData] = useState([])
  const [pathCoords, setPathCoords] = useState([])

  const watchIdRef = useRef(null)
  const wakeLockRef = useRef(null)
  const lastLocationRef = useRef(null)
  const lastDBUpdateTimeRef = useRef(null) 

  useEffect(() => {
    initDB().then(() => {
      console.log('IndexedDB Initialized!');
    });
  }, [])

  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch (err) {
        console.error(`Wake Lock failed: ${err.message}`);
      }
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current !== null) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  };

  const handleStartTracking = async () => {
    setIsTracking(true);
    setIdleState('Initializing...');
    lastLocationRef.current = null;
    lastDBUpdateTimeRef.current = null; 
    setDistanceMoved(0);
    setMapCenter(null);
    setPathCoords([]); 
    
    await requestWakeLock();
    
    if ("geolocation" in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const now = Date.now();

          setLocation({ lat: lat.toFixed(5), lng: lng.toFixed(5) });
          setMapCenter({ lat, lng });
          setPathCoords(prev => [...prev, { lat, lng }]);

          if (!lastDBUpdateTimeRef.current || now - lastDBUpdateTimeRef.current >= 30000) {
            let currentStatus = 'Moving 🚗';
            let dist = 0;

            if (lastLocationRef.current) {
              dist = calculateDistance(
                lastLocationRef.current.lat, 
                lastLocationRef.current.lng, 
                lat, 
                lng
              );
              
              if (dist < 5) {
                setDistanceMoved("0.00");
                setIdleState('Checking Traffic... ⏳');
                currentStatus = await checkTraffic(lat, lng);
              } else {
                setDistanceMoved(dist.toFixed(2));
                currentStatus = 'Moving 🚗';
              }
            } else {
              currentStatus = 'Genuine Idle 🛑';
            }

            setIdleState(currentStatus);
            lastLocationRef.current = { lat, lng };
            lastDBUpdateTimeRef.current = now; 
            
            try {
              await addLocation(lat, lng, currentStatus);
              if (showHistory) loadHistory(); 
            } catch (error) {
              console.error('Database save failed:', error);
            }
          }
        },
        (error) => console.error('GPS Error:', error.message),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 } 
      );
    }
  }

  const handleStopTracking = async () => {
    setIsTracking(false);
    setIdleState('Stopped');
    
    if (watchIdRef.current !== null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    
    await releaseWakeLock();
  }

  const loadHistory = async () => {
    const data = await getAllLocations();
    setHistoryData(data.reverse()); 
  }

  const toggleHistory = () => {
    if (!showHistory) {
      loadHistory();
    }
    setShowHistory(!showHistory);
  }

  const exportToCSV = () => {
    const headers = ['Timestamp', 'Date', 'Time', 'Latitude', 'Longitude', 'Status'];
    const rows = historyData.map(row => {
      const dateObj = new Date(row.timestamp);
      return `${row.timestamp},${dateObj.toLocaleDateString()},${dateObj.toLocaleTimeString()},${row.lat},${row.lng},${row.status}`;
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "cab_tracker_log.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const mapLat = location.lat !== '--' ? parseFloat(location.lat) : 0;
  const mapLng = location.lng !== '--' ? parseFloat(location.lng) : 0;

  
  const getStatusColor = (statusText) => {
    if (statusText.includes('Moving')) return '#3b82f6'; 
    if (statusText.includes('Idle')) return '#ef4444';
    if (statusText.includes('Traffic')) return '#eab308'; 
    return '#94a3b8';
  }

  return (
    <div className="app-container">
      <header>
        <h1>Cab Tracker</h1>
        <div className={`status-badge ${isTracking ? 'active' : ''}`}>
          {isTracking ? 'Tracking Active •' : 'Waiting...'}
        </div>
      </header>

      <APIProvider apiKey={import.meta.env.VITE_GOOGLE_API_KEY}>
        <main>
          
          <div className="map-card">
            {location.lat === '--' && pathCoords.length === 0 ? (
              <div className="map-placeholder">
                📍 Click Start Tracking to view live map
              </div>
            ) : (
              <Map
                style={{ width: '100%', height: '100%', borderRadius: '8px' }}
                defaultZoom={16}
                center={mapCenter || { lat: mapLat, lng: mapLng }}
                onCameraChanged={(ev) => setMapCenter(ev.detail.center)}
                disableDefaultUI={true}
                fullscreenControl={true} 
                zoomControl={true} 
                gestureHandling={'greedy'} 
                draggableCursor={'grab'}
                draggingCursor={'grabbing'}
              >
                <Marker position={{ lat: mapLat, lng: mapLng }} />
                
                {pathCoords.length > 1 && (
                  <Polyline positions={pathCoords} />
                )}
              </Map>
            )}
          </div>

          <div className="card">
            <h2>Current Location</h2>
            <p>{location.lat} , {location.lng}</p>
          </div>

          <div className="card">
            <h2>Last 30s Status</h2>
            <p style={{ display: 'flex', justifyContent: 'space-between' }}>
              {/* Also applied color coding to the live status indicator! */}
              <span style={{ color: getStatusColor(idleState), fontWeight: 'bold' }}>
                {idleState}
              </span>
              <span style={{ color: '#94a3b8', fontSize: '1rem' }}>{distanceMoved}m</span>
            </p>
          </div>

          {!isTracking ? (
            <button onClick={handleStartTracking}>🚀 Start Tracking</button>
          ) : (
            <button className="stop-btn" onClick={handleStopTracking}>
              ⏹ Stop Tracking
            </button>
          )}

          <button className="secondary-btn" onClick={toggleHistory}>
            {showHistory ? 'Hide History Log' : '📄 View History Log'}
          </button>

          {showHistory && (
            <div className="history-section">
              <h2 style={{ color: '#94a3b8', fontSize: '0.9rem', textTransform: 'uppercase' }}>
                Tracking History
              </h2>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Lat / Lng</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.length === 0 ? (
                      <tr><td colSpan="3" style={{textAlign: 'center', color: '#94a3b8'}}>No data recorded yet.</td></tr>
                    ) : (
                      historyData.map((data) => (
                        <tr key={data.timestamp}>
                          <td>{new Date(data.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                          <td style={{ color: '#94a3b8' }}>{data.lat.toFixed(4)}, {data.lng.toFixed(4)}</td>
                          <td style={{ color: getStatusColor(data.status), fontWeight: 'bold' }}>
                            {data.status.replace(/🚗|🛑|🚦|⏳/g, '').trim()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <button style={{ marginTop: '15px' }} onClick={exportToCSV}>
                ⬇️ Export to CSV
              </button>
            </div>
          )}
        </main>
      </APIProvider>
    </div>
  )
}

export default App