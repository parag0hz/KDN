import Hero from "../components/Hero";
import FeatureTiles from "../components/FeatureTiles";
import UploadCard from "../components/UploadCard";

export default function MainPage() {
    const section = { padding: "56px 0" };
    const container = { maxWidth: 1100, margin: "0 auto", padding: "0 20px" };

    return (
        <main>
            <section style={{ padding: "32px 0 8px" }}>
                <div style={container}><Hero /></div>
            </section>

            <section id="demo" style={section}>
                <div style={container}>
                    <h2 className="h2">데모 체험</h2>
                    <p className="sub">.ksplat / .splat / .ply 파일 업로드로 3D 확인</p>
                    <UploadCard height={260} compact />
                </div>
            </section>

            <section id="features" style={{ ...section, background: "#0a1226" }}>
                <div style={container}>
                    <h2 className="h2">핵심 기능</h2>
                    <FeatureTiles />
                </div>
            </section>
        </main>
    );
}
