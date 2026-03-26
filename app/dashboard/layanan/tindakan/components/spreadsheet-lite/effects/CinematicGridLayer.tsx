"use client";

export default function CinematicGridLayer() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Rainbow Cyan-Gold Scanline (slow sweep) */}
      <div
        className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-cyan-400 via-gold-300 to-cyan-400 opacity-40"
        style={{ animation: "tindakanScanline 6s linear infinite" }}
      />

      {/* Parallax Grid (far layer) */}
      <div
        className="absolute inset-0 opacity-[0.22] bg-[linear-gradient(90deg,rgba(0,255,255,0.15)_1px,transparent_1px),linear-gradient(180deg,rgba(0,255,255,0.15)_1px,transparent_1px)]"
        style={{
          backgroundSize: "40px 40px",
          animation: "tindakanGridFar 12s linear infinite",
        }}
      />

      {/* Parallax Grid (mid layer) */}
      <div
        className="absolute inset-0 opacity-[0.35] bg-[linear-gradient(90deg,rgba(255,215,0,0.18)_1px,transparent_1px),linear-gradient(180deg,rgba(255,215,0,0.18)_1px,transparent_1px)]"
        style={{
          backgroundSize: "60px 60px",
          animation: "tindakanGridMid 20s linear infinite",
        }}
      />

      {/* Floating Particles */}
      <div className="absolute inset-0">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-[3px] h-[3px] rounded-full bg-cyan-300"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: 0.35,
              animationName: "tindakanParticleFloat",
              animationTimingFunction: "ease-in-out",
              animationIterationCount: "infinite",
              animationDuration: `${4 + Math.random() * 6}s`,
              animationDelay: `${Math.random() * 1.25}s`,
            }}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes tindakanScanline {
          0% {
            transform: translateY(0%);
          }
          100% {
            transform: translateY(100vh);
          }
        }

        @keyframes tindakanGridFar {
          0% {
            background-position: 0px 0px;
          }
          100% {
            background-position: 40px 40px;
          }
        }

        @keyframes tindakanGridMid {
          0% {
            background-position: 60px 60px;
          }
          100% {
            background-position: 0px 0px;
          }
        }

        @keyframes tindakanParticleFloat {
          0% {
            transform: translate(0px, 0px);
            opacity: 0.1;
          }
          50% {
            transform: translate(5px, -25px);
            opacity: 0.4;
          }
          100% {
            transform: translate(0px, 0px);
            opacity: 0.1;
          }
        }
      `}</style>
    </div>
  );
}
