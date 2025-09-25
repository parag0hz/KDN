import { Link, useLocation } from "react-router-dom";

export default function NavBar() {
    const { pathname } = useLocation();
    const bar = { position: "sticky", top: 0, background: "rgba(10,15,29,.7)", backdropFilter: "blur(8px)", borderBottom: "1px solid rgba(255,255,255,.12)", zIndex: 10 };
    const wrap = { maxWidth: 1100, margin: "0 auto", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" };
    const link = (to, label) => (
        <Link to={to} style={{ padding: "8px 10px", borderRadius: 10, opacity: pathname === to ? 1 : .8, background: pathname === to ? "#3b82f6" : "transparent", color: pathname === to ? "#fff" : "#e7ecf7" }}>
            {label}
        </Link>
    );
    return (
        <div style={bar}>
            <div style={wrap}>
                <Link to="/" style={{ fontWeight: 800 }}>3DGS Flood</Link>
                <div style={{ display: "flex", gap: 8 }}>
                    {link("/", "메인")}
                    {link("/report", "시민 제보")}
                    {link("/viewer", "3D 화면")}
                    {link("/map", "지도")}
                </div>
            </div>
        </div>
    );
}
