import { ROWS, COLS, OCCUPIED } from "../../constants";

export default function SeatGrid({ selectedSeats, onToggle }) {
  return (
    <div>
      <div style={{
        width: "100%", maxWidth: 560, background: "#1e1e1e", border: "1px solid #333",
        borderRadius: 6, textAlign: "center", padding: "8px", color: "#555",
        fontSize: 12, letterSpacing: 6, marginBottom: 28
      }}>
        ▬▬▬▬▬▬ SCREEN ▬▬▬▬▬▬
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
        {ROWS.map((row) => (
          <div key={row} style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ width: 16, fontSize: 12, color: "#555", textAlign: "center" }}>{row}</span>
            {COLS.map((col) => {
              const id = `${row}${col}`;
              const isOccupied = OCCUPIED.includes(id);
              const isSelected = selectedSeats.includes(id);
              return (
                <button key={id} onClick={() => onToggle(id)} title={id} style={{
                  width: 46, height: 34, borderRadius: 6, fontSize: 10, fontWeight: 600,
                  cursor: isOccupied ? "not-allowed" : "pointer",
                  background: isOccupied ? "#333" : isSelected ? "#e8650a" : "#252525",
                  border: `1.5px solid ${isOccupied ? "#3a3a3a" : isSelected ? "#e8650a" : "#444"}`,
                  color: isOccupied ? "#555" : isSelected ? "#fff" : "#aaa",
                  transition: "all 0.15s"
                }}>{id}</button>
              );
            })}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 28, fontSize: 13, color: "#aaa" }}>
        {[["#252525","#444","Available"],["#e8650a","#e8650a","Selected"],["#333","#3a3a3a","Occupied"]].map(([bg, border, label]) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 16, height: 16, borderRadius: 4, background: bg, border: `1.5px solid ${border}`, display: "inline-block" }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}