import { FloorPlanData } from '../types';
import DxfWriter from 'dxf-writer';
import { jsPDF } from 'jspdf';


export const exportCanvasToPDF = async (floorPlan: FloorPlanData, filename: string = 'floorplan.pdf') => {
  let minX = -2;
  let minY = -2;
  let maxX = (floorPlan.gridX[floorPlan.gridX.length - 1]?.positionMeters || 10) + 2;
  let maxY = (floorPlan.gridY[floorPlan.gridY.length - 1]?.positionMeters || 10) + 2;

  const widthM = maxX - minX;
  const heightM = maxY - minY;

  const scale = 25; // 25pt per meter
  const margin = 40;
  
  const pdfW = widthM * scale + margin * 2;
  const pdfH = heightM * scale + margin * 2;

  const pdf = new jsPDF({
    orientation: pdfW > pdfH ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [pdfW, pdfH]
  });

  const tx = (x: number) => margin + (x - minX) * scale;
  const ty = (y: number) => margin + (y - minY) * scale;

  // Background
  pdf.setFillColor(30, 41, 59);
  pdf.rect(0, 0, pdfW, pdfH, 'F');

  // Grid
  pdf.setDrawColor(71, 85, 105);
  pdf.setLineDashPattern([5, 5], 0);
  pdf.setLineWidth(1);

  floorPlan.gridX.forEach(g => {
    pdf.line(tx(g.positionMeters), ty(-1), tx(g.positionMeters), ty(maxY - 1));
  });

  floorPlan.gridY.forEach(g => {
    pdf.line(tx(-1), ty(g.positionMeters), tx(maxX - 1), ty(g.positionMeters));
  });

  pdf.setLineDashPattern([], 0);

  // Walls
  floorPlan.walls.forEach(wall => {
    const thickness = (wall.thicknessCm / 100) * scale;
    pdf.setLineWidth(thickness);
    
    let strokeColor = [203, 213, 225];
    if (wall.material === 'half_brick') strokeColor = [251, 146, 60];
    if (wall.material === 'aac_block') strokeColor = [56, 189, 248];
    if (wall.material === 'timber_board') strokeColor = [217, 119, 6];
    if (wall.condition === 'structural_crack') strokeColor = [239, 68, 68];
    
    pdf.setDrawColor(strokeColor[0], strokeColor[1], strokeColor[2]);
    pdf.line(tx(wall.startX), ty(wall.startY), tx(wall.endX), ty(wall.endY));
  });

  // Openings
  pdf.setLineWidth(1);
  floorPlan.openings.forEach(op => {
    const parentWall = floorPlan.walls.find(w => w.id === op.wallId);
    if (!parentWall) return;

    const wx1 = parentWall.startX;
    const wy1 = parentWall.startY;
    const wx2 = parentWall.endX;
    const wy2 = parentWall.endY;

    const dx = wx2 - wx1;
    const dy = wy2 - wy1;

    const opX = wx1 + dx * op.positionOnWallRatio;
    const opY = wy1 + dy * op.positionOnWallRatio;

    const isDoor = op.type === 'door';
    pdf.setDrawColor(255, 255, 255);
    pdf.setFillColor(isDoor ? 2 : 16, isDoor ? 132 : 185, isDoor ? 199 : 129);
    
    const opWidth = (op.widthCm / 100) * scale;
    
    pdf.rect(tx(opX) - opWidth/2, ty(opY) - 5, opWidth, 10, 'DF');
    
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255);
    pdf.text(`${op.label} (${op.widthCm}x${op.heightCm})`, tx(opX), ty(opY) + 15, { align: 'center' });
  });

  // Columns
  pdf.setDrawColor(0, 0, 0);
  
  floorPlan.columns.forEach(col => {
    const x = tx(col.x);
    const y = ty(col.y);
    const w = (col.widthCm / 100) * scale;
    const d = (col.depthCm / 100) * scale;
    
    let fillColor = [2, 132, 199];
    if (col.material === 'Steel') fillColor = [99, 102, 241];
    if (col.material === 'Timber') fillColor = [217, 119, 6];
    if (col.material === 'Masonry') fillColor = [234, 88, 12];
    if (col.condition === 'critical_spalling') fillColor = [220, 38, 38];

    pdf.setFillColor(fillColor[0], fillColor[1], fillColor[2]);

    if (col.shape === 'circular') {
      pdf.circle(x, y, w/2, 'DF');
    } else {
      pdf.rect(x - w/2, y - d/2, w, d, 'DF');
    }
    
    pdf.setFontSize(8);
    pdf.setTextColor(226, 232, 240);
    const label = col.gridXLabel && col.gridYLabel !== 'custom'
      ? `${col.gridXLabel}${col.gridYLabel}`
      : `${col.widthCm}x${col.depthCm}`;
      
    pdf.text(label, x, y + d/2 + 10, { align: 'center' });
  });

    // Defect Pins
  floorPlan.defectPins.forEach(def => {
    const x = tx(def.x);
    const y = ty(def.y);
    
    pdf.setFillColor(244, 63, 94); // Rose-500
    pdf.circle(x, y, 10, 'DF');
    pdf.setDrawColor(255, 255, 255);
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.text("!", x, y + 3, { align: 'center' });
  });

  pdf.save(filename);
};

export const exportFloorPlanToDXF = (floorPlan: FloorPlanData, filename: string = 'floorplan.dxf') => {
  const dxf = new DxfWriter();

  dxf.addLayer('GRID', 8, 'DASHED');
  dxf.addLayer('COLUMNS', DxfWriter.ACI.RED, 'CONTINUOUS');
  dxf.addLayer('WALLS', DxfWriter.ACI.GREEN, 'CONTINUOUS');
  dxf.addLayer('OPENINGS', DxfWriter.ACI.YELLOW, 'CONTINUOUS');
  dxf.addLayer('DEFECTS', DxfWriter.ACI.MAGENTA, 'CONTINUOUS');

  const scale = 1000;

  dxf.setActiveLayer('GRID');
  floorPlan.gridX.forEach(g => {
    dxf.drawLine(g.positionMeters * scale, 5 * scale, g.positionMeters * scale, -(floorPlan.gridY[floorPlan.gridY.length - 1]?.positionMeters || 10) * scale - 5 * scale);
  });

  floorPlan.gridY.forEach(g => {
    dxf.drawLine(-5 * scale, -g.positionMeters * scale, (floorPlan.gridX[floorPlan.gridX.length - 1]?.positionMeters || 10) * scale + 5 * scale, -g.positionMeters * scale);
  });

  dxf.setActiveLayer('COLUMNS');
  floorPlan.columns.forEach(col => {
    const x = col.x * scale;
    const y = -col.y * scale;
    const w = (col.widthCm / 100) * scale;
    const d = (col.depthCm / 100) * scale;
    if (col.shape === 'circular') {
       dxf.drawCircle(x, y, w/2);
    } else {
       dxf.drawPolyline([
         [x - w/2, y - d/2],
         [x + w/2, y - d/2],
         [x + w/2, y + d/2],
         [x - w/2, y + d/2]
       ], true);
    }
  });

  dxf.setActiveLayer('WALLS');
  floorPlan.walls.forEach(wall => {
    const x1 = wall.startX * scale;
    const y1 = -wall.startY * scale;
    const x2 = wall.endX * scale;
    const y2 = -wall.endY * scale;
    const thickness = (wall.thicknessCm / 100) * scale;
    
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = len === 0 ? 0 : dx / len;
    const ny = len === 0 ? 0 : dy / len;
    
    const px = -ny * (thickness / 2);
    const py = nx * (thickness / 2);
    
    dxf.drawPolyline([
      [x1 + px, y1 + py],
      [x2 + px, y2 + py],
      [x2 - px, y2 - py],
      [x1 - px, y1 - py]
    ], true);
  });

  dxf.setActiveLayer('OPENINGS');
  floorPlan.openings.forEach(op => {
    const parentWall = floorPlan.walls.find(w => w.id === op.wallId);
    if (!parentWall) return;

    const wx1 = parentWall.startX * scale;
    const wy1 = -parentWall.startY * scale;
    const wx2 = parentWall.endX * scale;
    const wy2 = -parentWall.endY * scale;

    const dx = wx2 - wx1;
    const dy = wy2 - wy1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = len === 0 ? 0 : dx / len;
    const ny = len === 0 ? 0 : dy / len;

    const opX = wx1 + dx * op.positionOnWallRatio;
    const opY = wy1 + dy * op.positionOnWallRatio;

    const opWidth = (op.widthCm / 100) * scale;
    const wallThick = (parentWall.thicknessCm / 100) * scale;
    const opThick = wallThick + 50;

    const px = -ny * (opThick / 2);
    const py = nx * (opThick / 2);
    
    const p1x = opX - nx * (opWidth / 2);
    const p1y = opY - ny * (opWidth / 2);
    const p2x = opX + nx * (opWidth / 2);
    const p2y = opY + ny * (opWidth / 2);

    dxf.drawPolyline([
      [p1x + px, p1y + py],
      [p2x + px, p2y + py],
      [p2x - px, p2y - py],
      [p1x - px, p1y - py]
    ], true);
    
    const labelStr = `${op.label} (${op.widthCm}x${op.heightCm})`;
    dxf.drawText(opX, opY + 200, 150, 0, labelStr, 'center', 'middle');
  });

  const dxfString = dxf.toDxfString();
  const blob = new Blob([dxfString], { type: 'application/dxf' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
