export default function MapPage() {
    return (
        <div style={{ maxWidth: 1100, margin: "24px auto", padding: "0 20px" }}>
            <h2>지도</h2>
            <div style={{ height: 520, background: "#0b1430", border: "1px dashed rgba(255,255,255,.2)", borderRadius: 12, display: "grid", placeItems: "center" }}>
                <div style={{ color: "#9fb0d0" }}>여기에 지도 라이브러리(Leaflet/Mapbox 등) 연동</div>
            </div>
        </div>
    );
}
