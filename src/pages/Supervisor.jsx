import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import * as XLSX from 'xlsx'; 
import { jsPDF } from "jspdf"; // NEW: Import jsPDF

export default function Supervisor() {
  const [jobs, setJobs] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const API_URL = "https://script.google.com/macros/s/AKfycbw07COOO4-hmQ3wGQ-9erc4qcEVS_NvyKBLOAGye24KoqQrXXmtmvUNoktjVVyG1Cej/exec";

  useEffect(() => { fetchJobs(); }, []);

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      setJobs(data.works.reverse());
    } catch (error) {
      console.error("Failed to fetch", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWeeklyExport = () => {
    if (jobs.length === 0) return alert("No data to export.");
    const worksheet = XLSX.utils.json_to_sheet(jobs);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Weekly_Works");
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Supervisor_Weekly_Export_${dateStr}.xlsx`);
  };

  // NEW: Generate Individual PDF Report
  const downloadPDF = (job) => {
    const doc = new jsPDF();

    // Header Area
    doc.setFontSize(22);
    doc.setTextColor(0, 58, 112); // Konica Blue
    doc.text("Konica Minolta - Work Order", 20, 20);

    // Dynamic Status text
    doc.setFontSize(12);
    doc.setTextColor(job.status === 'GREEN' ? 22 : 0, job.status === 'GREEN' ? 163 : 102, job.status === 'GREEN' ? 74 : 204); 
    doc.text(`STATUS: ${job.status}`, 20, 30);

    // Divider line
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 35, 190, 35);

    // Job Details
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(12);
    doc.text(`Shipment Number: ${job.shipment_number || 'N/A'}`, 20, 45);
    doc.text(`Customer: ${job.customer || 'N/A'}`, 20, 55);
    doc.text(`Device Model: ${job.device_model || 'N/A'}`, 20, 65);
    doc.text(`City: ${job.city || 'N/A'}`, 20, 75);
    if (job.location) doc.text(`GPS Verification: ${job.location}`, 20, 85);

    // Proof of Work Area
    doc.line(20, 95, 190, 95);
    
    if (job.photo_url) {
      doc.setTextColor(0, 0, 0);
      doc.text("Proof of Work:", 20, 105);
      
      // Clickable Hyperlink to Drive
      doc.setTextColor(0, 102, 204);
      doc.text(">> Click here to view Secure Photo Verification", 20, 115, { url: job.photo_url });
    } else {
      doc.setTextColor(150, 150, 150);
      doc.text("Proof of Work: Awaiting field completion.", 20, 105);
    }

    doc.save(`WorkOrder_${job.shipment_number}.pdf`);
  };

  const filteredJobs = jobs.filter(job => filter === 'ALL' || job.status === filter);

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FA]">
      <Navbar title="Supervisor Dashboard" />
      <main className="p-8 max-w-7xl mx-auto w-full flex-grow">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-[#003A70]">Global Work Orders</h2>
          
          <div className="flex gap-4 items-center">
            <button onClick={handleWeeklyExport} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium text-sm transition shadow-sm flex items-center gap-2">
              📥 Export to Excel
            </button>
            <div className="flex gap-2 bg-white p-1 rounded-lg shadow-sm border border-gray-100">
              <button onClick={() => setFilter('ALL')} className={`px-4 py-2 rounded-md font-medium text-sm transition ${filter === 'ALL' ? 'bg-[#003A70] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>All</button>
              <button onClick={() => setFilter('BLUE')} className={`px-4 py-2 rounded-md font-medium text-sm transition ${filter === 'BLUE' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Pending</button>
              <button onClick={() => setFilter('GREEN')} className={`px-4 py-2 rounded-md font-medium text-sm transition ${filter === 'GREEN' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Completed</button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b border-gray-100">
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Shipment #</th>
                <th className="p-4 font-semibold">Device / City</th>
                <th className="p-4 font-semibold">Customer</th>
                <th className="p-4 font-semibold">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan="5" className="p-8 text-center text-gray-500 font-medium">Loading database...</td></tr>
              ) : (
                filteredJobs.map((job, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition">
                    <td className="p-4"><span className={`text-white text-xs font-bold px-3 py-1 rounded-full uppercase ${job.status === 'GREEN' ? 'bg-green-600' : 'bg-blue-500'}`}>{job.status}</span></td>
                    <td className="p-4 font-bold text-gray-900">{job.shipment_number || '—'}</td>
                    <td className="p-4"><div className="font-medium text-gray-800">{job.device_model || '—'}</div><div className="text-xs text-gray-500 mt-0.5">{job.city || '—'}</div></td>
                    <td className="p-4 font-medium text-gray-700">{job.customer || '—'}</td>
                    <td className="p-4">
                      {/* NEW: Action Buttons side-by-side */}
                      <div className="flex gap-4 items-center">
                        {job.photo_url ? <a href={job.photo_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1">📷 Photo</a> : <span className="text-gray-400 text-sm">Awaiting</span>}
                        <button onClick={() => downloadPDF(job)} className="text-gray-500 hover:text-[#003A70] text-sm font-bold flex items-center gap-1 transition">
                          📄 PDF
                        </button>
                      </div>
                      {job.location && <div className="text-xs text-gray-500 mt-1">📍 {job.location}</div>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}