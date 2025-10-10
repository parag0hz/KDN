// src/components/Hero.js
import React from "react";

export default function Hero() {
    const titleStyle = {
        color: '#000',
        fontFamily: 'Inter',
        fontSize: '70px',
        fontStyle: 'normal',
        fontWeight: '700',
        lineHeight: 'normal',
        marginBottom: '20px'
    };

    // 반응형 스타일
    const responsiveStyle = `
        @media (max-width: 768px) {
            .hero-title {
                font-size: 40px !important;
            }
        }
        @media (max-width: 480px) {
            .hero-title {
                font-size: 32px !important;
            }
        }
    `;

    return (
        <>
            <style>{responsiveStyle}</style>
            <section className="hero" style={{
                background: '#ffffff',
                padding: '20px 0 30px',
                margin: 0,
                border: 'none'
            }}>
                <div className="container heroWrap">
                    <div>
                        <div className="hero-title" style={titleStyle}>
                            침수 위험을 3D로 이해하고,<br />
                            더 빨리 대응합니다.
                        </div>
                    </div>

                    {/* 우측 설명 카드 */}
                    <div style={{
                        textAlign: 'right',
                        padding: '20px'
                    }}>
                        <div style={{
                            fontSize: '20px',
                            fontWeight: '700',
                            color: '#000000',
                            marginBottom: '16px'
                        }}>
                            한전 KDN 3DGS 기반 침수취약 지역 솔루션
                        </div>
                        <div style={{
                            fontSize: '16px',
                            color: '#000000',
                            lineHeight: '140%',
                            textAlign: 'right'
                        }}>
                            <span>3D 시각화 기술인 Gaussian Splatting과 웹 기반 뷰어를 활용하여,<br /></span>
                            <span style={{ letterSpacing: '0.02em' }}>저지대 하천 인접 지역에서 발생할 수 있는 침수 위험을<br /></span>
                            <span>누구나 쉽게 이해할 수 있도록 직관적으로 시각화합니다.</span>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
