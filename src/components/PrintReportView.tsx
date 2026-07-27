import React from 'react';
import {
  SurveyProject,
  FloorPlanData,
  PhotoRecord,
} from '../types';
import { Printer, Building, MapPin, Calendar, User, ShieldAlert, X, Camera } from 'lucide-react';

interface PrintReportViewProps {
  project: SurveyProject;
  floorPlan: FloorPlanData;
  photos: PhotoRecord[];
  onClose: () => void;
  mode?: 'report' | 'plan';
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
  const totalWidth = sortedX.length > 0 ? sortedX[sortedX.length - 1].positionMeters - sortedX[0].positionMeters : 0;
  const sortedY = [...floorPlan.gridY].sort((a, b) => a.positionMeters - b.positionMeters);
  const totalHeight = sortedY.length > 0 ? sortedY[sortedY.length - 1].positionMeters - sortedY[0].positionMeters : 0;
  const isLandscape = totalWidth > totalHeight;

  // Zoom/Scale for PDF preview (adjust meters to pixels)
  const reportZoom = 35; // 35 pixels per meter for the report view
  const padding = 60; // Padding around the plan in pixels
  const svgWidth = Math.max(300, Math.round(totalWidth * reportZoom + padding * 2));
  const svgHeight = Math.max(300, Math.round(totalHeight * reportZoom + padding * 2));

  const minX = sortedX.length > 0 ? sortedX[0].positionMeters : 0;
  const minY = sortedY.length > 0 ? sortedY[0].positionMeters : 0;

  // Extract photos from defect pins
  const pinPhotos = floorPlan.defectPins
    .filter(pin => pin.photoUrl)
    .map(pin => ({
      id: pin.id,
      url: pin.photoUrl!,
      title: pin.title,
      description: pin.description,
      timestamp: new Date().toISOString(),
      x: pin.x,
      y: pin.y
    }));

  // Combine or choose photos source
  const displayPhotos = mode === 'report' ? pinPhotos : photos;

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

      {/* Print Controls Floating Header (Hidden when printing) */}
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
              {mode === 'plan' ? 'ตัวอย่างแปลนโครงสร้าง (Structural Plan Preview)' : 'ตัวอย่างรายงานการสำรวจ (Inspection Report Preview)'}
            </span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">
              {isLandscape ? 'A4 Landscape' : 'A4 Portrait'} • {mode === 'plan' ? 'Structural Plan' : 'Survey Report'}
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
        {floorPlan.roomPins && floorPlan.roomPins.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-bold border-b border-slate-300 pb-1 text-slate-800">
              ข้อมูลรายห้องและระดับความสูงฝ้าเพดาน (Room Space & Ceiling Height Breakdown)
            </h3>
            <table className="w-full text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-800">
                  <th className="border border-slate-300 p-2 text-left">ชื่อห้อง</th>
                  <th className="border border-slate-300 p-2 text-center w-28">ความสูงฝ้า (ม.)</th>
                  <th className="border border-slate-300 p-2 text-center w-28">พื้นที่พื้น (ตร.ม.)</th>
                  <th className="border border-slate-300 p-2 text-center w-28">พื้นที่ฝ้า (ตร.ม.)</th>
                  <th className="border border-slate-300 p-2 text-center w-36">พื้นที่ผนังสุทธิ (ตร.ม.)</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let sumFloorArea = 0;
                  let sumCeilingArea = 0;
                  let sumNetWallArea = 0;

                  const rows = floorPlan.roomPins.map((room) => {
                    // Re-calculate room dimensions using actual enclosing walls when auto calculated
                    let width = room.customWidth || 4.0;
                    let depth = room.customDepth || 4.0;
                    let xMin = room.x - width / 2;
                    let xMax = room.x + width / 2;
                    let yMin = room.y - depth / 2;
                    let yMax = room.y + depth / 2;

                    if (room.isAutoCalculated) {
                      const sortedGridX = [...floorPlan.gridX].sort((a, b) => a.positionMeters - b.positionMeters);
                      const sortedGridY = [...floorPlan.gridY].sort((a, b) => a.positionMeters - b.positionMeters);

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

                        // 1. Check intersection with horizontal line y = room.y
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

                        // 2. Check intersection with vertical line x = room.x
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

                    const roomShape = room.roomShape || 'rectangle';
                    const indentWidth = room.indentWidth || 0;
                    const indentDepth = room.indentDepth || 0;
                    const widthOffset = room.widthOffset || 0;
                    const depthOffset = room.depthOffset || 0;
                    const areaOffset = room.areaOffset || 0;
                    const wallLengthOffset = room.wallLengthOffset || 0;

                    width = Math.max(0.1, width + widthOffset);
                    depth = Math.max(0.1, depth + depthOffset);

                    let baseArea = width * depth + areaOffset;
                    let perimeter = 2 * (width + depth);

                    if (roomShape === 'l_shape') {
                      baseArea = baseArea - (indentWidth * indentDepth);
                    } else if (roomShape === 't_shape') {
                      baseArea = baseArea - (2 * indentWidth * indentDepth);
                    }

                    const floorArea = Math.max(0.1, baseArea);
                    const ceilingArea = floorArea;

                    const adjustedPerimeter = Math.max(0.5, perimeter + wallLengthOffset);
                    const grossWallArea = adjustedPerimeter * room.floorHeight;

                    let subtractedArea = 0;
                    floorPlan.openings.forEach((op) => {
                      const wall = floorPlan.walls.find(w => w.id === op.wallId);
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

                    sumFloorArea += floorArea;
                    sumCeilingArea += ceilingArea;
                    sumNetWallArea += netWallArea;

                    let shapeName = 'สี่เหลี่ยม';
                    if (roomShape === 'l_shape') shapeName = `รูปตัว L (ขยัก ${indentWidth}x${indentDepth}m)`;
                    if (roomShape === 't_shape') shapeName = `รูปตัว T (ขยัก ${indentWidth}x${indentDepth}m)`;
                    if (areaOffset !== 0) shapeName += ` [ชดเชยพื้นที่ ${areaOffset > 0 ? '+' : ''}${areaOffset} ตร.ม.]`;

                    return (
                      <tr key={room.id} className="border-b border-slate-200">
                        <td className="border border-slate-300 p-2 font-semibold text-slate-800">
                          <div>{room.name}</div>
                          <div className="text-[10px] text-slate-500 font-normal">{shapeName} • {width.toFixed(2)}x{depth.toFixed(2)}m</div>
                        </td>
                        <td className="border border-slate-300 p-2 text-center font-mono">{room.floorHeight.toFixed(2)} m</td>
                        <td className="border border-slate-300 p-2 text-center font-mono">{floorArea.toFixed(2)} m²</td>
                        <td className="border border-slate-300 p-2 text-center font-mono">{ceilingArea.toFixed(2)} m²</td>
                        <td className="border border-slate-300 p-2 text-center font-mono font-bold text-orange-600">{netWallArea.toFixed(2)} m²</td>
                      </tr>
                    );
                  });

                  return (
                    <>
                      {rows}
                      <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                        <td className="border border-slate-300 p-2 text-slate-900 text-right">รวมทั้งหมด (Total)</td>
                        <td className="border border-slate-300 p-2 text-center text-slate-400">-</td>
                        <td className="border border-slate-300 p-2 text-center font-mono text-slate-900">{sumFloorArea.toFixed(2)} m²</td>
                        <td className="border border-slate-300 p-2 text-center font-mono text-slate-900">{sumCeilingArea.toFixed(2)} m²</td>
                        <td className="border border-slate-300 p-2 text-center font-mono font-bold text-orange-600">{sumNetWallArea.toFixed(2)} m²</td>
                      </tr>
                    </>
                  );
                })()}
              </tbody>
            </table>
          </div>
        )}

        {/* Section 2: Structural Floor Plan Overview (Only in Plan mode) */}
        {mode === 'plan' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold border-b border-slate-300 pb-1 text-slate-800 flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-600" />
              2. ผังโครงสร้างและระยะลายกริด (Structural Grid & Floor Plan)
            </h3>
            
            <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col items-center min-h-[400px] justify-center overflow-hidden print:border-none print:shadow-none">
              <svg 
                width={svgWidth} 
                height={svgHeight} 
                viewBox={`${minX * reportZoom - padding} ${minY * reportZoom - padding} ${svgWidth} ${svgHeight}`}
                className="max-w-full max-h-full drop-shadow-md bg-white"
              >
                {/* Background Grid Lines (Subtle) */}
                {floorPlan.gridX.map(gx => (
                  <line key={gx.id} x1={gx.positionMeters * reportZoom} y1={minY * reportZoom - 20} x2={gx.positionMeters * reportZoom} y2={(minY + totalHeight) * reportZoom + 20} stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="2,2" />
                ))}
                {floorPlan.gridY.map(gy => (
                  <line key={gy.id} x1={minX * reportZoom - 20} y1={gy.positionMeters * reportZoom} x2={(minX + totalWidth) * reportZoom + 20} y2={gy.positionMeters * reportZoom} stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="2,2" />
                ))}

                {/* Walls */}
                {floorPlan.walls.map(wall => {
                  const x1 = wall.startX * reportZoom;
                  const y1 = wall.startY * reportZoom;
                  const x2 = wall.endX * reportZoom;
                  const y2 = wall.endY * reportZoom;
                  const thickness = (wall.thicknessCm / 100) * reportZoom;
                  return (
                    <line key={wall.id} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1e293b" strokeWidth={thickness} strokeLinecap="square" />
                  );
                })}

                {/* Openings (Doors/Windows) with thickness matching wall */}
                {floorPlan.openings.map(op => {
                  const wall = floorPlan.walls.find(w => w.id === op.wallId);
                  if (!wall) return null;
                  
                  const wx1 = wall.startX * reportZoom;
                  const wy1 = wall.startY * reportZoom;
                  const wx2 = wall.endX * reportZoom;
                  const wy2 = wall.endY * reportZoom;
                  const wallDX = wall.endX - wall.startX;
                  const wallDY = wall.endY - wall.startY;
                  const wallLen = Math.sqrt(wallDX * wallDX + wallDY * wallDY);
                  const angle = (Math.atan2(wallDY, wallDX) * 180) / Math.PI;

                  const opX = wx1 + (wx2 - wx1) * op.positionOnWallRatio;
                  const opY = wy1 + (wy2 - wy1) * op.positionOnWallRatio;
                  const opWidthPx = (op.widthCm / 100) * reportZoom;
                  const wallThicknessPx = (wall.thicknessCm / 100) * reportZoom;
                  
                  const distToStart = (op.positionOnWallRatio * wallLen) - ((op.widthCm / 100) / 2);
                  const distToEnd = ((1 - op.positionOnWallRatio) * wallLen) - ((op.widthCm / 100) / 2);

                  return (
                    <g key={op.id}>
                      <line x1={wx1} y1={wy1} x2={opX - (wallDX/wallLen)*(opWidthPx/2)} y2={opY - (wallDY/wallLen)*(opWidthPx/2)} stroke="#94a3b8" strokeWidth="0.7" strokeDasharray="2,1" />
                      <line x1={wx2} y1={wy2} x2={opX + (wallDX/wallLen)*(opWidthPx/2)} y2={opY + (wallDY/wallLen)*(opWidthPx/2)} stroke="#94a3b8" strokeWidth="0.7" strokeDasharray="2,1" />
                      
                      <text x={(wx1 + opX - (wallDX/wallLen)*(opWidthPx/2))/2} y={(wy1 + opY - (wallDY/wallLen)*(opWidthPx/2))/2} fill="#64748b" fontSize="7" fontWeight="bold" textAnchor="middle" transform={`rotate(${angle}, ${(wx1 + opX - (wallDX/wallLen)*(opWidthPx/2))/2}, ${(wy1 + opY - (wallDY/wallLen)*(opWidthPx/2))/2}) translate(0, -5)`}>{distToStart.toFixed(2)}m</text>
                      <text x={(wx2 + opX + (wallDX/wallLen)*(opWidthPx/2))/2} y={(wy2 + opY + (wallDY/wallLen)*(opWidthPx/2))/2} fill="#64748b" fontSize="7" fontWeight="bold" textAnchor="middle" transform={`rotate(${angle}, ${(wx2 + opX + (wallDX/wallLen)*(opWidthPx/2))/2}, ${(wy2 + opY + (wallDY/wallLen)*(opWidthPx/2))/2}) translate(0, -5)`}>{distToEnd.toFixed(2)}m</text>

                      <rect 
                        x={-opWidthPx / 2} 
                        y={-wallThicknessPx / 2} 
                        width={opWidthPx} 
                        height={wallThicknessPx} 
                        fill={op.type === 'door' ? '#94a3b8' : '#a855f7'} 
                        stroke="#1e293b" 
                        strokeWidth="0.5"
                        transform={`translate(${opX}, ${opY}) rotate(${angle})`}
                      />
                      <text 
                        x={opX} 
                        y={opY} 
                        fill={op.type === 'door' ? '#1e293b' : '#ffffff'} 
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

                {/* Columns */}
                {floorPlan.columns.map(col => (
                  <rect key={col.id} x={(col.x - col.widthCm / 200) * reportZoom} y={(col.y - col.depthCm / 200) * reportZoom} width={(col.widthCm / 100) * reportZoom} height={(col.depthCm / 100) * reportZoom} fill="#1e293b" />
                ))}

                {/* Grid Labels */}
                {floorPlan.gridX.map(gx => (
                  <text key={gx.id} x={gx.positionMeters * reportZoom} y={minY * reportZoom - 25} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#1e293b">{gx.label}</text>
                ))}
                {floorPlan.gridY.map(gy => (
                  <text key={gy.id} x={minX * reportZoom - 25} y={gy.positionMeters * reportZoom + 4} textAnchor="end" fontSize="10" fontWeight="bold" fill="#1e293b">{gy.label}</text>
                ))}
              </svg>
            </div>
          </div>
        )}

        {/* Section 4: Photo Attachments (Show only in Report mode) */}
        {mode === 'report' && displayPhotos.length > 0 && (
          <div className="space-y-6 pt-4">
            <h3 className="text-sm font-bold border-b border-slate-300 pb-1 text-slate-800 flex items-center gap-2">
              <Camera className="w-4 h-4 text-sky-600" />
              2. บันทึกภาพถ่ายการสำรวจพื้นที่ (Survey Photo Records)
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
