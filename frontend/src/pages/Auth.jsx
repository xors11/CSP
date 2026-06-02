import { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, CheckCircle, ArrowRight, ShieldCheck, Mail, Lock, User, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const bodyData = isLogin ? { email, password } : { name, email, password };
      
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });
      
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/dashboard');
      } else {
        alert(data.message);
      }
    } catch {
      alert(`Network error: Could not reach backend at ${API_URL}. Check your internet connection or try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#030014] selection:bg-indigo-500/30 overflow-hidden">
      {/* Left Premium Branding Side */}
      <div className="hidden lg:flex w-1/2 bg-slate-950 flex-col justify-between p-16 relative overflow-hidden border-r border-white/5">
        {/* Animated Mesh Gradients */}
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-indigo-600/10 blur-[130px] rounded-full pointer-events-none animate-pulse-glow"></div>
        <div className="absolute bottom-[-25%] right-[-10%] w-[70%] h-[70%] bg-purple-600/10 blur-[130px] rounded-full pointer-events-none animate-pulse-glow" style={{ animationDelay: '2.5s' }}></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-500/20">
              <BookOpen size={28} className="text-white" />
            </div>
            <span className="text-3xl font-black tracking-tight text-white">PeerLearn</span>
          </div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="text-5xl font-black text-white leading-[1.15] mb-8">
              Unlock Your Potential. <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                Teach & Learn Together.
              </span>
            </h2>
            <p className="text-lg text-slate-400 mb-12 max-w-lg leading-relaxed font-light">
              Join a dynamic community of ambitious students mastering new skills through peer-to-peer interactive video classrooms.
            </p>
            
            <div className="space-y-5">
              <div className="flex items-center gap-3.5 text-slate-300">
                <div className="bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20">
                  <CheckCircle className="text-emerald-400" size={20} />
                </div>
                <span className="text-base font-medium">AI-Verified Peer Mentors</span>
              </div>
              <div className="flex items-center gap-3.5 text-slate-300">
                <div className="bg-indigo-500/10 p-1.5 rounded-lg border border-indigo-500/20">
                  <CheckCircle className="text-indigo-400" size={20} />
                </div>
                <span className="text-base font-medium">Real-time WebRTC Classrooms</span>
              </div>
              <div className="flex items-center gap-3.5 text-slate-300">
                <div className="bg-purple-500/10 p-1.5 rounded-lg border border-purple-500/20">
                  <CheckCircle className="text-purple-400" size={20} />
                </div>
                <span className="text-base font-medium">Earn Credits by Mentoring Others</span>
              </div>
            </div>
          </motion.div>
        </div>
        
        <div className="relative z-10 text-slate-600 text-xs font-semibold">
          © {new Date().getFullYear()} PeerLearn Systems Inc. All rights reserved.
        </div>
      </div>

      {/* Right Login/Register Form Side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="absolute top-10 right-10 w-48 h-48 bg-indigo-600/5 blur-[80px] rounded-full pointer-events-none"></div>
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-md z-10">
          
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-2 rounded-xl">
              <BookOpen size={24} className="text-white" />
            </div>
            <span className="text-2xl font-black tracking-tight text-white">PeerLearn</span>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-slate-400 text-sm sm:text-base font-light">
              {isLogin ? 'Enter your details to access your dashboard.' : 'Start your collaborative learning journey with us today.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {!isLogin && (
              <div className="relative">
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider text-slate-400">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input 
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    required 
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 text-white transition-all text-sm" 
                    placeholder="e.g. Alex Johnson" 
                  />
                </div>
              </div>
            )}
            
            <div className="relative">
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider text-slate-400">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 text-white transition-all text-sm" 
                  placeholder="student@example.com" 
                />
              </div>
            </div>

            <div className="relative">
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider text-slate-400">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 text-white transition-all text-sm" 
                  placeholder="••••••••" 
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white font-bold py-4 rounded-xl mt-4 transition-all flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> Working...</>
              ) : (
                <>
                  {isLogin ? 'Secure Log In' : 'Create Free Account'}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="text-center mt-8 text-slate-400 text-sm">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              onClick={() => {
                setIsLogin(!isLogin);
                setName('');
                setEmail('');
                setPassword('');
              }} 
              className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors ml-1 cursor-pointer"
            >
              {isLogin ? 'Sign up for free' : 'Log in here'}
            </button>
          </p>

        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
