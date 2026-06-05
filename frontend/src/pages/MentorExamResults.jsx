import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, FileSpreadsheet, Loader2, Users, Search, AlertCircle, ChevronRight } from 'lucide-react';
import { API_URL } from '../config';

export const MentorExamResults = () => {
  const { exam_id } = useParams();
  const navigate = useNavigate();

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_URL}/api/results/exam/${exam_id}`);
        if (!res.ok) {
          throw new Error(`Failed to retrieve exam results (status ${res.status})`);
        }
        const data = await res.json();
        setResults(data);
      } catch (err) {
        console.error('[MentorExamResults] Fetch error:', err);
        setError(err.message || 'Error occurred while loading results.');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [exam_id]);

  // Client-side search filtering
  const filteredResults = results.filter(r => {
    const name = r.student_id?.name || 'unknown';
    const email = r.student_id?.email || '';
    const query = searchTerm.toLowerCase();
    return name.toLowerCase().includes(query) || email.toLowerCase().includes(query);
  });

  // Export Results as CSV
  const handleExportCSV = () => {
    if (results.length === 0) return;

    // Headers
    const headers = ['Student Name', 'Email', 'Score (%)', 'Grade', 'Time Taken (s)', 'Violations', 'Auto Submitted', 'Date'];
    
    // Rows
    const rows = results.map(r => [
      r.student_id?.name || 'Unknown',
      r.student_id?.email || 'N/A',
      r.score_percentage,
      r.grade,
      r.time_taken_seconds,
      r.violation_count,
      r.auto_submitted ? 'Yes' : 'No',
      new Date(r.createdAt).toLocaleString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Exam_Results_${exam_id}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030014] text-slate-100 flex flex-col items-center justify-center p-6">
        <Loader2 className="animate-spin text-indigo-500 mb-4" size={40} />
        <p className="text-slate-400 text-sm font-light">Loading student results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#030014] text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="glass-panel p-8 max-w-md w-full border-rose-500/20 bg-slate-950">
          <AlertCircle size={32} className="text-rose-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Failed to Load Dashboard</h2>
          <p className="text-slate-400 text-xs sm:text-sm mb-6 leading-relaxed">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full btn-primary py-3 text-sm font-bold"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#030014] to-[#0a0028]/40 selection:bg-indigo-500/30 py-8 px-4 sm:px-6 md:px-8">
      {/* Top back */}
      <button 
        onClick={() => navigate('/dashboard')}
        className="fixed top-6 left-6 z-50 text-xs font-bold text-slate-400 bg-slate-900/80 backdrop-blur-md px-4 py-2.5 rounded-full flex items-center gap-2 hover:text-white border border-white/5 transition-colors cursor-pointer"
      >
        <ArrowLeft size={14} /> Back to Dashboard
      </button>

      <div className="max-w-6xl mx-auto space-y-8 pt-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
              <Users className="text-indigo-400" size={28} /> Student Exam Submissions
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm font-light">
              Overview of all student completions, diagnostics, and anti-cheat compliance records.
            </p>
          </div>

          <button
            onClick={handleExportCSV}
            disabled={results.length === 0}
            className="btn-primary py-3 px-5 text-xs sm:text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet size={16} /> Export All as CSV
          </button>
        </div>

        {/* Filters and Table Container */}
        <div className="glass-panel p-6 bg-slate-900/30 border-white/5 shadow-2xl space-y-6">
          
          {/* Search bar */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Search by student name or email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-white/5 focus:border-indigo-500 focus:outline-none rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-slate-200 transition-all font-sans"
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-white/5 bg-slate-950/40">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-[#07051a]">
                  <th className="p-4 font-mono uppercase tracking-wider text-[10px] font-bold text-slate-400">Student Name</th>
                  <th className="p-4 font-mono uppercase tracking-wider text-[10px] font-bold text-slate-400">Email</th>
                  <th className="p-4 font-mono uppercase tracking-wider text-[10px] font-bold text-slate-400 text-center">Score</th>
                  <th className="p-4 font-mono uppercase tracking-wider text-[10px] font-bold text-slate-400 text-center">Grade</th>
                  <th className="p-4 font-mono uppercase tracking-wider text-[10px] font-bold text-slate-400 text-center">Time Taken</th>
                  <th className="p-4 font-mono uppercase tracking-wider text-[10px] font-bold text-slate-400 text-center">Violations</th>
                  <th className="p-4 font-mono uppercase tracking-wider text-[10px] font-bold text-slate-400 text-center">Submit Mode</th>
                  <th className="p-4 font-mono uppercase tracking-wider text-[10px] font-bold text-slate-400">Date</th>
                  <th className="p-4 font-mono uppercase tracking-wider text-[10px] font-bold text-slate-400 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="p-8 text-center text-slate-500 font-light text-xs sm:text-sm">
                      No results match your search parameters.
                    </td>
                  </tr>
                ) : (
                  filteredResults.map((row) => {
                    const studentName = row.student_id?.name || 'Unknown Student';
                    const studentEmail = row.student_id?.email || 'N/A';
                    const score = `${row.score_percentage}%`;
                    const dateStr = new Date(row.createdAt).toLocaleDateString();
                    
                    let gradeColor = 'text-rose-400';
                    if (row.grade === 'S') gradeColor = 'text-amber-400';
                    else if (row.grade === 'A') gradeColor = 'text-emerald-400';
                    else if (row.grade === 'B') gradeColor = 'text-indigo-400';
                    else if (row.grade === 'C') gradeColor = 'text-yellow-400';

                    return (
                      <tr 
                        key={row._id}
                        onClick={() => navigate(`/result/${row._id}`)}
                        className="border-b border-white/5 hover:bg-white/[0.02] cursor-pointer transition-colors"
                      >
                        <td className="p-4 font-bold text-white whitespace-nowrap">{studentName}</td>
                        <td className="p-4 text-slate-400">{studentEmail}</td>
                        <td className="p-4 text-center font-mono font-bold text-white">{score}</td>
                        <td className={`p-4 text-center font-mono font-extrabold ${gradeColor}`}>{row.grade}</td>
                        <td className="p-4 text-center text-slate-400 font-mono">{formatTime(row.time_taken_seconds)}</td>
                        <td className={`p-4 text-center font-mono font-bold ${row.violation_count > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                          {row.violation_count}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${row.auto_submitted ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'}`}>
                            {row.auto_submitted ? 'Auto' : 'Manual'}
                          </span>
                        </td>
                        <td className="p-4 text-slate-400 font-mono whitespace-nowrap">{dateStr}</td>
                        <td className="p-4 text-center">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-white font-bold cursor-pointer transition-all"
                          >
                            Report <ChevronRight size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MentorExamResults;
