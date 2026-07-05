import React, { useRef, useState, useEffect } from 'react';
import { ShieldAlert, Camera, ScanFace, CheckCircle, XCircle, Clock, ExternalLink, UserCheck, Search } from 'lucide-react';

const openReceiptWindow = (data) => {
  if (!data) return;
  
  // Dynamically determine Identity based on Face Scan or Plate Scan
  const isFaceVerified = !!data.verifiedName;
  const isStudentSelf = data.verifiedRelation === "Self" || data.visitorType === "student";

  const category = isStudentSelf ? "Student (Self Entry)" : (isFaceVerified ? `Authorized Visitor (${data.verifiedRelation})` : "Visitor / Parent");
  const displayName = data.verifiedName || data.name || "N/A";
  
  const generatedDate = new Date().toLocaleString();
  const arrival = data.arrivalDate ? new Date(data.arrivalDate).toLocaleString() : new Date().toLocaleString();
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
      <title>Gate Pass - ${data.receiptId || data._id || 'Verified'}</title>
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
          
          @media print {
            body { background-color: white; padding: 0; }
            .card { box-shadow: none; border: 2px solid #000; padding: 20px; }
          }
      </style>
  </head>
  <body>
      <div class="card">
          <div class="header">
              <h1>Banasthali Vidyapith</h1>
              <p>Official Gate Pass</p>
              <div class="status" style="background-color: ${statusBg}; color: ${statusColor};">${statusText}</div>
          </div>
          
          <div class="row"><span class="label">Receipt ID</span><span class="value">${data.receiptId || data._id || 'Auto-Generated'}</span></div>
          <div class="row"><span class="label">Category</span><span class="value">${category}</span></div>
          <div class="row"><span class="label">Full Name</span><span class="value">${displayName}</span></div>
          
          <div class="section-title">Visit Details</div>
          <div class="row"><span class="label">Arrival</span><span class="value">${arrival}</span></div>
          ${!isStudentSelf ? `<div class="row"><span class="label">Departure</span><span class="value">${departure}</span></div>` : ''}
          ${!isStudentSelf && data.totalPeople ? `<div class="row"><span class="label">Total Members</span><span class="value">${data.totalPeople}</span></div>` : ''}
          
          ${isFaceVerified && data.verifiedPhoto ? `
              <div class="section-title">Verified Face Match</div>
              <div class="photo-container">
                  <div class="photo-card">
                      <img src="${data.verifiedPhoto}" class="photo-img" alt="Verified Person" />
                  </div>
              </div>
          ` : ''}

          ${!isFaceVerified && isStudentSelf && data.photo ? `
              <div class="section-title">Student Photo</div>
              <div class="photo-container">
                  <div class="photo-card">
                      <img src="${data.photo}" class="photo-img" alt="Student" />
                  </div>
              </div>
          ` : ''}
          
          <div class="section-title">Transport</div>
          <div class="row"><span class="label">Mode</span><span class="value">${data.transportMode || 'N/A'}</span></div>
          <div class="row"><span class="label">Vehicle No</span><span class="value">${data.vehicleNo || 'N/A'}</span></div>
          
          <div class="section-title">${isStudentSelf ? 'Academic Details' : 'Host Student Details'}</div>
          ${isStudentSelf ? `
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
              <br><br>
              <button onclick="window.print()" style="padding: 10px 20px; background: #1eb854; color: black; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">Print Pass</button>
          </div>
      </div>
  </body>
  </html>
  `;

  const newWindow = window.open();
  if (newWindow) {
      newWindow.document.write(htmlContent);
      newWindow.document.close();
  } else {
      console.warn("Popup blocked. Cannot auto-open receipt.");
      alert("Popup blocked! Please allow popups for this site to view the Official Receipt.");
  }
};

const GuardDashboard = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLiveFeedActive, setIsLiveFeedActive] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isScanningFace, setIsScanningFace] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  const [pendingSearchQuery, setPendingSearchQuery] = useState("");

  const [updateMessage, setUpdateMessage] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [recentVisitors, setRecentVisitors] = useState([]);

  const fetchVisitors = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/visitors');
      if (response.ok) {
        const data = await response.json();
        setRecentVisitors(data);
      }
    } catch (error) {
      console.error("Error fetching visitors:", error);
    }
  };

  useEffect(() => {
    fetchVisitors();
    const interval = setInterval(fetchVisitors, 5000);
    return () => clearInterval(interval);
  }, []);

  const startLiveFeed = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsLiveFeedActive(true);
        setUpdateMessage(null);
      }
    } catch (err) {
      console.error("Error accessing webcam:", err);
      alert("Could not access the camera. Please allow permissions.");
    }
  };

  const stopLiveFeed = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsLiveFeedActive(false);
  };

  const handleManualSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setScanResult(null);
    setUpdateMessage(null);

    try {
      const response = await fetch('http://localhost:5000/api/admin/visitors');
      if (response.ok) {
        const data = await response.json();
        const foundVisitor = data.find(v => 
          (v.receiptId && v.receiptId === searchQuery.trim()) || 
          v._id === searchQuery.trim()
        );

        if (foundVisitor) {
          setScanResult({
            success: true,
            isFaceAuth: false,
            message: "Receipt found via manual search!",
            visitor: foundVisitor
          });
          openReceiptWindow(foundVisitor);
        } else {
          setScanResult({
            success: false,
            message: `No receipt found matching ID: ${searchQuery.trim()}`
          });
        }
      }
    } catch (error) {
      console.error("Manual search error:", error);
      setScanResult({ success: false, message: "Server error during search." });
    } finally {
      setIsSearching(false);
    }
  };

  const handleLiveEntryTest = async () => {
    if (!isLiveFeedActive || !videoRef.current) return;

    setIsScanning(true);
    setScanResult(null);
    setUpdateMessage(null);

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64Image = canvas.toDataURL('image/jpeg', 0.90);

    try {
      const response = await fetch('http://localhost:5000/api/admin/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liveFrame: base64Image })
      });

      const data = await response.json();

      if (data.success && data.visitor) {
        setScanResult(data);
        fetchVisitors(); 
        openReceiptWindow(data.visitor);
      } else {
        setScanResult(data);
      }

    } catch (error) {
      console.error(`Scanning error:`, error);
      setScanResult({ success: false, message: "Server error or timeout during scanning." });
    } finally {
      setIsScanning(false);
    }
  };

  const pendingForms = recentVisitors.filter(v => {
    const isPending = v.status === 'pending_review' || !v.status;
    if (!isPending) return false;
    
    if (!pendingSearchQuery.trim()) return true;
    
    const query = pendingSearchQuery.trim().toLowerCase();
    const visitorName = v.name ? v.name.toLowerCase() : "";
    const hostName = v.hostName ? v.hostName.toLowerCase() : "";
    
    return visitorName.includes(query) || hostName.includes(query);
  });

  const handleFaceVerification = async () => {
    if (!isLiveFeedActive || !videoRef.current) return;

    let targetStudentId = null;
    let targetStudentName = null;
    
    // 🔥 FIX: STRICTLY BIND TO THE INTENDED STUDENT. 
    if (scanResult && scanResult.success && !scanResult.isFaceAuth && scanResult.visitor) {
        targetStudentId = scanResult.visitor.hostId || scanResult.visitor.studentId;
        targetStudentName = scanResult.visitor.hostName || scanResult.visitor.name;
    } else if (pendingForms && pendingForms.length > 0) {
        // If they click Verify without searching, strictly target the top pending pass 
        // to prevent cross-matching another random pending student!
        const topVisitor = pendingForms[0];
        targetStudentId = topVisitor.hostId || topVisitor.studentId;
        targetStudentName = topVisitor.hostName || topVisitor.name;
    }

    setIsScanningFace(true);
    setScanResult(null); 
    setUpdateMessage(null);

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64Image = canvas.toDataURL('image/jpeg');

    try {
      const response = await fetch('http://localhost:5000/api/guard/verify-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            liveFrame: base64Image,
            studentId: targetStudentId,
            studentName: targetStudentName 
        })
      });

      const data = await response.json();
      
      if (data.success && data.person) {
        const matchingVisitor = {
            ...(data.visitor || {}),
            verifiedName: data.person.visitorName,
            verifiedRelation: data.person.relation,
            verifiedPhoto: data.person.visitorPhoto,
            studentId: data.person.studentId,
            hostName: data.person.studentName
        };
          
        setScanResult({
            success: true,
            isFaceAuth: true, 
            message: data.message || "Authorized Person Found & Verified!",
            visitor: matchingVisitor
        });

        fetchVisitors();
        openReceiptWindow(matchingVisitor);

      } else {
        setScanResult({
            success: false,
            message: data.message || "Face not recognized. Person is unauthorized."
        });
      }

    } catch (error) {
      console.error("Face verification error:", error);
      setScanResult({ success: false, message: "Server error during face verification." });
    } finally {
      setIsScanningFace(false);
    }
  };

  const handleStatusUpdate = async (visitorId, newStatus) => {
    setIsUpdating(true);
    setUpdateMessage(null);
    try {
      const response = await fetch(`http://localhost:5000/api/admin/status/${visitorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      const data = await response.json();
      if (response.ok) {
        setUpdateMessage(`✅ Form successfully ${newStatus}!`);
        if (scanResult && scanResult.visitor && scanResult.visitor._id === visitorId) {
          setScanResult(prev => ({
            ...prev,
            visitor: { ...prev.visitor, status: newStatus }
          }));
        }
        fetchVisitors(); 
      } else {
        setUpdateMessage(`❌ Failed to update: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Update error:", error);
      setUpdateMessage("❌ Server error while updating status.");
    } finally {
      setIsUpdating(false);
      setTimeout(() => setUpdateMessage(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8 pt-28 text-white overflow-x-hidden">
      <div className="max-w-6xl mx-auto">
        
        <header className="mb-8 flex items-center justify-between border-b border-gray-700 pb-4">
          <div>
            <h1 className="text-3xl font-black text-blue-400">Security Guard Dashboard</h1>
            <p className="text-gray-400">Entry Shield Live Monitor & Gate Control</p>
          </div>
          <ShieldAlert className="text-blue-500 w-10 h-10 flex-shrink-0" />
        </header>

        {updateMessage && (
          <div className="mb-6 p-4 rounded-lg font-bold text-center bg-blue-900/30 text-blue-300 border border-blue-500/30">
            {updateMessage}
          </div>
        )}

        <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700 mb-8 overflow-x-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Clock className="text-yellow-400" /> Pending Gate Passes
            </h2>
            <div className="relative w-full sm:w-64">
              <input 
                type="text" 
                placeholder="Search pending by name..." 
                value={pendingSearchQuery}
                onChange={(e) => setPendingSearchQuery(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 text-white text-sm rounded-lg pl-10 pr-3 py-2 focus:outline-none focus:border-blue-500"
              />
              <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            </div>
          </div>
          
          <div className="min-w-full">
            <table className="w-full text-left text-sm text-gray-300 whitespace-nowrap">
              <thead className="bg-gray-700/50 text-gray-400 border-b border-gray-600">
                <tr>
                  <th className="p-3">Visitor Name</th>
                  <th className="p-3">Vehicle No</th>
                  <th className="p-3">Host Student</th>
                  <th className="p-3">Type</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingForms.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-6 text-center text-gray-500 font-medium">
                      {pendingSearchQuery.trim() ? "No pending passes match your search." : "No pending passes at the gate."}
                    </td>
                  </tr>
                ) : (
                  pendingForms.map(visitor => (
                    <tr key={visitor._id} className="border-b border-gray-700/50 hover:bg-gray-700/20 transition">
                      <td className="p-3 font-semibold text-white max-w-[150px] truncate">{visitor.name || 'N/A'}</td>
                      <td className="p-3 font-mono text-blue-300">{visitor.vehicleNo || 'N/A'}</td>
                      <td className="p-3 max-w-[150px] truncate">{visitor.hostName || 'N/A'}</td>
                      <td className="p-3 capitalize">{visitor.visitorType || 'N/A'}</td>
                      <td className="p-3 flex justify-center gap-2">
                        <button onClick={() => handleStatusUpdate(visitor._id, 'approved')} disabled={isUpdating} className="bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white border border-green-600/50 px-3 py-1.5 rounded transition flex items-center gap-1 font-bold">
                          <CheckCircle size={16} /> Approve
                        </button>
                        <button onClick={() => handleStatusUpdate(visitor._id, 'rejected')} disabled={isUpdating} className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-600/50 px-3 py-1.5 rounded transition flex items-center gap-1 font-bold">
                          <XCircle size={16} /> Reject
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700 flex flex-col">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Camera className="text-blue-400 flex-shrink-0" /> Gate Surveillance Feed
            </h2>
            
            <div className="bg-black rounded-lg aspect-video overflow-hidden relative border border-gray-600 mb-4 flex items-center justify-center">
              {!isLiveFeedActive && <span className="text-gray-500">Camera Offline</span>}
              <video ref={videoRef} className={`w-full h-full object-cover ${!isLiveFeedActive ? 'hidden' : ''}`} />
              
              {isLiveFeedActive && (isScanning || isScanningFace) && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  
                  {isScanning && (
                    <div className="w-2/3 h-2/5 border border-white/30 bg-blue-500/10 rounded-xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
                      <div className="w-full h-1 bg-blue-400 shadow-[0_0_15px_#60a5fa] absolute top-1/2 -translate-y-1/2 opacity-70"></div>
                    </div>
                  )}

                  <p className="mt-4 text-white font-bold tracking-widest uppercase text-xs bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm text-center">
                    {isScanning ? "Scanning Plate..." : "Verifying Face..."}
                  </p>
                  
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="flex flex-col gap-3 mt-auto">
              <div className="flex flex-col sm:flex-row gap-4">
                <button onClick={startLiveFeed} disabled={isLiveFeedActive} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded transition truncate">
                  {isLiveFeedActive ? "Feed Active" : "Start Live Feed"}
                </button>
                <button onClick={handleLiveEntryTest} disabled={!isLiveFeedActive || isScanning || isScanningFace} className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded flex items-center justify-center gap-2 transition truncate">
                  <ScanFace className="flex-shrink-0" />
                  <span className="truncate">{isScanning ? "Scanning..." : "Scan Plate"}</span>
                </button>
              </div>

              <button onClick={handleFaceVerification} disabled={!isLiveFeedActive || isScanning || isScanningFace} className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded flex items-center justify-center gap-2 transition border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                <UserCheck className="flex-shrink-0" />
                <span className="truncate">{isScanningFace ? "Verifying..." : "Verify Face (Parents/Students)"}</span>
              </button>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700 flex flex-col overflow-hidden min-w-0">
            <h2 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2 flex justify-between items-center">
              <span>Scan & Search Results</span>
            </h2>

            <div className="flex flex-col sm:flex-row gap-2 mb-6 border-b border-gray-700 pb-4">
              <input 
                type="text" 
                placeholder="Enter Receipt ID manually..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                className="flex-1 bg-gray-900 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500 font-mono text-sm"
              />
              <button 
                onClick={handleManualSearch} 
                disabled={isSearching || !searchQuery.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-3 rounded-lg font-bold transition flex items-center justify-center gap-2"
              >
                <Search size={18} /> {isSearching ? "Searching..." : "Search"}
              </button>
            </div>
            
            {!scanResult && !isScanning && !isScanningFace && <div className="text-gray-500 text-center mt-10">Awaiting scan or manual search...</div>}
            
            {isScanning && <div className="text-blue-400 text-center mt-10 animate-pulse font-semibold">Running Plate Analysis...</div>}
            {isScanningFace && <div className="text-purple-400 text-center mt-10 animate-pulse font-semibold">Verifying Face against Database...</div>}
            
            {/* ====== SUCCESS: PLATE SCAN ====== */}
            {scanResult && scanResult.success && !scanResult.isFaceAuth && scanResult.visitor && (
              <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-6 flex flex-col h-full overflow-hidden">
                <div className="flex items-center gap-3 mb-4 text-green-400">
                  <CheckCircle className="w-8 h-8 flex-shrink-0" />
                  <h3 className="text-2xl font-bold truncate">Authorized Person</h3>
                </div>
                <p className="text-sm text-green-300 mb-6 break-words">{scanResult.message}</p>
                <div className="space-y-4 mb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm w-full">
                    {scanResult.visitor.visitorType === 'student' ? (
                      <>
                        <div className="min-w-0">
                          <span className="text-gray-400 block truncate">Student Name</span>
                          <span className="font-semibold text-base md:text-lg block break-words">{scanResult.visitor.name || 'N/A'}</span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-gray-400 block truncate">Student ID</span>
                          <span className="font-semibold text-base md:text-lg block break-all">{scanResult.visitor.studentId || 'N/A'}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="min-w-0">
                          <span className="text-gray-400 block truncate">Visitor Name</span>
                          <span className="font-semibold text-base md:text-lg block break-words">{scanResult.visitor.name || 'N/A'}</span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-gray-400 block truncate">Student Name</span>
                          <span className="font-semibold text-base md:text-lg block break-words">{scanResult.visitor.hostName || 'N/A'}</span>
                        </div>
                      </>
                    )}
                    <div className="min-w-0">
                      <span className="text-gray-400 block truncate">Vehicle No</span>
                      <span className="font-semibold text-base md:text-lg block break-all">{scanResult.visitor.vehicleNo || 'N/A'}</span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-gray-400 block truncate">Status</span>
                      <span className={`font-semibold text-base md:text-lg block capitalize break-words ${scanResult.visitor.status === 'approved' ? 'text-green-400' : (scanResult.visitor.status === 'rejected' ? 'text-red-400' : 'text-yellow-400')}`}>
                        {scanResult.visitor.status || 'Pending'}
                      </span>
                    </div>
                  </div>
                  {scanResult.visitor.status === 'pending_review' && (
                     <div className="mt-4 bg-yellow-900/40 border border-yellow-500/50 text-yellow-200 p-3 rounded text-sm text-center font-bold break-words">
                       ⚠️ Form pending approval!
                     </div>
                  )}
                </div>

                <div className="mt-auto border-t border-green-500/30 pt-4">
                  <button 
                    onClick={() => openReceiptWindow(scanResult.visitor)}
                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded transition flex items-center justify-center gap-2 truncate"
                  >
                    <ExternalLink size={18} className="flex-shrink-0" /> 
                    <span className="truncate">View Official Receipt</span>
                  </button>
                </div>
              </div>
            )}

            {/* ====== SUCCESS: FACE SCAN ====== */}
            {scanResult && scanResult.success && scanResult.isFaceAuth && scanResult.visitor && (
              <div className="bg-purple-900/20 border border-purple-500/50 rounded-lg p-6 flex flex-col h-full overflow-hidden">
                <div className="flex items-center gap-3 mb-4 text-purple-400">
                  <UserCheck className="w-8 h-8 flex-shrink-0" />
                  <h3 className="text-2xl font-bold truncate">Authorized Person</h3>
                </div>
                <p className="text-sm text-purple-300 mb-6 break-words">{scanResult.message}</p>
                <div className="space-y-4 mb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm w-full">
                    {/* Explicitly display Student vs Visitor Info correctly */}
                    {scanResult.visitor.verifiedRelation === 'Self' || scanResult.visitor.visitorType === 'student' ? (
                      <>
                        <div className="min-w-0">
                          <span className="text-gray-400 block truncate">Student Name</span>
                          <span className="font-semibold text-base md:text-lg block text-white break-words">{scanResult.visitor.verifiedName || scanResult.visitor.name || 'N/A'}</span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-gray-400 block truncate">Student ID</span>
                          <span className="font-semibold text-base md:text-lg block text-white break-all">{scanResult.visitor.studentId || 'N/A'}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="min-w-0">
                          <span className="text-gray-400 block truncate">Visitor Name</span>
                          <span className="font-semibold text-base md:text-lg block text-white break-words">{scanResult.visitor.verifiedName || scanResult.visitor.name || 'N/A'}</span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-gray-400 block truncate">Relation</span>
                          <span className="font-semibold text-base md:text-lg block text-white break-words">{scanResult.visitor.verifiedRelation || scanResult.visitor.relation || 'N/A'}</span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-gray-400 block truncate">Student Name</span>
                          <span className="font-semibold text-base md:text-lg block text-white break-words">{scanResult.visitor.hostName || 'N/A'}</span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-gray-400 block truncate">Student ID</span>
                          <span className="font-semibold text-base md:text-lg block text-white break-all">{scanResult.visitor.studentId || 'N/A'}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="mt-auto border-t border-purple-500/30 pt-4 flex flex-col gap-2">
                   <div className="bg-purple-500/20 text-purple-200 p-3 rounded text-sm w-full text-center font-bold break-words">
                      ✅ Person is approved to enter premises
                   </div>
                   {scanResult.visitor._id && (
                     <button 
                       onClick={() => openReceiptWindow(scanResult.visitor)}
                       className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-4 rounded transition flex items-center justify-center gap-2 truncate mt-2"
                     >
                       <ExternalLink size={18} className="flex-shrink-0" /> 
                       <span className="truncate">View Official Receipt</span>
                     </button>
                   )}
                </div>
              </div>
            )}

            {/* ====== FAILURE: ACTION REQUIRED ====== */}
            {scanResult && !scanResult.success && (
              <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6 text-center flex flex-col items-center justify-center h-full">
                <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3 flex-shrink-0" />
                <h3 className="text-2xl font-bold text-red-400 mb-2 truncate max-w-full">
                  {scanResult.message && scanResult.message.toLowerCase().includes("student") ? "Unauthorized Student" : "Unauthorized Person"}
                </h3>
                <p className="text-red-300 break-words">{scanResult.message}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuardDashboard;