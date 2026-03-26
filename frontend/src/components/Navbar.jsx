import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import api from "../utils/api";

/* ── SVG Icons ── */
function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();

  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState([]);
  const [showRes, setShowRes]   = useState(false);
  const [showProf, setShowProf] = useState(false);
  const [company, setCompany]   = useState(() => {
    try { return JSON.parse(localStorage.getItem("erp_company") || "{}"); }
    catch { return {}; }
  });

  const searchRef = useRef(null);
  const profRef   = useRef(null);
  const timer     = useRef(null);

  useEffect(() => {
    api.get("/company")
      .then((r) => {
        setCompany(r.data || {});
        localStorage.setItem("erp_company", JSON.stringify(r.data || {}));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const h = (e) => {
      if (profRef.current && !profRef.current.contains(e.target)) setShowProf(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowRes(false); setResults([]);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleSearch = (q) => {
    setQuery(q);
    clearTimeout(timer.current);
    if (!q.trim()) { setResults([]); setShowRes(false); return; }
    timer.current = setTimeout(async () => {
      try {
        const r = await api.get("/search", { params: { q } });
        setResults(r.data); setShowRes(true);
      } catch { setResults([]); }
    }, 300);
  };

  const goTo = (item) => {
    setQuery(""); setResults([]); setShowRes(false);
    const base = user?.role === "ADMIN" ? "/admin" : "/manager";
    if (item.type === "order")    navigate(`${base}/orders`);
    if (item.type === "customer") navigate(`${base}/customers`);
    if (item.type === "product")  navigate("/admin/products");
  };

  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const logoUrl = company.logo_url
    ? (company.logo_url.startsWith("http") ? company.logo_url : `http://localhost:5000${company.logo_url}`)
    : null;

  return (
    <header style={{
      height: 56,
      background: "var(--card)",
      borderBottom: "1px solid var(--border)",
      display: "grid",
      gridTemplateColumns: "auto 1fr auto",
      alignItems: "center",
      padding: "0 16px",
      gap: 12,
      flexShrink: 0,
      zIndex: 30,
      position: "sticky",
      top: 0,
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    }}>
      {/* Mobile menu */}
      <button
        onClick={onMenuClick}
        className="mobile-menu-btn"
        style={{ display: "none", padding: "6px 8px", borderRadius: 7, border: "none", background: "none", cursor: "pointer", color: "var(--text)", fontSize: 18 }}
      >☰</button>
      <style>{`@media(max-width:1024px){.mobile-menu-btn{display:flex!important;align-items:center}}`}</style>

      {/* Logo + Name */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, overflow: "hidden", flexShrink: 0,
          background: "linear-gradient(135deg,var(--primary),var(--secondary))",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {logoUrl
            ? <img src={logoUrl} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ color: "#fff", fontWeight: 800, fontSize: 13 }}>
                {(company.company_name || "W")[0]}
              </span>
          }
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>
            {company.company_name || "WoodCraft ERP"}
          </div>
          <div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 500, marginTop: 1 }}>
            {user?.role === "ADMIN" ? "Administrator" : "Manager"}
          </div>
        </div>
      </div>

      {/* Search */}
      <div ref={searchRef} style={{ position: "relative", maxWidth: 480, width: "100%" }}>
        <input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search orders, customers, products…"
          style={{
            width: "100%", padding: "8px 14px",
            border: "1px solid var(--border)", borderRadius: 8,
            fontSize: 13, background: "var(--bg2)", color: "var(--text)", outline: "none",
          }}
          onFocus={(e) => { e.target.style.borderColor = "var(--primary)"; e.target.style.background = "var(--card)"; }}
          onBlur={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.background = "var(--bg2)"; }}
        />
        {showRes && results.length > 0 && (
          <div style={{
            position: "absolute", top: "100%", marginTop: 4,
            background: "var(--card)", width: "100%",
            border: "1px solid var(--border)", borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 100, overflow: "hidden",
          }}>
            {results.map((r, i) => (
              <button key={i} onClick={() => goTo(r)}
                style={{ width: "100%", textAlign: "left", padding: "9px 14px", background: "none", border: "none", borderBottom: "1px solid var(--border2)", cursor: "pointer", fontSize: 13, color: "var(--text)" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--bg2)"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >{r.label}</button>
            ))}
          </div>
        )}
      </div>

      {/* Right controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>

        {/* Theme toggle switch */}
        <button
          onClick={toggle}
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 12px", borderRadius: 20,
            border: "1px solid var(--border)",
            background: dark ? "var(--bg3)" : "var(--bg2)",
            cursor: "pointer", color: "var(--text2)",
            fontSize: 12, fontWeight: 600,
            transition: "all 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text2)"; }}
        >
          {dark ? <SunIcon /> : <MoonIcon />}
          <span className="theme-label" style={{ }}>{dark ? "Light" : "Dark"}</span>
        </button>
        <style>{`@media(max-width:768px){.theme-label{display:none}}`}</style>

        {/* Profile */}
        <div ref={profRef} style={{ position: "relative" }}>
          <button
            onClick={() => setShowProf((p) => !p)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "5px 10px 5px 5px",
              border: "1px solid var(--border)", borderRadius: 20,
              background: showProf ? "var(--bg3)" : "var(--bg2)",
              cursor: "pointer", transition: "all 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--primary)"}
            onMouseLeave={e => { if (!showProf) e.currentTarget.style.borderColor = "var(--border)"; }}
          >
            {/* Avatar */}
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "linear-gradient(135deg,var(--primary),var(--secondary))",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 700, fontSize: 11, flexShrink: 0,
            }}>
              {initials}
            </div>
            <div style={{ textAlign: "left", lineHeight: 1.2 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", maxWidth: 110, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user?.name || "User"}
              </div>
              <div style={{ fontSize: 10, color: "var(--text3)" }}>{user?.role}</div>
            </div>
            <ChevronDownIcon />
          </button>

          {showProf && (
            <div style={{
              position: "absolute", right: 0, top: "calc(100% + 6px)",
              background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: 10, boxShadow: "0 8px 28px rgba(0,0,0,0.14)",
              zIndex: 100, minWidth: 200, overflow: "hidden",
            }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)" }}>{user?.name}</div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{user?.email}</div>
                <div style={{
                  display: "inline-block", marginTop: 6, padding: "2px 8px",
                  borderRadius: 20, fontSize: 10, fontWeight: 700,
                  background: user?.role === "ADMIN" ? "var(--primary-bg)" : "var(--secondary-bg)",
                  color: user?.role === "ADMIN" ? "var(--primary)" : "var(--secondary)",
                }}>{user?.role}</div>
              </div>
              <button
                onClick={logout}
                style={{ width: "100%", textAlign: "left", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--red)", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--red-bg)"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
