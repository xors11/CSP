import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QuestionCard from './QuestionCard';
import { HelpCircle, Filter } from 'lucide-react';

export const QuestionBreakdown = ({ questionBreakdown = [] }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [expandedCards, setExpandedCards] = useState({});

  // 1. Pre-sort questions: Wrong first, then Skipped, then Correct.
  const sortedQuestions = useMemo(() => {
    return [...questionBreakdown].sort((a, b) => {
      const getPriority = (q) => {
        if (!q.is_correct && !q.is_skipped) return 0; // Wrong (highest priority)
        if (q.is_skipped) return 1;                   // Skipped (medium priority)
        return 2;                                      // Correct (lowest priority)
      };
      return getPriority(a) - getPriority(b);
    });
  }, [questionBreakdown]);

  // Pre-expand the first incorrect or skipped question on load
  React.useEffect(() => {
    if (sortedQuestions.length > 0) {
      const firstWrongOrSkipped = sortedQuestions.find(q => !q.is_correct);
      if (firstWrongOrSkipped) {
        setExpandedCards({ [firstWrongOrSkipped.question_id || 0]: true });
      } else {
        setExpandedCards({ [sortedQuestions[0].question_id || 0]: true });
      }
    }
  }, [sortedQuestions]);

  // Tab Counts
  const counts = useMemo(() => {
    const res = { all: 0, correct: 0, wrong: 0, skipped: 0 };
    questionBreakdown.forEach(q => {
      res.all++;
      if (q.is_correct) res.correct++;
      else if (q.is_skipped) res.skipped++;
      else res.wrong++;
    });
    return res;
  }, [questionBreakdown]);

  // Client-side Filtered Questions
  const filteredQuestions = useMemo(() => {
    return sortedQuestions.filter(q => {
      if (activeTab === 'correct') return q.is_correct;
      if (activeTab === 'wrong') return !q.is_correct && !q.is_skipped;
      if (activeTab === 'skipped') return q.is_skipped;
      return true;
    });
  }, [sortedQuestions, activeTab]);

  const toggleCard = (id) => {
    setExpandedCards(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <HelpCircle className="text-indigo-400" size={20} /> Question Analysis
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm font-light mt-1">
            Review detailed question submissions. Incorrect responses are grouped at the top.
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-white/5 self-start sm:self-center overflow-x-auto max-w-full">
          {[
            { id: 'all', label: 'All', count: counts.all, color: 'text-indigo-400' },
            { id: 'correct', label: 'Correct', count: counts.correct, color: 'text-emerald-400' },
            { id: 'wrong', label: 'Wrong', count: counts.wrong, color: 'text-rose-400' },
            { id: 'skipped', label: 'Skipped', count: counts.skipped, color: 'text-slate-400' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0
                ${activeTab === tab.id 
                  ? 'bg-white/10 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-black/40 ${tab.color}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Accordion List */}
      <motion.div 
        layout
        className="space-y-4"
      >
        <AnimatePresence mode="popLayout">
          {filteredQuestions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel p-8 text-center text-slate-500 font-light text-sm"
            >
              No questions found matching this filter.
            </motion.div>
          ) : (
            filteredQuestions.map((q, qIdx) => (
              <motion.div
                key={q.question_id || qIdx}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                layoutId={`q-container-${q.question_id || qIdx}`}
              >
                <QuestionCard
                  question={q}
                  index={questionBreakdown.findIndex(item => item.question_id === q.question_id) + 1}
                  isOpen={!!expandedCards[q.question_id || 0]}
                  onToggle={() => toggleCard(q.question_id || 0)}
                />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default QuestionBreakdown;
