import React from 'react';
import {
  SurveyProject,
  FloorPlanData,
  PhotoRecord,
  RoomPin,
} from '../types';
import { Printer, Building, MapPin, X, Camera } from 'lucide-react';

interface PrintReportViewProps {
  project: SurveyProject;
  floorPlan: FloorPlanData;
  photos: PhotoRecord[];
  onClose: () => void;
  mode?: 'report' | 'plan';
}

interface CalculatedRoom {
  room: RoomPin;
  width: number;
  depth: number;
  floorArea: number;
  ceilingArea: number;
  grossWallArea: number;
  netWallArea: number;
  ceilingHeight: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  centerX: number;
  centerY: number;
  polyPoints: { x: number; y: number }[];
}

function calculateRoomInfo(room: RoomPin, floorPlan: FloorPlanData): CalculatedRoom {
  const sortedGridX = [...floorPlan.gridX].sort((a, b) => a.positionMeters - b.positionMeters);
  const sortedGridY = [...floorPlan.gridY].sort((a, b) => a.positionMeters - b.positionMeters);

  let width = room.customWidth || 4.0;
  let depth = room.customDepth || 4.0;
  let xMin = room.x - width / 2;
  let xMax = room.x + width / 2;
  let yMin = room.y - depth / 2;
  let yMax = room.y + depth / 2;

  if (room.isAutoCalculated) {
    let leftVal = 0;
    let minLeftDist = Infinity;
    let rightVal = 10;
    let minRightDist = Infinity;
    let topVal = 0;
    let minTopDist = Infinity;
    let bottomVal = 10;
    let minBottomDist = Infinity;

    floorPlan.walls.forEach((wall) => {
      const { startX, startY, endX, endY } = wall;
      const minW_X = Math.min(startX, endX);
      const maxW_X = Math.max(startX, endX);
      const minW_Y = Math.min(startY, endY);
      const maxW_Y = Math.max(startY, endY);

      if (room.y >= minW_Y - 0.001 && room.y <= maxW_Y + 0.001) {
        if (Math.abs(startY - endY) >= 0.001) {
          const interX = startX + ((room.y - startY) * (endX - startX)) / (endY - startY);
          if (interX <= room.x + 0.001) {
            const dist = room.x - interX;
            if (dist >= 0 && dist < minLeftDist) {
              minLeftDist = dist;
              leftVal = interX;
            }
          }
          if (interX >= room.x - 0.001) {
            const dist = interX - room.x;
            if (dist >= 0 && dist < minRightDist) {
              minRightDist = dist;
              rightVal = interX;
            }
          }
        }
      }

      if (room.x >= minW_X - 0.001 && room.x <= maxW_X + 0.001) {
        if (Math.abs(startX - endX) >= 0.001) {
          const interY = startY + ((room.x - startX) * (endY - startY)) / (endX - startX);
          if (interY <= room.y + 0.001) {
            const dist = room.y - interY;
            if (dist >= 0 && dist < minTopDist) {
              minTopDist = dist;
              topVal = interY;
            }
          }
          if (interY >= room.y - 0.001) {
            const dist = interY - room.y;
            if (dist >= 0 && dist < minBottomDist) {
              minBottomDist = dist;
              bottomVal = interY;
            }
          }
        }
      }
    });

    const leftGrids = sortedGridX.filter((g) => g.positionMeters < room.x);
    const fallbackLeftX = leftGrids.length > 0 ? leftGrids[leftGrids.length - 1].positionMeters : 0;

    const rightGrids = sortedGridX.filter((g) => g.positionMeters > room.x);
    const fallbackRightX = rightGrids.length > 0 ? rightGrids[0].positionMeters : (sortedGridX[sortedGridX.length - 1]?.positionMeters || 10);

    const topGrids = sortedGridY.filter((g) => g.positionMeters < room.y);
    const fallbackTopY = topGrids.length > 0 ? topGrids[topGrids.length - 1].positionMeters : 0;

    const bottomGrids = sortedGridY.filter((g) => g.positionMeters > room.y);
    const fallbackBottomY = bottomGrids.length > 0 ? bottomGrids[0].positionMeters : (sortedGridY[sortedGridY.length - 1]?.positionMeters || 10);

    const leftX = minLeftDist !== Infinity ? leftVal : fallbackLeftX;
    const rightX = minRightDist !== Infinity ? rightVal : fallbackRightX;
    const topY = minTopDist !== Infinity ? topVal : fallbackTopY;
    const bottomY = minBottomDist !== Infinity ? bottomVal : fallbackBottomY;

    width = Math.max(0.1, rightX - leftX);
    depth = Math.max(0.1, bottomY - topY);
    xMin = leftX;
    xMax = rightX;
    yMin = topY;
    yMax = bottomY;
  }

  const iw = room.indentWidth || 0;
  const idep = room.indentDepth || 0;
  width = Math.max(0.1, width + (room.widthOffset || 0));
  depth = Math.max(0.1, depth + (room.depthOffset || 0));

  let baseArea = width * depth + (room.areaOffset || 0);
  if (room.roomShape === 'l_shape') {
    baseArea -= iw * idep;
  } else if (room.roomShape === 't_shape') {
    baseArea -= 2 * iw * idep;
  }

  const floorArea = Math.max(0.1, baseArea);
  const ceilingArea = floorArea;

  const ceilingHeight = room.ceilingHeight || floorPlan.ceilingHeight || 2.80;
  const floorHeight = room.floorHeight || floorPlan.floorHeight || 2.80;

  let perimeter = 2 * (width + depth);
  if (room.roomShape === 't_shape' && iw > 0 && idep > 0) {
    perimeter += 2 * idep;
  }

  const wallLengthOffset = room.wallLengthOffset || 0;
  const adjustedPerimeter = Math.max(0.5, perimeter + wallLengthOffset);
  const grossWallArea = adjustedPerimeter * floorHeight;

  let subtractedArea = 0;
  floorPlan.openings.forEach((op) => {
    const wall = floorPlan.walls.find((w) => w.id === op.wallId);
    if (!wall) return;

    const midX = (wall.startX + wall.endX) / 2;
    const midY = (wall.startY + wall.endY) / 2;
    const onBoundary = (
      midX >= xMin - 0.2 && midX <= xMax + 0.2 &&
      midY >= yMin - 0.2 && midY <= yMax + 0.2
    );

    if (onBoundary) {
      const opArea = (op.widthCm / 100) * (op.heightCm / 100);
      subtractedArea += opArea;
    }
  });

  const netWallArea = Math.max(0, grossWallArea - subtractedArea);

  let polyPoints: { x: number; y: number }[] = [];
  if (room.roomShape === 'l_shape' && iw > 0 && idep > 0) {
    polyPoints = [
      { x: xMin, y: yMin },
      { x: xMax - iw, y: yMin },
      { x: xMax - iw, y: yMin + idep },
      { x: xMax, y: yMin + idep },
      { x: xMax, y: yMax },
      { x: xMin, y: yMax }
    ];
  } else if (room.roomShape === 't_shape' && iw > 0 && idep > 0) {
    polyPoints = [
      { x: xMin + iw, y: yMin },
      { x: xMax - iw, y: yMin },
      { x: xMax - iw, y: yMin + idep },
      { x: xMax, y: yMin + idep },
      { x: xMax, y: yMax },
      { x: xMin, y: yMax },
      { x: xMin, y: yMin + idep },
      { x: xMin + iw, y: yMin + idep }
    ];
  } else {
    polyPoints = [
      { x: xMin, y: yMin },
      { x: xMax, y: yMin },
      { x: xMax, y: yMax },
      { x: xMin, y: yMax }
    ];
  }

  return {
    room,
    width,
    depth,
    floorArea,
    ceilingArea,
    grossWallArea,
    netWallArea,
    ceilingHeight,
    xMin,
    xMax,
    yMin,
    yMax,
    centerX: (xMin + xMax) / 2,
    centerY: (yMin + yMax) / 2,
    polyPoints,
  };
}

export const PrintReportView: React.FC<PrintReportViewProps> = ({
  project,
  floorPlan,
  photos,
  onClose,
  mode = 'report',
}) => {
  const handlePrint = () => {
    window.print();
  };

  // Calculate plan dimensions for orientation
  const sortedX = [...floorPlan.gridX].sort((a, b) => a.positionMeters - b.positionMeters);
  const minX = sortedX.length > 0 ? sortedX[0].positionMeters : 0;
  const maxX = sortedX.length > 0 ? sortedX[sortedX.length - 1].positionMeters : 10;
  const totalWidth = Math.max(0.1, maxX - minX);

  const sortedY = [...floorPlan.gridY].sort((a, b) => a.positionMeters - b.positionMeters);
  const minY = sortedY.length > 0 ? sortedY[0].positionMeters : 0;
  const maxY = sortedY.length > 0 ? sortedY[sortedY.length - 1].positionMeters : 10;
  const totalHeight = Math.max(0.1, maxY - minY);

  const isLandscape = totalWidth > totalHeight;

  // Zoom / Scale for Plan SVG (pixels per meter)
  const planZoom = 42;
  const padLeft = 4.0;
  const padRight = 2.0;
  const padTop = 4.0;
  const padBottom = 2.5;

  const minSvgX = (minX - padLeft) * planZoom;
  const minSvgY = (minY - padTop) * planZoom;
  const svgWidth = (totalWidth + padLeft + padRight) * planZoom;
  const svgHeight = (totalHeight + padTop + padBottom) * planZoom;

  // Calculate Room Information
  const calculatedRooms = (floorPlan.roomPins || []).map((room) =>
    calculateRoomInfo(room, floorPlan)
  );

  const sumRoomArea = calculatedRooms.reduce((acc, r) => acc + r.floorArea, 0);

  // Extract photos from defect pins
  const pinPhotos = floorPlan.defectPins
    .filter((pin) => pin.photoUrl)
    .map((pin) => ({
      id: pin.id,
      url: pin.photoUrl!,
      title: pin.title,
      description: pin.description,
      timestamp: new Date().toISOString(),
      x: pin.x,
      y: pin.y,
    }));

  const displayPhotos = mode === 'report' ? pinPhotos : photos;

  // If Mode is 'plan': Render Clean Blank Page displaying ONLY the plan, dimensions, room names & areas
  if (mode === 'plan') {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur border-none overflow-y-auto p-4 print:p-0 print:bg-white print:text-black flex flex-col items-center">
        {/* Dynamic Print Orientation Style */}
        <style dangerouslySetInnerHTML={{ __html: `
          @page {
            size: A4 ${isLandscape ? 'landscape' : 'portrait'};
            margin: 6mm;
          }
          @media print {
            body { background: white !important; }
            .print-hidden { display: none !important; }
            .print-break-inside-avoid { break-inside: avoid; }
            .print-shadow-none { shadow: none !important; box-shadow: none !important; }
            .print-m-0 { margin: 0 !important; }
            .print-p-0 { padding: 0 !important; }
          }
        ` }} />

        {/* Print Controls Floating Header */}
        <div className="w-full max-w-5xl mb-4 bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between print:hidden shadow-xl">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <span className="text-sm font-bold text-slate-200 block">
                ผังแปลนและระยะประกอบพื้นที่ (Blank Page Floor Plan Preview)
              </span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                {isLandscape ? 'A4 Landscape' : 'A4 Portrait'} • กระดาษแปลนแสดงระยะและชื่อห้อง
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg text-xs font-bold shadow-lg transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              พิมพ์ / บันทึก PDF (Print PDF)
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white transition-colors"
            >
              ปิด
            </button>
          </div>
        </div>

        {/* Blank Page Paper Container */}
        <div className="w-full max-w-5xl bg-white text-slate-900 p-6 rounded-xl shadow-2xl print:shadow-none print:rounded-none print:p-0 flex flex-col justify-between items-center min-h-[720px] relative border border-slate-200 print:border-none">
          {/* Main Plan SVG View */}
          <div className="w-full flex-1 flex flex-col items-center justify-center p-2">
            <svg
              width="100%"
              height="100%"
              viewBox={`${minSvgX} ${minSvgY} ${svgWidth} ${svgHeight}`}
              className="max-w-full max-h-[82vh] bg-white"
            >
              <defs>
                <pattern id="planGridPattern" width={planZoom} height={planZoom} patternUnits="userSpaceOnUse">
                  <path d={`M ${planZoom} 0 L 0 0 0 ${planZoom}`} fill="none" stroke="#f1f5f9" strokeWidth="0.8" />
                </pattern>
              </defs>

              {/* Grid Background */}
              <rect x={minSvgX} y={minSvgY} width={svgWidth} height={svgHeight} fill="url(#planGridPattern)" />

              {/* 1. Grid Lines */}
              {sortedX.map((gx) => (
                <line
                  key={`gl_x_${gx.id}`}
                  x1={gx.positionMeters * planZoom}
                  y1={(minY - 0.5) * planZoom}
                  x2={gx.positionMeters * planZoom}
                  y2={(maxY + 0.5) * planZoom}
                  stroke="#cbd5e1"
                  strokeWidth="0.8"
                  strokeDasharray="4,3"
                />
              ))}
              {sortedY.map((gy) => (
                <line
                  key={`gl_y_${gy.id}`}
                  x1={(minX - 0.5) * planZoom}
                  y1={gy.positionMeters * planZoom}
                  x2={(maxX + 0.5) * planZoom}
                  y2={gy.positionMeters * planZoom}
                  stroke="#cbd5e1"
                  strokeWidth="0.8"
                  strokeDasharray="4,3"
                />
              ))}

              {/* 2. Top Grid Spans & Overall Dimensions (ระยะแกน X) */}
              {sortedX.map((gx, idx) => {
                if (idx === 0) return null;
                const prevGx = sortedX[idx - 1];
                const x1 = prevGx.positionMeters * planZoom;
                const x2 = gx.positionMeters * planZoom;
                const span = gx.positionMeters - prevGx.positionMeters;
                const dimY = (minY - 1.2) * planZoom;

                return (
                  <g key={`span_x_${gx.id}`}>
                    <line x1={x1} y1={dimY} x2={x2} y2={dimY} stroke="#0284c7" strokeWidth="1.2" />
                    <line x1={x1} y1={dimY - 4} x2={x1} y2={dimY + 4} stroke="#0284c7" strokeWidth="1.5" />
                    <line x1={x2} y1={dimY - 4} x2={x2} y2={dimY + 4} stroke="#0284c7" strokeWidth="1.5" />
                    <rect x={(x1 + x2) / 2 - 20} y={dimY - 9} width="40" height="16" rx="3" fill="#ffffff" stroke="#0284c7" strokeWidth="0.8" />
                    <text x={(x1 + x2) / 2} y={dimY + 3} textAnchor="middle" fill="#0284c7" fontSize="9" fontWeight="bold" fontFamily="monospace">
                      {span.toFixed(2)}m
                    </text>
                  </g>
                );
              })}

              {/* Overall Total Width Dimension */}
              {sortedX.length > 1 && (() => {
                const x1 = sortedX[0].positionMeters * planZoom;
                const x2 = sortedX[sortedX.length - 1].positionMeters * planZoom;
                const dimY = (minY - 2.3) * planZoom;
                return (
                  <g>
                    <line x1={x1} y1={dimY} x2={x2} y2={dimY} stroke="#0f172a" strokeWidth="1.5" />
                    <line x1={x1} y1={dimY - 5} x2={x1} y2={dimY + 5} stroke="#0f172a" strokeWidth="2" />
                    <line x1={x2} y1={dimY - 5} x2={x2} y2={dimY + 5} stroke="#0f172a" strokeWidth="2" />
                    <rect x={(x1 + x2) / 2 - 28} y={dimY - 10} width="56" height="18" rx="4" fill="#0f172a" />
                    <text x={(x1 + x2) / 2} y={dimY + 3} textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold" fontFamily="monospace">
                      {totalWidth.toFixed(2)}m
                    </text>
                  </g>
                );
              })()}

              {/* Top & Bottom Grid Bubbles (X Axis) */}
              {sortedX.map((gx) => {
                const posX = gx.positionMeters * planZoom;
                const topBubbleY = (minY - 3.2) * planZoom;
                const bottomBubbleY = (maxY + 1.2) * planZoom;
                return (
                  <g key={`bubble_x_${gx.id}`}>
                    <circle cx={posX} cy={topBubbleY} r="13" fill="#ffffff" stroke="#0284c7" strokeWidth="2" />
                    <text x={posX} y={topBubbleY + 4} textAnchor="middle" fill="#0284c7" fontSize="11" fontWeight="bold">
                      {gx.label}
                    </text>
                    <circle cx={posX} cy={bottomBubbleY} r="13" fill="#ffffff" stroke="#0284c7" strokeWidth="2" />
                    <text x={posX} y={bottomBubbleY + 4} textAnchor="middle" fill="#0284c7" fontSize="11" fontWeight="bold">
                      {gx.label}
                    </text>
                  </g>
                );
              })}

              {/* 3. Left Grid Spans & Overall Dimensions (ระยะแกน Y) */}
              {sortedY.map((gy, idx) => {
                if (idx === 0) return null;
                const prevGy = sortedY[idx - 1];
                const y1 = prevGy.positionMeters * planZoom;
                const y2 = gy.positionMeters * planZoom;
                const span = gy.positionMeters - prevGy.positionMeters;
                const dimX = (minX - 1.2) * planZoom;

                return (
                  <g key={`span_y_${gy.id}`}>
                    <line x1={dimX} y1={y1} x2={dimX} y2={y2} stroke="#0284c7" strokeWidth="1.2" />
                    <line x1={dimX - 4} y1={y1} x2={dimX + 4} y2={y1} stroke="#0284c7" strokeWidth="1.5" />
                    <line x1={dimX - 4} y1={y2} x2={dimX + 4} y2={y2} stroke="#0284c7" strokeWidth="1.5" />
                    {(() => {
                      const midY = (y1 + y2) / 2;
                      return (
                        <g transform={`rotate(-90, ${dimX}, ${midY})`}>
                          <rect x={dimX - 22} y={midY - 8} width="44" height="16" rx="3" fill="#ffffff" stroke="#0284c7" strokeWidth="0.8" />
                          <text x={dimX} y={midY + 3} textAnchor="middle" fill="#0284c7" fontSize="9" fontWeight="bold" fontFamily="monospace">
                            {span.toFixed(2)}m
                          </text>
                        </g>
                      );
                    })()}
                  </g>
                );
              })}

              {/* Overall Total Height Dimension */}
              {sortedY.length > 1 && (() => {
                const y1 = sortedY[0].positionMeters * planZoom;
                const y2 = sortedY[sortedY.length - 1].positionMeters * planZoom;
                const dimX = (minX - 2.3) * planZoom;
                return (
                  <g>
                    <line x1={dimX} y1={y1} x2={dimX} y2={y2} stroke="#0f172a" strokeWidth="1.5" />
                    <line x1={dimX - 5} y1={y1} x2={dimX + 5} y2={y1} stroke="#0f172a" strokeWidth="2" />
                    <line x1={dimX - 5} y1={y2} x2={dimX + 5} y2={y2} stroke="#0f172a" strokeWidth="2" />
                    <rect x={dimX - 28} y={(y1 + y2) / 2 - 9} width="56" height="18" rx="4" fill="#0f172a" />
                    <text x={dimX} y={(y1 + y2) / 2 + 4} textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold" fontFamily="monospace">
                      {totalHeight.toFixed(2)}m
                    </text>
                  </g>
                );
              })()}

              {/* Left & Right Grid Bubbles (Y Axis) */}
              {sortedY.map((gy) => {
                const posY = gy.positionMeters * planZoom;
                const leftBubbleX = (minX - 3.2) * planZoom;
                const rightBubbleX = (maxX + 1.2) * planZoom;
                return (
                  <g key={`bubble_y_${gy.id}`}>
                    <circle cx={leftBubbleX} cy={posY} r="13" fill="#ffffff" stroke="#0284c7" strokeWidth="2" />
                    <text x={leftBubbleX} y={posY + 4} textAnchor="middle" fill="#0284c7" fontSize="11" fontWeight="bold">
                      {gy.label}
                    </text>
                    <circle cx={rightBubbleX} cy={posY} r="13" fill="#ffffff" stroke="#0284c7" strokeWidth="2" />
                    <text x={rightBubbleX} y={posY + 4} textAnchor="middle" fill="#0284c7" fontSize="11" fontWeight="bold">
                      {gy.label}
                    </text>
                  </g>
                );
              })}

              {/* 4. Room Boundaries & Room Name Tags (ประกอบในแปลน) */}
              {calculatedRooms.map((calc) => {
                const ptsString = calc.polyPoints
                  .map((p) => `${p.x * planZoom},${p.y * planZoom}`)
                  .join(' ');

                const tagX = calc.room.x * planZoom;
                const tagY = calc.room.y * planZoom;

                return (
                  <g key={`plan_room_${calc.room.id}`}>
                    {/* Boundary Tint */}
                    <polygon
                      points={ptsString}
                      fill="rgba(2, 132, 199, 0.04)"
                      stroke="#0284c7"
                      strokeWidth="1.2"
                      strokeDasharray="4,3"
                    />

                    {/* Room Width & Length Dimension Lines */}
                    {(() => {
                      const xMinPx = calc.xMin * planZoom;
                      const xMaxPx = calc.xMax * planZoom;
                      const yMinPx = calc.yMin * planZoom;
                      const yMaxPx = calc.yMax * planZoom;
                      const dimY = yMinPx - 10;
                      const dimX = xMinPx - 12;

                      return (
                        <g className="select-none pointer-events-none">
                          {/* Width (Horizontal) */}
                          <line x1={xMinPx} y1={dimY} x2={xMaxPx} y2={dimY} stroke="#0284c7" strokeWidth="1" strokeDasharray="2,2" />
                          <line x1={xMinPx} y1={dimY - 3} x2={xMinPx} y2={dimY + 3} stroke="#0284c7" strokeWidth="1.2" />
                          <line x1={xMaxPx} y1={dimY - 3} x2={xMaxPx} y2={dimY + 3} stroke="#0284c7" strokeWidth="1.2" />
                          <text x={(xMinPx + xMaxPx) / 2} y={dimY - 3} textAnchor="middle" fill="#0284c7" fontSize="8.5" fontWeight="bold" fontFamily="monospace" stroke="#ffffff" strokeWidth="2.5" paintOrder="stroke">
                            {calc.width.toFixed(2)}m
                          </text>

                          {/* Depth/Length (Vertical) */}
                          <line x1={dimX} y1={yMinPx} x2={dimX} y2={yMaxPx} stroke="#0284c7" strokeWidth="1" strokeDasharray="2,2" />
                          <line x1={dimX - 3} y1={yMinPx} x2={dimX + 3} y2={yMinPx} stroke="#0284c7" strokeWidth="1.2" />
                          <line x1={dimX - 3} y1={yMaxPx} x2={dimX + 3} y2={yMaxPx} stroke="#0284c7" strokeWidth="1.2" />
                          {(() => {
                            const midY = (yMinPx + yMaxPx) / 2;
                            return (
                              <g transform={`rotate(-90, ${dimX}, ${midY})`}>
                                <text x={dimX} y={midY - 4} textAnchor="middle" fill="#0284c7" fontSize="8.5" fontWeight="bold" fontFamily="monospace" stroke="#ffffff" strokeWidth="2.5" paintOrder="stroke">
                                  {calc.depth.toFixed(2)}m
                                </text>
                              </g>
                            );
                          })()}
                        </g>
                      );
                    })()}

                    {/* Room Name centered inside room without box */}
                    <text
                      x={tagX}
                      y={tagY}
                      textAnchor="middle"
                      alignmentBaseline="middle"
                      fill="#0f172a"
                      fontSize="11"
                      fontWeight="bold"
                      stroke="#ffffff"
                      strokeWidth="3"
                      paintOrder="stroke"
                    >
                      {calc.room.name}
                    </text>
                  </g>
                );
              })}

              {/* 5. Walls */}
              {floorPlan.walls.map((wall) => {
                const x1 = wall.startX * planZoom;
                const y1 = wall.startY * planZoom;
                const x2 = wall.endX * planZoom;
                const y2 = wall.endY * planZoom;
                const thickness = Math.max(2, (wall.thicknessCm / 100) * planZoom);

                return (
                  <g key={`wall_${wall.id}`}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="#0f172a"
                      strokeWidth={thickness}
                      strokeLinecap="square"
                    />
                  </g>
                );
              })}

              {/* 6. Openings (Doors / Windows) */}
              {floorPlan.openings.map((op) => {
                const wall = floorPlan.walls.find((w) => w.id === op.wallId);
                if (!wall) return null;

                const wx1 = wall.startX * planZoom;
                const wy1 = wall.startY * planZoom;
                const wx2 = wall.endX * planZoom;
                const wy2 = wall.endY * planZoom;
                const wallDX = wall.endX - wall.startX;
                const wallDY = wall.endY - wall.startY;
                const wallLen = Math.sqrt(wallDX * wallDX + wallDY * wallDY);
                const angle = (Math.atan2(wallDY, wallDX) * 180) / Math.PI;

                const opX = wx1 + (wx2 - wx1) * op.positionOnWallRatio;
                const opY = wy1 + (wy2 - wy1) * op.positionOnWallRatio;
                const opWidthPx = (op.widthCm / 100) * planZoom;
                const wallThicknessPx = (wall.thicknessCm / 100) * planZoom;

                const distToStart = op.positionOnWallRatio * wallLen - op.widthCm / 200;
                const distToEnd = (1 - op.positionOnWallRatio) * wallLen - op.widthCm / 200;
                const isCloserToStart = distToStart <= distToEnd;

                return (
                  <g key={`op_${op.id}`}>
                    {/* Distance guides to wall corners (Only closer side) */}
                    {isCloserToStart ? (
                      <text
                        x={(wx1 + opX - (wallDX / wallLen) * (opWidthPx / 2)) / 2}
                        y={(wy1 + opY - (wallDY / wallLen) * (opWidthPx / 2)) / 2}
                        fill="#64748b"
                        fontSize="7"
                        fontWeight="bold"
                        textAnchor="middle"
                        transform={`rotate(${angle}, ${(wx1 + opX - (wallDX / wallLen) * (opWidthPx / 2)) / 2}, ${(wy1 + opY - (wallDY / wallLen) * (opWidthPx / 2)) / 2}) translate(0, -4)`}
                      >
                        {distToStart.toFixed(2)}m
                      </text>
                    ) : (
                      <text
                        x={(wx2 + opX + (wallDX / wallLen) * (opWidthPx / 2)) / 2}
                        y={(wy2 + opY + (wallDY / wallLen) * (opWidthPx / 2)) / 2}
                        fill="#64748b"
                        fontSize="7"
                        fontWeight="bold"
                        textAnchor="middle"
                        transform={`rotate(${angle}, ${(wx2 + opX + (wallDX / wallLen) * (opWidthPx / 2)) / 2}, ${(wy2 + opY + (wallDY / wallLen) * (opWidthPx / 2)) / 2}) translate(0, -4)`}
                      >
                        {distToEnd.toFixed(2)}m
                      </text>
                    )}

                    {/* Opening Shape */}
                    <rect
                      x={-opWidthPx / 2}
                      y={-wallThicknessPx / 2}
                      width={opWidthPx}
                      height={wallThicknessPx}
                      fill={op.type === 'door' ? '#cbd5e1' : '#c084fc'}
                      stroke="#0f172a"
                      strokeWidth="0.8"
                      transform={`translate(${opX}, ${opY}) rotate(${angle})`}
                    />
                    <text
                      x={opX}
                      y={opY}
                      fill="#0f172a"
                      fontSize="8"
                      fontWeight="black"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${angle}, ${opX}, ${opY})`}
                    >
                      {op.label}
                    </text>
                  </g>
                );
              })}

              {/* 7. Structural Columns */}
              {floorPlan.columns.map((col) => {
                const cx = col.x * planZoom;
                const cy = col.y * planZoom;
                const cw = (col.widthCm / 100) * planZoom;
                const cd = (col.depthCm / 100) * planZoom;

                if (col.shape === 'circular') {
                  return (
                    <circle
                      key={`col_${col.id}`}
                      cx={cx}
                      cy={cy}
                      r={cw / 2}
                      fill="#0f172a"
                      stroke="#0284c7"
                      strokeWidth="1"
                    />
                  );
                }

                return (
                  <rect
                    key={`col_${col.id}`}
                    x={cx - cw / 2}
                    y={cy - cd / 2}
                    width={cw}
                    height={cd}
                    fill="#0f172a"
                    stroke="#0284c7"
                    strokeWidth="1"
                  />
                );
              })}
            </svg>
          </div>

          {/* Minimalist Architectural Title Stamp (ตารางประกอบแบบมุมขวาล่าง) */}
          <div className="w-full flex items-center justify-between border-t-2 border-slate-900 pt-2 px-1 text-[11px] font-sans text-slate-800 print:text-black">
            <div className="flex items-center gap-4">
              <div>
                <span className="font-bold text-slate-900 block text-xs">{project.name}</span>
                <span className="text-slate-600 text-[10px]">
                  แบบแสดง: ผังโครงสร้างและพื้นที่ ({floorPlan.floorName || 'ชั้น 1'}) • สูงชั้น {floorPlan.floorHeight || project.defaultFloorHeight}ม.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6 text-right">
              <div className="hidden sm:block text-[10px] text-slate-600">
                <span>สัญลักษณ์: </span>
                <span className="font-bold text-slate-900">█ เสา ค.ส.ล.</span> |{' '}
                <span className="font-bold text-slate-900">▬ ผนัง</span> |{' '}
                <span className="font-bold text-slate-900">🚪 ประตู</span> |{' '}
                <span className="font-bold text-slate-900">🪟 หน้าต่าง</span>
              </div>

              <div className="border-l border-slate-300 pl-4 text-[10px] space-y-0.5">
                <p>
                  <strong>ผู้สำรวจ:</strong> {project.surveyorName}
                </p>
                <p>
                  <strong>วันที่สำรวจ:</strong> {project.surveyDate}
                </p>
                <p className="font-mono font-bold text-sky-700">
                  <strong>พื้นที่รวมบนแปลน:</strong> {sumRoomArea.toFixed(2)} ตร.ม.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If Mode is 'report': Render Full Survey Report View with Metadata & Photo Records
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur border-none overflow-y-auto p-4 print:p-0 print:bg-white print:text-black">
      {/* Dynamic Print Orientation Style */}
      <style dangerouslySetInnerHTML={{ __html: `
        @page {
          size: A4 ${isLandscape ? 'landscape' : 'portrait'};
          margin: 10mm;
        }
        @media print {
          body { background: white !important; }
          .print-hidden { display: none !important; }
          .print-break-inside-avoid { break-inside: avoid; }
          .print-shadow-none { shadow: none !important; box-shadow: none !important; }
          .print-m-0 { margin: 0 !important; }
          .print-p-0 { padding: 0 !important; }
        }
      ` }} />

      {/* Print Controls Floating Header */}
      <div className="max-w-4xl mx-auto mb-4 bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <span className="text-sm font-bold text-slate-200 block">
              ตัวอย่างรายงานการสำรวจ (Inspection Report Preview)
            </span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">
              {isLandscape ? 'A4 Landscape' : 'A4 Portrait'} • Survey Report
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg text-xs font-bold shadow-lg transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            พิมพ์ / บันทึก PDF (Print)
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>

      {/* Printable Paper A4 Container */}
      <div className="max-w-4xl mx-auto bg-white text-slate-900 p-8 rounded-xl shadow-2xl space-y-6 font-sans print:shadow-none print:rounded-none print:p-0">
        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500 block">
              STRUCTURAL & HERITAGE SURVEY REPORT
            </span>
            <h1 className="text-xl font-extrabold text-slate-900 mt-0.5">
              รายงานผลการสำรวจและตรวจสอบสภาพโครงสร้างอาคาร
            </h1>
            <p className="text-xs text-slate-600 mt-1 font-semibold">{project.name}</p>
          </div>

          <div className="text-right text-xs space-y-1 font-mono">
            <p className="text-slate-700 font-bold">วันที่สำรวจ: {project.surveyDate}</p>
          </div>
        </div>

        {/* Section 1: Metadata */}
        <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="space-y-1.5">
            <p>
              <strong className="text-slate-700">ชื่ออาคาร/โครงการ:</strong> {project.name}
            </p>
            <p>
              <strong className="text-slate-700">ประเภทโครงสร้าง:</strong> {project.buildingType}
            </p>
            <p>
              <strong className="text-slate-700">จำนวนชั้น:</strong> {project.floorCount} ชั้น (ความสูงชั้น {floorPlan.floorHeight || project.defaultFloorHeight}m)
            </p>
          </div>

          <div className="space-y-1.5">
            <p>
              <strong className="text-slate-700">วิศวกรผู้สำรวจ:</strong> {project.surveyorName}
            </p>
            <p>
              <strong className="text-slate-700">พิกัด GPS ตำแหน่งอาคาร:</strong> Lat {project.gps.lat.toFixed(5)}, Lng {project.gps.lng.toFixed(5)}
            </p>
            <p>
              <strong className="text-slate-700">สถานที่ตั้ง:</strong> {project.address}
            </p>
          </div>
        </div>

        {/* Section 1.5: Room details & calculated areas */}
        {calculatedRooms.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-bold border-b border-slate-300 pb-1 text-slate-800">
              ข้อมูลรายห้องและระดับความสูงฝ้าเพดาน (Room Space & Ceiling Height Breakdown)
            </h3>
            <table className="w-full text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-800">
                  <th className="border border-slate-300 p-2 text-left">ชื่อห้อง</th>
                  <th className="border border-slate-300 p-2 text-center w-24">ระดับฝ้า (ม.)</th>
                  <th className="border border-slate-300 p-2 text-center w-28">พื้นที่พื้น (ตร.ม.)</th>
                  <th className="border border-slate-300 p-2 text-center w-28">พื้นที่ฝ้า (ตร.ม.)</th>
                  <th className="border border-slate-300 p-2 text-center w-32">พื้นที่ผนังดิบ (ตร.ม.)</th>
                  <th className="border border-slate-300 p-2 text-center w-32">พื้นที่ผนังสุทธิ (ตร.ม.)</th>
                </tr>
              </thead>
              <tbody>
                {calculatedRooms.map((calc) => (
                  <tr key={calc.room.id} className="border-b border-slate-200">
                    <td className="border border-slate-300 p-2 font-semibold text-slate-800">
                      <div>{calc.room.name}</div>
                      <div className="text-[10px] text-slate-500 font-normal">
                        ขนาด {calc.width.toFixed(2)} x {calc.depth.toFixed(2)}m
                      </div>
                    </td>
                    <td className="border border-slate-300 p-2 text-center font-mono">+{calc.ceilingHeight.toFixed(2)} m</td>
                    <td className="border border-slate-300 p-2 text-center font-mono font-bold text-sky-700">{calc.floorArea.toFixed(2)} m²</td>
                    <td className="border border-slate-300 p-2 text-center font-mono text-slate-700">{calc.ceilingArea.toFixed(2)} m²</td>
                    <td className="border border-slate-300 p-2 text-center font-mono text-slate-800">{calc.grossWallArea.toFixed(2)} m²</td>
                    <td className="border border-slate-300 p-2 text-center font-mono text-slate-900 font-bold">{calc.netWallArea.toFixed(2)} m²</td>
                  </tr>
                ))}
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                  <td className="border border-slate-300 p-2 text-slate-900 text-right">รวมทั้งหมด (Total)</td>
                  <td className="border border-slate-300 p-2 text-center text-slate-400">-</td>
                  <td className="border border-slate-300 p-2 text-center font-mono text-sky-700">{sumRoomArea.toFixed(2)} m²</td>
                  <td className="border border-slate-300 p-2 text-center font-mono text-slate-900">{sumRoomArea.toFixed(2)} m²</td>
                  <td className="border border-slate-300 p-2 text-center font-mono text-slate-900">
                    {calculatedRooms.reduce((acc, r) => acc + r.grossWallArea, 0).toFixed(2)} m²
                  </td>
                  <td className="border border-slate-300 p-2 text-center font-mono text-slate-900">
                    {calculatedRooms.reduce((acc, r) => acc + r.netWallArea, 0).toFixed(2)} m²
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Section 2: Photo Attachments */}
        {displayPhotos.length > 0 && (
          <div className="space-y-6 pt-4">
            <h3 className="text-sm font-bold border-b border-slate-300 pb-1 text-slate-800 flex items-center gap-2">
              <Camera className="w-4 h-4 text-sky-600" />
              ภาพถ่ายการสำรวจพื้นที่ (Survey Photo Records)
            </h3>
            
            <div className="grid grid-cols-2 gap-8">
              {displayPhotos.map((photo, idx) => (
                <div key={photo.id} className="print-break-inside-avoid space-y-3 border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
                  <div className="aspect-[4/3] bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-slate-100">
                    <img src={photo.url} alt={photo.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-[13px] font-bold text-slate-800">รูปที่ {idx + 1}: {photo.title || 'ไม่มีชื่อ'}</h4>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-rose-500" />
                        <span>พิกัดบนแปลน: ({photo.x.toFixed(2)}, {photo.y.toFixed(2)})</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

