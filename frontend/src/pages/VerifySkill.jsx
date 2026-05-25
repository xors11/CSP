import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, ArrowLeft, Loader2, Code, CheckCircle, 
  AlertTriangle, Terminal, Brain, Sparkles, Check, HelpCircle
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const VerifySkill = () => {
  const [searchParams] = useSearchParams();
  const subjectsQuery = searchParams.get('subjects') || 'General';
  const subjectsArray = subjectsQuery.split(',');
  const subjectList = subjectsArray.join(' and ');
  
  const [testData, setTestData] = useState(null);
  const [groupedMcqs, setGroupedMcqs] = useState({});
  const [groupedCoding, setGroupedCoding] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  
  const [mcqAnswers, setMcqAnswers] = useState({});
  const [codingAnswers, setCodingAnswers] = useState({});
  
  const [status, setStatus] = useState(null);
  const [evaluationData, setEvaluationData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/verify/generate?subjects=${encodeURIComponent(subjectsQuery)}&t=${Date.now()}`, {
          cache: 'no-store'
        });
        const data = await response.json();
        setTestData(data);
        
        // Group by subject
        const gMcqs = {};
        const gCoding = {};
        
        if (data.mcqs) {
          data.mcqs.forEach(q => {
            if (!gMcqs[q.subject]) gMcqs[q.subject] = [];
            gMcqs[q.subject].push(q);
          });
        }
        
        if (data.coding) {
          data.coding.forEach((q, idx) => {
            if (!gCoding[q.subject]) gCoding[q.subject] = [];
            gCoding[q.subject].push({ ...q, globalIdx: idx });
          });
        }
        
        setGroupedMcqs(gMcqs);
        setGroupedCoding(gCoding);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTest();
  }, [subjectsQuery]);

  const handleMcqSelect = (qId, optionIdx) => {
    setMcqAnswers(prev => ({ ...prev, [qId]: optionIdx }));
  };

  const handleCodingChange = (qIdx, text) => {
    setCodingAnswers(prev => ({ ...prev, [qIdx]: text }));
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    
    // Validation
    if (Object.keys(mcqAnswers).length < (testData?.mcqs?.length || 0)) {
      setStatus({ success: false, message: 'Please complete all multiple-choice questions before submitting.' });
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
          mcqAnswers, 
          codingAnswers 
        })
      });
      const data = await response.json();
      
      setStatus({ success: data.verified, message: data.message });
      setEvaluationData(data.evaluationResult);
      
      if (data.verified && data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
    } catch {
      setStatus({ success: false, message: 'Server evaluation error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturnToDashboard = () => {
    navigate('/dashboard');
  };

  // Calculation of progress percentage
  const totalQuestions = (testData?.mcqs?.length || 0) + (testData?.coding?.length || 0);
  const answeredCount = Object.keys(mcqAnswers).length + Object.keys(codingAnswers).filter(k => codingAnswers[k].trim() !== '').length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#030014] p-6 text-center">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,rgba(79,70,229,0.05),transparent_60%)] pointer-events-none"></div>
        <div className="relative mb-6">
          <Loader2 className="animate-spin text-indigo-500" size={56} />
          <Terminal className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-300" size={20} />
        </div>
        <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Constructing AI Assessment...</h2>
        <p className="text-slate-400 text-sm max-w-sm mb-6 font-light leading-relaxed">
          Retrieving curated questions for <span className="text-indigo-400 font-semibold">{subjectList}</span> and configuring test environments.
        </p>
        
        {/* Mock compiler lines */}
        <div className="w-full max-w-md bg-slate-950/60 border border-white/5 p-4 rounded-xl text-left font-mono text-[10px] text-slate-500 space-y-1.5 shadow-inner">
          <p className="text-indigo-400">&gt; Connecting to neural evaluation pipeline...</p>
          <p>&gt; Initializing parameters for {subjectsArray.length} course threads...</p>
          <p>&gt; Loading grading vectors & coding templates...</p>
          <p className="text-emerald-400">&gt; Environment ready. Initializing test sheets.</p>
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
        
        {/* Head description */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex bg-gradient-to-r from-purple-500 to-indigo-600 p-4.5 rounded-3xl mb-6 shadow-[0_0_40px_rgba(79,70,229,0.3)]">
            <Brain size={48} className="text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
            AI Mentor Certification Exam
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto font-light leading-relaxed">
            Testing for accreditation in <span className="text-indigo-300 font-semibold">{subjectList}</span>. 
            Includes {testData?.mcqs?.length} logic questions and {testData?.coding?.length} programming challenges.
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
              
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2 block">AI Assessment Outcome</span>
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
                {evaluationData.eligibilityStatus === 'Verified Mentor' ? '🎉 Accreditation Granted!' : evaluationData.eligibilityStatus === 'Trial Mentor' ? '⚠️ Provisional Status' : '❌ Reattempt Required'}
              </h2>
              
              {/* Radial or Big Score */}
              <div className="inline-flex flex-col items-center justify-center w-36 h-36 rounded-full bg-slate-900 border border-white/5 shadow-inner mb-6 relative">
                <span className="text-4xl font-black text-white">{evaluationData.finalScore}%</span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mt-1">Final Score</span>
              </div>
              
              <p className="text-slate-300 text-sm max-w-md mx-auto font-light leading-relaxed">
                {evaluationData.message}
              </p>
            </div>

            {/* Analysis Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              
              {/* Radar Metrics Progress Bars */}
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

              {/* Code Quality & Explanation Analysis */}
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

            {/* Strengths and Weaknesses Panel */}
            <div className="glass-panel p-6 border-indigo-500/10 bg-slate-900/20">
              <h3 className="text-lg font-bold text-white mb-5 border-b border-white/5 pb-3">AI Feedback Analysis</h3>
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
                className="flex-1 btn-secondary py-4 text-base font-bold rounded-2xl cursor-pointer"
              >
                Return to Dashboard
              </button>
              {evaluationData.finalScore < 80 && (
                <button 
                  type="button"
                  onClick={() => window.location.reload()}
                  className="flex-1 btn-primary py-4 text-base font-bold rounded-2xl cursor-pointer bg-gradient-to-r from-purple-500 to-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.3)]"
                >
                  Reattempt Assessment
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          /* Active Test Form Terminal */
          <form onSubmit={handleVerify} className="space-y-12">
            
            {/* Header progress bar overlay */}
            <div className="sticky top-6 z-30 glass-panel bg-slate-950/80 p-4 border-white/10 flex items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <Terminal size={18} className="text-indigo-400" />
                <span className="text-xs sm:text-sm font-bold text-white">Accreditation Sheet</span>
              </div>
              <div className="flex items-center gap-3 flex-1 max-w-xs">
                <div className="w-full bg-slate-900 h-2 rounded-full border border-white/5 overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
                <span className="text-[10px] font-extrabold text-slate-400 whitespace-nowrap">{progressPercent}% Done</span>
              </div>
            </div>

            {subjectsArray.map((subject, sIdx) => (
              <div key={subject} className="space-y-8">
                
                {/* Subject Header Badge */}
                <div className="bg-indigo-950/20 border border-indigo-500/25 px-6 py-4 rounded-2xl flex items-center gap-3 shadow-inner">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center font-bold text-indigo-400 text-sm">
                    {sIdx + 1}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-indigo-300 leading-none">
                    {subject} Modules
                  </h2>
                </div>
                
                {/* Part 1: MCQs */}
                {groupedMcqs[subject]?.length > 0 && (
                  <section className="space-y-6">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-2 text-slate-300">
                      <HelpCircle size={16} className="text-slate-400" />
                      <h3 className="text-sm font-bold uppercase tracking-wider">Part 1: Conceptual Questions</h3>
                    </div>
                    
                    <div className="space-y-4">
                      {groupedMcqs[subject].map((mcq, idx) => (
                        <div 
                          key={mcq.id || mcq.q} 
                          className="glass-panel p-6 bg-slate-900/10 border-white/5"
                        >
                          <h4 className="text-sm sm:text-base font-semibold leading-relaxed text-slate-200 mb-4">
                            <span className="text-indigo-400 font-bold mr-2">{idx + 1}.</span> {mcq.q}
                          </h4>
                          
                          <div className="grid sm:grid-cols-2 gap-3">
                            {mcq.options.map((opt, optIdx) => {
                              const isSelected = mcqAnswers[mcq.q] === optIdx;
                              const isCorrect = mcq.a === optIdx;
                              return (
                                <div 
                                  key={optIdx}
                                  onClick={() => handleMcqSelect(mcq.q, optIdx)}
                                  className={`p-3.5 rounded-xl border text-xs sm:text-sm cursor-pointer transition-all duration-200 font-medium flex justify-between items-center
                                    ${isSelected 
                                      ? 'bg-indigo-600/25 border-indigo-500 text-indigo-200 shadow-md shadow-indigo-500/5' 
                                      : isCorrect 
                                        ? 'bg-emerald-950/20 border-emerald-500/20 text-slate-300 hover:border-emerald-500/40'
                                        : 'bg-slate-950/40 border-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200'}`}
                                >
                                  <span>{opt}</span>
                                  {isCorrect && (
                                    <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider shrink-0">
                                      Correct
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Part 2: Coding Questions */}
                {groupedCoding[subject]?.length > 0 && (
                  <section className="space-y-6">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-2 text-slate-300">
                      <Code size={16} className="text-purple-400" />
                      <h3 className="text-sm font-bold uppercase tracking-wider">Part 2: Coding Challenges</h3>
                    </div>
                    
                    <div className="space-y-6">
                      {groupedCoding[subject].map((codeQ, idx) => (
                        <div 
                          key={codeQ.globalIdx} 
                          className="glass-panel p-6 bg-slate-900/10 border-white/5 relative"
                        >
                          <h4 className="text-sm sm:text-base font-semibold leading-relaxed text-slate-200 mb-4">
                            <span className="text-purple-400 font-bold mr-2">C{idx + 1}.</span> {codeQ.q}
                          </h4>
                          
                          {/* Monospace Code Editor box */}
                          <div className="relative rounded-xl overflow-hidden border border-white/5 bg-[#030014]">
                            <div className="flex justify-between items-center bg-[#07051a] px-4 py-2 text-[10px] text-slate-500 border-b border-white/5 font-mono">
                              <span>code_solution.py</span>
                              <span className="text-purple-400">Python 3</span>
                            </div>
                            <textarea 
                              required
                              value={codingAnswers[codeQ.globalIdx] || ''}
                              onChange={(e) => handleCodingChange(codeQ.globalIdx, e.target.value)}
                              rows={10}
                              placeholder="# Write python logic, architecture outline or explanatory definitions here..."
                              className="w-full bg-[#030014] text-slate-300 font-mono text-xs sm:text-sm p-4 focus:outline-none resize-y leading-relaxed" 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            ))}

            {/* Bottom sticky submission dock */}
            <div className="sticky bottom-4 z-40 glass-panel bg-slate-950/80 p-5 border-white/10 shadow-[0_-15px_40px_rgba(0,0,0,0.4)] flex flex-col items-center">
              
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
                className="btn-primary w-full sm:w-auto px-12 py-3.5 text-base font-bold rounded-xl shadow-lg cursor-pointer disabled:opacity-40"
              >
                {isSubmitting ? (
                  <><Loader2 className="animate-spin" size={18} /> AI Evaluating Submissions...</>
                ) : (
                  'Submit Exam for AI Review'
                )}
              </button>
              <p className="text-[10px] text-slate-500 mt-3 text-center leading-normal max-w-md">
                Submissions are processed by an LLM evaluate loop scoring style accuracy, clarity, and syntax correctness.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default VerifySkill;
