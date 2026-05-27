import { Calendar, MapPin, Search, Activity, CheckCircle } from 'lucide-react';
import axios from 'axios';

export default function Sidebar({ persons, alerts, fetchAlerts }) {
  const handleVerify = async (alertId) => {
      try {
          const token = localStorage.getItem('token');
          await axios.put(`http://${window.location.hostname}:8000/alerts/${alertId}/verify`, {}, {
              headers: { Authorization: `Bearer ${token}` }
          });
          if (fetchAlerts) fetchAlerts();
          else window.location.reload();
      } catch (err) {
          console.error("Verification failed", err);
      }
  };

  const latestAlert = alerts && alerts.length > 0 ? alerts[0] : null;
  const activePerson = latestAlert && persons ? persons.find(p => p.id === latestAlert.person_id) : (persons && persons.length > 0 ? persons[0] : null);

  if (!activePerson) {
      return (
         <aside className="w-80 bg-zinc-950 border-l border-white/5 flex flex-col z-20 shrink-0 hidden lg:flex items-center justify-center p-6 text-center">
            <Activity className="w-12 h-12 text-zinc-800 mb-4 animate-pulse" />
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">No Targets Indexed</h3>
            <p className="text-[10px] text-zinc-600 mt-2">Matrix is currently idle.</p>
         </aside>
      );
  }

  const personAlerts = alerts ? alerts.filter(a => a.person_id === activePerson.id).slice(0, 5) : [];

  return (
    <aside className="w-80 bg-zinc-950 border-l border-white/5 flex flex-col z-20 shrink-0 overflow-y-auto hidden lg:flex no-scrollbar">
       <div className="p-6 space-y-8">
          
          <div className="space-y-4 animate-in fade-in zoom-in duration-500">
             <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Target Profile</h3>
                <span className="text-[9px] font-black uppercase tracking-widest text-sky-400 bg-sky-500/10 px-2 py-1 rounded">Active</span>
             </div>

             <div className="bg-zinc-900/50 rounded-3xl border border-white/5 overflow-hidden">
                <div className="h-48 bg-zinc-800 relative">
                    <img src={`http://${window.location.hostname}:8000/${(activePerson.image_paths || '').split(',')[0].replace(/\\/g, '/')}`} className="w-full h-full object-cover grayscale opacity-80" alt="Profile" onError={(e) => e.target.src="https://via.placeholder.com/400"} />
                    {latestAlert && latestAlert.person_id === activePerson.id ? (
                        latestAlert.is_confirmed ? (
                            <div className="absolute top-3 right-3 bg-red-500 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-[0_0_10px_#ef4444]">
                                MATCH FOUND
                            </div>
                        ) : (
                            <button onClick={() => handleVerify(latestAlert.id)} className="absolute top-3 right-3 bg-amber-500 text-black text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-[0_0_10px_#f59e0b] hover:bg-amber-400 hover:scale-105 transition-all flex items-center gap-1 group z-50">
                                PENDING VERIFICATION
                                <CheckCircle className="w-3 h-3 group-hover:scale-110" />
                            </button>
                        )
                    ) : (
                        <div className="absolute top-3 right-3 bg-zinc-800 border border-zinc-700 text-zinc-400 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                            SEARCHING
                        </div>
                    )}
                </div>
                <div className="p-5">
                   <h4 className="text-xl font-black italic tracking-widest uppercase text-white">{activePerson.name}</h4>
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-500 mt-1">{latestAlert && latestAlert.person_id === activePerson.id ? (latestAlert.confidence).toFixed(1) : '0'}% Confidence Vector</p>
                   
                   <div className="mt-4 space-y-2">
                       <div className="flex items-center gap-3 text-zinc-400 text-[10px] font-bold uppercase">
                          <MapPin className="w-3 h-3 text-zinc-600" /> Seen: {activePerson.last_seen_location}
                       </div>
                       <div className="flex items-center gap-3 text-zinc-400 text-[10px] font-bold uppercase">
                          <Calendar className="w-3 h-3 text-zinc-600" /> Missing: {activePerson.date_missing || "Unknown"}
                       </div>
                   </div>
                </div>
             </div>
          </div>

          <div className="space-y-4">
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Tracking Timeline</h3>
             
             {personAlerts.length === 0 ? (
                 <div className="text-[10px] text-zinc-600 italic">No sightings recorded yet.</div>
             ) : (
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                    {personAlerts.map((event, i) => (
                        <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active animate-in slide-in-from-bottom-2">
                           <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-zinc-900 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-[0_0_15px_rgba(0,0,0,0.5)] z-10">
                              <Search className={`w-4 h-4 ${i === 0 ? 'text-sky-500 animate-pulse' : 'text-zinc-600'}`} />
                           </div>
                           <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-white/5 bg-zinc-900/50">
                              <time className="text-[9px] font-mono text-zinc-500">{new Date(event.timestamp).toLocaleTimeString()}</time>
                               <div className="flex items-center gap-2 mt-1">
                                  <div className="text-[11px] font-black uppercase tracking-widest text-white break-words">{event.location}</div>
                                  {!event.is_confirmed && <span className="text-[8px] font-bold tracking-wider bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20">PENDING</span>}
                               </div>
                           </div>
                        </div>
                    ))}
                </div>
             )}
          </div>

       </div>
    </aside>
  );
}
