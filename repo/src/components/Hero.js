// src/components/Hero.js
import React from "react";

export default function Hero() {
    return (
        <section className="hero">
            <div className="container heroWrap">
                <div>
                    <div className="heroBadge">한전 KDN · 3DGS 기반 침수취약 지역 솔루션</div>
                    <h1 className="h1">침수 위험을 <span style={{ color: "#8ab8ff" }}>3D</span>로 이해하고, 더 빨리 대응합니다.</h1>
                    <p className="sub">Gaussian Splatting + 웹 뷰어로 저지대·하천 인접 지역의 위험을 직관적으로 시각화합니다.</p>
                    <div className="heroBtns">
                        <a className="btn primary" href="#demo">데모 체험</a>
                        <a className="btn ghost" href="#features">핵심 기능 보기</a>
                    </div>
                </div>

                {/* 우측 미니 프리뷰 카드(후에 3D 뷰어로 교체 예정) */}
                <div className="heroCard">
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 14, color: "#9fb0d0" }}>미니 프리뷰</div>
                        <div style={{ fontSize: 20, marginTop: 6 }}>3DGS Viewer Placeholder</div>
                        <div style={{ marginTop: 10, fontSize: 13, color: "#9fb0d0" }}>업로드 후 이 영역이 실시간 뷰로 바뀝니다.</div>
                    </div>
                </div>
            </div>
        </section>
    );
}
