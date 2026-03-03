import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from '../assets/logo/NextSeat.png';

const LOGO_SRC = logo;
const allTickets = {
  upcoming: [
    { id: 1, date: "Mon, 23 Oct 2023", title: "DUNE PART TWO",         seats: ["C8","C9","C10"], time: "14:40", cinema: "TGV IMAX • Hall 4",    duration: "166 min" },
    { id: 2, date: "Tue, 23 Dec 2023", title: "POLIS EVO 3",           seats: ["C8","C9","C10"], time: "14:40", cinema: "GSC MID VALLEY • Hall 2", duration: "110 min" },
    { id: 3, date: "Mon, 23 Oct 2023", title: "SPIDERMAN NO WAY HOME", seats: ["C8","C9","C10"], time: "14:40", cinema: "TGV SUNWAY • Hall 6",    duration: "148 min" },
  ],
  history: [
    { id: 4, date: "Tue, 23 Dec 2023", title: "POLIS EVO 3",           seats: ["C8","C9","C10"], time: "14:40", cinema: "GSC MID VALLEY • Hall 2", duration: "110 min" },
    { id: 5, date: "Mon, 23 Oct 2023", title: "SPIDERMAN NO WAY HOME", seats: ["C8","C9","C10"], time: "14:40", cinema: "TGV SUNWAY • Hall 6",    duration: "148 min" },
  ],
};

function TicketCard({ ticket, index, onViewDetail }) {
  return (
    <div
      style={{
        background: "linear-gradient(145deg,#1a1a1a,#111)",
        border: "1px solid #2a2a2a",
        borderRadius: 16,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        animation: "fadeSlideUp 0.4s ease both",
        animationDelay: `${index * 0.08}s`,
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        cursor: "pointer",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(255,106,0,0.18)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)";    e.currentTarget.style.boxShadow = "none"; }}
      onClick={() => onViewDetail(ticket)}
    >
      {/* Date */}
      <div>
        <p style={{ color:"#666", fontSize:11, marginBottom:4, fontFamily:"monospace", letterSpacing:"0.1em", margin:"0 0 4px" }}>Date</p>
        <p style={{ color:"#fff", fontSize:16, fontWeight:600, margin:0 }}>{ticket.date}</p>
      </div>

      {/* Divider */}
      <div style={{ height:1, background:"linear-gradient(to right,#ff6a00,transparent)" }} />

      {/* Movie Title */}
      <div>
        <p style={{ color:"#666", fontSize:11, marginBottom:4, fontFamily:"monospace", letterSpacing:"0.1em", margin:"0 0 4px" }}>Movie Title</p>
        <p style={{ color:"#fff", fontSize:18, fontWeight:800, letterSpacing:"0.04em", margin:0 }}>{ticket.title}</p>
      </div>

      {/* Seats + Time */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
        <div>
          <p style={{ color:"#666", fontSize:11, margin:"0 0 4px", fontFamily:"monospace" }}>Tiket ({ticket.seats.length})</p>
          <p style={{ color:"#fff", fontSize:15, fontWeight:600, margin:0 }}>{ticket.seats.join(", ")}</p>
        </div>
        <div style={{ textAlign:"right" }}>
          <p style={{ color:"#666", fontSize:11, margin:"0 0 4px", fontFamily:"monospace" }}>Hours</p>
          <p style={{ color:"#fff", fontSize:22, fontWeight:800, margin:0 }}>{ticket.time}</p>
        </div>
      </div>

      {/* Download Button */}
      <button
        style={{
          background: "linear-gradient(135deg,#ff6a00,#ff9500)",
          color: "#fff", border: "none", borderRadius: 10,
          padding: "12px", fontWeight: 700, fontSize: 14,
          letterSpacing: "0.04em", cursor: "pointer",
          transition: "opacity 0.2s, transform 0.1s",
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "scale(0.98)"; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = "1";    e.currentTarget.style.transform = "scale(1)"; }}
        onClick={e => {
          e.stopPropagation();
          alert("Downloading ticket for " + ticket.title);
        }}
      >
        Download Ticket
      </button>
    </div>
  );
}

export default function MyTicket() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("upcoming");
  const currentTickets = allTickets[activeTab];

  const handleViewDetail = (ticket) => {
    navigate("/ticket-detail", { state: { ticket } });
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 80% 80%, #3a1200 0%, #1c0900 45%, #080808 100%)",
      fontFamily: "system-ui, sans-serif",
    }}>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .nav-btn-logout:hover { background: #a93226 !important; }
        .tab-btn { transition: all 0.25s ease; }
        .back-arrow:hover { color: #fff !important; }
      `}</style>

      {/* ── Navbar ── */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 40px",
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(14px)",
        borderBottom: "1px solid #1e1e1e",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <img
          src={LOGO_SRC}
          alt="NextSeat"
          style={{ height: 48, objectFit: "contain", cursor: "pointer" }}
          onClick={() => navigate("/")}
        />
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <button style={{
            background: "none", border: "none", color: "#fff",
            fontWeight: 700, fontSize: 14, cursor: "pointer",
            borderBottom: "2px solid #ff6a00", paddingBottom: 2,
          }}>
            My Ticket
          </button>
          <button
            className="nav-btn-logout"
            style={{
              background: "#c0392b", border: "none", color: "#fff",
              fontWeight: 700, fontSize: 14, cursor: "pointer",
              padding: "8px 20px", borderRadius: 8, transition: "background 0.2s",
            }}
            onClick={() => navigate("/login")}
          >
            Logout
          </button>
        </div>
      </nav>

      {/* ── Content ── */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "36px 24px 64px" }}>

        {/* Back */}
        <button
          className="back-arrow"
          style={{ background: "none", border: "none", color: "#888", cursor: "pointer", marginBottom: 24, fontSize: 24, padding: 0, transition: "color 0.2s" }}
          onClick={() => navigate(-1)}
        >
          &#8592;
        </button>

        {/* ── Tab Toggle ── */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 40 }}>
          <div style={{
            display: "flex",
            background: "#0d0d0d",
            borderRadius: 999,
            padding: 4,
            border: "1px solid #252525",
          }}>
            {["upcoming", "history"].map(tab => (
              <button
                key={tab}
                className="tab-btn"
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "10px 32px",
                  borderRadius: 999,
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: "0.04em",
                  background: activeTab === tab
                    ? "linear-gradient(135deg,#ff6a00,#ff9500)"
                    : "transparent",
                  color: activeTab === tab ? "#fff" : "#555",
                  textTransform: "capitalize",
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* ── Ticket Grid ── */}
        {currentTickets.length > 0 ? (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 20,
          }}>
            {currentTickets.map((t, i) => (
              <TicketCard
                key={t.id}
                ticket={t}
                index={i}
                onViewDetail={handleViewDetail}
              />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", marginTop: 100 }}>
            <p style={{ color: "#444", fontSize: 16 }}>No tickets found.</p>
          </div>
        )}
      </div>
    </div>
  );
}