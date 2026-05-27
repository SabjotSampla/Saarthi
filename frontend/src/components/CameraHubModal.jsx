import { useState, useEffect } from 'react';
import { X, Video, ShieldAlert, Plus, Trash2 } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function CameraHubModal({ onClose, onSuccess }) {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [formData, setFormData] = useState({ name: '', url: '', location: '' });
  const [adding, setAdding] = useState(false);

  const fetchCameras = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:8000/cameras');
      setCameras(res.data);
    } catch (err) {
      console.error("Camera fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCameras();
  }, []);

  const handleAddCamera = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.url) return;
    try {
        setAdding(true);
        const token = localStorage.getItem('token');
        await axios.post('http://127.0.0.1:8000/cameras', formData, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setFormData({ name: '', url: '', location: '' });
        fetchCameras();
        if (onSuccess) onSuccess(); // Signal dashboard to refresh feeds
    } catch (err) {
        alert("Failed to integrate sensor: " + (err.response?.data?.detail || err.message));
    } finally {
        setAdding(false);
    }
  };

  const handleDelete = async (cameraId, name) => {
    if (!window.confirm(`ETHICAL OVERRIDE: Purge sensor vector '${name}'? Matrix will lose visual coverage in this node.`)) return;
    try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://127.0.0.1:8000/cameras/${cameraId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        fetchCameras();
        if (onSuccess) onSuccess(); // Signal dashboard to refresh feeds
    } catch (err) {
        alert("Failed to purge sensor: " + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6">
       <div className="bg-zinc-950 border border-white/10 rounded-[30px] w-full max-w-4xl max-h-[90vh] shadow-[0_0_100px_rgba(0,0,0,1)] relative flex flex-col animate-in zoom-in duration-300">
           <div className="absolute top-0 left-0 w-full h-1 bg-red-500 rounded-t-[30px]" />
           
           <button onClick={onClose} className="absolute top-4 right-4 z-50 bg-black/50 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
              <X className="w-6 h-6" />
           </button>

           <div className="p-8 overflow-hidden flex flex-col h-full">
               <div className="flex items-center justify-between mb-8 shrink-0">
                   <div className="flex items-center gap-4">
                      <div className="p-3 bg-red-500/10 rounded-2xl">
                         <Video className="w-8 h-8 text-red-500" />
                      </div>
                      <div>
                         <h2 className="text-2xl font-black uppercase tracking-widest text-white italic">Sensor Matrix Control</h2>
                         <p className="text-[10px] text-red-500 uppercase tracking-widest font-bold">Live Camera Node Registry</p>
                      </div>
                   </div>
                   <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-black tracking-widest uppercase text-zinc-500">
                       Active Feeds: {cameras.length}
                   </div>
               </div>

               <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col md:flex-row gap-8 pr-2">
                   
                   {/* Left Col: Existing cameras */}
                   <div className="flex-1 space-y-4">
                       <h3 className="text-[10px] uppercase font-black tracking-widest text-zinc-500 px-2">Deployed Sensors</h3>
                       
                       {loading ? (
                          <div className="text-center p-8 text-zinc-500 text-xs font-bold uppercase tracking-widest">Scanning network...</div>
                       ) : cameras.length === 0 ? (
                          <div className="flex flex-col items-center justify-center p-8 border border-white/5 rounded-2xl bg-zinc-900/50 text-zinc-600 space-y-2">
                              <ShieldAlert className="w-8 h-8 opacity-50 mb-2" />
                              <span className="text-xs font-black uppercase tracking-widest text-center">No External Sensors Linked<br/><span className="text-[9px] font-normal tracking-wide">Matrix relies solely on Primary Terminal.</span></span>
                          </div>
                       ) : (
                          <div className="space-y-3">
                             {cameras.map(cam => (
                                <div key={cam.id} className="bg-zinc-900 border border-white/5 rounded-2xl p-4 flex items-center justify-between group">
                                    <div className="flex items-center gap-4 truncate">
                                        <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse shrink-0"/>
                                        <div className="truncate">
                                           <h4 className="text-xs font-black uppercase tracking-widest text-white truncate">{cam.name}</h4>
                                           <p className="text-[9px] font-mono text-zinc-500 truncate mt-1">LKA: {cam.location}</p>
                                           <p className="text-[9px] font-mono text-zinc-600 truncate mt-1">{cam.url}</p>
                                        </div>
                                    </div>
                                    {user?.role === 'Admin' && (
                                        <button onClick={() => handleDelete(cam.id, cam.name)} className="p-2 text-zinc-600 hover:text-red-500 transition-colors shrink-0">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                             ))}
                          </div>
                       )}
                   </div>

                   {/* Right Col: Add Camera Form */}
                   {user?.role === 'Admin' && (
                       <div className="md:w-80 shrink-0">
                           <form onSubmit={handleAddCamera} className="bg-zinc-900/80 border border-red-500/20 rounded-3xl p-6 space-y-4 shadow-[0_0_30px_rgba(239,68,68,0.05)] sticky top-0">
                               <h3 className="text-[10px] uppercase font-black tracking-widest text-red-500 flex items-center gap-2 mb-2"><Plus className="w-3 h-3"/> Integrate New Node</h3>
                               
                               <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Sensor Name (e.g. GATE 3)" className="w-full bg-black/50 border border-zinc-800 p-3 rounded-xl text-xs text-white focus:border-red-500 transition-colors outline-none font-mono" />
                               <input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="Location (Optional)" className="w-full bg-black/50 border border-zinc-800 p-3 rounded-xl text-xs text-white focus:border-red-500 transition-colors outline-none font-mono" />
                               <div className="space-y-1">
                                  <textarea required value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} placeholder="Stream URL (e.g. http://192.168.1.5:8080/video)" className="w-full bg-black/50 border border-zinc-800 p-3 rounded-xl text-[10px] text-white focus:border-red-500 transition-colors outline-none font-mono resize-none h-16" />
                                  <p className="text-[8px] text-zinc-500 uppercase tracking-widest px-1">Must be an MJPEG stream or static snapshot URL accessible by the browser.</p>
                               </div>

                               <button disabled={adding} type="submit" className="w-full bg-red-500 text-black py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all">
                                  {adding ? 'Connecting...' : 'Establish Network Link'}
                               </button>
                           </form>
                       </div>
                   )}
                   
               </div>
           </div>
       </div>
    </div>
  );
}
