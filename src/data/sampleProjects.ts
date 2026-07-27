import { SurveyProject, FloorPlanData, PhotoRecord } from '../types';

export const SAMPLE_PROJECT_1: {
  project: SurveyProject;
  floorPlan: FloorPlanData;
  photos: PhotoRecord[];
} = {
  project: {
    id: 'proj_charoen_krung_55',
    name: 'อาคารพาณิชย์ คสล. โบราณ ถนนเจริญกรุง',
    code: 'SRV-2026-CK55',
    buildingType: 'rc_commercial',
    yearBuilt: 1971, // อายุประมาณ 55 ปี
    floorCount: 3,
    totalAreaSqM: 280,
    surveyorName: 'นายวิศวกร สำรวจไทย (วส. 45892)',
    surveyDate: '2026-07-25',
    address: '1248/12 ถนนเจริญกรุง แขวงบางรัก เขตบางรัก กรุงเทพมหานคร 10500',
    gps: {
      lat: 13.72345,
      lng: 100.51482,
      altitude: 4.2,
      accuracy: 2.5,
    },
    defaultFloorHeight: 3.5,
    defaultCeilingHeight: 3.2, // ความสูงฝ้าเพดานชั้น 1 คือ 3.20 เมตร
    notes: 'อาคารพาณิชย์ 3 ชั้น โครงสร้างคอนกรีตเสริมเหล็ก ยุคปูนซีเมนต์สยาม พบรอยร้าวเฉือนบริเวณหัวคานชั้น 1 และคอนกรีตเสากระเทาะเห็นเหล็กเสริมสนิมดัน',
    status: 'urgent_review',
    createdAt: '2026-07-20T09:00:00Z',
    updatedAt: '2026-07-25T14:30:00Z',
  },
  floorPlan: {
    floorId: 'floor_1',
    floorName: 'ชั้น 1 (Ground Floor - โถงหน้าร้านและส่วนทำงาน)',
    floorHeight: 3.5,
    ceilingHeight: 3.2, // ความสูงฝ้าเพดาน 3.20 เมตร
    gridX: [
      { id: 'gx_A', label: 'A', positionMeters: 0 },
      { id: 'gx_B', label: 'B', positionMeters: 4.0 },
      { id: 'gx_C', label: 'C', positionMeters: 8.0 },
      { id: 'gx_D', label: 'D', positionMeters: 12.0 },
    ],
    gridY: [
      { id: 'gy_1', label: '1', positionMeters: 0 },
      { id: 'gy_2', label: '2', positionMeters: 4.5 },
      { id: 'gy_3', label: '3', positionMeters: 9.0 },
      { id: 'gy_4', label: '4', positionMeters: 13.5 },
    ],
    columns: [
      { id: 'col_A1', gridXLabel: 'A', gridYLabel: '1', x: 0, y: 0, widthCm: 30, depthCm: 30, shape: 'rectangular', material: 'RC', condition: 'good', notes: 'สภาพเสาภายนอกสมบูรณ์' },
      { id: 'col_B1', gridXLabel: 'B', gridYLabel: '1', x: 4.0, y: 0, widthCm: 30, depthCm: 30, shape: 'rectangular', material: 'RC', condition: 'good' },
      { id: 'col_C1', gridXLabel: 'C', gridYLabel: '1', x: 8.0, y: 0, widthCm: 30, depthCm: 30, shape: 'rectangular', material: 'RC', condition: 'good' },
      { id: 'col_D1', gridXLabel: 'D', gridYLabel: '1', x: 12.0, y: 0, widthCm: 30, depthCm: 30, shape: 'rectangular', material: 'RC', condition: 'minor_defect' },

      { id: 'col_A2', gridXLabel: 'A', gridYLabel: '2', x: 0, y: 4.5, widthCm: 35, depthCm: 35, shape: 'rectangular', material: 'RC', condition: 'severe_crack', notes: 'พบรอยแตกร้าวตามแนวเสา ความกว้างรอยร้าว 1.5 มม.' },
      { id: 'col_B2', gridXLabel: 'B', gridYLabel: '2', x: 4.0, y: 4.5, widthCm: 35, depthCm: 35, shape: 'rectangular', material: 'RC', condition: 'critical_spalling', notes: 'คอนกรีตหุ้มเสากระเทาะหลุด ร่องรอยเหล็กปลอกขึ้นสนิมรุนแรง' },
      { id: 'col_C2', gridXLabel: 'C', gridYLabel: '2', x: 8.0, y: 4.5, widthCm: 35, depthCm: 35, shape: 'rectangular', material: 'RC', condition: 'minor_defect' },
      { id: 'col_D2', gridXLabel: 'D', gridYLabel: '2', x: 12.0, y: 4.5, widthCm: 30, depthCm: 30, shape: 'rectangular', material: 'RC', condition: 'good' },

      { id: 'col_A3', gridXLabel: 'A', gridYLabel: '3', x: 0, y: 9.0, widthCm: 30, depthCm: 30, shape: 'rectangular', material: 'RC', condition: 'good' },
      { id: 'col_B3', gridXLabel: 'B', gridYLabel: '3', x: 4.0, y: 9.0, widthCm: 35, depthCm: 35, shape: 'rectangular', material: 'RC', condition: 'minor_defect' },
      { id: 'col_C3', gridXLabel: 'C', gridYLabel: '3', x: 8.0, y: 9.0, widthCm: 30, depthCm: 30, shape: 'rectangular', material: 'RC', condition: 'good' },
      { id: 'col_D3', gridXLabel: 'D', gridYLabel: '3', x: 12.0, y: 9.0, widthCm: 30, depthCm: 30, shape: 'rectangular', material: 'RC', condition: 'good' },

      { id: 'col_A4', gridXLabel: 'A', gridYLabel: '4', x: 0, y: 13.5, widthCm: 30, depthCm: 30, shape: 'rectangular', material: 'RC', condition: 'good' },
      { id: 'col_B4', gridXLabel: 'B', gridYLabel: '4', x: 4.0, y: 13.5, widthCm: 30, depthCm: 30, shape: 'rectangular', material: 'RC', condition: 'good' },
      { id: 'col_C4', gridXLabel: 'C', gridYLabel: '4', x: 8.0, y: 13.5, widthCm: 30, depthCm: 30, shape: 'rectangular', material: 'RC', condition: 'good' },
      { id: 'col_D4', gridXLabel: 'D', gridYLabel: '4', x: 12.0, y: 13.5, widthCm: 30, depthCm: 30, shape: 'rectangular', material: 'RC', condition: 'good' },
    ],
    walls: [
      // Outer Boundary Walls
      { id: 'wall_A1_A4', startX: 0, startY: 0, endX: 0, endY: 13.5, thicknessCm: 20, material: 'full_brick', condition: 'hairline_cracks', notes: 'ผนังอิฐมอญเต็มแผ่น ด้านข้างติดอาคารข้างเคียง' },
      { id: 'wall_D1_D4', startX: 12.0, startY: 0, endX: 12.0, endY: 13.5, thicknessCm: 20, material: 'full_brick', condition: 'good' },
      { id: 'wall_A4_D4', startX: 0, startY: 13.5, endX: 12.0, endY: 13.5, thicknessCm: 20, material: 'full_brick', condition: 'dampness', notes: 'พบความชื้นสะสมขอบล่างผนังซักล้าง' },
      { id: 'wall_A1_D1', startX: 0, startY: 0, endX: 12.0, endY: 0, thicknessCm: 10, material: 'half_brick', condition: 'good', notes: 'ผนังด้านหน้าอาคารโชว์รูม' },

      // Interior partitions
      { id: 'wall_A2_C2', startX: 0, startY: 4.5, endX: 8.0, endY: 4.5, thicknessCm: 10, material: 'half_brick', condition: 'structural_crack', notes: 'ผนังกั้นห้องทำงานกลางอาคาร มีรอยแตกร้าวเฉียง 45 องศา' },
      { id: 'wall_B2_B4', startX: 4.0, startY: 4.5, endX: 4.0, endY: 13.5, thicknessCm: 10, material: 'half_brick', condition: 'good' },
    ],
    openings: [
      { id: 'op_door_main', wallId: 'wall_A1_D1', type: 'door', positionOnWallRatio: 0.5, widthCm: 240, heightCm: 260, sillHeightCm: 0, label: 'D1 (ประตูม้วนเหล็กหน้าร้าน)', notes: 'ประตูบานม้วนเหล็กกว้าง 2.40m' },
      { id: 'op_door_back', wallId: 'wall_A4_D4', type: 'door', positionOnWallRatio: 0.25, widthCm: 90, heightCm: 200, sillHeightCm: 5, label: 'D2 (ประตูออกหลังบ้าน)', notes: 'ประตูไม้จริง ธรณีสูง 5 ซม.' },
      { id: 'op_door_office', wallId: 'wall_A2_C2', type: 'door', positionOnWallRatio: 0.4, widthCm: 90, heightCm: 200, sillHeightCm: 0, label: 'D3 (ประตูห้องสำนักงาน)', notes: 'ประตูบานไม้เดี่ยว' },

      { id: 'op_win_1', wallId: 'wall_A4_D4', type: 'window', positionOnWallRatio: 0.75, widthCm: 120, heightCm: 110, sillHeightCm: 100, label: 'W1 (หน้าต่างระบายอากาศหลัง)', notes: 'หน้าต่างเกล็ดไม้โบราณ ความสูงจากพื้น 1.00m' },
      { id: 'op_win_front1', wallId: 'wall_A1_D1', type: 'window', positionOnWallRatio: 0.15, widthCm: 150, heightCm: 180, sillHeightCm: 80, label: 'W2 (หน้าต่างโชว์กระจกหน้า)', notes: 'หน้าต่างกระจกกรอบไม้ ความสูงจากพื้น 0.80m' },
    ],
    defectPins: [
      { id: 'def_col_B2', x: 4.0, y: 4.5, category: 'column', severity: 'critical', title: 'คอนกรีตเสา B2 กระเทาะเหล็กสนิม', description: 'เสา คสล. ต้น B2 คอนกรีตหุ้มกะเทาะเห็นเหล็กปลอกและเหล็กยืนขึ้นสนิม มีการกะเทาะล่อนลึก 4-5 ซม.', photoId: 'photo_col_spalling' },
      { id: 'def_beam_B2_C2', x: 6.0, y: 4.5, category: 'beam', severity: 'high', title: 'รอยร้าวเฉือนคาน B2-C2', description: 'พบรอยแตกร้าวเฉียงบริเวณใกล้หัวคาน B2-C2 ความกว้างรอยแตก 1.2 มม. แสดงสภาวะแรงเฉือนเกินกำลัง', photoId: 'photo_beam_crack' },
      { id: 'def_wall_A2_B2', x: 2.0, y: 4.5, category: 'wall', severity: 'medium', title: 'รอยร้าวเฉียงผนังอิฐ', description: 'ผนังก่ออิฐมีรอยแตกร้าวแยกระหว่างเสา A2 กับ B2 สัมพันธ์กับการทรุดตัวดิฟเฟอเรนเชียล' },
    ],
    roomPins: [
      { id: 'room_office', x: 2.0, y: 2.25, name: 'ห้องสำนักงาน (Office)', floorHeight: 3.5, ceilingHeight: 3.20, isAutoCalculated: true },
      { id: 'room_showroom', x: 6.0, y: 2.25, name: 'โถงโชว์รูมหน้าร้าน (Showroom)', floorHeight: 3.5, ceilingHeight: 3.20, isAutoCalculated: true },
      { id: 'room_storage', x: 10.0, y: 11.25, name: 'ห้องเก็บของหลังอาคาร (Storage)', floorHeight: 3.2, ceilingHeight: 3.00, isAutoCalculated: true },
    ],
  },
  photos: [
    {
      id: 'photo_col_spalling',
      title: 'เสา คสล. ต้น B2 - คอนกรีตกระเทาะและเหล็กเสริมขึ้นสนิม',
      url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?auto=format&fit=crop&w=800&q=80',
      category: 'column',
      gps: { lat: 13.72346, lng: 100.51483 },
      timestamp: '2026-07-25 10:15:22',
      defectSeverity: 'critical',
      notes: 'เสาหลักกลางอาคาร ชั้น 1 ลึก 4 ซม. เหล็กยืนสนิมขุมพองตัวหลุดล่อน',
      annotations: [
        { id: 'ann1', type: 'box', x: 25, y: 30, width: 45, height: 40, color: '#ef4444', text: 'จุดกระเทาะเหล็กสนิม' },
        { id: 'ann2', type: 'arrow', x: 72, y: 45, color: '#f59e0b', text: 'รอยแตกร้าวลามขึ้นเสา' },
      ],
    },
    {
      id: 'photo_beam_crack',
      title: 'รอยแตกร้าวเฉือนคาน B2-C2 (หัวคาน)',
      url: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=800&q=80',
      category: 'beam',
      gps: { lat: 13.72348, lng: 100.51485 },
      timestamp: '2026-07-25 10:28:40',
      defectSeverity: 'severe',
      notes: 'รอยร้าวทรงเฉียง 45 องศา บ่งบอกถึงแรงเฉือนเกินกำลังรับน้ำหนัก',
      annotations: [
        { id: 'ann_beam1', type: 'box', x: 20, y: 35, width: 60, height: 30, color: '#f97316', text: 'รอยร้าวเฉือน 1.2 mm' },
      ],
    },
    {
      id: 'photo_ext_front',
      title: 'ภาพถ่ายทัศนียภาพหน้าอาคารด้านทิศตะวันออก',
      url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
      category: 'exterior',
      gps: { lat: 13.72343, lng: 100.51480 },
      timestamp: '2026-07-25 09:30:10',
      defectSeverity: 'minor',
      notes: 'สภาพด้านหน้าอาคารตึกแถว 3 ชั้น ติดถนนเจริญกรุง',
      annotations: [],
    },
  ],
};
