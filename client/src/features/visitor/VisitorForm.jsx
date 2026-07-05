import { useState, useRef, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { visitorSchema } from "../../utils/schemas";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Calendar, User, GraduationCap, CheckCircle, ChevronRight,
  ChevronDown, Users, Building, Hash, Bus, Clock, XCircle 
} from "lucide-react";
import clsx from "clsx";

const THEME = {
  bgDark: "bg-[#0b0808]",
  card: "bg-[#171212]",
  primary: "#1eb854",
  input: "bg-[#00000040]",
};

const COURSES = {
  BTECH: { label: "B.Tech" }, MTECH: { label: "M.Tech" }, MCA: { label: "MCA" },
  MBA: { label: "MBA" }, BPHARM: { label: "B.Pharm" }, BBA: { label: "BBA" },
};

const HOSTELS = [
  "Gargi Bhawan", "Sarojini Bhawan", "Kasturba Bhawan", "Leelavati Bhawan", "Main Hostel",
];

const TRANSPORT_OPTIONS = [
  { value: "Car", label: "Car" },
  { value: "Taxi", label: "Taxi" },
  { value: "Bus", label: "Bus" },
  { value: "Auto", label: "Auto" },
  { value: "Train", label: "Train" },
];

const generateReceiptID = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `VIS-${year}-${random}`;
};

const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 600;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.6));
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

// 🚨 PHYSICAL INPUT SANITIZER 🚨
const strictNameSanitizer = (e) => {
  let val = e.target.value.replace(/[^a-zA-Z\s]/g, ""); 
  val = val.replace(/\s{2,}/g, " "); 
  if (val.startsWith(" ")) val = val.trimStart(); 
  e.target.value = val;
};

const CustomSelect = ({ label, icon: Icon, options, value, onChange, error }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  useEffect(() => {
    const close = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  
  const selected = options.find((o) => o.value === value);

  return (
    <div className="space-y-2 relative z-[999]" ref={containerRef}>
      <label className="text-xs font-bold text-white/50 uppercase ml-1 flex gap-2 items-center">
        {Icon && <Icon size={14} />} {label}
      </label>
      <div className="relative">
        <button type="button" onClick={() => setIsOpen(!isOpen)}
          className={clsx(
            "w-full flex items-center justify-between px-4 py-4 rounded-xl border transition-all duration-300 text-left backdrop-blur-md",
            THEME.input, isOpen ? "border-[#1eb854] ring-1 ring-[#1eb854]/50" : "border-white/10 hover:bg-white/5",
            error && "border-red-500/50"
          )}
        >
          <div className="flex items-center gap-3 text-white">
            {selected?.icon && <selected.icon size={18} className="text-[#1eb854]" />}
            <span className={clsx("text-sm font-medium", !value && "text-white/40")}>{selected ? selected.label : "Select Option..."}</span>
          </div>
          <ChevronDown size={18} className={clsx("text-white/40 transition-transform", isOpen && "rotate-180")} />
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className="absolute left-0 right-0 top-full mt-2 p-1.5 rounded-xl bg-[#000000] border border-white/20 shadow-[0_0_40px_rgba(0,0,0,0.9)] z-[9999] max-h-60 overflow-y-auto"
            >
              {options.map((opt) => (
                <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setIsOpen(false); }}
                  className={clsx("w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all mb-1", value === opt.value ? "bg-[#1eb854] text-black" : "text-white/70 hover:bg-white/10")}
                >
                  {opt.label} {value === opt.value && <CheckCircle size={16} className="ml-auto" />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {error && <span className="text-red-400 text-xs ml-1">{error.message}</span>}
    </div>
  );
};

const VisitorForm = () => {
  const [isSuccess, setIsSuccess] = useState(false);
  const [toast, setToast] = useState(null); // Modern Toast Notification State
  const navigate = useNavigate();

  const showToast = (message, type = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const { register, handleSubmit, watch, setValue, reset, control, formState: { errors, isSubmitting, isValid } } = useForm({
    resolver: zodResolver(visitorSchema),
    mode: "onChange", 
    defaultValues: { visitorType: "parent", totalPeople: 1, males: 1, females: 0, members: [{ name: "", photo: null }], vehicleNo: "", transportMode: "" },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "members" });

  const visitorType = watch("visitorType");
  const totalPeople = watch("totalPeople");
  const mainName = watch("name");
  const males = watch("males");
  const females = watch("females");
  const currentTransportMode = watch("transportMode"); 

  const categories = [
    { id: "parent", label: "Visitor / Parent", icon: User },
    { id: "student", label: "Student", icon: GraduationCap },
  ];

  const hostelOptions = HOSTELS.map((h) => ({ value: h, label: h, icon: Building }));
  const courseOptions = Object.keys(COURSES).map((k) => ({ value: k, label: COURSES[k].label }));

  const preventMinus = (e) => { if (["-", "e", "E", "+"].includes(e.key)) e.preventDefault(); };

  useEffect(() => {
    if (visitorType === "student") {
      setValue("totalPeople", 1, { shouldValidate: true }); 
      setValue("males", 1, { shouldValidate: true }); 
      setValue("females", 0, { shouldValidate: true }); 
      remove();
    } else if (visitorType === "parent" && fields.length === 0) {
        append({ name: mainName || "", photo: null });
    }
  }, [visitorType, setValue, remove, append, mainName, fields.length]);

  useEffect(() => {
    if (visitorType === "parent") {
      const m = parseInt(males) || 0;
      const f = parseInt(females) || 0;
      const calculatedTotal = m + f;
      
      if (calculatedTotal !== parseInt(totalPeople) && !isNaN(calculatedTotal)) {
        setValue("totalPeople", calculatedTotal, { shouldValidate: true });
      }
    }
  }, [males, females, visitorType, setValue, totalPeople]);

  useEffect(() => {
    if (visitorType !== "parent") return;
    const val = parseInt(totalPeople);
    if (!val || val < 1) return;
    const targetLength = val;
    if (fields.length < targetLength) {
      for (let i = fields.length; i < targetLength; i++) append({ name: "", photo: null });
    } else if (fields.length > targetLength) {
      for (let i = fields.length; i > targetLength; i--) remove(i - 1);
    }
  }, [totalPeople, append, remove, fields.length, visitorType]);

  useEffect(() => {
    if (visitorType === "parent" && fields.length > 0 && mainName) {
        setValue("members.0.name", mainName, { shouldValidate: true });
    }
  }, [mainName, setValue, visitorType, fields.length]);

  const onSubmit = async (formData) => {
    try {
      let membersWithPhotos = [];
      if (visitorType === "parent") {
          membersWithPhotos = await Promise.all(
            formData.members.map(async (member) => {
              let b64 = null;
              if (member.photo && member.photo[0]) {
                b64 = await compressImage(member.photo[0]);
              }
              return { ...member, photo: b64 };
            })
          );
      }

      let studentPhotoB64 = null;
      if (visitorType === "student" && formData.photo && formData.photo[0]) {
          studentPhotoB64 = await compressImage(formData.photo[0]);
      }

      const uniqueId = generateReceiptID();
      
      let finalPayload = {
        ...formData,
        receiptId: uniqueId,
        submittedAt: new Date().toISOString(),
        status: "pending_review",
      };

      if (visitorType === "parent") {
          finalPayload.members = membersWithPhotos;
      } else if (visitorType === "student") {
          finalPayload.photo = studentPhotoB64;
          delete finalPayload.members; 
      }

      if (finalPayload.transportMode !== "Car" && finalPayload.transportMode !== "Taxi") {
          finalPayload.vehicleNo = "";
      }

      const visitResponse = await fetch("http://localhost:5000/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalPayload),
      });
      
      const apiResult = await visitResponse.json().catch(() => ({ error: "Server returned an invalid response (500)"}));

      if (visitResponse.ok) {
        try {
          const all = JSON.parse(localStorage.getItem("all_receipts") || "[]");
          all.unshift(finalPayload);
          localStorage.setItem("all_receipts", JSON.stringify(all));

          const myIds = JSON.parse(localStorage.getItem("my_receipt_ids") || "[]");
          myIds.unshift(uniqueId);
          localStorage.setItem("my_receipt_ids", JSON.stringify(myIds));
          
          reset();
          setIsSuccess(true);
          setTimeout(() => navigate("/receipts"), 2500);
        } catch (storageError) {
          console.error(storageError);
        }
      } else {
        showToast(`Database Error: ${apiResult.details || apiResult.error}`, "error");
      }
    } catch (error) {
      showToast("Error processing submission. Please check form data.", "error");
    }
  };

  if (isSuccess) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${THEME.bgDark} px-4`}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full text-center space-y-6 p-10 rounded-3xl border border-yellow-500/20 bg-yellow-500/5 backdrop-blur-xl">
          <div className="w-20 h-20 bg-yellow-500 rounded-full mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(234,179,8,0.4)]">
            <Clock className="text-black w-10 h-10" />
          </div>
          <div><h2 className="text-3xl font-black text-white mb-2">Form Submitted</h2><p className="text-white/60">Your gate pass is currently pending admin review. Redirecting...</p></div>
          <div className="pt-4"><span className="loading loading-dots loading-lg text-yellow-500"></span></div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen py-12 px-4 flex items-center justify-center relative overflow-hidden ${THEME.bgDark}`}>
      
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

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#1eb854]/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#1eb854]/5 rounded-full blur-[100px]" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-4xl relative z-10">
        <div className={`backdrop-blur-md ${THEME.card} border border-white/10 rounded-3xl shadow-2xl relative overflow-visible`}>
          <div className="h-1 w-full bg-linear-to-r from-[#1eb854] to-[#126e32] rounded-t-3xl" />
          <div className="p-6 md:p-10">
            <h1 className="text-3xl font-bold text-white tracking-tight mb-8">Gate Pass <span className="text-[#1eb854]">Application</span></h1>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              <div className="space-y-4">
                <label className="text-xs font-bold text-white/50 uppercase ml-1">Visitor Category</label>
                <div className="grid grid-cols-2 gap-4">
                  {categories.map((cat) => (
                    <div key={cat.id} onClick={() => setValue("visitorType", cat.id, { shouldValidate: true })} className={clsx("cursor-pointer relative p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-3 group", visitorType === cat.id ? "border-[#1eb854] bg-[#1eb854]/10" : "border-white/5 bg-white/5 hover:bg-white/10")}>
                      <cat.icon size={24} className={visitorType === cat.id ? "text-[#1eb854]" : "text-white/50"} />
                      <span className={clsx("text-sm font-bold", visitorType === cat.id ? "text-white" : "text-white/50")}>{cat.label}</span>
                      {visitorType === cat.id && <CheckCircle size={14} className="absolute top-3 right-3 text-[#1eb854]" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* FULL NAME */}
              <div className="space-y-2">
                  <label className="text-xs font-bold text-white/50 uppercase ml-1">Full Name</label>
                  <input 
                    {...register("name", { onChange: strictNameSanitizer })} 
                    className={clsx(
                      `w-full px-4 py-4 rounded-xl text-white outline-none border transition-all duration-300 ${THEME.input}`,
                      errors.name ? 'border-red-500 ring-1 ring-red-500/50 bg-red-500/10' : 'border-white/10'
                    )}
                    placeholder="Enter your full name" 
                  />
                  {errors.name && <span className="text-red-500 font-bold text-xs mt-1 block">👉 {errors.name.message}</span>}
              </div>

              <AnimatePresence>
                {visitorType === "parent" && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-8 overflow-visible relative z-20">
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/5 grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-white/50 uppercase ml-1">Total People</label>
                        <input type="number" readOnly {...register("totalPeople", { valueAsNumber: true })} className={`w-full px-4 py-3 rounded-xl text-white outline-none border border-white/10 ${THEME.input} opacity-50 cursor-not-allowed [appearance:textfield]`} />
                      </div>
                      <div className="space-y-2"><label className="text-xs font-bold text-white/50 uppercase ml-1">Males</label><input type="number" min="0" onKeyDown={preventMinus} {...register("males", { valueAsNumber: true })} className={`w-full px-4 py-3 rounded-xl text-white outline-none border border-white/10 ${THEME.input} [appearance:textfield]`} /></div>
                      <div className="space-y-2"><label className="text-xs font-bold text-white/50 uppercase ml-1">Females</label><input type="number" min="0" onKeyDown={preventMinus} {...register("females", { valueAsNumber: true })} className={`w-full px-4 py-3 rounded-xl text-white outline-none border border-white/10 ${THEME.input} [appearance:textfield]`} /></div>
                    </div>

                    {/* MEMBER DETAILS */}
                    <div className="space-y-4">
                      <label className="text-xs font-bold text-white/50 uppercase ml-1 flex gap-2"><Users size={14} /> Member Details ({fields.length})</label>
                      <div className="grid grid-cols-1 gap-4">
                        {fields.map((item, index) => (
                          <div key={item.id} className="p-4 rounded-xl border border-white/10 bg-white/5 flex flex-col md:flex-row gap-4 items-center">
                            <div className="w-8 h-8 rounded-full bg-[#1eb854]/20 text-[#1eb854] flex items-center justify-center font-bold text-sm shrink-0">{index + 1}</div>
                            <div className="w-full">
                              <input 
                                {...register(`members.${index}.name`, { onChange: strictNameSanitizer })} 
                                placeholder={`Person ${index + 1} Name`} 
                                className={clsx(
                                  `w-full px-4 py-3 rounded-lg text-white text-sm outline-none border transition-all ${THEME.input}`,
                                  errors.members?.[index]?.name ? 'border-red-500 ring-1 ring-red-500/50 bg-red-500/10' : 'border-white/10'
                                )} 
                                readOnly={index === 0} 
                              />
                              {errors.members?.[index]?.name && <span className="text-red-500 font-bold text-xs block mt-1">👉 {errors.members[index].name.message}</span>}
                            </div>
                            <div className="w-full md:w-auto shrink-0">
                              <input {...register(`members.${index}.photo`)} type="file" id={`photo-${index}`} className="hidden" accept="image/*" />
                              <label htmlFor={`photo-${index}`} className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border ${errors.members?.[index]?.photo ? 'border-red-500' : 'border-white/20'} text-white cursor-pointer hover:bg-white/5 transition-all text-sm w-full md:w-40 whitespace-nowrap`}>
                                <Upload size={16} /> {watch(`members.${index}.photo`)?.length ? "Changed" : "Upload Photo"}
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 🚨 Z-INDEX FIX: INCREASED TO z-[60] TO FLOAT OVER STUDENT DETAILS 🚨 */}
                    <div className="p-1 rounded-2xl bg-white/5 border border-white/5 relative z-[60]">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-white/50 uppercase flex gap-2"><Calendar size={14} /> Arrival Date</label>
                            <input type="datetime-local" {...register("arrivalDate")} className={`w-full px-4 py-3 rounded-lg text-white text-sm outline-none border ${errors.arrivalDate ? 'border-red-500' : 'border-white/10'} ${THEME.input}`} />
                            {errors.arrivalDate && <span className="text-red-400 text-xs block mt-1">{errors.arrivalDate.message}</span>}
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-white/50 uppercase flex gap-2"><Calendar size={14} /> Departure Date</label>
                            <input type="datetime-local" {...register("departureDate")} className={`w-full px-4 py-3 rounded-lg text-white text-sm outline-none border ${errors.departureDate ? 'border-red-500' : 'border-white/10'} ${THEME.input}`} />
                            {errors.departureDate && <span className="text-red-400 text-xs block mt-1">{errors.departureDate.message}</span>}
                          </div>
                       </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border-t border-white/5 relative z-[70]">
                             <div className="relative z-[999]">
                                <CustomSelect 
                                  label="Transport Mode" 
                                  icon={Bus} 
                                  options={TRANSPORT_OPTIONS} 
                                  value={currentTransportMode} 
                                  onChange={(val) => {
                                     setValue("transportMode", val, { shouldValidate: true });
                                     if (val !== "Car" && val !== "Taxi") {
                                        setValue("vehicleNo", "", { shouldValidate: true });
                                     }
                                  }} 
                                  error={errors.transportMode} 
                                />
                              </div>
                             <div className="space-y-2">
                                <label className="text-xs font-bold text-white/50 uppercase flex gap-2"><Hash size={14} /> Vehicle Number Plate</label>
                                <input 
                                  {...register("vehicleNo")} 
                                  disabled={currentTransportMode !== "Car" && currentTransportMode !== "Taxi"}
                                  placeholder={currentTransportMode !== "Car" && currentTransportMode !== "Taxi" ? "Not Applicable" : "e.g., MH12AB1234"} 
                                  className={clsx(
                                    `w-full px-4 py-3 rounded-lg text-white text-sm font-mono uppercase outline-none border transition-all duration-300`,
                                    errors.vehicleNo ? 'border-red-500 ring-1 ring-red-500/50 bg-red-500/10' : 'border-white/10',
                                    (currentTransportMode !== "Car" && currentTransportMode !== "Taxi") ? 'opacity-50 cursor-not-allowed bg-black/20' : THEME.input
                                  )} 
                                />
                                {errors.vehicleNo && <span className="text-red-500 font-bold text-xs block mt-1">{errors.vehicleNo.message}</span>}
                              </div>
                        </div>
                    </div>

                    {/* HOST STUDENT NAME */}
                    <div className="space-y-2 p-4 rounded-xl bg-white/5 border border-white/5 relative z-30">
                      <div className="flex items-center gap-2 mb-4 text-[#1eb854]">
                        <User size={14} />
                        <span className="text-xs font-bold uppercase">Meeting Student Details</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="space-y-2">
                                <label className="text-xs font-bold text-white/50 uppercase ml-1">Student Name</label>
                                <input 
                                  {...register("hostName", { onChange: strictNameSanitizer })} 
                                  placeholder="Student Name" 
                                  className={clsx(
                                    `w-full px-4 py-3 rounded-xl text-white outline-none border transition-all ${THEME.input}`,
                                    errors.hostName ? 'border-red-500 ring-1 ring-red-500/50 bg-red-500/10' : 'border-white/10'
                                  )} 
                                />
                                {errors.hostName && <span className="text-red-500 font-bold text-xs block mt-1">👉 {errors.hostName.message}</span>}
                           </div>
                           <div className="space-y-2">
                                <label className="text-xs font-bold text-white/50 uppercase ml-1">Student ID</label>
                                <input 
                                  {...register("hostId")} 
                                  onInput={(e) => e.target.value = e.target.value.toUpperCase()} 
                                  placeholder="e.g. ABCDE12345" 
                                  className={`w-full px-4 py-3 rounded-xl text-white outline-none border ${errors.hostId ? 'border-red-500' : 'border-white/10'} uppercase ${THEME.input}`} 
                                />
                                {errors.hostId && <span className="text-red-400 text-xs block mt-1">{errors.hostId.message}</span>}
                           </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 relative z-40">
                           <div className="relative z-[100]"><CustomSelect label="Student Course" icon={GraduationCap} options={courseOptions} value={watch("hostCourse")} onChange={(val) => setValue("hostCourse", val, { shouldValidate: true })} error={errors.hostCourse} /></div>
                           <div className="relative z-50"><CustomSelect label="Student Hostel" icon={Building} options={hostelOptions} value={watch("hostHostel")} onChange={(val) => setValue("hostHostel", val, { shouldValidate: true })} error={errors.hostHostel} /></div>
                       </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {visitorType === "student" && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-8 overflow-visible relative z-20">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-[70]">
                         <div className="space-y-2">
                            <label className="text-xs font-bold text-white/50 uppercase ml-1">Student ID</label>
                            <input 
                              {...register("studentId")} 
                              onInput={(e) => e.target.value = e.target.value.toUpperCase()} 
                              className={`w-full px-4 py-4 rounded-xl text-white outline-none border ${errors.studentId ? 'border-red-500' : 'border-white/10'} uppercase ${THEME.input}`} 
                              placeholder="ABCDE12345" 
                            />
                            {errors.studentId && <span className="text-red-400 text-xs block mt-1">{errors.studentId.message}</span>}
                        </div>
                        <div className="relative z-[100]"><CustomSelect label="Course" icon={GraduationCap} options={courseOptions} value={watch("course")} onChange={(val) => setValue("course", val, { shouldValidate: true })} error={errors.course} /></div>
                        <div className="relative z-50"><CustomSelect label="Hostel Name" icon={Building} options={hostelOptions} value={watch("hostelName")} onChange={(val) => setValue("hostelName", val, { shouldValidate: true })} error={errors.hostelName} /></div>
                    </div>

                     <div className="space-y-2 relative z-10">
                      <label className="text-xs font-bold text-white/50 uppercase ml-1 flex gap-2"><Upload size={14} /> Upload Profile Photo</label>
                      <div className="relative group w-full md:w-1/3">
                        <input {...register(`photo`)} type="file" id={`student-photo`} className="hidden" accept="image/*" />
                        <label htmlFor={`student-photo`} className={`flex flex-col items-center justify-center gap-2 w-full h-32 rounded-xl border ${errors.photo ? 'border-red-500' : 'border-white/20'} border-dashed text-white cursor-pointer hover:bg-white/5 transition-all text-xs`}>
                          <User size={24} /> <span>{watch(`photo`)?.length ? "Photo Selected" : "Tap to Upload"}</span>
                        </label>
                        {errors.photo && <span className="text-red-400 text-xs block mt-1">{errors.photo.message}</span>}
                      </div>
                    </div>

                    <div className="p-1 rounded-2xl bg-white/5 border border-white/5 relative z-[60]">
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-white/50 uppercase flex gap-2"><Calendar size={14} /> Arrival Time</label>
                            <input type="datetime-local" {...register("arrivalDate")} className={`w-full px-4 py-3 rounded-lg text-white text-sm outline-none border ${errors.arrivalDate ? 'border-red-500' : 'border-white/10'} ${THEME.input}`} />
                            {errors.arrivalDate && <span className="text-red-400 text-xs block mt-1">{errors.arrivalDate.message}</span>}
                          </div>
                           <div className="relative z-[999]">
                                <CustomSelect 
                                  label="Transport Mode" 
                                  icon={Bus} 
                                  options={TRANSPORT_OPTIONS} 
                                  value={currentTransportMode} 
                                  onChange={(val) => {
                                     setValue("transportMode", val, { shouldValidate: true });
                                     if (val !== "Car" && val !== "Taxi") {
                                        setValue("vehicleNo", "", { shouldValidate: true });
                                     }
                                  }} 
                                  error={errors.transportMode} 
                                />
                              </div>
                             <div className="space-y-2 relative z-10">
                                <label className="text-xs font-bold text-white/50 uppercase flex gap-2"><Hash size={14} /> Vehicle Plate</label>
                                <input 
                                  {...register("vehicleNo")} 
                                  disabled={currentTransportMode !== "Car" && currentTransportMode !== "Taxi"}
                                  placeholder={currentTransportMode !== "Car" && currentTransportMode !== "Taxi" ? "Not Applicable" : "e.g., MH12AB1234"} 
                                  className={clsx(
                                    `w-full px-4 py-3 rounded-lg text-white text-sm font-mono uppercase outline-none border transition-all duration-300`,
                                    errors.vehicleNo ? 'border-red-500 ring-1 ring-red-500/50 bg-red-500/10' : 'border-white/10',
                                    (currentTransportMode !== "Car" && currentTransportMode !== "Taxi") ? 'opacity-50 cursor-not-allowed bg-black/20' : THEME.input
                                  )} 
                                />
                                {errors.vehicleNo && <span className="text-red-500 font-bold text-xs block mt-1">{errors.vehicleNo.message}</span>}
                              </div>
                       </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="pt-4 border-t border-white/5 relative z-10">
                <button type="submit" disabled={isSubmitting || !isValid}
                  className={clsx(
                    "w-full font-bold text-lg py-4 rounded-xl transition-all flex items-center justify-center gap-2",
                    (!isValid || isSubmitting) ? "bg-gray-600 text-gray-400 cursor-not-allowed" : "bg-[#1eb854] hover:bg-[#16a34a] text-black shadow-[0_0_30px_rgba(30,184,84,0.3)] active:scale-[0.99]"
                  )}
                >
                  {isSubmitting ? <span className="loading loading-spinner text-black"></span> : <>Submit Application <ChevronRight size={20} /></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default VisitorForm;