// src/components/Footer.js
import React from "react";

export default function Footer() {
    return (
        <footer id="contact">
            <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div>© {new Date().getFullYear()} 3DGS Flood</div>
                <div style={{ display: "flex", gap: 14 }}>
                    <a href="mailto:contact@example.com">이메일</a>
                    <a href="https://github.com/">GitHub</a>
                </div>
            </div>
        </footer>
    );
}
