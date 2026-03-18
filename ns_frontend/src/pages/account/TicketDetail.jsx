import { useCallback, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import MainNavbar from '../../components/navigation/MainNavbar';
import { useAppLanguage } from '../../hooks/useAppLanguage';

function TearOff() {
  return (
    <div style={{ position:"relative", height:18, display:"flex", alignItems:"center" }}>
      <div style={{ position:"absolute", left:-1, width:18, height:18, background:"radial-gradient(ellipse at 80% 50%, #3a1200, #1c0900 65%)", borderRadius:"0 50% 50% 0", border:"1px solid #2c2c2c", borderLeft:"none" }} />
      <div style={{ flex:1, borderTop:"1.5px dashed #2a2a2a", margin:"0 22px" }} />
      <div style={{ position:"absolute", right:-1, width:18, height:18, background:"radial-gradient(ellipse at 20% 50%, #3a1200, #1c0900 65%)", borderRadius:"50% 0 0 50%", border:"1px solid #2c2c2c", borderRight:"none" }} />
    </div>
  );
}

function Barcode({ bookingId }) {
  const pattern = [2,1,3,1,1,2,1,3,2,1,1,2,3,1,2,1,1,3,1,2,1,1,2,1,3,1,2,2,1,3,1,1,2,1,2,3,1,1,2,1,3,1,2];
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
      <div style={{ display:"flex", alignItems:"stretch", height:46, gap:1.2 }}>
        {pattern.map((w,i) => (
          <div key={i} style={{ width:w*1.75, background:i%2===0?"rgba(255,255,255,0.8)":"transparent", borderRadius:1 }} />
        ))}
      </div>
      <span style={{ color:"#555", fontSize:10, fontFamily:"monospace", letterSpacing:"0.12em" }}>{bookingId}</span>
    </div>
  );
}

function Field({ label, value, large, right }) {
  return (
    <div style={{ textAlign:right?"right":"left" }}>
      <p style={{ color:"#666", fontSize:10, margin:"0 0 3px", fontFamily:"monospace", letterSpacing:"0.08em" }}>{label}</p>
      <p style={{ color:"#fff", fontSize:large?17:14, fontWeight:large?800:600, margin:0, letterSpacing:large?"0.02em":0 }}>{value}</p>
    </div>
  );
}

export default function TicketDetail() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { isThai } = useAppLanguage();
  const [downloaded, setDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);

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

  const downloadTicketImage = useCallback(async () => {
    if (downloading) return;
    setDownloading(true);

    try {
      const width = 1200;
      const height = 1800;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      const barcodePattern = [2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 1, 3, 1, 2, 1, 1, 2, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1, 2, 3, 1, 1, 2, 1, 3, 1, 2];
      const seatText = Array.isArray(ticket.seats) ? ticket.seats.join(', ') : String(ticket.seats || '-');

      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#1f1f1f');
      bgGrad.addColorStop(1, '#0e0e0e');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#ff7a1a';
      ctx.font = 'bold 44px Segoe UI, Arial';
      ctx.fillText(isThai ? 'ตั๋วภาพยนตร์' : 'Movie Ticket', 90, 120);

      ctx.fillStyle = '#8f8f8f';
      ctx.font = '24px Segoe UI, Arial';
      ctx.fillText(`Booking ID: ${bookingId}`, 90, 170);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 58px Segoe UI, Arial';
      ctx.fillText(ticket.title || '-', 90, 280);

      ctx.fillStyle = '#bdbdbd';
      ctx.font = '34px Segoe UI, Arial';
      ctx.fillText(`${isThai ? 'วันที่' : 'Date'}: ${ticket.date || '-'}`, 90, 360);
      ctx.fillText(`${isThai ? 'เวลา' : 'Time'}: ${ticket.time || '-'}`, 90, 420);
      ctx.fillText(`${isThai ? 'โรง' : 'Cinema'}: ${ticket.cinema || '-'}`, 90, 480);
      ctx.fillText(`${isThai ? 'ที่นั่ง' : 'Seats'}: ${seatText || '-'}`, 90, 540);
      ctx.fillText(`${isThai ? 'ความยาว' : 'Duration'}: ${ticket.duration || '-'}`, 90, 600);

      ctx.strokeStyle = '#2f2f2f';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.moveTo(90, 700);
      ctx.lineTo(width - 90, 700);
      ctx.stroke();
      ctx.setLineDash([]);

      const barStartX = 120;
      const barTop = 820;
      const barHeight = 240;
      let x = barStartX;
      for (let i = 0; i < barcodePattern.length; i += 1) {
        const barW = barcodePattern[i] * 7;
        if (i % 2 === 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.fillRect(x, barTop, barW, barHeight);
        }
        x += barW + 3;
      }

      ctx.fillStyle = '#666';
      ctx.font = '28px Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(bookingId, width / 2, 1120);
      ctx.textAlign = 'left';

      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `${bookingId}.png`;
      link.click();

      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2600);
    } catch (error) {
      console.error('Download ticket failed:', error);
      window.alert(isThai ? 'ดาวน์โหลดตั๋วไม่สำเร็จ' : 'Failed to download ticket.');
    } finally {
      setDownloading(false);
    }
  }, [bookingId, downloading, isThai, ticket]);

  return (
    <div style={{
      height: "100dvh",
      background: "radial-gradient(ellipse at 70% 85%, #3a1200 0%, #1c0900 40%, #080808 100%)",
      fontFamily: "system-ui, sans-serif",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
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
      `}</style>

      <MainNavbar active="home" />

      {/* ── Body ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", overflowY:"auto", padding:"78px 14px 12px" }}>

        {/* Heading */}
        <h1 className="fade-up" style={{
          color:"#fff", fontSize:22, fontWeight:800, letterSpacing:"0.02em",
          alignSelf:"flex-start", maxWidth:390, width:"100%",
          margin:"0 0 10px", paddingLeft:"80px", animationDelay:"0s",
        }}>
          {isThai ? 'รายละเอียดตั๋ว' : 'Ticket Detail'}
        </h1>

        {/* ── Card ── */}
        <div className="fade-up" style={{ width:"100%", maxWidth:300, animationDelay:"0.1s" }}>

          {/* Top */}
          <div style={{
            background: "linear-gradient(155deg,#1f1f1f,#131313)",
            border: "1px solid #282828",
            borderBottom: "none",
            borderRadius: "16px 16px 0 0",
            padding: "18px 18px 14px",
          }}>
            {/* Booking ID */}
            <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(255,106,0,0.1)", border:"1px solid rgba(255,106,0,0.28)", borderRadius:6, padding:"4px 10px", marginBottom:14 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#ff6a00", boxShadow:"0 0 6px #ff6a00" }} />
              <span style={{ color:"#ff8c40", fontSize:10, fontFamily:"monospace", letterSpacing:"0.1em" }}>{bookingId}</span>
            </div>

            <Field label={isThai ? 'วันที่' : 'Date'} value={ticket.date} />
            <div style={{ height:1, background:"linear-gradient(to right,#ff6a00,transparent)", margin:"12px 0" }} />
            <Field label={isThai ? 'ชื่อภาพยนตร์' : 'Movie Title'} value={ticket.title} large />

            <div style={{ display:"flex", justifyContent:"space-between", marginTop:14, alignItems:"flex-end" }}>
              <Field label={isThai ? `ที่นั่ง (${ticket.seats.length})` : `Ticket (${ticket.seats.length})`} value={ticket.seats.join(", ")} />
              <Field label={isThai ? 'เวลา' : 'Hours'} value={ticket.time} large right />
            </div>

            <div style={{ display:"flex", justifyContent:"space-between", marginTop:14 }}>
              <Field label={isThai ? 'โรงภาพยนตร์' : 'Cinema'}   value={ticket.cinema   || "TGV IMAX • Hall 4"} />
              <Field label={isThai ? 'ความยาว' : 'Duration'} value={ticket.duration || "—"} right />
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
            borderRadius: "0 0 16px 16px",
            padding: "14px 18px 18px",
          }}>
            <Barcode bookingId={bookingId} />

            <button
              className="dl-btn"
              onClick={downloadTicketImage}
              disabled={downloading}
              style={{
                width:"100%", marginTop:14, padding:"12px",
                background: downloaded ? "linear-gradient(135deg,#1e7e34,#27ae60)" : "linear-gradient(135deg,#ff6a00,#ff9500)",
                border:"none", borderRadius:12,
                color:"#fff", fontWeight:800, fontSize:14, letterSpacing:"0.03em",
                cursor:downloading ? "not-allowed" : "pointer",
                opacity:downloading ? 0.7 : 1,
                display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                animation: !downloaded ? "glowPulse 2.8s infinite" : "none",
                transition:"background 0.3s",
              }}
            >
              {downloading ? (
                <>{isThai ? 'กำลังสร้างไฟล์...' : 'Preparing file...'}</>
              ) : downloaded ? (
                <><span style={{ animation:"checkPop 0.35s ease both", display:"inline-block" }}>&#10003;</span> {isThai ? 'ดาวน์โหลดแล้ว!' : 'Downloaded!'}</>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 2v8M5 7l3 3 3-3"/><path d="M2 13h12"/>
                  </svg>
                  {isThai ? 'ดาวน์โหลดตั๋ว' : 'Download Ticket'}
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
            marginTop:10, padding:"10px 34px",
            background:"transparent", border:"2px solid #333",
            borderRadius:12, color:"#fff",
            fontWeight:700, fontSize:14, cursor:"pointer",
            transition:"background 0.18s, border-color 0.18s",
            animationDelay:"0.2s",
          }}
        >
          {isThai ? 'กลับไปหน้าตั๋วของฉัน' : 'Back to My Tickets'}
        </button>
      </div>
    </div>
  );
}
