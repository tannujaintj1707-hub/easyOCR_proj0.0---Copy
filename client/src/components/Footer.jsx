import { FaUniversity, FaTwitter, FaGithub, FaLinkedin } from "react-icons/fa";
import { Link } from "react-router-dom";

const THEME = {
  bgDark: "bg-[#0b0808]",
  primary: "#1eb854",
  text: "text-[#ebf0f7]",
  textDim: "text-[#ebf0f7]/50",
};

const Footer = () => {
  return (
    <footer
      className={`relative mt-auto w-full overflow-hidden ${THEME.bgDark} pt-24 pb-12`}
    >
      <div className="absolute top-0 left-1/4 right-1/4 h-px bg-linear-to-r from-transparent via-[#1eb854]/40 to-transparent blur-sm" />

      <div className="absolute bottom-0 left-0 w-full h-75 bg-linear-to-t from-[#1eb854]/5 to-transparent pointer-events-none" />

      <div className="absolute top-20 -left-25 w-75 h-75 bg-[#1eb854]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 -right-25 w-100 h-100 bg-[#1eb854]/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="absolute -bottom-10 -right-10 text-white/3 transform -rotate-12 pointer-events-none select-none">
        <FaUniversity size={500} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-20 mb-20">
          <div className="md:col-span-5 space-y-8">
            <div className="flex items-center gap-4">
              <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-[#1eb854]/10 shadow-[0_0_20px_rgba(30,184,84,0.2)]">
                <FaUniversity size={24} className="text-[#1eb854]" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-white leading-none">
                  CAMPUS<span className="text-[#1eb854]">GATE</span>
                </h2>
                <p className="text-[10px] font-bold tracking-[0.3em] text-white/30 uppercase mt-1">
                  Secure Perimeter
                </p>
              </div>
            </div>

            

            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1eb854] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1eb854]"></span>
              </span>
              <span className="text-[10px] font-bold tracking-widest uppercase text-[#1eb854] shadow-black drop-shadow-md">
                System Operational
              </span>
            </div>
          </div>

          {/* Adjusted spacer to maintain grid alignment after removing Platform section */}
          <div className="hidden md:block md:col-span-4" />

          <div className="md:col-span-3">
            <h3 className="font-bold text-white mb-8 uppercase text-xs tracking-[0.2em] opacity-40">
              Support
            </h3>
            <ul className="space-y-4">
              <FooterLink to="/privacy" label="Privacy Policy" />
              <FooterLink to="/terms" label="Terms of Service" />
              <li>
                <a
                  href="mailto:security@campus.edu"
                  className="group flex items-center gap-2 text-sm font-medium text-white/60 hover:text-[#1eb854] transition-all duration-300"
                >
                  <span className="w-1 h-1 rounded-full bg-[#1eb854] opacity-0 group-hover:opacity-100 transition-opacity" />
                  Contact V-Dept
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-8 relative">
          <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />

          <p className="text-xs font-medium text-white/30">
            © {new Date().getFullYear()} CampusGate Security.
          </p>

          <div className="flex gap-4">
            <SocialLink href="#" icon={<FaTwitter />} />
            <SocialLink href="#" icon={<FaGithub />} />
            <SocialLink href="#" icon={<FaLinkedin />} />
          </div>
        </div>
      </div>
    </footer>
  );
};

const FooterLink = ({ to, label }) => (
  <li>
    <Link
      to={to}
      className="group flex items-center gap-2 text-sm font-medium text-white/60 hover:text-white transition-all duration-300"
    >
      <span className="h-px w-0 bg-[#1eb854] group-hover:w-3 transition-all duration-300" />
      {label}
    </Link>
  </li>
);

const SocialLink = ({ href, icon }) => (
  <a
    href={href}
    className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:bg-[#1eb854] hover:text-white hover:scale-110 hover:shadow-[0_0_15px_rgba(30,184,84,0.4)] transition-all duration-300"
  >
    {icon}
  </a>
);

export default Footer;