import { useState } from "react";
import { v4 as uuidv4 } from "uuid";

export default function ReportPage() {
    const [items, setItems] = useState([]);
    const [form, setForm] = useState({
        type: "",
        heightCm: "",
        message: "",
        address: "",
        lat: "",
        lng: "",
        files: []
    });
    const [addressSuggestions, setAddressSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // 로컬 주소 검색 (백엔드 없이 프로토타입용)
    const searchAddress = async (query) => {
        if (!query || query.length < 2) {
            setAddressSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        // 한국 주요 지역 더미 데이터 (실제 좌표)
        const koreaAddresses = [
            { name: "서울특별시 강남구 테헤란로 152", lat: "37.5012", lng: "127.0396" },
            { name: "서울특별시 종로구 세종대로 172", lat: "37.5663", lng: "126.9779" },
            { name: "서울특별시 중구 명동2가", lat: "37.5636", lng: "126.9834" },
            { name: "서울특별시 강서구 화곡동", lat: "37.5411", lng: "126.8441" },
            { name: "서울특별시 송파구 잠실동 40", lat: "37.5133", lng: "127.1000" },
            { name: "서울특별시 마포구 홍대입구역", lat: "37.5563", lng: "126.9236" },
            { name: "서울특별시 영등포구 여의도동", lat: "37.5219", lng: "126.9245" },
            { name: "서울특별시 서초구 강남역", lat: "37.4979", lng: "127.0276" },

            { name: "부산광역시 해운대구 해운대해변로", lat: "35.1588", lng: "129.1603" },
            { name: "부산광역시 중구 중앙대로 26", lat: "35.1040", lng: "129.0359" },
            { name: "부산광역시 서면 부산진구", lat: "35.1579", lng: "129.0588" },

            { name: "대구광역시 중구 동성로2가", lat: "35.8722", lng: "128.5966" },
            { name: "대구광역시 수성구 범어동", lat: "35.8581", lng: "128.6293" },

            { name: "인천광역시 중구 연안부두로 54", lat: "37.4759", lng: "126.6157" },
            { name: "인천광역시 남동구 구월동", lat: "37.4449", lng: "126.7317" },

            { name: "광주광역시 동구 금남로5가", lat: "35.1495", lng: "126.9204" },
            { name: "대전광역시 서구 둔산동", lat: "36.3504", lng: "127.3845" },
            { name: "울산광역시 남구 삼산동", lat: "35.5384", lng: "129.3114" },

            { name: "경기도 수원시 영통구 광교중앙로", lat: "37.2972", lng: "127.0473" },
            { name: "경기도 고양시 일산동구 중앙로", lat: "37.6583", lng: "126.7700" },
            { name: "경기도 성남시 분당구 정자일로", lat: "37.3595", lng: "127.1052" },
            { name: "경기도 안양시 만안구 안양로", lat: "37.3943", lng: "126.9568" },
            { name: "경기도 부천시 원미구", lat: "37.5058", lng: "126.7659" },
            { name: "경기도 용인시 기흥구", lat: "37.2635", lng: "127.2847" },

            { name: "강원도 춘천시 중앙로1가", lat: "37.8813", lng: "127.7298" },
            { name: "강원도 강릉시 교동", lat: "37.7519", lng: "128.8761" },

            { name: "충청북도 청주시 상당구", lat: "36.6424", lng: "127.4890" },
            { name: "충청남도 천안시 동남구", lat: "36.8151", lng: "127.1139" },

            { name: "전라북도 전주시 완산구", lat: "35.8242", lng: "127.1480" },
            { name: "전라남도 목포시 하당동", lat: "34.8118", lng: "126.3922" },

            { name: "경상북도 포항시 북구", lat: "36.0190", lng: "129.3435" },
            { name: "경상남도 창원시 의창구", lat: "35.2272", lng: "128.6811" },
            { name: "경상남도 부산 기장군", lat: "35.2448", lng: "129.2224" },

            { name: "제주특별자치도 제주시 연동", lat: "33.4890", lng: "126.4983" },
            { name: "제주특별자치도 서귀포시", lat: "33.2452", lng: "126.5653" }
        ];

        // 스마트 검색: 입력어와 매칭
        const filteredAddresses = koreaAddresses.filter(addr => {
            const queryLower = query.toLowerCase();
            const nameLower = addr.name.toLowerCase();

            // 완전 일치 또는 부분 일치
            return nameLower.includes(queryLower) ||
                queryLower.split(' ').some(word =>
                    word.length > 1 && nameLower.includes(word)
                );
        });

        // 검색 결과를 카카오 API 형식에 맞게 변환
        let suggestions = filteredAddresses.slice(0, 5).map(addr => ({
            address_name: addr.name,
            x: addr.lng,
            y: addr.lat
        }));

        // 검색 결과가 없으면 유사한 것들 추가
        if (suggestions.length === 0) {
            // 첫 글자로 시작하는 주소들 찾기
            const firstChar = query.charAt(0);
            const similarAddresses = koreaAddresses.filter(addr =>
                addr.name.startsWith(firstChar)
            ).slice(0, 3);

            if (similarAddresses.length > 0) {
                suggestions = similarAddresses.map(addr => ({
                    address_name: addr.name + " (유사 검색)",
                    x: addr.lng,
                    y: addr.lat
                }));
            } else {
                // 완전히 없으면 기본값
                suggestions = [{
                    address_name: `${query} (입력된 주소)`,
                    x: "127.0276",
                    y: "37.4979"
                }];
            }
        }

        // 약간의 지연으로 실제 API 느낌 연출
        setTimeout(() => {
            setAddressSuggestions(suggestions);
            setShowSuggestions(true);
        }, 200);
    };

    const handleAddressChange = (e) => {
        const address = e.target.value;
        setForm(f => ({ ...f, address }));
        searchAddress(address);
    };

    const selectAddress = (suggestion) => {
        setForm(f => ({
            ...f,
            address: suggestion.address_name,
            lat: suggestion.y,
            lng: suggestion.x
        }));
        setShowSuggestions(false);
        setAddressSuggestions([]);
    };

    const submit = (e) => {
        e.preventDefault();
        setItems(prev => [{
            id: uuidv4(),
            createdAt: new Date().toISOString(),
            ...form,
            heightCm: form.heightCm ? Number(form.heightCm) : undefined
        }, ...prev]);
        setForm({ type: "", heightCm: "", message: "", address: "", lat: "", lng: "", files: [] });
        alert("제보가 임시 저장되었습니다.");
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setForm(f => ({ ...f, files }));
    };

    return (
        <div style={{
            background: '#ffffff',
            minHeight: '100vh',
            padding: '0',
            margin: '0',
            fontFamily: 'Inter, sans-serif'
        }}>
            <style>
                {`
                    .report-container {
                        width: 100%;
                        max-width: 1920px;
                        min-height: calc(100vh - 120px);
                        background: #ffffff;
                        margin: 0 auto;
                        padding: 120px 20px 20px 20px;
                        box-sizing: border-box;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: flex-start;
                        gap: 30px;
                    }
                    
                    .report-icon {
                        width: 77.78px;
                        height: 51.99px;
                        flex-shrink: 0;
                    }
                    
                    .report-title {
                        color: #3676e1;
                        text-align: center;
                        font-family: Inter-Bold, sans-serif;
                        font-size: 24px;
                        font-weight: 700;
                        white-space: nowrap;
                        flex-shrink: 0;
                    }
                    
                    .report-description {
                        color: rgba(0, 0, 0, 0.5);
                        text-align: center;
                        font-family: Inter-Light, sans-serif;
                        font-size: 14px;
                        line-height: 140%;
                        font-weight: 300;
                        width: 500px;
                        max-width: 95%;
                        flex-shrink: 0;
                        word-break: keep-all;
                        overflow-wrap: break-word;
                    }
                    
                    .report-form-container {
                        background: #ffffff;
                        border-radius: 22px;
                        border: 1px solid #f3f8ff;
                        width: 100%;
                        max-width: 1010px;
                        min-height: 149px;
                        box-shadow: -1px 2px 18.3px -4px rgba(124, 124, 124, 0.5);
                        padding: 20px;
                        box-sizing: border-box;
                        position: relative;
                        flex-shrink: 0;
                    }
                    
                    .form-row {
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        gap: 15px;
                        margin-bottom: 20px;
                    }
                    
                    .form-field {
                        display: flex;
                        flex-direction: column;
                        position: relative;
                    }
                    
                    .address-suggestions {
                        position: absolute;
                        top: 100%;
                        left: 0;
                        right: 0;
                        background: white;
                        border: 1px solid #f2f2f2;
                        border-top: none;
                        border-radius: 0 0 4px 4px;
                        max-height: 200px;
                        overflow-y: auto;
                        z-index: 1000;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    }
                    
                    .address-suggestion {
                        padding: 8px 10px;
                        cursor: pointer;
                        font-size: 12px;
                        border-bottom: 1px solid #f8f9fa;
                    }
                    
                    .address-suggestion:hover {
                        background-color: #f8f9fa;
                    }
                    
                    .address-suggestion:last-child {
                        border-bottom: none;
                    }
                    
                    .form-label {
                        color: rgba(0, 0, 0, 0.2);
                        font-family: Inter-Light, sans-serif;
                        font-size: 12px;
                        font-weight: 300;
                        margin-bottom: 5px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    
                    .form-input {
                        background: #ffffff;
                        border-radius: 4px;
                        border: 1px solid #f2f2f2;
                        height: 35px;
                        padding: 0 10px;
                        font-size: 12px;
                        outline: none;
                    }
                    
                    .form-textarea {
                        width: 100%;
                        height: 60px;
                        background: transparent;
                        border: none;
                        resize: none;
                        outline: none;
                        font-size: 12px;
                        font-family: Inter-Light, sans-serif;
                        color: rgba(0, 0, 0, 0.6);
                        font-weight: 300;
                        line-height: 140%;
                        padding: 10px 0;
                        border-top: 1px solid #f2f2f2;
                        margin-top: 10px;
                    }
                    
                    .submit-button {
                        position: absolute;
                        right: 20px;
                        bottom: 20px;
                        background: #2563ca;
                        border-radius: 9px;
                        width: 35px;
                        height: 35px;
                        border: none;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    
                    .submit-icon {
                        width: 12.91px;
                        height: 12.91px;
                    }
                    
                    .reports-list {
                        width: 100%;
                        max-width: 1010px;
                        max-height: 200px;
                        overflow-y: auto;
                        padding: 0 20px;
                        box-sizing: border-box;
                        flex-shrink: 0;
                    }
                    
                    @media (max-width: 1200px) {
                        .report-container {
                            padding: 100px 15px 15px 15px;
                            gap: 25px;
                        }
                        .report-form-container {
                            max-width: 90%;
                        }
                        .form-row {
                            grid-template-columns: repeat(2, 1fr);
                            gap: 12px;
                        }
                        .report-description {
                            width: 450px;
                            font-size: 13px;
                        }
                    }
                    
                    @media (max-width: 768px) {
                        .report-container {
                            padding: 80px 10px 10px 10px;
                            gap: 20px;
                        }
                        .report-title {
                            font-size: 20px;
                        }
                        .report-description {
                            width: 350px;
                            font-size: 12px;
                        }
                        .report-form-container {
                            max-width: 95%;
                            padding: 15px;
                        }
                        .form-row {
                            grid-template-columns: 1fr;
                            gap: 10px;
                        }
                        .reports-list {
                            max-width: 95%;
                        }
                    }
                    
                    @media (max-width: 480px) {
                        .report-container {
                            padding: 70px 10px 10px 10px;
                            gap: 15px;
                        }
                        .report-description {
                            width: 280px;
                        }
                        .report-form-container {
                            padding: 12px;
                        }
                        .form-input {
                            height: 32px;
                            font-size: 11px;
                        }
                        .form-textarea {
                            height: 50px;
                            font-size: 11px;
                        }
                        .submit-button {
                            width: 32px;
                            height: 32px;
                        }
                    }
                `}
            </style>

            {/* 메인 컨테이너 */}
            <div className="report-container">

                {/* 아이콘 */}
                <img
                    src="/img/Layer_1_1.svg"
                    alt="Icon"
                    className="report-icon"
                />

                {/* 메인 타이틀 */}
                <div className="report-title">당신의 상황을 공유해주세요.</div>

                {/* 설명 텍스트 */}
                <div className="report-description">
                    하천 저지대의 위험지역 제보는 침수 예방 정책에 직접 반영됩니다.<br />
                    모든 제보는 사실에 근거하여 정확히 기록해 주시기 바랍니다.<br />
                    수집된 자료는 공공 안전 강화를 위해 활용됩니다.
                </div>

                {/* 제보 폼 */}
                <form onSubmit={submit} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                    <div className="report-form-container">

                        {/* 첫 번째 행: 유형, 주소, 파일첨부 */}
                        <div className="form-row">
                            <div className="form-field">
                                <div className="form-label">유형</div>
                                <input
                                    type="text"
                                    value={form.type}
                                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                                    className="form-input"
                                    placeholder="예: 침수, 통행불가, 배수구막힘"
                                />
                            </div>

                            <div className="form-field">
                                <div className="form-label">주소</div>
                                <input
                                    type="text"
                                    value={form.address}
                                    onChange={handleAddressChange}
                                    className="form-input"
                                    placeholder="예: 서울시 강남구 테헤란로"
                                />
                                {showSuggestions && addressSuggestions.length > 0 && (
                                    <div className="address-suggestions">
                                        {addressSuggestions.map((suggestion, index) => (
                                            <div
                                                key={index}
                                                className="address-suggestion"
                                                onClick={() => selectAddress(suggestion)}
                                            >
                                                {suggestion.address_name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="form-field">
                                <div className="form-label">위도/경도</div>
                                <input
                                    type="text"
                                    value={form.lat && form.lng ? `${form.lat}, ${form.lng}` : ''}
                                    readOnly
                                    className="form-input"
                                    style={{ backgroundColor: '#f8f9fa', color: '#6c757d' }}
                                    placeholder="주소 선택시 자동 입력"
                                />
                            </div>

                            <div className="form-field">
                                <div className="form-label">
                                    <img
                                        src="/img/Layer_1_3.svg"
                                        alt="File"
                                        style={{ width: '13px', height: '12px' }}
                                    />
                                    파일 첨부
                                </div>
                                <input
                                    type="file"
                                    multiple
                                    onChange={handleFileChange}
                                    className="form-input"
                                />
                            </div>
                        </div>

                        {/* 상세 설명 필드 */}
                        <textarea
                            value={form.message}
                            onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                            placeholder="상황을 구체적으로 서술해 주십시오.&#10;(예: 2025-09-28 14:30 / OO동 3길 12 앞 / 도로 20cm 침수 / 유속 느림 / 인명피해 없음)"
                            className="form-textarea"
                        />

                        {/* 제출 버튼 */}
                        <button type="submit" className="submit-button">
                            <img
                                src="/img/Layer_1_2.svg"
                                alt="Submit"
                                className="submit-icon"
                            />
                        </button>
                    </div>
                </form>

                {/* 제보 목록 */}
                {items.length > 0 && (
                    <div className="reports-list">
                        <h3 style={{
                            margin: "8px 0",
                            color: '#3676e1',
                            fontSize: '18px'
                        }}>최근 제보</h3>
                        <div style={{ display: "grid", gap: 10 }}>
                            {items.map(it => (
                                <div key={it.id} style={{
                                    background: "#f8f9fa",
                                    border: "1px solid #e9ecef",
                                    borderRadius: 12,
                                    padding: 12
                                }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                        <strong style={{ color: '#000' }}>
                                            {it.type}{typeof it.heightCm === "number" ? ` · ${it.heightCm}cm` : ""}
                                        </strong>
                                        <span style={{ fontSize: 12, color: "#6c757d" }}>
                                            {new Date(it.createdAt).toLocaleString()}
                                        </span>
                                    </div>
                                    {it.message && <div style={{ marginTop: 6, color: '#000' }}>{it.message}</div>}
                                    {it.address && (
                                        <div style={{ fontSize: 12, color: "#6c757d", marginTop: 6 }}>
                                            📍 {it.address}
                                        </div>
                                    )}
                                    {(it.lat && it.lng) && (
                                        <div style={{ fontSize: 10, color: "#adb5bd", marginTop: 3 }}>
                                            좌표: {it.lat}, {it.lng}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
