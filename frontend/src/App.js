import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import KanbanBoard from "./pages/KanbanBoard";
import CandidateProfile from "./pages/CandidateProfile";
import JobsManagement from "./pages/JobsManagement";
import ComplianceDashboard from "./pages/ComplianceDashboard";
import WithdrawalsPage from "./pages/WithdrawalsPage";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />
        } />
        <Route path="/" element={
          user ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />
        } />
        <Route path="/kanban" element={
          user ? <KanbanBoard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />
        } />
        <Route path="/candidate/:candidateId" element={
          user ? <CandidateProfile user={user} onLogout={handleLogout} /> : <Navigate to="/login" />
        } />
        <Route path="/jobs" element={
          user ? <JobsManagement user={user} onLogout={handleLogout} /> : <Navigate to="/login" />
        } />
        <Route path="/compliance" element={
          user ? <ComplianceDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
