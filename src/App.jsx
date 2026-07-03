import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import KonicaAdmin from './pages/KonicaAdmin';
import Technician from './pages/Technician';
import Supervisor from './pages/Supervisor';
import SystemAdmin from './pages/SystemAdmin';
import ProtectedRoute from './components/ProtectedRoute';
import { Analytics } from "@vercel/analytics/next"

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#F5F7FA] font-sans text-gray-800">
        <Routes>
          <Route path="/" element={<Login />} />
          
          <Route path="/konica" element={<ProtectedRoute allowedRole="konica"><KonicaAdmin /></ProtectedRoute>} />
          <Route path="/technician" element={<ProtectedRoute allowedRole="technician"><Technician /></ProtectedRoute>} />
          
          {/* The Business User */}
          <Route path="/supervisor" element={<ProtectedRoute allowedRole="supervisor"><Supervisor /></ProtectedRoute>} />
          
          {/* The Developer (You) */}
          <Route path="/admin" element={<ProtectedRoute allowedRole="admin"><SystemAdmin /></ProtectedRoute>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;