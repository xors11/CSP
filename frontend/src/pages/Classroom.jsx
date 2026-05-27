import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import Peer from 'simple-peer';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Video, Mic, PhoneOff, AlertTriangle, Users, Loader2, 
  MicOff, VideoOff, ShieldAlert, Sparkles, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../config';

const socket = io(API_URL);

const Classroom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [peers, setPeers] = useState([]);
  const [stream, setStream] = useState(null);
  const [peerGhosting, setPeerGhosting] = useState(false);
  
  // Local control states
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  const userVideo = useRef();
  const peersRef = useRef([]);

  function createPeer(userToSignal, callerID, stream) {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    });

    peer.on('signal', (signal) => {
      socket.emit('offer', { userToSignal, callerID, signal });
    });

    return peer;
  }

  function addPeer(incomingSignal, callerID, stream) {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
    });

    peer.on('signal', (signal) => {
      socket.emit('answer', { signal, callerID });
    });

    peer.signal(incomingSignal);
    return peer;
  }

  const [loading, setLoading] = useState(true);
  const [handshakeError, setHandshakeError] = useState('');
  const [sessionToken, setSessionToken] = useState('');

  useEffect(() => {
    const runHandshake = async () => {
      try {
        const token = localStorage.getItem('token');
        const sessionId = roomId.replace('room-', '');
        
        const response = await fetch(`${API_URL}/api/sessions/${sessionId}/handshake`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        
        if (response.ok) {
          setSessionToken(data.token);
          setLoading(false);
        } else {
          setHandshakeError(data.message || 'Access authorization failed');
          setLoading(false);
        }
      } catch (err) {
        setHandshakeError('Network error connecting to classroom gateway');
        setLoading(false);
      }
    };
    
    runHandshake();
  }, [roomId]);

  useEffect(() => {
    if (!sessionToken) return;

    let localStream = null;

    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((currentStream) => {
      setStream(currentStream);
      localStream = currentStream;
      if (userVideo.current) {
        userVideo.current.srcObject = currentStream;
      }

      socket.emit('join-room', roomId, sessionToken);

      socket.on('user-connected', (userId) => {
        const peer = createPeer(userId, socket.id, currentStream);
        peersRef.current.push({
          peerID: userId,
          peer,
        });
        setPeers((users) => [...users, peer]);
      });

      socket.on('offer', (payload) => {
        const peer = addPeer(payload.signal, payload.callerID, currentStream);
        peersRef.current.push({
          peerID: payload.callerID,
          peer,
        });
        setPeers((users) => [...users, peer]);
      });

      socket.on('answer', (payload) => {
        const item = peersRef.current.find((p) => p.peerID === payload.id);
        if (item) {
          item.peer.signal(payload.signal);
        }
      });
      
      socket.on('peer-ghost-detected', (data) => {
        setPeerGhosting(data.isGhosting);
      });

      socket.on('error-msg', (msg) => {
        alert(msg);
        navigate('/dashboard');
      });
    });

    // Ghost Detection logic
    const handleVisibilityChange = () => {
      const hidden = document.hidden;
      socket.emit('ghost-detected', { roomId, isGhosting: hidden });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      socket.disconnect();
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [roomId, sessionToken]);

  const endSession = async () => {
    try {
      const token = localStorage.getItem('token');
      const sessionId = roomId.replace('room-', '');
      await fetch(`${API_URL}/api/sessions/${sessionId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (e) {
      console.error('Error completing session:', e);
    }

    socket.disconnect();
    if(stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    navigate('/dashboard');
  };

  const toggleMic = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030014] text-slate-100 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500 mb-4" size={48} />
        <p className="text-sm font-medium tracking-wide uppercase text-indigo-400/80">Securing Classroom Link...</p>
      </div>
    );
  }

  if (handshakeError) {
    return (
      <div className="min-h-screen bg-[#030014] text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="glass-panel p-8 max-w-md w-full border border-rose-500/20 bg-rose-950/5 text-center flex flex-col items-center">
          <ShieldAlert className="text-rose-400 mb-4" size={48} />
          <h2 className="text-xl font-bold text-white mb-2">Classroom Access Denied</h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">{handshakeError}</p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary w-full py-2.5 text-xs font-semibold cursor-pointer">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-6 bg-[#030014] text-slate-100 selection:bg-indigo-500/30 overflow-hidden relative">
      
      {/* Top Header Panel */}
      <header className="glass-panel px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 border-white/5 bg-slate-950/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Users size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white leading-tight">Virtual Classroom</h2>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">Room ID: {roomId}</p>
          </div>
        </div>
        
        {/* Ghost Alarm warning card */}
        <AnimatePresence>
          {peerGhosting ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-rose-500/15 text-rose-400 px-4 py-2 rounded-xl flex items-center gap-2.5 border border-rose-500/30 animate-heartbeat"
            >
              <ShieldAlert size={16} /> 
              <span className="font-semibold text-xs tracking-wide">Warning: Peer is out of browser focus!</span>
            </motion.div>
          ) : (
            <div className="bg-slate-900 border border-white/5 px-4 py-2 rounded-xl flex items-center gap-2">
              <Activity size={14} className="text-emerald-400 animate-pulse" />
              <span className="text-[11px] font-bold text-slate-400">Secure WebRTC Link Active</span>
            </div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Video Stream Matrix */}
      <div className="flex-1 grid md:grid-cols-2 gap-6 min-h-[50vh]">
        
        {/* Local Stream View */}
        <div className="glass-panel overflow-hidden relative rounded-2xl flex flex-col border-white/5 bg-slate-950/80 shadow-2xl">
          {isVideoOff ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-slate-950">
              <VideoOff size={48} className="text-slate-600 mb-2" />
              <span className="text-xs font-semibold uppercase tracking-wider">Video Paused</span>
            </div>
          ) : (
            <video muted ref={userVideo} autoPlay playsInline className="w-full h-full object-cover flex-1 bg-black/60" />
          )}
          
          <div className="absolute bottom-4 left-4 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 flex items-center gap-1.5 text-white shadow-md">
            <span>You</span>
            {isMuted && <MicOff size={12} className="text-rose-400" />}
          </div>
        </div>

        {/* Remote Stream View */}
        <div className="glass-panel overflow-hidden relative rounded-2xl flex flex-col border-white/5 bg-slate-950/80 shadow-2xl">
          {peers.length > 0 ? (
            <div className="w-full h-full flex-1 relative flex">
              {peers.map((peer, index) => (
                <VideoComponent key={index} peer={peer} />
              ))}
              
              <div className="absolute bottom-4 left-4 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 flex items-center gap-1.5 text-white shadow-md">
                <span>Classmate</span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-slate-950">
              <Loader2 className="animate-spin mb-4 text-indigo-500" size={36} />
              <p className="text-xs font-medium tracking-wide uppercase text-indigo-400/80">Awaiting Peer Connection...</p>
              <p className="text-[10px] text-slate-600 mt-1 leading-normal max-w-xs text-center font-light">
                Give your peer access to this Room ID link to establish direct WebRTC audio/video sync.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Call Controllers bar */}
      <div className="flex justify-center items-center gap-5 mt-8">
        
        {/* Toggle Mic Button */}
        <button 
          onClick={toggleMic}
          className={`rounded-full w-12 h-12 flex items-center justify-center p-0 transition-all border cursor-pointer
            ${isMuted 
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20' 
              : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10 hover:border-white/20'}`}
          title={isMuted ? "Unmute Mic" : "Mute Mic"}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        {/* Toggle Video Button */}
        <button 
          onClick={toggleVideo}
          className={`rounded-full w-12 h-12 flex items-center justify-center p-0 transition-all border cursor-pointer
            ${isVideoOff 
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20' 
              : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10 hover:border-white/20'}`}
          title={isVideoOff ? "Start Camera" : "Stop Camera"}
        >
          {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
        </button>

        {/* End Call Button */}
        <button 
          onClick={endSession}
          className="bg-rose-600 hover:bg-rose-500 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg shadow-rose-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="Disconnect Call"
        >
          <PhoneOff size={24} />
        </button>
      </div>
    </div>
  );
};

const VideoComponent = (props) => {
  const ref = useRef();
  useEffect(() => {
    props.peer.on("stream", stream => {
      if (ref.current) {
        ref.current.srcObject = stream;
      }
    });
  }, [props.peer]);
  
  return (
    <video playsInline autoPlay ref={ref} className="w-full h-full object-cover bg-black/60" />
  );
};

export default Classroom;
