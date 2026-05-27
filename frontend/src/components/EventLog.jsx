import { AlertTriangle, Activity, Info } from 'lucide-react';

export default function EventLog({ alerts }) {
  const recentAlerts = alerts?.filter(a => {
      const alertTime = new Date(a.timestamp.endsWith('Z') ? a.timestamp : a.timestamp + 'Z').getTime();
      return (Date.now() - alertTime) < 15000;
  }) || [];

  return (
    <footer className="h-16 shrink-0 bg-zinc-950 border-t border-white/5 flex items-center px-6 z-50 overflow-hidden">
       <div className="flex items-center gap-6 w-full">
          <div className="flex items-center gap-2 text-sky-500 shrink-0">
             <Activity className="w-4 h-4 animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-widest">System Log</span>
          </div>
          
          <div className="flex-1 flex gap-4 overflow-x-auto no-scrollbar items-center mask-image">
             {!recentAlerts || recentAlerts.length === 0 ? (
                <div className="flex items-center gap-3 px-4 py-1.5 rounded-full border bg-white/5 border-white/10 text-zinc-500 whitespace-nowrap">
                   <Info className="w-3 h-3" />
                   <span className="text-[10px] font-bold uppercase tracking-widest">Standby mode engaged</span>
                </div>
             ) : null}

             {recentAlerts.map(alert => (
                <div 
                   key={alert.id} 
                   className="flex items-center gap-3 px-4 py-1.5 rounded-full whitespace-nowrap border shrink-0 bg-red-500/10 border-red-500/20 text-red-500 animate-in slide-in-from-right duration-500"
                >
                   <AlertTriangle className="w-3 h-3 animate-pulse" />
                   <span className="text-[10px] font-mono opacity-60">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                   <span className="text-[10px] font-bold uppercase tracking-widest">
                       Match: {alert.person.name} [{ (alert.confidence).toFixed(1) }%] via {alert.location}
                   </span>
                </div>
             ))}
          </div>
       </div>
    </footer>
  );
}
