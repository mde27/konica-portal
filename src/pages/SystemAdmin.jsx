import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import * as XLSX from 'xlsx';
import { jsPDF } from "jspdf";

export default function SystemAdmin() {
  const [activeTab, setActiveTab] = useState('works');
  const [data, setData] = useState({ works: [], users: [], logs: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [generatingPdfId, setGeneratingPdfId] = useState(null); // Track PDF Loading

  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'technician', company: 'RED' });

  const API_URL = "https://script.google.com/macros/s/AKfycbw07COOO4-hmQ3wGQ-9erc4qcEVS_NvyKBLOAGye24KoqQrXXmtmvUNoktjVVyG1Cej/exec";
  const currentUser = localStorage.getItem('username');

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(API_URL);
      const result = await response.json();
      setData({
        works: result.works.reverse(),
        logs: result.logs.reverse(),
        users: result.users
      });
    } catch (error) {
      console.error("Failed to fetch", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "createUser",
          requestingUser: currentUser,
          newUsername: newUser.username,
          newPassword: newUser.password,
          newRole: newUser.role,
          newCompany: newUser.company
        })
      });
      const result = await response.json();
      if (result.status === "success") {
        alert("User created successfully!");
        setNewUser({ username: '', password: '', role: 'technician', company: 'RED' });
        fetchDashboardData();
      } else {
        alert("Error: " + result.message);
      }
    } catch (err) {
      alert("Network error.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMasterExport = () => {
    if (data.works.length === 0 && data.logs.length === 0) return alert("No data to export.");
    const workbook = XLSX.utils.book_new();
    const worksSheet = XLSX.utils.json_to_sheet(data.works);
    XLSX.utils.book_append_sheet(workbook, worksSheet, "WORKS_BACKUP");
    const logsSheet = XLSX.utils.json_to_sheet(data.logs);
    XLSX.utils.book_append_sheet(workbook, logsSheet, "LOGS_BACKUP");
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `System_Master_Backup_${dateStr}.xlsx`);
  };

  // UPGRADED: Async PDF Generator with Embedded Images
  const downloadPDF = async (job) => {
    setGeneratingPdfId(job.shipment_number);

    try {
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.setTextColor(0, 58, 112);
      doc.text("Konica Minolta - Work Order", 20, 20);

      doc.setFontSize(12);
      doc.setTextColor(job.status === 'GREEN' ? 22 : 0, job.status === 'GREEN' ? 163 : 102, job.status === 'GREEN' ? 74 : 204);
      doc.text(`STATUS: ${job.status}`, 20, 30);

      doc.setDrawColor(200, 200, 200);
      doc.line(20, 35, 190, 35);

      doc.setTextColor(50, 50, 50);
      doc.setFontSize(12);
      doc.text(`Shipment Number: ${job.shipment_number || 'N/A'}`, 20, 45);
      doc.text(`Customer: ${job.customer || 'N/A'}`, 20, 55);
      doc.text(`Device Model: ${job.device_model || 'N/A'}`, 20, 65);
      doc.text(`City: ${job.city || 'N/A'}`, 20, 75);
      if (job.location) doc.text(`GPS Verification: ${job.location}`, 20, 85);

      doc.line(20, 95, 190, 95);

      if (job.photo_url) {
        doc.setTextColor(0, 0, 0);
        doc.text("Proof of Work:", 20, 105);

        const response = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "getBase64Image", url: job.photo_url })
        });
        const result = await response.json();

        if (result.status === "success") {
          doc.addImage(result.base64, 'JPEG', 20, 115, 120, 90);
        } else {
          doc.setTextColor(255, 0, 0);
          doc.text("Database Error: Failed to load secured image.", 20, 115);
        }
      } else {
        doc.setTextColor(150, 150, 150);
        doc.text("Proof of Work: Awaiting field completion.", 20, 105);
      }
      doc.save(`WorkOrder_${job.shipment_number}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Network Error generating PDF.");
    } finally {
      setGeneratingPdfId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FA]">
      <Navbar title="System Administrator" />

      <main className="p-8 max-w-7xl mx-auto w-full flex-grow">
        <div className="flex justify-between items-center mb-8">
          <div className="flex gap-4 border-b border-gray-200 pb-2">
            <button onClick={() => setActiveTab('works')} className={`pb-2 px-2 font-bold ${activeTab === 'works' ? 'text-[#003A70] border-b-2 border-[#003A70]' : 'text-gray-500'}`}>Work Orders</button>
            <button onClick={() => setActiveTab('users')} className={`pb-2 px-2 font-bold ${activeTab === 'users' ? 'text-[#003A70] border-b-2 border-[#003A70]' : 'text-gray-500'}`}>User Management</button>
            <button onClick={() => setActiveTab('logs')} className={`pb-2 px-2 font-bold ${activeTab === 'logs' ? 'text-[#003A70] border-b-2 border-[#003A70]' : 'text-gray-500'}`}>System Logs</button>
          </div>

          <button onClick={handleMasterExport} className="bg-[#003A70] hover:bg-[#002850] text-white px-5 py-2.5 rounded-lg font-bold text-sm transition shadow-sm flex items-center gap-2">
            💽 Download Master Backup
          </button>
        </div>

        {isLoading ? (
          <div className="text-center p-12 text-gray-500 font-bold animate-pulse">Syncing with Secure Database...</div>
        ) : (
          <>
            {activeTab === 'works' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse text-sm">
                  <thead><tr className="bg-gray-50 text-gray-600 uppercase tracking-wider border-b"><th className="p-4">Status</th><th className="p-4">Shipment #</th><th className="p-4">Customer</th><th className="p-4">Verification</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.works.map((job, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="p-4"><span className={`text-white text-xs font-bold px-2 py-1 rounded ${job.status === 'GREEN' ? 'bg-green-600' : 'bg-blue-500'}`}>{job.status}</span></td>
                        <td className="p-4 font-bold">{job.shipment_number}</td>
                        <td className="p-4">{job.customer}</td>
                        <td className="p-4">
                          <div className="flex gap-4 items-center">
                            {job.photo_url ? <a href={job.photo_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 font-medium">📷 Photo</a> : <span className="text-gray-400">Awaiting</span>}
                            <button
                              onClick={() => downloadPDF(job)}
                              disabled={generatingPdfId === job.shipment_number}
                              className={`${generatingPdfId === job.shipment_number ? 'text-orange-500' : 'text-gray-500 hover:text-[#003A70]'} font-bold flex items-center gap-1 transition`}
                            >
                              {generatingPdfId === job.shipment_number ? '⏳ Loading...' : '📄 PDF'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* The rest of your SystemAdmin tabs (users, logs) remain identically intact! */}
            {activeTab === 'users' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="font-bold text-lg mb-4 text-[#003A70]">Create New User</h3>
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <input type="text" placeholder="Username" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-[#003A70]" required />
                    <input type="text" placeholder="Password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-[#003A70]" required />
                    <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} className="w-full border p-2 rounded bg-white outline-none">
                      <option value="technician">Field Technician</option>
                      <option value="konica">Konica Upload Admin</option>
                      <option value="supervisor">Business Supervisor</option>
                      <option value="admin">System Admin (Developer)</option>
                    </select>

                    {/* NEW: Company selector for access control */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Assign to Company</label>
                      <select 
                        value={newUser.company} 
                        onChange={e => setNewUser({ ...newUser, company: e.target.value })} 
                        className="w-full border p-2 rounded bg-white outline-none"
                      >
                        <option value="RED">🔴 RED Company</option>
                        <option value="BLUE">🔵 BLUE Company</option>
                        <option value="GREEN">🟢 GREEN Company</option>
                        <option value="YELLOW">🟡 YELLOW Company</option>
                        <option value="NONE">⚪ NONE (for Konica / Admin only)</option>
                      </select>
                    </div>

                    <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded transition">Add User</button>
                  </form>
                </div>

                <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead className="bg-gray-50 border-b"><tr className="text-gray-600 uppercase"><th className="p-4">Username</th><th className="p-4">Role</th><th className="p-4">Created</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.users.map((u, i) => (
                        <tr key={i}><td className="p-4 font-bold">{u.username}</td><td className="p-4 uppercase text-xs text-gray-500">{u.role}</td><td className="p-4">{new Date(u.created_at).toLocaleDateString()}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'logs' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="bg-gray-50 border-b"><tr className="text-gray-600 uppercase"><th className="p-4">Time</th><th className="p-4">User</th><th className="p-4">Action</th><th className="p-4">Details</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.logs.map((log, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="p-4 text-xs text-gray-500">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="p-4 font-bold text-[#003A70]">{log.user}</td>
                        <td className="p-4"><span className="bg-gray-200 px-2 py-1 rounded text-xs font-mono">{log.action}</span></td>
                        <td className="p-4 text-gray-700">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}