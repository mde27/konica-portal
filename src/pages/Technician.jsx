import React, { useState } from 'react';
import Navbar from '../components/Navbar';

export default function Technician() {
  const [searchTerm, setSearchTerm] = useState('');
  
  // NEW: We now have searchResults (an array) AND selectedJob (the one they click)
  const [searchResults, setSearchResults] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [photoBase64, setPhotoBase64] = useState(null);
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const API_URL = "https://script.google.com/macros/s/AKfycbw07COOO4-hmQ3wGQ-9erc4qcEVS_NvyKBLOAGye24KoqQrXXmtmvUNoktjVVyG1Cej/exec";
  const currentUser = localStorage.getItem('username') || "Unknown Tech";

  // --- UPGRADED Search Logic ---
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    
    // Reset the UI
    setIsLoading(true); 
    setError(''); 
    setSearchResults([]); 
    setSelectedJob(null); 
    setPhotoBase64(null); 
    setLocation('');

    try {
      const response = await fetch(API_URL);
      const result = await response.json();

      if (result.status === "success") {
        const term = searchTerm.toLowerCase();
        
        // 1. Filter ALL jobs that match
        const matches = result.works.filter(job => {
          const shipmentMatch = String(job.shipment_number).toLowerCase().includes(term);
          const deviceMatch = String(job.device_model).toLowerCase().includes(term);
          
          const isMatch = shipmentMatch || deviceMatch;
          if (!isMatch) return false;

          // 2. The Completed (GREEN) Rule: Only show if they typed the EXACT full shipment number
          if (job.status === 'GREEN') {
            return String(job.shipment_number).toLowerCase() === term;
          }

          // 3. For BLUE jobs, partial matches are fine!
          return true;
        });

        if (matches.length === 0) {
          setError('No valid work orders found for that search.');
        } else if (matches.length === 1) {
          // If only one job matches, open it immediately to save clicks!
          setSelectedJob(matches[0]);
        } else {
          // If multiple match, show the list
          setSearchResults(matches);
        }
      } else {
        setError('Database Error: ' + result.message);
      }
    } catch (err) {
      setError('Failed to connect to database.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) return alert("Geolocation is not supported by your browser.");
    setLocation("Fetching location...");
    navigator.geolocation.getCurrentPosition(
      (position) => setLocation(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`),
      () => setLocation("Location access denied")
    );
  };

  const handlePhotoCapture = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPhotoBase64(reader.result); 
    reader.readAsDataURL(file);
  };

  const handleCompleteJob = async () => {
    if (!photoBase64 || !location) return alert("Please upload a photo and get location first!");
    
    setIsSubmitting(true);
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "completeJob",
          requestingUser: currentUser,
          shipment_number: selectedJob.shipment_number,
          photoBase64: photoBase64,
          location: location
        }),
      });

      const result = await response.json();
      if (result.status === "success") {
        alert("Job successfully marked as COMPLETE!");
        setSelectedJob({ ...selectedJob, status: "GREEN" }); 
      } else {
        alert("Server Error: " + result.message);
      }
    } catch (err) {
      alert("Network Failed. Check console.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FA]">
      <Navbar title="Technician Field App" />
      
      <main className="p-6 max-w-3xl mx-auto w-full flex-grow">
        
        {/* Search Bar */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
          <h2 className="text-lg font-bold text-[#003A70] mb-3">Find Work Order</h2>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input 
              type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Shipment # or Model..." className="flex-grow px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#003A70]"
            />
            <button type="submit" disabled={isLoading} className="bg-[#003A70] hover:bg-[#002850] text-white px-6 py-3 rounded-lg font-medium transition">
              {isLoading ? '...' : 'Search'}
            </button>
          </form>
          {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
        </div>

        {/* MULTIPLE RESULTS LIST */}
        {searchResults.length > 1 && !selectedJob && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in-up">
            <div className="p-4 bg-gray-50 border-b border-gray-100 text-gray-700 font-bold">
              Found {searchResults.length} matching jobs:
            </div>
            <div className="divide-y divide-gray-100">
              {searchResults.map((job, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setSelectedJob(job)}
                  className="p-4 hover:bg-blue-50 cursor-pointer flex justify-between items-center transition"
                >
                  <div>
                    <h4 className="font-bold text-[#003A70]">{job.shipment_number}</h4>
                    <p className="text-sm text-gray-500">{job.device_model || 'Unknown'} • {job.customer}</p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full uppercase bg-blue-100 text-blue-700">
                    {job.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SINGLE JOB DETAILS CARD */}
        {selectedJob && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in-up">
            
            {/* Back Button (Only shows if they came from a list) */}
            {searchResults.length > 1 && (
              <button 
                onClick={() => setSelectedJob(null)} 
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-bold py-2 transition"
              >
                ← Back to Results
              </button>
            )}

            <div className={`p-4 flex justify-between items-center ${selectedJob.status === 'GREEN' ? 'bg-green-50' : 'bg-blue-50'}`}>
              <div><h3 className="text-xl font-bold text-gray-900">{selectedJob.shipment_number}</h3></div>
              <span className={`text-white text-xs font-bold px-3 py-1 rounded-full uppercase ${selectedJob.status === 'GREEN' ? 'bg-green-600' : 'bg-blue-600'}`}>
                {selectedJob.status}
              </span>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-4">
                <div><p className="text-sm text-gray-500">Device Model</p><p className="font-semibold">{selectedJob.device_model || 'N/A'}</p></div>
                <div><p className="text-sm text-gray-500">Customer</p><p className="font-semibold">{selectedJob.customer || 'N/A'}</p></div>
              </div>

              {selectedJob.status !== 'GREEN' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-lg p-4 text-center bg-gray-50">
                      <input type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} className="hidden" id="camera-input" />
                      <label htmlFor="camera-input" className="cursor-pointer text-[#003A70] font-semibold text-sm block">
                        {photoBase64 ? '✅ Photo Captured' : '📷 Take Photo'}
                      </label>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4 text-center bg-gray-50">
                      <button onClick={handleGetLocation} className="text-[#003A70] font-semibold text-sm w-full">
                        {location ? '✅ Location Set' : '📍 Get GPS'}
                      </button>
                      {location && <p className="text-xs text-gray-500 mt-1">{location}</p>}
                    </div>
                  </div>

                  <button onClick={handleCompleteJob} disabled={isSubmitting} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition disabled:bg-gray-400">
                    {isSubmitting ? 'Uploading Proof...' : '✔ Mark as Completed'}
                  </button>
                </div>
              ) : (
                <div className="bg-green-50 text-green-700 p-4 rounded-lg text-center font-medium">This job has been completed and secured.</div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}