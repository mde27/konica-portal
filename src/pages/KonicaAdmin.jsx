import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import * as XLSX from 'xlsx';
import { jsPDF } from "jspdf";

export default function KonicaAdmin() {
    // TAB STATE
    const [activeTab, setActiveTab] = useState('upload');
    const [selectedCompany, setSelectedCompany] = useState('RED');

    // UPLOAD EXCEL STATE
    const [excelData, setExcelData] = useState([]);
    const [fileName, setFileName] = useState('');

    // UPLOAD PDF STATE
    const [pdfFile, setPdfFile] = useState(null);
    const [isUploadingPdf, setIsUploadingPdf] = useState(false);
    const [selectedPdfCompany, setSelectedPdfCompany] = useState('ALL');

    // VIEW STATE
    const [jobs, setJobs] = useState([]);
    const [filter, setFilter] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [generatingPdfId, setGeneratingPdfId] = useState(null);
    const [reassigningId, setReassigningId] = useState(null);
    const [reassignCompany, setReassignCompany] = useState({});

    const API_URL = "https://script.google.com/macros/s/AKfycbw07COOO4-hmQ3wGQ-9erc4qcEVS_NvyKBLOAGye24KoqQrXXmtmvUNoktjVVyG1Cej/exec";
    const currentUser = localStorage.getItem('username') || "Unknown Konica Admin";

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
            console.error("Failed to fetch", error);
        } finally {
            setIsLoading(false);
        }
    };

    // ==========================================
    // EXCEL UPLOAD LOGIC
    // ==========================================
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setFileName(file.name);

        const reader = new FileReader();
        reader.onload = (event) => {
            const arrayBuffer = event.target.result;
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            const rawJson = XLSX.utils.sheet_to_json(worksheet, { raw: false });

            const mappedData = rawJson.map(row => {
                const getVal = (searchString) => {
                    const key = Object.keys(row).find(k => k.toLowerCase().includes(searchString.toLowerCase()));
                    return key ? String(row[key]).trim() : "";
                };

                return {
                    shipment_number: getVal("Numar Aviz"),
                    customer: getVal("Client"),
                    city: getVal("Oras"),
                    device_model: getVal("Numar Delivery Note") || "Fără DN",
                    trimitere: getVal("Data trimitere"),
                    incarcare: getVal("Data incarcare"),
                    livrare: getVal("data livrare")
                };
            });

            const validData = mappedData.filter(job => job.shipment_number !== "");
            setExcelData(validData);
        };
        reader.readAsArrayBuffer(file);
    };

    const handleSubmitToDatabase = async () => {
        if (excelData.length === 0) return alert("Please upload a file first.");

        const existingShipments = new Set(jobs.map(job => String(job.shipment_number).trim()));
        const uniqueJobs = [];
        const duplicateShipments = [];

        excelData.forEach(job => {
            const currentShipment = String(job.shipment_number).trim();
            if (existingShipments.has(currentShipment)) {
                duplicateShipments.push(currentShipment);
            } else {
                uniqueJobs.push(job);
            }
        });

        if (duplicateShipments.length > 0) {
            const proceed = window.confirm(
                `⚠️ Found ${duplicateShipments.length} duplicate shipment(s) that are already in the database.\n\n` +
                `Duplicates: ${duplicateShipments.slice(0, 5).join(', ')}${duplicateShipments.length > 5 ? ' ...and more' : ''}\n\n` +
                `Do you want to skip these duplicates and upload the remaining ${uniqueJobs.length} new jobs?`
            );
            if (!proceed) return;
        }

        if (uniqueJobs.length === 0) {
            return alert("All jobs in this Excel file already exist in the database. Nothing new to upload.");
        }

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({
                    action: "uploadJobs",
                    requestingUser: currentUser,
                    companyColor: selectedCompany,
                    jobs: uniqueJobs
                }),
            });

            const result = await response.json();
            if (result.status === "success") {
                alert(`Success! Placed ${uniqueJobs.length} new work orders into the database.`);
                setExcelData([]);
                setFileName('');
                fetchJobs();
                setActiveTab('view');
            } else {
                alert("Server Error: " + result.message);
            }
        } catch (error) {
            alert("Failed to send data.");
        }
    };

    const handleReassignJob = async (shipment_number) => {
        const newCompany = reassignCompany[shipment_number];
        if (!newCompany) return alert("Please select a company first.");

        const confirmReassign = window.confirm(`Re-assign shipment ${shipment_number} to ${newCompany} company?`);
        if (!confirmReassign) return;

        setReassigningId(shipment_number);

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({
                    action: "reassignJob",
                    requestingUser: currentUser,
                    shipment_number: shipment_number,
                    newCompany: newCompany
                })
            });

            const result = await response.json();
            if (result.status === "success") {
                alert(`Job re-assigned to ${newCompany}.`);
                setReassignCompany(prev => {
                    const copy = { ...prev };
                    delete copy[shipment_number];
                    return copy;
                });
                fetchJobs();
            } else {
                alert("Failed to re-assign: " + (result.message || "Unknown error"));
            }
        } catch (error) {
            alert("Network error while re-assigning job.");
        } finally {
            setReassigningId(null);
        }
    };

    // ==========================================
    // PDF UPLOAD LOGIC
    // ==========================================
    const handlePdfSelect = (e) => {
        const file = e.target.files[0];
        if (file && file.type === "application/pdf") {
            setPdfFile(file);
        } else {
            alert("Please select a valid PDF file.");
            e.target.value = null;
        }
    };

    const handlePdfUpload = async () => {
        if (!pdfFile) return alert("Please select a PDF file first.");
        setIsUploadingPdf(true);

        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64Data = event.target.result.split(',')[1];

            try {
                const response = await fetch(API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "text/plain;charset=utf-8" },
                    body: JSON.stringify({
                        action: "uploadPdf",
                        requestingUser: currentUser,
                        fileName: pdfFile.name,
                        fileBase64: base64Data,
                        company: selectedPdfCompany
                    })
                });

                const result = await response.json();
                if (result.status === "success") {
                    alert("PDF successfully uploaded to Google Drive!");
                    setPdfFile(null);
                    setSelectedPdfCompany('ALL');
                } else {
                    alert("Error saving PDF: " + result.message);
                }
            } catch (error) {
                alert("Network error uploading PDF.");
            } finally {
                setIsUploadingPdf(false);
            }
        };
        reader.readAsDataURL(pdfFile);
    };

    // ==========================================
    // EXPORT & PDF GENERATOR
    // ==========================================
    const handleWeeklyExport = () => {
        if (jobs.length === 0) return alert("No data to export.");
        const worksheet = XLSX.utils.json_to_sheet(jobs);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Admin_Works_Export");
        const dateStr = new Date().toISOString().split('T')[0];
        XLSX.writeFile(workbook, `Konica_Admin_Export_${dateStr}.xlsx`);
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

    // Helper function to get row color based on company
    const getRowColor = (company) => {
        if (company === 'RED') return 'bg-red-50 hover:bg-red-100';
        if (company === 'BLUE') return 'bg-blue-50 hover:bg-blue-100';
        if (company === 'GREEN') return 'bg-green-50 hover:bg-green-100';
        if (company === 'YELLOW') return 'bg-yellow-50 hover:bg-yellow-100';
        return 'hover:bg-gray-50';
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#F5F7FA]">
            <Navbar title="Konica Admin Portal" />

            <main className="p-4 md:p-8 max-w-7xl mx-auto w-full flex-grow">

                {/* TAB NAVIGATION */}
                <div className="flex space-x-2 border-b border-gray-200 mb-6 mt-2 overflow-x-auto">
                    <button onClick={() => setActiveTab('upload')} className={`px-6 py-3 font-bold text-sm tracking-wide whitespace-nowrap transition-all duration-200 ${activeTab === 'upload' ? 'text-[#003A70] border-b-2 border-[#003A70]' : 'text-gray-500 hover:text-gray-700'}`}>📤 UPLOAD JOBS</button>
                    <button onClick={() => setActiveTab('view')} className={`px-6 py-3 font-bold text-sm tracking-wide whitespace-nowrap transition-all duration-200 ${activeTab === 'view' ? 'text-[#003A70] border-b-2 border-[#003A70]' : 'text-gray-500 hover:text-gray-700'}`}>🗄️ VIEW DATABASE</button>
                    <button onClick={() => setActiveTab('upload-pdf')} className={`px-6 py-3 font-bold text-sm tracking-wide whitespace-nowrap transition-all duration-200 ${activeTab === 'upload-pdf' ? 'text-[#003A70] border-b-2 border-[#003A70]' : 'text-gray-500 hover:text-gray-700'}`}>📄 UPLOAD FORWARDED WORKS</button>
                    <button onClick={() => setActiveTab('returned')} className={`px-6 py-3 font-bold text-sm tracking-wide whitespace-nowrap transition-all duration-200 ${activeTab === 'returned' ? 'text-[#003A70] border-b-2 border-[#003A70]' : 'text-gray-500 hover:text-gray-700'}`}>↩️ RETURNED WORKS</button>
                </div>

                {/* TAB 1: UPLOAD JOBS */}
                {activeTab === 'upload' && (
                    <div className="animate-fade-in-up">
                        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 mb-8 max-w-3xl">
                            <h2 className="text-xl font-bold text-[#003A70] mb-4">Upload Work Orders (Excel)</h2>
                            <div className="border-2 border-dashed border-blue-200 rounded-lg p-8 text-center bg-blue-50/50">
                                <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" id="excel-upload" />
                                <label htmlFor="excel-upload" className="cursor-pointer inline-block bg-[#003A70] text-white px-6 py-2.5 rounded-md font-medium hover:bg-[#002850] transition shadow-sm">Choose Excel File</label>
                                <p className="text-sm text-gray-500 mt-3">{fileName ? <span className="font-bold text-[#003A70]">{fileName}</span> : "Upload your formatted Excel file"}</p>
                            </div>
                        </div>

                        {excelData.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/50">
                                    <h3 className="font-bold text-gray-800">Preview Data <span className="text-[#003A70] bg-blue-100 px-2 py-0.5 rounded text-sm ml-2">{excelData.length} works pending</span></h3>
                                    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded border border-gray-200">
                                        <label className="font-bold text-gray-700 text-sm">Assign to:</label>
                                        <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="border-none bg-gray-50 rounded p-1 text-sm font-bold outline-none cursor-pointer">
                                            <option value="RED">🔴 Mutantii</option>
                                            <option value="BLUE">🔵 Vlad</option>
                                            <option value="GREEN">🟢 GREEN Company</option>
                                            <option value="YELLOW">🟡 YELLOW Company</option>
                                        </select>
                                    </div>
                                    <button onClick={handleSubmitToDatabase} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-bold transition shadow-sm w-full md:w-auto">✅ Confirm & Upload to Database</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 2: VIEW DATABASE (with Company Colors) */}
                {activeTab === 'view' && (
                    <div className="animate-fade-in-up">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                            <h2 className="text-2xl font-bold text-[#003A70]">Master Records Database</h2>
                            
                            {/* Company Color Legend */}
                            <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm">
                                <div className="text-xs font-bold text-gray-600 mb-1">Company Colors:</div>
                                <div className="flex gap-3 text-xs">
                                    <div className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded-full"></span> Mutantii</div>
                                    <div className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded-full"></span> Vlad</div>
                                    <div className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded-full"></span> GREEN</div>
                                    <div className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-500 rounded-full"></span> YELLOW</div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-4 items-center">
                                <button onClick={handleWeeklyExport} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium text-sm transition shadow-sm flex items-center gap-2">📥 Export Database</button>
                                <div className="flex gap-2 bg-white p-1 rounded-lg shadow-sm border border-gray-100">
                                    <button onClick={() => setFilter('ALL')} className={`px-4 py-2 rounded-md font-medium text-sm transition ${filter === 'ALL' ? 'bg-[#003A70] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>All Records</button>
                                    <button onClick={() => setFilter('BLUE')} className={`px-4 py-2 rounded-md font-medium text-sm transition ${filter === 'BLUE' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Pending</button>
                                    <button onClick={() => setFilter('GREEN')} className={`px-4 py-2 rounded-md font-medium text-sm transition ${filter === 'GREEN' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Completed</button>
                                </div>
                            </div>
                        </div>

                        <div className="mb-6 relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-gray-400">🔍</span></div>
                            <input type="text" placeholder="Search master database by ID, Customer, City, or Model..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-[#003A70] outline-none transition bg-white" />
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
                                        <tr><td colSpan="5" className="p-8 text-center text-gray-500 font-medium">Loading master database...</td></tr>
                                    ) : filteredJobs.length === 0 ? (
                                        <tr><td colSpan="5" className="p-8 text-center text-gray-500 font-medium">No records found matching your search.</td></tr>
                                    ) : (
                                        filteredJobs.map((job, index) => {
                                            const hasComments = job.comments && job.comments.trim() !== '';
                                            return (
                                                <tr key={index} className={`${getRowColor(job.company)} transition`}>
                                                    <td className="p-4"><span className={`text-white text-xs font-bold px-3 py-1 rounded-full uppercase ${job.status === 'GREEN' ? 'bg-green-600' : 'bg-blue-500'}`}>{job.status}</span></td>
                                                    <td className="p-4 font-bold text-gray-900">
                                                        <div className="flex items-center gap-2">
                                                            <span>{job.shipment_number || '—'}</span>
                                                            {hasComments && <span className="flex h-3 w-3 relative" title={`Comments:\n${job.comments}`}><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>}
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
                                                        <div className="flex gap-4 items-center">
                                                            {job.photo_url ? <a href={job.photo_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1">📷 Photo</a> : <span className="text-gray-400 text-sm">Awaiting</span>}
                                                            <button onClick={() => downloadPDF(job)} disabled={generatingPdfId === job.shipment_number} className={`${generatingPdfId === job.shipment_number ? 'text-orange-500' : 'text-gray-500 hover:text-[#003A70]'} text-sm font-bold flex items-center gap-1 transition`}>
                                                                {generatingPdfId === job.shipment_number ? '⏳ Loading...' : '📄 PDF'}
                                                            </button>
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

                {/* TAB 3: UPLOAD PDF MANUALS */}
                {activeTab === 'upload-pdf' && (
                    <div className="animate-fade-in-up">
                        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 max-w-3xl">
                            <h2 className="text-xl font-bold text-[#003A70] mb-4">Upload PDF Document to Drive</h2>
                            <div className="border-2 border-dashed border-red-200 rounded-lg p-8 text-center bg-red-50/30">
                                <input type="file" accept=".pdf" onChange={handlePdfSelect} className="hidden" id="pdf-upload" />
                                <label htmlFor="pdf-upload" className="cursor-pointer inline-block bg-red-600 text-white px-6 py-2.5 rounded-md font-medium hover:bg-red-700 transition shadow-sm mb-4">Select PDF File</label>
                                {pdfFile ? (
                                    <div className="bg-white p-4 rounded border border-red-100 mt-4 text-left">
                                        <div className="flex items-center gap-3 mb-4">
                                            <span className="text-2xl">📄</span>
                                            <div>
                                                <p className="font-bold text-gray-800 text-sm">{pdfFile.name}</p>
                                                <p className="text-xs text-gray-500">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                            </div>
                                        </div>
                                        <div className="mb-4">
                                            <label className="block text-sm font-bold text-gray-700 mb-1">This document is for:</label>
                                            <select value={selectedPdfCompany} onChange={(e) => setSelectedPdfCompany(e.target.value)} className="w-full border p-2 rounded bg-white text-sm">
                                                <option value="ALL">🌍 ALL Companies (Global)</option>
                                                <option value="RED">🔴 RED Company</option>
                                                <option value="BLUE">🔵 BLUE Company</option>
                                                <option value="GREEN">🟢 GREEN Company</option>
                                                <option value="YELLOW">🟡 YELLOW Company</option>
                                            </select>
                                        </div>
                                        <button onClick={handlePdfUpload} disabled={isUploadingPdf} className={`${isUploadingPdf ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} text-white px-6 py-2 rounded-md font-bold text-sm transition w-full`}>
                                            {isUploadingPdf ? 'Uploading...' : 'Upload to Drive'}
                                        </button>
                                    </div>
                                ) : <p className="text-sm text-gray-500">No file selected.</p>}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 4: RETURNED WORKS */}
                {activeTab === 'returned' && (
                    <div className="animate-fade-in-up">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-[#003A70]">Returned Works</h2>
                                <p className="text-sm text-gray-500">Jobs sent back by Supervisors that need re-assignment</p>
                            </div>
                            <button onClick={fetchJobs} className="text-sm font-medium text-gray-500 hover:text-[#003A70] flex items-center gap-1">🔄 Refresh</button>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b border-gray-100">
                                        <th className="p-4 font-semibold">Shipment #</th>
                                        <th className="p-4 font-semibold">Customer / City</th>
                                        <th className="p-4 font-semibold">Current Company</th>
                                        <th className="p-4 font-semibold">Re-assign To</th>
                                        <th className="p-4 font-semibold">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {isLoading ? (
                                        <tr><td colSpan="5" className="p-8 text-center text-gray-500 font-medium">Loading returned jobs...</td></tr>
                                    ) : jobs.filter(j => j.status === 'RED').length === 0 ? (
                                        <tr><td colSpan="5" className="p-8 text-center text-gray-500 font-medium">No returned jobs at the moment. Good job!</td></tr>
                                    ) : (
                                        jobs.filter(j => j.status === 'RED').map((job, index) => (
                                            <tr key={index} className="hover:bg-red-50/30 transition">
                                                <td className="p-4 font-bold text-gray-900">{job.shipment_number}</td>
                                                <td className="p-4"><div className="font-medium">{job.customer}</div><div className="text-xs text-gray-500">{job.city}</div></td>
                                                <td className="p-4">
                                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white ${job.company === 'RED' ? 'bg-red-500' : job.company === 'BLUE' ? 'bg-blue-500' : job.company === 'GREEN' ? 'bg-green-500' : job.company === 'YELLOW' ? 'bg-yellow-500' : ''}`}>
                                                        {job.company || '—'}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <select value={reassignCompany[job.shipment_number] || ''} onChange={(e) => setReassignCompany({ ...reassignCompany, [job.shipment_number]: e.target.value })} className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full max-w-[160px]">
                                                        <option value="">Select company...</option>
                                                        <option value="RED">🔴 RED Company</option>
                                                        <option value="BLUE">🔵 BLUE Company</option>
                                                        <option value="GREEN">🟢 GREEN Company</option>
                                                        <option value="YELLOW">🟡 YELLOW Company</option>
                                                    </select>
                                                </td>
                                                <td className="p-4">
                                                    <button onClick={() => handleReassignJob(job.shipment_number)} disabled={reassigningId === job.shipment_number || !reassignCompany[job.shipment_number]} className="bg-[#003A70] hover:bg-[#002850] disabled:bg-gray-300 text-white px-4 py-2 rounded-md text-sm font-bold transition flex items-center gap-2">
                                                        {reassigningId === job.shipment_number ? 'Re-assigning...' : '✅ Re-assign & Activate'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
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