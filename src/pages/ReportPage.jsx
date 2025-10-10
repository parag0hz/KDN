import { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

export default function ReportPage() {
    const [items, setItems] = useState([]);
    const [isLoadingItems, setIsLoadingItems] = useState(true);
    const [form, setForm] = useState({
        type: "",
        message: "",
        address: "",
        lat: "",
        lng: "",
        files: []
    });
    const [addressSuggestions, setAddressSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const autocompleteService = useRef(null);
    const geocoderService = useRef(null);

    // Google Places API 초기화 및 동적 로딩
    useEffect(() => {
        const loadGoogleMapsScript = () => {
            return new Promise((resolve, reject) => {
                // 이미 로드되어 있는지 확인
                if (window.google && window.google.maps && window.google.maps.places) {
                    resolve();
                    return;
                }

                const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY_HERE';

                // 기존 스크립트 존재 시 재사용
                const existingScript = document.querySelector('#google-maps-script');
                if (existingScript) {
                    existingScript.addEventListener('load', resolve, { once: true });
                    existingScript.addEventListener('error', reject, { once: true });
                    return;
                }

                const script = document.createElement('script');
                script.id = 'google-maps-script';
                script.type = 'text/javascript';
                script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,visualization`;

                script.onload = () => {
                    console.log('Google Maps API 스크립트 로드됨 (ReportPage)');
                    resolve();
                };
                script.onerror = () => {
                    reject(new Error('Google Maps API 스크립트 로드 실패'));
                };

                document.head.appendChild(script);
            });
        };

        const initializeGoogleServices = () => {
            loadGoogleMapsScript()
                .then(() => {
                    if (window.google && window.google.maps && window.google.maps.places) {
                        autocompleteService.current = new window.google.maps.places.AutocompleteService();
                        geocoderService.current = new window.google.maps.Geocoder();
                        console.log('Google Places API 서비스 초기화 완료');
                    } else {
                        console.error('Google Maps API는 로드되었지만 Places API를 찾을 수 없습니다');
                    }
                })
                .catch((error) => {
                    console.error('Google Maps API 로드 실패:', error);
                });
        };

        initializeGoogleServices();
    }, []);

    // 제보 목록 가져오기
    const fetchReports = async () => {
        try {
            setIsLoadingItems(true);
            const response = await fetch('https://api.3dgs.scorve.kr/upload/list');

            if (response.ok) {
                const data = await response.json();
                console.log('제보 목록 가져오기 성공:', data);

                // API 응답의 items 배열을 사용하고, 최신순으로 정렬
                const sortedItems = data.items ? data.items.sort((a, b) =>
                    new Date(b.createdAt) - new Date(a.createdAt)
                ) : [];

                setItems(sortedItems);
            } else {
                console.error('제보 목록 가져오기 실패:', response.status);
                setItems([]);
            }
        } catch (error) {
            console.error('제보 목록 가져오기 오류:', error);
            setItems([]);
        } finally {
            setIsLoadingItems(false);
        }
    };

    // 컴포넌트 마운트 시 제보 목록 가져오기
    useEffect(() => {
        fetchReports();
    }, []);

    // Google Places Autocomplete를 사용한 실시간 주소 검색
    const searchAddress = async (query) => {
        if (!query || query.length < 2) {
            setAddressSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        if (!autocompleteService.current) {
            console.warn('Google Places API가 아직 준비되지 않았습니다. 잠시 후 다시 시도하세요.');
            setTimeout(() => searchAddress(query), 1000);
            return;
        }

        try {
            const request = {
                input: query,
                componentRestrictions: { country: 'kr' },
                types: ['address'],
                language: 'ko'
            };

            autocompleteService.current.getPlacePredictions(request, (predictions, status) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
                    const suggestions = predictions.slice(0, 5).map(prediction => ({
                        address_name: prediction.description,
                        place_id: prediction.place_id,
                        structured_formatting: prediction.structured_formatting
                    }));
                    setAddressSuggestions(suggestions);
                    setShowSuggestions(true);
                } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                    console.log('검색 결과가 없습니다:', query);
                    setAddressSuggestions([]);
                    setShowSuggestions(false);
                } else {
                    console.warn('Places API 오류:', status);
                    setAddressSuggestions([]);
                    setShowSuggestions(false);
                }
            });
        } catch (error) {
            console.error('주소 검색 중 오류:', error);
            setAddressSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const handleAddressChange = (e) => {
        const address = e.target.value;
        setForm(f => ({ ...f, address }));
        searchAddress(address);
    };

    // Google Geocoding을 사용해 주소를 좌표로 변환
    const getCoordinatesFromAddress = async (placeId, address) => {
        if (!geocoderService.current) {
            console.warn('Geocoder 서비스가 준비되지 않았습니다');
            return null;
        }

        return new Promise((resolve, reject) => {
            if (placeId) {
                geocoderService.current.geocode({ placeId: placeId }, (results, status) => {
                    if (status === 'OK' && results[0]) {
                        const location = results[0].geometry.location;
                        resolve({
                            lat: location.lat().toString(),
                            lng: location.lng().toString(),
                            formatted_address: results[0].formatted_address
                        });
                    } else {
                        reject(new Error(`Geocoding 실패: ${status}`));
                    }
                });
            } else {
                geocoderService.current.geocode({ address: address }, (results, status) => {
                    if (status === 'OK' && results[0]) {
                        const location = results[0].geometry.location;
                        resolve({
                            lat: location.lat().toString(),
                            lng: location.lng().toString(),
                            formatted_address: results[0].formatted_address
                        });
                    } else {
                        reject(new Error(`Geocoding 실패: ${status}`));
                    }
                });
            }
        });
    };

    const selectAddress = async (suggestion) => {
        try {
            setIsLoadingLocation(true);
            const coordinates = await getCoordinatesFromAddress(
                suggestion.place_id,
                suggestion.address_name
            );

            setForm(f => ({
                ...f,
                address: coordinates?.formatted_address || suggestion.address_name,
                lat: coordinates?.lat || '',
                lng: coordinates?.lng || ''
            }));
        } catch (error) {
            console.error('좌표 변환 오류:', error);
            setForm(f => ({
                ...f,
                address: suggestion.address_name,
                lat: '',
                lng: ''
            }));
        } finally {
            setIsLoadingLocation(false);
            setShowSuggestions(false);
            setAddressSuggestions([]);
        }
    };

    // 현재 위치 가져오기 (GPS)
    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert('이 브라우저는 위치 서비스를 지원하지 않습니다.');
            return;
        }

        if (!geocoderService.current) {
            alert('Google Maps API가 아직 준비되지 않았습니다. 잠시 후 다시 시도하세요.');
            return;
        }

        setIsLoadingLocation(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude.toString();
                const lng = position.coords.longitude.toString();

                try {
                    const result = await new Promise((resolve, reject) => {
                        geocoderService.current.geocode(
                            {
                                location: {
                                    lat: parseFloat(lat),
                                    lng: parseFloat(lng)
                                }
                            },
                            (results, status) => {
                                if (status === 'OK' && results[0]) {
                                    resolve(results[0].formatted_address);
                                } else {
                                    reject(new Error(`역지오코딩 실패: ${status}`));
                                }
                            }
                        );
                    });

                    setForm(f => ({
                        ...f,
                        address: result,
                        lat: lat,
                        lng: lng
                    }));
                } catch (error) {
                    console.error('역지오코딩 오류:', error);
                    setForm(f => ({
                        ...f,
                        address: `현재 위치 (${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)})`,
                        lat: lat,
                        lng: lng
                    }));
                }
                setIsLoadingLocation(false);
            },
            (error) => {
                console.error('위치 가져오기 오류:', error);
                let errorMessage = '위치를 가져올 수 없습니다.';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = '위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = '위치 정보를 사용할 수 없습니다.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = '위치 요청 시간이 초과되었습니다.';
                        break;
                }
                alert(errorMessage);
                setIsLoadingLocation(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000
            }
        );
    };

    const submit = async (e) => {
        e.preventDefault();

        try {
            // 필수 필드 검증
            if (!form.type.trim()) {
                alert("유형을 입력해주세요.");
                return;
            }
            if (!form.address.trim()) {
                alert("주소를 입력해주세요.");
                return;
            }

            // FormData로 요청 데이터 준비 (Postman 스크린샷 기준)
            const formData = new FormData();

            formData.append('type', form.type.trim());
            formData.append('address', form.address.trim());

            if (form.lat) {
                formData.append('latitude', parseFloat(form.lat).toString());
            }
            if (form.lng) {
                formData.append('longitude', parseFloat(form.lng).toString());
            }

            // 파일 첨부
            if (form.files && form.files.length > 0) {
                form.files.forEach((file, index) => {
                    formData.append('file', file);
                });
            }

            console.log('API 요청 데이터 (FormData):');
            for (let [key, value] of formData.entries()) {
                console.log(key, value);
            }

            const response = await fetch('https://api.3dgs.scorve.kr/upload', {
                method: 'POST',
                body: formData // FormData 사용시 Content-Type 헤더 자동 설정
            });

            console.log('API 응답 상태:', response.status);
            console.log('API 응답 헤더:', Object.fromEntries(response.headers));

            // 응답 내용 확인
            const responseText = await response.text();
            console.log('API 응답 내용:', responseText);

            if (response.ok) {
                // 성공 시 제보 목록 새로고침
                await fetchReports();
                setForm({ type: "", message: "", address: "", lat: "", lng: "", files: [] });
                alert("제보가 성공적으로 저장되었습니다.");
            } else {
                // 에러 응답도 파싱해서 표시
                let errorMessage = `서버 오류 (${response.status})`;
                try {
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.message || errorData.error || errorMessage;
                } catch (e) {
                    // JSON 파싱 실패 시 원본 텍스트 사용
                    if (responseText) {
                        errorMessage += `: ${responseText}`;
                    }
                }
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('제보 저장 중 오류:', error);

            // 오류 발생 시에도 목록 새로고침 시도
            try {
                await fetchReports();
            } catch (fetchError) {
                console.error('목록 새로고침 실패:', fetchError);
            }

            setForm({ type: "", message: "", address: "", lat: "", lng: "", files: [] });
            alert(`서버 연결 오류: ${error.message}\n목록을 새로고침했습니다.`);
        }
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
                        padding: 180px 20px 20px 20px;
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
                        margin-bottom: 80px;
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
                        margin-top: 50px;
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
                        max-height: 400px;
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
                            max-height: 350px;
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
                        .reports-list {
                            max-height: 300px;
                        }
                    }
                `}
            </style>

            {/* 메인 컨테이너 */}
            <div className="report-container">

                {/* 제보 내역이 없을 때만 표시 */}
                {items.length === 0 && (
                    <>
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
                    </>
                )}

                {/* 제보 목록 */}
                {items.length > 0 && (
                    <div className="reports-list">
                        <h3 style={{
                            margin: "8px 0",
                            color: '#3676e1',
                            fontSize: '18px'
                        }}>
                            최근 제보 {isLoadingItems && <span style={{ fontSize: '14px', color: '#666' }}>(로딩 중...)</span>}
                        </h3>
                        <div style={{ display: "grid", gap: 10 }}>
                            {items.map(item => (
                                <div key={item.id} style={{
                                    background: "rgba(123, 171, 251, 0.3)",
                                    border: "1px solid #e9ecef",
                                    borderRadius: 12,
                                    padding: 12
                                }}>
                                    <strong style={{ color: '#000' }}>
                                        {item.type}
                                    </strong>
                                    {item.address && (
                                        <div style={{ fontSize: 12, color: "#6c757d", marginTop: 6 }}>
                                            📍 {item.address}
                                        </div>
                                    )}
                                    {(item.latitude && item.longitude) && (
                                        <div style={{ fontSize: 10, color: "#adb5bd", marginTop: 3 }}>
                                            좌표: {parseFloat(item.latitude).toFixed(6)}, {parseFloat(item.longitude).toFixed(6)}
                                        </div>
                                    )}
                                    {item.url && (
                                        <div style={{ marginTop: 6 }}>
                                            <img
                                                src={item.url}
                                                alt="제보 이미지"
                                                style={{
                                                    maxWidth: '200px',
                                                    maxHeight: '150px',
                                                    borderRadius: '4px',
                                                    objectFit: 'cover'
                                                }}
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                }}
                                            />
                                        </div>
                                    )}
                                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                                        <span style={{ fontSize: 12, color: "#6c757d" }}>
                                            {new Date(item.createdAt).toLocaleString('ko-KR')}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 로딩 중일 때 표시 */}
                {isLoadingItems && items.length === 0 && (
                    <div style={{
                        textAlign: 'center',
                        padding: '20px',
                        color: '#666',
                        fontSize: '14px'
                    }}>
                        제보 목록을 불러오는 중...
                    </div>
                )}

                {/* 제보 폼 */}
                <form onSubmit={submit} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                    <div className="report-form-container">

                        {/* 첫 번째 행: 유형, 주소, 위도/경도, 파일첨부 */}
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
                                <div className="form-label">
                                    주소
                                    <button
                                        type="button"
                                        onClick={getCurrentLocation}
                                        disabled={isLoadingLocation}
                                        style={{
                                            background: '#4285f4',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '2px 6px',
                                            fontSize: '10px',
                                            cursor: isLoadingLocation ? 'not-allowed' : 'pointer',
                                            marginLeft: '8px'
                                        }}
                                    >
                                        {isLoadingLocation ? '📍...' : '📍 현재위치'}
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    value={form.address}
                                    onChange={handleAddressChange}
                                    className="form-input"
                                    placeholder="예: 서울시 강남구 테헤란로 (또는 현재위치 버튼 클릭)"
                                    disabled={isLoadingLocation}
                                />
                                {showSuggestions && addressSuggestions.length > 0 && (
                                    <div className="address-suggestions">
                                        {addressSuggestions.map((suggestion, index) => (
                                            <div
                                                key={index}
                                                className="address-suggestion"
                                                onClick={() => selectAddress(suggestion)}
                                            >
                                                <div style={{ fontWeight: 'bold', fontSize: '12px' }}>
                                                    {suggestion.structured_formatting?.main_text || suggestion.address_name}
                                                </div>
                                                {suggestion.structured_formatting?.secondary_text && (
                                                    <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                                                        {suggestion.structured_formatting.secondary_text}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="form-field">
                                <div className="form-label">
                                    위도/경도
                                    {isLoadingLocation && (
                                        <span style={{ color: '#4285f4', fontSize: '10px', marginLeft: '8px' }}>
                                            변환 중...
                                        </span>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    value={form.lat && form.lng ? `${parseFloat(form.lat).toFixed(6)}, ${parseFloat(form.lng).toFixed(6)}` : ''}
                                    readOnly
                                    className="form-input"
                                    style={{
                                        backgroundColor: '#f8f9fa',
                                        color: '#6c757d',
                                        cursor: 'not-allowed'
                                    }}
                                    placeholder="주소 선택 시 자동 입력"
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

            </div>
        </div>
    );
}