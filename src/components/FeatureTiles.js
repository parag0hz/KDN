// src/components/FeatureTiles.js
import React from "react";

const items = [
    {
        icon: "/img/Layer_1-6.svg",
        title: "3DGS 뷰어",
        desc: "Gaussian Splat ( .ksplat /.splat / .ply ) 파일\n실시간 렌더"
    },
    {
        icon: "/img/Layer_1-4.svg",
        title: "카메라 자동 맞춤",
        desc: "BBox 기반 시점 프레이밍, 리셋 / 프리셋 지원"
    },
    {
        icon: "/img/Layer_1-2.svg",
        title: "축 교정 (Y/Z-up)",
        desc: "데이터 축이 달라도 버튼 한 번으로 방향 정렬"
    },
    {
        icon: "/img/Layer_1-5.svg",
        title: "위험 오버레이",
        desc: "침수 레벨 / 투명도 조절, 시나리오 가시화"
    },
    {
        icon: "/img/Layer_1-3.svg",
        title: "제보 핀",
        desc: "화면 클릭 > 유형 / 메모 저장 (로컬)으로 현장\n리포트"
    },


    {
        icon: "/img/Layer_1-1.svg",
        title: "성능 모드",
        desc: "COOP/COEP + SharedArrayBuffer 활성화로\n선명 / 고속"
    },
];

export default function FeatureTiles() {
    // 반응형 스타일
    const responsiveStyles = `
        .feature-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 40px;
            width: 100%;
            margin: 0;
            padding: 0;
        }
        
        .feature-card {
            width: 100%;
            height: 232px;
            flex-shrink: 0;
            background: #ffffff;
            border-radius: 22px;
            padding: 40px 30px;
            box-shadow: -1px 2px 18.3px -4px rgba(219, 219, 219, 1);
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            box-sizing: border-box;
        }
        
        .feature-icon {
            width: 76px;
            height: 76px;
            margin-right: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        
        .feature-title {
            font-size: 32px;
            font-weight: 600;
            color: #000000;
            margin: 0;
            flex: 1;
            text-align: right;
        }
        
        .feature-desc {
            font-size: 20px;
            font-weight: 300;
            color: #000000;
            margin: 0;
            line-height: 1.4;
            white-space: pre-line;
        }
        
        @media (max-width: 1200px) {
            .feature-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 35px;
            }
        }
        
        @media (max-width: 768px) {
            .feature-grid {
                grid-template-columns: 1fr;
                gap: 30px;
                padding: 0;
            }
            .feature-card {
                width: 100%;
                height: auto;
                min-height: 200px;
                padding: 35px 25px;
            }
            .feature-icon {
                width: 60px;
                height: 60px;
                margin-right: 12px;
            }
            .feature-title {
                font-size: 24px;
            }
            .feature-desc {
                font-size: 16px;
            }
        }
        
        @media (max-width: 480px) {
            .feature-grid {
                padding: 0;
                gap: 25px;
            }
            .feature-card {
                padding: 30px 20px;
            }
            .feature-icon {
                width: 50px;
                height: 50px;
                margin-right: 10px;
            }
            .feature-title {
                font-size: 20px;
            }
            .feature-desc {
                font-size: 14px;
            }
        }
    `;

    return (
        <>
            <style>{responsiveStyles}</style>
            <div className="feature-grid">
                {items.map((item, i) => (
                    <div key={i} className="feature-card">
                        {/* 아이콘과 타이틀을 한 줄에 배치 */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'flex-end',
                            marginBottom: '20px',
                            width: '100%'
                        }}>
                            <div className="feature-icon">
                                <img
                                    src={item.icon}
                                    alt={item.title}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'contain'
                                    }}
                                />
                            </div>
                            <div className="feature-title">
                                {item.title}
                            </div>
                        </div>
                        <p className="feature-desc">
                            {item.desc}
                        </p>
                    </div>
                ))}
            </div>
        </>
    );
}
