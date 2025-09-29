import React from "react";
import KakaoMapComponent from "../components/NaverMap";

export default function MapPage() {
    // 서울시청 좌표
    const seoulCenter = { lat: 37.5665, lng: 126.9780 };

    // 예시 마커들
    const markers = [
        { position: seoulCenter, title: "서울시청" },
        { position: { lat: 37.5663, lng: 126.9779 }, title: "덕수궁" },
        { position: { lat: 37.5658, lng: 126.9750 }, title: "명동성당" },
    ];

    return (
        <div style={{ maxWidth: 1100, margin: "24px auto", padding: "0 20px" }}>
            <h2>지도</h2>
            <KakaoMapComponent
                height={520}
                center={seoulCenter}
                zoom={3}
                markers={markers}
            />
        </div>
    );
}
