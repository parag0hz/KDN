// src/components/FileUpload.js
import React, { useState } from "react";

export default function FileUpload({ onFileSelect, fileName }) {
    const [dragOver, setDragOver] = useState(false);

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            onFileSelect(file);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            onFileSelect(file);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = () => {
        setDragOver(false);
    };

    return (
        <div style={{
            background: "#f3f8ff",
            border: "2px dashed " + (dragOver ? "#2563ca" : "rgba(37, 99, 202, 0.3)"),
            borderRadius: "16px",
            padding: "24px",
            textAlign: "center",
            transition: "all 0.2s ease"
        }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
        >


            <label style={{
                display: "inline-block",
                background: "#ffffff",
                color: "#2563ca",
                padding: "12px 24px",
                borderRadius: "28px",
                cursor: "pointer",
                fontSize: "18px",
                fontWeight: "700",
                boxShadow: "-1px 2px 9.8px 0px rgba(208, 223, 249, 1)",
                border: "none",
                textAlign: "center",
                transition: "transform 0.2s ease"
            }}
                onMouseOver={(e) => e.target.style.transform = "translateY(-2px)"}
                onMouseOut={(e) => e.target.style.transform = "translateY(0)"}
            >
                파일 선택
                <img src="img/Layer_1.svg" alt="" style={{ marginLeft: "8px" }} />
                <input
                    type="file"
                    accept=".ksplat,.splat,.ply"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                />
            </label>

            <div style={{
                fontSize: "13px",
                color: "#64748b",
                marginTop: "12px",
                fontWeight: fileName ? "600" : "400"
            }}>
                {fileName ? `선택됨: ${fileName}` : "또는 파일을 여기에 드래그하세요"}
            </div>
        </div>
    );
}