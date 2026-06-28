import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';

export default function Supervisor() {
  const [jobs, setJobs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Make sure this is your active Google Apps Script URL
  const API_URL = "https://script.google.com/macros/s/AKfycbw07COOO4-hmQ3wGQ-9erc4qcEVS_NvyKBLOAGye24KoqQrXXmtmvUNoktjVVyG1Cej/exec";

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      setJobs(data.works.reverse());
    } catch (error) {
      console.error("Failed to fetch jobs", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Search filter logic
  const filteredJobs = jobs.filter(job => 
    (job.shipment_number && job.shipment_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (job.customer && job.customer.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (job.city && job.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (job.device_model && job.device_model.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FA]">
      <Navbar title="Supervisor Portal" />
      
      <main className="p-4 md:p-8 max-w-6xl mx-auto w-full flex-grow">
        
        {/* HEADER & SEARCH */}
        <div className="mb-6 space-y-4">
          <h2 className="text-2xl font-extrabold text-[#003A70]">Munkák áttekintése</h2>
          
          <div className="relative max-w-2xl">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">🔍</span>
            </div>
            <input 
              type="text" 
              placeholder="Search all works by ID, Customer, City, or Model..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-[#003A70] outline-none transition bg-white"
            />
          </div>
        </div>

        {/* LIST OF WORKS */}
        {isLoading ? (
          <div className="text-center p-12 text-gray-500 font-bold animate-pulse">Loading dashboard...</div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl border border-gray-100 text-gray-500">
            No works found matching your search.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredJobs.map((job, index) => {
              
              // Check if comments exist and are not empty
              const hasComments = job.comments && job.comments.trim() !== '';

              return (
                <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 relative overflow-hidden flex flex-col">
                  
                  {/* RED NOTIFICATION DOT (Only shows if hasComments is true) */}
                  {hasComments && (
                    <div className="absolute top-4 right-4 flex items-center justify-center" title="New comments">
                      <span className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </span>
                    </div>
                  )}

                  {/* Job Header Info */}
                  <div className="flex justify-between items-start mb-3 pr-6">
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

                  {/* Comments Log (Visible directly to supervisor) */}
                  {hasComments ? (
                    <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200 flex-grow">
                      <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2 flex items-center gap-1">
                        💬 Activity Log
                      </h4>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-32 overflow-y-auto font-mono text-xs">
                        {job.comments}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-grow"></div> /* Spacer to keep grid aligned if no comments */
                  )}

                  {/* Completion Timestamp */}
                  {job.status === 'GREEN' && job.completed_at && (
                    <div className="text-xs text-green-700 font-medium bg-green-50 py-2 px-3 rounded-lg mt-auto">
                      ✓ Completed: {new Date(job.completed_at).toLocaleString('ro-RO')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}