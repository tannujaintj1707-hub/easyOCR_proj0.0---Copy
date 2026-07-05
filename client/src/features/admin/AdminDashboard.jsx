import React, { useState, useEffect } from 'react';
import { Shield, Users, CheckCircle, XCircle, Clock, Edit, Trash2, Camera, Plus, Upload, FileText, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { studentRegistrationSchema } from "../../utils/schemas";
import { motion, AnimatePresence } from "framer-motion";

// Reusable Image Compressor for the registration form
const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scaleSize = 600 / img.width;
        canvas.width = 600;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.6));
      };
    };
  });
};

// Internal Component for the PDF-based Student Form
const StudentRegistrationForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentPhotoFile, setStudentPhotoFile] = useState(null); 
  const [toast, setToast] = useState(null); // Modern Toast Notification State

  const showToast = (message, type = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const { register, handleSubmit, control, watch, formState: { errors }, reset } = useForm({
    resolver: zodResolver(studentRegistrationSchema),
    defaultValues: {
      authorizedPersons: [{ name: "", relation: "", mobile: "", address: "", photo: null }]
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: "authorizedPersons" });

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      if (!studentPhotoFile) {
        showToast("Student Photo is a compulsory field. Please upload the student's photo.", "error");
        setIsSubmitting(false);
        return;
      }

      const studentPhotoB64 = await compressImage(studentPhotoFile);

      const processedPersons = await Promise.all(
        data.authorizedPersons.map(async (person) => {
          let b64 = null;
          if (person.photo && person.photo[0]) {
            b64 = await compressImage(person.photo[0]);
          }
          return { ...person, photo: b64 };
        })
      );

      const finalPayload = { ...data, studentPhoto: studentPhotoB64, authorizedPersons: processedPersons };

      const response = await fetch("http://localhost:5000/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalPayload),
      });

      const resultData = await response.json();

      if (response.ok) {
        showToast("Student Application Registered Successfully!", "success");
        reset();
        setStudentPhotoFile(null); 
      } else {
        showToast(`Submission Failed: ${resultData.error || 'Please check your input details and try again.'}`, "error");
      }
    } catch (error) {
      console.error(error);
      showToast("An error occurred while connecting to the server.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = "w-full px-4 py-3 rounded-xl bg-black/40 text-white outline-none border border-white/10 focus:border-[#1eb854]";

  return (
    <div className="p-6 bg-[#171212] border border-white/10 rounded-3xl shadow-2xl relative">
      
      {/* 🚨 MODERN TOAST NOTIFICATION OVERLAY 🚨 */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 backdrop-blur-md border ${
              toast.type === "error" ? "bg-red-500/10 border-red-500/50 text-red-200" : "bg-green-500/10 border-green-500/50 text-green-200"
            }`}
          >
            {toast.type === "error" ? <XCircle size={20} className="text-red-400" /> : <CheckCircle size={20} className="text-green-400" />}
            <span className="text-sm font-bold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <FileText className="text-[#1eb854]" /> Student Admission Registration
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Personal Details */}
        <div className="p-5 border border-white/5 rounded-2xl bg-white/5 space-y-4">
          <h3 className="text-[#1eb854] font-bold uppercase text-xs tracking-wider">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white/50 uppercase">Student Name</label>
              <input {...register("studentName")} placeholder="Full Name" className={inputStyle} />
              {errors.studentName && <span className="text-red-400 text-xs">{errors.studentName.message}</span>}
            </div>
            <div>
              <label className="text-xs text-white/50 uppercase">Student ID</label>
              <input 
                {...register("studentId")} 
                placeholder="e.g. ABCDE12345" 
                onInput={(e) => e.target.value = e.target.value.toUpperCase()}
                className={inputStyle} 
              />
              {errors.studentId && <span className="text-red-400 text-xs">{errors.studentId.message}</span>}
            </div>
            <div>
              <label className="text-xs text-white/50 uppercase">Applying Class</label>
              <input 
                {...register("applyingClass")} 
                placeholder="e.g. B.TECH CSE 2ND YR" 
                className={inputStyle} 
                required
                minLength="3"
                maxLength="50"
                pattern="^((B\.?TECH|M\.?TECH)\s[A-Z]+\s[1-4](ST|ND|RD|TH)|(BBA|BCA|B\.?SC|B\.?COM|B\.?A)\s[A-Z]+\s[1-3](ST|ND|RD))\sYR$"
                title="Format: DEGREE BRANCH YEAR YR (e.g., B.TECH CSE 2ND YR). BBA/BCA allow max 3 years."
                onInput={(e) => {
                  e.target.value = e.target.value.toUpperCase();
                }}
              />
              {errors.applyingClass && <span className="text-red-400 text-xs">{errors.applyingClass.message}</span>}
            </div>
            <div>
              <label className="text-xs text-white/50 uppercase">Date of Birth</label>
              <input type="date" {...register("dob")} className={inputStyle} />
              {errors.dob && <span className="text-red-400 text-xs">{errors.dob.message}</span>}
            </div>
            <div>
              <label className="text-xs text-white/50 uppercase">Category</label>
              <select {...register("category")} className={inputStyle}>
                <option value="General">General</option>
                <option value="SC">SC</option>
                <option value="ST">ST</option>
                <option value="OBC">OBC</option>
                <option value="Other">Other</option>
              </select>
            </div>
            {/* NEW: Compulsory Student Photo Upload */}
            <div>
              <label className="text-xs text-white/50 uppercase flex justify-between">
                <span>Student Photo <span className="text-red-500">*</span></span>
              </label>
              <input 
                type="file" 
                id="student-photo-upload" 
                className="hidden" 
                accept="image/*" 
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) setStudentPhotoFile(e.target.files[0]);
                }} 
              />
              <label 
                htmlFor="student-photo-upload" 
                className={`w-full mt-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border ${!studentPhotoFile ? 'border-red-500 text-red-400 bg-red-500/10' : 'border-[#1eb854] text-[#1eb854] bg-[#1eb854]/10'} cursor-pointer hover:bg-white/10 transition text-sm font-bold`}
              >
                <Upload size={18} /> {studentPhotoFile ? "Photo Uploaded Successfully" : "Upload Student Photo"}
              </label>
            </div>
          </div>
        </div>

        {/* Guardian Details */}
        <div className="p-5 border border-white/5 rounded-2xl bg-white/5 space-y-4">
          <h3 className="text-[#1eb854] font-bold uppercase text-xs tracking-wider">Family & Contact Info</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-white/50 uppercase">Father's Name</label>
              <input {...register("fatherName")} className={inputStyle} />
            </div>
            <div>
              <label className="text-xs text-white/50 uppercase">Mother's Name</label>
              <input {...register("motherName")} className={inputStyle} />
            </div>
            <div>
              <label className="text-xs text-white/50 uppercase">Guardian's Name</label>
              <input {...register("guardianName")} className={inputStyle} />
            </div>
            <div>
              <label className="text-xs text-white/50 uppercase">Gross Annual Income (₹)</label>
              <input 
                type="number"
                step="0.01"
                min="0"
                max="1000000000"
                required
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'e' || e.key === '+') {
                    e.preventDefault();
                  }
                }}
                {...register("guardianIncome")} 
                placeholder="e.g. 1000000" 
                className={inputStyle} 
              />
              {errors.guardianIncome && <span className="text-red-400 text-xs">{errors.guardianIncome.message}</span>}
            </div>
            <div>
              <label className="text-xs text-white/50 uppercase">Mobile No</label>
              <input 
                type="tel"
                pattern="^[1-9][0-9]{9}$"
                maxLength="10"
                title="Mobile number must be exactly 10 digits and cannot start with 0"
                required
                onInput={(e) => {
                  e.target.value = e.target.value.replace(/\D/g, ''); 
                  if (e.target.value.startsWith('0')) {
                     e.target.value = e.target.value.replace(/^0+/, ''); 
                  }
                }}
                {...register("mobileNo")} 
                placeholder="e.g. 9876543210"
                className={inputStyle} 
              />
              {errors.mobileNo && <span className="text-red-400 text-xs">{errors.mobileNo.message}</span>}
            </div>
            <div>
              <label className="text-xs text-white/50 uppercase">Email ID</label>
              <input {...register("email")} className={inputStyle} />
            </div>
          </div>
        </div>

        {/* Authorized Visitors */}
        <div className="p-5 border border-white/5 rounded-2xl bg-white/5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-[#1eb854] font-bold uppercase text-xs tracking-wider">Authorized Visitors / Correspondents ({fields.length}/4)</h3>
            
            {fields.length < 4 && (
              <button 
                type="button" 
                onClick={() => append({ name: "", relation: "", mobile: "", address: "", photo: null })} 
                className="text-xs bg-white/10 px-3 py-1 rounded-lg flex items-center gap-1 hover:bg-white/20 text-white transition"
              >
                <Plus size={14}/> Add Person
              </button>
            )}
          </div>
          
          {fields.map((item, index) => (
            <div key={item.id} className="p-4 bg-black/30 border border-white/5 rounded-xl grid grid-cols-1 md:grid-cols-5 gap-3 items-center relative">
              <div>
                <input {...register(`authorizedPersons.${index}.name`)} placeholder="Name" className={inputStyle} />
                {errors.authorizedPersons?.[index]?.name && <span className="text-red-400 text-xs mt-1 block">{errors.authorizedPersons[index].name.message}</span>}
              </div>
              <div>
                <input {...register(`authorizedPersons.${index}.relation`)} placeholder="Relation (e.g. Mother)" className={inputStyle} />
                {errors.authorizedPersons?.[index]?.relation && <span className="text-red-400 text-xs mt-1 block">{errors.authorizedPersons[index].relation.message}</span>}
              </div>
              <div>
                <input 
                  type="tel"
                  pattern="^[1-9][0-9]{9}$"
                  maxLength="10"
                  title="Mobile number must be exactly 10 digits and cannot start with 0"
                  required
                  onInput={(e) => {
                    e.target.value = e.target.value.replace(/\D/g, ''); 
                    if (e.target.value.startsWith('0')) {
                       e.target.value = e.target.value.replace(/^0+/, ''); 
                    }
                  }}
                  {...register(`authorizedPersons.${index}.mobile`)} 
                  placeholder="10-Digit Mobile No" 
                  className={inputStyle} 
                />
                {errors.authorizedPersons?.[index]?.mobile && <span className="text-red-400 text-xs mt-1 block">{errors.authorizedPersons[index].mobile.message}</span>}
              </div>
              <div>
                <input {...register(`authorizedPersons.${index}.address`)} placeholder="City / Address" className={inputStyle} />
              </div>
              <div className="flex gap-2">
                <input {...register(`authorizedPersons.${index}.photo`)} type="file" id={`auth-photo-${index}`} className="hidden" accept="image/*" />
                <label htmlFor={`auth-photo-${index}`} className={`flex-1 flex items-center justify-center gap-1 px-2 py-3 rounded-xl border ${errors.authorizedPersons?.[index]?.photo ? 'border-red-500 text-red-400' : 'border-white/20 text-white'} cursor-pointer hover:bg-white/5 text-xs transition`}>
                  <Upload size={14} /> {watch(`authorizedPersons.${index}.photo`)?.length ? "Added" : "Photo"}
                </label>
                {index > 0 && (
                  <button type="button" onClick={() => remove(index)} className="p-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/40 transition">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {errors.authorizedPersons?.message && <span className="text-red-400 text-xs font-bold block">{errors.authorizedPersons.message}</span>}
        </div>

        <button type="submit" disabled={isSubmitting} className="w-full bg-[#1eb854] hover:bg-[#16a34a] text-black font-bold py-4 rounded-xl flex justify-center items-center gap-2 transition">
          {isSubmitting ? <span className="loading loading-spinner"></span> : <>Register Student to Database <ChevronRight size={20} /></>}
        </button>
      </form>
    </div>
  );
};


const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [visitors, setVisitors] = useState([]);
  const [isEditing, setIsEditing] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [deleteConfirmId, setDeleteConfirmId] = useState(null); // Modern Confirmation Modal State

  const fetchVisitors = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/visitors');
      if (response.ok) {
        const data = await response.json();
        setVisitors(data);
      }
    } catch (error) {
      console.error("Error fetching visitors:", error);
    }
  };

  useEffect(() => {
    fetchVisitors();
  }, []);

  const handleDeleteClick = (id) => {
    setDeleteConfirmId(id);
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const res = await fetch(`http://localhost:5000/api/admin/visitors/${deleteConfirmId}`, { method: 'DELETE' });
      if (res.ok) fetchVisitors();
    } catch (err) {
      console.error("Delete failed", err);
    }
    setDeleteConfirmId(null);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:5000/api/admin/visitors/${isEditing}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });
      if(res.ok) {
        setIsEditing(null);
        fetchVisitors();
      }
    } catch(err) {
      console.error("Edit failed", err);
    }
  };

  const openEditModal = (visitor) => {
    setIsEditing(visitor._id);
    setEditFormData({
      name: visitor.name || "",
      hostName: visitor.hostName || "",
      vehicleNo: visitor.vehicleNo || "",
      status: visitor.status || "pending_review"
    });
  };

  const total = visitors.length;
  const approved = visitors.filter(v => v.status === 'approved').length;
  const pending = visitors.filter(v => v.status === 'pending_review' || !v.status).length;
  const rejected = visitors.filter(v => v.status === 'rejected').length;

  return (
    <div className="min-h-screen bg-[#0b0808] p-8 pt-28 text-white">
      <div className="max-w-7xl mx-auto">
        
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 pb-4 gap-4">
          <div>
            <h1 className="text-3xl font-black text-[#d99330]">Master Admin Control Panel</h1>
            <p className="text-gray-400">Full System Overview & Database Management</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/guard" className="flex items-center gap-2 bg-[#3070d9] hover:bg-[#4085e0] px-4 py-2 rounded-lg font-bold transition">
              <Camera size={20} /> Launch Scanner View
            </Link>
          </div>
        </header>

        {/* TAB NAVIGATION */}
        <div className="flex gap-4 mb-8">
          <button 
            onClick={() => setActiveTab('overview')} 
            className={`px-6 py-2 rounded-lg font-bold transition ${activeTab === 'overview' ? 'bg-[#d99330] text-black' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
          >
            Gate Pass Overview
          </button>
          <button 
            onClick={() => setActiveTab('register')} 
            className={`px-6 py-2 rounded-lg font-bold transition ${activeTab === 'register' ? 'bg-[#1eb854] text-black' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
          >
            Student Registration (PDF Form)
          </button>
        </div>

        {/* OVERVIEW TAB CONTENT */}
        {activeTab === 'overview' && (
          <>
            {/* STATS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-[#171212] p-6 rounded-xl border border-white/10 flex items-center gap-4">
                <div className="p-4 bg-blue-500/20 rounded-lg"><Users className="text-blue-500 w-8 h-8" /></div>
                <div><p className="text-gray-400 text-sm font-bold uppercase">Total Visitors</p><h2 className="text-3xl font-black">{total}</h2></div>
              </div>
              <div className="bg-[#171212] p-6 rounded-xl border border-white/10 flex items-center gap-4">
                <div className="p-4 bg-green-500/20 rounded-lg"><CheckCircle className="text-green-500 w-8 h-8" /></div>
                <div><p className="text-gray-400 text-sm font-bold uppercase">Approved</p><h2 className="text-3xl font-black text-green-400">{approved}</h2></div>
              </div>
              <div className="bg-[#171212] p-6 rounded-xl border border-white/10 flex items-center gap-4">
                <div className="p-4 bg-yellow-500/20 rounded-lg"><Clock className="text-yellow-500 w-8 h-8" /></div>
                <div><p className="text-gray-400 text-sm font-bold uppercase">Pending</p><h2 className="text-3xl font-black text-yellow-400">{pending}</h2></div>
              </div>
              <div className="bg-[#171212] p-6 rounded-xl border border-white/10 flex items-center gap-4">
                <div className="p-4 bg-red-500/20 rounded-lg"><XCircle className="text-red-500 w-8 h-8" /></div>
                <div><p className="text-gray-400 text-sm font-bold uppercase">Rejected</p><h2 className="text-3xl font-black text-red-400">{rejected}</h2></div>
              </div>
            </div>

            {/* DATA VISUALIZATION BAR */}
            <div className="bg-[#171212] p-6 rounded-xl border border-white/10 mb-8">
              <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 tracking-wider">Status Distribution</h3>
              <div className="w-full bg-gray-800 h-6 rounded-full flex overflow-hidden shadow-inner">
                <div style={{ width: `${(approved/total)*100}%` }} className="bg-green-500 transition-all duration-1000" title={`Approved: ${approved}`}></div>
                <div style={{ width: `${(pending/total)*100}%` }} className="bg-yellow-500 transition-all duration-1000" title={`Pending: ${pending}`}></div>
                <div style={{ width: `${(rejected/total)*100}%` }} className="bg-red-500 transition-all duration-1000" title={`Rejected: ${rejected}`}></div>
              </div>
              <div className="flex gap-6 mt-3 text-xs font-bold">
                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded-full"></div> Approved ({((approved/total)*100||0).toFixed(1)}%)</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-500 rounded-full"></div> Pending ({((pending/total)*100||0).toFixed(1)}%)</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded-full"></div> Rejected ({((rejected/total)*100||0).toFixed(1)}%)</span>
              </div>
            </div>

            {/* FULL DATABASE TABLE */}
            <div className="bg-[#171212] rounded-xl shadow-lg border border-white/10 overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <h2 className="text-xl font-bold flex items-center gap-2"><Shield className="text-[#d99330]" /> Comprehensive Database Logs</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="bg-white/5 text-gray-400 border-b border-white/10">
                    <tr>
                      <th className="p-4">Visitor</th>
                      <th className="p-4">Vehicle</th>
                      <th className="p-4">Host Student</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitors.map(v => (
                      <tr key={v._id} className="border-b border-white/5 hover:bg-white/5 transition">
                        <td className="p-4 font-semibold text-white">{v.name || 'N/A'}</td>
                        <td className="p-4 font-mono text-blue-300">{v.vehicleNo || 'N/A'}</td>
                        <td className="p-4">{v.hostName || 'N/A'}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold capitalize ${v.status === 'approved' ? 'bg-green-500/20 text-green-400' : v.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                            {v.status || 'pending'}
                          </span>
                        </td>
                        <td className="p-4 flex justify-end gap-3">
                          <button onClick={() => openEditModal(v)} className="text-blue-400 hover:text-blue-300 transition" title="Edit Record"><Edit size={18} /></button>
                          <button onClick={() => handleDeleteClick(v._id)} className="text-red-500 hover:text-red-400 transition" title="Delete Record"><Trash2 size={18} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* NEW TAB: STUDENT REGISTRATION FORM */}
        {activeTab === 'register' && (
          <StudentRegistrationForm />
        )}

        {/* 🚨 MODERN CONFIRMATION MODAL (Replaces window.confirm) 🚨 */}
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#171212] border border-red-500/30 p-6 rounded-3xl w-full max-w-sm shadow-2xl text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                <XCircle size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2 text-white">Delete Record?</h3>
              <p className="text-gray-400 text-sm mb-6">Are you sure you want to permanently delete this visitor record? This action cannot be undone.</p>
              <div className="flex gap-4">
                <button onClick={() => setDeleteConfirmId(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 p-3 rounded-xl font-bold transition text-white">Cancel</button>
                <button onClick={executeDelete} className="flex-1 bg-red-500 hover:bg-red-600 p-3 rounded-xl font-bold transition text-white">Yes, Delete</button>
              </div>
            </motion.div>
          </div>
        )}

        {/* EDIT MODAL */}
        {isEditing && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#171212] border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl">
              <h3 className="text-2xl font-bold mb-6 text-[#d99330]">Edit Visitor Record</h3>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Name</label>
                  <input type="text" value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} className="w-full bg-black border border-white/10 p-2 rounded text-white" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Host Student</label>
                  <input type="text" value={editFormData.hostName} onChange={e => setEditFormData({...editFormData, hostName: e.target.value})} className="w-full bg-black border border-white/10 p-2 rounded text-white" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Vehicle No</label>
                  <input type="text" value={editFormData.vehicleNo} onChange={e => setEditFormData({...editFormData, vehicleNo: e.target.value})} className="w-full bg-black border border-white/10 p-2 rounded text-white" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Status</label>
                  <select value={editFormData.status} onChange={e => setEditFormData({...editFormData, status: e.target.value})} className="w-full bg-black border border-white/10 p-2 rounded text-white">
                    <option value="pending_review">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsEditing(null)} className="flex-1 bg-gray-700 hover:bg-gray-600 p-2 rounded font-bold transition">Cancel</button>
                  <button type="submit" className="flex-1 bg-[#1eb854] text-black hover:bg-[#199d47] p-2 rounded font-bold transition">Save Changes</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;