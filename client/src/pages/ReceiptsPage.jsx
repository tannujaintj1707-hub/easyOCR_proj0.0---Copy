import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, ArrowLeft, Download, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

const THEME = {
  bgDark: "bg-[#0b0808]",
  card: "bg-[#171212]",
  primary: "#1eb854",
};

const ReceiptView = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const receiptId = searchParams.get("id");
  const [receiptData, setReceiptData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        let targetId = receiptId;
        
        if (!targetId) {
             const myIds = JSON.parse(localStorage.getItem("my_receipt_ids") || "[]");
             targetId = myIds[0]; 
        }

        if (!targetId) {
            setLoading(false);
            return;
        }

        let found = null;

        try {
          const response = await fetch("http://127.0.0.1:5000/api/visits");
          if (response.ok) {
            const allVisits = await response.json();
            found = allVisits.find((r) => r.receiptId === targetId || r._id === targetId);
          }
        } catch (apiError) {
          console.warn("Backend connection delayed, checking local backup...");
        }

        if (!found) {
          const allReceipts = JSON.parse(localStorage.getItem("all_receipts") || "[]");
          found = allReceipts.find((r) => r.receiptId === targetId);
          
          if (!found) {
            const visitorRecords = JSON.parse(localStorage.getItem("visitor_records") || "[]");
            found = visitorRecords.find((r) => r.receiptId === targetId);
          }
        }

        if (found) {
          setReceiptData(found);
        }
      } catch (error) {
        console.error("Error fetching receipt:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReceipt();
  }, [receiptId]);

  useEffect(() => {
    if (receiptData) {
      const downloadFlag = `downloaded_${receiptData.receiptId || receiptData._id}`;
      
      if (!sessionStorage.getItem(downloadFlag)) {
          generateAndDownloadFile(receiptData);
          sessionStorage.setItem(downloadFlag, "true");
      }
    }
  }, [receiptData]);

  const generateAndDownloadFile = (data) => {
    const isStudent = data.visitorType === "student";
    const generatedDate = new Date(data.submittedAt || new Date()).toLocaleString();
    const arrival = data.arrivalDate ? new Date(data.arrivalDate).toLocaleString() : "N/A";
    const departure = data.departureDate ? new Date(data.departureDate).toLocaleString() : "N/A";

    const rawStatus = data.status || 'approved';
    const statusText = rawStatus.replace('_', ' ').toUpperCase();
    let statusBg = '#dcfce7';
    let statusColor = '#166534';
    
    if (rawStatus === 'rejected') {
        statusBg = '#fee2e2';
        statusColor = '#991b1b';
    } else if (rawStatus === 'pending_review') {
        statusBg = '#fef3c7';
        statusColor = '#854d0e';
    }

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Gate Pass - ${data.receiptId || data._id}</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; padding: 40px; display: flex; justify-content: center; }
            .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); max-width: 500px; width: 100%; border-top: 8px solid #1eb854; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px dashed #e5e7eb; padding-bottom: 20px; }
            .header h1 { margin: 0; color: #111827; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; }
            .header p { margin: 5px 0 0; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; }
            .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-top: 10px; }
            .row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
            .row:last-child { border-bottom: none; }
            .label { color: #6b7280; font-size: 13px; font-weight: 600; text-transform: uppercase; }
            .value { color: #111827; font-size: 14px; font-weight: 700; text-align: right; max-width: 60%; word-wrap: break-word; }
            .section-title { color: #1eb854; font-size: 12px; font-weight: bold; text-transform: uppercase; margin: 24px 0 8px; letter-spacing: 1px; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #9ca3af; }
            
            .photo-container { display: flex; flex-wrap: wrap; gap: 15px; margin-top: 10px; }
            .photo-card { display: flex; flex-direction: column; align-items: center; text-align: center; width: 80px; }
            .photo-img { width: 80px; height: 80px; object-fit: cover; border-radius: 8px; border: 2px solid #1eb854; background-color: #f3f4f6; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #9ca3af; }
            .photo-name { font-size: 11px; font-weight: 600; color: #111827; margin-top: 4px; line-height: 1.2; word-wrap: break-word; }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="header">
                <h1>Banasthali Vidyapith</h1>
                <p>Official Gate Pass</p>
                <div class="status" style="background-color: ${statusBg}; color: ${statusColor};">${statusText}</div>
            </div>
            
            <div class="row"><span class="label">Receipt ID</span><span class="value">${data.receiptId || data._id}</span></div>
            <div class="row"><span class="label">Category</span><span class="value">${isStudent ? "Student" : "Visitor / Parent"}</span></div>
            <div class="row"><span class="label">Full Name</span><span class="value">${data.name}</span></div>
            
            <div class="section-title">Visit Details</div>
            <div class="row"><span class="label">Arrival</span><span class="value">${arrival}</span></div>
            ${!isStudent ? `<div class="row"><span class="label">Departure</span><span class="value">${departure}</span></div>` : ''}
            ${!isStudent ? `<div class="row"><span class="label">Total Members</span><span class="value">${data.totalPeople || 1}</span></div>` : ''}
            
            ${isStudent && data.photo ? `
                <div class="section-title">Student Photo</div>
                <div class="photo-container">
                    <div class="photo-card">
                        <img src="${data.photo}" class="photo-img" alt="Student" />
                    </div>
                </div>
            ` : ''}

            ${!isStudent && data.members && data.members.length > 0 ? `
                <div class="section-title">Visitor Photos</div>
                <div class="photo-container">
                    ${data.members.map(member => `
                        <div class="photo-card">
                            ${member.photo ? `<img src="${member.photo}" class="photo-img" alt="${member.name}" />` : `<div class="photo-img">No Photo</div>`}
                            <span class="photo-name">${member.name}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            <div class="section-title">Transport</div>
            <div class="row"><span class="label">Mode</span><span class="value">${data.transportMode || 'N/A'}</span></div>
            <div class="row"><span class="label">Vehicle No</span><span class="value">${data.vehicleNo || 'N/A'}</span></div>
            
            <div class="section-title">${isStudent ? 'Academic Details' : 'Meeting Details'}</div>
            ${isStudent ? `
                <div class="row"><span class="label">Student ID</span><span class="value">${data.studentId || 'N/A'}</span></div>
                <div class="row"><span class="label">Course</span><span class="value">${data.course || 'N/A'}</span></div>
                <div class="row"><span class="label">Hostel</span><span class="value">${data.hostelName || 'N/A'}</span></div>
            ` : `
                <div class="row"><span class="label">Student Name</span><span class="value">${data.hostName || 'N/A'}</span></div>
                <div class="row"><span class="label">Student ID</span><span class="value">${data.hostId || 'N/A'}</span></div>
                <div class="row"><span class="label">Course</span><span class="value">${data.hostCourse || 'N/A'}</span></div>
                <div class="row"><span class="label">Hostel</span><span class="value">${data.hostHostel || 'N/A'}</span></div>
            `}
            
            <div class="footer">
                Generated on: ${generatedDate}<br>
                Security Checked. No physical signature required.
            </div>
        </div>
    </body>
    </html>
    `;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${data.receiptId || 'Pass'}_GatePass.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${THEME.bgDark}`}>
        <span className="loading loading-spinner loading-lg text-[#1eb854]"></span>
      </div>
    );
  }

  if (!receiptData) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${THEME.bgDark} text-white p-4`}>
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Receipt Not Found</h2>
        <p className="text-white/60 mb-6">The requested gate pass could not be located.</p>
        <button onClick={() => navigate("/")} className="px-6 py-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all font-bold flex items-center gap-2">
          <ArrowLeft size={18} /> Go Home
        </button>
      </div>
    );
  }

  const isStudent = receiptData.visitorType === "student";

  return (
    <div className={`min-h-screen py-12 px-4 flex flex-col items-center justify-center ${THEME.bgDark}`}>
      
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full text-center space-y-6">
        
        <div className="w-24 h-24 bg-[#1eb854]/10 rounded-full mx-auto flex items-center justify-center border-4 border-[#1eb854] shadow-[0_0_30px_rgba(30,184,84,0.4)]">
            <CheckCircle className="text-[#1eb854] w-12 h-12" />
        </div>
        
        <div>
          <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Pass Downloaded!</h2>
          <p className="text-white/60 text-sm mb-8">
            Your official receipt (<span className="text-[#1eb854] font-mono">{receiptData.receiptId || receiptData._id?.substring(0,8)}</span>) has been automatically downloaded to your device.
          </p>
        </div>

        <div className={`${THEME.card} border border-white/10 rounded-3xl p-6 text-left space-y-4`}>
            <div className="border-b border-white/10 pb-4">
                <p className="text-xs text-white/40 uppercase font-bold tracking-widest">Visitor Name</p>
                <p className="text-lg text-white font-bold">{receiptData.name}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 border-b border-white/10 pb-4">
                <div>
                    <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Arrival</p>
                    <p className="text-sm text-white font-medium">{receiptData.arrivalDate ? new Date(receiptData.arrivalDate).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div>
                    <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Transport</p>
                    <p className="text-sm text-white font-medium">{receiptData.transportMode || 'N/A'}</p>
                </div>
            </div>

            <div>
                <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Meeting Details</p>
                <p className="text-sm text-[#1eb854] font-bold uppercase">
                    {isStudent 
                      ? `${receiptData.course || 'N/A'} - ${receiptData.hostelName || 'N/A'}` 
                      : `${receiptData.hostName || 'N/A'} (${receiptData.hostCourse || 'N/A'} - ${receiptData.hostHostel || 'N/A'})`}
                </p>
            </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <button onClick={() => navigate("/")} className="w-full py-4 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-all flex items-center justify-center gap-2">
                <ArrowLeft size={18} /> Back to Home
            </button>
            <button onClick={() => generateAndDownloadFile(receiptData)} className="w-full py-4 rounded-xl bg-[#1eb854] text-black font-bold hover:bg-[#16a34a] shadow-[0_0_20px_rgba(30,184,84,0.2)] transition-all flex items-center justify-center gap-2">
                <Download size={18} /> Download Again
            </button>
        </div>

      </motion.div>
    </div>
  );
};

export default ReceiptView;