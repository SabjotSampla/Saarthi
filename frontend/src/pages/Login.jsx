import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ScanEye, Lock, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Login() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      if (isSignup) {
         // Default to Public role for self-signups
         await axios.post(`http://${window.location.hostname}:8000/signup`, { username, password, role: 'Public' });
         // Auto-login after signup
         await login(username, password);
         navigate('/');
      } else {
         await login(username, password);
         navigate('/');
      }
    } catch (err) {
      console.error('Auth error:', err);
      if (err.response) {
        setError(err.response.data.detail || 'Authentication Failure');
      } else {
        setError('Network connect refused (Node Offline)');
      }
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center relative overflow-hidden text-slate-200 font-sans p-6">
        {/* Background Effects */}
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-sky-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse delay-500" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-5 pointer-events-none" />

        <div className="z-10 bg-zinc-900/60 backdrop-blur-2xl p-8 sm:p-12 rounded-[40px] border border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-md w-full animate-in fade-in zoom-in duration-500">
            <div className="flex flex-col items-center mb-10">
                <div className="p-5 bg-sky-500/10 rounded-3xl mb-6 shadow-[0_0_30px_rgba(14,165,233,0.1)]">
                    <ScanEye className="w-12 h-12 text-sky-400 animate-pulse" />
                </div>
                <h1 className="text-3xl font-black tracking-widest uppercase text-white italic">SAARTHI AI</h1>
                <p className="text-[10px] uppercase tracking-[0.5em] text-zinc-500 font-bold mt-2">Secure Command Node</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-bold uppercase tracking-widest rounded-xl">{error}</div>}
                
                <div className="space-y-2">
                    <label className="text-[10px] text-zinc-400 font-black uppercase tracking-widest ml-1">Identity Vector (Username)</label>
                    <input 
                        required 
                        value={username} 
                        onChange={e => setUsername(e.target.value)}
                        className="w-full bg-black/50 border-2 border-zinc-800 p-4 rounded-2xl text-white focus:border-sky-500 transition-colors text-sm font-mono focus:outline-none" 
                        placeholder={isSignup ? "Create username" : "admin"}
                    />
                 </div>
                <div className="space-y-2">
                    <label className="text-[10px] text-zinc-400 font-black uppercase tracking-widest ml-1">Encryption Key (Password)</label>
                    <input 
                        required 
                        type="password"
                        value={password} 
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-black/50 border-2 border-zinc-800 p-4 rounded-2xl text-white focus:border-sky-500 transition-colors text-sm font-mono focus:outline-none" 
                        placeholder="••••••••"
                    />
                </div>

                <div className="pt-2">
                   <button type="submit" className="w-full flex items-center justify-center gap-3 bg-sky-500 text-black p-4 rounded-2xl font-black uppercase tracking-widest hover:bg-sky-400 transition-all shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:scale-[1.02]">
                       {isSignup ? <><UserPlus className="w-4 h-4"/> Register Authority</> : <><Lock className="w-4 h-4" /> Initialize Access</>}
                   </button>
                   
                   <button type="button" onClick={() => setIsSignup(!isSignup)} className="w-full mt-4 text-[10px] text-zinc-500 font-bold tracking-widest uppercase hover:text-sky-400 transition-colors">
                       {isSignup ? "Return to Login" : "sign up"}
                   </button>
                </div>
            </form>
        </div>
    </div>
  );
}
