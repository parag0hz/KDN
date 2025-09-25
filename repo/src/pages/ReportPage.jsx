import { useState } from "react";
import { v4 as uuidv4 } from "uuid";

export default function ReportPage() {
    const [items, setItems] = useState([]);
    const [form, setForm] = useState({ type: "침수 높이", heightCm: "", message: "", lat: "", lng: "" });

    const submit = (e) => {
        e.preventDefault();
        setItems(prev => [{ id: uuidv4(), createdAt: new Date().toISOString(), ...form, heightCm: form.heightCm ? Number(form.heightCm) : undefined }, ...prev]);
        setForm({ type: "침수 높이", heightCm: "", message: "", lat: "", lng: "" });
        alert("제보가 임시 저장되었습니다.");
    };

    const input = (label, props) => (
        <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, color: "#9fb0d0" }}>{label}</span>
            <input {...props} style={{ padding: 10, borderRadius: 10, background: "#0b1430", border: "1px solid rgba(255,255,255,.12)", color: "#e7ecf7" }} />
        </label>
    );

    return (
        <div style={{ maxWidth: 1100, margin: "24px auto", padding: "0 20px", display: "grid", gridTemplateColumns: "420px 1fr", gap: 16, alignItems: "start" }}>
            <form onSubmit={submit} style={{ background: "#0f162e", border: "1px solid rgba(255,255,255,.12)", borderRadius: 16, padding: 16 }}>
                <h2 style={{ marginTop: 0 }}>시민 제보</h2>
                <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, color: "#9fb0d0" }}>유형</span>
                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                        style={{ padding: 10, borderRadius: 10, background: "#0b1430", border: "1px solid rgba(255,255,255,.12)", color: "#e7ecf7" }}>
                        <option>침수 높이</option><option>통행 곤란</option><option>배수구 막힘</option>
                    </select>
                </label>
                {input("침수 높이(cm)", { type: "number", value: form.heightCm, onChange: e => setForm(f => ({ ...f, heightCm: e.target.value })) })}
                {input("위도(lat)", { value: form.lat, onChange: e => setForm(f => ({ ...f, lat: e.target.value })) })}
                {input("경도(lng)", { value: form.lng, onChange: e => setForm(f => ({ ...f, lng: e.target.value })) })}
                <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, color: "#9fb0d0" }}>설명</span>
                    <textarea rows={4} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                        style={{ padding: 10, borderRadius: 10, background: "#0b1430", border: "1px solid rgba(255,255,255,.12)", color: "#e7ecf7" }} />
                </label>
                <button type="submit" style={{ marginTop: 12, background: "#3b82f6", color: "#fff", padding: "10px 14px", borderRadius: 12, border: "none" }}>제출</button>
            </form>

            <div>
                <h3 style={{ margin: "8px 0" }}>최근 제보</h3>
                <div style={{ display: "grid", gap: 10 }}>
                    {items.length === 0 ? <div style={{ color: "#9fb0d0" }}>아직 제보가 없습니다.</div> :
                        items.map(it => (
                            <div key={it.id} style={{ background: "#0b1430", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, padding: 12 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                    <strong>{it.type}{typeof it.heightCm === "number" ? ` · ${it.heightCm}cm` : ""}</strong>
                                    <span style={{ fontSize: 12, color: "#9fb0d0" }}>{new Date(it.createdAt).toLocaleString()}</span>
                                </div>
                                {it.message && <div style={{ marginTop: 6 }}>{it.message}</div>}
                                {(it.lat && it.lng) && <div style={{ fontSize: 12, color: "#9fb0d0", marginTop: 6 }}>({it.lat}, {it.lng})</div>}
                            </div>
                        ))
                    }
                </div>
            </div>
        </div>
    );
}
