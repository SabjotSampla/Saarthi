import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix typical React-Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.5 });
  }, [center, zoom, map]);
  return null;
}

export default function MapView({ persons, alerts, userLocation }) {
  // Navigation block removed




  const latestAlert = alerts && alerts.length > 0 ? alerts[0] : null;
  const activeLat = latestAlert?.lat || userLocation?.[0] || (persons?.length > 0 ? persons[0].last_lat : 20.5937);
  const activeLng = latestAlert?.lng || userLocation?.[1] || (persons?.length > 0 ? persons[0].last_lng : 78.9629);
  const center = [activeLat || 20.5937, activeLng || 78.9629];

  return (
    <div className="flex-1 flex flex-col h-full z-10 animate-in zoom-in duration-500">
       <div className="flex items-center justify-between mb-4 shrink-0">
          <h2 className="text-xl font-black italic uppercase tracking-widest text-white">Spatial Radar</h2>
          <div className="px-3 py-1 bg-zinc-900 border border-white/10 rounded-full text-[9px] font-black tracking-widest uppercase text-zinc-500 animate-pulse">
             Tracking {persons ? persons.length : 0} Targets
          </div>
       </div>

       <div className="flex-1 rounded-[40px] bg-zinc-950 border border-white/5 relative overflow-hidden shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]">
           <MapContainer center={center} zoom={14} className="w-full h-full z-0" style={{ background: '#09090b' }}>
               <TileLayer
                   url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                   attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
               />
               <MapUpdater center={center} zoom={14} />
               
               {userLocation && (
                   <Marker position={userLocation} icon={blueIcon}>
                       <Popup className="bg-black/90 backdrop-blur-xl border border-sky-500/30 rounded-2xl p-2 !shadow-[0_0_30px_rgba(14,165,233,0.3)]">
                           <div className="flex flex-col items-center gap-1">
                              <div className="text-[12px] uppercase font-black text-sky-500 italic drop-shadow-[0_0_8px_#0ea5e9]">Primary Terminal</div>
                              <div className="text-[10px] text-zinc-400 mt-1 uppercase font-bold truncate">Admin Location</div>
                           </div>
                       </Popup>
                   </Marker>
               )}

               {(() => {
                   const uniqueAlertPersons = new Set();
                   const latestAlertsPerPerson = alerts ? alerts.filter(alert => {
                       if (alert.person && !uniqueAlertPersons.has(alert.person.id)) {
                           uniqueAlertPersons.add(alert.person.id);
                           return true;
                       }
                       return false;
                   }) : [];

                   return latestAlertsPerPerson.map(alert => {
                       const lat = alert.lat || userLocation?.[0] || 20.5937;
                       const lng = alert.lng || userLocation?.[1] || 78.9629;
                       
                       return (
                       <div key={`alert-${alert.id}`}>
                           <Marker position={[lat, lng]} icon={redIcon}>
                               <Popup className="bg-black/90 backdrop-blur-xl border border-red-500/30 rounded-2xl p-2 !shadow-[0_0_30px_rgba(239,68,68,0.3)]">
                                   <div className="flex flex-col items-center gap-2">
                                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-red-500 mb-1">
                                          <img src={`http://${window.location.hostname}:8000/${(alert.person?.image_paths || '').split(',')[0].replace(/\\/g, '/')}`} className="w-full h-full object-cover" alt="face" onError={(e) => e.target.style.display='none'} />
                                      </div>
                                      <div className="text-center font-sans tracking-widest leading-tight">
                                        <div className="text-[12px] uppercase font-black text-red-500 italic drop-shadow-[0_0_8px_#ef4444]">{alert.person?.name || "Unknown"}</div>
                                        <div className="text-[10px] text-zinc-400 mt-1 uppercase font-bold truncate">Loc: {alert.location}</div>
                                      </div>
                                   </div>
                               </Popup>
                           </Marker>
                           <Circle center={[lat, lng]} radius={200} pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.2 }} />
                       </div>
                   );
                   });
               })()}
           </MapContainer>
       </div>
    </div>
  );
}
