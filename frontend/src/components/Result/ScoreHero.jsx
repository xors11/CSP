import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Confetti from 'react-confetti';
import { CheckCircle2, XCircle, SkipForward, Clock, AlertTriangle } from 'lucide-react';

export const ScoreHero = ({
  scorePercentage = 0,
  grade = 'F',
  correct = 0,
  wrong = 0,
  skipped = 0,
  timeTakenSeconds = 0,
  autoSubmitted = false,
  violationCount = 0
}) => {
  const [displayScore, setDisplayScore] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1000,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  });

  // Handle count up on load
  useEffect(() => {
    let start = 0;
    const end = Math.round(scorePercentage);
    if (end === 0) return;
    
    const duration = 1500; // ms
    const incrementTime = Math.max(Math.floor(duration / end), 15);
    
    const timer = setInterval(() => {
      start += 1;
      setDisplayScore(start);
      if (start >= end) {
        clearInterval(timer);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [scorePercentage]);

  // Handle Confetti
  useEffect(() => {
    if (scorePercentage >= 70) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 6000); // Stop confetti after 6s
      return () => clearTimeout(timer);
    }
  }, [scorePercentage]);

  // Window resize handler for confetti
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isPass = scorePercentage >= 70;
  
  // Grade Styles
  const gradeStyles = {
    S: { bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400 font-bold', label: 'S (Outstanding)', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.2)]' },
    A: { bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold', label: 'A (Excellent)', glow: 'shadow-[0_0_20px_rgba(16,185,129,0.2)]' },
    B: { bg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 font-bold', label: 'B (Good)', glow: 'shadow-[0_0_20px_rgba(99,102,241,0.2)]' },
    C: { bg: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 font-bold', label: 'C (Average)', glow: 'shadow-[0_0_20px_rgba(234,179,8,0.2)]' },
    F: { bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400 font-bold', label: 'F (Fail)', glow: 'shadow-[0_0_20px_rgba(244,63,94,0.2)]' }
  }[grade] || { bg: 'bg-slate-500/10 border-slate-500/30 text-slate-400', label: grade, glow: '' };

  // Motivational Messages
  const motivationalMessages = {
    S: "Outstanding! You're ready to teach this domain!",
    A: "Excellent work! Almost perfect!",
    B: "Good job! Keep practicing!",
    C: "You passed! Review your weak areas.",
    F: "Don't give up! Review the concepts and try again."
  }[grade] || "Keep learning and expanding your horizons.";

  // Format Time Taken
  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Circular progress dimensions
  const radius = 80;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scorePercentage / 100) * circumference;

  return (
    <div className="glass-panel p-6 sm:p-8 flex flex-col items-center justify-center text-center overflow-visible bg-slate-900/30 border-white/5 shadow-2xl relative">
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={150}
        />
      )}

      {/* Auto Submitted Banner */}
      {autoSubmitted && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full mb-6 p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs sm:text-sm flex items-center justify-center gap-2 font-medium"
        >
          <AlertTriangle size={16} className="animate-bounce" />
          <span>⚠️ This exam was auto-submitted due to {violationCount} violations</span>
        </motion.div>
      )}

      <div className="flex flex-col md:flex-row items-center justify-around w-full gap-8 mt-2">
        {/* Left: Progress Ring */}
        <div className="relative w-44 h-44 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="88"
              cy="88"
              r={radius}
              stroke="rgba(255, 255, 255, 0.03)"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Glowing path */}
            <motion.circle
              cx="88"
              cy="88"
              r={radius}
              stroke={isPass ? '#10b981' : '#f43f5e'}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          {/* Centered Score */}
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-3xl sm:text-4xl font-black text-white font-display">
              {displayScore}%
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 font-mono mt-1">
              Final Score
            </span>
          </div>
        </div>

        {/* Right: Grade & Motivation & Stats */}
        <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left gap-4">
          <div className="flex items-center gap-3 flex-wrap justify-center md:justify-start">
            <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400 font-mono">
              Diagnostic Grade:
            </span>
            <span className={`px-4.5 py-1 rounded-full text-xs font-black uppercase tracking-widest border ${gradeStyles.bg} ${gradeStyles.glow}`}>
              {gradeStyles.label}
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-slate-200 mt-1 max-w-md">
            {motivationalMessages}
          </h2>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full mt-4 bg-slate-950/35 p-4 rounded-2xl border border-white/5">
            <div className="flex flex-col items-center md:items-start p-2">
              <div className="flex items-center gap-1.5 text-emerald-400 mb-1">
                <CheckCircle2 size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Correct</span>
              </div>
              <span className="text-lg font-black text-white font-mono">{correct}</span>
            </div>

            <div className="flex flex-col items-center md:items-start p-2">
              <div className="flex items-center gap-1.5 text-rose-400 mb-1">
                <XCircle size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Wrong</span>
              </div>
              <span className="text-lg font-black text-white font-mono">{wrong}</span>
            </div>

            <div className="flex flex-col items-center md:items-start p-2">
              <div className="flex items-center gap-1.5 text-amber-400 mb-1">
                <SkipForward size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Skipped</span>
              </div>
              <span className="text-lg font-black text-white font-mono">{skipped}</span>
            </div>

            <div className="flex flex-col items-center md:items-start p-2">
              <div className="flex items-center gap-1.5 text-indigo-400 mb-1">
                <Clock size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Time Taken</span>
              </div>
              <span className="text-lg font-black text-white font-mono">{formatTime(timeTakenSeconds)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScoreHero;
