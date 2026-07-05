import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  UserButton,
  SignInButton,
  SignedIn,
  SignedOut,
} from "@clerk/clerk-react";
import { FaBars, FaTimes, FaShieldAlt, FaReceipt, FaCameraRetro } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { usePermissions } from "../context/PermissionContext"; // NEW: Pulling role from DB

const THEME = {
  bgDark: "bg-[#0b0808]",
  bgGlass: "bg-[#171212]",
  primary: "#1eb854",
  primaryBg: "bg-[#1eb854]",
  text: "text-[#ebf0f7]",
  textDim: "text-[#ebf0f7]/60",
  border: "border-[#ffffff10]",
};

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  
  // NEW: Get the role reliably from the Database instead of Clerk Metadata
  const { permissions } = usePermissions();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Apply for Pass", path: "/apply" },
    { name: "My Receipts", path: "/receipts", icon: FaReceipt },
  ];

  // Map the database role, default to member
  const userRole = permissions?.role || "member";

  return (
    <>
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, type: "spring" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 flex justify-center ${
          scrolled ? "pt-2 md:pt-4" : "pt-4 md:pt-6"
        }`}
      >
        <div
          className={`relative w-[95%] max-w-7xl px-4 md:px-6 py-3 rounded-2xl flex items-center justify-between transition-all duration-300 border shadow-2xl backdrop-blur-2xl ${
            scrolled
              ? `${THEME.bgDark}/80 border-white/10 shadow-black/50`
              : `${THEME.bgGlass}/40 border-white/5 shadow-none`
          }`}
        >
          <Link
            to="/"
            className="flex flex-col items-start gap-0 group shrink-0"
            onClick={() => setMobileMenuOpen(false)}
          >
            <svg viewBox="0 0 260 60" fill="none" className="w-36 md:w-52 h-auto -ml-1 drop-shadow-[0_0_15px_rgba(30,184,84,0.4)] transition-all group-hover:drop-shadow-[0_0_25px_rgba(30,184,84,0.6)]">
              <text x="0" y="45" fontFamily="'Tiro Devanagari Hindi', 'Noto Sans Devanagari', sans-serif" fontWeight="bold" fontSize="32" fill={THEME.primary} style={{ letterSpacing: "0.01em" }}>
                वनस्थली विद्यापीठ
              </text>
            </svg>
            <span className="text-[8px] md:text-[10px] font-bold tracking-[0.2em] text-[#ebf0f7]/50 uppercase ml-1 -mt-2 group-hover:text-[#1eb854] transition-colors">
              Digital Gate Pass
            </span>
          </Link>

          <div className={`hidden md:flex items-center gap-1 p-1.5 rounded-full border border-white/5 bg-black/20 backdrop-blur-md`}>
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`relative px-6 py-2.5 rounded-full text-sm font-bold tracking-wide transition-all duration-300 flex items-center gap-2 ${
                  location.pathname === link.path
                    ? `${THEME.primaryBg} text-black shadow-[0_0_20px_rgba(30,184,84,0.4)]`
                    : `${THEME.textDim} hover:text-white hover:bg-white/10`
                }`}
              >
                {link.icon && location.pathname !== link.path && <link.icon size={12} />}
                {link.name}
              </Link>
            ))}

            {(userRole === "sub_admin" || userRole === "admin") && (
              <Link to="/guard" className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-all bg-[#3070d9] text-white hover:bg-[#4085e0] shadow-[0_0_15px_rgba(48,112,217,0.3)] ml-2">
                <FaCameraRetro size={12} /> Guard View
              </Link>
            )}

            {userRole === "admin" && (
              <Link to="/admin" className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-all bg-[#d99330] text-black hover:bg-[#e0a040] shadow-[0_0_15px_rgba(217,147,48,0.3)] ml-2">
                <FaShieldAlt size={12} /> Admin
              </Link>
            )}
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <SignedIn>
              <div className={`flex items-center gap-2 pl-3 md:pl-4 border-l ${THEME.border}`}>
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: `w-9 h-9 border-2 border-[${THEME.primary}]/50 hover:scale-105 transition-transform`,
                      userButtonPopoverCard: `${THEME.bgGlass} border ${THEME.border} text-white shadow-2xl`,
                      userButtonPopoverActionButton: "hover:bg-white/10 text-white",
                    },
                  }}
                />
              </div>
            </SignedIn>
            <SignedOut>
              <div className="hidden md:flex items-center gap-3">
                <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                  <button className={`text-sm font-bold px-6 py-2.5 rounded-full text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all hover:scale-105 active:scale-95`}>
                    Log In
                  </button>
                </SignInButton>
              </div>
            </SignedOut>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-3 rounded-xl bg-white/5 text-white hover:bg-white/10 transition-colors active:scale-95 border border-white/5`}
            >
              {mobileMenuOpen ? <FaTimes size={18} /> : <FaBars size={18} />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`fixed top-24 left-4 right-4 mx-auto max-w-sm bg-[#121212] border border-white/10 p-2 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] z-50 md:hidden overflow-hidden`}
            >
              <div className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`p-4 rounded-2xl font-bold flex items-center justify-between transition-all ${
                      location.pathname === link.path
                        ? "bg-[#1eb854] text-black shadow-[0_0_20px_rgba(30,184,84,0.3)]"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-3 text-lg">
                      {link.icon && <link.icon size={20} />}
                      {link.name}
                    </span>
                  </Link>
                ))}

                {(userRole === "sub_admin" || userRole === "admin") && (
                  <Link to="/guard" onClick={() => setMobileMenuOpen(false)} className="mt-1 flex items-center justify-center gap-2 w-full p-4 rounded-2xl bg-[#3070d9] text-white font-bold shadow-lg">
                    <FaCameraRetro /> Guard Dashboard
                  </Link>
                )}

                {userRole === "admin" && (
                  <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="mt-1 flex items-center justify-center gap-2 w-full p-4 rounded-2xl bg-[#d99330] text-black font-bold shadow-lg">
                    <FaShieldAlt /> Admin Dashboard
                  </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;