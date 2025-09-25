// src/components/FeatureTiles.js
import React from "react";

const items = [
    { t: "3DGS 뷰어", d: "Gaussian Splat(.ksplat/.splat/.ply) 파일 실시간 렌더" },
    { t: "카메라 자동 맞춤", d: "BBox 기반 시점 프레이밍, 리셋/프리셋 지원" },
    { t: "축 교정(Y/Z-up)", d: "데이터 축이 달라도 버튼 한 번으로 방향 정렬" },
    { t: "위험 오버레이", d: "침수 레벨/투명도 컨트롤, 시나리오 가시화" },
    { t: "제보 핀", d: "화면 클릭→유형/메모 저장(로컬)으로 현장 리포트" },
    { t: "성능 모드", d: "COOP/COEP + SharedArrayBuffer 활성화로 선명/고속" },
];

export default function FeatureTiles() {
    return (
        <div className="grid cols-3">
            {items.map((it, i) => (
                <div key={i} className="tile">
                    <h4>{it.t}</h4>
                    <p>{it.d}</p>
                </div>
            ))}
        </div>
    );
}
