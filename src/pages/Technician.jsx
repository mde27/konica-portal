import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';

export default function Technician() {
  const currentUser = localStorage.getItem('username') || 'Unknown';
  const myCompany = localStorage.getItem('company') || 'NONE'; 
  
  const [jobs, setJobs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('ALL'); // NEW: Status filter
  const [isLoading, setIsLoading] = useState(true);

  const [commentInputs, setCommentInputs] = useState({});
  const [actionLoading, setActionLoading] = useState(null);
  const [photoData, setPhotoData] = useState({});

  const API_URL = "https://script.google.com/macros/s/AKfycbw07COOO4-hmQ3wGQ-9erc4qcEVS_NvyKBLOAGye24KoqQrXXmtmvUNoktjVVyG1Cej/exec";

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(API_URL);
      const data = await response.json();

      const myJobs = data.works.filter(job => job.company === myCompany);
      setJobs(myJobs.reverse()); 
    } catch (error) {
      console.error("Failed to fetch jobs", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddComment = async (shipment_number) => {
    const commentText = commentInputs[shipment_number];
    if (!commentText || commentText.trim() === '') return;

    setActionLoading(shipment_number + '_comment');
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "addComment",
          requestingUser: currentUser,
          shipment_number: shipment_number,
          comment: commentText
        })
      });

      const result = await response.json();
      if (result.status === "success") {
        setCommentInputs({ ...commentInputs, [shipment_number]: '' });
        fetchJobs();
      } else {
        alert("Error adding comment.");
      }
    } catch (error) {
      alert("Network error.");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePhotoSelect = (shipment_number, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoData(prev => ({ ...prev, [shipment_number]: e.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const getGPSLocation = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve("GPS Not Supported");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(`${pos.coords.latitude}, ${pos.coords.longitude}`),
        (err) => resolve("GPS Denied/Unavailable"),
        { timeout: 10000 }
      );
    });
  };

  const handleCompleteJob = async (shipment_number) => {
    const base64Image = photoData[shipment_number];
    if (!base64Image) {
      return alert("Please upload a photo of the completed work first.");
    }

    const confirmComplete = window.confirm(`Mark shipment ${shipment_number} as completed?`);
    if (!confirmComplete) return;

    setActionLoading(shipment_number + '_complete');

    const locationStr = await getGPSLocation();

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "completeJob",
          requestingUser: currentUser,
          shipment_number: shipment_number,
          location: locationStr, 
          photoBase64: base64Image
        })
      });

      const result = await response.json();
      if (result.status === "success") {
        alert("Job Marked as Completed!");
        fetchJobs();
      } else {
        alert("Failed to complete job: " + result.message);
      }
    } catch (error) {
      alert("Network error.");
    } finally {
      setActionLoading(null);
    }
  };

  // UPDATED: Now includes status filter + search
  const filteredJobs = jobs.filter(job => {
    const matchesFilter = filter === 'ALL' || job.status === filter;
    const matchesSearch = (
      (job.shipment_number && String(job.shipment_number).toLowerCase().includes(searchTerm.toLowerCase())) ||
      (job.customer && String(job.customer).toLowerCase().includes(searchTerm.toLowerCase())) ||
      (job.city && String(job.city).toLowerCase().includes(searchTerm.toLowerCase()))
    );
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FA]">
      <Navbar title="Technician Portal" />

      <main className="p-4 md:p-8 max-w-4xl mx-auto w-full flex-grow">

        {/* HEADER */}
        <div className="mb-6 space-y-4">
          <h2 className="text-2xl font-extrabold text-[#003A70]">Job list</h2>

          {/* FILTER BUTTONS + SEARCH */}
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            
            {/* Status Filter */}
            <div className="flex gap-2 bg-white p-1 rounded-lg shadow-sm border border-gray-100 w-fit">
              <button 
                onClick={() => setFilter('ALL')} 
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${filter === 'ALL' ? 'bg-[#003A70] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                All
              </button>
              <button 
                onClick={() => setFilter('BLUE')} 
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${filter === 'BLUE' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Pending
              </button>
              <button 
                onClick={() => setFilter('GREEN')} 
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${filter === 'GREEN' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Completed
              </button>
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400">🔍</span>
              </div>
              <input
                type="text"
                placeholder="Search by Shipment #, Customer, or City..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-[#003A70] outline-none transition bg-white"
              />
            </div>
          </div>
        </div>

        {/* LIST OF WORKS */}
        {isLoading ? (
          <div className="text-center p-12 text-gray-500 font-bold animate-pulse">Loading jobs...</div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl border border-gray-100 text-gray-500">
            No works found matching your search.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((job, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 overflow-hidden">

                {/* Job Header */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{job.shipment_number || "No ID"}</h3>
                    <p className="text-[#003A70] font-medium">{job.customer}</p>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full text-white ${job.status === 'GREEN' ? 'bg-green-600' : 'bg-blue-500'}`}>
                    {job.status === 'GREEN' ? 'COMPLETED' : 'PENDING'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-4 border-b border-gray-100 pb-4">
                  <p>📍 {job.city}</p>
                  <p>🖨️ {job.device_model}</p>
                </div>

                {/* Logistics Dates */}
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-700 bg-blue-50/50 p-3 rounded-lg mb-4 border border-blue-100">
                    <div><span className="font-bold text-[#003A70] block mb-0.5">Trimitere</span>{job.trimitere || '-'}</div>
                    <div><span className="font-bold text-[#003A70] block mb-0.5">Încărcare</span>{job.incarcare || '-'}</div>
                    <div><span className="font-bold text-[#003A70] block mb-0.5">Livrare</span>{job.livrare || '-'}</div>
                </div>

                {/* Comments Section */}
                <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Comments</h4>

                  {job.comments ? (
                    <div className="text-sm text-gray-700 whitespace-pre-wrap mb-3 max-h-32 overflow-y-auto font-mono text-xs">
                      {job.comments}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic mb-3">No comments yet.</p>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add a comment..."
                      value={commentInputs[job.shipment_number] || ''}
                      onChange={(e) => setCommentInputs({ ...commentInputs, [job.shipment_number]: e.target.value })}
                      className="flex-grow border rounded-md px-3 py-1.5 text-sm outline-none focus:border-[#003A70]"
                    />
                    <button
                      onClick={() => handleAddComment(job.shipment_number)}
                      disabled={actionLoading === job.shipment_number + '_comment'}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-1.5 rounded-md text-sm font-medium transition"
                    >
                      {actionLoading === job.shipment_number + '_comment' ? '...' : 'Send'}
                    </button>
                  </div>
                </div>

                {/* Action Section */}
                {job.status !== 'GREEN' && (
                  <div className="pt-2 border-t border-gray-100 mt-4">

                    <div className="mb-4 mt-2">
                      <label className="block text-sm font-bold text-gray-700 mb-2">📸 Proof of Work (Required)</label>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handlePhotoSelect(job.shipment_number, e.target.files[0])}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-[#003A70] hover:file:bg-blue-100 cursor-pointer"
                      />
                      {photoData[job.shipment_number] && (
                        <p className="text-xs text-green-600 mt-2 font-medium flex items-center gap-1">
                          ✅ Photo attached and ready
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleCompleteJob(job.shipment_number)}
                      disabled={actionLoading === job.shipment_number + '_complete'}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition shadow-sm flex items-center justify-center gap-2"
                    >
                      {actionLoading === job.shipment_number + '_complete' ? 'Getting GPS & Saving...' : '✅ Mark as Completed'}
                    </button>
                  </div>
                )}

                {/* Completion Info */}
                {job.status === 'GREEN' && job.completed_at && (
                  <div className="text-xs text-center text-green-800 font-medium bg-green-100 py-3 rounded-lg mt-3 border border-green-200">
                    <div>Completed on: {new Date(job.completed_at).toLocaleString('ro-RO')}</div>
                    <div className="mt-1 font-bold">Technician: {job.completed_by || 'Unknown'}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}