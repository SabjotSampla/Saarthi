import { Video, AlertTriangle } from 'lucide-react';

const BoundingBoxOverlay = ({ boxes, privacyMode }) => {
  if (!boxes) return null;
  return boxes.map((box, idx) => (
    <div 
      key={idx}
      className={`absolute border-2 ${box.isMatch ? 'border-red-500 bg-red-500/10 shadow-[0_0_15px_#ef4444]' : 'border-sky-500 bg-sky-500/10'} rounded pointer-events-none transition-all duration-300`}
      style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
    >
       <div className={`absolute -top-6 -left-0.5 ${box.isMatch ? 'bg-red-500' : 'bg-sky-500'} text-white text-[8px] font-black px-2 py-1 uppercase tracking-widest whitespace-nowrap`}>
          {box.isMatch ? `${box.name} [${box.confidence}%]` : (privacyMode ? 'BLOCKED' : 'UNKNOWN')}
       </div>
       {privacyMode && !box.isMatch && (
          <div className="absolute inset-0 backdrop-blur-xl bg-white/10" />
       )}
    </div>
  ));
};

export default function LiveGrid({ privacyMode, boundingBoxes, cameras, videoRef }) {
  return (
    <div className="flex-1 flex flex-col h-full z-10 animate-in fade-in duration-500">
       <div className="flex items-center justify-between mb-4 shrink-0">
          <h2 className="text-xl font-black italic uppercase tracking-widest text-white">Live Monitoring Matrix</h2>
          <div className="px-3 py-1 bg-zinc-900 border border-white/10 rounded-full text-[9px] font-black tracking-widest uppercase text-zinc-500">
             Grid Capacity: {cameras.length + 1} Nodes Active
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0 overflow-y-auto pr-2 no-scrollbar">
          
          {/* Primary Webcam Feed */}
          <div className="bg-black rounded-3xl border border-white/10 overflow-hidden relative group shadow-[0_0_50px_rgba(0,0,0,0.5)]">
             <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
             <BoundingBoxOverlay boxes={boundingBoxes['webcam']} privacyMode={privacyMode} />

             <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse shadow-[0_0_8px_#0ea5e9]" />
                <span className="text-[9px] font-black uppercase tracking-widest text-white">Cam 00: Primary Terminal</span>
             </div>
          </div>

          {/* Remote IP Cameras */}
          {cameras.map(cam => (
             <div key={cam.id} className="bg-black rounded-3xl border border-white/10 overflow-hidden relative group shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                <img crossOrigin="anonymous" id={`cam-${cam.id}`} src={cam.url} alt={cam.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                
                {/* Fallback Error Overlay */}
                <div className="hidden absolute inset-0 bg-zinc-900 flex-col items-center justify-center">
                   <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
                   <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Signal Lost</span>
                </div>

                <BoundingBoxOverlay boxes={boundingBoxes[cam.id]} privacyMode={privacyMode} />
                
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                   <div className="w-2 h-2 rounded-full bg-zinc-500 animate-pulse" />
                   <span className="text-[9px] font-black uppercase tracking-widest text-white">Cam {cam.id.toString().padStart(2, '0')}: {cam.name}</span>
                </div>
             </div>
          ))}

       </div>
    </div>
  );
}
