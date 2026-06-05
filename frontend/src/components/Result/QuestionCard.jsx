import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Check, X, AlertCircle, Bookmark, Award } from 'lucide-react';

export const QuestionCard = ({
  question,
  index,
  isOpen,
  onToggle
}) => {
  const {
    question_text,
    options,
    selected_answer,
    correct_answer,
    explanation,
    topic,
    is_correct,
    is_skipped
  } = question;

  // Visual classes based on correctness
  let cardBorder = 'border-white/5';
  let cardBg = 'bg-slate-900/10';
  let statusBadge = '';

  if (is_correct) {
    cardBorder = 'border-emerald-500/20';
    cardBg = 'bg-emerald-950/[0.02]';
    statusBadge = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  } else if (is_skipped) {
    cardBorder = 'border-slate-500/20';
    cardBg = 'bg-slate-900/20';
    statusBadge = 'bg-slate-800 text-slate-400 border border-white/5';
  } else {
    cardBorder = 'border-rose-500/20';
    cardBg = 'bg-rose-950/[0.02]';
    statusBadge = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
  }

  const isMCQ = Array.isArray(options) && options.length > 0;

  return (
    <div className={`glass-panel p-5 border transition-all duration-300 hover:border-white/10 ${cardBorder} ${cardBg}`}>
      {/* Header clickable region */}
      <div 
        className="flex items-start justify-between gap-4 cursor-pointer select-none"
        onClick={onToggle}
      >
        <div className="flex-1 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest font-mono px-2 py-0.5 rounded bg-slate-950 text-indigo-400 border border-indigo-500/10">
              Q{index}
            </span>
            <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono flex items-center gap-1">
              <Bookmark size={9} /> {topic}
            </span>
            <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded font-mono ${statusBadge}`}>
              {is_correct ? 'Correct' : is_skipped ? 'Skipped' : 'Incorrect'}
            </span>
          </div>

          <h3 className="text-sm sm:text-base font-semibold leading-relaxed text-slate-200 pr-4">
            {question_text}
          </h3>
        </div>

        <button 
          type="button"
          className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white shrink-0"
        >
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Accordion Content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pt-5 mt-4 border-t border-white/5 space-y-4">
              
              {/* Option Rendering for MCQs */}
              {isMCQ ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  {options.map((opt, oi) => {
                    const isSelected = selected_answer === opt;
                    const isCorrectOption = correct_answer === opt;
                    
                    let optStyle = 'bg-slate-950/45 border-white/5 text-slate-400';
                    let statusIcon = null;

                    if (isCorrectOption) {
                      optStyle = 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 font-semibold';
                      statusIcon = <Check size={14} className="text-emerald-400" />;
                    } else if (isSelected) {
                      optStyle = 'bg-rose-500/15 border-rose-500/40 text-rose-200 font-semibold';
                      statusIcon = <X size={14} className="text-rose-400" />;
                    }

                    return (
                      <div 
                        key={oi}
                        className={`p-3.5 rounded-xl border text-xs sm:text-sm flex justify-between items-center ${optStyle}`}
                      >
                        <span className="leading-snug pr-2">{opt}</span>
                        {statusIcon && <span className="shrink-0">{statusIcon}</span>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Text Rendering for Theory/Coding/Numerical questions */
                <div className="space-y-3">
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-white/5">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block mb-2 font-mono">
                      Your Submission:
                    </span>
                    {is_skipped ? (
                      <p className="text-xs text-slate-500 italic font-light">Skipped/No answer submitted.</p>
                    ) : (
                      <pre className="text-xs sm:text-sm font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {selected_answer}
                      </pre>
                    )}
                  </div>

                  <div className="bg-emerald-950/10 p-4 rounded-xl border border-emerald-500/25">
                    <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold block mb-2 font-mono">
                      Correct Answer Pattern:
                    </span>
                    <pre className="text-xs sm:text-sm font-mono text-emerald-200 whitespace-pre-wrap leading-relaxed">
                      {correct_answer}
                    </pre>
                  </div>
                </div>
              )}

              {/* Correct Answer Note if MCQ was wrong/skipped */}
              {isMCQ && !is_correct && (
                <div className="text-xs font-medium text-emerald-400 bg-emerald-500/5 px-4 py-2.5 rounded-xl border border-emerald-500/15 flex items-center gap-1.5 font-sans">
                  <Check size={14} /> Correct answer: <strong className="text-emerald-300 font-semibold">{correct_answer}</strong>
                </div>
              )}

              {/* Explanation Block */}
              {explanation && (
                <div className="bg-[#030014]/60 p-4.5 rounded-xl border border-white/5 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-indigo-400">
                    <Award size={14} />
                    <span className="text-[10px] font-black uppercase tracking-wider font-mono">
                      Diagnostic Explanation
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 font-light leading-relaxed">
                    {explanation}
                  </p>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuestionCard;
