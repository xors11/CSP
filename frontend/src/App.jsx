import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Auth from './pages/Auth';
import ProtectedRoute from './components/ProtectedRoute';
import VerifySkill from './pages/VerifySkill';
import Classroom from './pages/Classroom';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/verify" element={<ProtectedRoute><VerifySkill /></ProtectedRoute>} />
        <Route path="/classroom/:roomId" element={<ProtectedRoute><Classroom /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
