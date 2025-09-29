import { Link, useLocation } from "react-router-dom";
import { useState } from "react";

export default function NavBar() {
    const { pathname } = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // 반응형 CSS
    const responsiveStyles = `
        .navbar-menu {
            display: flex;
            gap: 112px;
        }
        .navbar-menu-mobile {
            display: none;
        }
        .hamburger {
            display: none;
        }
        
        @media (max-width: 768px) {
            .navbar-wrap {
                padding: 8px 20px !important;
            }
            .navbar-logo img {
                height: 80px !important;
            }
            .navbar-menu {
                display: none !important;
            }
            .navbar-menu-mobile {
                display: none !important;
            }
            .navbar-menu-mobile.open {
                display: flex !important;
                position: absolute !important;
                top: 100% !important;
                left: 0 !important;
                right: 0 !important;
                background: rgba(255,255,255,0.98) !important;
                backdrop-filter: blur(12px) !important;
                flex-direction: column !important;
                padding: 20px !important;
                gap: 20px !important;
                border-bottom: 1px solid rgba(0,0,0,0.1) !important;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1) !important;
                z-index: 1000 !important;
            }
            .hamburger {
                display: flex !important;
            }
        }
        @media (max-width: 480px) {
            .navbar-wrap {
                padding: 8px 16px !important;
            }
            .navbar-logo img {
                height: 60px !important;
            }
            .navbar-link {
                font-size: 18px !important;
            }
        }
        @media (max-width: 1024px) and (min-width: 769px) {
            .navbar-menu {
                gap: 60px !important;
            }
        }
        @media (max-width: 920px) and (min-width: 769px) {
            .navbar-menu {
                gap: 40px !important;
            }
            .navbar-link {
                font-size: 20px !important;
            }
        }
    `;

    const bar = {
        position: "sticky",
        top: 0,
        background: "rgba(255,255,255,.95)",
        backdropFilter: "blur(8px)",
        zIndex: 10
    };

    const wrap = {
        width: "100%",
        margin: "0",
        padding: "8px 40px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        position: "relative"
    };

    const link = (to, label, isMobile = false) => (
        <Link
            to={to}
            className="navbar-link"
            style={{
                color: pathname === to ? "#3b82f6" : "#000000",
                fontWeight: "700",
                fontSize: "22px",
                textDecoration: "none",
                opacity: pathname === to ? 1 : 0.8,
                transition: "all 0.2s ease",
                ...(isMobile && { padding: "8px 0" })
            }}
            onClick={() => isMobile && setIsMenuOpen(false)}
        >
            {label}
        </Link>
    );

    return (
        <>
            <style>{responsiveStyles}</style>
            <div style={bar}>
                <div style={wrap} className="navbar-wrap">
                    <Link to="/" style={{ fontWeight: 800 }} className="navbar-logo">
                        <img src="/img/Untitled-2 1.png" alt="3DGS Logo" style={{
                            height: "120px",
                            width: "auto",
                            transition: "height 0.2s ease"
                        }} />
                    </Link>

                    {/* 데스크톱 메뉴 */}
                    <div className="navbar-menu">
                        {link("/", "Main")}
                        {link("/report", "Report")}
                        {link("/viewer", "3D")}
                        {link("/map", "Map")}
                    </div>

                    {/* 햄버거 메뉴 버튼 */}
                    <button
                        className="hamburger"
                        style={{
                            display: "none",
                            flexDirection: "column",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "4px"
                        }}
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        <span style={{
                            width: "25px",
                            height: "3px",
                            backgroundColor: "#000000",
                            margin: "2px 0",
                            transition: "0.3s",
                            transform: isMenuOpen ? "rotate(-45deg) translate(-5px, 6px)" : "none"
                        }}></span>
                        <span style={{
                            width: "25px",
                            height: "3px",
                            backgroundColor: "#000000",
                            margin: "2px 0",
                            transition: "0.3s",
                            opacity: isMenuOpen ? "0" : "1"
                        }}></span>
                        <span style={{
                            width: "25px",
                            height: "3px",
                            backgroundColor: "#000000",
                            margin: "2px 0",
                            transition: "0.3s",
                            transform: isMenuOpen ? "rotate(45deg) translate(-5px, -6px)" : "none"
                        }}></span>
                    </button>

                    {/* 모바일 메뉴 */}
                    <div
                        className={`navbar-menu-mobile ${isMenuOpen ? 'open' : ''}`}
                    >
                        {link("/", "Main", true)}
                        {link("/report", "Report", true)}
                        {link("/viewer", "3D", true)}
                        {link("/map", "Map", true)}
                    </div>
                </div>
            </div>
        </>
    );
}
