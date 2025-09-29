import Hero from "../components/Hero";
import FeatureTiles from "../components/FeatureTiles";
import Viewer3D from "../components/Viewer3D";
import FileUpload from "../components/FileUpload";
import { useState } from "react";

export default function MainPage() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileName, setFileName] = useState("");
    const [isFlipped, setIsFlipped] = useState(false);
    const [error, setError] = useState("");

    const handleFileSelect = (file) => {
        setSelectedFile(file);
        setFileName(file.name);
        setError("");
    };

    const handleLoadComplete = () => {
        console.log("파일 로딩 완료");
    };

    const handleError = (errorMessage) => {
        setError(errorMessage);
        console.error("로딩 에러:", errorMessage);
    };

    // 반응형 스타일
    const responsiveStyles = `
        .viewer-3d {
            width: 100%;
            max-width: 1582px;
            height: 890px;
        }
        @media (max-width: 768px) {
            .container {
                padding: 0 20px !important;
            }
            .demo-header {
                flex-direction: column !important;
                gap: 20px !important;
                align-items: flex-start !important;
            }
            .demo-upload {
                min-width: auto !important;
                width: 100% !important;
            }
            .viewer-container {
                padding: 20px !important;
            }
            .viewer-3d {
                width: 100% !important;
                max-width: 100% !important;
                height: 400px !important;
            }
        }
        @media (max-width: 480px) {
            .container {
                padding: 0 16px !important;
            }
            .demo-header h2 {
                font-size: 24px !important;
            }
            .demo-header p {
                font-size: 16px !important;
            }
            .features-title {
                font-size: 24px !important;
            }
            .viewer-3d {
                height: 300px !important;
            }
        }
    `;

    const section = { padding: "56px 0" };
    const container = { width: "100%", margin: "0", padding: "0 40px" };

    return (
        <>
            <style>{responsiveStyles}</style>
            <main style={{ margin: 0, padding: 0 }}>
                <section style={{ padding: "0", margin: 0, border: "none" }}>
                    <div style={container}><Hero /></div>
                </section>

                {/* 데모 동영상 섹션 */}
                <section style={{
                    background: '#003A86',
                    padding: '60px 0',
                    position: 'relative',
                    margin: 0,
                    border: "none"
                }}>
                    {/* 위에서 아래로 선형 그라디언트 */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(180deg, #FFF 0%, rgba(255, 255, 255, 0.00) 87.98%)',
                        pointerEvents: 'none'
                    }}></div>

                    {/* 아래에서 위로 선형 그라디언트 */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(0deg, #FFF 0%, rgba(255, 255, 255, 0.00) 87.98%)',
                        pointerEvents: 'none'
                    }}></div>

                    <div style={{ ...container, position: 'relative', zIndex: 1 }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            minHeight: '500px'
                        }}>
                            <video
                                autoPlay
                                loop
                                muted
                                playsInline
                                controls
                                onError={(e) => console.error('Video error:', e)}
                                onLoadStart={() => console.log('Video loading started')}
                                onCanPlay={() => console.log('Video can play')}
                                style={{
                                    width: '100%',
                                    maxWidth: '800px',
                                    height: 'auto',
                                    borderRadius: '16px',
                                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
                                }}
                            >
                                <source src="/img/bicycle (2).mp4" type="video/mp4" />
                                <source src="/img/garden.mp4" type="video/mp4" />
                                <source src="/img/stump.mp4" type="video/mp4" />
                                {/* 동영상 파일이 없을 경우 플레이스홀더 */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '300px',
                                    background: '#f0f0f0',
                                    borderRadius: '16px',
                                    fontSize: '18px',
                                    color: '#666'
                                }}>
                                    동영상을 로드할 수 없습니다. 브라우저가 지원하지 않거나 파일을 찾을 수 없습니다.
                                </div>
                            </video>
                        </div>
                    </div>
                </section>

                <section id="demo" style={{
                    ...section,
                    background: 'linear-gradient(0deg, rgba(255, 255, 255, 0.00) 0%, #FFF 87.98%)',
                    margin: 0,
                    border: "none"
                }}>
                    <div style={container} className="container">
                        {/* 헤더와 파일 업로드를 같은 줄에 배치 */}
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: "40px",
                            gap: "40px"
                        }} className="demo-header">
                            {/* 데모 체험 제목 부분 */}
                            <div>
                                <h2 style={{ fontSize: '30px', fontWeight: '700', color: '#000000', margin: '0 0 8px' }}>데모 체험</h2>
                                <p style={{ fontSize: '20px', fontWeight: '500', color: '#000000', margin: '4px 0 0' }}>.ksplat / .splat / .ply 파일 업로드를 통해 3D 확인</p>
                            </div>

                            {/* 파일 업로드 부분 */}
                            <div style={{ minWidth: "320px" }} className="demo-upload">
                                <FileUpload onFileSelect={handleFileSelect} fileName={fileName} />

                                {/* 에러 메시지 */}
                                {error && (
                                    <div style={{
                                        marginTop: "12px",
                                        padding: "8px 12px",
                                        background: "#fee2e2",
                                        border: "1px solid #fecaca",
                                        borderRadius: "8px",
                                        color: "#dc2626",
                                        fontSize: "14px"
                                    }}>
                                        {error}
                                    </div>
                                )}

                                {/* Y축 반전 토글 버튼 */}
                                {fileName && (
                                    <div style={{ marginTop: "16px" }}>
                                        <button
                                            onClick={() => {
                                                console.log("상하 반전 버튼 클릭:", { 현재상태: isFlipped, 새상태: !isFlipped });
                                                setIsFlipped(!isFlipped);
                                            }}
                                            style={{
                                                background: isFlipped ? "#4f46e5" : "#374151",
                                                color: "white",
                                                border: "none",
                                                padding: "8px 16px",
                                                borderRadius: "8px",
                                                fontSize: "14px",
                                                cursor: "pointer",
                                                transition: "background 0.2s",
                                                fontWeight: "500"
                                            }}
                                        >
                                            {isFlipped ? "원래 방향" : "상하 반전"}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 3D 뷰어 영역 */}
                        <div style={{
                            display: "flex",
                            justifyContent: "center",
                            padding: "40px",
                            background: "#f8fafc",
                            borderRadius: "22px",
                            border: "1px solid #e2e8f0"
                        }} className="viewer-container">
                            <div className="viewer-3d">
                                <Viewer3D
                                    file={selectedFile}
                                    isFlipped={isFlipped}
                                    onLoadComplete={handleLoadComplete}
                                    onError={handleError}
                                />
                            </div>
                        </div>
                    </div>
                </section>

                <section id="features" style={{
                    ...section,
                    background: "linear-gradient(0deg, rgba(255, 255, 255, 0.00) 0%, #FFF 87.98%)",
                    padding: "80px 0",
                    margin: 0,
                    border: "none"
                }}>
                    <div style={container}>
                        <div style={{
                            textAlign: 'center',
                            marginBottom: '60px'
                        }}>
                            <h2 style={{
                                fontSize: '30px',
                                fontWeight: '700',
                                color: '#000000',
                                margin: '0 0 16px 0'
                            }}>
                                핵심 기능
                            </h2>
                            <p style={{
                                fontSize: '18px',
                                color: '#666666',
                                margin: '0',
                                fontWeight: '400'
                            }}>
                                3D 시각화와 침수 위험 분석을 위한 전문 기능들
                            </p>
                        </div>
                        <FeatureTiles />
                    </div>
                </section>
            </main>
        </>
    );
}
