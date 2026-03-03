import { THEATERS, DATES, TIMES } from "../constants";
import Navbar from "../components/Navbar";
import MovieCard from "../components/MovieCard";

export default function HomePage({ booking, setBooking, onProceed }) {
  const { theater, dateIndex, time } = booking;
  const set = (key, value) => setBooking((prev) => ({ ...prev, [key]: value }));

  return (
    <div style={{
      minHeight: "100vh", width: "100vw",
      background: "linear-gradient(135deg,#1a1a1a 60%,#3d1a00)",
      fontFamily: "Segoe UI, sans-serif", color: "#fff", display: "flex", flexDirection: "column"
    }}>
      <Navbar />

      <div style={{ flex: 1, display: "flex", gap: 48, padding: "40px 48px", boxSizing: "border-box" }}>

        {/* Left */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 32 }}>

          {/* Theater */}
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>Theater</h2>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {THEATERS.map((t) => (
                <button key={t} onClick={() => set("theater", t)} style={{
                  background: "transparent",
                  border: `1.5px solid ${theater === t ? "#e8650a" : "#444"}`,
                  color: theater === t ? "#e8650a" : "#ccc",
                  borderRadius: 24, padding: "8px 20px", cursor: "pointer",
                  fontSize: 14, fontWeight: theater === t ? 700 : 400
                }}>📍 {t}</button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>Date</h2>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {DATES.map((d, i) => (
                <button key={i} onClick={() => set("dateIndex", i)} style={{
                  background: dateIndex === i ? "#e8650a" : "transparent",
                  border: `1.5px solid ${dateIndex === i ? "#e8650a" : "#444"}`,
                  color: "#fff", borderRadius: 10, padding: "10px 18px", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", minWidth: 65, gap: 2
                }}>
                  <span style={{ fontSize: 12 }}>{d.day}</span>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{d.weekday}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Time */}
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>Time</h2>
            <div style={{ display: "flex", gap: 12 }}>
              {TIMES.map((t) => (
                <button key={t} onClick={() => set("time", t)} style={{
                  background: time === t ? "#e8650a" : "transparent",
                  border: `1.5px solid ${time === t ? "#e8650a" : "#444"}`,
                  color: "#fff", borderRadius: 10, padding: "10px 24px",
                  cursor: "pointer", fontWeight: time === t ? 700 : 400, fontSize: 14
                }}>{t}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Right */}
        <div style={{ width: 380, display: "flex", flexDirection: "column", gap: 24 }}>
          <MovieCard />
          <div style={{ background: "#1e1e1e", border: "1px solid #333", borderRadius: 16, padding: "24px 28px" }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>{theater}</h3>
            <p style={{ color: "#ccc", fontSize: 15, marginBottom: 4 }}>📅 {DATES[dateIndex].day} 2023</p>
            <p style={{ color: "#ccc", fontSize: 15, marginBottom: 16 }}>🕐 {time}</p>
            <p style={{ fontSize: 12, color: "#777", marginBottom: 20 }}>*Seat selection can be done after this</p>
            <button onClick={onProceed} style={{
              background: "#e8650a", color: "#fff", border: "none", borderRadius: 10,
              padding: "13px", width: "100%", cursor: "pointer", fontWeight: 700, fontSize: 15
            }}>Proceed →</button>
          </div>
        </div>
      </div>
    </div>
  );
}