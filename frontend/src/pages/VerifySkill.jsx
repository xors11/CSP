import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, ArrowLeft, Loader2, Code, CheckCircle, 
  AlertTriangle, Terminal, Brain, Sparkles, Check, HelpCircle,
  FileText, Edit3, Clock
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const VerifySkill = () => {
  const [searchParams] = useSearchParams();
  const subjectsQuery = searchParams.get('subjects') || 'General';
  const subjectsArray = subjectsQuery.split(',');
  const subjectList = subjectsArray.join(' and ');
  
  const [testData, setTestData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [status, setStatus] = useState(null);
  const [evaluationData, setEvaluationData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setLoadingStep(prev => (prev < 8 ? prev + 1 : prev));
    }, 1500);
    return () => clearInterval(interval);
  }, [isLoading]);

  // Ref to keep track of answers for the auto-submit interval
  const answersRef = useRef({});
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/verify/generate?subjects=${encodeURIComponent(subjectsQuery)}&count=10&t=${Date.now()}`, {
          cache: 'no-store'
        });
        const data = await response.json();
        setTestData(data);
        
        // Initialize blank answers
        const initialAnswers = {};
        if (data.questions) {
          data.questions.forEach(q => {
            initialAnswers[q.id] = '';
          });
        }
        setAnswers(initialAnswers);
        
        // Set countdown timer
        if (data.total_time_seconds) {
          setTimeLeft(data.total_time_seconds);
        } else {
          setTimeLeft(600); // 10 minutes fallback
        }
      } catch (e) {
        console.error('Error fetching test sheet:', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTest();
  }, [subjectsQuery]);

  // Handle countdown logic
  useEffect(() => {
    if (isLoading || evaluationData || timeLeft === null) return;
    
    if (timeLeft <= 0) {
      // Auto-submit immediately
      setStatus({ success: false, message: "Time has expired! Automatically submitting your answers..." });
      
      const autoSubmit = async () => {
        setIsSubmitting(true);
        try {
          const user = JSON.parse(localStorage.getItem('user'));
          const response = await fetch('http://localhost:5000/api/verify/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              userId: user?.id || user?._id || 'mock', 
              skills: subjectsArray, 
              questions: testData?.questions || [],
              answers: answersRef.current
            })
          });
          const data = await response.json();
          
          setStatus({ success: data.verified, message: data.evaluationResult?.message || 'Time expired. Assessment evaluated!' });
          setEvaluationData(data.evaluationResult);
          
          if (data.verified && data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
          }
        } catch (err) {
          console.error(err);
          setStatus({ success: false, message: 'Server evaluation error during auto-submit.' });
        } finally {
          setIsSubmitting(false);
        }
      };
      
      autoSubmit();
      return;
    }
    
    const timerId = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    
    return () => clearInterval(timerId);
  }, [timeLeft, isLoading, evaluationData, testData, subjectsArray]);

  const handleAnswerChange = (qId, value) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    
    // Check if everything is attempted
    const unattempted = testData?.questions?.filter(q => !answers[q.id] || String(answers[q.id]).trim() === '');
    if (unattempted && unattempted.length > 0) {
      setStatus({ success: false, message: `Please answer all questions before submitting. (${unattempted.length} remaining)` });
      return;
    }

    setIsSubmitting(true);
    setStatus(null);
    
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const response = await fetch('http://localhost:5000/api/verify/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user?.id || user?._id || 'mock', 
          skills: subjectsArray, 
          questions: testData.questions,
          answers: answers
        })
      });
      const data = await response.json();
      
      setStatus({ success: data.verified, message: data.evaluationResult?.message || 'Evaluation complete!' });
      setEvaluationData(data.evaluationResult);
      
      if (data.verified && data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
    } catch (err) {
      console.error(err);
      setStatus({ success: false, message: 'Server evaluation error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturnToDashboard = () => {
    navigate('/dashboard');
  };

  // Helper to format remaining time
  const formatTime = (seconds) => {
    if (seconds === null || seconds <= 0) return "00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    const formattedM = String(m).padStart(2, '0');
    const formattedS = String(s).padStart(2, '0');
    
    if (h > 0) {
      return `${h}:${formattedM}:${formattedS}`;
    }
    return `${formattedM}:${formattedS}`;
  };

  // Progress calculations
  const totalQuestions = testData?.questions?.length || 0;
  const answeredCount = Object.keys(answers).filter(k => String(answers[k]).trim() !== '').length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#030014] p-6 text-center">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.04),transparent_60%)] pointer-events-none"></div>
        <div className="relative mb-6">
          <Loader2 className="animate-spin text-emerald-400" size={56} />
          <Brain className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-300" size={20} />
        </div>
        <h2 className="text-2xl font-black text-white mb-2 tracking-tight">AI is setting up the environment...</h2>
        <p className="text-slate-400 text-sm max-w-sm mb-6 font-light leading-relaxed">
          Assembling FAANG-grade dynamic testing parameters for <span className="text-emerald-400 font-semibold">{subjectList}</span>.
        </p>
        
        <div className="w-full max-w-md bg-[#020012]/80 backdrop-blur-md border border-white/5 p-5 rounded-2xl text-left font-mono text-[11px] text-slate-400 space-y-2 shadow-2xl relative overflow-hidden">
          <div className="flex gap-1.5 mb-2 border-b border-white/5 pb-2">
            <span className="w-2 h-2 rounded-full bg-rose-500/60"></span>
            <span className="w-2 h-2 rounded-full bg-amber-500/60"></span>
            <span className="w-2 h-2 rounded-full bg-emerald-500/60"></span>
            <span className="text-[9px] text-slate-500 ml-auto uppercase font-bold tracking-wider">AI Sandbox Setup</span>
          </div>

          <p className={loadingStep >= 0 ? "text-emerald-400 font-medium" : "text-slate-600"}>
            {loadingStep > 0 ? "✓" : "⚡"} Contacting Groq dynamic AI agent cluster...
          </p>
          
          {loadingStep >= 1 && (
            <p className={loadingStep >= 1 ? (loadingStep > 1 ? "text-emerald-400 font-medium" : "text-indigo-400 animate-pulse") : "text-slate-600"}>
              {loadingStep > 1 ? "✓" : "⚡"} Secure connection established with Groq gateway.
            </p>
          )}

          {loadingStep >= 2 && (
            <p className={loadingStep >= 2 ? (loadingStep > 2 ? "text-emerald-400 font-medium" : "text-indigo-400 animate-pulse") : "text-slate-600"}>
              {loadingStep > 2 ? "✓" : "⚡"} Customizing questions for {subjectsArray.length} fields: {subjectList}...
            </p>
          )}

          {loadingStep >= 3 && (
            <p className={loadingStep >= 3 ? (loadingStep > 3 ? "text-emerald-400 font-medium" : "text-indigo-400 animate-pulse") : "text-slate-600"}>
              {loadingStep > 3 ? "✓" : "⚡"} Engineering rigorous constraints & edge cases...
            </p>
          )}

          {loadingStep >= 4 && (
            <p className={loadingStep >= 4 ? (loadingStep > 4 ? "text-emerald-400 font-medium" : "text-indigo-400 animate-pulse") : "text-slate-600"}>
              {loadingStep > 4 ? "✓" : "⚡"} Calculating sums & allocating question timers...
            </p>
          )}

          {loadingStep >= 5 && (
            <p className={loadingStep >= 5 ? (loadingStep > 5 ? "text-emerald-400 font-medium" : "text-indigo-400 animate-pulse") : "text-slate-600"}>
              {loadingStep > 5 ? "✓" : "⚡"} AI is setting up the grading environment...
            </p>
          )}

          {loadingStep >= 6 && (
            <p className={loadingStep >= 6 ? (loadingStep > 6 ? "text-emerald-400 font-medium" : "text-indigo-400 animate-pulse") : "text-slate-600"}>
              {loadingStep > 6 ? "✓" : "⚡"} Compiling optimal sandbox solution schemas...
            </p>
          )}

          {loadingStep >= 7 && (
            <p className={loadingStep >= 7 ? (loadingStep > 7 ? "text-emerald-400 font-medium" : "text-indigo-400 animate-pulse") : "text-slate-600"}>
              {loadingStep > 7 ? "✓" : "⚡"} Finalizing system verification parameters...
            </p>
          )}

          {loadingStep >= 8 && (
            <p className="text-emerald-400 font-bold animate-pulse">
              ⚡ Sandbox prepared! Initializing secure exam session...
            </p>
          )}
          
          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[9px] text-slate-500 font-sans mt-3">
            <span>Server response status: 200 OK</span>
            <span className="animate-pulse">Loading step {loadingStep + 1}/9</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-8 md:p-12 relative overflow-y-auto bg-gradient-to-b from-[#030014] to-[#0a0028]/40 selection:bg-indigo-500/30">
      
      {/* Abort button */}
      <button 
        onClick={() => navigate('/dashboard')} 
        className="fixed top-6 left-6 z-50 text-xs font-bold text-slate-400 bg-slate-900/80 backdrop-blur-md px-4 py-2.5 rounded-full flex items-center gap-2 hover:text-white border border-white/5 transition-colors cursor-pointer"
      >
        <ArrowLeft size={14} /> Abort Assessment
      </button>

      <div className="max-w-4xl mx-auto pt-12 pb-24">
        
        {/* Header display */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex bg-gradient-to-r from-purple-500 to-indigo-600 p-4.5 rounded-3xl mb-6 shadow-[0_0_40px_rgba(79,70,229,0.3)]">
            <Brain size={48} className="text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
            AI Accreditation Center
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto font-light leading-relaxed">
            ACC-ID: <span className="text-indigo-300 font-semibold">{subjectList}</span>.
            Attempt all {totalQuestions} custom AI-generated subject matters to earn your Accredited status.
          </p>
        </motion.div>

        {evaluationData ? (
          /* Results View Dashboard */
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
            
            {/* Main Score Banner */}
            <div className={`p-8 rounded-3xl border relative overflow-hidden text-center bg-slate-950/60 backdrop-blur-md
              ${evaluationData.eligibilityStatus === 'Verified Mentor' 
                ? 'border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.05)]' 
                : evaluationData.eligibilityStatus === 'Trial Mentor' 
                  ? 'border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.05)]' 
                  : 'border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.05)]'}`}>
              
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2 block">AI Grading Outcome</span>
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
                {evaluationData.eligibilityStatus === 'Verified Mentor' ? '🎉 Accreditation Granted!' : evaluationData.eligibilityStatus === 'Trial Mentor' ? '⚠️ Provisional Status' : '❌ Reattempt Required'}
              </h2>
              
              {/* Score visualizer */}
              <div className="inline-flex flex-col items-center justify-center w-36 h-36 rounded-full bg-slate-900 border border-white/5 shadow-inner mb-6 relative">
                <span className="text-4xl font-black text-white">{evaluationData.finalScore}%</span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mt-1">Final Score</span>
              </div>
              
              <p className="text-slate-300 text-sm max-w-md mx-auto font-light leading-relaxed">
                {evaluationData.message}
              </p>
            </div>

            {/* Analysis Details */}
            <div className="grid md:grid-cols-2 gap-6">
              
              {/* Skill Vectors */}
              <div className="glass-panel p-6 bg-slate-900/30">
                <h3 className="text-lg font-bold text-white mb-5 border-b border-white/5 pb-3 flex items-center gap-2">
                  <Sparkles size={16} className="text-indigo-400" /> Skill Vector Breakdown
                </h3>
                
                <div className="space-y-4">
                  {[
                    { label: 'Subject Knowledge', score: evaluationData.metrics.subjectKnowledgeScore, color: 'bg-indigo-500' },
                    { label: 'Problem Solving', score: evaluationData.metrics.problemSolvingScore, color: 'bg-purple-500' },
                    { label: 'Logical Thinking', score: evaluationData.metrics.logicalThinkingScore, color: 'bg-pink-500' },
                    { label: 'Communication Clarity', score: evaluationData.metrics.communicationClarityScore, color: 'bg-sky-500' },
                    { label: 'Teaching Capability', score: evaluationData.metrics.teachingCapabilityScore, color: 'bg-emerald-500' }
                  ].map((m, i) => (
                    <div key={i} className="text-xs">
                      <div className="flex justify-between font-semibold mb-1.5 text-slate-300">
                        <span>{m.label}</span>
                        <span className="text-white">{m.score}%</span>
                      </div>
                      <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-white/5">
                        <motion.div 
                          initial={{ width: 0 }} 
                          animate={{ width: `${m.score}%` }} 
                          transition={{ duration: 1, delay: i * 0.1 }}
                          className={`${m.color} h-full rounded-full`}
                        ></motion.div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Code performance and understanding summary */}
              <div className="glass-panel p-6 bg-slate-900/30 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white mb-5 border-b border-white/5 pb-3 flex items-center gap-2">
                    <Terminal size={16} className="text-purple-400" /> Code Performance Report
                  </h3>
                  <div className="space-y-4 text-xs font-light text-slate-300 leading-relaxed">
                    <div>
                      <span className="font-bold text-white uppercase tracking-wider text-[9px] block mb-1">Algorithmic Correctness</span>
                      <p>{evaluationData.codingAnalysis.correctness}</p>
                    </div>
                    <div>
                      <span className="font-bold text-white uppercase tracking-wider text-[9px] block mb-1">Architecture & Styling</span>
                      <p>{evaluationData.codingAnalysis.codeQuality}</p>
                    </div>
                    <div>
                      <span className="font-bold text-white uppercase tracking-wider text-[9px] block mb-1">Logic Pedagogy</span>
                      <p>{evaluationData.explanationAnalysis.clarity}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Review panel */}
            <div className="glass-panel p-6 border-indigo-500/10 bg-slate-900/20">
              <h3 className="text-lg font-bold text-white mb-5 border-b border-white/5 pb-3">AI Diagnostic Summary</h3>
              <div className="grid md:grid-cols-2 gap-6 text-xs sm:text-sm">
                <div>
                  <h4 className="font-bold text-emerald-400 mb-3 flex items-center gap-1.5">
                    <Check size={16} /> Strengths Demonstrated
                  </h4>
                  <ul className="space-y-2 text-slate-400 font-light list-inside list-disc pl-2">
                    {evaluationData.strengthAnalysis?.length > 0 ? (
                      evaluationData.strengthAnalysis.map((s, i) => <li key={i} className="leading-snug">{s}</li>)
                    ) : (
                      <li>Consistent conceptual understanding of topics.</li>
                    )}
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-rose-400 mb-3 flex items-center gap-1.5">
                    <AlertTriangle size={16} /> Recommended Focus Areas
                  </h4>
                  <ul className="space-y-2 text-slate-400 font-light list-inside list-disc pl-2">
                    {evaluationData.weaknessAnalysis?.map((w, i) => (
                      <li key={i} className="leading-snug">{w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                type="button"
                onClick={handleReturnToDashboard} 
                className="flex-1 btn-secondary py-4 text-base font-bold rounded-2xl cursor-pointer font-sans"
              >
                Return to Dashboard
              </button>
              {evaluationData.finalScore < 80 && (
                <button 
                  type="button"
                  onClick={() => window.location.reload()}
                  className="flex-1 btn-primary py-4 text-base font-bold rounded-2xl cursor-pointer bg-gradient-to-r from-purple-500 to-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.3)] font-sans text-white"
                >
                  Reattempt Assessment
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          /* Active Test Sheet Form */
          <form onSubmit={handleVerify} className="space-y-12">
            
            {/* Header progress & timer tracker */}
            <div className="sticky top-6 z-30 glass-panel bg-slate-950/85 p-4 border-white/10 flex items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <Terminal size={18} className="text-indigo-400" />
                <span className="text-xs sm:text-sm font-bold text-white font-mono">sheet_v2.sh</span>
              </div>
              
              {/* Dynamic Countdown Timer */}
              {timeLeft !== null && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border font-mono text-xs font-bold transition-all duration-300
                  ${timeLeft > 300 ? 'text-emerald-400 border-emerald-500/25 bg-emerald-500/5' : 
                    timeLeft > 60 ? 'text-amber-400 border-amber-500/25 bg-amber-500/5' : 
                    'text-rose-500 border-rose-500/40 bg-rose-500/10 animate-pulse'}`}>
                  <Clock size={14} />
                  <span>Time Left: {formatTime(timeLeft)}</span>
                </div>
              )}

              <div className="flex items-center gap-3 flex-1 max-w-xs">
                <div className="w-full bg-slate-900 h-2 rounded-full border border-white/5 overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
                <span className="text-[10px] font-extrabold text-indigo-400 whitespace-nowrap font-mono">{progressPercent}% Done</span>
              </div>
            </div>

            {/* Questions Grid */}
            <div className="space-y-8">
              {testData?.questions?.map((q, idx) => (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="glass-panel p-6 bg-slate-900/10 border-white/5 hover:border-white/10 transition-colors"
                >
                  {/* Badge Row */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="text-[10px] font-extrabold tracking-widest uppercase font-mono px-2.5 py-1 rounded-full bg-slate-950 text-indigo-400 border border-indigo-500/10">
                      Question {idx + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      {q.time_limit_seconds && (
                        <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-white/5 font-mono flex items-center gap-1">
                          <Clock size={10} /> {q.time_limit_seconds >= 60 ? `${q.time_limit_seconds / 60}m` : `${q.time_limit_seconds}s`}
                        </span>
                      )}
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded font-mono
                        ${q.difficulty === 'easy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                          q.difficulty === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                          'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                        {q.difficulty}
                      </span>
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
                        {q.type}
                      </span>
                    </div>
                  </div>

                  {/* Clinical Case Block (Case-Based) */}
                  {q.type === 'Case-Based' && q.case && (
                    <div className="mb-5 p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-xs sm:text-sm text-slate-300 leading-relaxed">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded bg-rose-500/10">🏥 Clinical Scenario</span>
                      </div>
                      <p className="font-light leading-relaxed text-slate-200">{q.case}</p>
                    </div>
                  )}

                  {/* Image / Diagram Description Block (Image-Based) */}
                  {q.type === 'Image-Based' && q.image_description && (
                    <div className="mb-5 p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 text-xs sm:text-sm text-slate-300 leading-relaxed">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded bg-cyan-500/10">🔬 Image / Diagram Finding</span>
                      </div>
                      <p className="font-light leading-relaxed text-slate-200 border-l-2 border-cyan-500/30 pl-3 italic">{q.image_description}</p>
                    </div>
                  )}

                  {/* Question Text */}
                  <h3 className="text-base font-semibold leading-relaxed text-slate-100 mb-6">
                    {q.question}
                  </h3>

                  {/* Reference Badge (medical questions) */}
                  {q.reference && (
                    <div className="mb-4 flex items-center gap-1.5">
                      <span className="text-[9px] uppercase tracking-wider text-amber-400 font-bold">📚 Ref:</span>
                      <span className="text-[10px] text-amber-300/80 font-light italic">{q.reference}</span>
                    </div>
                  )}

                  {/* Type 1: MCQ / Case-Based / Image-Based Options */}
                  {(q.type === 'MCQ' || q.type === 'Case-Based' || q.type === 'Image-Based') && q.options && (
                    <div className="grid sm:grid-cols-2 gap-3.5">
                      {q.options.map((opt, optIdx) => {
                        const isSelected = answers[q.id] === opt;
                        return (
                          <div 
                            key={optIdx}
                            onClick={() => handleAnswerChange(q.id, opt)}
                            className={`p-4 rounded-xl border text-xs sm:text-sm cursor-pointer transition-all duration-200 font-medium flex justify-between items-center
                              ${isSelected 
                                ? 'bg-indigo-600/25 border-indigo-500 text-white shadow-md shadow-indigo-500/5' 
                                : 'bg-slate-950/40 border-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200'}`}
                          >
                            <span>{opt}</span>
                            <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0
                              ${isSelected ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-slate-700 bg-transparent'}`}>
                              {isSelected && <Check size={10} />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Type 2: Coding Challenges */}
                  {q.type === 'Coding' && (
                    <div className="space-y-4">
                      {/* Specs */}
                      <div className="grid sm:grid-cols-2 gap-4 text-xs font-mono text-slate-400 bg-slate-950/40 p-4 rounded-xl border border-white/5">
                        <div>
                          <span className="text-[9px] uppercase tracking-wider text-indigo-400 font-bold block mb-1">Expected Input format</span>
                          <p>{q.input_format || 'Standard Input'}</p>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase tracking-wider text-indigo-400 font-bold block mb-1">Expected Output format</span>
                          <p>{q.output_format || 'Standard Output'}</p>
                        </div>

                        {/* Constraints */}
                        {q.constraints && (
                          <div className="sm:col-span-2 pt-2 border-t border-white/5">
                            <span className="text-[9px] uppercase tracking-wider text-amber-400 font-bold block mb-1">Constraints</span>
                            <p className="text-slate-300 font-light leading-relaxed">{typeof q.constraints === 'object' && q.constraints !== null ? JSON.stringify(q.constraints) : String(q.constraints ?? '')}</p>
                          </div>
                        )}

                        {/* Expected Complexity */}
                        {q.expected_complexity && (
                          <div className="sm:col-span-2 pt-2 border-t border-white/5 flex gap-6">
                            <div className="flex-1">
                              <span className="text-[9px] uppercase tracking-wider text-teal-400 font-bold block mb-0.5 font-sans">Time Complexity</span>
                              <p className="text-slate-300">{typeof q.expected_complexity.time === 'object' && q.expected_complexity.time !== null ? JSON.stringify(q.expected_complexity.time) : String(q.expected_complexity.time || 'N/A')}</p>
                            </div>
                            <div className="flex-1">
                              <span className="text-[9px] uppercase tracking-wider text-teal-400 font-bold block mb-0.5 font-sans">Space Complexity</span>
                              <p className="text-slate-300">{typeof q.expected_complexity.space === 'object' && q.expected_complexity.space !== null ? JSON.stringify(q.expected_complexity.space) : String(q.expected_complexity.space || 'N/A')}</p>
                            </div>
                          </div>
                        )}

                        {/* Edge Cases */}
                        {q.edge_cases && q.edge_cases.length > 0 && (
                          <div className="sm:col-span-2 pt-2 border-t border-white/5">
                            <span className="text-[9px] uppercase tracking-wider text-rose-400 font-bold block mb-1">Edge Cases to Handle</span>
                            <ul className="list-disc list-inside space-y-0.5 text-slate-300 font-light pl-1">
                              {q.edge_cases.map((ec, ecIdx) => (
                                <li key={ecIdx} className="leading-snug">
                                  {typeof ec === 'object' && ec !== null ? JSON.stringify(ec) : String(ec)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Example case */}
                        {q.example && (
                          <div className="sm:col-span-2 pt-2 border-t border-white/5">
                            <span className="text-[9px] uppercase tracking-wider text-purple-400 font-bold block mb-1">Example test case</span>
                            <div className="grid sm:grid-cols-2 gap-2 text-[11px] leading-relaxed bg-[#030014] p-3 rounded-lg border border-white/5 text-left">
                              <p><strong className="text-slate-500">Input:</strong> {typeof q.example.input === 'object' && q.example.input !== null ? JSON.stringify(q.example.input) : String(q.example.input)}</p>
                              <p><strong className="text-slate-500">Output:</strong> {typeof q.example.output === 'object' && q.example.output !== null ? JSON.stringify(q.example.output) : String(q.example.output)}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Code Editor Frame */}
                      <div className="relative rounded-xl overflow-hidden border border-white/5 bg-[#030014]">
                        <div className="flex justify-between items-center bg-[#07051a] px-4 py-2 text-[10px] text-slate-500 border-b border-white/5 font-mono">
                          <span>solution.py</span>
                          <span className="text-purple-400 flex items-center gap-1.5">
                            <Code size={12} /> Python 3
                          </span>
                        </div>
                        <textarea 
                          required
                          value={answers[q.id] || ''}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          rows={10}
                          placeholder="# Write clean, optimal Python code complying with all constraints and complexity requirements..."
                          className="w-full bg-[#030014] text-slate-300 font-mono text-xs sm:text-sm p-4 focus:outline-none resize-y leading-relaxed" 
                        />
                      </div>
                    </div>
                  )}

                  {/* Type 3: Theory */}
                  {q.type === 'Theory' && (
                    <div className="relative rounded-xl overflow-hidden border border-white/5 bg-[#030014]">
                      <div className="flex justify-between items-center bg-[#07051a] px-4 py-2 text-[10px] text-slate-500 border-b border-white/5 font-mono">
                        <span>explanation.txt</span>
                        <span className="text-indigo-400 flex items-center gap-1.5">
                          <FileText size={12} /> Concept Answer
                        </span>
                      </div>
                      <textarea 
                        required
                        value={answers[q.id] || ''}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        rows={6}
                        placeholder="Elaborate on the conceptual definitions, architectural choices, and structural approaches here..."
                        className="w-full bg-[#030014] text-slate-300 font-sans text-xs sm:text-sm p-4 focus:outline-none resize-y leading-relaxed" 
                      />
                    </div>
                  )}

                  {/* Type 4: Fill-in-the-blank */}
                  {q.type === 'Fill-in-the-blank' && (
                    <div className="flex items-center gap-3">
                      <Edit3 size={16} className="text-indigo-400" />
                      <input 
                        type="text" 
                        required
                        value={answers[q.id] || ''}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        placeholder="Provide the missing term..."
                        className="flex-1 bg-slate-950/40 text-slate-200 border border-white/5 focus:border-indigo-500 focus:outline-none rounded-xl px-4 py-3 text-xs sm:text-sm font-medium transition-all"
                      />
                    </div>
                  )}

                </motion.div>
              ))}
            </div>

            {/* Bottom Submit Dock */}
            <div className="sticky bottom-4 z-40 glass-panel bg-slate-950/85 p-5 border-white/10 shadow-[0_-15px_40px_rgba(0,0,0,0.4)] flex flex-col items-center">
              
              {status && !evaluationData && (
                <div className={`w-full p-3 rounded-xl text-center mb-4 border flex items-center justify-center gap-2 font-semibold text-sm
                  ${status.success ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/15 border-rose-500/30 text-rose-400'}`}>
                  {!status.success && <AlertTriangle size={18} />}
                  {status.success && <CheckCircle size={18} />}
                  {status.message}
                </div>
              )}
              
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="btn-primary w-full sm:w-auto px-12 py-3.5 text-base font-bold rounded-xl shadow-lg cursor-pointer disabled:opacity-40 text-white font-sans"
              >
                {isSubmitting ? (
                  <><Loader2 className="animate-spin text-white" size={18} /> AI Evaluating Submissions...</>
                ) : (
                  'Submit Exam for AI Review'
                )}
              </button>
              <p className="text-[10px] text-slate-500 mt-3 text-center leading-normal max-w-md font-mono">
                Evaluations process coding complexity, conceptual correctness, and term accuracy via the neural pipeline.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default VerifySkill;
