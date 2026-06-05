import React from 'react';
import { motion } from 'framer-motion';
import ResultRadarChart from './ResultRadarChart';

export const TopicPerformance = ({ topicPerformance = [] }) => {
  if (topicPerformance.length === 0) {
    return null;
  }

  // Separate topics by category for the summary lines
  const strongTopics = topicPerformance
    .filter(t => t.status === 'strong')
    .map(t => t.topic);
  const improvementTopics = topicPerformance
    .filter(t => t.status === 'average' || t.status === 'weak')
    .map(t => t.topic);

  // Status visual mappings
  const statusConfig = {
    strong: {
      border: 'border-emerald-500/25',
      bg: 'bg-emerald-950/5',
      text: 'text-emerald-400',
      badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      label: 'Strong',
      icon: '💪'
    },
    average: {
      border: 'border-yellow-500/25',
      bg: 'bg-yellow-950/5',
      text: 'text-yellow-400',
      badge: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
      label: 'Average',
      icon: '📈'
    },
    weak: {
      border: 'border-rose-500/25',
      bg: 'bg-rose-950/5',
      text: 'text-rose-400',
      badge: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
      label: 'Weak',
      icon: '⚠️'
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 15 } }
  };

  return (
    <div className="glass-panel p-6 sm:p-8 bg-slate-900/30 border-white/5 shadow-2xl space-y-6">
      <div>
        <h2 className="text-xl font-black text-white tracking-tight">Competency Radar</h2>
        <p className="text-slate-400 text-xs sm:text-sm font-light mt-1">
          Visual profile across the core topic dimensions evaluated in this exam.
        </p>
      </div>

      <div className="grid md:grid-cols-12 gap-8 items-center">
        {/* Left: Radar Chart */}
        <div className="md:col-span-6 bg-slate-950/30 p-2 rounded-2xl border border-white/5">
          <ResultRadarChart data={topicPerformance} />
        </div>

        {/* Right: Topic Cards */}
        <div className="md:col-span-6 space-y-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 font-mono block">
            Topic Analysis Details
          </span>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-40px' }}
            className="space-y-3 max-h-72 overflow-y-auto pr-1"
          >
            {topicPerformance.map((item, idx) => {
              const cfg = statusConfig[item.status] || statusConfig.average;
              return (
                <motion.div
                  key={idx}
                  variants={itemVariants}
                  className={`p-4 rounded-xl border flex justify-between items-center transition-all ${cfg.border} ${cfg.bg}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg" role="img" aria-label={cfg.label}>
                      {cfg.icon}
                    </span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white leading-tight">
                        {item.topic}
                      </h4>
                      <p className="text-[10px] sm:text-xs text-slate-500 mt-1 font-mono font-light">
                        Accuracy: {item.correct} / {item.total} correct
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-xs sm:text-sm font-black text-white font-mono leading-none">
                      {item.percentage}%
                    </span>
                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>

      {/* Summary Line */}
      <div className="pt-4 border-t border-white/5 space-y-2 text-xs sm:text-sm font-sans font-light">
        {strongTopics.length > 0 && (
          <p className="text-slate-300">
            💪 <strong className="text-emerald-400 font-medium">Your strong areas:</strong> {strongTopics.join(', ')}
          </p>
        )}
        {improvementTopics.length > 0 && (
          <p className="text-slate-300">
            📈 <strong className="text-rose-400 font-medium">Needs improvement:</strong> {improvementTopics.join(', ')}
          </p>
        )}
      </div>
    </div>
  );
};

export default TopicPerformance;
