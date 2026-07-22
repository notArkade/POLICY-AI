import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Building2, ShieldCheck } from "lucide-react";
import { clearAdminAuthentication, isAdminAuthenticated } from "../services/adminAuth";

const links = [
  { label: "Home", to: "/" },
  { label: "About", to: "/#about" },
  { label: "Policies", to: "/#policies" },
  { label: "Contact", to: "/#contact" },
];

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = location.pathname.startsWith("/admin") && isAdminAuthenticated();

  const handleLogout = () => {
    clearAdminAuthentication();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 font-semibold text-slate-950">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-600 text-white">
            <Building2 className="h-5 w-5" />
          </span>
          <span>The Company</span>
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            >
              {link.label}
            </a>
          ))}
        </div>
        {isAdmin ? (
          <button type="button" onClick={handleLogout} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
            Logout
          </button>
        ) : (
          <NavLink
            to="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            <ShieldCheck className="h-4 w-4" />
            Login as Admin
          </NavLink>
        )}
      </nav>
    </header>
  );
};

export default Navbar;
