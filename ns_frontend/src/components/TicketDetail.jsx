import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from '../assets/logo/NextSeat.png';

const LOGO_SRC = logo;
function TearOff() {
  return (
    <div style={{ position:"relative", height:24, display:"flex", alignItems:"center" }}>
      <div style={{ position:"absolute", left:-1, width:24, height:24, background:"radial-gradient(ellipse at 80% 50%, #3a1200, #1c0900 65%)", borderRadius:"0 50% 50% 0", border:"1px solid #2c2c2c", borderLeft:"none" }} />
      <div style={{ flex:1, borderTop:"1.5px dashed #2a2a2a", margin:"0 28px" }} />
      <div style={{ position:"absolute", right:-1, width:24, height:24, background:"radial-gradient(ellipse at 20% 50%, #3a1200, #1c0900 65%)", borderRadius:"50% 0 0 50%", border:"1px solid #2c2c2c", borderRight:"none" }} />
    </div>
  );
}

function Barcode({ bookingId }) {
  const pattern = [2,1,3,1,1,2,1,3,2,1,1,2,3,1,2,1,1,3,1,2,1,1,2,1,3,1,2,2,1,3,1,1,2,1,2,3,1,1,2,1,3,1,2];
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
      <div style={{ display:"flex", alignItems:"stretch", height:58, gap:1.5 }}>
        {pattern.map((w,i) => (
          <div key={i} style={{ width:w*2.2, background:i%2===0?"rgba(255,255,255,0.8)":"transparent", borderRadius:1 }} />
        ))}
      </div>
      <span style={{ color:"#555", fontSize:11, fontFamily:"monospace", letterSpacing:"0.16em" }}>{bookingId}</span>
    </div>
  );
}

function Field({ label, value, large, right }) {
  return (
    <div style={{ textAlign:right?"right":"left" }}>
      <p style={{ color:"#666", fontSize:11, margin:"0 0 4px", fontFamily:"monospace", letterSpacing:"0.1em" }}>{label}</p>
      <p style={{ color:"#fff", fontSize:large?20:16, fontWeight:large?800:600, margin:0, letterSpacing:large?"0.04em":0 }}>{value}</p>
    </div>
  );
}

export default function TicketDetail() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [downloaded, setDownloaded] = useState(false);

  const ticket = location.state?.ticket || {
    bookingId: "NST-20231023-0042",
    date:     "Mon, 23 Oct 2023",
    title:    "DUNE PART TWO",
    seats:    ["C8","C9","C10"],
    time:     "14:40",
    cinema:   "TGV IMAX • Hall 4",
    duration: "166 min",
  };

  const bookingId = ticket.bookingId || "NST-20231023-0042";

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 70% 85%, #3a1200 0%, #1c0900 40%, #080808 100%)",
      fontFamily: "system-ui, sans-serif",
      display: "flex", flexDirection: "column",
    }}>
      <style>{`
        @keyframes fadeUp    { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
        @keyframes glowPulse { 0%,100%{box-shadow:0 0 0 0 rgba(255,106,0,.35)} 50%{box-shadow:0 0 0 10px rgba(255,106,0,0)} }
        @keyframes checkPop  { 0%{transform:scale(0) rotate(-20deg);opacity:0} 70%{transform:scale(1.2)} 100%{transform:scale(1);opacity:1} }
        .fade-up   { animation: fadeUp .45s ease both; }
        .dl-btn    { transition: filter .18s, transform .15s; }
        .dl-btn:hover  { filter: brightness(1.14); transform: translateY(-2px); }
        .dl-btn:active { transform: scale(.97); }
        .back-btn:hover { background: rgba(255,255,255,.07) !important; border-color: #ff6a00 !important; }
        .nav-btn-logout:hover { background: #a93226 !important; }
      `}</style>

      {/* ── Navbar ── */}
      <nav style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"12px 40px",
        background:"rgba(0,0,0,0.65)", backdropFilter:"blur(14px)",
        borderBottom:"1px solid #1e1e1e",
        position:"sticky", top:0, zIndex:100,
      }}>
        <img src={LOGO_SRC} alt="NextSeat" style={{ height:48, objectFit:"contain", cursor:"pointer" }} onClick={() => navigate("/")} />
        <div style={{ display:"flex", gap:14, alignItems:"center" }}>
          <button
            style={{ background:"none", border:"none", color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer", borderBottom:"2px solid #ff6a00", paddingBottom:2 }}
            onClick={() => navigate("/my-ticket")}
          >My Ticket</button>
          <button
            className="nav-btn-logout"
            style={{ background:"#c0392b", border:"none", color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer", padding:"8px 20px", borderRadius:8, transition:"background 0.2s" }}
            onClick={() => navigate("/login")}
          >Logout</button>
        </div>
      </nav>

      {/* ── Body ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", padding:"44px 24px 64px" }}>

        {/* Heading */}
        <h1 className="fade-up" style={{
          color:"#fff", fontSize:26, fontWeight:800, letterSpacing:"0.02em",
          alignSelf:"flex-start", maxWidth:460, width:"100%",
          margin:"0 0 32px", animationDelay:"0s",
        }}>
          Ticket Detail
        </h1>

        {/* ── Card ── */}
        <div className="fade-up" style={{ width:"100%", maxWidth:440, animationDelay:"0.1s" }}>

          {/* Top */}
          <div style={{
            background: "linear-gradient(155deg,#1f1f1f,#131313)",
            border: "1px solid #282828",
            borderBottom: "none",
            borderRadius: "20px 20px 0 0",
            padding: "28px 28px 22px",
          }}>
            {/* Booking ID */}
            <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(255,106,0,0.1)", border:"1px solid rgba(255,106,0,0.28)", borderRadius:6, padding:"4px 12px", marginBottom:22 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#ff6a00", boxShadow:"0 0 6px #ff6a00" }} />
              <span style={{ color:"#ff8c40", fontSize:11, fontFamily:"monospace", letterSpacing:"0.12em" }}>{bookingId}</span>
            </div>

            <Field label="Date" value={ticket.date} />
            <div style={{ height:1, background:"linear-gradient(to right,#ff6a00,transparent)", margin:"18px 0" }} />
            <Field label="Movie Title" value={ticket.title} large />

            <div style={{ display:"flex", justifyContent:"space-between", marginTop:20, alignItems:"flex-end" }}>
              <Field label={`Tiket (${ticket.seats.length})`} value={ticket.seats.join(", ")} />
              <Field label="Hours" value={ticket.time} large right />
            </div>

            <div style={{ display:"flex", justifyContent:"space-between", marginTop:20 }}>
              <Field label="Cinema"   value={ticket.cinema   || "TGV IMAX • Hall 4"} />
              <Field label="Duration" value={ticket.duration || "—"} right />
            </div>
          </div>

          {/* Tear-off */}
          <div style={{ background:"linear-gradient(155deg,#1a1a1a,#111)", border:"1px solid #282828", borderTop:"none", borderBottom:"none" }}>
            <TearOff />
          </div>

          {/* Bottom */}
          <div style={{
            background: "linear-gradient(155deg,#151515,#0e0e0e)",
            border: "1px solid #282828",
            borderTop: "none",
            borderRadius: "0 0 20px 20px",
            padding: "22px 28px 28px",
          }}>
            <Barcode bookingId={bookingId} />

            <button
              className="dl-btn"
              onClick={() => { setDownloaded(true); setTimeout(() => setDownloaded(false), 2600); }}
              style={{
                width:"100%", marginTop:22, padding:"14px",
                background: downloaded ? "linear-gradient(135deg,#1e7e34,#27ae60)" : "linear-gradient(135deg,#ff6a00,#ff9500)",
                border:"none", borderRadius:12,
                color:"#fff", fontWeight:800, fontSize:15, letterSpacing:"0.05em",
                cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                animation: !downloaded ? "glowPulse 2.8s infinite" : "none",
                transition:"background 0.3s",
              }}
            >
              {downloaded ? (
                <><span style={{ animation:"checkPop 0.35s ease both", display:"inline-block" }}>&#10003;</span> Downloaded!</>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 2v8M5 7l3 3 3-3"/><path d="M2 13h12"/>
                  </svg>
                  Download Ticket
                </>
              )}
            </button>
          </div>
        </div>

        {/* Back button */}
        <button
          className="back-btn fade-up"
          onClick={() => navigate("/my-ticket")}
          style={{
            marginTop:36, padding:"13px 52px",
            background:"transparent", border:"2px solid #333",
            borderRadius:12, color:"#fff",
            fontWeight:700, fontSize:15, cursor:"pointer",
            transition:"background 0.18s, border-color 0.18s",
            animationDelay:"0.2s",
          }}
        >
          Back to My Tickets
        </button>
      </div>
    </div>
  );
}