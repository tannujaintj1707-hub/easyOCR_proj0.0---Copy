import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { motion, AnimatePresence } from "framer-motion";

const THEME = {
  bg: "bg-[#0b0808]",
  text: "text-[#ebf0f7]",
  primary: "#1eb854",
  selectionBg: "selection:bg-[#1eb854]",
  selectionText: "selection:text-black",
};

const Layout = () => {
  const location = useLocation();

  return (
    <div
      className={`min-h-screen flex flex-col relative ${THEME.bg} ${THEME.text} font-sans ${THEME.selectionBg} ${THEME.selectionText} overflow-x-hidden`}
    >
      <style>{`
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: #0b0808; 
        }
        ::-webkit-scrollbar-thumb {
          background: #1eb854; 
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #168f40; 
        }
      `}</style>

      <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150" />

      <div
        className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(30, 184, 84, 0.5) 1px, transparent 1px), 
            linear-gradient(90deg, rgba(30, 184, 84, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
          maskImage:
            "radial-gradient(circle at center, black 40%, transparent 100%)",
        }}
      />

      <div className="fixed -top-[20%] left-1/2 -translate-x-1/2 w-200 h-150 bg-[#1eb854]/10 blur-[120px] rounded-full pointer-events-none z-0 mix-blend-screen" />

      <div className="fixed -bottom-40 -right-20 w-150 h-150 bg-[#1eb854]/5 blur-[100px] rounded-full pointer-events-none z-0" />

      <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,#0b0808_120%)]" />

      <Navbar />

      <main className="grow relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -20, filter: "blur(8px)" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
};

export default Layout;
