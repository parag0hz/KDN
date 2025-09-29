// server.mjs
import express from "express";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use((req, res, next) => {
    // COOP/COEP → crossOriginIsolated = true (SAB 사용 가능)
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    // 외부 리소스를 꼭 써야 한다면 서버 쪽에 CORP 헤더가 있어야 함.
    // 로컬 정적 파일은 same-origin 이므로 문제 없음.
    next();
});

// 정적 파일 서빙
app.use(
    express.static(path.join(__dirname, "build"), {
        setHeaders(res, filePath) {
            if (filePath.endsWith(".wasm")) {
                res.setHeader("Content-Type", "application/wasm");
            }
            // 캐시(선택): res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        },
    })
);

// SPA 라우팅 (Express 5는 정규식 사용 권장)
app.get(/.*/, (_, res) => {
    res.sendFile(path.join(__dirname, "build", "index.html"));
});

const PORT = Number(process.env.PORT) || 8080;
const HOST = "0.0.0.0";

const server = app.listen(PORT, HOST, () => {
    const ifaces = Object.values(os.networkInterfaces()).flat().filter(Boolean);
    const addrs = ifaces
        .filter(n => n.family === "IPv4" && !n.internal)
        .map(n => n.address);
    console.log(`✅ Server up on http://${HOST}:${PORT}`);
    addrs.forEach(ip => console.log(`   ▶ LAN:   http://${ip}:${PORT}`));
    console.log(`   COOP/COEP enabled → crossOriginIsolated expected = true`);
});

server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
        console.error(`❌ Port ${PORT} is in use. Change the port or stop the other process.`);
    } else {
        console.error("❌ Server error:", err);
    }
});
