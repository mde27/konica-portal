import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import * as XLSX from 'xlsx';
import { jsPDF } from "jspdf";

export default function Supervisor() {
    const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' or 'pdfs'
    const currentUser = localStorage.getItem('username') || 'Unknown';
    const myCompany = localStorage.getItem('company') || 'NONE'; 
    
    // Dashboard State
    const [jobs, setJobs] = useState([]);
    const [filter, setFilter] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [generatingPdfId, setGeneratingPdfId] = useState(null);
    const [returningId, setReturningId] = useState(null);

    // PDF Viewer State
    const [pdfList, setPdfList] = useState([]);
    const [isLoadingPdfs, setIsLoadingPdfs] = useState(false);

    const API_URL = "https://script.google.com/macros/s/AKfycbw07COOO4-hmQ3wGQ-9erc4qcEVS_NvyKBLOAGye24KoqQrXXmtmvUNoktjVVyG1Cej/exec";

    useEffect(() => {
        fetchJobs();
        fetchPdfs();
    }, []);

    const fetchJobs = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(API_URL);
            const data = await response.json();

            // SECURITY FILTER: Only keep jobs assigned to myCompany!
            const myJobs = data.works.filter(job => job.company === myCompany);

            setJobs(myJobs.reverse());
        } catch (error) {
            console.error("Failed to fetch jobs", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchPdfs = async () => {
        setIsLoadingPdfs(true);
        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ action: "getPdfs" })
            });
            const data = await response.json();

            if (data.pdfs && data.pdfs.length > 1) {
                // FILTER PDFs by company (show only myCompany or ALL)
                const filteredPdfs = data.pdfs.slice(1).filter(pdf => 
                    !pdf.company || pdf.company === myCompany || pdf.company === 'ALL'
                );
                setPdfList(filteredPdfs.reverse());
            }
        } catch (error) {
            console.error("Failed to fetch PDFs", error);
        } finally {
            setIsLoadingPdfs(false);
        }
    };

    // ==========================================
    // HANDLE MARK AS READ
    // ==========================================
    const handleViewPdf = async (pdf) => {
        window.open(pdf.url, '_blank', 'noreferrer');

        if (pdf.status !== 'READ') {
            setPdfList(prevList => prevList.map(p =>
                p.url === pdf.url ? { ...p, status: 'READ' } : p
            ));

            try {
                await fetch(API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "text/plain;charset=utf-8" },
                    body: JSON.stringify({ action: "markPdfRead", url: pdf.url })
                });
            } catch (error) {
                console.error("Failed to update read status", error);
            }
        }
    };

    const handleWeeklyExport = () => {
        if (jobs.length === 0) return alert("No data to export.");

        const exportData = jobs.map(job => ({
            Shipment_Number: job.shipment_number || "",
            Customer: job.customer || "",
            City: job.city || "",
            Device_Model: job.device_model || "",
            Status: job.status || "",
            Trimitere: job.trimitere || "",
            Incarcare: job.incarcare || "",
            Livrare: job.livrare || "",
            Has_Photo: job.photo_url ? "Yes" : "No",
            Photo_URL: job.photo_url || "",
            GPS_Location: job.location || "",
            Completed_By: job.completed_by || "",
            Comments: job.comments || ""
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Works_Export");
        
        const dateStr = new Date().toISOString().split('T')[0];
        XLSX.writeFile(workbook, `Supervisor_Weekly_Export_${dateStr}.xlsx`);
    };

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
            alert("Network Error generating PDF.");
        } finally {
            setGeneratingPdfId(null);
        }
    };

    // NEW: Supervisor returns job to Konica Admins
    const handleReturnJob = async (shipment_number) => {
        const reason = prompt("Why are you returning this job to Konica? (optional)");
        if (reason === null) return;

        const confirmReturn = window.confirm(`Return shipment ${shipment_number} to Konica Admins?`);
        if (!confirmReturn) return;

        setReturningId(shipment_number);

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({
                    action: "returnJob",
                    requestingUser: currentUser,
                    shipment_number: shipment_number,
                    reason: reason || "No reason provided"
                })
            });

            const result = await response.json();
            if (result.status === "success") {
                alert("Job returned to Konica Admins.");
                fetchJobs();
            } else {
                alert("Failed to return job: " + (result.message || "Unknown error"));
            }
        } catch (error) {
            alert("Network error while returning job.");
        } finally {
            setReturningId(null);
        }
    };

    const filteredJobs = jobs.filter(job => {
        const matchesFilter = filter === 'ALL' || job.status === filter;
        const matchesSearch = (
            (job.shipment_number && String(job.shipment_number).toLowerCase().includes(searchTerm.toLowerCase())) ||
            (job.customer && String(job.customer).toLowerCase().includes(searchTerm.toLowerCase())) ||
            (job.city && String(job.city).toLowerCase().includes(searchTerm.toLowerCase())) ||
            (job.device_model && String(job.device_model).toLowerCase().includes(searchTerm.toLowerCase()))
        );
        return matchesFilter && matchesSearch;
    });

    return (
        <div className="min-h-screen flex flex-col bg-[#F5F7FA]">
            <Navbar title="Supervisor Dashboard" />
            <main className="p-8 max-w-7xl mx-auto w-full flex-grow">

                {/* TABS */}
                <div className="flex space-x-2 border-b border-gray-200 mb-6 mt-2 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`px-6 py-3 font-bold text-sm tracking-wide whitespace-nowrap transition-all duration-200 ${activeTab === 'dashboard' ? 'text-[#003A70] border-b-2 border-[#003A70]' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        🗄️ WORKS DASHBOARD
                    </button>
                    <button
                        onClick={() => setActiveTab('pdfs')}
                        className={`px-6 py-3 font-bold text-sm tracking-wide whitespace-nowrap transition-all duration-200 ${activeTab === 'pdfs' ? 'text-[#003A70] border-b-2 border-[#003A70]' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        📚 DOCUMENT LIBRARY
                    </button>
                </div>

                {/* TAB 1: DASHBOARD */}
                {activeTab === 'dashboard' && (
                    <div className="animate-fade-in-up">
                        <div className="flex justify-between items-center mb-6">
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

                        <div className="mb-6 relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-400">🔍</span>
                            </div>
                            <input
                                type="text"
                                placeholder="Search works by ID, Customer, City, or Model..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-[#003A70] outline-none transition bg-white"
                            />
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
                                        filteredJobs.map((job, index) => {
                                            const hasComments = job.comments && job.comments.trim() !== '';

                                            return (
                                                <tr key={index} className="hover:bg-gray-50 transition">
                                                    <td className="p-4"><span className={`text-white text-xs font-bold px-3 py-1 rounded-full uppercase ${job.status === 'GREEN' ? 'bg-green-600' : 'bg-blue-500'}`}>{job.status}</span></td>
                                                    <td className="p-4 font-bold text-gray-900">
                                                        <div className="flex items-center gap-2">
                                                            <span>{job.shipment_number || '—'}</span>
                                                            {hasComments && (
                                                                <span className="flex h-3 w-3 relative" title={`Comments:\n${job.comments}`}>
                                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="font-medium text-gray-800">{job.device_model || '—'}</div>
                                                        <div className="text-xs text-gray-500 mt-0.5">{job.city || '—'}</div>
                                                        <div className="grid grid-cols-3 gap-1 text-[10px] text-gray-600 bg-blue-50/50 p-1.5 rounded border border-blue-100 mt-2 max-w-xs font-mono">
                                                            <div><span className="font-bold text-[#003A70] block">TRIM:</span> {job.trimitere || '-'}</div>
                                                            <div><span className="font-bold text-[#003A70] block">ÎNCĂ:</span> {job.incarcare || '-'}</div>
                                                            <div><span className="font-bold text-[#003A70] block">LIVR:</span> {job.livrare || '-'}</div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 font-medium text-gray-700">{job.customer || '—'}</td>
                                                    <td className="p-4">
                                                        <div className="flex flex-col gap-2">
                                                            {job.photo_url ? <a href={job.photo_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 font-medium text-xs flex items-center gap-1">📷 Photo</a> : <span className="text-gray-400 text-xs">Awaiting</span>}
                                                            <button
                                                                onClick={() => downloadPDF(job)}
                                                                disabled={generatingPdfId === job.shipment_number}
                                                                className={`${generatingPdfId === job.shipment_number ? 'text-orange-500' : 'text-gray-500 hover:text-[#003A70]'} text-xs font-bold flex items-center gap-1 transition`}
                                                            >
                                                                {generatingPdfId === job.shipment_number ? '⏳ Loading...' : '📄 PDF'}
                                                            </button>

                                                            {/* Return to Konica button */}
                                                            {job.status !== 'GREEN' && job.status !== 'RED' && (
                                                                <button
                                                                    onClick={() => handleReturnJob(job.shipment_number)}
                                                                    disabled={returningId === job.shipment_number}
                                                                    className={`${returningId === job.shipment_number ? 'text-orange-500' : 'text-red-500 hover:text-red-700'} text-xs font-bold flex items-center gap-1 transition`}
                                                                >
                                                                    {returningId === job.shipment_number ? '⏳ Returning...' : '↩️ Return to Konica'}
                                                                </button>
                                                            )}

                                                            {job.status === 'GREEN' && (
                                                                <div className="text-[11px] text-green-700 font-bold mt-1 bg-green-50 px-2 py-0.5 rounded border border-green-100 inline-block">
                                                                    👷 {job.completed_by || 'Unknown Tech'}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {job.location && <div className="text-xs text-gray-500 mt-1">📍 {job.location}</div>}
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB 2: DOCUMENT LIBRARY (Filtered by Company) */}
                {activeTab === 'pdfs' && (
                    <div className="animate-fade-in-up">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-[#003A70]">Reference Documents</h2>
                            <button
                                onClick={fetchPdfs}
                                className="text-sm font-medium text-gray-500 hover:text-[#003A70] transition flex items-center gap-1"
                            >
                                🔄 Refresh List
                            </button>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-w-4xl">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b border-gray-100">
                                        <th className="p-4 font-semibold">Document Name</th>
                                        <th className="p-4 font-semibold">Uploaded Date</th>
                                        <th className="p-4 font-semibold">Uploaded By</th>
                                        <th className="p-4 font-semibold text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {isLoadingPdfs ? (
                                        <tr><td colSpan="4" className="p-8 text-center text-gray-500 font-medium">Loading documents...</td></tr>
                                    ) : pdfList.length === 0 ? (
                                        <tr><td colSpan="4" className="p-8 text-center text-gray-500 font-medium">No documents available for your company.</td></tr>
                                    ) : (
                                        pdfList.map((pdf, index) => {
                                            const isUnread = pdf.status !== 'READ';
                                            return (
                                                <tr key={index} className={`transition ${isUnread ? 'bg-blue-50/30' : 'hover:bg-gray-50'}`}>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xl">📄</span>
                                                            <span className={`text-sm ${isUnread ? 'font-bold text-[#003A70]' : 'font-medium text-gray-700'}`}>
                                                                {pdf.fileName}
                                                            </span>
                                                            {isUnread && (
                                                                <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm animate-pulse">
                                                                    New
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-sm text-gray-600">{pdf.timestamp}</td>
                                                    <td className="p-4 text-sm text-gray-600">{pdf.uploadedBy}</td>
                                                    <td className="p-4 text-right">
                                                        <button
                                                            onClick={() => handleViewPdf(pdf)}
                                                            className={`inline-block px-4 py-1.5 rounded text-sm font-medium transition shadow-sm ${isUnread
                                                                ? 'bg-[#003A70] text-white hover:bg-[#002850]'
                                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                                }`}
                                                        >
                                                            {isUnread ? 'Review PDF' : 'View Again'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}