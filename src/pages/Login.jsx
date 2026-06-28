import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // YOUR API URL
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
        navigate(`/${result.role === 'admin' ? 'admin' : result.role}`);
      } else {
        alert(result.message); // Invalid credentials
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
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-[#003A70] tracking-tight">KONICA</h1>
          <p className="text-sm text-gray-500 mt-1">Work Tracking Portal</p>
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