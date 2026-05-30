import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Loader2, Code, CheckCircle, 
  AlertTriangle, Terminal, Brain, Sparkles, Check,
  FileText, Edit3, Clock, Zap, BookOpen, GraduationCap, Trophy,
  HelpCircle, Award, BarChart3, ChevronDown, ChevronUp, AlertCircle, XCircle, ListOrdered
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_URL } from '../config';

// ── Test mode definitions ─────────────────────────────────────────────────────
const TEST_MODES = [
  {
    id: 'quick',
    label: 'Quick Test',
    count: 25,
    duration: '~45 mins',
    description: 'Topic revision & warm-up',
    icon: Zap,
    gradient: 'from-emerald-500 to-teal-600',
    glow: 'shadow-[0_0_24px_rgba(16,185,129,0.25)]',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
    textColor: 'text-emerald-400',
  },
  {
    id: 'standard',
    label: 'Standard Test',
    count: 50,
    duration: '~1.5 hrs',
    description: 'Skill assessment & certification',
    icon: BookOpen,
    gradient: 'from-indigo-500 to-purple-600',
    glow: 'shadow-[0_0_24px_rgba(99,102,241,0.25)]',
    border: 'border-indigo-500/30',
    bg: 'bg-indigo-500/10',
    textColor: 'text-indigo-400',
    recommended: true,
  },
  {
    id: 'full',
    label: 'Full Exam',
    count: 75,
    duration: '~2.5 hrs',
    description: 'Exam preparation & deep review',
    icon: GraduationCap,
    gradient: 'from-amber-500 to-orange-600',
    glow: 'shadow-[0_0_24px_rgba(245,158,11,0.25)]',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
    textColor: 'text-amber-400',
  },
  {
    id: 'mock',
    label: 'Mock Exam',
    count: 100,
    duration: '~3 hrs',
    description: 'Full simulation — exam day readiness',
    icon: Trophy,
    gradient: 'from-rose-500 to-pink-600',
    glow: 'shadow-[0_0_24px_rgba(244,63,94,0.25)]',
    border: 'border-rose-500/30',
    bg: 'bg-rose-500/10',
    textColor: 'text-rose-400',
  },
];

const MEDICAL_KEYWORDS = [
  'anatomy','physiology','biochemistry','pathology','pharmacology','microbiology',
  'forensic medicine','community medicine','ophthalmology','ent','general medicine',
  'general surgery','obstetrics','gynecology','pediatrics','orthopedics','radiology',
  'dermatology','psychiatry','anesthesiology','emergency medicine','mbbs','clinical'
];

function isMedical(s) {
  const lower = s.toLowerCase();
  return MEDICAL_KEYWORDS.some(kw => lower.includes(kw));
}

// ── Component ─────────────────────────────────────────────────────────────────
const VerifySkill = () => {
  const [searchParams] = useSearchParams();
  const subjectsQuery = searchParams.get('subjects') || 'General';
  const subjectsArray = subjectsQuery.split(',');
  const subjectList = subjectsArray.join(' and ');
  const ismedical = isMedical(subjectsQuery);

  // phase: 'select' | 'loading' | 'test'
  const [phase, setPhase] = useState('select');
  const [selectedMode, setSelectedMode] = useState(null);

  const [testData, setTestData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [status, setStatus] = useState(null);
  const [evaluationData, setEvaluationData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  
  // New visual and confirmation states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [resultsTab, setResultsTab] = useState('summary');
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  const [highlightUnanswered, setHighlightUnanswered] = useState(false);
  const [pastAttempts, setPastAttempts] = useState([]);
  const [reviewFilter, setReviewFilter] = useState('all');
  
  // ── Anti-cheat state variables ──────────────────────────────────────────────
  const [violations, setViolations] = useState(0);
  const [violationLog, setViolationLog] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [antiCheatActive, setAntiCheatActive] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);

  // Warning screen / consent overlays
  const [showPreExamConsent, setShowPreExamConsent] = useState(false);
  const [showFullscreenExitWarning, setShowFullscreenExitWarning] = useState(false);
  const [showTabSwitchWarning, setShowTabSwitchWarning] = useState(false);
  const [showFinalWarning, setShowFinalWarning] = useState(false);
  const [showAutoSubmittedModal, setShowAutoSubmittedModal] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchPastAttempts = async () => {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user) return;
      try {
        const res = await fetch(`${API_URL}/api/verify/attempts?userId=${user?.id || user?._id || 'mock'}&subject=${encodeURIComponent(subjectsQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setPastAttempts(data);
        }
      } catch (err) {
        console.error('Error fetching past attempts:', err);
      }
    };
    if (phase === 'select') {
      fetchPastAttempts();
    }
  }, [phase, subjectsQuery]);

  const viewPastAttempt = (attempt) => {
    setEvaluationData(attempt);
    setPhase('test');
  };

  // Loading animation stepper
  useEffect(() => {
    if (phase !== 'loading') return;
    setLoadingStep(0);
    const iv = setInterval(() => setLoadingStep(p => (p < 8 ? p + 1 : p)), 1500);
    return () => clearInterval(iv);
  }, [phase]);

  // Keep answers ref in sync for auto-submit
  const answersRef = useRef({});
  useEffect(() => { answersRef.current = answers; }, [answers]);

  // ── Auto-submit logic ───────────────────────────────────────────────────────
  const autoSubmitExam = async (currentLog) => {
    setIsSubmitting(true);
    setShowConfirmModal(false);
    setShowFinalWarning(false);
    setShowFullscreenExitWarning(false);
    setShowTabSwitchWarning(false);
    setTimerPaused(true);

    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const timeTaken = selectedMode ? Math.max(1, (selectedMode.count * 90) - timeLeft) : 60;
      
      const res = await fetch(`${API_URL}/api/verify/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user?.id || user?._id || 'mock', 
          skills: subjectsArray, 
          questions: testData?.questions || [], 
          answers: answersRef.current,
          timeTakenSeconds: timeTaken,
          auto_submitted: true,
          auto_submit_reason: "Exceeded maximum violations",
          violation_log: currentLog || violationLog
        })
      });
      const data = await res.json();
      
      setStatus({ success: data.verified, message: 'Your exam has been auto-submitted due to repeated fullscreen violations.' });
      setEvaluationData(data.evaluationResult);
      if (data.verified && data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      setShowAutoSubmittedModal(true);
    } catch (err) {
      console.error('Auto-submit error:', err);
      setStatus({ success: false, message: 'Server error during auto-submit.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Record violation helper ──────────────────────────────────────────────────
  const recordViolation = (type) => {
    if (phase !== 'test' || evaluationData) return;
    const timestamp = new Date().toISOString();
    setViolationLog(prev => {
      const newCount = prev.length + 1;
      const entry = { type, timestamp, count: newCount };
      const newLog = [...prev, entry];

      setViolations(newCount);

      if (newCount > 5) {
        autoSubmitExam(newLog);
      } else if (newCount > 3) {
        setShowFinalWarning(true);
      }

      return newLog;
    });
  };

  // ── Fullscreen management ──────────────────────────────────────────────────
  const enterFullscreenAndBegin = async () => {
    try {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
      } else if (docEl.mozRequestFullScreen) {
        await docEl.mozRequestFullScreen();
      } else if (docEl.msRequestFullscreen) {
        await docEl.msRequestFullscreen();
      }
      setIsFullscreen(true);
      setShowPreExamConsent(false);
      setShowFullscreenExitWarning(false);
      setAntiCheatActive(true);
      setTimerPaused(false);
    } catch (err) {
      console.error('Failed to enter fullscreen mode:', err);
    }
  };

  // Kick off the test fetch when a mode is chosen
  const startTest = async (mode) => {
    setSelectedMode(mode);
    setPhase('loading');
    try {
      const res = await fetch(
        `${API_URL}/api/verify/generate?subjects=${encodeURIComponent(subjectsQuery)}&count=${mode.count}&t=${Date.now()}`,
        { cache: 'no-store' }
      );
      const data = await res.json();
      setTestData(data);
      const init = {};
      (data.questions || []).forEach(q => { init[q.id] = ''; });
      setAnswers(init);
      setTimeLeft(data.total_time_seconds || mode.count * 90);
      setPhase('test');
      setShowPreExamConsent(true);
      setTimerPaused(true);
    } catch (e) {
      console.error('Error fetching test:', e);
      setPhase('select');
    }
  };

  // Dedicated submission logic
  const submitExam = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);
    setStatus(null);
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const timeTaken = selectedMode ? Math.max(1, (selectedMode.count * 90) - timeLeft) : 60;
      
      const res = await fetch(`${API_URL}/api/verify/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user?.id || user?._id || 'mock', 
          skills: subjectsArray, 
          questions: testData?.questions || [], 
          answers,
          timeTakenSeconds: timeTaken,
          auto_submitted: false,
          violation_log: violationLog
        })
      });
      const data = await res.json();
      
      // Update states
      setStatus({ success: data.verified, message: data.evaluationResult?.message || 'Evaluated!' });
      setEvaluationData(data.evaluationResult);
      if (data.verified && data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
    } catch (err) {
      console.error('Evaluation submit error:', err);
      setStatus({ success: false, message: 'Server error during grading. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Countdown timer
  useEffect(() => {
    if (phase !== 'test' || evaluationData || timeLeft === null) return;
    if (timeLeft <= 0) {
      setStatus({ success: false, message: 'Time expired! Auto-submitting...' });
      const submit = async () => {
        setIsSubmitting(true);
        try {
          const user = JSON.parse(localStorage.getItem('user'));
          const timeTaken = selectedMode ? selectedMode.count * 90 : 60;
          const res = await fetch(`${API_URL}/api/verify/evaluate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              userId: user?.id || user?._id || 'mock', 
              skills: subjectsArray, 
              questions: testData?.questions || [], 
              answers: answersRef.current,
              timeTakenSeconds: timeTaken,
              auto_submitted: false,
              violation_log: violationLog
            })
          });
          const data = await res.json();
          setStatus({ success: data.verified, message: data.evaluationResult?.message || 'Evaluated!' });
          setEvaluationData(data.evaluationResult);
          if (data.verified && data.user) localStorage.setItem('user', JSON.stringify(data.user));
        } catch { setStatus({ success: false, message: 'Auto-submit error.' }); }
        finally { setIsSubmitting(false); }
      };
      submit(); return;
    }
    const t = setInterval(() => {
      if (!timerPaused) {
        setTimeLeft(p => p - 1);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [timeLeft, phase, evaluationData, timerPaused, violationLog]);

  // ── Anti-cheat event listeners ──────────────────────────────────────────────
  
  // 1. Fullscreen change detection
  useEffect(() => {
    if (phase !== 'test' || evaluationData || !antiCheatActive) return;

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );

      setIsFullscreen(isCurrentlyFullscreen);

      if (!isCurrentlyFullscreen) {
        setTimerPaused(true);
        setShowFullscreenExitWarning(true);
        recordViolation('fullscreen_exit');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [phase, evaluationData, antiCheatActive]);

  // 2. Tab/Window visibility and focus change detection
  useEffect(() => {
    if (phase !== 'test' || evaluationData || !antiCheatActive) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTimerPaused(true);
        setShowTabSwitchWarning(true);
        recordViolation('tab_switch');
      }
    };

    const handleWindowBlur = () => {
      setTimerPaused(true);
      setShowTabSwitchWarning(true);
      recordViolation('tab_switch');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [phase, evaluationData, antiCheatActive]);

  // 3. Keyboard locks and shortcut restriction
  useEffect(() => {
    if (phase !== 'test' || evaluationData || !antiCheatActive) return;

    const handleKeyDown = (e) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const key = e.key.toLowerCase();

      // Dev tools F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
      const isDevTools = 
        e.key === 'F12' || 
        (isCtrlOrCmd && isShift && (key === 'i' || key === 'j' || key === 'c'));
      
      if (isDevTools) {
        e.preventDefault();
        e.stopPropagation();
        recordViolation('devtools_open');
        return false;
      }

      // Blocked keyboard shortcut combinations
      const blockedKeys = ['c', 'v', 'a', 'x', 'u', 's', 'p', 't', 'n', 'w', 'r'];
      const isBlockedShortcut = isCtrlOrCmd && blockedKeys.includes(key);

      // Refresh shortcut F5
      const isRefresh = e.key === 'F5';

      // Fullscreen shortcut F11
      const isFullscreenToggle = e.key === 'F11';

      if (isBlockedShortcut || isRefresh || isFullscreenToggle) {
        e.preventDefault();
        e.stopPropagation();
        recordViolation('keyboard_shortcut');
        return false;
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      recordViolation('keyboard_shortcut');
      return false;
    };

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    document.addEventListener('contextmenu', handleContextMenu, { capture: true });

    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
      document.removeEventListener('contextmenu', handleContextMenu, { capture: true });
    };
  }, [phase, evaluationData, antiCheatActive]);

  // 4. Selection, Copy, Clipboard & Drag protection
  useEffect(() => {
    if (phase !== 'test' || evaluationData || !antiCheatActive) return;

    const handleCopy = (e) => {
      e.preventDefault();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText('');
      }
      recordViolation('keyboard_shortcut');
    };

    const preventDragDrop = (e) => {
      e.preventDefault();
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('dragstart', preventDragDrop);
    document.addEventListener('drop', preventDragDrop);
    document.addEventListener('dragover', preventDragDrop);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('dragstart', preventDragDrop);
      document.removeEventListener('drop', preventDragDrop);
      document.removeEventListener('dragover', preventDragDrop);
    };
  }, [phase, evaluationData, antiCheatActive]);

  const handleAnswerChange = (qId, val) => setAnswers(p => ({ ...p, [qId]: val }));

  const handleVerify = (e) => {
    if (e) e.preventDefault();
    setShowConfirmModal(true);
  };

  const formatTime = (s) => {
    if (!s || s <= 0) return '00:00';
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    const mm = String(m).padStart(2,'0'), ss = String(sec).padStart(2,'0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  };

  const totalQ = testData?.questions?.length || evaluationData?.result_summary?.total_questions || evaluationData?.question_review?.length || 0;
  const answered = Object.values(answers).filter(v => String(v).trim() !== '').length;
  const progress = totalQ > 0 ? Math.round((answered / totalQ) * 100) : 0;

  // ── PHASE: SELECT ──────────────────────────────────────────────────────────
  if (phase === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#030014] to-[#080020] flex flex-col items-center justify-center p-6 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.06),transparent_60%)] pointer-events-none" />

        <button onClick={() => navigate('/dashboard')}
          className="fixed top-6 left-6 z-50 text-xs font-bold text-slate-400 bg-slate-900/80 backdrop-blur-md px-4 py-2.5 rounded-full flex items-center gap-2 hover:text-white border border-white/5 transition-colors cursor-pointer">
          <ArrowLeft size={14} /> Back to Dashboard
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-3xl">

          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex bg-gradient-to-r from-purple-500 to-indigo-600 p-4 rounded-3xl mb-5 shadow-[0_0_40px_rgba(79,70,229,0.3)]">
              <Brain size={42} className="text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-3">Choose Your Test Mode</h1>
            <p className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto font-light">
              Subject: <span className="text-indigo-300 font-semibold">{subjectList}</span>
              {ismedical && (
                <span className="ml-2 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  🏥 Medical — min. 50 questions
                </span>
              )}
            </p>
          </div>

          {/* Mode Cards */}
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            {TEST_MODES.map((mode) => {
              const Icon = mode.icon;
              const disabled = ismedical && mode.count < 50;
              const active = selectedMode?.id === mode.id;
              return (
                <motion.button key={mode.id}
                  whileHover={!disabled ? { scale: 1.02, y: -2 } : {}}
                  whileTap={!disabled ? { scale: 0.98 } : {}}
                  disabled={disabled}
                  onClick={() => !disabled && setSelectedMode(mode)}
                  className={`relative text-left p-5 rounded-2xl border transition-all duration-200
                    ${disabled ? 'opacity-30 cursor-not-allowed border-white/5 bg-slate-900/20' :
                      active ? `${mode.border} ${mode.bg} ${mode.glow} cursor-pointer` :
                      'border-white/8 bg-slate-900/30 hover:border-white/20 cursor-pointer'}`}
                >
                  {mode.recommended && !disabled && (
                    <span className="absolute top-3 right-3 text-[9px] font-black uppercase tracking-widest text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                      Recommended
                    </span>
                  )}
                  <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${mode.gradient} mb-4 shadow-lg`}>
                    <Icon size={22} className="text-white" />
                  </div>
                  <div className="flex items-baseline gap-3 mb-1">
                    <h3 className="text-base font-black text-white">{mode.label}</h3>
                    <span className={`text-xs font-bold ${mode.textColor}`}>{mode.count} questions</span>
                  </div>
                  <p className="text-slate-400 text-xs font-light mb-3">{mode.description}</p>
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-slate-500" />
                    <span className="text-[11px] text-slate-500 font-mono">{mode.duration}</span>
                  </div>
                  {active && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className="absolute top-3 left-3 w-5 h-5 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
                      <Check size={11} className="text-white" />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Section preview */}
          {selectedMode && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-2xl border border-white/8 bg-slate-900/30 text-center text-xs text-slate-400">
              <span className="font-bold text-white">{selectedMode.count} questions</span> split across&nbsp;
              <span className="text-emerald-400 font-semibold">{Math.round(selectedMode.count * 0.30)} easy (Foundation)</span>,&nbsp;
              <span className="text-amber-400 font-semibold">{Math.round(selectedMode.count * 0.50)} medium (Applied)</span>, and&nbsp;
              <span className="text-rose-400 font-semibold">{selectedMode.count - Math.round(selectedMode.count * 0.30) - Math.round(selectedMode.count * 0.50)} hard (Advanced)</span>.
              &nbsp;Est. time: <span className="text-indigo-300 font-semibold">{selectedMode.duration}</span>.
            </motion.div>
          )}

          {/* Start button */}
          <motion.button
            whileHover={selectedMode ? { scale: 1.02 } : {}}
            whileTap={selectedMode ? { scale: 0.98 } : {}}
            disabled={!selectedMode}
            onClick={() => selectedMode && startTest(selectedMode)}
            className={`w-full py-4 rounded-2xl text-base font-black tracking-wide transition-all duration-200
              ${selectedMode
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-[0_0_30px_rgba(79,70,229,0.4)] hover:shadow-[0_0_40px_rgba(79,70,229,0.5)] cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}>
            {selectedMode ? `Start ${selectedMode.label} →` : 'Select a Test Mode to Continue'}
          </motion.button>

          <p className="text-center text-[11px] text-slate-600 mt-4 font-mono">
            All questions are AI-generated and unique to this session. No two sessions are identical.
          </p>

          {/* Past Attempts History */}
          {pastAttempts.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="mt-12 pt-8 border-t border-white/5 space-y-4 text-left">
              <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <Trophy className="text-amber-400" size={18} /> Past Accreditation Attempts
              </h2>
              <p className="text-slate-500 text-xs font-light">
                Review your permanent diagnostic reports and compare performance profiles over time:
              </p>
              
              <div className="space-y-3.5">
                {pastAttempts.map((attempt, index) => {
                  const attemptedAt = new Date(attempt.attempted_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  });
                  const p = parseFloat(attempt.result_summary?.percentage || "0");
                  
                  return (
                    <div key={attempt.session_id || index} 
                      className="p-4 bg-slate-900/30 border border-white/5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-white/10 transition-all">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                            {attempt.attempt_number || (pastAttempts.length - index)}
                            {(() => {
                              const num = attempt.attempt_number || (pastAttempts.length - index);
                              if (num === 1) return 'st';
                              if (num === 2) return 'nd';
                              if (num === 3) return 'rd';
                              return 'th';
                            })()}&nbsp;Attempt
                          </span>
                          <span className="text-xs text-slate-500 font-mono">{attemptedAt}</span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-white mt-1">
                          Score: <span className="text-indigo-300 font-mono">{attempt.result_summary?.score}</span> ({p}%)
                        </h4>
                        <div className="flex gap-4 text-[10px] text-slate-400 font-mono mt-0.5">
                          <span>Grade: <strong className="text-indigo-400">{attempt.result_summary?.grade}</strong></span>
                          <span>Level: <strong className="text-indigo-400">{attempt.result_summary?.performance_level}</strong></span>
                        </div>
                      </div>
                      
                      <button type="button" onClick={() => viewPastAttempt(attempt)}
                        className="py-2.5 px-4 rounded-xl text-xs font-bold bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer transition-all flex items-center gap-1.5 font-sans">
                        <FileText size={12} /> View Attempt Report
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    );
  }

  // ── PHASE: LOADING ─────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#030014] p-6 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.04),transparent_60%)] pointer-events-none" />
        <div className="relative mb-6">
          <Loader2 className="animate-spin text-emerald-400" size={56} />
          <Brain className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-300" size={20} />
        </div>
        <h2 className="text-2xl font-black text-white mb-2 tracking-tight">
          Building your {selectedMode?.label}...
        </h2>
        <p className="text-slate-400 text-sm max-w-sm mb-1 font-light leading-relaxed">
          Generating <span className="text-emerald-400 font-semibold">{selectedMode?.count} questions</span> for&nbsp;
          <span className="text-indigo-300 font-semibold">{subjectList}</span>.
        </p>
        <p className="text-slate-600 text-xs mb-6 font-mono">
          Larger tests may take 30–90 seconds. Please wait.
        </p>

        <div className="w-full max-w-md bg-[#020012]/80 backdrop-blur-md border border-white/5 p-5 rounded-2xl text-left font-mono text-[11px] text-slate-400 space-y-2 shadow-2xl">
          <div className="flex gap-1.5 mb-2 border-b border-white/5 pb-2">
            <span className="w-2 h-2 rounded-full bg-rose-500/60" />
            <span className="w-2 h-2 rounded-full bg-amber-500/60" />
            <span className="w-2 h-2 rounded-full bg-emerald-500/60" />
            <span className="text-[9px] text-slate-500 ml-auto uppercase font-bold tracking-wider">AI Sandbox Setup</span>
          </div>
          {[
            'Contacting Groq dynamic AI agent cluster...',
            'Secure connection established with Groq gateway.',
            `Applying subject isolation rules for ${subjectList}...`,
            `Engineering ${selectedMode?.count} rigorous questions with constraints...`,
            'Distributing difficulty: 30% easy · 50% medium · 20% hard...',
            'Setting up the AI grading environment...',
            'Compiling optimal solution schemas & references...',
            'Finalizing system verification parameters...',
            '⚡ Sandbox prepared! Initializing secure exam session...',
          ].map((msg, i) => loadingStep >= i && (
            <p key={i} className={
              i === 8 ? 'text-emerald-400 font-bold animate-pulse' :
              loadingStep > i ? 'text-emerald-400 font-medium' : 'text-indigo-400 animate-pulse'
            }>
              {loadingStep > i ? '✓' : i === 8 ? '' : '⚡'} {msg}
            </p>
          ))}
          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[9px] text-slate-500 font-sans mt-3">
            <span>Server status: 200 OK</span>
            <span className="animate-pulse">Step {loadingStep + 1}/9</span>
          </div>
        </div>
      </div>
    );
  }

  // ── PHASE: TEST ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen p-4 sm:p-8 md:p-12 relative overflow-y-auto bg-gradient-to-b from-[#030014] to-[#0a0028]/40 selection:bg-indigo-500/30">

      <button onClick={() => navigate('/dashboard')}
        className="fixed top-6 left-6 z-50 text-xs font-bold text-slate-400 bg-slate-900/80 backdrop-blur-md px-4 py-2.5 rounded-full flex items-center gap-2 hover:text-white border border-white/5 transition-colors cursor-pointer">
        <ArrowLeft size={14} /> Abort Assessment
      </button>

      <div className="max-w-4xl mx-auto pt-12 pb-24">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex bg-gradient-to-r from-purple-500 to-indigo-600 p-4 rounded-3xl mb-5 shadow-[0_0_40px_rgba(79,70,229,0.3)]">
            <Brain size={44} className="text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mb-3">
            AI Accreditation Center
          </h1>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <p className="text-slate-400 text-base sm:text-lg font-light">
              ACC-ID: <span className="text-indigo-300 font-semibold">{subjectList}</span>
            </p>
            {selectedMode && (
              <span className={`text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${selectedMode.border} ${selectedMode.bg} ${selectedMode.textColor}`}>
                {selectedMode.label} — {totalQ}Q
              </span>
            )}
          </div>
        </motion.div>

        {evaluationData ? (
          /* ── Results ── */
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8 print:space-y-4">
            
            {/* Custom Print Style Block */}
            <style dangerouslySetInnerHTML={{__html: `
              @media print {
                body {
                  background: white !important;
                  color: black !important;
                }
                .no-print {
                  display: none !important;
                }
                .print-card {
                  border: 1px solid #e2e8f0 !important;
                  background: white !important;
                  color: black !important;
                  box-shadow: none !important;
                  page-break-inside: avoid !important;
                  margin-bottom: 1.5rem !important;
                }
                h1, h2, h3, h4, h5, p, span, div, strong, italic {
                  color: black !important;
                }
                svg circle {
                  stroke: #4f46e5 !important;
                }
              }
            `}} />

            {(() => {
              const pct = evaluationData?.result_summary?.percentage !== undefined 
                ? parseFloat(evaluationData.result_summary.percentage) 
                : (evaluationData?.finalScore || 0);

              const grade = evaluationData?.result_summary?.grade || (pct >= 95 ? 'A+' : pct >= 85 ? 'A' : pct >= 70 ? 'B' : pct >= 55 ? 'C' : pct >= 40 ? 'D' : 'F');
              const level = evaluationData?.result_summary?.performance_level || (pct >= 95 ? 'Excellent' : pct >= 85 ? 'Good' : pct >= 70 ? 'Average' : pct >= 55 ? 'Below Average' : pct >= 40 ? 'Poor' : 'Fail');
              const verdict = evaluationData?.eligibilityStatus || (pct >= 80 ? 'Verified Mentor' : pct >= 60 ? 'Trial Mentor' : 'Reattempt Required');
              
              const correct = evaluationData?.result_summary?.correct ?? (evaluationData?.metrics?.correctAnswers ?? Math.round((pct/100) * totalQ));
              const incorrect = evaluationData?.result_summary?.incorrect ?? (totalQ - correct);
              const attempted = evaluationData?.result_summary?.attempted ?? answered;
              const unattempted = evaluationData?.result_summary?.not_attempted ?? (totalQ - attempted);
              
              const timeTaken = evaluationData?.result_summary?.time_taken_seconds || 60;
              const recommendation = evaluationData?.result_summary?.recommendation || evaluationData?.message || 'Review standard references and attempt again.';
              
              const strokeDash = 2 * Math.PI * 54;
              const offset = strokeDash - (pct / 100) * strokeDash;

              return (
                <>
                  {/* SECTION 1: SCORE CARD */}
                  <div className="p-8 rounded-3xl border border-white/10 bg-slate-950/60 backdrop-blur-md relative overflow-hidden print-card shadow-2xl space-y-6">
                    <div className="absolute -top-12 -left-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none no-print" />
                    
                    <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
                      {/* Radial Progress & Grade */}
                      <div className="flex flex-col items-center justify-center shrink-0">
                        <div className="relative w-36 h-36 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="72" cy="72" r="54" stroke="rgba(255,255,255,0.05)" strokeWidth="10" fill="transparent" />
                            <motion.circle cx="72" cy="72" r="54" 
                              stroke={pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444'} 
                              strokeWidth="10" fill="transparent" strokeDasharray={strokeDash} 
                              initial={{ strokeDashoffset: strokeDash }} 
                              animate={{ strokeDashoffset: offset }} 
                              transition={{ duration: 1.2, ease: 'easeOut' }} />
                          </svg>
                          <div className="absolute flex flex-col items-center justify-center">
                            <span className="text-4xl font-black text-white font-mono">{pct}%</span>
                            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider mt-0.5">Grade {grade}</span>
                          </div>
                        </div>
                        <div className="mt-3 text-xs font-black uppercase px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-indigo-300 font-mono tracking-widest">{level}</div>
                      </div>
                      
                      {/* Score card details */}
                      <div className="flex-1 w-full space-y-4">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1 block">Accreditation Subject</span>
                          <h2 className="text-2xl sm:text-3xl font-black text-white">{subjectList}</h2>
                          {evaluationData.attempt_number && (
                            <span className="inline-block mt-1 text-[11px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full font-mono">
                              Attempt #{evaluationData.attempt_number}
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {[
                            { label: 'Score', val: `${correct}/${totalQ}`, icon: Brain, color: 'text-indigo-400' },
                            { label: 'Attempted', val: attempted, icon: CheckCircle, color: 'text-emerald-400' },
                            { label: 'Not Attempted', val: unattempted, icon: AlertCircle, color: 'text-rose-400' },
                            { label: 'Verdict', val: verdict === 'Verified Mentor' ? 'Verified' : verdict === 'Trial Mentor' ? 'Trial Status' : 'Failed', icon: Award, color: verdict === 'Verified Mentor' ? 'text-emerald-400' : verdict === 'Trial Mentor' ? 'text-amber-400' : 'text-rose-400' },
                            { label: 'Time Taken', val: formatTime(timeTaken), icon: Clock, color: 'text-cyan-400' },
                            { label: 'Time Allotted', val: formatTime(evaluationData?.result_summary?.time_allotted_seconds || 5400), icon: Clock, color: 'text-slate-400' }
                          ].map((item, idx) => {
                            const Icon = item.icon;
                            return (
                              <div key={idx} className="p-3 bg-[#030014]/60 border border-white/5 rounded-xl flex items-center gap-3">
                                <div className={`p-1.5 rounded-lg bg-slate-900 ${item.color}`}><Icon size={14} /></div>
                                <div className="flex flex-col">
                                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">{item.label}</span>
                                  <span className="text-sm font-black text-white font-mono leading-none mt-1">{item.val}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-slate-300 text-xs sm:text-sm max-w-3xl mx-auto font-light leading-relaxed mt-6 border-l-2 border-indigo-500/20 pl-4 italic">
                      "{recommendation}"
                    </p>
                  </div>

                  {/* SECTION 2: PERFORMANCE BREAKDOWN */}
                  <div className="glass-panel p-6 bg-slate-900/10 border-white/5 space-y-6 print-card shadow-xl">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest border-b border-white/5 pb-3 flex items-center gap-2">
                      <BarChart3 size={16} className="text-indigo-400" /> Section & Topic Performance Breakdown
                    </h3>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Section Wise (Foundation, Applied, Advanced) */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Section-wise Performance</h4>
                        
                        {[
                          { name: 'Foundation (Section 1 - Easy)', key: 'easy', color: 'bg-emerald-500', text: 'text-emerald-400' },
                          { name: 'Applied (Section 2 - Medium)', key: 'medium', color: 'bg-amber-500', text: 'text-amber-400' },
                          { name: 'Advanced (Section 3 - Hard)', key: 'hard', color: 'bg-rose-500', text: 'text-rose-400' }
                        ].map((sec, idx) => {
                          const data = evaluationData?.difficulty_analysis?.[sec.key] || { accuracy: "0%", correct: 0, total: 0 };
                          return (
                            <div key={idx} className="p-3 bg-slate-950/40 border border-white/5 rounded-xl space-y-2">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-semibold text-slate-300">{sec.name}</span>
                                <span className={`font-mono font-bold ${sec.text}`}>{data.accuracy} ({data.correct}/{data.total})</span>
                              </div>
                              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-white/5">
                                <div className="h-full rounded-full transition-all duration-500" style={{ width: data.accuracy, backgroundColor: sec.key === 'easy' ? '#10b981' : sec.key === 'medium' ? '#f59e0b' : '#ef4444' }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Difficulty Wise (Easy, Medium, Hard) */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Difficulty-wise Accuracy</h4>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { level: 'Easy', key: 'easy', color: 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' },
                            { level: 'Medium', key: 'medium', color: 'border-amber-500/20 text-amber-400 bg-amber-500/5' },
                            { level: 'Hard', key: 'hard', color: 'border-rose-500/20 text-rose-400 bg-rose-500/5' }
                          ].map((diff, i) => {
                            const data = evaluationData?.difficulty_analysis?.[diff.key] || { accuracy: "0%", correct: 0, total: 0 };
                            return (
                              <div key={i} className={`p-4 border rounded-2xl flex flex-col items-center text-center ${diff.color}`}>
                                <span className="text-[10px] uppercase font-extrabold tracking-widest mb-2 opacity-80">{diff.level}</span>
                                <span className="text-xl font-black font-mono mb-1">{data.accuracy}</span>
                                <span className="text-[9px] font-mono opacity-60">{data.correct} / {data.total} OK</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Topic Wise breakdown */}
                    <div className="space-y-3 pt-4 border-t border-white/5">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Topic Mastery Meter</h4>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {evaluationData?.topic_analysis?.map((topic, i) => (
                          <div key={i} className="p-3 bg-slate-950/40 border border-white/5 rounded-xl space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-semibold text-slate-200 truncate max-w-[180px]">{topic.topic}</span>
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded font-mono
                                ${topic.status === 'Strong' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                  topic.status === 'Needs Improvement' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                  'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                {topic.accuracy} ({topic.correct}/{topic.total_questions})
                              </span>
                            </div>
                            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-white/5">
                              <div className={`h-full rounded-full transition-all duration-500
                                ${topic.status === 'Strong' ? 'bg-emerald-500' :
                                  topic.status === 'Needs Improvement' ? 'bg-amber-500' : 'bg-rose-500'}`}
                                style={{ width: topic.accuracy }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: MISTAKE PATHOLOGY ANALYSIS */}
                  {evaluationData?.mistake_pattern && (
                    <div className="glass-panel p-6 bg-slate-900/10 border-white/5 space-y-4 print-card shadow-xl">
                      <h3 className="text-sm font-black text-white uppercase tracking-widest border-b border-white/5 pb-3 flex items-center gap-2">
                        <AlertTriangle size={16} className="text-rose-400" /> Mistake Pathology & Cognitive Diagnostics
                      </h3>
                      <p className="text-slate-400 text-xs font-light">
                        Detailed analysis of mistake categories mapped from skipped questions and incorrect answers:
                      </p>
                      
                      {(() => {
                        const mp = evaluationData.mistake_pattern;
                        const categories = [
                          { label: 'Wrong Concept', count: mp.wrong_concept || 0, color: 'bg-rose-500', text: 'text-rose-400' },
                          { label: 'Calculation Error', count: mp.calculation_error || 0, color: 'bg-amber-500', text: 'text-amber-400' },
                          { label: 'Misread Question', count: mp.misread_question || 0, color: 'bg-purple-500', text: 'text-purple-400' },
                          { label: 'Careless Mistake', count: mp.careless_mistake || 0, color: 'bg-pink-500', text: 'text-pink-400' },
                          { label: 'Not Attempted', count: mp.not_attempted || 0, color: 'bg-slate-500', text: 'text-slate-400' }
                        ];
                        const totalMistakes = categories.reduce((sum, c) => sum + c.count, 0) || 1;
                        
                        return (
                          <div className="space-y-3.5">
                            {categories.map((c, i) => {
                              const pct = Math.round((c.count / totalMistakes) * 100);
                              return (
                                <div key={i} className="p-3 bg-slate-950/40 border border-white/5 rounded-xl space-y-2">
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="font-semibold text-slate-300">{c.label}</span>
                                    <span className={`font-mono font-bold ${c.text}`}>{c.count} ({pct}%)</span>
                                  </div>
                                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-white/5">
                                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: c.label === 'Wrong Concept' ? '#ef4444' : c.label === 'Calculation Error' ? '#f59e0b' : c.label === 'Misread Question' ? '#a855f7' : c.label === 'Careless Mistake' ? '#ec4899' : '#64748b' }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* SECTION 4: IMPROVEMENT PLAN */}
                  <div className="glass-panel p-6 bg-slate-900/10 border-white/5 space-y-4 print-card shadow-xl">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest border-b border-white/5 pb-3 flex items-center gap-2">
                      <Trophy size={16} className="text-amber-400" /> Actionable Study Roadmap & Curriculum Guide
                    </h3>
                    <p className="text-slate-400 text-xs font-light">
                      Curated conceptual resources and priority study tasks compiled to bridge performance gaps:
                    </p>
                    
                    <div className="space-y-3">
                      {evaluationData?.improvement_plan && evaluationData.improvement_plan.length > 0 ? (
                        evaluationData.improvement_plan.map((item, idx) => (
                          <div key={idx} className="p-4 bg-slate-950/50 border border-white/5 rounded-xl flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded font-mono
                                  ${item.priority === 'High' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/25' :
                                    item.priority === 'Medium' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25' :
                                    'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                                  {item.priority} Priority
                                </span>
                                <h4 className="text-xs sm:text-sm font-bold text-white">{item.topic}</h4>
                              </div>
                              <p className="text-xs text-slate-400"><strong className="text-slate-300">Observation:</strong> {item.issue}</p>
                              <p className="text-xs text-slate-400"><strong className="text-emerald-400 font-semibold font-sans">Action Plan:</strong> {item.action}</p>
                            </div>
                            {item.resource && (
                              <div className="shrink-0 flex flex-col md:items-end justify-center pt-2 md:pt-0 border-t md:border-t-0 border-white/5 w-full md:w-auto">
                                <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-400 mb-0.5">📚 Target Reference</span>
                                <span className="text-xs text-amber-300/80 italic font-medium">{item.resource}</span>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center p-6 bg-[#030014]/40 border border-white/5 rounded-xl">
                          <CheckCircle size={28} className="text-emerald-400 mx-auto mb-2" />
                          <h4 className="text-sm font-bold text-white">Full Subject Competence Verified!</h4>
                          <p className="text-xs text-slate-500 font-light max-w-md mx-auto mt-1 leading-normal">
                            You demonstrated no significant cognitive gaps in this subject. Absolute top-tier expert performance.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SECTION 6: NAVIGATION PANEL (Screen-only Review controller) */}
                  <div className="glass-panel p-6 bg-slate-950/80 border-indigo-500/20 rounded-3xl space-y-4 print-card shadow-2xl no-print">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                          <ListOrdered size={16} className="text-indigo-400" /> Interactive Review & Filter Console
                        </h3>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">Filter questions by status or jump to a card instantly.</p>
                      </div>
                      
                      {/* PDF Print Button */}
                      <button 
                        type="button" 
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/20 transition-all font-sans"
                      >
                        <FileText size={14} /> Print Report / Save as PDF
                      </button>
                    </div>
                    
                    {/* Filters */}
                    <div className="flex flex-wrap gap-2 border-t border-b border-white/5 py-3">
                      {[
                        { id: 'all', label: 'All Questions', count: evaluationData?.question_review?.length || 0 },
                        { id: 'correct', label: '✅ Correct', count: evaluationData?.question_review?.filter(qr => qr.is_correct && qr.is_attempted).length || 0 },
                        { id: 'wrong', label: '❌ Wrong', count: evaluationData?.question_review?.filter(qr => !qr.is_correct && qr.is_attempted).length || 0 },
                        { id: 'unattempted', label: '⏭️ Not Attempted', count: evaluationData?.question_review?.filter(qr => !qr.is_attempted).length || 0 }
                      ].map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setReviewFilter(f.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border
                            ${reviewFilter === f.id 
                              ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400' 
                              : 'bg-slate-900/40 border-white/5 text-slate-400 hover:text-slate-200'}`}
                        >
                          {f.label} ({f.count})
                        </button>
                      ))}
                    </div>

                    {/* Jump-to Grid */}
                    <div className="space-y-2">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block">Question Navigator Grid</span>
                      <div className="flex flex-wrap gap-1.5">
                        {evaluationData?.question_review?.map((qr, qIdx) => {
                          const matchesFilter = 
                            reviewFilter === 'all' ||
                            (reviewFilter === 'correct' && qr.is_correct && qr.is_attempted) ||
                            (reviewFilter === 'wrong' && !qr.is_correct && qr.is_attempted) ||
                            (reviewFilter === 'unattempted' && !qr.is_attempted);
                          
                          let bgBorderClass = "bg-slate-900 border-white/5 text-slate-500 opacity-30 hover:opacity-100";
                          if (matchesFilter) {
                            bgBorderClass = qr.is_attempted 
                              ? (qr.is_correct 
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' 
                                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20')
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700';
                          }
                          
                          return (
                            <button
                              key={qr.id}
                              type="button"
                              onClick={() => {
                                const el = document.getElementById(`review-card-${qr.id}`);
                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }}
                              className={`w-8 h-8 rounded-lg font-mono text-xs font-bold transition-all border flex items-center justify-center cursor-pointer ${bgBorderClass}`}
                            >
                              {qIdx + 1}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* SECTION 5: FULL QUESTION REVIEW */}
                  <div className="space-y-6 print-card">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <Code size={16} className="text-indigo-400" /> Full Question-by-Question Review
                      </h3>
                      <span className="text-xs text-slate-500 font-mono">Showing {reviewFilter === 'all' ? 'All' : reviewFilter} questions</span>
                    </div>

                    <div className="space-y-8">
                      {evaluationData?.question_review
                        ?.filter(qr => {
                          if (reviewFilter === 'all') return true;
                          if (reviewFilter === 'correct') return qr.is_correct && qr.is_attempted;
                          if (reviewFilter === 'wrong') return !qr.is_correct && qr.is_attempted;
                          if (reviewFilter === 'unattempted') return !qr.is_attempted;
                          return true;
                        })
                        .map((qr, idx) => {
                          const isExpanded = expandedQuestion === qr.id;
                          return (
                            <div 
                              key={qr.id || idx} 
                              id={`review-card-${qr.id}`}
                              className={`border rounded-2xl transition-all duration-150 overflow-hidden bg-slate-950/40 page-break-inside-avoid shadow-lg
                                ${qr.is_attempted 
                                  ? (qr.is_correct 
                                      ? 'border-emerald-500/10 hover:border-emerald-500/25' 
                                      : 'border-rose-500/10 hover:border-rose-500/25')
                                  : 'border-slate-850 hover:border-slate-700'}`}
                            >
                              {/* Header Bar */}
                              <div onClick={() => setExpandedQuestion(isExpanded ? null : qr.id)}
                                className="p-4 flex items-start gap-3 justify-between cursor-pointer select-none bg-slate-900/20">
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-white/5">Q{idx + 1}</span>
                                    
                                    {/* Status Badge */}
                                    {qr.is_attempted ? (
                                      qr.is_correct ? (
                                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-mono">
                                          ✅ Correct
                                        </span>
                                      ) : (
                                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/25 font-mono">
                                          ❌ Wrong
                                        </span>
                                      )
                                    ) : (
                                      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono font-bold">
                                        ⏭️ Not Attempted
                                      </span>
                                    )}

                                    <span className={`text-[9px] font-bold uppercase font-mono px-2 py-0.5 rounded
                                      ${qr.difficulty === 'easy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                        qr.difficulty === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                        'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                      {qr.difficulty}
                                    </span>
                                    <span className="text-[9px] font-bold uppercase font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                      {qr.type}
                                    </span>
                                  </div>
                                  <h4 className="text-xs sm:text-sm font-semibold text-slate-200 leading-normal line-clamp-2">{qr.question}</h4>
                                </div>
                                
                                <div className="flex items-center gap-2 shrink-0 no-print">
                                  {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                </div>
                              </div>

                              {/* Question Details Block (Always visible in printing, expandable in screen) */}
                              <div className={`border-t border-white/5 ${isExpanded ? 'block' : 'hidden sm:block sm:opacity-90 sm:bg-slate-900/5'}`}>
                                <div className="p-5 space-y-4 text-xs">
                                  {/* Patient scenario if clinical */}
                                  {qr.case && (
                                    <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5">
                                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-rose-400 block mb-1">🏥 Clinical Scenario</span>
                                      <p className="text-slate-200 leading-relaxed font-light">{qr.case}</p>
                                    </div>
                                  )}

                                  {/* Image diagram descriptions */}
                                  {qr.image_description && (
                                    <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5">
                                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-cyan-400 block mb-1">🔬 Image Description</span>
                                      <p className="text-slate-200 leading-relaxed font-light italic">{qr.image_description}</p>
                                    </div>
                                  )}

                                  {/* Numerical Given parameters */}
                                  {qr.given && (
                                    <div className="p-4 rounded-xl border border-teal-500/20 bg-teal-500/5 font-mono">
                                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-teal-400 block mb-1">📐 Given Values</span>
                                      <p className="text-slate-200 leading-relaxed font-light">{qr.given}</p>
                                    </div>
                                  )}

                                  <div>
                                    <h5 className="font-bold text-slate-500 uppercase tracking-widest text-[9px] mb-1">Question</h5>
                                    <p className="text-slate-100 font-medium text-xs sm:text-sm leading-relaxed">{qr.question}</p>
                                  </div>

                                  {/* Color coded options for MCQ / Case-Based / Image-Based */}
                                  {['MCQ', 'Case-Based', 'Image-Based'].includes(qr.type) && qr.options && (
                                    <div className="grid sm:grid-cols-2 gap-3 pb-2">
                                      {qr.options.map((opt, oi) => {
                                        const isUserSelected = qr.user_answer === opt;
                                        const isCorrect = qr.correct_answer === opt;
                                        
                                        let optionBgClass = "bg-slate-900/30 border-white/5 text-slate-400"; // Neutral default
                                        if (isUserSelected) {
                                          optionBgClass = qr.is_correct
                                            ? "bg-emerald-500/25 border-emerald-500/40 text-emerald-200 font-bold"
                                            : "bg-rose-500/25 border-rose-500/40 text-rose-200 font-bold";
                                        } else if (isCorrect) {
                                          optionBgClass = "bg-emerald-500/25 border-emerald-500/40 text-emerald-200 font-bold";
                                        }
                                        
                                        return (
                                          <div key={oi} className={`p-3.5 rounded-xl border text-xs leading-relaxed flex justify-between items-center transition-all ${optionBgClass}`}>
                                            <span>{opt}</span>
                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0
                                              ${isUserSelected 
                                                ? (qr.is_correct ? 'border-emerald-400 bg-emerald-500' : 'border-rose-400 bg-rose-500') 
                                                : (isCorrect ? 'border-emerald-400 bg-emerald-500' : 'border-slate-800')}`}>
                                              {(isUserSelected || isCorrect) && <Check size={10} className="text-white" />}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Non-MCQ solutions */}
                                  {!['MCQ', 'Case-Based', 'Image-Based'].includes(qr.type) && (
                                    <div className="space-y-3">
                                      {qr.user_answer && (
                                        <div className={`p-4 rounded-xl border ${qr.is_correct ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-400' : 'bg-rose-500/5 border-rose-500/15 text-rose-400'}`}>
                                          <span className="text-[9px] font-bold block uppercase tracking-wider mb-1">Your Submission</span>
                                          <p className="font-mono whitespace-pre-wrap leading-relaxed">{qr.user_answer}</p>
                                        </div>
                                      )}
                                      <div className="p-4 rounded-xl border bg-slate-950/60 border-white/5 text-slate-100">
                                        <span className="text-[9px] font-bold block uppercase tracking-wider text-slate-500 mb-1">Correct / Optimal Solution</span>
                                        {qr.type === 'Coding' ? (
                                          <pre className="font-mono text-[11px] leading-relaxed text-emerald-400 bg-slate-950 p-3 rounded-lg border border-white/5 overflow-x-auto whitespace-pre-wrap">
                                            <code>{qr.correct_answer}</code>
                                          </pre>
                                        ) : (
                                          <p className="font-sans leading-relaxed whitespace-pre-wrap text-[11px]">{qr.correct_answer}</p>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Wrong answer diagnostics & pathology */}
                                  {!qr.is_correct && (
                                    <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-xl space-y-2">
                                      {qr.mistake_type && (
                                        <div className="flex items-center gap-2">
                                          <span className="text-[9px] font-extrabold uppercase text-rose-400 font-mono">Error Pathology:</span>
                                          <span className="font-black text-rose-300 uppercase tracking-widest text-[9px] bg-rose-500/15 border border-rose-500/25 px-2 py-0.5 rounded font-mono">{qr.mistake_type}</span>
                                        </div>
                                      )}
                                      {qr.why_user_was_wrong && (
                                        <div>
                                          <strong className="text-rose-400 text-[10px]">Pathology Analysis:</strong>
                                          <p className="text-slate-300 font-light mt-0.5 leading-relaxed">{qr.why_user_was_wrong}</p>
                                        </div>
                                      )}
                                      {qr.concept_to_review && (
                                        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-rose-500/10 text-[10px]">
                                          <strong className="text-slate-400">Concept to Revisit:</strong>
                                          <span className="font-bold text-slate-200 bg-slate-900 px-2 py-0.5 border border-white/5 rounded">{qr.concept_to_review}</span>
                                        </div>
                                      )}
                                      {qr.study_resource && (
                                        <div className="flex items-center gap-2 flex-wrap pt-1 text-[10px]">
                                          <strong className="text-amber-400">Specific Study Resource:</strong>
                                          <span className="italic text-amber-300/80 font-medium">{qr.study_resource}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Rationale and standard textbooks references */}
                                  <div className="pt-3 border-t border-white/5 space-y-2">
                                    {qr.explanation && (
                                      <div>
                                        <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px] block mb-1">Detailed Explanation & Rationale</span>
                                        <p className="text-slate-300 font-light leading-relaxed whitespace-pre-line text-[11px]">{qr.explanation}</p>
                                      </div>
                                    )}
                                    
                                    {qr.reference && (
                                      <div className="p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl flex items-center gap-2.5">
                                        <BookOpen size={14} className="text-amber-400 shrink-0" />
                                        <div className="flex flex-wrap items-baseline gap-1.5 text-[10px]">
                                          <span className="text-amber-400 font-bold font-sans">Verified Reference Standard:</span>
                                          <span className="text-slate-300 font-semibold italic">{qr.reference}</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Actions Panel */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-white/5 no-print">
                    <button type="button" onClick={() => navigate('/dashboard')}
                      className="flex-1 btn-secondary py-4 text-base font-bold rounded-2xl cursor-pointer font-sans">
                      Return to Dashboard
                    </button>
                    {pct < 80 && (
                      <button type="button"
                        onClick={() => { setPhase('select'); setSelectedMode(null); setEvaluationData(null); setTestData(null); setStatus(null); setAnswers({}); setResultsTab('summary'); }}
                        className="flex-1 py-4 text-base font-bold rounded-2xl cursor-pointer bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] font-sans">
                        Reattempt Assessment
                      </button>
                    )}
                  </div>
                </>
              );
            })()}
          </motion.div>
        ) : (
          /* ── Active Test Form ── */
          <form onSubmit={handleVerify} className="space-y-12 select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}>

            {/* Sticky progress bar */}
            <div className="sticky top-6 z-30 glass-panel bg-slate-950/85 p-4 border-white/10 flex items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <Terminal size={18} className="text-indigo-400" />
                <span className="text-xs sm:text-sm font-bold text-white font-mono">sheet_v2.sh</span>
              </div>

              {/* Real-time violation counter */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-400 font-mono text-xs font-black">
                <AlertTriangle size={14} className="animate-pulse" />
                <span>Violations: {violations}/5</span>
              </div>

              {timeLeft !== null && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border font-mono text-xs font-bold transition-all
                  ${timeLeft > 300 ? 'text-emerald-400 border-emerald-500/25 bg-emerald-500/5' :
                    timeLeft > 60 ? 'text-amber-400 border-amber-500/25 bg-amber-500/5' :
                    'text-rose-500 border-rose-500/40 bg-rose-500/10 animate-pulse'}`}>
                  <Clock size={14} />
                  <span>Time Left: {formatTime(timeLeft)}</span>
                </div>
              )}
              <div className="flex items-center gap-3 flex-1 max-w-xs">
                <div className="w-full bg-slate-900 h-2 rounded-full border border-white/5 overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-[10px] font-extrabold text-indigo-400 whitespace-nowrap font-mono">{progress}% Done</span>
              </div>
            </div>

            {/* Exam Navigation Panel */}
            <div className="glass-panel p-4 bg-slate-950/45 border-white/5 rounded-2xl mb-8">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                  <ListOrdered size={12} className="text-indigo-400" /> Exam Navigation Panel
                </span>
                {highlightUnanswered && (
                  <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono animate-pulse">
                    ⚠️ Skipped Questions Highlighted
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {testData?.questions?.map((q, qIdx) => {
                  const isAns = answers[q.id] !== null && answers[q.id] !== undefined && String(answers[q.id]).trim() !== '';
                  const highlight = highlightUnanswered && !isAns;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        const el = document.getElementById(`q-card-${q.id}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className={`w-9 h-9 rounded-lg font-mono text-xs font-bold transition-all duration-150 border flex items-center justify-center cursor-pointer
                        ${isAns 
                          ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-300' 
                          : highlight 
                            ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                            : 'bg-slate-900/40 border-white/5 text-slate-500 hover:border-white/20'}`}
                    >
                      {qIdx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Questions */}
            <div className="space-y-8">
              {testData?.questions?.map((q, idx) => {
                const isAns = answers[q.id] !== null && answers[q.id] !== undefined && String(answers[q.id]).trim() !== '';
                const isHighlighted = highlightUnanswered && !isAns;
                return (
                  <motion.div 
                    key={q.id}
                    id={`q-card-${q.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.02, 0.4) }}
                    className={`glass-panel p-6 bg-slate-900/10 border transition-all duration-200 hover:border-white/10
                      ${isHighlighted 
                        ? 'border-rose-500/40 shadow-[0_0_24px_rgba(239,68,68,0.1)] bg-rose-500/[0.02]' 
                        : 'border-white/5'}`}
                  >

                  {/* Badges */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold tracking-widest uppercase font-mono px-2.5 py-1 rounded-full bg-slate-950 text-indigo-400 border border-indigo-500/10">
                        Question {idx + 1}
                      </span>
                      {isHighlighted && (
                        <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono animate-pulse flex items-center gap-1">
                          <AlertCircle size={10} /> Unanswered
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {q.time_limit_seconds && (
                        <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-white/5 font-mono flex items-center gap-1">
                          <Clock size={10} /> {q.time_limit_seconds >= 60 ? `${Math.round(q.time_limit_seconds/60)}m` : `${q.time_limit_seconds}s`}
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

                  {/* Case block */}
                  {q.type === 'Case-Based' && q.case && (
                    <div className="mb-5 p-4 rounded-xl border border-rose-500/20 bg-rose-500/5">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded bg-rose-500/10 inline-block mb-2">🏥 Clinical Scenario</span>
                      <p className="text-slate-200 text-xs sm:text-sm font-light leading-relaxed">{q.case}</p>
                    </div>
                  )}

                  {/* Image block */}
                  {q.type === 'Image-Based' && q.image_description && (
                    <div className="mb-5 p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded bg-cyan-500/10 inline-block mb-2">🔬 Image / Diagram Finding</span>
                      <p className="text-slate-200 text-xs sm:text-sm font-light leading-relaxed border-l-2 border-cyan-500/30 pl-3 italic">{q.image_description}</p>
                    </div>
                  )}

                  {/* Numerical given block */}
                  {q.type === 'Numerical' && q.given && (
                    <div className="mb-5 p-4 rounded-xl border border-teal-500/20 bg-teal-500/5">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-teal-400 border border-teal-500/20 px-2 py-0.5 rounded bg-teal-500/10 inline-block mb-2">📐 Given Values</span>
                      <p className="text-slate-200 text-xs sm:text-sm font-mono font-light">{q.given}</p>
                    </div>
                  )}

                  {/* Question text */}
                  <h3 className="text-base font-semibold leading-relaxed text-slate-100 mb-5">{q.question}</h3>

                  {/* Reference */}
                  {q.reference && (
                    <div className="mb-4 flex items-center gap-1.5">
                      <span className="text-[9px] uppercase tracking-wider text-amber-400 font-bold">📚 Ref:</span>
                      <span className="text-[10px] text-amber-300/80 font-light italic">{q.reference}</span>
                    </div>
                  )}

                  {/* MCQ options */}
                  {(['MCQ','Case-Based','Image-Based'].includes(q.type)) && q.options && (
                    <div className="grid sm:grid-cols-2 gap-3.5">
                      {q.options.map((opt, oi) => {
                        const sel = answers[q.id] === opt;
                        return (
                          <div key={oi} onClick={() => handleAnswerChange(q.id, opt)}
                            className={`p-4 rounded-xl border text-xs sm:text-sm cursor-pointer transition-all duration-200 font-medium flex justify-between items-center
                              ${sel ? 'bg-indigo-600/25 border-indigo-500 text-white' : 'bg-slate-950/40 border-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200'}`}>
                            <span>{opt}</span>
                            <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${sel ? 'border-indigo-400 bg-indigo-500' : 'border-slate-700'}`}>
                              {sel && <Check size={10} className="text-white" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Coding */}
                  {q.type === 'Coding' && (
                    <div className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4 text-xs font-mono text-slate-400 bg-slate-950/40 p-4 rounded-xl border border-white/5">
                        <div><span className="text-[9px] uppercase tracking-wider text-indigo-400 font-bold block mb-1">Input format</span><p>{q.input_format || 'Standard Input'}</p></div>
                        <div><span className="text-[9px] uppercase tracking-wider text-indigo-400 font-bold block mb-1">Output format</span><p>{q.output_format || 'Standard Output'}</p></div>
                        {q.constraints && <div className="sm:col-span-2 pt-2 border-t border-white/5"><span className="text-[9px] uppercase tracking-wider text-amber-400 font-bold block mb-1">Constraints</span><p className="text-slate-300">{String(q.constraints)}</p></div>}
                        {q.expected_complexity && (
                          <div className="sm:col-span-2 pt-2 border-t border-white/5 flex gap-6">
                            <div><span className="text-[9px] uppercase text-teal-400 font-bold block mb-0.5">Time</span><p className="text-slate-300">{String(q.expected_complexity.time || 'N/A')}</p></div>
                            <div><span className="text-[9px] uppercase text-teal-400 font-bold block mb-0.5">Space</span><p className="text-slate-300">{String(q.expected_complexity.space || 'N/A')}</p></div>
                          </div>
                        )}
                        {q.edge_cases?.length > 0 && (
                          <div className="sm:col-span-2 pt-2 border-t border-white/5">
                            <span className="text-[9px] uppercase tracking-wider text-rose-400 font-bold block mb-1">Edge Cases</span>
                            <ul className="list-disc list-inside space-y-0.5 text-slate-300 font-light pl-1">
                              {q.edge_cases.map((ec, i) => <li key={i}>{typeof ec === 'object' ? JSON.stringify(ec) : String(ec)}</li>)}
                            </ul>
                          </div>
                        )}
                        {q.example && (
                          <div className="sm:col-span-2 pt-2 border-t border-white/5">
                            <span className="text-[9px] uppercase tracking-wider text-purple-400 font-bold block mb-1">Example</span>
                            <div className="grid sm:grid-cols-2 gap-2 text-[11px] bg-[#030014] p-3 rounded-lg border border-white/5">
                              <p><strong className="text-slate-500">In:</strong> {String(q.example.input)}</p>
                              <p><strong className="text-slate-500">Out:</strong> {String(q.example.output)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="relative rounded-xl overflow-hidden border border-white/5 bg-[#030014]">
                        <div className="flex justify-between items-center bg-[#07051a] px-4 py-2 text-[10px] text-slate-500 border-b border-white/5 font-mono">
                          <span>solution.py</span>
                          <span className="text-purple-400 flex items-center gap-1.5"><Code size={12} /> Python 3</span>
                        </div>
                        <textarea required value={answers[q.id] || ''} onChange={e => handleAnswerChange(q.id, e.target.value)}
                          rows={10} placeholder="# Write clean, optimal Python code..."
                          className="w-full bg-[#030014] text-slate-300 font-mono text-xs sm:text-sm p-4 focus:outline-none resize-y leading-relaxed" />
                      </div>
                    </div>
                  )}

                  {/* Theory / Numerical */}
                  {(q.type === 'Theory' || q.type === 'Numerical') && (
                    <div className="relative rounded-xl overflow-hidden border border-white/5 bg-[#030014]">
                      <div className="flex justify-between items-center bg-[#07051a] px-4 py-2 text-[10px] text-slate-500 border-b border-white/5 font-mono">
                        <span>{q.type === 'Numerical' ? 'solution.txt' : 'explanation.txt'}</span>
                        <span className="text-indigo-400 flex items-center gap-1.5"><FileText size={12} /> {q.type === 'Numerical' ? 'Step-by-step Solution' : 'Concept Answer'}</span>
                      </div>
                      <textarea required value={answers[q.id] || ''} onChange={e => handleAnswerChange(q.id, e.target.value)}
                        rows={6}
                        placeholder={q.type === 'Numerical' ? 'Show all steps. State formulas, substitutions, and final answer with units...' : 'Explain the concept, mechanism, and real-world relevance...'}
                        className="w-full bg-[#030014] text-slate-300 font-sans text-xs sm:text-sm p-4 focus:outline-none resize-y leading-relaxed" />
                    </div>
                  )}

                  {/* Fill-in-the-blank */}
                  {q.type === 'Fill-in-the-blank' && (
                    <div className="flex items-center gap-3">
                      <Edit3 size={16} className="text-indigo-400" />
                      <input type="text" required value={answers[q.id] || ''} onChange={e => handleAnswerChange(q.id, e.target.value)}
                        placeholder="Enter the missing term..."
                        className="flex-1 bg-slate-950/40 text-slate-200 border border-white/5 focus:border-indigo-500 focus:outline-none rounded-xl px-4 py-3 text-xs sm:text-sm font-medium transition-all" />
                    </div>
                  )}
                </motion.div>
              );
            })}
            </div>

            {/* Submit dock */}
            <div className="sticky bottom-4 z-40 glass-panel bg-slate-950/85 p-5 border-white/10 shadow-[0_-15px_40px_rgba(0,0,0,0.4)] flex flex-col items-center">
              {status && !evaluationData && (
                <div className={`w-full p-3 rounded-xl text-center mb-4 border flex items-center justify-center gap-2 font-semibold text-sm
                  ${status.success ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/15 border-rose-500/30 text-rose-400'}`}>
                  {status.success ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                  {status.message}
                </div>
              )}
              <button type="submit" disabled={isSubmitting}
                className="btn-primary w-full sm:w-auto px-12 py-3.5 text-base font-bold rounded-xl shadow-lg cursor-pointer disabled:opacity-40 text-white font-sans">
                {isSubmitting
                  ? <><Loader2 className="animate-spin text-white inline mr-2" size={18} />AI Evaluating Submissions...</>
                  : 'Submit Exam for AI Review'}
              </button>
              <p className="text-[10px] text-slate-500 mt-3 text-center font-mono">
                Evaluations process coding complexity, conceptual correctness, and accuracy via the neural pipeline.
              </p>
            </div>
          </form>
        )}
        {/* Pre-submission confirmation modal overlay */}
        <AnimatePresence>
          {showConfirmModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
              <motion.div initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }}
                className="w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-white/10 p-6 rounded-2xl shadow-2xl relative overflow-hidden text-center">
                
                {/* Visual Accent glow */}
                <div className="absolute -top-12 -left-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="mx-auto w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 text-indigo-400">
                  <HelpCircle size={24} />
                </div>

                {totalQ - answered > 0 ? (
                  /* ── Scenario 1: Unanswered questions exist ── */
                  <>
                    <h3 className="text-lg font-black text-white mb-2">Submit Assessment?</h3>
                    <p className="text-slate-400 text-xs font-light mb-5 leading-relaxed">
                      You have <span className="text-rose-400 font-bold">{totalQ - answered}</span> unanswered questions. 
                      Unanswered questions will be marked as Not Attempted and will receive 0 marks. 
                      Are you sure you want to submit?
                    </p>

                    {/* Question count metrics */}
                    <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4 mb-6 text-left space-y-2.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Total questions:</span>
                        <span className="font-bold text-white font-mono">{totalQ}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Attempted:</span>
                        <span className="font-bold text-emerald-400 font-mono">{answered}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Not attempted:</span>
                        <span className="font-bold text-rose-400 font-mono animate-pulse">{totalQ - answered}</span>
                      </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3">
                      <button type="button" 
                        onClick={() => {
                          setShowConfirmModal(false);
                          setHighlightUnanswered(true);
                        }}
                        className="flex-1 py-3 text-xs font-bold rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer font-sans">
                        No, Go Back
                      </button>
                      <button type="button" onClick={submitExam}
                        className="flex-1 py-3 text-xs font-bold rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all cursor-pointer font-sans">
                        Yes, Submit
                      </button>
                    </div>
                  </>
                ) : (
                  /* ── Scenario 2: All questions attempted ── */
                  <>
                    <h3 className="text-lg font-black text-white mb-2">Submit Assessment?</h3>
                    <p className="text-slate-400 text-xs font-light mb-6 leading-relaxed">
                      All questions attempted. Ready to submit?
                    </p>

                    {/* Buttons */}
                    <div className="flex gap-3">
                      <button type="button" 
                        onClick={() => {
                          setShowConfirmModal(false);
                          setHighlightUnanswered(false);
                        }}
                        className="flex-1 py-3 text-xs font-bold rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer font-sans">
                        No, Review First
                      </button>
                      <button type="button" onClick={submitExam}
                        className="flex-1 py-3 text-xs font-bold rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all cursor-pointer font-sans">
                        Yes, Submit
                      </button>
                    </div>
                  </>
                )}

              </motion.div>
            </motion.div>
          )}

          {/* ── Anti-Cheat: Pre-Exam Fullscreen Consent Overlay ── */}
          {showPreExamConsent && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#030014] backdrop-blur-2xl">
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-lg bg-gradient-to-b from-slate-900/90 to-slate-950 border border-amber-500/25 p-8 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.15)] relative overflow-hidden text-center">
                
                {/* Decorative Amber Glow */}
                <div className="absolute -top-12 -left-12 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

                <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-6 text-amber-400">
                  <AlertTriangle size={32} className="animate-pulse" />
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-4 uppercase">Mandatory Fullscreen Lockdown</h2>
                
                <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 mb-6 text-left space-y-3">
                  <p className="text-slate-200 text-xs sm:text-sm font-medium leading-relaxed">
                    This exam requires **fullscreen mode** for anti-cheat verification. 
                  </p>
                  <ul className="text-slate-400 text-[11px] list-disc list-inside space-y-1.5 font-light">
                    <li>Exiting fullscreen will be treated as an immediate **violation**.</li>
                    <li>Switching browser tabs or applications will trigger a **violation**.</li>
                    <li>All sensitive hotkeys (Copy/Paste, DevTools, Inspect) are fully **disabled**.</li>
                    <li>Exceeding **5 violations** automatically submits your exam immediately.</li>
                  </ul>
                </div>

                <p className="text-slate-400 text-xs font-light mb-8 italic">
                  Click 'Start Exam' to enter fullscreen and begin.
                </p>

                <button type="button" onClick={enterFullscreenAndBegin}
                  className="w-full py-4 rounded-2xl text-sm font-black tracking-wide bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-[0_0_30px_rgba(245,158,11,0.3)] cursor-pointer transition-all duration-200 uppercase font-sans">
                  Start Exam & Enter Fullscreen
                </button>
              </motion.div>
            </motion.div>
          )}

          {/* ── Anti-Cheat: Fullscreen Exit Warning Overlay ── */}
          {showFullscreenExitWarning && !showAutoSubmittedModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-2xl">
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-lg bg-gradient-to-b from-slate-900 to-slate-950 border border-rose-500/30 p-8 rounded-3xl shadow-[0_0_50px_rgba(239,68,68,0.2)] relative overflow-hidden text-center">
                
                <div className="absolute -top-12 -left-12 w-36 h-36 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="mx-auto w-16 h-16 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mb-6 text-rose-400">
                  <AlertCircle size={32} className="animate-bounce" />
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-3 uppercase">⚠️ Fullscreen Exited!</h2>
                
                <p className="text-slate-300 text-xs sm:text-sm font-light mb-6 leading-relaxed">
                  You have exited fullscreen! Please return to fullscreen immediately to continue your exam. 
                  **This violation has been recorded.**
                </p>

                <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 mb-8 flex justify-between items-center text-xs">
                  <span className="text-slate-400 uppercase font-bold tracking-wider">Total Recorded Violations</span>
                  <span className="font-extrabold text-rose-400 font-mono text-base">{violations} / 5</span>
                </div>

                <button type="button" onClick={enterFullscreenAndBegin}
                  className="w-full py-4 rounded-2xl text-sm font-black tracking-wide bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white shadow-[0_0_30px_rgba(239,68,68,0.3)] cursor-pointer transition-all duration-200 uppercase font-sans">
                  Return to Fullscreen & Resume
                </button>
              </motion.div>
            </motion.div>
          )}

          {/* ── Anti-Cheat: Tab/Window Switch Warning Overlay ── */}
          {showTabSwitchWarning && !showAutoSubmittedModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-2xl">
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-lg bg-gradient-to-b from-slate-900 to-slate-950 border border-rose-500/30 p-8 rounded-3xl shadow-[0_0_50px_rgba(239,68,68,0.2)] relative overflow-hidden text-center">
                
                <div className="mx-auto w-16 h-16 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mb-6 text-rose-400">
                  <XCircle size={32} className="animate-pulse" />
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-3 uppercase">⚠️ Tab Switch Detected!</h2>
                
                <p className="text-slate-300 text-xs sm:text-sm font-light mb-6 leading-relaxed">
                  Switching tabs or windows during the exam is **strictly prohibited**. 
                  This violation has been logged. Continuing to switch tabs will lead to **automatic submission**.
                </p>

                <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 mb-8 flex justify-between items-center text-xs">
                  <span className="text-slate-400 uppercase font-bold tracking-wider">Total Recorded Violations</span>
                  <span className="font-extrabold text-rose-400 font-mono text-base">{violations} / 5</span>
                </div>

                <button type="button" 
                  onClick={() => {
                    setShowTabSwitchWarning(false);
                    setTimerPaused(false);
                  }}
                  className="w-full py-4 rounded-2xl text-sm font-black tracking-wide bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white shadow-[0_0_30px_rgba(239,68,68,0.3)] cursor-pointer transition-all duration-200 uppercase font-sans">
                  Resume Exam
                </button>
              </motion.div>
            </motion.div>
          )}

          {/* ── Anti-Cheat: 3-Violation Warning Modal ── */}
          {showFinalWarning && !showAutoSubmittedModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
              <motion.div initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }}
                className="w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/30 p-6 rounded-2xl shadow-2xl relative overflow-hidden text-center">
                
                <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-400">
                  <AlertCircle size={24} className="animate-pulse" />
                </div>

                <h3 className="text-lg font-black text-white mb-2 uppercase">Rule Violations Warning</h3>
                <p className="text-slate-300 text-xs font-light mb-6 leading-relaxed">
                  You have violated exam rules **{violations} times**. 
                  One more violation will **auto-submit** your exam immediately.
                </p>

                <button type="button" onClick={() => setShowFinalWarning(false)}
                  className="w-full py-3 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black cursor-pointer transition-all uppercase font-sans">
                  I Understand
                </button>
              </motion.div>
            </motion.div>
          )}

          {/* ── Anti-Cheat: Auto-Submitted Modal ── */}
          {showAutoSubmittedModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
              <motion.div initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }}
                className="w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-red-500/30 p-8 rounded-3xl shadow-[0_0_50px_rgba(239,68,68,0.3)] relative overflow-hidden text-center">
                
                <div className="mx-auto w-16 h-16 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mb-6 text-red-400 animate-bounce">
                  <XCircle size={32} />
                </div>

                <h3 className="text-xl font-black text-white mb-3 uppercase tracking-tight">Exam Auto-Submitted!</h3>
                <p className="text-slate-300 text-xs sm:text-sm font-light mb-8 leading-relaxed">
                  Your exam has been auto-submitted due to repeated fullscreen violations. 
                  All unattempted questions have been marked as Not Attempted.
                </p>

                <button type="button" onClick={() => setShowAutoSubmittedModal(false)}
                  className="w-full py-4 rounded-2xl text-xs font-black tracking-widest bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg cursor-pointer hover:from-rose-600 hover:to-red-700 transition-all uppercase font-sans">
                  View Results Report
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default VerifySkill;
