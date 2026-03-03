import { DATES } from "../constants";

export default function BookingModal({ booking, selectedSeats, total, onClose, onConfirm }) {
  const { theater, dateIndex, time } = booking;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#1e1e1e", border: "1px solid #333",
        borderRadius: 18, padding: "36px 40px", minWidth: 360
      }}>
        <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20, color: "#fff" }}>🎟️ Booking Summary</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          <p style={{ color: "#ccc" }}>🎬 Dune Part Two</p>
          <p style={{ color: "#ccc" }}>📍 {theater}</p>
          <p style={{ color: "#ccc" }}>📅 {DATES[dateIndex].day} 2023 &nbsp;|&nbsp; 🕐 {time}</p>
        </div>
        <div style={{ background: "#2a2a2a", borderRadius: 10, padding: "14px 18px", marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "#777", letterSpacing: 2, marginBottom: 4 }}>SEATS</div>
          <div style={{ color: "#e8650a", fontWeight: 700, fontSize: 17 }}>{selectedSeats.join(", ")}</div>
        </div>
        <div style={{ background: "#2a2a2a", borderRadius: 10, padding: "14px 18px", marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: "#777", letterSpacing: 2, marginBottom: 4 }}>TOTAL</div>
          <div style={{ fontWeight: 800, fontSize: 24, color: "#fff" }}>RM {total}</div>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          <button onClick={onClose} style={{
            flex: 1, background: "transparent", border: "1.5px solid #555",
            color: "#ccc", borderRadius: 10, padding: 13, cursor: "pointer", fontWeight: 600
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            flex: 1, background: "#e8650a", border: "none",
            color: "#fff", borderRadius: 10, padding: 13, cursor: "pointer", fontWeight: 700
          }}>Confirm Booking</button>
        </div>
      </div>
    </div>
  );
}