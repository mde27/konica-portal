import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Navbar({ title }) {
  const navigate = useNavigate();
  const username = localStorage.getItem('username') || 'User';

  const handleLogout = () => {
    localStorage.clear(); // Clears fake auth session data
    navigate('/');
  };

  return (
    <nav className="bg-[#003A70] text-white px-6 py-4 flex justify-between items-center shadow-md">
      <div>
        <span className="text-xs uppercase tracking-wider text-blue-200 block">Konica System</span>
        <h1 className="text-xl font-bold">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm bg-[#002850] px-3 py-1.5 rounded-md text-blue-100">
          👤 {username}
        </span>
        <button 
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-1.5 rounded-md transition"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}