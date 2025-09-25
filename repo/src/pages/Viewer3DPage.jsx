import UploadCard from "../components/UploadCard";

export default function Viewer3DPage() {
    return (
        <div style={{ maxWidth: 1100, margin: "24px auto", padding: "0 20px" }}>
            <h2>3D 화면</h2>
            <p className="sub">.ksplat / .splat / .ply 업로드 후 3D 장면을 확인하세요.</p>
            <UploadCard />
        </div>
    );
}
