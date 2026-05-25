import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Award, Clock, ShieldCheck, User as UserIcon, LogOut, 
  ArrowRight, Book, CheckCircle, Search, HelpCircle, Calendar,
  Sparkles, GraduationCap, Laptop, ChevronRight, X, Bell, AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem('user')) || { 
      name: 'Student', 
      role: 'student', 
      credits: 100, 
      preferredLanguage: 'English', 
      availableTimings: [] 
    }
  );
  
  const [activeTab, setActiveTab] = useState('selection'); // selection, teach, learn, feed
  const [searchTerm, setSearchTerm] = useState('');
  
  // Categorized subject lists for better visual separation
  const subjectsCategorized = {
    "High School (9th-10th)": [
      '9th Mathematics', '9th Science', '9th Social Studies',
      '10th Mathematics', '10th Science', '10th English'
    ],
    "Intermediate (11th-12th)": [
      '11th Physics', '11th Chemistry', '11th Mathematics',
      '12th Physics', '12th Chemistry', '12th Biology'
    ],
    "Computer Science & B.Tech": [
      'B.Tech Data Structures', 'B.Tech React.js', 'B.Tech Python',
      'B.Tech Machine Learning', 'B.Tech Web Development', 
      'B.Tech Operating Systems', 'B.Tech DBMS', 'B.Tech Computer Networks', 
      'B.Tech Software Engineering', 'B.Tech Java'
    ],
    "Others / Humanities": [
      'Degree Economics'
    ]
  };

  // Flattened list for logic compatibility
  const subjectsList = Object.values(subjectsCategorized).flat();

  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [selectedLearnSubjects, setSelectedLearnSubjects] = useState([]);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    preferredLanguage: user.preferredLanguage || 'English',
    availableTimings: user.availableTimings ? user.availableTimings.join(', ') : 'Evening / Weekend'
  });

  const [mentors, setMentors] = useState([]);
  const [isMentorsLoading, setIsMentorsLoading] = useState(false);
  
  // Booking state
  const [bookingMentor, setBookingMentor] = useState(null);
  const [bookingForm, setBookingForm] = useState({
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
    time: '10:00',
    duration: 60,
    isTrial: false
  });
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');

  // Review state
  const [reviewingSession, setReviewingSession] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: '',
    punctuality: 5,
    communication: 5,
    subjectKnowledge: 5
  });
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState([]);
  const [isSessionsLoading, setIsSessionsLoading] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Reload user profile from server
  const reloadUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch('http://localhost:5000/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.user) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
    } catch (e) {
      console.error('Error reloading profile:', e);
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch('http://localhost:5000/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setNotifications(data);
      }
    } catch (e) {
      console.error('Error fetching notifications:', e);
    }
  };

  // Fetch sessions
  const fetchUserSessions = async () => {
    setIsSessionsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch('http://localhost:5000/api/sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setSessions(data);
      }
    } catch (e) {
      console.error('Error fetching sessions:', e);
    } finally {
      setIsSessionsLoading(false);
    }
  };

  // Mark all notifications as read
  const handleMarkNotificationsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      await fetch('http://localhost:5000/api/notifications/read-all', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) {
      console.error('Error reading notifications:', e);
    }
  };

  // Book a new session
  const handleBookSession = async (e) => {
    e.preventDefault();
    if (!bookingMentor) return;
    
    setIsBookingSubmitting(true);
    setBookingError('');
    
    try {
      const token = localStorage.getItem('token');
      const scheduledAt = new Date(`${bookingForm.date}T${bookingForm.time}:00`);
      
      const response = await fetch('http://localhost:5000/api/sessions/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          mentorId: bookingMentor._id,
          subject: selectedLearnSubjects[0],
          scheduledAt,
          durationMinutes: bookingForm.duration,
          isTrial: bookingForm.isTrial
        })
      });
      const data = await response.json();
      
      if (response.ok) {
        setBookingMentor(null);
        setToastMessage(bookingForm.isTrial 
          ? 'Free trial session requested successfully!' 
          : 'Session requested successfully! Credits held in escrow.'
        );
        setTimeout(() => setToastMessage(null), 5000);
        
        if (data.creditsRemaining !== undefined) {
          const updatedUser = { ...user, credits: data.creditsRemaining };
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
        
        fetchUserSessions();
      } else {
        setBookingError(data.message || 'Failed to book session');
      }
    } catch (err) {
      setBookingError('Server error booking session. Please try again.');
    } finally {
      setIsBookingSubmitting(false);
    }
  };

  // Update session status (Accept / Reject / Cancel)
  const handleUpdateSessionStatus = async (sessionId, status) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/sessions/${sessionId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      
      if (response.ok) {
        setToastMessage(`Session successfully ${status === 'accepted' ? 'accepted' : 'cancelled'}.`);
        setTimeout(() => setToastMessage(null), 5000);
        
        fetchUserSessions();
        reloadUserProfile();
      } else {
        alert(data.message || 'Failed to update session');
      }
    } catch (e) {
      console.error('Error updating session status:', e);
      alert('Error updating session status');
    }
  };

  // Fetch mentors when learn subject is chosen
  useEffect(() => {
    if (selectedLearnSubjects.length > 0) {
      const fetchMentorsList = async () => {
        setIsMentorsLoading(true);
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`http://localhost:5000/api/mentors?subject=${encodeURIComponent(subject)}&t=${Date.now()}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            cache: 'no-store'
          });
          const data = await response.json();
          setMentors(data);
        } catch (e) {
          console.error('Error fetching mentors:', e);
        } finally {
          setIsMentorsLoading(false);
        }
      };
      fetchMentorsList();
    }
  }, [selectedLearnSubjects]);

  // Load initial user sessions & notifications
  useEffect(() => {
    if (localStorage.getItem('token')) {
      fetchNotifications();
      fetchUserSessions();
      reloadUserProfile();
    }
  }, [activeTab]);

  // Socket.IO Notifications Listener
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    const socket = io('http://localhost:5000');
    const userId = user.id || user._id;
    if (userId) {
      socket.emit('register-user', userId);
    }
    
    socket.on('new-notification', (data) => {
      setNotifications(prev => [data, ...prev]);
      setToastMessage(data.message);
      setTimeout(() => setToastMessage(null), 5000);
      
      fetchNotifications();
      fetchUserSessions();
      reloadUserProfile();
    });
    
    return () => {
      socket.disconnect();
    };
  }, [user]);
  
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewingSession) return;
    setIsReviewSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/sessions/${reviewingSession._id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rating: reviewForm.rating,
          comment: reviewForm.comment,
          attributes: {
            punctuality: reviewForm.punctuality,
            communication: reviewForm.communication,
            subjectKnowledge: reviewForm.subjectKnowledge
          }
        })
      });
      const data = await response.json();
      if (response.ok) {
        setReviewingSession(null);
        setToastMessage('Review submitted successfully!');
        setTimeout(() => setToastMessage(null), 5000);
        
        // Reset form
        setReviewForm({
          rating: 5,
          comment: '',
          punctuality: 5,
          communication: 5,
          subjectKnowledge: 5
        });
        
        // Refresh session list
        fetchUserSessions();
      } else {
        alert(data.message || 'Failed to submit review');
      }
    } catch (err) {
      alert('Error submitting review');
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleStartVerification = () => {
    if (selectedSubjects.length > 0) {
      navigate(`/verify?subjects=${encodeURIComponent(selectedSubjects.join(','))}`);
    }
  };

  const handleSelectSubject = (subject) => {
    setSelectedSubjects(prev => 
      prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]
    );
  };
  
  const handleSelectLearnSubject = (subject) => {
    setSelectedLearnSubjects(prev => 
      prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]
    );
  };

  const handleSaveProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/auth/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          preferredLanguage: editForm.preferredLanguage,
          availableTimings: editForm.availableTimings.split(',').map(s => s.trim())
        })
      });
      const data = await response.json();
      if(response.ok) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        setIsEditingProfile(false);
      } else {
        alert(data.message || "Failed to update profile");
      }
    } catch {
      alert("Error updating profile");
    }
  };

  // Filter subjects based on search term
  const filterBySearch = (list) => {
    return list.filter(item => item.toLowerCase().includes(searchTerm.toLowerCase()));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 selection:bg-indigo-500/30">
      
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-indigo-600 border border-indigo-400/30 text-white font-semibold py-3 px-6 rounded-2xl shadow-xl shadow-indigo-500/20 text-xs sm:text-sm flex items-center gap-3 backdrop-blur-md"
          >
            <Sparkles size={16} className="text-amber-300 animate-spin" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Top Navbar */}
      <header className="flex justify-between items-center mb-10 pb-6 border-b border-white/5">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('selection')}>
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-2 rounded-xl shadow-md shadow-indigo-500/20">
            <BookOpen size={24} className="text-white" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">PeerLearn</h2>
        </div>
        
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="bg-amber-500/10 border border-amber-500/25 px-4 py-2 rounded-full flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.05)]">
            <Award size={18} className="text-amber-400" />
            <span className="font-semibold text-amber-300 text-sm">{user.credits} Credits</span>
          </div>

          {/* Notifications Bell */}
          <div className="relative">
            <button 
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications) handleMarkNotificationsRead();
              }}
              className="relative text-slate-400 hover:text-white transition-colors p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 cursor-pointer flex items-center justify-center"
              title="Notifications"
            >
              <Bell size={18} />
              {notifications.some(n => !n.read) && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
              )}
            </button>
            
            <AnimatePresence>
              {showNotifications && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-3 w-80 glass-panel p-4 bg-slate-950/95 border-white/10 z-50 shadow-2xl max-h-96 overflow-y-auto"
                >
                  <div className="flex justify-between items-center pb-2 border-b border-white/5 mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Notifications</h4>
                    <button onClick={() => setShowNotifications(false)} className="text-slate-500 hover:text-white text-xs">Close</button>
                  </div>
                  <div className="space-y-3">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-500 py-4 text-center font-light">No notifications yet.</p>
                    ) : (
                      notifications.map((n) => (
                        <div key={n._id} className={`text-xs p-2.5 rounded-xl border ${n.read ? 'bg-transparent border-transparent text-slate-400' : 'bg-indigo-500/10 border-indigo-500/15 text-slate-200'}`}>
                          <p className="leading-relaxed font-light">{n.message}</p>
                          <span className="text-[9px] text-slate-500 mt-1 block">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(n.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white shadow-md shadow-purple-500/10">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-semibold text-white leading-tight">{user.name}</p>
              <p className="text-[10px] text-slate-400 capitalize">{user.role}</p>
            </div>
            <button 
              onClick={handleLogout} 
              className="text-slate-400 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-white/5" 
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Grid Dashboard Layout */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Main Workspace Feed */}
        <main className="lg:col-span-2">
          
          {/* Path Option Selector */}
          {activeTab === 'selection' && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="min-h-[55vh] flex flex-col justify-center">
              <div className="inline-flex items-center self-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold text-xs mb-6">
                <Sparkles size={12} className="text-indigo-400" /> Start Your Learning Journey
              </div>
              <h1 className="text-4xl md:text-5xl font-black mb-4 text-center tracking-tight text-white leading-tight">
                Welcome back, {user.name}! 👋
              </h1>
              <p className="text-slate-400 text-lg mb-10 text-center max-w-xl mx-auto leading-relaxed">
                What would you like to achieve today? Choose a path below to access live rooms or manage credentials.
              </p>
              
              <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto w-full relative z-10">
                
                {/* Learn Path Card */}
                <div 
                  onClick={() => { setActiveTab('learn'); setSearchTerm(''); }}
                  className="glass-panel p-8 flex flex-col justify-between items-start text-left cursor-pointer group hover:bg-indigo-950/20 border-white/5 hover:border-indigo-500/40 shadow-lg"
                >
                  <div className="bg-indigo-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300">
                    <Book size={28} className="text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2 text-white">Find a Mentor</h3>
                    <p className="text-slate-400 text-sm leading-relaxed mb-6">
                      Browse peer mentors, join live interactive audio/video classrooms, and query expert classmates.
                    </p>
                  </div>
                  <span className="text-indigo-400 text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                    Search Mentors <ArrowRight size={14} />
                  </span>
                </div>
                
                {/* Teach Path Card */}
                <div 
                  onClick={() => { setActiveTab('teach'); setSearchTerm(''); }}
                  className="glass-panel p-8 flex flex-col justify-between items-start text-left cursor-pointer group hover:bg-purple-950/20 border-white/5 hover:border-purple-500/40 shadow-lg"
                >
                  <div className="bg-purple-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300">
                    <ShieldCheck size={28} className="text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2 text-white">Verify to Teach</h3>
                    <p className="text-slate-400 text-sm leading-relaxed mb-6">
                      Verify your proficiency in school or college courses using our AI engine, earn status, and assist others.
                    </p>
                  </div>
                  <span className="text-purple-400 text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                    Start AI Evaluation <ArrowRight size={14} />
                  </span>
                </div>
              </div>
              
              {user.skillsToTeach?.length > 0 && (
                <div className="text-center mt-12">
                  <button onClick={() => setActiveTab('feed')} className="text-slate-400 hover:text-white transition-colors text-sm underline font-medium">
                    Go directly to active classroom feed
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* Active / Upcoming Sessions Feed */}
          {activeTab === 'feed' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="text-3xl font-black text-white">Classroom Feed 📊</h1>
                  <p className="text-slate-400 text-sm mt-1">Join scheduled lectures and active study rooms.</p>
                </div>
                <button onClick={() => setActiveTab('selection')} className="text-indigo-400 hover:text-indigo-300 text-sm font-semibold">
                  Back to Options
                </button>
              </div>
              
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-indigo-300">
                <Clock size={16} /> Active Sessions Now
              </h3>
              
              <div className="flex flex-col gap-4 mb-8">
                <div className="glass-panel p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-indigo-500/20 bg-indigo-950/5">
                  <div className="flex items-center gap-4">
                    <div className="bg-indigo-500/20 p-3 rounded-2xl border border-indigo-500/30">
                      <Laptop size={24} className="text-indigo-400" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">B.Tech Data Structures & Algorithms</h4>
                      <p className="text-slate-400 text-xs mt-1 flex items-center gap-1">
                        Mentor: <span className="text-indigo-300 font-semibold">Alex Chen</span> • Connected 
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block ml-1 animate-pulse"></span>
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => navigate('/classroom/dsa-review')}
                    className="btn-primary py-2 px-5 text-sm shadow-none whitespace-nowrap"
                  >
                    Enter Classroom
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Teach - Subject Certification Selection */}
          {activeTab === 'teach' && (
            <motion.div initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }}>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-3xl font-black text-white">Mentor Accreditation 🎓</h2>
                  <p className="text-slate-400 text-sm mt-1">Select subjects to prove knowledge under AI-proctored evaluation.</p>
                </div>
                <button onClick={() => setActiveTab('selection')} className="text-indigo-400 hover:text-indigo-300 text-sm font-semibold">
                  ← Options
                </button>
              </div>

              {/* Subject Boards */}
              <div className="space-y-6 mb-8">
                {Object.entries(subjectsCategorized).map(([category, list]) => (
                  <div key={category} className="glass-panel p-6 bg-slate-900/20">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                      <GraduationCap size={16} className="text-indigo-400" /> {category}
                    </h3>
                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                      {list.map((subject) => {
                        const isVerified = user.skillsToTeach?.includes(subject);
                        const isSelected = selectedSubjects.includes(subject);
                        
                        return (
                          <div 
                            key={subject}
                            onClick={() => !isVerified && handleSelectSubject(subject)}
                            className={`subject-card p-4 transition-all text-left min-h-[80px]
                              ${isSelected ? 'selected' : ''} 
                              ${isVerified ? 'opacity-60 cursor-not-allowed border-emerald-500/30 bg-emerald-950/5' : 'cursor-pointer hover:border-indigo-500/30'}`}
                          >
                            <span className="font-semibold text-xs sm:text-sm text-slate-200 leading-tight pr-4">{subject}</span>
                            
                            {isVerified && (
                              <div className="absolute top-3 right-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-full p-1 shadow-sm" title="Verified Skill">
                                <CheckCircle size={12} />
                              </div>
                            )}
                            
                            {isSelected && !isVerified && (
                              <div className="absolute top-3 right-3 bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 rounded-full p-1 shadow-sm">
                                <CheckCircle size={12} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/40 border border-white/5 p-4 rounded-2xl">
                <p className="text-xs text-slate-400 max-w-md text-center sm:text-left">
                  You can choose multiple subjects to evaluate concurrently. Pass with &gt;70% to unlock teaching abilities and acquire credits.
                </p>
                <button 
                  onClick={handleStartVerification}
                  disabled={selectedSubjects.length === 0}
                  className={`btn-primary px-8 py-3.5 text-sm w-full sm:w-auto ${selectedSubjects.length === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  Configure AI Assessment ({selectedSubjects.length}) <ChevronRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {/* Learn - Connect with Mentor */}
          {activeTab === 'learn' && (
            <motion.div initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }}>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-3xl font-black text-white">Find a Class 🔍</h2>
                  <p className="text-slate-400 text-sm mt-1">Select the course you need guidance on to find classmates.</p>
                </div>
                <button onClick={() => { setActiveTab('selection'); setSelectedLearnSubjects([]); }} className="text-indigo-400 hover:text-indigo-300 text-sm font-semibold">
                  ← Options
                </button>
              </div>

              {selectedLearnSubjects.length === 0 ? (
                <div className="space-y-6">
                  {/* Search bar */}
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      type="text" 
                      placeholder="Search courses (e.g. Mathematics, Python, Physics)..." 
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 text-white transition-all text-sm"
                    />
                  </div>

                  {Object.entries(subjectsCategorized).map(([category, list]) => {
                    const filtered = filterBySearch(list);
                    if (filtered.length === 0) return null;
                    return (
                      <div key={category} className="glass-panel p-6 bg-slate-900/20">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">{category}</h3>
                        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {filtered.map((subject) => (
                            <div 
                              key={subject}
                              onClick={() => handleSelectLearnSubject(subject)}
                              className="subject-card p-4 hover:border-indigo-500/40 cursor-pointer min-h-[70px] justify-center"
                            >
                              <span className="font-semibold text-xs sm:text-sm text-slate-200">{subject}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-indigo-600/10 border border-indigo-500/20 p-5 rounded-2xl">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-indigo-400 font-bold">Selected Request</span>
                      <h3 className="text-xl font-bold text-white mt-1">{selectedLearnSubjects.join(', ')}</h3>
                    </div>
                    <button 
                      onClick={() => setSelectedLearnSubjects([])} 
                      className="text-indigo-300 hover:text-white text-xs underline font-semibold"
                    >
                      Change Subject
                    </button>
                  </div>
                  
                  <h3 className="text-lg font-bold text-white mb-2">Available Peer Mentors</h3>
                  
                  {isMentorsLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="animate-spin text-indigo-500 mb-2" size={32} />
                      <p className="text-slate-400 text-xs font-light">Loading verified mentors...</p>
                    </div>
                  ) : mentors.length === 0 ? (
                    <div className="glass-panel p-8 text-center text-slate-500 font-light text-sm">
                      No verified mentors found for this subject. Become the first by verifying your skills!
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {mentors.map((mentor) => (
                        <div key={mentor._id} className="glass-panel p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-indigo-500/20 bg-slate-900/30">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg mt-0.5 shrink-0">
                              {mentor.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-lg font-bold text-white">{mentor.name}</h4>
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${mentor.role === 'trial_mentor' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'}`}>
                                  {mentor.role === 'trial_mentor' ? 'Trial Mentor' : 'Verified Mentor'}
                                </span>
                              </div>
                              
                              <p className="text-xs text-slate-400 mt-1 max-w-md font-light leading-relaxed">
                                Verified in: <span className="text-slate-300 font-semibold">{mentor.skillsToTeach?.join(', ')}</span>
                              </p>
                              <p className="text-xs text-slate-400 mt-1 font-light">
                                Availability: <span className="text-indigo-300 font-medium">{mentor.availableTimings?.length > 0 ? mentor.availableTimings.join(', ') : 'Flexible / Weekend'}</span>
                              </p>
                              
                              <div className="flex items-center gap-3 mt-3 text-xs flex-wrap">
                                <span className="text-amber-400 font-semibold">★ {mentor.rating || 5.0}</span> 
                                <span className="text-slate-500">•</span>
                                <span className="text-slate-400">{mentor.totalReviews || 0} reviews</span>
                                <span className="text-slate-500">•</span>
                                <span className="text-emerald-400 font-semibold">{mentor.completedSessions || 0} classes taught</span>
                                <span className="text-slate-500">•</span>
                                <span className="text-indigo-300 font-bold">{mentor.hourlyRate || 20} credits/hr</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex sm:flex-row md:flex-col gap-2 w-full md:w-auto mt-2 md:mt-0">
                            <button 
                              type="button"
                              className="btn-primary py-2.5 px-6 text-xs shadow-none whitespace-nowrap flex-1 text-center justify-center" 
                              onClick={() => setBookingMentor(mentor)}
                            >
                              <Calendar size={14} /> Book Session
                            </button>
                            <button 
                              type="button"
                              className="btn-secondary py-2.5 px-6 text-xs hover:bg-white/10 whitespace-nowrap flex-1 text-center justify-center" 
                              onClick={() => navigate(`/classroom/room-${Math.floor(Math.random()*9000)+1000}`)}
                            >
                              Instant Connect
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}
          {/* Sessions & Classes Hub */}
          {activeTab === 'sessions' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-3xl font-black text-white">My Classes Hub 🗓️</h2>
                  <p className="text-slate-400 text-sm mt-1">Manage scheduled peer learning sessions, accept requests, and join video channels.</p>
                </div>
                <button onClick={() => setActiveTab('selection')} className="text-indigo-400 hover:text-indigo-300 text-sm font-semibold">
                  ← Back to Options
                </button>
              </div>

              {isSessionsLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="animate-spin text-indigo-500 mb-2" size={32} />
                  <p className="text-slate-400 text-xs">Loading schedules...</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Part A: Mentor Dashboard (Incoming requests from students) */}
                  {(user.role === 'mentor' || user.role === 'trial_mentor') && (
                    <div className="glass-panel p-6 bg-slate-900/20 border-white/5 space-y-4">
                      <h3 className="text-lg font-bold text-indigo-300 border-b border-white/5 pb-2 flex items-center gap-2">
                        <Users size={16} /> Incoming Tutor Requests
                      </h3>
                      
                      {sessions.filter(s => s.mentor?._id === (user.id || user._id) && s.status === 'pending').length === 0 &&
                       sessions.filter(s => s.mentor?._id === (user.id || user._id) && s.status === 'accepted').length === 0 ? (
                        <p className="text-xs text-slate-500 py-4 font-light">No active teaching sessions or requests.</p>
                      ) : (
                        <div className="space-y-4">
                          {/* Pending Requests */}
                          {sessions.filter(s => s.mentor?._id === (user.id || user._id) && s.status === 'pending').map(session => (
                            <div key={session._id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl border border-amber-500/25 bg-amber-500/5 gap-4">
                              <div>
                                <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-400">Pending Request</span>
                                <h4 className="text-sm font-bold text-white mt-1">{session.subject} with {session.student?.name}</h4>
                                <p className="text-xs text-slate-400 mt-1 font-light">
                                  Scheduled: {new Date(session.scheduledAt).toLocaleString()} ({session.durationMinutes} min)
                                </p>
                                <span className="text-[11px] text-amber-300 font-semibold block mt-1">Reward: +{session.creditCost} Credits</span>
                              </div>
                              <div className="flex gap-2 w-full sm:w-auto">
                                <button 
                                  onClick={() => handleUpdateSessionStatus(session._id, 'accepted')}
                                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex-1 sm:flex-none cursor-pointer"
                                >
                                  Accept
                                </button>
                                <button 
                                  onClick={() => handleUpdateSessionStatus(session._id, 'cancelled')}
                                  className="px-4 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-red-400 font-semibold text-xs transition-colors flex-1 sm:flex-none cursor-pointer"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          ))}

                          {/* Confirmed Upcoming */}
                          {sessions.filter(s => s.mentor?._id === (user.id || user._id) && s.status === 'accepted').map(session => (
                            <div key={session._id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/5 gap-4">
                              <div>
                                <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-400">Confirmed Class</span>
                                <h4 className="text-sm font-bold text-white mt-1">{session.subject} with {session.student?.name}</h4>
                                <p className="text-xs text-slate-400 mt-1 font-light">
                                  Scheduled: {new Date(session.scheduledAt).toLocaleString()} ({session.durationMinutes} min)
                                </p>
                              </div>
                              <div className="flex gap-2 w-full sm:w-auto">
                                <button 
                                  onClick={() => navigate(`/classroom/room-${session._id}`)}
                                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex-1 sm:flex-none cursor-pointer"
                                >
                                  Enter Classroom
                                </button>
                                <button 
                                  onClick={() => handleUpdateSessionStatus(session._id, 'cancelled')}
                                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-semibold text-xs transition-colors flex-1 sm:flex-none cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Part B: Student Dashboard (Outgoing requests & booked mentors) */}
                  <div className="glass-panel p-6 bg-slate-900/20 border-white/5 space-y-4">
                    <h3 className="text-lg font-bold text-indigo-300 border-b border-white/5 pb-2 flex items-center gap-2">
                      <BookOpen size={16} /> My Learning Schedule
                    </h3>
                    
                    {sessions.filter(s => s.student?._id === (user.id || user._id) && s.status === 'pending').length === 0 &&
                     sessions.filter(s => s.student?._id === (user.id || user._id) && s.status === 'accepted').length === 0 ? (
                      <p className="text-xs text-slate-500 py-4 font-light">No booked learning sessions or requests.</p>
                    ) : (
                      <div className="space-y-4">
                        {/* Pending Requests */}
                        {sessions.filter(s => s.student?._id === (user.id || user._id) && s.status === 'pending').map(session => (
                          <div key={session._id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl border border-white/5 bg-slate-950/20 gap-4">
                            <div>
                              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Waiting for Mentor</span>
                              <h4 className="text-sm font-bold text-white mt-1">{session.subject} with {session.mentor?.name}</h4>
                              <p className="text-xs text-slate-400 mt-1 font-light">
                                Scheduled: {new Date(session.scheduledAt).toLocaleString()} ({session.durationMinutes} min)
                              </p>
                              <span className="text-[11px] text-slate-400 block mt-1">Escrow held: {session.creditCost} Credits</span>
                            </div>
                            <button 
                              onClick={() => handleUpdateSessionStatus(session._id, 'cancelled')}
                              className="px-4 py-2 rounded-lg bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 font-semibold text-xs transition-colors w-full sm:w-auto cursor-pointer"
                            >
                              Cancel Booking
                            </button>
                          </div>
                        ))}

                        {/* Confirmed Upcoming */}
                        {sessions.filter(s => s.student?._id === (user.id || user._id) && s.status === 'accepted').map(session => (
                          <div key={session._id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl border border-indigo-500/25 bg-indigo-950/5 gap-4">
                            <div>
                              <span className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-400">Confirmed Lesson</span>
                              <h4 className="text-sm font-bold text-white mt-1">{session.subject} with {session.mentor?.name}</h4>
                              <p className="text-xs text-slate-400 mt-1 font-light">
                                Scheduled: {new Date(session.scheduledAt).toLocaleString()} ({session.durationMinutes} min)
                              </p>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                              <button 
                                onClick={() => navigate(`/classroom/room-${session._id}`)}
                                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex-1 sm:flex-none cursor-pointer"
                              >
                                Enter Classroom
                              </button>
                              <button 
                                onClick={() => handleUpdateSessionStatus(session._id, 'cancelled')}
                                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-semibold text-xs transition-colors flex-1 sm:flex-none cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Part C: Session History */}
                  {sessions.filter(s => ['completed', 'cancelled'].includes(s.status)).length > 0 && (
                    <div className="glass-panel p-6 bg-slate-900/10 border-white/5 space-y-4">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Session History</h3>
                      <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        {sessions.filter(s => ['completed', 'cancelled'].includes(s.status)).map(session => {
                          const isTutor = session.mentor?._id === (user.id || user._id);
                          return (
                            <div key={session._id} className="flex justify-between items-center text-xs p-3 rounded-lg bg-slate-950/20 border border-white/5">
                              <div>
                                <p className="font-semibold text-slate-300">
                                  {session.subject} ({isTutor ? `Taught ${session.student?.name}` : `Learned from ${session.mentor?.name}`})
                                </p>
                                <span className="text-[10px] text-slate-500 block mt-0.5">{new Date(session.scheduledAt).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${session.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                  {session.status}
                                </span>
                                {session.status === 'completed' && !isTutor && (
                                  <button
                                    onClick={() => setReviewingSession(session)}
                                    className="px-2.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 font-semibold text-[10px] cursor-pointer"
                                  >
                                    Review Tutor
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </main>

        {/* Sidebar Container */}
        <aside className="space-y-6">
          
          {/* Profile Card */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-panel p-6 relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 blur-[45px] rounded-full pointer-events-none"></div>
            
            <h3 className="text-lg font-bold mb-5 flex items-center gap-2 text-white">
              <UserIcon size={18} className="text-indigo-400" /> Account Stats
            </h3>
            
            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center pb-3 border-b border-white/5">
                <span className="text-slate-400">System Role</span>
                <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-3 py-0.5 rounded-full text-xs font-semibold capitalize">
                  {user.role}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-white/5">
                <span className="text-slate-400">Language</span>
                <span className="font-semibold text-white">{user.preferredLanguage || 'English'}</span>
              </div>
              <div className="flex justify-between items-start pb-3 border-b border-white/5">
                <span className="text-slate-400">Availability</span>
                <span className="font-semibold text-white text-right max-w-[150px] leading-snug">
                  {user.availableTimings?.length > 0 ? user.availableTimings.join(', ') : 'Not set'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Focus Score</span>
                <span className="font-bold text-emerald-400">100%</span>
              </div>
              
              <button 
                onClick={() => setActiveTab('sessions')} 
                className="w-full btn-primary py-2.5 text-xs mt-4 font-semibold justify-center flex items-center gap-1.5"
              >
                <Calendar size={14} /> My Scheduled Classes
              </button>

              <button 
                onClick={() => setIsEditingProfile(true)} 
                className="w-full btn-secondary py-2.5 text-xs mt-2 font-semibold hover:bg-white/10"
              >
                Edit Preferences
              </button>
            </div>
          </motion.div>

          {/* Become a Mentor info */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ delay: 0.1 }} 
            className="glass-panel p-6 bg-gradient-to-b from-slate-900/40 to-purple-950/20"
          >
            <h3 className="text-base font-bold mb-2 text-white flex items-center gap-2">
              <ShieldCheck size={18} className="text-purple-400" /> Peer Certification
            </h3>
            <p className="text-slate-400 text-xs mb-5 leading-relaxed font-light">
              Become a verified helper in any topic by taking our dynamic AI evaluation. Prove your logic and coding chops to earn credits!
            </p>
            <button 
              onClick={() => setActiveTab('teach')} 
              className="btn-primary w-full py-2.5 text-xs shadow-none font-semibold"
            >
              Configure Verification Exam
            </button>
          </motion.div>
          
          {/* Quick FAQ / Help */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ delay: 0.2 }} 
            className="glass-panel p-6 bg-slate-900/10 border-white/5"
          >
            <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <HelpCircle size={16} className="text-slate-400" /> Platform Guidelines
            </h4>
            <ul className="text-[11px] text-slate-500 space-y-2 list-disc pl-4 leading-normal font-light">
              <li>Keep camera active during peer discussions.</li>
              <li>Ghosting warnings trigger if you leave the browser tab active.</li>
              <li>Credits are deducted based on hourly connect rates.</li>
            </ul>
          </motion.div>
        </aside>
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditingProfile && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel p-6 sm:p-8 max-w-md w-full relative bg-slate-950 border-white/10"
            >
              <button 
                onClick={() => setIsEditingProfile(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
              
              <h2 className="text-2xl font-bold mb-6 text-white">Preferences Setup</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-2 uppercase tracking-wider text-slate-400">Preferred Language</label>
                  <input 
                    type="text" 
                    value={editForm.preferredLanguage} 
                    onChange={e => setEditForm({...editForm, preferredLanguage: e.target.value})} 
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-2 uppercase tracking-wider text-slate-400">Availability (comma separated)</label>
                  <input 
                    type="text" 
                    value={editForm.availableTimings} 
                    onChange={e => setEditForm({...editForm, availableTimings: e.target.value})} 
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 text-sm" 
                    placeholder="e.g. Weekends, Evenings, Mon-Wed 5PM"
                  />
                </div>
                
                <div className="flex gap-3 mt-8">
                  <button onClick={() => setIsEditingProfile(false)} className="flex-1 btn-secondary py-3 text-sm">Cancel</button>
                  <button onClick={handleSaveProfile} className="flex-1 btn-primary shadow-none py-3 text-sm">Save Preferences</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Booking Modal */}
      <AnimatePresence>
        {bookingMentor && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel p-6 sm:p-8 max-w-md w-full relative bg-slate-950 border-white/10"
            >
              <button 
                type="button"
                onClick={() => setBookingMentor(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
              
              <h2 className="text-2xl font-bold mb-2 text-white">Book a Lecture 🗓️</h2>
              <p className="text-slate-400 text-xs mb-6 font-light">
                Request a scheduled learning session with <span className="text-indigo-400 font-semibold">{bookingMentor.name}</span> for <span className="text-slate-300 font-semibold">"{selectedLearnSubjects[0]}"</span>.
              </p>
              
              <form onSubmit={handleBookSession} className="space-y-4">
                {/* Cost Estimation */}
                <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs flex justify-between items-center mb-2">
                  <span className="text-slate-400 font-medium">Estimated Cost:</span>
                  <span className="text-indigo-300 font-bold text-sm">
                    {bookingForm.isTrial ? '0 Credits (FREE Trial)' : `${Math.round((bookingMentor.hourlyRate || 20) * (bookingForm.duration / 60))} Credits`}
                  </span>
                </div>

                {/* Free Trial Option */}
                <div className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-slate-900/40">
                  <input 
                    type="checkbox" 
                    id="isTrial"
                    checked={bookingForm.isTrial}
                    onChange={e => setBookingForm({...bookingForm, isTrial: e.target.checked})}
                    className="w-4 h-4 bg-slate-900 border-white/10 rounded accent-indigo-600 cursor-pointer"
                  />
                  <label htmlFor="isTrial" className="text-xs text-slate-300 select-none cursor-pointer font-medium">
                    Request as Free Trial Session (0 credits, limit 1 per mentor)
                  </label>
                </div>

                {/* Mentor availability */}
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Mentor's Availability</span>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-white/5 text-xs text-slate-400 leading-snug font-light">
                    {bookingMentor.availableTimings?.length > 0 ? bookingMentor.availableTimings.join(', ') : 'Flexible availability ( TBD )'}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Date</label>
                    <input 
                      type="date" 
                      required
                      value={bookingForm.date} 
                      onChange={e => setBookingForm({...bookingForm, date: e.target.value})} 
                      min={new Date(Date.now() + 86400000).toISOString().split('T')[0]} // tomorrow onwards
                      className="w-full bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 text-sm font-mono" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Time</label>
                    <input 
                      type="time" 
                      required
                      value={bookingForm.time} 
                      onChange={e => setBookingForm({...bookingForm, time: e.target.value})} 
                      className="w-full bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 text-sm font-mono" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Duration</label>
                  <select 
                    value={bookingForm.duration} 
                    onChange={e => setBookingForm({...bookingForm, duration: parseInt(e.target.value)})} 
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 text-sm"
                  >
                    <option value={30}>30 Minutes</option>
                    <option value={60}>1 Hour (Standard)</option>
                    <option value={90}>1.5 Hours</option>
                    <option value={120}>2 Hours</option>
                  </select>
                </div>

                {bookingError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs flex items-start gap-2">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span className="leading-snug">{bookingError}</span>
                  </div>
                )}
                
                <div className="flex gap-3 mt-8">
                  <button 
                    type="button" 
                    onClick={() => setBookingMentor(null)} 
                    className="flex-1 btn-secondary py-3 text-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isBookingSubmitting}
                    className="flex-1 btn-primary shadow-none py-3 text-sm cursor-pointer"
                  >
                    {isBookingSubmitting ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      'Request Booking'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Review Modal */}
      <AnimatePresence>
        {reviewingSession && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel p-6 sm:p-8 max-w-md w-full relative bg-slate-950 border-white/10"
            >
              <button 
                type="button"
                onClick={() => setReviewingSession(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
              
              <h2 className="text-2xl font-bold mb-2 text-white">Evaluate Mentor ⭐</h2>
              <p className="text-slate-400 text-xs mb-6 font-light">
                Submit a rating and review for your session on <span className="text-indigo-400 font-semibold">"{reviewingSession.subject}"</span> with <span className="text-slate-300 font-semibold">{reviewingSession.mentor?.name}</span>.
              </p>
              
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                {/* Star Rating Select */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Overall Rating</label>
                  <select 
                    value={reviewForm.rating} 
                    onChange={e => setReviewForm({...reviewForm, rating: parseInt(e.target.value)})} 
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 text-sm font-semibold"
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ 5 - Excellent</option>
                    <option value={4}>⭐⭐⭐⭐ 4 - Good</option>
                    <option value={3}>⭐⭐⭐ 3 - Average</option>
                    <option value={2}>⭐⭐ 2 - Disappointing</option>
                    <option value={1}>⭐ 1 - Poor</option>
                  </select>
                </div>

                {/* Granular Attributes */}
                <div className="space-y-3 p-4 rounded-xl border border-white/5 bg-slate-900/20">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Detailed Attributes</span>
                  
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Punctuality:</span>
                    <select 
                      value={reviewForm.punctuality} 
                      onChange={e => setReviewForm({...reviewForm, punctuality: parseInt(e.target.value)})} 
                      className="bg-slate-900 border border-slate-800 rounded p-1 text-slate-200"
                    >
                      {[5,4,3,2,1].map(v => <option key={v} value={v}>{v} Stars</option>)}
                    </select>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Communication:</span>
                    <select 
                      value={reviewForm.communication} 
                      onChange={e => setReviewForm({...reviewForm, communication: parseInt(e.target.value)})} 
                      className="bg-slate-900 border border-slate-800 rounded p-1 text-slate-200"
                    >
                      {[5,4,3,2,1].map(v => <option key={v} value={v}>{v} Stars</option>)}
                    </select>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Subject Knowledge:</span>
                    <select 
                      value={reviewForm.subjectKnowledge} 
                      onChange={e => setReviewForm({...reviewForm, subjectKnowledge: parseInt(e.target.value)})} 
                      className="bg-slate-900 border border-slate-800 rounded p-1 text-slate-200"
                    >
                      {[5,4,3,2,1].map(v => <option key={v} value={v}>{v} Stars</option>)}
                    </select>
                  </div>
                </div>

                {/* Comment Text */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Comment / Feedback</label>
                  <textarea 
                    value={reviewForm.comment}
                    onChange={e => setReviewForm({...reviewForm, comment: e.target.value})}
                    placeholder="Tell us what went well or what could be improved..."
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 text-sm h-24 resize-none"
                    maxLength={500}
                  />
                </div>
                
                <div className="flex gap-3 mt-8">
                  <button 
                    type="button" 
                    onClick={() => setReviewingSession(null)} 
                    className="flex-1 btn-secondary py-3 text-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isReviewSubmitting}
                    className="flex-1 btn-primary shadow-none py-3 text-sm cursor-pointer"
                  >
                    {isReviewSubmitting ? <Loader2 className="animate-spin" size={16} /> : 'Submit Review'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
