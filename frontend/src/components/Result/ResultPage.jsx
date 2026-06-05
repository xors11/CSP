import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useResult } from '../../hooks/useResult';
import ScoreHero from './ScoreHero';
import TopicPerformance from './TopicPerformance';
import QuestionBreakdown from './QuestionBreakdown';
import ActionButtons from './ActionButtons';
import { motion } from 'framer-motion';
import { Brain, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';

export const ResultPage = () => {
  const { result_id } = useParams();
  const navigate = useNavigate();
  
  const { result, loading, error } = useResult(result_id);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030014] text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.04),transparent_60%)] pointer-events-none" />
        
        {/* Loading skeleton */}
        <div className="w-full max-w-4xl space-y-8 animate-pulse mt-4">
          <div className="flex flex-col items-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800" />
            <div className="h-6 w-48 bg-slate-800 rounded" />
            <div className="h-4 w-32 bg-slate-850 rounded" />
          </div>

          {/* Hero skeleton */}
          <div className="h-64 bg-slate-900/40 rounded-3xl border border-white/5" />

          {/* Grid skeleton */}
          <div className="grid md:grid-cols-2 gap-8">
            <div className="h-80 bg-slate-900/40 rounded-3xl border border-white/5" />
            <div className="h-80 bg-slate-900/40 rounded-3xl border border-white/5" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#030014] to-[#080020] flex flex-col items-center justify-center p-6 text-center relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.05),transparent_60%)] pointer-events-none" />
        <div className="glass-panel p-8 max-w-md w-full border-rose-500/20 bg-slate-950">
          <div className="inline-flex p-3 rounded-full bg-rose-500/10 text-rose-400 mb-4 border border-rose-500/20">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Error Loading Result</h2>
          <p className="text-slate-400 text-xs sm:text-sm font-light mb-6 leading-relaxed">
            {error || 'The exam result details could not be found or you may not have permission to view it.'}
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full btn-primary py-3 text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(result.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#030014] to-[#0a0028]/40 selection:bg-indigo-500/30 py-8 px-4 sm:px-6 md:px-8">
      {/* Back button */}
      <button 
        onClick={() => navigate('/dashboard')}
        className="fixed top-6 left-6 z-50 text-xs font-bold text-slate-400 bg-slate-900/80 backdrop-blur-md px-4 py-2.5 rounded-full flex items-center gap-2 hover:text-white border border-white/5 transition-colors cursor-pointer no-print"
      >
        <ArrowLeft size={14} /> Back to Dashboard
      </button>

      {/* Main Container */}
      <div 
        id="result-page-content" 
        className="max-w-4xl mx-auto space-y-8 pt-12"
      >
        {/* Header Block */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="text-center space-y-3"
        >
          <div className="inline-flex bg-gradient-to-r from-purple-500 to-indigo-600 p-4 rounded-3xl shadow-[0_0_40px_rgba(79,70,229,0.25)]">
            <Brain size={40} className="text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
            Diagnostic Exam Report
          </h1>
          <p className="text-slate-400 text-sm sm:text-base font-light">
            Domain competency details for <span className="text-indigo-300 font-semibold">{result.domain}</span>
          </p>
          <div className="flex items-center justify-center gap-3 text-[10px] sm:text-xs text-slate-500 font-mono font-light">
            <span>Student: <strong className="text-slate-400">{result.student_id?.name || 'Accreditor'}</strong></span>
            <span>•</span>
            <span>Evaluated on: {formattedDate}</span>
          </div>
        </motion.div>

        {/* Section 1: Score Hero */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <ScoreHero
            scorePercentage={result.score_percentage}
            grade={result.grade}
            correct={result.correct}
            wrong={result.wrong}
            skipped={result.skipped}
            timeTakenSeconds={result.time_taken_seconds}
            autoSubmitted={result.auto_submitted}
            violationCount={result.violation_count}
          />
        </motion.div>

        {/* Section 2: Topic Performance */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <TopicPerformance 
            topicPerformance={result.topic_performance} 
          />
        </motion.div>

        {/* Section 3: Question Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <QuestionBreakdown 
            questionBreakdown={result.question_breakdown} 
          />
        </motion.div>

        {/* Section 4: Action Buttons */}
        <ActionButtons
          scorePercentage={result.score_percentage}
          domain={result.domain}
          mentorId={result.mentor_id}
          resultId={result._id}
        />
      </div>
    </div>
  );
};

export default ResultPage;
