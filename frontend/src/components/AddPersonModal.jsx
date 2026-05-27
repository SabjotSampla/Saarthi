import { useState } from 'react';
import { Upload, X, ShieldAlert } from 'lucide-react';
import axios from 'axios';

export default function AddPersonModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '', age: '', gender: 'Male', last_seen_location: '',
    date_missing: '', description: '', contact_phone: '', justification: '', uid: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) return alert("Please provide visual data for the matrix.");
    if (!formData.justification) return alert("Ethical AI Rule: Justification required to index identity.");

    const data = new FormData();
    Object.keys(formData).forEach(key => data.append(key, formData[key]));
    data.append('image', selectedFile);

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.post('http://127.0.0.1:8000/add-person', data, {
         headers: { Authorization: `Bearer ${token}` }
      });
      onSuccess();
    } catch (err) {
      alert("Registration failed: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6">
       <div className="bg-zinc-950 border border-white/10 rounded-[30px] w-full max-w-2xl max-h-[90vh] shadow-[0_0_100px_rgba(0,0,0,1)] relative flex flex-col animate-in zoom-in duration-300">
           {/* Header Bar */}
           <div className="absolute top-0 left-0 w-full h-1 bg-sky-500 rounded-t-[30px]" />
           
           {/* Static Close Button */}
           <button onClick={onClose} className="absolute top-4 right-4 z-50 bg-black/50 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
              <X className="w-6 h-6" />
           </button>

           {/* Scrollable Content */}
           <div className="p-8 overflow-y-auto no-scrollbar flex-1">
               <div className="flex items-center gap-4 mb-8">
                  <ShieldAlert className="w-8 h-8 text-sky-500" />
                  <div>
                     <h2 className="text-2xl font-black uppercase tracking-widest text-white italic">Index New Target</h2>
                     <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Secure Command Registration</p>
                  </div>
               </div>

               <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Subject Name" className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-xs text-white focus:border-sky-500" />
                     <input value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} type="number" placeholder="Age" className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-xs text-white focus:border-sky-500" />
                     <input required value={formData.last_seen_location} onChange={e => setFormData({...formData, last_seen_location: e.target.value})} placeholder="Last Known Location" className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-xs text-white focus:border-sky-500" />
                     <input value={formData.contact_phone} onChange={e => setFormData({...formData, contact_phone: e.target.value})} type="tel" placeholder="Guardian Phone (For SMS)" className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-xs text-white focus:border-sky-500" />
                     <div className="sm:col-span-2 space-y-2 relative mt-4">
                        <label className="text-[10px] text-sky-400 font-black uppercase tracking-widest flex items-center gap-2"><ShieldAlert className="w-3 h-3"/> Required: Search Justification</label>
                        <textarea required value={formData.justification} onChange={e => setFormData({...formData, justification: e.target.value})} placeholder="State purpose of tracking (e.g. Missing person case #1024, verified by Inspector Singh)" className="bg-sky-500/5 border border-sky-500/20 p-4 rounded-xl text-xs text-white focus:border-sky-500 w-full h-20 resize-none font-mono" />
                     </div>
                  </div>

                  <div className="relative h-40">
                     <input type="file" accept="image/*" onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) { setSelectedFile(file); setPreviewUrl(URL.createObjectURL(file)); }
                     }} id="face-up" className="hidden" />
                     <label htmlFor="face-up" className="flex flex-col items-center justify-center h-full border-2 border-dashed border-zinc-800 rounded-2xl hover:border-sky-500 hover:bg-sky-500/5 transition-colors cursor-pointer overflow-hidden group">
                        {previewUrl ? <img src={previewUrl} className="w-full h-full object-contain p-2" /> : <><Upload className="w-8 h-8 text-zinc-600 mb-2 group-hover:text-sky-500" /><span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest group-hover:text-sky-400">Upload Visual Data</span></>}
                     </label>
                  </div>

                  {/* Sticky Submit Button to bottom of content block */}
                  <div className="pt-4 mt-8 border-t border-white/10">
                     <button disabled={loading} type="submit" className="w-full bg-sky-500 text-black py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-sky-400 shadow-[0_0_20px_rgba(14,165,233,0.3)]">{loading ? 'Indexing Matrix...' : 'Commit to Database'}</button>
                  </div>
               </form>
           </div>
       </div>
    </div>
  );
}
