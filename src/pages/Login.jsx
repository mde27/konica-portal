import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import logo1 from '../assets/logo_konica.png';
import logo2 from '../assets/logo_mutantii.png';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const API_URL = "https://script.google.com/macros/s/AKfycbw07COOO4-hmQ3wGQ-9erc4qcEVS_NvyKBLOAGye24KoqQrXXmtmvUNoktjVVyG1Cej/exec";

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return alert('Enter both username and password');

    setIsLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "login", username, password })
      });

      const result = await response.json();

      if (result.status === "success") {
        localStorage.setItem('userRole', result.role);
        localStorage.setItem('username', username);

        // Route based on the 4 roles
        if (result.role === 'admin') navigate('/admin');
        else if (result.role === 'supervisor') navigate('/supervisor');
        else navigate(`/${result.role}`);

      } else {
        alert(result.message);
      }
    } catch (error) {
      alert("Network error connecting to database.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F7FA] px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-md border border-gray-100">

        {/* HEADER SECTION: Flexbox container for logos + title */}
        <div className="flex items-center justify-center gap-x-4 mb-8">
          <img src={logo1} alt="Logo 1" className="h-12 w-auto object-contain" />

          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-[#003A70] tracking-tight">KMBS - MUTANȚII</h1>
            <p className="text-xs text-gray-500">Work Tracking Portal</p>
          </div>

          <img src={logo2} alt="Logo 2" className="h-12 w-auto object-contain" />
        </div>

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none" />
          </div>
          <button type="submit" disabled={isLoading} className="w-full bg-[#003A70] hover:bg-[#002850] text-white py-2.5 rounded-lg transition mt-2">
            {isLoading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

      </div>
    </div>
  );
}