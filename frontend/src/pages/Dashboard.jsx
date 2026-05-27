import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import Controls from '../components/Controls';
import LiveGrid from '../components/LiveGrid';
import EventLog from '../components/EventLog';
import MapView from '../components/MapView';

const API_BASE = `http://${window.location.hostname}:8000`;

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // UI State
  const [activeTab, setActiveTab] = useState('live'); // 'live' or 'map'
  const [privacyMode, setPrivacyMode] = useState(false);
  
  // Data State
  const [persons, setPersons] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  
  // Real-time Detection State
  const [boundingBoxes, setBoundingBoxes] = useState({});
  const [detectionInfo, setDetectionInfo] = useState({ status: 'STANDBY', highestConfidence: 0 });
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const fetchCameras = async () => {
    try {
        const res = await axios.get(`${API_BASE}/cameras`);
        setCameras(res.data);
    } catch (err) { console.error("Error fetching cameras:", err); }
  };

  const fetchPersons = async () => {
    try {
      const res = await axios.get(`${API_BASE}/persons`);
      setPersons(res.data);
    } catch (err) { console.error("Error fetching persons:", err); } 
  };

  const fetchAlerts = async () => {
    try {
      const res = await axios.get(`${API_BASE}/alerts?t=${Date.now()}`);
      setAlerts(res.data);
    } catch (err) { console.error("Error fetching alerts:", err); } 
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) { console.error("Camera error:", err); }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const processAllFrames = async () => {
     const sources = [];
     if (videoRef.current && !videoRef.current.paused) {
         sources.push({ id: 'webcam', element: videoRef.current, name: 'Primary Terminal' });
     }
     cameras.forEach(cam => {
         const el = document.getElementById(`cam-${cam.id}`);
         if (el) sources.push({ id: cam.id, element: el, name: cam.name || 'Remote Node' });
     });

     let tempDetectionStatus = 'SCANNING';
     let maxConf = 0;
     const tempBoxes = {};

     await Promise.all(sources.map(async (source) => {
         try {
             const canvas = document.createElement('canvas');
             const isVideo = source.id === 'webcam';
             canvas.width = isVideo ? source.element.videoWidth : source.element.naturalWidth || source.element.width;
             canvas.height = isVideo ? source.element.videoHeight : source.element.naturalHeight || source.element.height;
             
             if (canvas.width === 0 || canvas.height === 0) return;

             const ctx = canvas.getContext('2d');
             ctx.drawImage(source.element, 0, 0, canvas.width, canvas.height);

             const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
             if (!blob) return;

             const fd = new FormData();
             fd.append('image', blob, 'frame.jpg');
             fd.append('location', source.name);
             fd.append('privacy_mode', privacyMode ? 'true' : 'false');
             if (isVideo && userLocation) {
                 fd.append('lat', userLocation[0]);
                 fd.append('lng', userLocation[1]);
             }

             const res = await axios.post(`${API_BASE}/detect`, fd);
             const data = res.data;
             
             let currentBoxes = [];

             if (data.matches && data.matches.length > 0) {
                 tempDetectionStatus = 'MATCH DETECTED';
                 fetchAlerts(); // Refresh alerts when a match happens!
                 data.matches.forEach(match => {
                     if (match.confidence > maxConf) maxConf = match.confidence;
                     const displayElRect = source.element.getBoundingClientRect();
                     const scaleX = displayElRect.width / canvas.width;
                     const scaleY = displayElRect.height / canvas.height;
                     
                     currentBoxes.push({
                         id: Math.random().toString(),
                         name: match.person.name,
                         isMatch: true,
                         confidence: match.confidence,
                         x: match.facial_area.x * scaleX,
                         y: match.facial_area.y * scaleY,
                         w: match.facial_area.w * scaleX,
                         h: match.facial_area.h * scaleY
                     });
                 });
             }

             if (data.unmatched_faces && data.unmatched_faces.length > 0) {
                 data.unmatched_faces.forEach(face => {
                     const displayElRect = source.element.getBoundingClientRect();
                     const scaleX = displayElRect.width / canvas.width;
                     const scaleY = displayElRect.height / canvas.height;
                     
                     currentBoxes.push({
                         id: Math.random().toString(),
                         name: "Unknown",
                         isMatch: false,
                         confidence: 0,
                         x: face.x * scaleX,
                         y: face.y * scaleY,
                         w: face.w * scaleX,
                         h: face.h * scaleY
                     });
                 });
             }

             tempBoxes[source.id] = currentBoxes;
         } catch (err) {
            console.error("Frame capture error", err);
         }
     }));

     setBoundingBoxes(tempBoxes);
     setDetectionInfo({ status: tempDetectionStatus, highestConfidence: maxConf });
     setTimeout(() => setBoundingBoxes({}), 1200); // Clear boxes to simulate scanning pulse
  };

  // Authentication Check
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Initial Data Fetch
  useEffect(() => {
    if (!user) return;
    fetchCameras();
    fetchPersons();
    fetchAlerts();

    let watchId;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (err) => {
          console.error("Geolocation error:", err);
          // Fallback to IP-based location if Geolocation is blocked
          if (!userLocation) {
              axios.get('https://ipapi.co/json/')
                .then(res => {
                    if (res.data && res.data.latitude) setUserLocation([res.data.latitude, res.data.longitude]);
                })
                .catch(e => console.error("IP Geo fallback error:", e));
          }
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    }
    
    return () => {
      if (watchId !== undefined) {
          navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Camera Activation
  useEffect(() => {
    if (activeTab === 'live') {
      startCamera();
    } else {
      stopCamera();
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // AI Polling Loop
  useEffect(() => {
    let interval;
    if (activeTab === 'live') {
      interval = setInterval(processAllFrames, 1500);
    }
    return () => clearInterval(interval);
  }, [activeTab, cameras]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return null;

  return (
    <div className="h-screen w-screen bg-zinc-950 text-slate-200 overflow-hidden font-sans flex flex-col">
      <header className="h-16 shrink-0 bg-black/80 backdrop-blur-3xl border-b border-white/5 flex items-center justify-between px-8 z-50">
         <div className="flex items-center gap-4">
            <h1 className="text-2xl font-black italic tracking-widest text-white">SAARTHI<span className="text-sky-500">_AI</span></h1>
            <div className="h-4 w-[1px] bg-white/20 mx-2" />
            <div className="flex items-center gap-2">
               <div className={`w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px_currentColor] ${detectionInfo.status === 'MATCH DETECTED' ? 'bg-red-500 text-red-500' : 'bg-sky-500 text-sky-500'}`} />
               <span className={`text-[10px] uppercase font-bold tracking-[0.3em] ${detectionInfo.status === 'MATCH DETECTED' ? 'text-red-500' : 'text-sky-500'}`}>{detectionInfo.status === 'MATCH DETECTED' ? 'ALERT' : 'LIVE'}</span>
            </div>
         </div>

         <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 px-4 py-1.5 bg-white/5 rounded-full border border-white/10">
                <span className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold">Role:</span>
                <span className="text-[10px] uppercase tracking-widest text-sky-400 font-black">{user.role}</span>
            </div>
            <button onClick={logout} className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 hover:text-white transition-colors">
                Disengage
            </button>
         </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
         <Controls 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            privacyMode={privacyMode} 
            setPrivacyMode={setPrivacyMode} 
            refreshData={() => { fetchPersons(); fetchCameras(); }}
         />

         <main className="flex-1 bg-zinc-950 relative overflow-hidden flex flex-col p-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.03)_0%,transparent_100%)] pointer-events-none" />
            {activeTab === 'live' ? 
               <LiveGrid privacyMode={privacyMode} boundingBoxes={boundingBoxes} cameras={cameras} videoRef={videoRef} /> 
               : <MapView persons={persons} alerts={alerts} userLocation={userLocation} />
            }
         </main>

         <Sidebar persons={persons} alerts={alerts} fetchAlerts={fetchAlerts} />
      </div>

      <EventLog alerts={alerts} />
    </div>
  );
}
