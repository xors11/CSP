import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { RotateCcw, Home, FileDown, User, Loader2 } from 'lucide-react';

export const ActionButtons = ({
  scorePercentage = 0,
  domain = '',
  mentorId = null,
  resultId = ''
}) => {
  const navigate = useNavigate();
  const [isDownloading, setIsDownloading] = useState(false);

  const showRetake = scorePercentage < 70;

  const handleRetake = () => {
    navigate(`/verify?subjects=${encodeURIComponent(domain)}`);
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const handleViewMentor = () => {
    // Navigate to dashboard and scroll to the mentor booking section
    navigate('/dashboard');
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('result-page-content');
    if (!element) return;

    setIsDownloading(true);
    try {
      // Temporarily hide action buttons during capture
      const actionButtonsElement = document.getElementById('action-buttons-container');
      if (actionButtonsElement) actionButtonsElement.style.display = 'none';

      const canvas = await html2canvas(element, {
        scale: 1.5, // High-quality rendering
        useCORS: true,
        backgroundColor: '#030014', // Maintain dark theme background
        logging: false
      });

      if (actionButtonsElement) actionButtonsElement.style.display = '';

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`Exam-Result-${domain.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('An error occurred while generating the PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div 
      id="action-buttons-container" 
      className="flex flex-wrap items-center justify-center gap-4 mt-8 pb-12 no-print"
    >
      {/* Retake button - Only if score < 70% */}
      {showRetake && (
        <button
          onClick={handleRetake}
          className="px-6 py-3.5 rounded-xl text-xs sm:text-sm font-bold bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-[0_0_20px_rgba(239,68,68,0.2)] flex items-center gap-2 cursor-pointer"
        >
          <RotateCcw size={16} /> Retake Exam
        </button>
      )}

      {/* View Mentor button - If a mentor is linked */}
      {mentorId && (
        <button
          onClick={handleViewMentor}
          className="px-6 py-3.5 rounded-xl text-xs sm:text-sm font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 flex items-center gap-2 cursor-pointer transition-all"
        >
          <User size={16} /> View Mentor Profile
        </button>
      )}

      {/* Back to Dashboard */}
      <button
        onClick={handleBackToDashboard}
        className="px-6 py-3.5 rounded-xl text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-[0_0_20px_rgba(79,70,229,0.2)] flex items-center gap-2 cursor-pointer"
      >
        <Home size={16} /> Back to Dashboard
      </button>

      {/* Download PDF */}
      <button
        onClick={handleDownloadPDF}
        disabled={isDownloading}
        className="px-6 py-3.5 rounded-xl text-xs sm:text-sm font-bold bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isDownloading ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Generating PDF...
          </>
        ) : (
          <>
            <FileDown size={16} /> Download Result as PDF
          </>
        )}
      </button>
    </div>
  );
};

export default ActionButtons;
