import { useState, useEffect } from 'react';
import { X, Search, UserCheck, ShieldAlert, Trash2 } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function IdentityArchiveModal({ onClose, onSuccess }) {
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth(); // Needed to check role

  const fetchArchive = async () => {
    try {
      const res = await axios.get(`http://${window.location.hostname}:8000/persons`);
      setPersons(res.data);
    } catch (err) {
      console.error("Archive fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchive();
  }, []);

  const handleDelete = async (personId, name) => {
    if (!window.confirm(`ETHICAL OVERRIDE: Are you sure you want to permanently purge the neural prints and identity data for '${name}'? This action is irreversible and will be logged.`)) return;
    try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://${window.location.hostname}:8000/persons/${personId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        fetchArchive(); // Refresh list
        if (onSuccess) onSuccess(); // Notify Dashboard to refresh persons/alerts!
    } catch (err) {
        alert("Failed to purge record: " + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6">
       <div className="bg-zinc-950 border border-white/10 rounded-[30px] w-full max-w-4xl max-h-[90vh] shadow-[0_0_100px_rgba(0,0,0,1)] relative flex flex-col animate-in zoom-in duration-300">
           {/* Header Bar */}
           <div className="absolute top-0 left-0 w-full h-1 bg-zinc-700 rounded-t-[30px]" />
           
           <button onClick={onClose} className="absolute top-4 right-4 z-50 bg-black/50 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
              <X className="w-6 h-6" />
           </button>

           <div className="p-8 overflow-hidden flex flex-col h-full">
               <div className="flex items-center justify-between mb-8 shrink-0">
                   <div className="flex items-center gap-4">
                      <Search className="w-8 h-8 text-zinc-500" />
                      <div>
                         <h2 className="text-2xl font-black uppercase tracking-widest text-white italic">Identity Archive</h2>
                         <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Registered Neural Targets</p>
                      </div>
                   </div>
                   <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-black tracking-widest uppercase text-zinc-500">
                       Total Records: {persons.length}
                   </div>
               </div>

               <div className="flex-1 overflow-y-auto no-scrollbar pr-2">
                   {loading ? (
                      <div className="flex items-center justify-center h-full text-zinc-500 text-xs font-bold uppercase tracking-widest">Accessing Secure Records...</div>
                   ) : persons.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-zinc-600 space-y-2">
                          <ShieldAlert className="w-12 h-12 mb-2 opacity-50" />
                          <span className="text-xs font-black uppercase tracking-widest">Repository Empty</span>
                      </div>
                   ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
                         {persons.map(person => (
                            <div key={person.id} className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden hover:border-sky-500/50 transition-colors group relative">
                                <div className="h-32 bg-black relative">
                                    <img src={`http://${window.location.hostname}:8000/${(person.image_paths || '').split(',')[0].replace(/\\/g, '/')}`} className="w-full h-full object-cover grayscale opacity-70 group-hover:grayscale-0 transition-all duration-500" alt="Profile" onError={(e) => e.target.src="https://via.placeholder.com/400"} />
                                    <div className={`absolute top-2 right-2 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full shadow-[0_0_10px_currentColor] ${person.status === 'Found' ? 'bg-green-500 text-white shadow-green-500' : 'bg-sky-500 text-white shadow-sky-500'}`}>
                                        {person.status}
                                    </div>
                                </div>
                                <div className="p-4 relative">
                                    <h4 className="text-sm font-black italic tracking-widest uppercase text-white truncate pr-8">{person.name}</h4>
                                    
                                    {/* Security Delete Button */}
                                    {user?.role === 'Admin' && (
                                        <button onClick={() => handleDelete(person.id, person.name)} className="absolute top-4 right-4 text-zinc-600 hover:text-red-500 transition-colors" title="Purge Record">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}

                                    <div className="mt-2 space-y-1">
                                        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider truncate">UID: {person.uid || 'N/A'}</p>
                                        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider truncate">Age: {person.age || 'Unknown'}</p>
                                        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider truncate">LKA: {person.last_seen_location}</p>
                                        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider truncate">Guardian: {person.contact_phone || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                         ))}
                      </div>
                   )}
               </div>
           </div>
       </div>
    </div>
  );
}
