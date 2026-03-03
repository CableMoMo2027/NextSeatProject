import { useState } from "react";
import { DATES, OCCUPIED, PRICE_PER_SEAT } from "../constants";
import Navbar from "../components/Navbar";
import SeatGrid from "../components/SeatGrid";
import BookingModal from "../components/BookingModal";

export default function SeatPage({ booking, onBack, onConfirm }) {
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const { theater, dateIndex, time } = booking;
  const total = (selectedSeats.length * PRICE_PER_SEAT).toFixed(2);

  const toggleSeat = (id) => {
    if (OCCUPIED.includes(id)) return;
    setSelectedSeats((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const subtitle = `📍 ${theater}  |  📅 ${DATES[dateIndex].day}  |  🕐 ${time}`;

  return (
    <div style={{
      minHeight: "100vh", width: "100vw",
      background: "linear-gradient(135deg,#1c1c1c 60%,#3a1500)",
      fontFamily: "Segoe UI, sans-serif", color: "#fff", display: "flex", flexDirection: "column"
    }}>
      <Navbar subtitle={subtitle} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "36px 48px" }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Select Your Seat</h2>
        <p style={{ color: "#888", marginBottom: 32, fontSize: 14 }}>Click on an available seat to select it</p>
        <SeatGrid selectedSeats={selectedSeats} onToggle={toggleSeat} />
      </div>

      {/* Footer */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "#111", borderTop: "1px solid #2a2a2a", padding: "20px 48px"
      }}>
        <div>
          <div style={{ fontSize: 11, color: "#666", letterSpacing: 2, marginBottom: 4 }}>TOTAL</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>THB {total}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#666", letterSpacing: 2, marginBottom: 4 }}>SELECTED SEATS</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: selectedSeats.length > 0 ? "#e8650a" : "#555" }}>
            {selectedSeats.length > 0 ? selectedSeats.join(", ") : "No seats selected"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          <button onClick={onBack} style={{
            background: "transparent", border: "1.5px solid #555", color: "#ccc",
            borderRadius: 10, padding: "12px 28px", cursor: "pointer", fontWeight: 600, fontSize: 14
          }}>← Back</button>
          <button
            onClick={() => selectedSeats.length > 0 && setShowModal(true)}
            style={{
              background: "#e8650a", border: "none", color: "#fff", borderRadius: 10,
              padding: "12px 28px", cursor: "pointer", fontWeight: 700, fontSize: 14,
              opacity: selectedSeats.length > 0 ? 1 : 0.4
            }}
          >Add combo →</button>
        </div>
      </div>

      {showModal && (
        <BookingModal
          booking={booking}
          selectedSeats={selectedSeats}
          total={total}
          onClose={() => setShowModal(false)}
          onConfirm={() => {
            setShowModal(false);
            onConfirm(selectedSeats, true);
          }}
        />
      )}
    </div>
  );
}