import { DATES, PRICE_PER_SEAT, SERVICE_CHARGE_RATE, COMBO_PRICE_THB } from "../constants";
import Navbar from "../components/Navbar";

export default function OrderDetailPage({ booking, selectedSeats, hasCombo, onBack, onCheckout }) {
  const { theater, dateIndex, time } = booking;
  const seatCount = selectedSeats.length;

  const regularTotal = PRICE_PER_SEAT * seatCount;
  const serviceCharge = Math.round(PRICE_PER_SEAT * SERVICE_CHARGE_RATE) * seatCount;
  const comboTotal = hasCombo ? COMBO_PRICE_THB : 0;
  const totalPayment = regularTotal + serviceCharge + comboTotal;

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div style={{
      minHeight: "100vh", width: "100vw",
      background: "linear-gradient(135deg,#1a1a1a 60%,#3d1a00)",
      fontFamily: "Segoe UI, sans-serif", color: "#fff", display: "flex", flexDirection: "column"
    }}>
      <Navbar />

      <div style={{ padding: "20px 48px 0", fontSize: 13, color: "#888" }}>Order detail</div>

      <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 48px" }}>
        <div style={{
          background: "#1a1a1a", border: "1px solid #2a2a2a",
          borderRadius: 16, padding: "36px 40px", width: "100%", maxWidth: 440
        }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>Booking Detail</h2>

          {/* Schedule */}
          <div style={{ marginBottom: 8 }}>
            <div style={s.sectionLabel}>Schedule</div>

            <div style={s.fieldLabel}>Movie Title</div>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>DUNE PART TWO</div>

            <div style={s.fieldLabel}>Date</div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>
              {dayNames[dateIndex]}, {DATES[dateIndex].day} 2023
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={s.fieldLabel}>Tikot ({seatCount})</div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{selectedSeats.join(", ")}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={s.fieldLabel}>Hours</div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{time}</div>
              </div>
            </div>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid #2a2a2a", margin: "22px 0" }} />

          {/* Transaction */}
          <div style={{ marginBottom: 24 }}>
            <div style={s.sectionLabel}>Transaction Detail</div>

            <div style={s.row}>
              <span style={s.fieldLabel}>REGULAR SEAT</span>
              <span style={s.value}>{PRICE_PER_SEAT} THB &nbsp;x{seatCount}</span>
            </div>
            <div style={s.row}>
              <span style={s.fieldLabel}>Service Charge (6%)</span>
              <span style={s.value}>{Math.round(PRICE_PER_SEAT * SERVICE_CHARGE_RATE)} THB &nbsp;x{seatCount}</span>
            </div>
            {hasCombo && (
              <div style={s.row}>
                <span style={s.fieldLabel}>SpongeBob Tinkub Set</span>
                <span style={s.value}>{COMBO_PRICE_THB} THB</span>
              </div>
            )}

            <hr style={{ border: "none", borderTop: "1px solid #2a2a2a", margin: "14px 0" }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>Total payment</span>
              <span style={{ fontSize: 17, fontWeight: 800 }}>{totalPayment} THB</span>
            </div>
          </div>

          <p style={{ fontSize: 11, color: "#666", marginBottom: 24, fontStyle: "italic" }}>
            *Purchased ticket cannot be cancelled
          </p>

          <button onClick={onCheckout} style={{
            background: "#e8650a", color: "#fff", border: "none", borderRadius: 10,
            padding: "14px", width: "100%", cursor: "pointer", fontWeight: 700, fontSize: 15
          }}>
            Checkout Ticket
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  sectionLabel: { fontSize: 13, fontWeight: 700, color: "#aaa", marginBottom: 14, letterSpacing: 0.5 },
  fieldLabel: { fontSize: 12, color: "#888", marginBottom: 4, display: "block" },
  row: { display: "flex", justifyContent: "space-between", marginBottom: 10 },
  value: { fontSize: 13, color: "#ccc" },
};