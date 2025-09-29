import { useState, useRef } from "react";
import Viewer3D from "../components/Viewer3D";

export default function Viewer3DPage() {
    const [dragOver, setDragOver] = useState(false);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isFlipped, setIsFlipped] = useState(false);
    const [loadError, setLoadError] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileSelect = (event) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            const file = files[0];
            loadFile(file);
        }
    };

    const loadFile = async (file) => {
        const fileName = file.name.toLowerCase();

        // 지원되는 파일 형식 확인
        if (fileName.endsWith('.ksplat') || fileName.endsWith('.splat') || fileName.endsWith('.ply')) {
            setIsLoading(true);
            setLoadError(null);

            try {
                // 파일 정보 저장
                setUploadedFile({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    file: file, // 실제 File 객체 저장
                    lastModified: file.lastModified
                });

                console.log('3D 파일 선택됨:', file.name);

                // 로딩은 Viewer3D 컴포넌트에서 처리
                setIsLoading(false);

            } catch (error) {
                console.error('파일 로드 실패:', error);
                setLoadError('파일을 불러오는 중 오류가 발생했습니다.');
                setIsLoading(false);
            }
        } else {
            setLoadError('지원되지 않는 파일 형식입니다. .ksplat, .splat, .ply 파일만 업로드 가능합니다.');
        }
    };

    const handleNewFile = () => {
        setUploadedFile(null);
        setIsLoading(false);
        setLoadError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleLoadComplete = () => {
        console.log('3D 모델 로드 완료');
    };

    const handleLoadError = (error) => {
        console.error('3D 모델 로드 에러:', error);
        setLoadError(error);
    };

    const handleDragOver = (event) => {
        event.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = (event) => {
        event.preventDefault();
        setDragOver(false);
    };

    const handleDrop = (event) => {
        event.preventDefault();
        setDragOver(false);

        const files = event.dataTransfer.files;
        if (files && files.length > 0) {
            loadFile(files[0]);
        }
    };

    // 파일 크기를 읽기 쉬운 형태로 변환
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="viewer3d-container">
            {/* 3D 뷰어 영역 */}
            <div className="viewer3d-main">
                {!uploadedFile ? (
                    /* 업로드 대기 상태 */
                    <div className="upload-placeholder">
                        <div className="upload-content">
                            {/* 업로드 아이콘 */}
                            <div className="upload-icon-container">
                                <img
                                    src="/img/upload-icon.svg"
                                    alt="Upload Icon"
                                    className="upload-icon"
                                />
                            </div>

                            {/* 메인 텍스트 */}
                            <h1 className="main-title">3D 장면을 통해 침수 상황을 확인하세요.</h1>

                            {/* 서브 텍스트 */}
                            <p className="sub-title">.ksplat / .splat / .ply 파일을 업로드 하세요.</p>

                            {/* 파일 업로드 버튼 */}
                            <div className="upload-button-container">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    id="file-input"
                                    accept=".ksplat,.splat,.ply"
                                    onChange={handleFileSelect}
                                    style={{ display: 'none' }}
                                />
                                <label htmlFor="file-input" className="upload-button">
                                    파일 선택
                                </label>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* 3D 뷰어 영역 */
                    <div className="viewer-area">
                        <div className="viewer-container">
                            <Viewer3D
                                file={uploadedFile?.file}
                                isFlipped={isFlipped}
                                onLoadComplete={handleLoadComplete}
                                onError={handleLoadError}
                            />
                        </div>
                    </div>
                )}

                {/* 에러 메시지 */}
                {loadError && (
                    <div className="error-panel">
                        <div className="error-content">
                            <h4>⚠️ 로드 오류</h4>
                            <p>{loadError}</p>
                            <button className="error-btn" onClick={() => setLoadError(null)}>
                                닫기
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* 드래그 앤 드롭 오버레이 */}
            <div
                className={`drag-drop-overlay ${dragOver ? 'active' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {dragOver && (
                    <div className="drag-message">
                        <img src="/img/upload-icon.svg" alt="Upload" className="drag-icon" />
                        <p>파일을 여기에 놓으세요</p>
                    </div>
                )}
            </div>

            {/* 스타일 정의 */}
            <style jsx>{`
                .viewer3d-container {
                    background: #ffffff;
                    min-height: 100vh;
                    position: relative;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }

                .viewer3d-main {
                    flex: 1;
                    display: flex;
                    position: relative;
                    min-height: 100vh;
                }

                /* 업로드 대기 상태 */
                .upload-placeholder {
                    background: #f3f8ff;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 60px 20px;
                }

                .upload-content {
                    text-align: center;
                }

                .upload-icon-container {
                    margin-bottom: 24px;
                }

                .upload-icon {
                    width: 69px;
                    height: 63px;
                    object-fit: contain;
                }

                .main-title {
                    color: #2563ca;
                    text-align: center;
                    font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                    font-size: 24px;
                    font-weight: 500;
                    margin: 0 0 12px 0;
                    line-height: 1.3;
                }

                .sub-title {
                    color: #2563ca;
                    text-align: center;
                    font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                    font-size: 15px;
                    font-weight: 300;
                    margin: 0 0 48px 0;
                    line-height: 1.4;
                }

                .upload-button-container {
                    display: flex;
                    justify-content: center;
                }

                .upload-button {
                    background: #ffffff;
                    border-radius: 28px;
                    width: 113px;
                    height: 48px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #2563ca;
                    font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                    font-size: 18px;
                    font-weight: 700;
                    cursor: pointer;
                    box-shadow: -1px 2px 9.8px 0px rgba(208, 223, 249, 1);
                    transition: all 0.2s ease;
                    text-decoration: none;
                    border: none;
                }

                .upload-button:hover {
                    transform: translateY(-2px);
                    box-shadow: -1px 4px 15px 0px rgba(208, 223, 249, 0.8);
                    background: #f8faff;
                }

                /* 뷰어 영역 */
                .viewer-area {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    background: #f3f8ff; /* 동일한 연한 파란색 배경 */
                    position: relative;
                    min-height: 100vh;
                    align-items: center;
                    justify-content: center;
                    padding: 60px 20px;
                }

                .viewer-container {
                    width: 100%;
                    max-width: 1600px;
                    height: 800px;
                    min-height: 500px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    background: transparent; /* 투명 배경으로 변경 */
                    box-shadow: 0 8px 32px rgba(37, 99, 202, 0.1);
                    overflow: hidden;
                }

                /* 에러 패널 */
                .error-panel {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(220, 38, 38, 0.95);
                    backdrop-filter: blur(10px);
                    border-radius: 12px;
                    padding: 24px;
                    color: white;
                    border: 2px solid rgba(255, 255, 255, 0.2);
                    max-width: 400px;
                    text-align: center;
                    z-index: 25;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                }

                .error-content h4 {
                    margin: 0 0 12px 0;
                    font-size: 18px;
                    font-weight: 600;
                }

                .error-content p {
                    margin: 0 0 16px 0;
                    font-size: 14px;
                    line-height: 1.5;
                }

                .error-btn {
                    background: rgba(255, 255, 255, 0.2);
                    color: white;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 13px;
                    transition: all 0.2s ease;
                }

                .error-btn:hover {
                    background: rgba(255, 255, 255, 0.3);
                }

                /* 드래그 앤 드롭 */
                .drag-drop-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(37, 99, 202, 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s ease;
                    z-index: 1000;
                }

                .drag-drop-overlay.active {
                    opacity: 1;
                    visibility: visible;
                    background: rgba(37, 99, 202, 0.15);
                }

                .drag-message {
                    background: white;
                    padding: 40px;
                    border-radius: 20px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                    text-align: center;
                    border: 2px dashed #2563ca;
                }

                .drag-icon {
                    width: 48px;
                    height: 44px;
                    margin-bottom: 16px;
                }

                .drag-message p {
                    color: #2563ca;
                    font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                    font-size: 18px;
                    font-weight: 600;
                    margin: 0;
                }

                /* 반응형 디자인 */
                @media (max-width: 768px) {
                    .upload-content {
                        padding: 40px 20px;
                    }

                    .upload-icon {
                        width: 50px;
                        height: 46px;
                    }

                    .main-title {
                        font-size: 20px;
                        margin-bottom: 16px;
                    }

                    .sub-title {
                        font-size: 14px;
                        margin-bottom: 36px;
                    }

                    .upload-button {
                        width: 100px;
                        height: 44px;
                        font-size: 16px;
                    }

                    .viewer-area {
                        padding: 20px;
                    }

                    .viewer-container {
                        height: 60vh;
                        min-height: 400px;
                        max-width: 100%;
                    }

                    .control-group {
                        flex-wrap: wrap;
                        justify-content: center;
                    }

                    .control-btn {
                        padding: 8px 12px;
                        font-size: 12px;
                    }

                    .error-panel {
                        margin: 20px;
                        max-width: calc(100% - 40px);
                    }
                }

                @media (max-width: 480px) {
                    .main-title {
                        font-size: 18px;
                        line-height: 1.4;
                    }

                    .sub-title {
                        font-size: 13px;
                    }

                    .upload-button {
                        width: 90px;
                        height: 40px;
                        font-size: 15px;
                        border-radius: 20px;
                    }

                    .viewer-area {
                        padding: 15px;
                    }

                    .viewer-container {
                        height: 50vh;
                        min-height: 350px;
                    }
                }
            `}</style>
        </div>
    );
}
