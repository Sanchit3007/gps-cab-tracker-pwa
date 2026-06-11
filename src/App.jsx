import { useState, useEffect, useRef } from 'react'
import { initDB, addLocation, getAllLocations } from './db' // NEW: Imported getAllLocations
import { calculateDistance } from './math'
import { checkTraffic } from './traffic'
import './App.css'

function App() {
  const [isTracking, setIsTracking] = useState(false)
  const [location, setLocation] = useState({ lat: '--', lng: '--' })
  const [idleState, setIdleState] = useState('Unknown')
  const [distanceMoved, setDistanceMoved] = useState(0)
  
  // NEW: State for our History Log
  const [showHistory, setShowHistory] = useState(false)
  const [historyData, setHistoryData] = useState([])

  const intervalRef = useRef(null)
  const wakeLockRef = useRef(null)
  const lastLocationRef = useRef(null)

  useEffect(() => {
    initDB().then(() => console.log('IndexedDB Initialized!'));
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

  const captureLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          let currentStatus = 'Moving 🚗';
          let dist = 0;

          if (lastLocationRef.current) {
            dist = calculateDistance(
              lastLocationRef.current.lat, 
              lastLocationRef.current.lng, 
              lat, 
              lng
            );
            
            setDistanceMoved(dist.toFixed(2));

            if (dist < 5) {
              setIdleState('Checking Traffic... ⏳');
              currentStatus = await checkTraffic(lat, lng);
            } else {
              currentStatus = 'Moving 🚗';
            }
          }

          setLocation({ lat: lat.toFixed(5), lng: lng.toFixed(5) });
          setIdleState(currentStatus);
          lastLocationRef.current = { lat, lng };
          
          try {
            await addLocation(lat, lng, currentStatus);
            // NEW: If history is open, refresh it automatically
            if (showHistory) loadHistory(); 
          } catch (error) {
            console.error('Database save failed:', error);
          }
        },
        (error) => console.error('GPS Error:', error.message),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    }
  };

  const handleStartTracking = async () => {
    setIsTracking(true);
    setIdleState('Initializing...');
    lastLocationRef.current = null;
    setDistanceMoved(0);
    
    await requestWakeLock();
    captureLocation();
    intervalRef.current = setInterval(captureLocation, 30000); 
  }

  const handleStopTracking = async () => {
    setIsTracking(false);
    setIdleState('Stopped');
    clearInterval(intervalRef.current);
    await releaseWakeLock();
  }

  // --- NEW: HISTORY & EXPORT LOGIC ---
  const loadHistory = async () => {
    const data = await getAllLocations();
    // Sort so the newest records are at the top
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

  return (
    <div className="app-container">
      <header>
        <h1>Cab Tracker</h1>
        {/* Upgraded Status Badge with pulsing animation */}
        <div className={`status-badge ${isTracking ? 'active' : ''}`}>
          {isTracking ? 'Tracking Active •' : 'Waiting...'}
        </div>
      </header>

      <main>
        <div className="card">
          <h2>Current Location</h2>
          <p>{location.lat} , {location.lng}</p>
        </div>

        <div className="card">
          <h2>Last 30s Distance</h2>
          <p>{distanceMoved} meters</p>
        </div>
        
        <div className="card">
          <h2>Idle Status</h2>
          <p>{idleState}</p>
        </div>

        {/* Upgraded Buttons */}
        {!isTracking ? (
          <button onClick={handleStartTracking}>🚀 Start Tracking</button>
        ) : (
          <button className="stop-btn" onClick={handleStopTracking}>
            ⏹ Stop Tracking
          </button>
        )}

        {/* Upgraded Secondary Button */}
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
                        <td>{data.status.replace(/🚗|🛑|🚦|⏳/g, '')}</td>
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
    </div>
  )
}

export default App