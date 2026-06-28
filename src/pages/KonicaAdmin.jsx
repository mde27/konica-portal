import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import * as XLSX from 'xlsx';

export default function KonicaAdmin() {
    const [excelData, setExcelData] = useState([]);
    const [fileName, setFileName] = useState('');

    // Handle File Selection and Parsing
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
            const rawJson = XLSX.utils.sheet_to_json(worksheet);

            setExcelData(rawJson);
        };
        reader.readAsArrayBuffer(file);
    };

    const handleSubmitToDatabase = async () => {
        if (excelData.length === 0) return alert("Please upload a file first.");

        const API_URL = "https://script.google.com/macros/s/AKfycbw07COOO4-hmQ3wGQ-9erc4qcEVS_NvyKBLOAGye24KoqQrXXmtmvUNoktjVVyG1Cej/exec";
        const currentUser = localStorage.getItem('username') || "Unknown Konica Admin";

        try {
            console.log("Sending data to Google Sheets...");

            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "text/plain;charset=utf-8",
                },
                // NEW: We wrap the array in an object with the 'action' command!
                body: JSON.stringify({
                    action: "uploadJobs",
                    requestingUser: currentUser,
                    jobs: excelData
                }),
            });

            const result = await response.json();

            if (result.status === "success") {
                alert(`Success! Placed ${excelData.length} work orders into the database.`);
                setExcelData([]);
                setFileName('');
            } else {
                alert("Server Error: " + result.message);
            }

        } catch (error) {
            console.error("Database Error:", error);
            alert("Failed to send data. Check the console.");
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#F5F7FA]">
            <Navbar title="Konica Job Uploader" />

            <main className="p-8 max-w-6xl mx-auto w-full flex-grow">

                {/* Upload Card */}
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 mb-8">
                    <h2 className="text-xl font-bold text-[#003A70] mb-4">Upload Work Orders (Excel)</h2>

                    <div className="border-2 border-dashed border-blue-200 rounded-lg p-8 text-center bg-blue-50/50">
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="excel-upload"
                        />
                        <label
                            htmlFor="excel-upload"
                            className="cursor-pointer inline-block bg-[#003A70] text-white px-6 py-2.5 rounded-md font-medium hover:bg-[#002850] transition shadow-sm"
                        >
                            Choose Excel File
                        </label>
                        <p className="text-sm text-gray-500 mt-3">
                            {fileName ? `Selected: ${fileName}` : "Upload KonicaTest.xlsx"}
                        </p>
                    </div>
                </div>

                {/* Data Preview Table */}
                {excelData.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold text-gray-800">
                                Preview Data <span className="text-[#003A70] bg-blue-100 px-2 py-0.5 rounded text-sm ml-2">{excelData.length} jobs</span>
                            </h3>
                            <button
                                onClick={handleSubmitToDatabase}
                                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-md font-medium transition shadow-sm"
                            >
                                Confirm & Upload
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#003A70] text-white text-sm uppercase tracking-wider">
                                        <th className="p-4 font-medium">Shipment #</th>
                                        <th className="p-4 font-medium">Device Model</th>
                                        <th className="p-4 font-medium">City</th>
                                        <th className="p-4 font-medium">Customer</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {excelData.map((row, index) => (
                                        <tr key={index} className="hover:bg-blue-50/30 transition text-sm text-gray-700">
                                            <td className="p-4 font-medium">{row.shipment_number || '—'}</td>
                                            <td className="p-4">{row.device_model || '—'}</td>
                                            <td className="p-4">{row.city || '—'}</td>
                                            <td className="p-4">{row.customer || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}