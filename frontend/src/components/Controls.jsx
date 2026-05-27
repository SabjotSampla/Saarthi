import { useState } from 'react';
import { PlusCircle, Search, Map, Shield, Activity, Users, Video } from 'lucide-react';
import AddPersonModal from './AddPersonModal';
import IdentityArchiveModal from './IdentityArchiveModal';
import CameraHubModal from './CameraHubModal';

export default function Controls({ activeTab, setActiveTab, privacyMode, setPrivacyMode, refreshData }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);

  return (
    <aside className="w-64 bg-zinc-950 border-r border-white/5 flex flex-col z-20 shrink-0">
       <div className="flex-1 p-6 space-y-8">
          
          <div className="space-y-4">
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Operation Modes</h3>
             
             <button 
                onClick={() => setActiveTab('live')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-black uppercase tracking-widest ${activeTab === 'live' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'text-zinc-400 hover:bg-white/5'}`}
             >
                <Activity className="w-4 h-4" /> Live Matrix
             </button>
             
             <button 
                onClick={() => setActiveTab('map')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-black uppercase tracking-widest ${activeTab === 'map' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'text-zinc-400 hover:bg-white/5'}`}
             >
                <Map className="w-4 h-4" /> Map
             </button>
          </div>

          <div className="h-[1px] bg-white/5 w-full" />

          <div className="space-y-4">
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Node Management</h3>
             
             <button 
                onClick={() => setShowAddModal(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-black uppercase tracking-widest text-zinc-400 hover:bg-white/5 hover:text-white"
             >
                <PlusCircle className="w-4 h-4" /> Index Identity
             </button>

             <button 
                onClick={() => setShowArchiveModal(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-black uppercase tracking-widest text-zinc-400 hover:bg-white/5 hover:text-white"
             >
                <Users className="w-4 h-4" /> Missing Record
             </button>

             <button 
                onClick={() => setShowCameraModal(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-black uppercase tracking-widest text-zinc-400 hover:bg-white/5 hover:text-white"
             >
                <Video className="w-4 h-4" /> Camera Network
             </button>
          </div>

          <div className="h-[1px] bg-white/5 w-full" />

          <div className="space-y-4">
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Ethical Directives</h3>
             
             <label className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-white/5 cursor-pointer hover:bg-zinc-900 transition-colors">
                <div className="flex items-center gap-3">
                   <Shield className={`w-4 h-4 ${privacyMode ? 'text-green-500' : 'text-zinc-500'}`} />
                   <span className="text-[10px] font-black uppercase tracking-widest text-white">Privacy Mode</span>
                </div>
                <div className={`w-10 h-5 rounded-full p-1 transition-colors ${privacyMode ? 'bg-green-500' : 'bg-zinc-800'}`}>
                   <div className={`w-3 h-3 bg-white rounded-full transition-transform ${privacyMode ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
                <input 
                   type="checkbox" 
                   className="hidden" 
                   checked={privacyMode} 
                   onChange={(e) => setPrivacyMode(e.target.checked)} 
                />
             </label>
             <p className="text-[9px] text-zinc-500 font-bold px-2">{privacyMode ? 'Non-target faces will be blurred out on display streams.' : 'Open surveillance mode active.'}</p>
          </div>
       </div>
       
       {showAddModal && <AddPersonModal onClose={() => setShowAddModal(false)} onSuccess={() => { setShowAddModal(false); if (refreshData) refreshData(); }} />}
       {showArchiveModal && <IdentityArchiveModal onClose={() => setShowArchiveModal(false)} onSuccess={() => { if (refreshData) refreshData(); }} />}
       {showCameraModal && <CameraHubModal onClose={() => setShowCameraModal(false)} onSuccess={() => { if (refreshData) refreshData(); }} />}
    </aside>
  );
}
