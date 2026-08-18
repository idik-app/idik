"use client";

import React, { memo } from "react";

/**
 * Clean 1:1 Vector Representation of Coronary Angiography Tree Diagram
 * Matches the official RM 20c layout with high-definition SVG curves and clean labels.
 */
export interface VesselPathAnchor {
  id: string;
  name: string;
  pathD: string;
}

export const CORONARY_VESSEL_ANCHORS: VesselPathAnchor[] = [
  { id: "rca", name: "RCA", pathD: "M 220 310 C 180 340 140 400 120 460 C 100 520 100 580 120 630 C 140 680 170 710 220 730 C 270 750 330 750 380 730" },
  { id: "avn", name: "AVN", pathD: "M 205 320 C 200 300 210 280 215 270" },
  { id: "rv_branch", name: "RV Branch", pathD: "M 135 480 C 160 480 220 485 260 480" },
  { id: "acute_marginal", name: "Acute Marginal", pathD: "M 125 640 C 160 640 240 645 300 630" },
  { id: "av", name: "AV", pathD: "M 380 730 C 375 700 370 670 375 650" },
  { id: "pda", name: "PDA", pathD: "M 380 730 C 390 770 410 820 440 850" },
  { id: "pl_1", name: "PL #1", pathD: "M 410 740 C 430 770 470 810 500 830" },
  { id: "pl_2", name: "PL #2", pathD: "M 430 745 C 460 770 490 800 520 820" },
  { id: "lmca", name: "LMCA", pathD: "M 360 300 L 440 300" },
  { id: "lima", name: "LIMA", pathD: "M 400 130 C 405 160 410 180 430 200" },
  { id: "ramus", name: "Ramus Int.", pathD: "M 440 300 C 490 280 580 270 670 280" },
  { id: "lad", name: "LAD", pathD: "M 440 300 C 500 330 600 390 700 480 C 760 540 820 620 890 710" },
  { id: "diag_1", name: "Diag. #1", pathD: "M 520 340 C 600 360 740 390 850 420" },
  { id: "diag_2", name: "Diag. #2", pathD: "M 640 430 C 720 460 820 500 900 530" },
  { id: "septel_perf", name: "SeptelPerf", pathD: "M 570 370 L 570 460" },
  { id: "circumflex", name: "Circumflex", pathD: "M 440 300 C 460 350 490 420 500 500 C 510 580 500 660 490 730" },
  { id: "om_1", name: "OM 1", pathD: "M 480 400 C 520 440 600 480 670 510" },
  { id: "om_2", name: "OM 2", pathD: "M 500 530 C 540 590 610 650 670 710" },
];

type Props = {
  className?: string;
  width?: number | string;
  height?: number | string;
  highlightVesselId?: string | null;
  showLabels?: boolean;
};

export const CoronaryTreeBaseSvg = memo(function CoronaryTreeBaseSvg({
  className = "",
  width = "100%",
  height = "100%",
  highlightVesselId = null,
  showLabels = true,
}: Props) {
  return (
    <svg
      viewBox="0 0 1000 900"
      width={width}
      height={height}
      className={`select-none ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* Background container */}
      <rect width="1000" height="900" fill="#ffffff" rx="8" />

      {/* Aorta Root & Bulb */}
      <g stroke="#1e293b" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Main Aorta Bulb */}
        <path d="M 230 300 C 180 200 220 70 330 60 C 440 50 465 180 440 285 C 420 310 370 330 320 330 C 270 330 240 315 230 300 Z" fill="#ffffff" strokeWidth="3.5" />
        {/* Top 4 Arch Branches */}
        <path d="M 275 62 L 265 15 M 315 58 L 310 12 M 355 60 L 355 15 M 395 72 L 400 20" strokeWidth="3.5" />
        {/* LIMA Branch Inside Top Aorta */}
        <path d="M 400 110 C 405 140 415 170 435 190 M 415 115 C 420 145 428 175 444 190" strokeWidth="2.5" />
        {/* LA Ostium */}
        <path d="M 330 280 C 330 270 345 270 345 285 C 345 295 330 295 330 280 Z" fill="#cbd5e1" strokeWidth="2.5" />
      </g>

      {/* Coronary Vessels */}
      <g stroke="#1e293b" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* --- RIGHT SYSTEM (RCA) --- */}
        {/* RCA Main Tubular Trunk */}
        <path d="M 230 300 C 150 340 100 420 95 500 C 90 600 120 700 230 760 C 290 790 350 790 380 750" strokeWidth="7" stroke="#e2e8f0" />
        <path d="M 230 300 C 150 340 100 420 95 500 C 90 600 120 700 230 760 C 290 790 350 790 380 750" strokeWidth="3.5" stroke="#1e293b" />

        {/* AVN Branch */}
        <path d="M 205 320 C 190 290 195 260 195 250 M 210 322 C 195 292 200 262 200 252" strokeWidth="2.5" />

        {/* RV Branch */}
        <path d="M 115 480 C 150 480 210 485 250 480 M 115 490 C 150 490 210 495 250 490" strokeWidth="2.5" />

        {/* Acute Marginal */}
        <path d="M 105 640 C 150 640 230 645 290 630 M 105 650 C 150 650 230 655 290 640" strokeWidth="2.5" />

        {/* AV Branch */}
        <path d="M 370 750 C 365 710 360 670 365 640 M 375 750 C 370 710 365 670 370 640" strokeWidth="2.5" />

        {/* PDA */}
        <path d="M 375 750 C 385 790 405 840 435 870 M 382 750 C 392 790 412 840 442 870" strokeWidth="2.5" />

        {/* PL #1 & PL #2 */}
        <path d="M 400 760 C 420 790 460 830 490 855 M 405 767 C 425 797 465 837 495 862" strokeWidth="2.5" />
        <path d="M 420 765 C 450 790 480 820 520 840 M 425 772 C 455 797 485 827 525 847" strokeWidth="2.5" />


        {/* --- LEFT SYSTEM (LMCA / LAD / LCX) --- */}
        {/* LMCA */}
        <path d="M 345 285 L 435 285 M 345 293 L 435 293" strokeWidth="3.5" />

        {/* Ramus Int. */}
        <path d="M 435 280 C 490 265 580 255 670 265 M 435 287 C 490 272 580 262 670 272" strokeWidth="2.5" />

        {/* LAD Main Trunk */}
        <path d="M 435 285 C 500 320 600 390 700 480 C 760 540 820 620 900 720" strokeWidth="8" stroke="#e2e8f0" />
        <path d="M 435 285 C 500 320 600 390 700 480 C 760 540 820 620 900 720" strokeWidth="3.5" stroke="#1e293b" />

        {/* Diag #1 */}
        <path d="M 515 325 C 600 345 740 375 855 405 M 515 332 C 600 352 740 382 855 412" strokeWidth="2.5" />

        {/* Diag #2 */}
        <path d="M 640 415 C 720 445 820 485 910 515 M 640 422 C 720 452 820 492 910 522" strokeWidth="2.5" />

        {/* SeptelPerf */}
        <path d="M 565 350 L 565 440 M 571 350 L 571 440" strokeWidth="2.5" />

        {/* Circumflex */}
        <path d="M 435 293 C 460 358 490 440 500 520 C 505 600 495 680 482 760" strokeWidth="7" stroke="#e2e8f0" />
        <path d="M 435 293 C 460 358 490 440 500 520 C 505 600 495 680 482 760" strokeWidth="3.5" stroke="#1e293b" />

        {/* OM 1 */}
        <path d="M 480 390 C 520 430 600 470 670 500 M 480 398 C 520 438 600 478 670 508" strokeWidth="2.5" />

        {/* OM 2 */}
        <path d="M 495 520 C 540 580 610 640 670 700 M 495 528 C 540 588 610 648 670 708" strokeWidth="2.5" />
      </g>

      {/* Active Vessel Highlight */}
      {highlightVesselId && (
        <g stroke="#3b82f6" strokeWidth="8" strokeLinecap="round" fill="none" opacity="0.6">
          {CORONARY_VESSEL_ANCHORS.filter((v) => v.id === highlightVesselId).map((v) => (
            <path key={v.id} d={v.pathD} />
          ))}
        </g>
      )}

      {/* Labels Text Layer */}
      {showLabels && (
        <g fontSize="15" fontWeight="700" fontFamily="sans-serif" fill="#0f172a">
          {/* LIMA */}
          <text x="435" y="130">LIMA</text>

          {/* LA & LMCA */}
          <text x="365" y="280" fontSize="13">LA</text>
          <text x="395" y="280" fontSize="14">LMCA</text>

          {/* Ramus */}
          <text x="550" y="250">Ramus Int.</text>

          {/* Right System Labels */}
          <text x="120" y="325" transform="rotate(-35, 120, 325)">RCA</text>
          <text x="135" y="270">AVN</text>
          <text x="130" y="470">RV Branch</text>
          <text x="125" y="630">Acute Marginal</text>
          <text x="340" y="660">AV</text>
          <text x="375" y="885">PDA</text>
          <text x="435" y="875" transform="rotate(30, 435, 875)">PL #1</text>
          <text x="485" y="865" transform="rotate(30, 485, 865)">PL #2</text>

          {/* Left System Labels */}
          <text x="735" y="350" transform="rotate(15, 735, 350)">Diag. #1</text>
          <text x="740" y="440" transform="rotate(15, 740, 440)">LAD</text>
          <text x="795" y="495" transform="rotate(15, 795, 495)">Diag. #2</text>

          <text x="535" y="430" transform="rotate(90, 535, 430)" fontSize="13">SeptelPerf</text>
          <text x="485" y="380" transform="rotate(70, 485, 380)" fontSize="13">circumflex</text>

          <text x="590" y="460">OM 1</text>
          <text x="590" y="650">OM 2</text>
        </g>
      )}
    </svg>
  );
});
