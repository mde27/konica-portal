import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';

export default function Technician() {
  const [jobs, setJobs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // States for interacting with specific jobs
  const [commentInputs, setCommentInputs] = useState({});
  const [actionLoading, setActionLoading] = useState(null);

  const API_URL = "https://script.google.com/macros/s/AKfycbw07COOO4-hmQ3wGQ-9erc4qcEVS_NvyKBLOAGye24KoqQrXXmtmvUNoktjVVyG1Cej/exec"; // Ensure this is your latest URL!
  const currentUser = localStorage.getItem('username') || 'Technician';

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      // Only show jobs that haven't been completed yet (BLUE), or you can remove the filter to show all!
      setJobs(data.works.reverse()); 
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
        setCommentInputs({ ...commentInputs, [shipment_number]: '' }); // Clear input
        fetchJobs(); // Refresh to show new comment
      } else {
        alert("Error adding comment.");
      }
    } catch (error) {
      alert("Network error.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteJob = async (shipment_number) => {
    // Basic completion logic - assuming you prompt for a photo or have a file input setup
    const confirmComplete = window.confirm(`Mark shipment ${shipment_number} as completed?`);
    if (!confirmComplete) return;

    setActionLoading(shipment_number + '_complete');
    
    // Simulate getting GPS location
    let locationStr = "GPS Data Unavailable";
    if (navigator.geolocation) {
       navigator.geolocation.getCurrentPosition((pos) => {
           locationStr = `${pos.coords.latitude}, ${pos.coords.longitude}`;
       });
    }

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "completeJob",
          requestingUser: currentUser,
          shipment_number: shipment_number,
          location: locationStr,
          // photoBase64: ... (Insert your photo capture logic here if needed)
        })
      });
      
      const result = await response.json();
      if (result.status === "success") {
        alert("Job Marked as Completed!");
        fetchJobs(); // Refresh the list
      }
    } catch (error) {
      alert("Network error.");
    } finally {
      setActionLoading(null);
    }
  };

  // Filter jobs based on the search bar
  const filteredJobs = jobs.filter(job => 
    (job.shipment_number && job.shipment_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (job.customer && job.customer.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (job.city && job.city.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FA]">
      <Navbar title="Technician Portal" />
      
      <main className="p-4 md:p-8 max-w-4xl mx-auto w-full flex-grow">
        
        {/* HEADER & SEARCH */}
        <div className="mb-6 space-y-4">
          <h2 className="text-2xl font-extrabold text-[#003A70]">Munkák listája</h2>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">🔍</span>
            </div>
            <input 
              type="text" 
              placeholder="Search by Shipment #, Customer, or City..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-[#003A70] outline-none transition"
            />
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
                
                {/* Job Header Info */}
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

                {/* Comments Section (Visible for all statuses) */}
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
                      onChange={(e) => setCommentInputs({...commentInputs, [job.shipment_number]: e.target.value})}
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

                {/* Action Section (Only show complete button if it's BLUE) */}
                {job.status !== 'GREEN' && (
                  <div className="pt-2">
                    <button 
                      onClick={() => handleCompleteJob(job.shipment_number)}
                      disabled={actionLoading === job.shipment_number + '_complete'}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition shadow-sm flex items-center justify-center gap-2"
                    >
                      {actionLoading === job.shipment_number + '_complete' ? 'Processing...' : '✅ Mark as Completed'}
                    </button>
                  </div>
                )}
                
                {/* Show Completion Timestamp if GREEN */}
                {job.status === 'GREEN' && job.completed_at && (
                  <div className="text-xs text-center text-green-700 font-medium bg-green-50 py-2 rounded-lg mt-2">
                    Completed on: {new Date(job.completed_at).toLocaleString('ro-RO')}
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