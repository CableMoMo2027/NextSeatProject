import logo from '../assets/logo/logo.png';

export default function Navbar({ subtitle }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "16px 48px", borderBottom: "1px solid #2a2a2a"
    }}>

      {/* เปลี่ยนตรงนี้ */}
      <img
        src={logo}
        alt="Logo"
        style={{ height: 48, objectFit: "contain" }}
      />

      {subtitle && (
        <div style={{ fontSize: 14, color: "#aaa" }}>{subtitle}</div>
      )}

      <button style={{
        background: "#e53e3e", color: "#fff", border: "none",
        borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontWeight: 700
      }}>
        Logout
      </button>
    </div>
  );
}
