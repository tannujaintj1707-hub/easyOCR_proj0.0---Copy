import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import React, { useState, useEffect } from "react";
import {
  ArrowRight,
  ShieldCheck,
  Clock,
  Lock,
  ScanLine,
  Activity,
  Server,
} from "lucide-react";

const THEME = {
  primary: "#1eb854",
  primaryBg: "bg-[#1eb854]",
  primaryText: "text-[#1eb854]",
  text: "text-[#ebf0f7]",
  textDim: "text-[#ebf0f7]/50",
};

const LandingPage = () => {
  return (
    <div className="relative w-full flex flex-col items-center justify-center min-h-[90vh] text-center overflow-hidden px-4">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-87.5 h-87.5 md:w-200 md:h-200 border border-[#1eb854]/10 rounded-full animate-[spin_20s_linear_infinite] pointer-events-none">
        <div className="absolute top-0 left-1/2 w-full h-1/2 bg-linear-to-l from-transparent via-[#1eb854]/5 to-transparent blur-3xl origin-bottom animate-[spin_4s_linear_infinite]" />
      </div>

      
      <FloatingIcon
        icon={<ShieldCheck />}
        delay={0}
        x={-400}
        y={-250}
        size={64}
      />
      <FloatingIcon icon={<Lock />} delay={2} x={450} y={100} size={48} />
      <FloatingIcon icon={<ScanLine />} delay={4} x={-350} y={250} size={56} />
      <FloatingIcon icon={<Server />} delay={1} x={300} y={-200} size={40} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 max-w-5xl mx-auto pb-24 md:pb-32"
      >
      
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="inline-flex items-center gap-2 md:gap-3 px-4 py-2 rounded-full bg-[#1eb854]/10 border border-[#1eb854]/20 backdrop-blur-xl mb-8 md:mb-10"
        >
          <div className="relative flex h-2.5 w-2.5 md:h-3 md:w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1eb854] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-full w-full bg-[#1eb854]"></span>
          </div>
          <span className="text-[#1eb854] text-[10px] md:text-xs font-bold tracking-[0.15em] md:tracking-[0.2em] uppercase font-mono">
            System Online • Secure
          </span>
        </motion.div>

       
        <h1 className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tighter mb-6 md:mb-8 text-white leading-[0.95] md:leading-[0.9]">
          NEXT-GEN <br />
          <TypewriterText text="CAAMPUS SECURITY" />
        </h1>

        <p
          className={`text-base md:text-xl ${THEME.textDim} max-w-2xl mx-auto mb-10 md:mb-12 leading-relaxed font-light px-2`}
        >
          A fully automated, biometric-ready digital gate pass system.
          <span className="block md:inline text-white font-medium mt-2 md:mt-0">
            {" "}
            Zero Paper. Zero Delays. 100% Secure.
          </span>
        </p>

        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-5 mb-16 md:mb-24 w-full">
          <Link to="/apply" className="w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`w-full sm:w-auto group flex items-center justify-center gap-3 px-8 py-4 rounded-full ${THEME.primaryBg} text-black text-lg font-bold shadow-[0_0_30px_rgba(30,184,84,0.3)] hover:shadow-[0_0_50px_rgba(30,184,84,0.5)] transition-all`}
            >
              <ScanLine className="w-5 h-5 group-hover:animate-pulse" />
              Apply for Pass
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </Link>
        </div>

       
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 text-left">
          <FeatureCard
            icon={Clock}
            title="Instant Approval"
            desc="Automated workflows reduce wait times by 90%. Get approved in minutes."
            accent="text-amber-400"
            delay={0.1}
          />
          <FeatureCard
            icon={ShieldCheck}
            title="Military-Grade"
            desc="End-to-end encryption for all visitor data. Your privacy is our fortress."
            accent="text-[#1eb854]"
            delay={0.2}
          />
          <FeatureCard
            icon={Activity}
            title="Live Monitoring"
            desc="Real-time tracking of every entry and exit. Full visibility for security."
            accent="text-blue-400"
            delay={0.3}
          />
        </div>
      </motion.div>

   
      <div className="absolute bottom-0 left-0 w-full bg-black/40 backdrop-blur-md border-t border-white/5 py-2 overflow-hidden z-20">
        <div className="flex gap-10 animate-marquee whitespace-nowrap text-[10px] font-mono text-[#1eb854]/60 uppercase tracking-widest">
          <span>Server Status: Nominal</span>
          <span>///</span>
          <span>Gate A: Active</span>
          <span>///</span>
          <span>Gate B: Active</span>
          <span>///</span>
          <span>Last Entry: 2s ago</span>
          <span>///</span>
          <span>Encryption: AES-256</span>
        </div>
      </div>
    </div>
  );
};


const TypewriterText = ({ text }) => {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setDisplayedText((prev) => prev + text.charAt(index));
      index++;
      if (index === text.length) clearInterval(interval);
    }, 100);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <span className="text-transparent bg-clip-text bg-linear-to-r from-[#1eb854] via-[#86efac] to-[#1eb854] animate-gradient bg-size-[200%_auto]">
      {displayedText}
      <span className="text-[#1eb854] animate-pulse">_</span>
    </span>
  );
};

const FeatureCard = ({ icon: Icon, title, desc, accent, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    viewport={{ once: true }}
    whileHover={{ y: -5 }}
    className="group relative p-6 md:p-8 rounded-3xl border border-white/5 bg-[#121212]/40 backdrop-blur-xl overflow-hidden hover:border-[#1eb854]/30 transition-all duration-500"
  >
    <div
      className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-100 transition-opacity duration-500 ${accent}`}
    >
      <Icon size={60} strokeWidth={1} />
    </div>

    <div
      className={`mb-4 md:mb-6 p-4 rounded-2xl bg-white/5 w-fit border border-white/5 group-hover:scale-110 transition-transform duration-300 ${accent}`}
    >
      <Icon size={28} />
    </div>

    <h3 className="text-xl md:text-2xl font-bold text-white mb-2 md:mb-3 group-hover:text-[#1eb854] transition-colors">
      {title}
    </h3>
    <p className="text-white/40 text-sm leading-relaxed">{desc}</p>
  </motion.div>
);

const FloatingIcon = ({ icon, delay, x, y, size }) => (
  <motion.div
    animate={{
      y: [0, -30, 0],
      rotate: [0, 10, -10, 0],
      opacity: [0.05, 0.15, 0.05],
    }}
    transition={{
      duration: 8,
      repeat: Infinity,
      delay: delay,
      ease: "easeInOut",
    }}
   
    className="absolute text-[#1eb854] hidden md:block pointer-events-none blur-[2px]"
    style={{ x, y }}
  >
    {React.cloneElement(icon, { size })}
  </motion.div>
);

export default LandingPage;