export default function MovieCard() {
  return (
    <div style={{
      display: "flex", gap: 20, background: "#1e1e1e",
      borderRadius: 16, padding: 20, border: "1px solid #2a2a2a"
    }}>
      <div style={{
        width: 120, height: 175, borderRadius: 10,
        background: "linear-gradient(135deg,#3d1a00,#7a3200)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 48, flexShrink: 0
      }}>🎬</div>
      <div>
        <h3 style={{ fontWeight: 900, fontSize: 17, marginBottom: 8, color: "#fff" }}>DUNE PART TWO</h3>
        <p style={{ fontSize: 13, color: "#999", lineHeight: 1.6, marginBottom: 12 }}>
          An epic sci-fi saga continues as Paul Atreides unites with Chani and the Fremen on a path of revenge...
        </p>
        <p style={{ fontSize: 13, color: "#aaa", marginBottom: 4 }}>⏱ Duration: 2h 46min</p>
        <p style={{ fontSize: 13, color: "#aaa" }}>🎭 Type: Sci-Fi / Adventure</p>
      </div>
    </div>
  );
}