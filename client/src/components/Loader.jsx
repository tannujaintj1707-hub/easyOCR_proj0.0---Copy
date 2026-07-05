import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { FaTree } from "react-icons/fa";

const Loader = ({ fullScreen = false }) => {
  const loaderContent = (
    <div
      className={`flex flex-col items-center justify-center bg-[#0b0808] text-white ${
        fullScreen
          ? "fixed inset-0 w-screen h-screen z-999999"
          : "p-10 w-full h-full"
      }`}
    >
      <div className="relative flex items-center justify-center">
        <div className="w-20 h-20 rounded-full border-4 border-[#1eb854]/20 border-t-[#1eb854] animate-spin absolute" />

        <motion.div
          initial={{ scale: 0.8, opacity: 0.5 }}
          animate={{ scale: 1.1, opacity: 1 }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            repeatType: "reverse",
          }}
          className="z-10"
        >
          <FaTree className="text-[#1eb854] text-2xl" />
        </motion.div>
      </div>

      {fullScreen && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-8 text-[#ebf0f7]/40 text-[10px] font-bold tracking-[0.3em] uppercase animate-pulse"
        >
          Securing Connection...
        </motion.p>
      )}
    </div>
  );

  if (fullScreen) {
    return createPortal(loaderContent, document.body);
  }

  return loaderContent;
};

export default Loader;
