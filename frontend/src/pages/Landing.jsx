import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { BookOpen, ShieldCheck, Video, Award, ArrowRight, Sparkles, Terminal, Users, Code } from 'lucide-react';

const Landing = () => {
  return (
    <div className="relative min-h-screen overflow-hidden selection:bg-indigo-500/40">
      {/* Background Decorative Blurs */}
      <div className="absolute top-[-10%] left-[-5%] w-[60vw] h-[60vw] max-w-[800px] bg-indigo-600/10 blur-[160px] rounded-full pointer-events-none animate-pulse-glow"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[50vw] h-[50vw] max-w-[700px] bg-purple-600/10 blur-[160px] rounded-full pointer-events-none animate-pulse-glow" style={{ animationDelay: '2s' }}></div>

      <div className="max-w-7xl mx-auto px-6 py-6 relative z-10">
        {/* Navigation Bar */}
        <header>
          <nav className="flex justify-between items-center glass-panel px-6 py-4 rounded-full mt-4 border-white/10 bg-slate-900/60 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-2 rounded-xl shadow-lg shadow-indigo-500/25">
                <BookOpen size={24} className="text-white" />
              </div>
              <span className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">
                PeerLearn
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/auth" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors px-4 py-2 hidden sm:block">
                Log In
              </Link>
              <Link to="/auth" className="btn-primary rounded-full px-6 py-2.5 text-sm shadow-[0_0_20px_rgba(79,70,229,0.3)]">
                Start Learning <ArrowRight size={16} />
              </Link>
            </div>
          </nav>
        </header>

        {/* Main Hero Section */}
        <main className="text-center pt-20 md:pt-32">
          <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.8, ease: "easeOut" }} 
            className="mb-24 relative"
          >
            {/* Announcement Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-medium text-xs sm:text-sm mb-8 animate-float">
              <Sparkles size={14} className="text-indigo-400 animate-pulse" /> The Next Generation of Peer-to-Peer Education
            </div>
            
            {/* Title */}
            <h1 className="text-5xl sm:text-7xl md:text-8xl font-black mb-6 leading-[1.1] tracking-tight">
              Master New Skills, <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                Powered by Peers
              </span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-lg sm:text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed font-light">
              A premium, interactive ecosystem where ambitious students teach and learn from each other through AI-verified, real-time video classrooms.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-20">
              <Link to="/auth" className="btn-primary text-base px-8 py-4 rounded-full w-full sm:w-auto shadow-[0_0_30px_rgba(79,70,229,0.4)]">
                Find Your Mentor
              </Link>
              <Link to="/auth" className="btn-secondary text-base px-8 py-4 rounded-full w-full sm:w-auto">
                Become a Teacher
              </Link>
            </div>

            {/* Interactive Desktop Platform Preview */}
            <div className="relative mx-auto max-w-5xl rounded-2xl border border-white/10 bg-slate-950/80 shadow-2xl overflow-hidden p-3 md:p-4 aspect-video sm:aspect-[16/9]">
              {/* Header mockup toolbar */}
              <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-3 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                </div>
                <div className="bg-slate-900 border border-white/5 rounded px-4 py-0.5 text-[10px] sm:text-xs">
                  classroom/room-402 (WebRTC Connection Active)
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Live
                </div>
              </div>

              {/* Workspace contents mockup */}
              <div className="grid grid-cols-3 gap-3 h-[85%] text-left">
                {/* Simulated coding space */}
                <div className="col-span-2 bg-[#050014]/50 border border-white/5 rounded-xl p-3 sm:p-4 flex flex-col justify-between font-mono text-[9px] sm:text-[11px] md:text-xs text-indigo-200">
                  <div className="space-y-1 overflow-hidden">
                    <div className="flex items-center gap-2 text-slate-500 border-b border-white/5 pb-2 mb-2">
                      <Terminal size={12} /> <span className="font-sans">dsa_challenge.py</span>
                    </div>
                    <div><span className="text-purple-400">def</span> <span className="text-blue-400">verify_bst</span>(root, min_val=float(<span className="text-emerald-400">'-inf'</span>), max_val=float(<span className="text-emerald-400">'inf'</span>)):</div>
                    <div className="pl-4 text-slate-500"># Check base case: empty node is BST</div>
                    <div className="pl-4"><span className="text-purple-400">if not</span> root:</div>
                    <div className="pl-8"><span className="text-purple-400">return True</span></div>
                    <div className="pl-4 text-slate-500"># Node value must respect limits</div>
                    <div className="pl-4"><span className="text-purple-400">if not</span> (min_val &lt; root.val &lt; max_val):</div>
                    <div className="pl-8"><span className="text-purple-400">return False</span></div>
                    <div className="pl-4 text-slate-500"># Recursively check subtrees</div>
                    <div className="pl-4"><span className="text-purple-400">return</span> verify_bst(root.left, min_val, root.val) \</div>
                    <div className="pl-12">and verify_bst(root.right, root.val, max_val)</div>
                  </div>
                  <div className="border-t border-white/5 pt-2 mt-2 flex items-center justify-between font-sans text-slate-400">
                    <span className="flex items-center gap-1.5"><Code size={12} /> Dynamic Code Editor</span>
                    <span className="text-emerald-400 flex items-center gap-1"><ShieldCheck size={12} /> Verified by AI</span>
                  </div>
                </div>

                {/* Simulated video cards */}
                <div className="flex flex-col gap-2">
                  <div className="flex-1 bg-slate-900/60 rounded-xl relative overflow-hidden border border-white/5 flex items-center justify-center">
                    <div className="absolute top-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[8px] sm:text-[10px] text-white">
                      Alex (Mentor)
                    </div>
                    <Users size={20} className="text-indigo-400/40 animate-pulse" />
                  </div>
                  <div className="flex-1 bg-slate-900/60 rounded-xl relative overflow-hidden border border-white/5 flex items-center justify-center">
                    <div className="absolute top-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[8px] sm:text-[10px] text-white">
                      You (Student)
                    </div>
                    <Users size={20} className="text-purple-400/40 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Feature Grid Section */}
          <div className="grid md:grid-cols-3 gap-6 text-left relative z-20 mt-12">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }} 
              transition={{ delay: 0.1 }} 
              className="glass-panel p-8 group hover:-translate-y-2 hover:border-purple-500/30 transition-all duration-300"
            >
              <div className="bg-purple-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border border-purple-500/20 group-hover:scale-110 transition-transform">
                <ShieldCheck size={28} className="text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">AI-Verified Expertise</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                Every peer mentor goes through custom, AI-generated coding and logic evaluations. Rest assured you learn from certified peer mentors.
              </p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }} 
              transition={{ delay: 0.2 }} 
              className="glass-panel p-8 group hover:-translate-y-2 hover:border-indigo-500/30 transition-all duration-300"
            >
              <div className="bg-indigo-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/20 group-hover:scale-110 transition-transform">
                <Video size={28} className="text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Live WebRTC Classrooms</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                Connect instantly with peer mentors through built-in video streaming. Integrated features ensure full session integrity.
              </p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }} 
              transition={{ delay: 0.3 }} 
              className="glass-panel p-8 group hover:-translate-y-2 hover:border-pink-500/30 transition-all duration-300"
            >
              <div className="bg-pink-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border border-pink-500/20 group-hover:scale-110 transition-transform">
                <Award size={28} className="text-pink-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Collaborative Credit Model</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                Earn credits by sharing your verified expertise. Spend credits to join advanced classrooms. Learn, teach, and repeat.
              </p>
            </motion.div>
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-32 border-t border-white/5 py-8 text-center text-slate-500 text-xs sm:text-sm">
          © {new Date().getFullYear()} PeerLearn Systems Inc. Made with pride for modern students.
        </footer>
      </div>
    </div>
  );
};

export default Landing;
