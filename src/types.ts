export interface GPSCoords {
  lat: number;
  lng: number;
  altitude?: number;
  accuracy?: number;
}

export type BuildingType =
  | 'old_house'
  | 'historic_timber'
  | 'rc_commercial'
  | 'masonry_brick'
  | 'half_wood_half_rc'
  | 'heritage_monument'
  | 'other';

export interface SurveyProject {
  id: string;
  name: string;
  code?: string;
  buildingType: BuildingType;
  yearBuilt?: number;
  floorCount: number;
  totalAreaSqM: number;
  surveyorName: string;
  surveyDate: string;
  address: string;
  gps: GPSCoords; // บันทึก GPS เฉพาะสถานที่
  defaultFloorHeight: number; // ความสูงชั้น (เมตร)
  defaultCeilingHeight: number; // ความสูงฝ้าเริ่มต้น (เมตร)
  notes: string;
  status: 'in_progress' | 'completed' | 'urgent_review';
  createdAt: string;
  updatedAt: string;
}

export interface GridLineX {
  id: string;
  label: string; // e.g., 'A', 'B', 'C', 'D'
  positionMeters: number; // Distance in meters from Grid A (0)
}

export interface GridLineY {
  id: string;
  label: string; // e.g., '1', '2', '3', '4'
  positionMeters: number; // Distance in meters from Grid 1 (0)
}

export type ColumnMaterial = 'RC' | 'Steel' | 'Timber' | 'Masonry';
export type ColumnShape = 'rectangular' | 'circular';

export interface ColumnItem {
  id: string;
  gridXLabel: string; // e.g. "A"
  gridYLabel: string; // e.g. "1"
  x: number; // x position in meters
  y: number; // y position in meters
  widthCm: number; // เสากว้าง (ซม.) e.g. 20, 30, 40
  depthCm: number; // เสาลึก (ซม.) e.g. 20, 30, 40
  shape: ColumnShape;
  material: ColumnMaterial;
  condition: 'good' | 'minor_defect' | 'severe_crack' | 'critical_spalling';
  notes?: string;
}

export type WallMaterial =
  | 'half_brick' // ผนังอิฐครึ่งแผ่น (10 cm)
  | 'full_brick' // ผนังอิฐเต็มแผ่น (20 cm)
  | 'aac_block' // ผนังอิฐมวลเบา (7.5-10 cm)
  | 'timber_board' // ผนังไม้กระดาน
  | 'lightweight_drywall'; // ผนังเบา

export interface WallItem {
  id: string;
  startColId?: string;
  endColId?: string;
  startX: number; // position in meters
  startY: number;
  endX: number;
  endY: number;
  thicknessCm: number; // ความหนาผนัง (ซม.) e.g., 10, 20
  material: WallMaterial;
  condition: 'good' | 'hairline_cracks' | 'structural_crack' | 'dampness' | 'tilted';
  notes?: string;
}

export type OpeningType = 'door' | 'window';

export interface OpeningItem {
  id: string;
  wallId: string;
  type: OpeningType;
  positionOnWallRatio: number; // 0.0 to 1.0 along wall vector
  widthCm: number; // ความกว้าง (ซม.)
  heightCm: number; // ความสูง (ซม.)
  sillHeightCm: number; // ความสูงจากพื้นถึงขอบล่างหน้าต่าง (ซม.) - ความสูงสเต็ป/ธรณี
  label: string; // e.g., "D1", "D2", "W1", "W2"
  materialType?: string; // e.g. ไม้สักโบราณ, อลูมิเนียม, เหล็กดัด
  notes?: string;
}

export interface DefectPin {
  id: string;
  x: number; // Canvas x in meters
  y: number; // Canvas y in meters
  category: 'foundation' | 'column' | 'beam' | 'slab' | 'wall' | 'roof' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  photoId?: string;
  photoUrl?: string;
}

export interface RoomPin {
  id: string;
  x: number; // พิกัด X (เมตร)
  y: number; // พิกัด Y (เมตร)
  name: string; // ชื่อห้อง เช่น ห้องนอน, ห้องน้ำ
  floorHeight: number; // ระดับความสูงชั้น (เมตร) แยกรายห้อง
  ceilingHeight?: number; // ระดับความสูงฝ้า (เมตร) แยกรายห้อง
  isAutoCalculated: boolean; // คำนวณขนาดอัตโนมัติจากกริดลายล้อมรอบ
  customWidth?: number; // ความกว้างระบุเอง (เมตร)
  customDepth?: number; // ความลึกระบุเอง (เมตร)
  roomShape?: 'rectangle' | 'l_shape' | 't_shape'; // รูปทรงห้อง (กรณีผนังมีขยัก)
  indentWidth?: number; // ความกว้างของรอยขยัก (เมตร)
  indentDepth?: number; // ความลึกของรอยขยัก (เมตร)
  widthOffset?: number; // ปรับเพิ่ม/ลดความกว้างห้องด้วยตนเอง (เมตร)
  depthOffset?: number; // ปรับเพิ่ม/ลดความลึกห้องด้วยตนเอง (เมตร)
  areaOffset?: number; // ปรับเพิ่ม/ลดพื้นที่ห้องด้วยตนเอง (ตร.ม.)
  wallLengthOffset?: number; // ปรับเพิ่ม/ลดความยาวผนัง/เส้นรอบรูปด้วยตนเอง (เมตร)
}

export interface FloorPlanData {
  floorId: string; // e.g., "floor_1"
  floorName: string; // e.g., "ชั้น 1 (Ground Floor)"
  floorHeight: number; // ความสูงชั้น (เมตร) e.g., 2.80, 3.20, 3.80
  ceilingHeight: number; // ความสูงฝ้าเพดาน (เมตร)
  gridX: GridLineX[];
  gridY: GridLineY[];
  columns: ColumnItem[];
  walls: WallItem[];
  openings: OpeningItem[];
  defectPins: DefectPin[];
  roomPins?: RoomPin[];
}

export type DefectSeverity = 'good' | 'minor' | 'moderate' | 'severe' | 'critical';

export interface PhotoAnnotation {
  id: string;
  type: 'box' | 'arrow' | 'text';
  x: number; // percentage 0-100
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
}

export interface PhotoRecord {
  id: string;
  url: string;
  title: string;
  category: 'exterior' | 'column' | 'beam' | 'wall' | 'foundation' | 'roof' | 'interior';
  gps?: GPSCoords;
  timestamp: string;
  defectSeverity: DefectSeverity;
  notes: string;
  annotations: PhotoAnnotation[];
}
