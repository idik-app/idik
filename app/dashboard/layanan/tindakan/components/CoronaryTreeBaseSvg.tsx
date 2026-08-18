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

      {/* Aorta Root & Arch */}
      <g stroke="#1e293b" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Aorta Trunk */}
        <path d="M 220 280 C 200 230 210 120 280 80 C 350 40 430 70 440 160 C 445 200 440 250 430 280 C 420 300 390 325 360 330 C 320 335 270 325 240 310 Z" fill="#f8fafc" />
        {/* Arch Branches */}
        <path d="M 280 80 L 270 40 M 320 60 L 320 30 M 360 65 L 360 35 M 400 85 L 400 45" strokeWidth="3" />
        {/* LIMA Branch */}
        <path d="M 400 120 C 405 150 410 180 430 200 M 415 125 C 420 155 425 185 442 200" strokeWidth="2.5" />
        <path d="M 355 300 C 345 300 340 295 340 290 C 340 285 348 280 355 285 Z" fill="#cbd5e1" strokeWidth="2" />
      </g>

      {/* Coronary Vessels */}
      <g stroke="#1e293b" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* --- RIGHT SYSTEM (RCA) --- */}
        {/* RCA Main Trunk Double Line (Tubular) */}
        <path d="M 230 300 C 190 330 150 390 130 450 C 110 510 110 570 130 620 C 150 670 180 700 230 720 C 280 740 340 740 390 720" strokeWidth="7" stroke="#cbd5e1" />
        <path d="M 230 300 C 190 330 150 390 130 450 C 110 510 110 570 130 620 C 150 670 180 700 230 720 C 280 740 340 740 390 720" strokeWidth="3.5" stroke="#1e293b" />

        {/* AVN Branch */}
        <path d="M 205 320 C 200 300 210 280 215 270 M 208 322 C 203 302 213 282 218 272" strokeWidth="2.5" />

        {/* RV Branch */}
        <path d="M 135 470 C 160 470 220 475 260 470 M 135 480 C 160 480 220 485 260 480" strokeWidth="2.5" />

        {/* Acute Marginal */}
        <path d="M 125 630 C 160 630 240 635 300 620 M 125 640 C 160 640 240 645 300 630" strokeWidth="2.5" />

        {/* AV Branch */}
        <path d="M 380 720 C 375 690 370 660 375 640 M 385 720 C 380 690 375 660 380 640" strokeWidth="2.5" />

        {/* PDA */}
        <path d="M 385 725 C 395 765 415 815 445 845 M 392 725 C 402 765 422 815 452 845" strokeWidth="2.5" />

        {/* PL #1 & PL #2 */}
        <path d="M 410 735 C 430 765 470 805 500 825 M 415 742 C 435 772 475 812 505 832" strokeWidth="2.5" />
        <path d="M 430 740 C 460 765 490 795 520 815 M 435 747 C 465 772 495 802 525 822" strokeWidth="2.5" />


        {/* --- LEFT SYSTEM (LMCA / LAD / LCX) --- */}
        {/* LMCA */}
        <path d="M 360 300 L 440 300 M 360 308 L 440 308" strokeWidth="3.5" />

        {/* Ramus Int. */}
        <path d="M 440 295 C 490 275 580 265 670 275 M 440 302 C 490 282 580 272 670 282" strokeWidth="2.5" />

        {/* LAD Main Trunk */}
        <path d="M 440 300 C 500 330 600 390 700 480 C 760 540 820 620 890 710" strokeWidth="8" stroke="#cbd5e1" />
        <path d="M 440 300 C 500 330 600 390 700 480 C 760 540 820 620 890 710" strokeWidth="3.5" stroke="#1e293b" />

        {/* Diag #1 */}
        <path d="M 520 335 C 600 355 740 385 850 415 M 520 342 C 600 362 740 392 850 422" strokeWidth="2.5" />

        {/* Diag #2 */}
        <path d="M 640 425 C 720 455 820 495 900 525 M 640 432 C 720 462 820 502 900 532" strokeWidth="2.5" />

        {/* SeptelPerf */}
        <path d="M 567 370 L 567 460 M 573 370 L 573 460" strokeWidth="2.5" />

        {/* Circumflex */}
        <path d="M 440 308 C 460 358 490 428 500 508 C 510 588 500 668 490 738" strokeWidth="7" stroke="#cbd5e1" />
        <path d="M 440 308 C 460 358 490 428 500 508 C 510 588 500 668 490 738" strokeWidth="3.5" stroke="#1e293b" />

        {/* OM 1 */}
        <path d="M 480 395 C 520 435 600 475 670 505 M 480 403 C 520 443 600 483 670 513" strokeWidth="2.5" />

        {/* OM 2 */}
        <path d="M 500 525 C 540 585 610 645 670 705 M 500 533 C 540 593 610 653 670 713" strokeWidth="2.5" />
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
          <text x="445" y="150">LIMA</text>

          {/* LA & LMCA */}
          <text x="375" y="295" fontSize="13">LA</text>
          <text x="405" y="295" fontSize="14">LMCA</text>

          {/* Ramus */}
          <text x="560" y="260">Ramus Int.</text>

          {/* Right System Labels */}
          <text x="145" y="325" transform="rotate(-35, 145, 325)">RCA</text>
          <text x="155" y="280">AVN</text>
          <text x="150" y="460">RV Branch</text>
          <text x="145" y="620">Acute Marginal</text>
          <text x="350" y="650">AV</text>
          <text x="385" y="865">PDA</text>
          <text x="445" y="855" transform="rotate(30, 445, 855)">PL #1</text>
          <text x="495" y="845" transform="rotate(30, 495, 845)">PL #2</text>

          {/* Left System Labels */}
          <text x="735" y="360" transform="rotate(15, 735, 360)">Diag. #1</text>
          <text x="740" y="450" transform="rotate(15, 740, 450)">LAD</text>
          <text x="800" y="500" transform="rotate(15, 800, 500)">Diag. #2</text>

          <text x="540" y="440" transform="rotate(90, 540, 440)" fontSize="13">SeptelPerf</text>
          <text x="495" y="390" transform="rotate(70, 495, 390)" fontSize="13">circumflex</text>

          <text x="600" y="470">OM 1</text>
          <text x="600" y="660">OM 2</text>
        </g>
      )}
    </svg>
  );
});
