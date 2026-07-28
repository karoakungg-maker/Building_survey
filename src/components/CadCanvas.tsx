import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  FloorPlanData,
  ColumnItem,
  WallItem,
  OpeningItem,
  DefectPin,
  GridLineX,
  GridLineY,
  ColumnMaterial,
  WallMaterial,
} from '../types';
import {
  FileText,
  Download,
  Grid,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Columns,
  Square,
  DoorClosed,
  AppWindow,
  AlertTriangle,
  Move,
  Ruler,
  Check,
  ChevronRight,
  Layers,
  Settings2,
  Maximize,
  Lock,
  Unlock,
  MousePointer,
  Hand,
  Camera,
  MapPin,
  Image as ImageIcon,
  Upload,
  X,
  Edit2,
  RefreshCw,
  Wrench,
} from 'lucide-react';
import { exportCanvasToPDF, exportFloorPlanToDXF } from '../lib/exportUtils';

interface CadCanvasProps {
  floorPlan: FloorPlanData;
  onChangeFloorPlan: (updated: FloorPlanData) => void;
  onOpenPrintView?: () => void;
}

type ToolMode = 'select' | 'pan' | 'column' | 'wall' | 'opening' | 'defect' | 'room' | 'grid_edit';

export const CadCanvas: React.FC<CadCanvasProps> = ({ floorPlan, onChangeFloorPlan, onOpenPrintView }) => {
  const [toolMode, setToolMode] = useState<ToolMode>('select');

  const handleToolModeChange = (newMode: ToolMode) => {
    if (newMode !== 'wall') {
      setWallStartPoint(null);
    }
    setToolMode(newMode);
    if (newMode === 'column' || newMode === 'wall') {
      setMobileInspectorOpen(true);
    }
  };
  const [zoom, setZoom] = useState<number>(45); // pixels per meter
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 160, y: 160 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Selected item IDs for inspector
  const [selectedColId, setSelectedColId] = useState<string | null>(null);
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  const [selectedOpeningId, setSelectedOpeningId] = useState<string | null>(null);
  const [selectedDefectId, setSelectedDefectId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [draggingRoomId, setDraggingRoomId] = useState<string | null>(null);
  const [draggingOpeningId, setDraggingOpeningId] = useState<string | null>(null);

  // Mobile drawer states
  const [mobileToolsOpen, setMobileToolsOpen] = useState<boolean>(false);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState<boolean>(false);

  useEffect(() => {
    if (selectedColId || selectedWallId || selectedOpeningId || selectedDefectId || selectedRoomId) {
      setMobileInspectorOpen(true);
    }
  }, [selectedColId, selectedWallId, selectedOpeningId, selectedDefectId, selectedRoomId]);

  // Wall Drawing & Ortho state
  const [wallStartPoint, setWallStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [hoverMeterPos, setHoverMeterPos] = useState<{ x: number; y: number } | null>(null);
  const [isOrthoLocked, setIsOrthoLocked] = useState<boolean>(true);

  // Opening placement selection state & presets
  const DOOR_PRESETS = useMemo(() => [
    { label: 'ประตูไม้', width: 90, height: 205, sill: 0 },
    { label: 'ประตูอลูมิเนียมบานเปิดเดี่ยว', width: 90, height: 205, sill: 0 },
    { label: 'ประตูอลูมิเนียมบานเปิดคู่', width: 180, height: 205, sill: 0 },
    { label: 'ประตูอลูมิเนียมบานเลื่อน', width: 160, height: 205, sill: 0 },
    { label: 'ประตูอลูมิเนียมบานเลื่อนคู่', width: 240, height: 205, sill: 0 },
    { label: 'ประตูม้วน', width: 300, height: 250, sill: 0 },
    { label: 'ประตูกระจกบานเปลือย', width: 100, height: 215, sill: 0 },
    { label: 'ประตูเหล็กทนไฟ', width: 100, height: 205, sill: 0 },
    { label: 'ประตู PVC / uPVC', width: 80, height: 200, sill: 0 },
    { label: 'ระบุเอง...', width: 90, height: 205, sill: 0 },
  ], []);

  const WINDOW_PRESETS = useMemo(() => [
    { label: 'หน้าต่างอลูมิเนียมบานกระทุ้ง', width: 60, height: 60, sill: 150 },
    { label: 'หน้าต่างอลูมิเนียมบานเปิด', width: 80, height: 110, sill: 90 },
    { label: 'หน้าต่างอลูมิเนียมบานเลื่อน', width: 120, height: 110, sill: 90 },
    { label: 'หน้าต่างอลูมิเนียมบานติดตาย', width: 120, height: 120, sill: 90 },
    { label: 'หน้าต่างเกล็ดปรับได้', width: 80, height: 100, sill: 90 },
    { label: 'หน้าต่างไม้บานเปิด', width: 80, height: 110, sill: 90 },
    { label: 'หน้าต่าง uPVC บานเปิด/เลื่อน', width: 120, height: 110, sill: 90 },
    { label: 'ระบุเอง...', width: 120, height: 110, sill: 90 },
  ], []);

  const [openingTypeToAdd, setOpeningTypeToAdd] = useState<'door' | 'window'>('door');
  const [newOpeningMaterialType, setNewOpeningMaterialType] = useState<string>('ประตูไม้');
  const [customMaterialTypeName, setCustomMaterialTypeName] = useState<string>('');
  const [newOpeningWidthCm, setNewOpeningWidthCm] = useState<number>(90);
  const [newOpeningHeightCm, setNewOpeningHeightCm] = useState<number>(205);
  const [newOpeningSillHeightCm, setNewOpeningSillHeightCm] = useState<number>(0);

  // Column Placement state
  const [newColumnWidth, setNewColumnWidth] = useState<number>(20);
  const [newColumnDepth, setNewColumnDepth] = useState<number>(20);
  const [draggingColId, setDraggingColId] = useState<string | null>(null);

  const handleGenerateAllGridColumns = () => {
    if (!floorPlan.gridX || !floorPlan.gridY || floorPlan.gridX.length === 0 || floorPlan.gridY.length === 0) {
      return;
    }

    const newColumns: ColumnItem[] = [];
    const timestamp = Date.now();
    let addedCount = 0;

    floorPlan.gridX.forEach((gx) => {
      floorPlan.gridY.forEach((gy) => {
        const exists = floorPlan.columns.some(
          (c) =>
            (c.gridXLabel === gx.label && c.gridYLabel === gy.label) ||
            (Math.abs(c.x - gx.positionMeters) < 0.05 && Math.abs(c.y - gy.positionMeters) < 0.05)
        );

        if (!exists) {
          addedCount++;
          newColumns.push({
            id: `col_${gx.label}${gy.label}_${timestamp}_${addedCount}`,
            gridXLabel: gx.label,
            gridYLabel: gy.label,
            x: gx.positionMeters,
            y: gy.positionMeters,
            widthCm: newColumnWidth || 20,
            depthCm: newColumnDepth || 20,
            shape: 'rectangular',
            material: 'RC',
            condition: 'good',
          });
        }
      });
    });

    if (newColumns.length > 0) {
      onChangeFloorPlan({
        ...floorPlan,
        columns: [...floorPlan.columns, ...newColumns],
      });
    }
    handleToolModeChange('pan');
  };

  // Wall Creation & Dragging/Stretching state
  const [newWallThicknessCm, setNewWallThicknessCm] = useState<number>(10);
  const [newWallMaterial, setNewWallMaterial] = useState<WallMaterial>('half_brick');
  const [wallAlignment, setWallAlignment] = useState<'left' | 'center' | 'right'>('center');

  const handleGenerateAllGridWalls = () => {
    if (!floorPlan.gridX || !floorPlan.gridY || floorPlan.gridX.length < 2 || floorPlan.gridY.length < 2) {
      return;
    }

    const sortedGridX = [...floorPlan.gridX].sort((a, b) => a.positionMeters - b.positionMeters);
    const sortedGridY = [...floorPlan.gridY].sort((a, b) => a.positionMeters - b.positionMeters);

    const wallThM = (newWallThicknessCm || 10) / 100;
    const halfThM = wallThM / 2;

    const newWalls: WallItem[] = [];
    const timestamp = Date.now();
    let addedCount = 0;

    const numX = sortedGridX.length;
    const numY = sortedGridY.length;

    const findCol = (gx: number, gy: number) => {
      return floorPlan.columns.find(
        (c) => Math.abs(c.x - gx) < 0.1 && Math.abs(c.y - gy) < 0.1
      );
    };

    const wallExists = (sx: number, sy: number, ex: number, ey: number) => {
      return floorPlan.walls.some((w) => {
        const sameDir =
          (Math.abs(w.startX - sx) < 0.15 &&
            Math.abs(w.startY - sy) < 0.15 &&
            Math.abs(w.endX - ex) < 0.15 &&
            Math.abs(w.endY - ey) < 0.15) ||
          (Math.abs(w.startX - ex) < 0.15 &&
            Math.abs(w.startY - ey) < 0.15 &&
            Math.abs(w.endX - sx) < 0.15 &&
            Math.abs(w.endY - sy) < 0.15);
        return sameDir;
      });
    };

    // 1. Generate Horizontal Walls (along each Y grid line)
    sortedGridY.forEach((gy, j) => {
      let shiftY = 0;
      if (j === 0) {
        shiftY = -halfThM; // Top Y grid line -> outer face flush with outer column edge
      } else if (j === numY - 1) {
        shiftY = halfThM; // Bottom Y grid line -> outer face flush with outer column edge
      }

      const wallY = Math.round((gy.positionMeters + shiftY) * 100) / 100;

      for (let i = 0; i < numX - 1; i++) {
        const gx1 = sortedGridX[i];
        const gx2 = sortedGridX[i + 1];

        // Extend corner endpoints to meet outer vertical wall centers
        let startX = gx1.positionMeters;
        let endX = gx2.positionMeters;

        if (i === 0) startX = Math.round((startX - halfThM) * 100) / 100;
        if (i === numX - 2) endX = Math.round((endX + halfThM) * 100) / 100;

        if (!wallExists(startX, wallY, endX, wallY)) {
          addedCount++;
          const startCol = findCol(gx1.positionMeters, gy.positionMeters);
          const endCol = findCol(gx2.positionMeters, gy.positionMeters);

          newWalls.push({
            id: `wall_h_${timestamp}_${addedCount}`,
            startColId: startCol?.id,
            endColId: endCol?.id,
            startX,
            startY: wallY,
            endX,
            endY: wallY,
            thicknessCm: newWallThicknessCm || 10,
            material: newWallMaterial || 'half_brick',
            condition: 'good',
          });
        }
      }
    });

    // 2. Generate Vertical Walls (along each X grid line)
    sortedGridX.forEach((gx, i) => {
      let shiftX = 0;
      if (i === 0) {
        shiftX = -halfThM; // Left X grid line -> outer face flush with outer column edge
      } else if (i === numX - 1) {
        shiftX = halfThM; // Right X grid line -> outer face flush with outer column edge
      }

      const wallX = Math.round((gx.positionMeters + shiftX) * 100) / 100;

      for (let j = 0; j < numY - 1; j++) {
        const gy1 = sortedGridY[j];
        const gy2 = sortedGridY[j + 1];

        // Extend corner endpoints to meet outer horizontal wall centers
        let startY = gy1.positionMeters;
        let endY = gy2.positionMeters;

        if (j === 0) startY = Math.round((startY - halfThM) * 100) / 100;
        if (j === numY - 2) endY = Math.round((endY + halfThM) * 100) / 100;

        if (!wallExists(wallX, startY, wallX, endY)) {
          addedCount++;
          const startCol = findCol(gx.positionMeters, gy1.positionMeters);
          const endCol = findCol(gx.positionMeters, gy2.positionMeters);

          newWalls.push({
            id: `wall_v_${timestamp}_${addedCount}`,
            startColId: startCol?.id,
            endColId: endCol?.id,
            startX: wallX,
            startY,
            endX: wallX,
            endY,
            thicknessCm: newWallThicknessCm || 10,
            material: newWallMaterial || 'half_brick',
            condition: 'good',
          });
        }
      }
    });

    if (newWalls.length > 0) {
      onChangeFloorPlan({
        ...floorPlan,
        walls: [...floorPlan.walls, ...newWalls],
      });
    }
    handleToolModeChange('pan');
  };

  const handleDeleteAllColumns = () => {
    if (!floorPlan.columns || floorPlan.columns.length === 0) return;
    onChangeFloorPlan({
      ...floorPlan,
      columns: [],
      walls: floorPlan.walls.map((w) => ({
        ...w,
        startColId: undefined,
        endColId: undefined,
      })),
    });
    setSelectedColId(null);
    handleToolModeChange('pan');
  };

  const handleDeleteAllWalls = () => {
    if (!floorPlan.walls || floorPlan.walls.length === 0) return;
    onChangeFloorPlan({
      ...floorPlan,
      walls: [],
      openings: [],
    });
    setSelectedWallId(null);
    setSelectedOpeningId(null);
    handleToolModeChange('pan');
  };
  const [draggingWallId, setDraggingWallId] = useState<string | null>(null);
  const [draggingWallHandle, setDraggingWallHandle] = useState<'start' | 'end' | 'body' | null>(null);
  const [wallDragInitialCoords, setWallDragInitialCoords] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    mouseStartClientX: number;
    mouseStartClientY: number;
    isStarted: boolean;
  } | null>(null);

  // New Grid Line inputs
  const [newGridXLabel, setNewGridXLabel] = useState<string>('E');
  const [newGridXDist, setNewGridXDist] = useState<number>(4.0);
  const [newGridYLabel, setNewGridYLabel] = useState<string>('5');
  const [newGridYDist, setNewGridYDist] = useState<number>(4.5);

  // Sorted grid lines for dimension calculation and quick add
  const sortedGridX = useMemo(() => {
    return [...floorPlan.gridX].sort((a, b) => a.positionMeters - b.positionMeters);
  }, [floorPlan.gridX]);

  const sortedGridY = useMemo(() => {
    return [...floorPlan.gridY].sort((a, b) => a.positionMeters - b.positionMeters);
  }, [floorPlan.gridY]);

  // Modal state for quick grid add
  const [gridModalState, setGridModalState] = useState<{
    isOpen: boolean;
    axis: 'X' | 'Y';
    label: string;
    dist: number;
  } | null>(null);

  const openAddGridModal = (axis: 'X' | 'Y') => {
    if (axis === 'X') {
      setGridModalState({
        isOpen: true,
        axis: 'X',
        label: newGridXLabel || String.fromCharCode(65 + floorPlan.gridX.length),
        dist: newGridXDist || 4.0,
      });
    } else {
      setGridModalState({
        isOpen: true,
        axis: 'Y',
        label: newGridYLabel || (floorPlan.gridY.length + 1).toString(),
        dist: newGridYDist || 4.5,
      });
    }
  };

  const handleConfirmAddGridModal = () => {
    if (!gridModalState) return;
    const { axis, label, dist } = gridModalState;
    if (axis === 'X') {
      const lastPos = sortedGridX.length > 0 ? sortedGridX[sortedGridX.length - 1].positionMeters : 0;
      const newPos = Math.round((lastPos + dist) * 100) / 100;
      const newGrid: GridLineX = {
        id: `gx_${Date.now().toString().slice(-4)}`,
        label: label || String.fromCharCode(65 + floorPlan.gridX.length),
        positionMeters: newPos,
      };
      onChangeFloorPlan({
        ...floorPlan,
        gridX: [...floorPlan.gridX, newGrid],
      });
      setNewGridXLabel(String.fromCharCode(65 + floorPlan.gridX.length + 1));
    } else {
      const lastPos = sortedGridY.length > 0 ? sortedGridY[sortedGridY.length - 1].positionMeters : 0;
      const newPos = Math.round((lastPos + dist) * 100) / 100;
      const newGrid: GridLineY = {
        id: `gy_${Date.now().toString().slice(-4)}`,
        label: label || (floorPlan.gridY.length + 1).toString(),
        positionMeters: newPos,
      };
      onChangeFloorPlan({
        ...floorPlan,
        gridY: [...floorPlan.gridY, newGrid],
      });
      setNewGridYLabel((floorPlan.gridY.length + 2).toString());
    }
    setGridModalState(null);
  };

  // Modal state for editing existing grid span distance
  const [editSpanModalState, setEditSpanModalState] = useState<{
    isOpen: boolean;
    axis: 'X' | 'Y';
    prevGrid: GridLineX | GridLineY;
    targetGrid: GridLineX | GridLineY;
    currentSpan: number;
    newSpan: number;
  } | null>(null);

  const openEditSpanModal = (
    axis: 'X' | 'Y',
    prevGrid: GridLineX | GridLineY,
    targetGrid: GridLineX | GridLineY,
    currentSpan: number
  ) => {
    setEditSpanModalState({
      isOpen: true,
      axis,
      prevGrid,
      targetGrid,
      currentSpan,
      newSpan: currentSpan,
    });
  };

  const handleConfirmEditSpanModal = () => {
    if (!editSpanModalState) return;
    const { axis, targetGrid, currentSpan, newSpan } = editSpanModalState;
    if (newSpan <= 0 || isNaN(newSpan)) return;

    const delta = Math.round((newSpan - currentSpan) * 100) / 100;
    if (Math.abs(delta) < 0.001) {
      setEditSpanModalState(null);
      return;
    }

    const oldTargetPos = targetGrid.positionMeters;

    if (axis === 'X') {
      const updatedGridX = floorPlan.gridX.map((gx) => {
        if (gx.positionMeters >= oldTargetPos - 0.001) {
          return {
            ...gx,
            positionMeters: Math.round((gx.positionMeters + delta) * 100) / 100,
          };
        }
        return gx;
      });

      const updatedColumns = floorPlan.columns.map((col) => {
        if (col.x >= oldTargetPos - 0.01) {
          return {
            ...col,
            x: Math.round((col.x + delta) * 100) / 100,
          };
        }
        return col;
      });

      const updatedWalls = floorPlan.walls.map((wall) => {
        let sx = wall.startX;
        let ex = wall.endX;
        if (sx >= oldTargetPos - 0.01) {
          sx = Math.round((sx + delta) * 100) / 100;
        }
        if (ex >= oldTargetPos - 0.01) {
          ex = Math.round((ex + delta) * 100) / 100;
        }
        return { ...wall, startX: sx, endX: ex };
      });

      const updatedPins = floorPlan.defectPins.map((pin) => {
        if (pin.x >= oldTargetPos - 0.01) {
          return {
            ...pin,
            x: Math.round((pin.x + delta) * 100) / 100,
          };
        }
        return pin;
      });

      onChangeFloorPlan({
        ...floorPlan,
        gridX: updatedGridX,
        columns: updatedColumns,
        walls: updatedWalls,
        defectPins: updatedPins,
      });
    } else {
      const updatedGridY = floorPlan.gridY.map((gy) => {
        if (gy.positionMeters >= oldTargetPos - 0.001) {
          return {
            ...gy,
            positionMeters: Math.round((gy.positionMeters + delta) * 100) / 100,
          };
        }
        return gy;
      });

      const updatedColumns = floorPlan.columns.map((col) => {
        if (col.y >= oldTargetPos - 0.01) {
          return {
            ...col,
            y: Math.round((col.y + delta) * 100) / 100,
          };
        }
        return col;
      });

      const updatedWalls = floorPlan.walls.map((wall) => {
        let sy = wall.startY;
        let ey = wall.endY;
        if (sy >= oldTargetPos - 0.01) {
          sy = Math.round((sy + delta) * 100) / 100;
        }
        if (ey >= oldTargetPos - 0.01) {
          ey = Math.round((ey + delta) * 100) / 100;
        }
        return { ...wall, startY: sy, endY: ey };
      });

      const updatedPins = floorPlan.defectPins.map((pin) => {
        if (pin.y >= oldTargetPos - 0.01) {
          return {
            ...pin,
            y: Math.round((pin.y + delta) * 100) / 100,
          };
        }
        return pin;
      });

      onChangeFloorPlan({
        ...floorPlan,
        gridY: updatedGridY,
        columns: updatedColumns,
        walls: updatedWalls,
        defectPins: updatedPins,
      });
    }

    setEditSpanModalState(null);
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const touchState = useRef<{ lastX: number; lastY: number; dist: number | null }>({
    lastX: 0,
    lastY: 0,
    dist: null,
  });

  // Ceiling height update helper
  const handleCeilingHeightChange = (height: number) => {
    onChangeFloorPlan({
      ...floorPlan,
      floorHeight: height,
    });
  };

  // Get minimum zoom limit (fixed to grid bounds + 3 meters / 3 background grid cells offset on each side)
  const getMinZoom = () => {
    const container = containerRef.current;
    const rect = container?.getBoundingClientRect();
    const cWidth = rect?.width && rect.width > 0 ? rect.width : (typeof window !== 'undefined' ? window.innerWidth : 800);
    const cHeight = rect?.height && rect.height > 0 ? rect.height : (typeof window !== 'undefined' ? window.innerHeight : 600);

    const gridXPositions = floorPlan.gridX?.length ? floorPlan.gridX.map((g) => g.positionMeters) : [0, 10];
    const gridYPositions = floorPlan.gridY?.length ? floorPlan.gridY.map((g) => g.positionMeters) : [0, 10];

    const minX = Math.min(...gridXPositions);
    const maxX = Math.max(...gridXPositions);
    const minY = Math.min(...gridYPositions);
    const maxY = Math.max(...gridYPositions);

    const gridWidth = Math.max(maxX - minX, 1);
    const gridHeight = Math.max(maxY - minY, 1);

    // Offset out 3 background grid cells = 3 meters on each side (+6m total width & height)
    const paddedWidth = gridWidth + 6;
    const paddedHeight = gridHeight + 6;

    const calculatedMinZoom = Math.min(cWidth / paddedWidth, cHeight / paddedHeight);
    return Math.max(5, Math.round(calculatedMinZoom * 10) / 10);
  };

  // Fit to View
  const fitToView = () => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const containerWidth = rect.width;
    const containerHeight = rect.height;

    // Calculate bounding box of all grid lines
    const gridXPositions = floorPlan.gridX?.length ? floorPlan.gridX.map((g) => g.positionMeters) : [0, 10];
    const gridYPositions = floorPlan.gridY?.length ? floorPlan.gridY.map((g) => g.positionMeters) : [0, 10];

    const minX = Math.min(...gridXPositions);
    const maxX = Math.max(...gridXPositions);
    const minY = Math.min(...gridYPositions);
    const maxY = Math.max(...gridYPositions);

    const width = Math.max(maxX - minX, 1);
    const height = Math.max(maxY - minY, 1);

    const paddedWidth = width + 6;
    const paddedHeight = height + 6;

    const minZoomLimit = getMinZoom();
    const calculatedZoom = Math.min(containerWidth / paddedWidth, containerHeight / paddedHeight);
    const finalZoom = Math.min(Math.max(calculatedZoom, minZoomLimit), 300);

    setZoom(finalZoom);

    const minPaddedX = minX - 3;
    const minPaddedY = minY - 3;

    setPan({
      x: (containerWidth - paddedWidth * finalZoom) / 2 - minPaddedX * finalZoom,
      y: (containerHeight - paddedHeight * finalZoom) / 2 - minPaddedY * finalZoom,
    });
  };

  // Auto fit grid to view on initial load or floor change
  useEffect(() => {
    const timer = setTimeout(() => {
      fitToView();
    }, 100);
    return () => clearTimeout(timer);
  }, [floorPlan.floorId]);

  // Helper for symmetric grid bounds (Equal X and Y expansion)
  const maxSpan = useMemo(() => {
    const gridXMax = Math.max(...floorPlan.gridX.map((g) => g.positionMeters), 15);
    const gridYMax = Math.max(...floorPlan.gridY.map((g) => g.positionMeters), 15);
    const colMax = Math.max(...floorPlan.columns.map((c) => Math.max(c.x, c.y)), 0);
    const wallMax = Math.max(
      ...floorPlan.walls.map((w) => Math.max(w.startX, w.endX, w.startY, w.endY)),
      0
    );
    return Math.max(gridXMax, gridYMax, colMax, wallMax, 25);
  }, [floorPlan.gridX, floorPlan.gridY, floorPlan.columns, floorPlan.walls]);

  const extendedGridX = useMemo(() => Math.max(maxSpan + 35, 60), [maxSpan]);
  const extendedGridY = useMemo(() => Math.max(maxSpan + 35, 60), [maxSpan]);

  // Handle Wheel Zooming
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 1.12 : 0.88;
    const minZoomLimit = getMinZoom();
    const newZoom = Math.min(Math.max(zoom * zoomDelta, minZoomLimit), 300);

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Mouse position relative to the container
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Cursor position in SVG space before zoom
    const svgX = (mouseX - pan.x) / zoom;
    const svgY = (mouseY - pan.y) / zoom;

    // Calculate new pan to keep mouse cursor at the same position in SVG space
    const newPanX = mouseX - svgX * newZoom;
    const newPanY = mouseY - svgY * newZoom;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  // Unified Drag Start Helpers for Mouse / Touch / Pointer
  const handleStartDragCol = (e: React.MouseEvent | React.TouchEvent | React.PointerEvent, colId: string) => {
    if (toolMode === 'wall' || toolMode === 'opening') return;
    e.stopPropagation();
    setSelectedColId(colId);
    setSelectedWallId(null);
    setSelectedOpeningId(null);
    setSelectedDefectId(null);
    setSelectedRoomId(null);
    setDraggingColId(colId);
    setToolMode('select');
  };

  const handleStartDragWallBody = (e: React.MouseEvent | React.TouchEvent | React.PointerEvent, wall: WallItem) => {
    if (toolMode === 'wall' || toolMode === 'opening') return;
    e.stopPropagation();
    setSelectedWallId(wall.id);
    setSelectedColId(null);
    setSelectedOpeningId(null);
    setSelectedDefectId(null);
    setSelectedRoomId(null);
    setDraggingWallId(wall.id);
    setDraggingWallHandle('body');
    setToolMode('select');

    let clientX = 0;
    let clientY = 0;
    if ('touches' in e && e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as any).clientX;
      clientY = (e as any).clientY;
    }

    setWallDragInitialCoords({
      startX: wall.startX,
      startY: wall.startY,
      endX: wall.endX,
      endY: wall.endY,
      mouseStartClientX: clientX,
      mouseStartClientY: clientY,
      isStarted: false,
    });
  };

  const handleStartDragWallHandle = (
    e: React.MouseEvent | React.TouchEvent | React.PointerEvent,
    wall: WallItem,
    handle: 'start' | 'end'
  ) => {
    if (toolMode === 'wall' || toolMode === 'opening') return;
    e.stopPropagation();
    setSelectedWallId(wall.id);
    setSelectedColId(null);
    setSelectedOpeningId(null);
    setSelectedDefectId(null);
    setSelectedRoomId(null);
    setDraggingWallId(wall.id);
    setDraggingWallHandle(handle);
    setToolMode('select');

    let clientX = 0;
    let clientY = 0;
    if ('touches' in e && e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as any).clientX;
      clientY = (e as any).clientY;
    }

    setWallDragInitialCoords({
      startX: wall.startX,
      startY: wall.startY,
      endX: wall.endX,
      endY: wall.endY,
      mouseStartClientX: clientX,
      mouseStartClientY: clientY,
      isStarted: false,
    });
  };

  const handleStartDragOpening = (e: React.MouseEvent | React.TouchEvent | React.PointerEvent, opId: string) => {
    if (toolMode === 'wall' || toolMode === 'opening') return;
    e.stopPropagation();
    setSelectedOpeningId(opId);
    setSelectedColId(null);
    setSelectedWallId(null);
    setSelectedDefectId(null);
    setSelectedRoomId(null);
    setDraggingOpeningId(opId);
    setToolMode('select');
  };

  const handleStartDragRoom = (e: React.MouseEvent | React.TouchEvent | React.PointerEvent, roomId: string) => {
    if (toolMode === 'wall' || toolMode === 'opening') return;
    e.stopPropagation();
    setSelectedRoomId(roomId);
    setSelectedColId(null);
    setSelectedWallId(null);
    setSelectedOpeningId(null);
    setSelectedDefectId(null);
    setDraggingRoomId(roomId);
    setToolMode('select');
  };

  // Convert SVG/Canvas click/touch/pointer coords to meter coords
  const getMeterCoordsFromEvent = (
    e: React.MouseEvent<any> | React.TouchEvent<any> | React.PointerEvent<any> | { clientX: number; clientY: number }
  ): { x: number; y: number } => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('changedTouches' in e && e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as any).clientX;
      clientY = (e as any).clientY;
    }

    const clickX = clientX - rect.left - pan.x;
    const clickY = clientY - rect.top - pan.y;

    const meterX = Math.round((clickX / zoom) * 20) / 20;
    const meterY = Math.round((clickY / zoom) * 20) / 20;
    return { x: Math.max(-5, meterX), y: Math.max(-5, meterY) };
  };

  // Touch Handlers for Drag Panning, Stylus, and Pinch Zooming
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      touchState.current.lastX = e.touches[0].clientX;
      touchState.current.lastY = e.touches[0].clientY;
      touchState.current.dist = null;

      if (draggingColId || draggingWallId || draggingOpeningId || draggingRoomId) {
        return;
      }

      const hasSelectedItem = !!(selectedColId || selectedWallId || selectedOpeningId || selectedDefectId || selectedRoomId);
      if (hasSelectedItem) {
        return;
      }

      const target = e.target as HTMLElement;
      const targetId = target.id;
      const targetTag = target.tagName ? target.tagName.toLowerCase() : '';
      const isBackground = target === containerRef.current || targetTag === 'svg' || targetId === 'cad-grid-bg';

      if (toolMode === 'pan' || isBackground) {
        setIsPanning(true);
        setStartPan({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
      }
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchState.current.dist = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      if (draggingColId || draggingWallId || draggingRoomId || draggingOpeningId) {
        e.preventDefault();
        processMove(e);
        touchState.current.lastX = e.touches[0].clientX;
        touchState.current.lastY = e.touches[0].clientY;
        return;
      }

      const dx = e.touches[0].clientX - touchState.current.lastX;
      const dy = e.touches[0].clientY - touchState.current.lastY;
      if (toolMode === 'pan' || isPanning || e.target === containerRef.current) {
        setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      }
      touchState.current.lastX = e.touches[0].clientX;
      touchState.current.lastY = e.touches[0].clientY;
    } else if (e.touches.length === 2 && touchState.current.dist) {
      const newDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = newDist / touchState.current.dist;
      const minZoomLimit = getMinZoom();
      setZoom((prev) => Math.min(Math.max(prev * factor, minZoomLimit), 300));
      touchState.current.dist = newDist;
    }
  };

  const handleTouchEnd = () => {
    touchState.current.dist = null;
    handleMouseUp();
  };

  // Handle SVG mouse move for hover tracking
  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning) return;
    const rawMeter = getMeterCoordsFromEvent(e);
    const snapped = snapToGridIntersection(rawMeter, 0.05);
    if (!hoverMeterPos || Math.abs(hoverMeterPos.x - snapped.x) > 0.02 || Math.abs(hoverMeterPos.y - snapped.y) > 0.02) {
      setHoverMeterPos(snapped);
    }
  };

  // Handle Canvas Mouse Down (Panning vs Drawing)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Middle or Right click always pans
    if (e.button === 1 || e.button === 2) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (e.button === 0) { // Left click
      const hasSelectedItem = !!(selectedColId || selectedWallId || selectedOpeningId || selectedDefectId || selectedRoomId);

      // Lock left-click panning when an object is selected for editing, so screen doesn't move during editing
      if (hasSelectedItem) {
        return;
      }

      const target = e.target as HTMLElement;
      const targetId = target.id;
      const targetTag = target.tagName ? target.tagName.toLowerCase() : '';
      const isBackground = target === containerRef.current || targetTag === 'svg' || targetId === 'cad-grid-bg';

      if (toolMode === 'pan' || isBackground) {
        setIsPanning(true);
        setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
    }
  };

  const processMove = (e: React.MouseEvent<any> | React.TouchEvent<any> | React.PointerEvent<any>) => {
    if (isPanning) {
      let clientX = 0;
      let clientY = 0;
      if ('touches' in e && e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = (e as any).clientX;
        clientY = (e as any).clientY;
      }
      setPan({
        x: clientX - startPan.x,
        y: clientY - startPan.y,
      });
      return;
    }

    if (draggingColId) {
      const rawMeter = getMeterCoordsFromEvent(e);
      const snapped = snapToGridIntersection(rawMeter, 0.05);
      const finalPos = snapped;
      
      onChangeFloorPlan({
        ...floorPlan,
        columns: floorPlan.columns.map(c => 
          c.id === draggingColId ? { ...c, x: finalPos.x, y: finalPos.y, gridXLabel: finalPos.gridXLabel, gridYLabel: finalPos.gridYLabel } : c
        )
      });
      return;
    }

    if (draggingRoomId) {
      const rawMeter = getMeterCoordsFromEvent(e);
      const finalX = Math.round(rawMeter.x * 10) / 10;
      const finalY = Math.round(rawMeter.y * 10) / 10;

      onChangeFloorPlan({
        ...floorPlan,
        roomPins: (floorPlan.roomPins || []).map(r =>
          r.id === draggingRoomId ? { ...r, x: finalX, y: finalY } : r
        )
      });
      return;
    }

    if (draggingWallId && wallDragInitialCoords) {
      let clientX = 0;
      let clientY = 0;
      if ('touches' in e && e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = (e as any).clientX;
        clientY = (e as any).clientY;
      }

      const screenDx = clientX - wallDragInitialCoords.mouseStartClientX;
      const screenDy = clientY - wallDragInitialCoords.mouseStartClientY;
      const screenDist = Math.hypot(screenDx, screenDy);

      if (!wallDragInitialCoords.isStarted && screenDist < 6) {
        return;
      }

      if (!wallDragInitialCoords.isStarted) {
        wallDragInitialCoords.isStarted = true;
      }

      const dx = screenDx / zoom;
      const dy = screenDy / zoom;

      const oldStartX = wallDragInitialCoords.startX;
      const oldStartY = wallDragInitialCoords.startY;
      const oldEndX = wallDragInitialCoords.endX;
      const oldEndY = wallDragInitialCoords.endY;

      const isHorizontal = Math.abs(oldStartY - oldEndY) < 0.01;
      const isVertical = Math.abs(oldStartX - oldEndX) < 0.01;

      let newStartX = oldStartX;
      let newStartY = oldStartY;
      let newEndX = oldEndX;
      let newEndY = oldEndY;

      if (draggingWallHandle === 'body') {
        if (isHorizontal) {
          // Horizontal wall body drag: move vertically, preserve horizontal line
          newStartY = Math.round((oldStartY + dy) * 20) / 20;
          newEndY = newStartY;
        } else if (isVertical) {
          // Vertical wall body drag: move horizontally, preserve vertical line
          newStartX = Math.round((oldStartX + dx) * 20) / 20;
          newEndX = newStartX;
        } else {
          newStartX = Math.round((oldStartX + dx) * 20) / 20;
          newStartY = Math.round((oldStartY + dy) * 20) / 20;
          newEndX = Math.round((oldEndX + dx) * 20) / 20;
          newEndY = Math.round((oldEndY + dy) * 20) / 20;
        }
      } else if (draggingWallHandle === 'start') {
        newStartX = Math.round((oldStartX + dx) * 20) / 20;
        newStartY = Math.round((oldStartY + dy) * 20) / 20;
        if (isOrthoLocked || isHorizontal) {
          newStartY = oldStartY;
        }
        if (isOrthoLocked || isVertical) {
          newStartX = oldStartX;
        }
      } else if (draggingWallHandle === 'end') {
        newEndX = Math.round((oldEndX + dx) * 20) / 20;
        newEndY = Math.round((oldEndY + dy) * 20) / 20;
        if (isOrthoLocked || isHorizontal) {
          newEndY = oldEndY;
        }
        if (isOrthoLocked || isVertical) {
          newEndX = oldEndX;
        }
      }

      const dStartX = newStartX - oldStartX;
      const dStartY = newStartY - oldStartY;
      const dEndX = newEndX - oldEndX;
      const dEndY = newEndY - oldEndY;

      const EPS = 0.05;

      onChangeFloorPlan({
        ...floorPlan,
        walls: floorPlan.walls.map(w => {
          if (w.id === draggingWallId) {
            return {
              ...w,
              startX: newStartX,
              startY: newStartY,
              endX: newEndX,
              endY: newEndY,
            };
          }

          let wsX = w.startX;
          let wsY = w.startY;
          let weX = w.endX;
          let weY = w.endY;
          let modified = false;

          if (Math.abs(w.startX - oldStartX) < EPS && Math.abs(w.startY - oldStartY) < EPS) {
            wsX = Math.round((w.startX + dStartX) * 20) / 20;
            wsY = Math.round((w.startY + dStartY) * 20) / 20;
            modified = true;
          } else if (Math.abs(w.startX - oldEndX) < EPS && Math.abs(w.startY - oldEndY) < EPS) {
            wsX = Math.round((w.startX + dEndX) * 20) / 20;
            wsY = Math.round((w.startY + dEndY) * 20) / 20;
            modified = true;
          }

          if (Math.abs(w.endX - oldStartX) < EPS && Math.abs(w.endY - oldStartY) < EPS) {
            weX = Math.round((w.endX + dStartX) * 20) / 20;
            weY = Math.round((w.endY + dStartY) * 20) / 20;
            modified = true;
          } else if (Math.abs(w.endX - oldEndX) < EPS && Math.abs(w.endY - oldEndY) < EPS) {
            weX = Math.round((w.endX + dEndX) * 20) / 20;
            weY = Math.round((w.endY + dEndY) * 20) / 20;
            modified = true;
          }

          if (modified) {
            return {
              ...w,
              startX: wsX,
              startY: wsY,
              endX: weX,
              endY: weY,
            };
          }

          return w;
        })
      });
      return;
    }

    if (draggingOpeningId) {
      const rawMeter = getMeterCoordsFromEvent(e);
      const opening = floorPlan.openings.find(o => o.id === draggingOpeningId);
      if (opening) {
        const wall = floorPlan.walls.find(w => w.id === opening.wallId);
        if (wall) {
          const dx = wall.endX - wall.startX;
          const dy = wall.endY - wall.startY;
          const lenSq = dx * dx + dy * dy;
          if (lenSq > 0.0001) {
            let t = ((rawMeter.x - wall.startX) * dx + (rawMeter.y - wall.startY) * dy) / lenSq;
            const opWidthM = opening.widthCm / 100;
            const wallLen = Math.sqrt(lenSq);
            const margin = (opWidthM / 2) / wallLen;
            t = Math.max(margin, Math.min(1 - margin, t));

            const targetX = wall.startX + t * dx;
            const targetY = wall.startY + t * dy;
            const snappedX = Math.round(targetX * 20) / 20;
            const snappedY = Math.round(targetY * 20) / 20;

            const snappedT = ((snappedX - wall.startX) * dx + (snappedY - wall.startY) * dy) / lenSq;
            const finalT = Math.max(margin, Math.min(1 - margin, snappedT));

            onChangeFloorPlan({
              ...floorPlan,
              openings: floorPlan.openings.map(o =>
                o.id === draggingOpeningId ? { ...o, positionOnWallRatio: finalT } : o
              )
            });
          }
        }
      }
      return;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    processMove(e);
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    if (draggingColId) {
      setDraggingColId(null);
    }
    if (draggingWallId) {
      setDraggingWallId(null);
      setDraggingWallHandle(null);
      setWallDragInitialCoords(null);
    }
    if (draggingRoomId) {
      setDraggingRoomId(null);
    }
    if (draggingOpeningId) {
      setDraggingOpeningId(null);
    }
  };

  // Find nearest grid intersection or snap target (Grid, Column centers/faces/corners, Wall endpoints/faces)
  const snapToGridIntersection = (meterPos: { x: number; y: number }, customThreshold?: number) => {
    let closestX = meterPos.x;
    let closestXLabel = '';
    let minXDist = Infinity;

    floorPlan.gridX.forEach((gx) => {
      const dist = Math.abs(gx.positionMeters - meterPos.x);
      if (dist < minXDist) {
        minXDist = dist;
        closestX = gx.positionMeters;
        closestXLabel = gx.label;
      }
    });

    let closestY = meterPos.y;
    let closestYLabel = '';
    let minYDist = Infinity;

    floorPlan.gridY.forEach((gy) => {
      const dist = Math.abs(gy.positionMeters - meterPos.y);
      if (dist < minYDist) {
        minYDist = dist;
        closestY = gy.positionMeters;
        closestYLabel = gy.label;
      }
    });

    const threshold = customThreshold ?? 0.05;
    let bestX = minXDist < threshold ? closestX : meterPos.x;
    let bestY = minYDist < threshold ? closestY : meterPos.y;

    // High priority object snap candidates (Osnap)
    const osnapCandidates: { x: number; y: number }[] = [];

    // Snap candidates 5cm outside the edge grid lines
    if (floorPlan.gridX.length > 0 && floorPlan.gridY.length > 0) {
      const minGridX = Math.min(...floorPlan.gridX.map((g) => g.positionMeters));
      const maxGridX = Math.max(...floorPlan.gridX.map((g) => g.positionMeters));
      const minGridY = Math.min(...floorPlan.gridY.map((g) => g.positionMeters));
      const maxGridY = Math.max(...floorPlan.gridY.map((g) => g.positionMeters));

      floorPlan.gridY.forEach((gy) => {
        osnapCandidates.push({ x: minGridX - 0.05, y: gy.positionMeters });
        osnapCandidates.push({ x: maxGridX + 0.05, y: gy.positionMeters });
      });
      floorPlan.gridX.forEach((gx) => {
        osnapCandidates.push({ x: gx.positionMeters, y: minGridY - 0.05 });
        osnapCandidates.push({ x: gx.positionMeters, y: maxGridY + 0.05 });
      });
    }

    // Helper to get closest point on segment
    const getClosestPointOnSegment = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) return a;
      let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      return { x: a.x + t * dx, y: a.y + t * dy };
    };

    // 1. Column snap points & wall outer face alignment points
    const wallThM = (newWallThicknessCm || 10) / 100;
    const wallHalfM = wallThM / 2;

    floorPlan.columns.forEach((col) => {
      const w2 = (col.widthCm / 2) / 100;
      const d2 = (col.depthCm / 2) / 100;
      
      const pTL = { x: col.x - w2, y: col.y - d2 };
      const pTR = { x: col.x + w2, y: col.y - d2 };
      const pBL = { x: col.x - w2, y: col.y + d2 };
      const pBR = { x: col.x + w2, y: col.y + d2 };

      // Snap to any point on column outer edges (Top, Bottom, Left, Right) on closest side
      osnapCandidates.push(getClosestPointOnSegment(meterPos, pTL, pTR));
      osnapCandidates.push(getClosestPointOnSegment(meterPos, pBL, pBR));
      osnapCandidates.push(getClosestPointOnSegment(meterPos, pTL, pBL));
      osnapCandidates.push(getClosestPointOnSegment(meterPos, pTR, pBR));

      // Center & Corners
      osnapCandidates.push({ x: col.x, y: col.y }, pTL, pTR, pBL, pBR);

      // Wall center positions that align wall outer face flush with column edges
      osnapCandidates.push({ x: col.x - w2 + wallHalfM, y: col.y }); // Left outer face align
      osnapCandidates.push({ x: col.x + w2 - wallHalfM, y: col.y }); // Right outer face align
      osnapCandidates.push({ x: col.x, y: col.y - d2 + wallHalfM }); // Top outer face align
      osnapCandidates.push({ x: col.x, y: col.y + d2 - wallHalfM }); // Bottom outer face align

      // Osnap along grid lines for outer edges
      floorPlan.gridY.forEach((gy) => {
        osnapCandidates.push({ x: col.x - w2, y: gy.positionMeters });
        osnapCandidates.push({ x: col.x - w2 + wallHalfM, y: gy.positionMeters });
        osnapCandidates.push({ x: col.x + w2, y: gy.positionMeters });
        osnapCandidates.push({ x: col.x + w2 - wallHalfM, y: gy.positionMeters });
      });
      floorPlan.gridX.forEach((gx) => {
        osnapCandidates.push({ x: gx.positionMeters, y: col.y - d2 });
        osnapCandidates.push({ x: gx.positionMeters, y: col.y - d2 + wallHalfM });
        osnapCandidates.push({ x: gx.positionMeters, y: col.y + d2 });
        osnapCandidates.push({ x: gx.positionMeters, y: col.y + d2 - wallHalfM });
      });
    });

    // 2. Wall snap points
    floorPlan.walls.forEach((wall) => {
      // Endpoints & Midpoints
      osnapCandidates.push({ x: wall.startX, y: wall.startY });
      osnapCandidates.push({ x: wall.endX, y: wall.endY });
      const mx = (wall.startX + wall.endX) / 2;
      const my = (wall.startY + wall.endY) / 2;
      osnapCandidates.push({ x: mx, y: my });

      // Offsets representing wall faces/corners and closest point on wall outer face segments
      const dx = wall.endX - wall.startX;
      const dy = wall.endY - wall.startY;
      const len = Math.hypot(dx, dy);
      if (len > 0.05) {
        const nx = -dy / len;
        const ny = dx / len;
        const th2 = (wall.thicknessCm / 2) / 100;
        osnapCandidates.push({ x: wall.startX + nx * th2, y: wall.startY + ny * th2 });
        osnapCandidates.push({ x: wall.startX - nx * th2, y: wall.startY - ny * th2 });
        osnapCandidates.push({ x: wall.endX + nx * th2, y: wall.endY + ny * th2 });
        osnapCandidates.push({ x: wall.endX - nx * th2, y: wall.endY - ny * th2 });

        const f1Start = { x: wall.startX + nx * th2, y: wall.startY + ny * th2 };
        const f1End = { x: wall.endX + nx * th2, y: wall.endY + ny * th2 };
        const f2Start = { x: wall.startX - nx * th2, y: wall.startY - ny * th2 };
        const f2End = { x: wall.endX - nx * th2, y: wall.endY - ny * th2 };

        osnapCandidates.push(getClosestPointOnSegment(meterPos, f1Start, f1End));
        osnapCandidates.push(getClosestPointOnSegment(meterPos, f2Start, f2End));
      }
    });

    let bestOsnap: { x: number; y: number } | null = null;
    let minOsnapDist = Infinity;
    const osnapThreshold = customThreshold ?? 0.35; // easily snap to column edge / wall corner

    osnapCandidates.forEach((pt) => {
      const dst = Math.hypot(pt.x - meterPos.x, pt.y - meterPos.y);
      if (dst < osnapThreshold && dst < minOsnapDist) {
        minOsnapDist = dst;
        bestOsnap = pt;
      }
    });

    if (bestOsnap) {
      bestX = bestOsnap.x;
      bestY = bestOsnap.y;
    }

    return {
      x: Math.round(bestX * 20) / 20,
      y: Math.round(bestY * 20) / 20,
      gridXLabel: minXDist < threshold ? closestXLabel : 'custom',
      gridYLabel: minYDist < threshold ? closestYLabel : 'custom',
    };
  };

  // Canvas Click Handler based on Active Tool
  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning || draggingColId) return;
    const rawMeter = getMeterCoordsFromEvent(e);
    
    // For column and wall placement, we use a smaller snap threshold so it's easier to place freely.
    const snapped = snapToGridIntersection(rawMeter, 0.05);

    if (toolMode === 'column') {
      // Check if column already exists at location
      const existing = floorPlan.columns.find((c) => Math.abs(c.x - snapped.x) < 0.2 && Math.abs(c.y - snapped.y) < 0.2);
      if (existing) {
        setSelectedColId(existing.id);
        return;
      }

      const newCol: ColumnItem = {
        id: `col_${Date.now().toString().slice(-6)}`,
        gridXLabel: snapped.gridXLabel,
        gridYLabel: snapped.gridYLabel,
        x: snapped.x,
        y: snapped.y,
        widthCm: newColumnWidth || 20,
        depthCm: newColumnDepth || 20,
        shape: 'rectangular',
        material: 'RC',
        condition: 'good',
      };

      onChangeFloorPlan({
        ...floorPlan,
        columns: [...floorPlan.columns, newCol],
      });
      setSelectedColId(newCol.id);
      setSelectedWallId(null);
      setSelectedOpeningId(null);
      handleToolModeChange('pan');
    } else if (toolMode === 'wall') {
      if (!wallStartPoint) {
        setWallStartPoint({ x: snapped.x, y: snapped.y });
      } else {
        let targetX = snapped.x;
        let targetY = snapped.y;

        const dx = Math.abs(snapped.x - wallStartPoint.x);
        const dy = Math.abs(snapped.y - wallStartPoint.y);

        // Apply Ortho lock or Shift lock for clean vertical / horizontal alignment
        if (isOrthoLocked || e.shiftKey || dx < 0.6 || dy < 0.6) {
          if (dy >= dx) {
            targetX = wallStartPoint.x; // Lock as vertical wall
          } else {
            targetY = wallStartPoint.y; // Lock as horizontal wall
          }
        }

        // Complete Wall
        if (wallStartPoint.x === targetX && wallStartPoint.y === targetY) {
          setWallStartPoint(null);
          return;
        }

        let finalStartX = wallStartPoint.x;
        let finalStartY = wallStartPoint.y;
        let finalEndX = targetX;
        let finalEndY = targetY;

        if (wallAlignment !== 'center') {
          const wallThM = newWallThicknessCm / 100;
          const halfThM = wallThM / 2;

          const isVertical = Math.abs(finalStartX - finalEndX) < 0.05;
          const isHorizontal = Math.abs(finalStartY - finalEndY) < 0.05;

          if (isVertical) {
            // 'left': ริมซ้าย -> center shifted +halfThM in X
            // 'right': ริมขวา -> center shifted -halfThM in X
            const shiftX = wallAlignment === 'left' ? halfThM : -halfThM;
            finalStartX = Math.round((finalStartX + shiftX) * 100) / 100;
            finalEndX = Math.round((finalEndX + shiftX) * 100) / 100;
          } else if (isHorizontal) {
            // 'left': ริมบน -> center shifted +halfThM in Y
            // 'right': ริมล่าง -> center shifted -halfThM in Y
            const shiftY = wallAlignment === 'left' ? halfThM : -halfThM;
            finalStartY = Math.round((finalStartY + shiftY) * 100) / 100;
            finalEndY = Math.round((finalEndY + shiftY) * 100) / 100;
          } else {
            const vX = finalEndX - finalStartX;
            const vY = finalEndY - finalStartY;
            const len = Math.hypot(vX, vY);
            if (len > 0) {
              const shiftAmount = wallAlignment === 'left' ? halfThM : -halfThM;
              const normX = (vY / len) * shiftAmount;
              const normY = (-vX / len) * shiftAmount;
              finalStartX = Math.round((finalStartX + normX) * 100) / 100;
              finalStartY = Math.round((finalStartY + normY) * 100) / 100;
              finalEndX = Math.round((finalEndX + normX) * 100) / 100;
              finalEndY = Math.round((finalEndY + normY) * 100) / 100;
            }
          }
        }

        const newWall: WallItem = {
          id: `wall_${Date.now().toString().slice(-6)}`,
          startX: finalStartX,
          startY: finalStartY,
          endX: finalEndX,
          endY: finalEndY,
          thicknessCm: newWallThicknessCm,
          material: newWallMaterial,
          condition: 'good',
        };

        onChangeFloorPlan({
          ...floorPlan,
          walls: [...floorPlan.walls, newWall],
        });
        setSelectedWallId(newWall.id);
        setWallStartPoint(null); // reset start point
        handleToolModeChange('pan');
      }
    } else if (toolMode === 'defect') {
      const newDefect: DefectPin = {
        id: `def_${Date.now().toString().slice(-6)}`,
        x: snapped.x,
        y: snapped.y,
        category: 'column',
        severity: 'medium',
        title: `จุดชำรุดตำแหน่ง (${snapped.x}m, ${snapped.y}m)`,
        description: 'กรุณาระบุรายละเอียดรอยร้าวหรือการเสื่อมสภาพ',
      };

      onChangeFloorPlan({
        ...floorPlan,
        defectPins: [...floorPlan.defectPins, newDefect],
      });
      setSelectedDefectId(newDefect.id);
      handleToolModeChange('pan');
    } else if (toolMode === 'room') {
      const defaultFloor = floorPlan.floorHeight || 2.80;
      const newRoom = {
        id: `room_${Date.now().toString().slice(-6)}`,
        x: snapped.x,
        y: snapped.y,
        name: `ห้องใหม่ ${(floorPlan.roomPins || []).length + 1}`,
        floorHeight: defaultFloor,
        isAutoCalculated: true,
      };

      onChangeFloorPlan({
        ...floorPlan,
        roomPins: [...(floorPlan.roomPins || []), newRoom],
      });
      setSelectedRoomId(newRoom.id);
      setSelectedColId(null);
      setSelectedWallId(null);
      setSelectedOpeningId(null);
      setSelectedDefectId(null);
      handleToolModeChange('pan');
    } else {
      // Clear selections if clicked on empty canvas and return to pan mode
      const targetId = (e.target as Element).id;
      const targetTag = (e.target as Element).tagName ? (e.target as Element).tagName.toLowerCase() : '';
      if (
        e.target === e.currentTarget ||
        targetId === 'cad-grid-bg' ||
        targetTag === 'svg' ||
        targetTag === 'rect' ||
        targetTag === 'line' ||
        targetTag === 'path'
      ) {
        setSelectedColId(null);
        setSelectedWallId(null);
        setSelectedOpeningId(null);
        setSelectedDefectId(null);
        setSelectedRoomId(null);
        handleToolModeChange('pan');
      }
    }
  };

  // Add Window or Door to Wall
  const handleWallClickToPlaceOpening = (e: React.MouseEvent, wall: WallItem) => {
    if (toolMode !== 'opening') return;

    const rawMeter = getMeterCoordsFromEvent(e);
    const dx = wall.endX - wall.startX;
    const dy = wall.endY - wall.startY;
    const lenSq = dx * dx + dy * dy;
    let ratio = 0.5;
    if (lenSq > 0) {
      ratio = ((rawMeter.x - wall.startX) * dx + (rawMeter.y - wall.startY) * dy) / lenSq;
      ratio = Math.max(0.05, Math.min(0.95, ratio));
    }

    const isDoor = openingTypeToAdd === 'door';
    const doorCount = floorPlan.openings.filter((o) => o.type === 'door').length + 1;
    const winCount = floorPlan.openings.filter((o) => o.type === 'window').length + 1;

    const resolvedMaterialType =
      newOpeningMaterialType === 'ระบุเอง...'
        ? customMaterialTypeName.trim() || (isDoor ? 'ประตูระบุเอง' : 'หน้าต่างระบุเอง')
        : newOpeningMaterialType;

    const newOpening: OpeningItem = {
      id: `op_${Date.now().toString().slice(-6)}`,
      wallId: wall.id,
      type: openingTypeToAdd,
      positionOnWallRatio: Math.round(ratio * 1000) / 1000,
      widthCm: newOpeningWidthCm,
      heightCm: newOpeningHeightCm,
      sillHeightCm: newOpeningSillHeightCm,
      label: isDoor ? `D${doorCount}` : `W${winCount}`,
      materialType: resolvedMaterialType,
      notes: `${resolvedMaterialType}${!isDoor && newOpeningSillHeightCm > 0 ? ` (Sill ${newOpeningSillHeightCm} ซม.)` : ''}`,
    };

    onChangeFloorPlan({
      ...floorPlan,
      openings: [...floorPlan.openings, newOpening],
    });
    setSelectedOpeningId(newOpening.id);
    setSelectedColId(null);
    setSelectedWallId(null);
    setSelectedDefectId(null);
    setSelectedRoomId(null);
  };

  // Align selected wall to column edge or center
  const handleAlignSelectedWallToColumn = (alignType: 'outer_start' | 'outer_end' | 'center') => {
    const selectedWall = floorPlan.walls.find((w) => w.id === selectedWallId);
    if (!selectedWall) return;

    const isVertical = Math.abs(selectedWall.startX - selectedWall.endX) < 0.1;
    const isHorizontal = Math.abs(selectedWall.startY - selectedWall.endY) < 0.1;

    const wallMidX = (selectedWall.startX + selectedWall.endX) / 2;
    const wallMidY = (selectedWall.startY + selectedWall.endY) / 2;

    // Find closest column
    let closestCol: ColumnItem | null = null;
    let minColDist = Infinity;
    floorPlan.columns.forEach((col) => {
      const dist = Math.hypot(col.x - wallMidX, col.y - wallMidY);
      if (dist < minColDist) {
        minColDist = dist;
        closestCol = col;
      }
    });

    const colW = closestCol ? closestCol.widthCm / 100 : 0.20;
    const colD = closestCol ? closestCol.depthCm / 100 : 0.20;
    const colX = closestCol ? closestCol.x : 0;
    const colY = closestCol ? closestCol.y : 0;
    const wallTh = selectedWall.thicknessCm / 100;

    let targetX = selectedWall.startX;
    let targetY = selectedWall.startY;
    let targetEndX = selectedWall.endX;
    let targetEndY = selectedWall.endY;

    if (isVertical) {
      if (alignType === 'outer_start') {
        // Outer Left face align: col.x - colW/2 + wallTh/2
        const alignedX = Math.round((colX - colW / 2 + wallTh / 2) * 100) / 100;
        targetX = alignedX;
        targetEndX = alignedX;
      } else if (alignType === 'outer_end') {
        // Outer Right face align: col.x + colW/2 - wallTh/2
        const alignedX = Math.round((colX + colW / 2 - wallTh / 2) * 100) / 100;
        targetX = alignedX;
        targetEndX = alignedX;
      } else {
        // Center
        targetX = colX;
        targetEndX = colX;
      }
    } else if (isHorizontal) {
      if (alignType === 'outer_start') {
        // Outer Top face align: col.y - colD/2 + wallTh/2
        const alignedY = Math.round((colY - colD / 2 + wallTh / 2) * 100) / 100;
        targetY = alignedY;
        targetEndY = alignedY;
      } else if (alignType === 'outer_end') {
        // Outer Bottom face align: col.y + colD/2 - wallTh/2
        const alignedY = Math.round((colY + colD / 2 - wallTh / 2) * 100) / 100;
        targetY = alignedY;
        targetEndY = alignedY;
      } else {
        // Center
        targetY = colY;
        targetEndY = colY;
      }
    }

    onChangeFloorPlan({
      ...floorPlan,
      walls: floorPlan.walls.map((w) =>
        w.id === selectedWall.id
          ? {
              ...w,
              startX: targetX,
              startY: targetY,
              endX: targetEndX,
              endY: targetEndY,
            }
          : w
      ),
    });
  };

  // Delete Handlers
  const handleDeleteSelected = () => {
    if (selectedColId) {
      onChangeFloorPlan({
        ...floorPlan,
        columns: floorPlan.columns.filter((c) => c.id !== selectedColId),
      });
      setSelectedColId(null);
    } else if (selectedWallId) {
      onChangeFloorPlan({
        ...floorPlan,
        walls: floorPlan.walls.filter((w) => w.id !== selectedWallId),
        openings: floorPlan.openings.filter((o) => o.wallId !== selectedWallId),
      });
      setSelectedWallId(null);
    } else if (selectedOpeningId) {
      onChangeFloorPlan({
        ...floorPlan,
        openings: floorPlan.openings.filter((o) => o.id !== selectedOpeningId),
      });
      setSelectedOpeningId(null);
    } else if (selectedDefectId) {
      onChangeFloorPlan({
        ...floorPlan,
        defectPins: floorPlan.defectPins.filter((d) => d.id !== selectedDefectId),
      });
      setSelectedDefectId(null);
    } else if (selectedRoomId) {
      onChangeFloorPlan({
        ...floorPlan,
        roomPins: (floorPlan.roomPins || []).filter((r) => r.id !== selectedRoomId),
      });
      setSelectedRoomId(null);
    }
  };

  // Add Grid Lines
  const handleAddGridX = () => {
    const lastPos = floorPlan.gridX.length > 0 ? floorPlan.gridX[floorPlan.gridX.length - 1].positionMeters : 0;
    const newPos = lastPos + (newGridXDist || 4.0);
    const newGrid: GridLineX = {
      id: `gx_${Date.now().toString().slice(-4)}`,
      label: newGridXLabel || String.fromCharCode(65 + floorPlan.gridX.length),
      positionMeters: Math.round(newPos * 20) / 20,
    };
    onChangeFloorPlan({
      ...floorPlan,
      gridX: [...floorPlan.gridX, newGrid],
    });
    handleToolModeChange('pan');
    // Auto advance next label
    setNewGridXLabel(String.fromCharCode(65 + floorPlan.gridX.length + 1));
  };

  const handleAddGridY = () => {
    const lastPos = floorPlan.gridY.length > 0 ? floorPlan.gridY[floorPlan.gridY.length - 1].positionMeters : 0;
    const newPos = lastPos + (newGridYDist || 4.5);
    const newGrid: GridLineY = {
      id: `gy_${Date.now().toString().slice(-4)}`,
      label: newGridYLabel || (floorPlan.gridY.length + 1).toString(),
      positionMeters: Math.round(newPos * 20) / 20,
    };
    onChangeFloorPlan({
      ...floorPlan,
      gridY: [...floorPlan.gridY, newGrid],
    });
    handleToolModeChange('pan');
    setNewGridYLabel((floorPlan.gridY.length + 2).toString());
  };

  const handleDeleteGridX = (gridId: string, pos: number, label: string) => {
    console.log('handleDeleteGridX called', gridId, pos, label);
    const remainingGridX = floorPlan.gridX.filter((g) => g.id !== gridId);
    
    // Columns on this grid line
    const remainingColumns = floorPlan.columns.filter((c) => {
      const onGrid = Math.abs(c.x - pos) < 0.15 || c.gridXLabel === label;
      return !onGrid;
    });

    // Walls on this grid line (starts or ends on the grid coordinate)
    const remainingWalls = floorPlan.walls.filter((w) => {
      const onGrid = Math.abs(w.startX - pos) < 0.15 || Math.abs(w.endX - pos) < 0.15;
      return !onGrid;
    });
    const deletedWallIds = floorPlan.walls
      .filter((w) => {
        const onGrid = Math.abs(w.startX - pos) < 0.15 || Math.abs(w.endX - pos) < 0.15;
        return onGrid;
      })
      .map((w) => w.id);

    // Openings on deleted walls
    const remainingOpenings = floorPlan.openings.filter((o) => !deletedWallIds.includes(o.wallId));

    // Defect pins close to the deleted grid line
    const remainingPins = floorPlan.defectPins.filter((pin) => {
      const nearLine = Math.abs(pin.x - pos) < 0.15;
      return !nearLine;
    });

    onChangeFloorPlan({
      ...floorPlan,
      gridX: remainingGridX,
      columns: remainingColumns,
      walls: remainingWalls,
      openings: remainingOpenings,
      defectPins: remainingPins,
    });

    // Clear selections
    setSelectedColId(null);
    setSelectedWallId(null);
    setSelectedOpeningId(null);
    setSelectedDefectId(null);
  };

  const handleDeleteGridY = (gridId: string, pos: number, label: string) => {
    console.log('handleDeleteGridY called', gridId, pos, label);
    const remainingGridY = floorPlan.gridY.filter((g) => g.id !== gridId);

    // Columns on this grid line
    const remainingColumns = floorPlan.columns.filter((c) => {
      const onGrid = Math.abs(c.y - pos) < 0.15 || c.gridYLabel === label;
      return !onGrid;
    });

    // Walls on this grid line
    const remainingWalls = floorPlan.walls.filter((w) => {
      const onGrid = Math.abs(w.startY - pos) < 0.15 || Math.abs(w.endY - pos) < 0.15;
      return !onGrid;
    });
    const deletedWallIds = floorPlan.walls
      .filter((w) => {
        const onGrid = Math.abs(w.startY - pos) < 0.15 || Math.abs(w.endY - pos) < 0.15;
        return onGrid;
      })
      .map((w) => w.id);

    // Openings on deleted walls
    const remainingOpenings = floorPlan.openings.filter((o) => !deletedWallIds.includes(o.wallId));

    // Defect pins
    const remainingPins = floorPlan.defectPins.filter((pin) => {
      const nearLine = Math.abs(pin.y - pos) < 0.15;
      return !nearLine;
    });

    onChangeFloorPlan({
      ...floorPlan,
      gridY: remainingGridY,
      columns: remainingColumns,
      walls: remainingWalls,
      openings: remainingOpenings,
      defectPins: remainingPins,
    });

    // Clear selections
    setSelectedColId(null);
    setSelectedWallId(null);
    setSelectedOpeningId(null);
    setSelectedDefectId(null);
    setSelectedRoomId(null);
  };

  const calculateRoomDimensions = (room: any) => {
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
    const wallLengthOffset = room.wallLengthOffset || 0;

    width = Math.max(0.1, width + widthOffset);
    depth = Math.max(0.1, depth + depthOffset);

    let baseArea = width * depth;
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

    return {
      width,
      depth,
      floorArea,
      ceilingArea,
      grossWallArea,
      subtractedArea,
      netWallArea,
      perimeter: adjustedPerimeter,
      bounds: { xMin, xMax, yMin, yMax },
    };
  };

  const selectedCol = floorPlan.columns.find((c) => c.id === selectedColId);
  const selectedWall = floorPlan.walls.find((w) => w.id === selectedWallId);
  const selectedOpening = floorPlan.openings.find((o) => o.id === selectedOpeningId);
  const selectedDefect = floorPlan.defectPins.find((d) => d.id === selectedDefectId);
  const selectedRoom = (floorPlan.roomPins || []).find((r) => r.id === selectedRoomId);

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* CAD Top Bar for Status, Tools & Export Controls */}
      <div className="bg-slate-950 px-2.5 py-1.5 border-b border-slate-800 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between gap-2 overflow-x-auto text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">ผังโครงสร้าง {floorPlan.floorName || 'ชั้น 1'}</span>
          </div>

          {/* Action & Zoom Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onOpenPrintView('plan')}
              className="flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 bg-rose-900/40 hover:bg-rose-800 text-rose-300 border border-rose-800/60 rounded-md text-[11px] transition-colors font-semibold shrink-0"
              title="ส่งออกแปลนเป็น PDF"
            >
              <FileText className="w-3.5 h-3.5 text-rose-400" />
              <span>แปลน PDF</span>
            </button>

            <button
              onClick={() => exportFloorPlanToDXF(floorPlan, `floorplan-${Date.now()}.dxf`)}
              className="flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 bg-blue-900/40 hover:bg-blue-800 text-blue-300 border border-blue-800/60 rounded-md text-[11px] transition-colors font-medium shrink-0"
              title="ส่งออกแปลนเป็น DXF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>DXF</span>
            </button>

            {/* Zoom controls */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 gap-0.5 shrink-0">
              <button
                onClick={() => {
                  const minZoomLimit = getMinZoom();
                  setZoom((z) => Math.max(minZoomLimit, z - 5));
                }}
                className="p-1 hover:bg-slate-800 rounded text-slate-300"
                title="ย่อขนาด"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] sm:text-[11px] font-mono px-1 text-slate-400 font-semibold">{zoom}px/m</span>
              <button
                onClick={() => setZoom((z) => Math.min(100, z + 5))}
                className="p-1 hover:bg-slate-800 rounded text-slate-300"
                title="ขยายขนาด"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={fitToView}
                className="p-1 hover:bg-slate-800 rounded text-slate-300"
                title="ปรับภาพให้เห็นพื้นที่ครอบคลุมกริดลายทั้งหมด"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setZoom(45);
                  setPan({ x: 160, y: 160 });
                }}
                className="p-1 hover:bg-slate-800 rounded text-slate-300 ml-0.5"
                title="รีเซ็ตมุมมอง"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Top Horizontal Tool Menu */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs shrink-0 scrollbar-thin">
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={() => handleToolModeChange('select')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 ${
                toolMode === 'select'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
              title="เลือก/ย้ายองค์ประกอบ"
            >
              <Move className="w-3.5 h-3.5" />
              <span>เลือก</span>
            </button>

            <button
              onClick={() => handleToolModeChange('pan')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 ${
                toolMode === 'pan'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
              title="มือจับลากแปลน (Pan Canvas)"
            >
              <Hand className="w-3.5 h-3.5" />
              <span>เลื่อน</span>
            </button>
          </div>

          <div className="h-5 w-px bg-slate-800 shrink-0" />

          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={() => {
                handleToolModeChange('column');
                setSelectedWallId(null);
                setSelectedOpeningId(null);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 ${
                toolMode === 'column'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
              title="วางตำแหน่งเสา"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>เสา</span>
            </button>

            <button
              onClick={() => {
                handleToolModeChange('wall');
                setSelectedColId(null);
                setSelectedOpeningId(null);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 ${
                toolMode === 'wall'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
              title="ลากเส้นผนัง"
            >
              <Square className="w-3.5 h-3.5" />
              <span>ผนัง</span>
            </button>

            <button
              onClick={() => {
                handleToolModeChange('opening');
                setSelectedColId(null);
                setSelectedWallId(null);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 ${
                toolMode === 'opening'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
              title="ใส่ช่องประตูและหน้าต่าง"
            >
              <DoorClosed className="w-3.5 h-3.5" />
              <span>ประตู/หน้าต่าง</span>
            </button>

            <button
              onClick={() => {
                handleToolModeChange('defect');
                setSelectedColId(null);
                setSelectedWallId(null);
                setSelectedOpeningId(null);
                setSelectedRoomId(null);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 ${
                toolMode === 'defect'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
              title="ปักหมุดแนบรูปถ่ายสำรวจ"
            >
              <Camera className="w-3.5 h-3.5 text-rose-300" />
              <span>พินรูปถ่าย</span>
            </button>

            <button
              onClick={() => {
                handleToolModeChange('room');
                setSelectedColId(null);
                setSelectedWallId(null);
                setSelectedOpeningId(null);
                setSelectedDefectId(null);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 ${
                toolMode === 'room'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
              title="ปักหมุดชื่อห้องและคำนวณพื้นที่"
            >
              <MapPin className="w-3.5 h-3.5 text-orange-300" />
              <span>หมุดห้อง</span>
            </button>

            <button
              onClick={() => handleToolModeChange('grid_edit')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 ${
                toolMode === 'grid_edit'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
              title="จัดการระยะกริดเสา"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>กริด</span>
            </button>
          </div>

          <div className="h-5 w-px bg-slate-800 shrink-0" />

          {/* Toggle Ortho Lock */}
          <button
            onClick={() => setIsOrthoLocked(!isOrthoLocked)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all border shrink-0 ${
              isOrthoLocked
                ? 'bg-amber-950/80 text-amber-300 border-amber-700 shadow-sm'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="เปิด/ปิด การตั้งฉากแนวตั้ง-แนวนอน"
          >
            {isOrthoLocked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5 text-slate-400" />}
            <span>ฉาก {isOrthoLocked ? 'เปิด' : 'ปิด'}</span>
          </button>

          {/* Delete selection */}
          <button
            onClick={handleDeleteSelected}
            disabled={!(selectedColId || selectedWallId || selectedOpeningId || selectedDefectId || selectedRoomId)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all border shrink-0 ${
              selectedColId || selectedWallId || selectedOpeningId || selectedDefectId || selectedRoomId
                ? 'bg-red-600 hover:bg-red-500 text-white border-red-500 shadow-md cursor-pointer animate-pulse'
                : 'bg-slate-900/60 text-slate-500 border-slate-800/80 cursor-not-allowed opacity-60'
            }`}
            title="ลบรายการที่เลือก"
          >
            <Trash2 className={`w-3.5 h-3.5 ${selectedColId || selectedWallId || selectedOpeningId || selectedDefectId || selectedRoomId ? 'text-white' : 'text-slate-500'}`} />
            <span>ลบ</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Workspace with Inspector Control Panel */}
      <div id="cad-canvas-workspace" className="flex-1 flex flex-col landscape:flex-row lg:flex-row relative overflow-hidden bg-slate-950 h-full min-h-0">

        {/* SVG Interactive Canvas */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`flex-1 w-full h-full min-h-[380px] sm:min-h-[500px] relative overflow-hidden select-none ${
            isPanning ? 'cursor-grabbing' : (toolMode === 'pan' ? 'cursor-grab' : 'cursor-crosshair')
          }`}
        >
          {/* Active Tool Tip Badge & Hover Coordinates Indicator */}
          <div className="hidden md:flex absolute top-3 left-3 z-10 bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs items-center gap-3 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-300 font-medium">
                {toolMode === 'select' && 'โหมดเลือกและแก้ไของค์ประกอบ (คลิกวัตถุบนแปลน)'}
                {toolMode === 'pan' && 'โหมดลากแปลน (Pan) - ใช้เมาส์/นิ้วลากย้ายมุมมอง หรือ หมุน Wheel เพื่อ Zoom'}
                {toolMode === 'column' && 'คลิกจุดตัดกริดเสา เพื่อวางเสา (ค่าเริ่มต้น 0.20x0.20 ม.)'}
                {toolMode === 'wall' &&
                  (wallStartPoint
                    ? `กำลังลากผนังจากจุด (${wallStartPoint.x}m, ${wallStartPoint.y}m) - ย้ายเมาส์แล้วคลิกจุดสิ้นสุด`
                    : 'คลิกจุดเริ่มต้นผนัง (ล็อคฉากแนวตั้ง-แนวนอนอัตโนมัติ)')}
                {toolMode === 'opening' && 'คลิกที่เส้นผนัง เพื่อวางประตู/หน้าต่าง'}
                {toolMode === 'defect' && 'คลิกตำแหน่งบนแปลน เพื่อปักหมุดแนบรูปถ่ายสำรวจ'}
                {toolMode === 'room' && 'คลิกตำแหน่งบนแปลน เพื่อปักหมุดชื่อห้องและคำนวณพื้นที่ (พื้น/ฝ้า/ผนังสุทธิ)'}
                {toolMode === 'grid_edit' && 'จัดการระยะห่างกริดลาย X และ Y'}
              </span>
            </div>

            {/* Current Mouse Coordinates Display */}
            {hoverMeterPos && (
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-[11px] font-mono text-sky-400">
                <MousePointer className="w-3 h-3 text-sky-400" />
                <span>X: {hoverMeterPos.x.toFixed(1)}m, Y: {hoverMeterPos.y.toFixed(1)}m</span>
              </div>
            )}
          </div>

          <svg
            className="w-full h-full"
            onClick={handleCanvasClick}
            onMouseMove={handleSvgMouseMove}
            onMouseLeave={() => setHoverMeterPos(null)}
            style={{ touchAction: 'none' }}
          >
            <defs>
              {/* Minor grid pattern */}
              <pattern 
                id="cadGridMinor" 
                width={zoom / 2} 
                height={zoom / 2} 
                patternUnits="userSpaceOnUse"
              >
                <path d={`M ${zoom / 2} 0 L 0 0 0 ${zoom / 2}`} fill="none" stroke="#1e293b" strokeWidth="0.5" />
              </pattern>
              {/* Major 1-meter grid pattern */}
              <pattern 
                id="cadGrid1m" 
                width={zoom} 
                height={zoom} 
                patternUnits="userSpaceOnUse"
                patternTransform={`translate(${-(sortedGridX[0]?.positionMeters || 0) * zoom + pan.x}, ${-(sortedGridY[0]?.positionMeters || 0) * zoom + pan.y})`}
              >
                <rect width={zoom} height={zoom} fill="url(#cadGridMinor)" />
                <path d={`M ${zoom} 0 L 0 0 0 ${zoom}`} fill="none" stroke="#334155" strokeWidth="1" />
              </pattern>
            </defs>

            {/* Canvas Background Grid */}
            <rect id="cad-grid-bg" width="100%" height="100%" fill="url(#cadGrid1m)" />

            <g transform={`translate(${pan.x}, ${pan.y})`}>
              {/* 1. Grid Lines X (Vertical lines: Grid A, B, C...) */}
              {sortedGridX.map((gx) => {
                const posX = (gx.positionMeters - (sortedGridX[0]?.positionMeters || 0)) * zoom;
                const lineStartY = -40;
                const lineEndY = extendedGridY * zoom + 40;

                return (
                  <g key={gx.id}>
                    {/* Dashed Grid Line */}
                    <line
                      x1={posX}
                      y1={lineStartY}
                      x2={posX}
                      y2={lineEndY}
                      stroke="#0284c7"
                      strokeWidth="1.5"
                      strokeDasharray="6,4"
                      opacity="0.8"
                    />
                    {/* Top Grid Bubble */}
                    <circle cx={posX} cy={-35} r={16} fill="#0f172a" stroke="#0284c7" strokeWidth="2" />
                    <text
                      x={posX}
                      y={-29}
                      textAnchor="middle"
                      fill="#38bdf8"
                      fontSize="14"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                    >
                      {gx.label}
                    </text>
                    {/* Bottom Grid Bubble */}
                    <circle cx={posX} cy={lineEndY + 15} r={16} fill="#0f172a" stroke="#0284c7" strokeWidth="2" />
                    <text
                      x={posX}
                      y={lineEndY + 21}
                      textAnchor="middle"
                      fill="#38bdf8"
                      fontSize="14"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                    >
                      {gx.label}
                    </text>
                    {/* Cumulative position dimension label */}
                    <text
                      x={posX}
                      y={-56}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {gx.positionMeters}m
                    </text>
                  </g>
                );
              })}

              {/* Inter-Grid X Span Dimension Lines (ระยะห่างระหว่างกริด X) */}
              {sortedGridX.map((gx, idx) => {
                if (idx === 0) return null;
                const prevGx = sortedGridX[idx - 1];
                const x1 = (prevGx.positionMeters - (sortedGridX[0]?.positionMeters || 0)) * zoom;
                const x2 = (gx.positionMeters - (sortedGridX[0]?.positionMeters || 0)) * zoom;
                const spanMeters = Math.round((gx.positionMeters - prevGx.positionMeters) * 100) / 100;
                const midX = (x1 + x2) / 2;

                return (
                  <g
                    key={`dim_gx_${gx.id}`}
                    className="cursor-pointer group"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditSpanModal('X', prevGx, gx, spanMeters);
                    }}
                  >
                    <title>{`คลิกเพื่อแก้ไขระยะห่างระหว่างกริด ${prevGx.label} ถึง ${gx.label} (ปัจจุบัน ${spanMeters}m)`}</title>
                    {/* Dimension Line above top bubble */}
                    <line x1={x1} y1={-72} x2={x2} y2={-72} stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3,2" className="group-hover:stroke-amber-400 group-hover:stroke-[2]" />
                    <line x1={x1} y1={-77} x2={x1} y2={-67} stroke="#38bdf8" strokeWidth="1.8" className="group-hover:stroke-amber-400" />
                    <line x1={x2} y1={-77} x2={x2} y2={-67} stroke="#38bdf8" strokeWidth="1.8" className="group-hover:stroke-amber-400" />
                    {/* Dimension Badge */}
                    <rect
                      x={midX - 32}
                      y={-85}
                      width={64}
                      height={22}
                      rx={5}
                      fill="#0f172a"
                      stroke="#0284c7"
                      strokeWidth="1.5"
                      className="transition-all group-hover:fill-sky-950 group-hover:stroke-amber-400 group-hover:scale-110 drop-shadow-md"
                    />
                    <text
                      x={midX}
                      y={-70}
                      textAnchor="middle"
                      fill="#38bdf8"
                      fontSize="11"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                      className="group-hover:fill-amber-300 transition-colors"
                    >
                      ✏️ {spanMeters.toFixed(1)}m
                    </text>
                  </g>
                );
              })}

              {/* Quick Add Grid X Button (+) after last Grid X */}
              {sortedGridX.length > 0 && (() => {
                const lastGx = sortedGridX[sortedGridX.length - 1];
                const lastX = lastGx.positionMeters * zoom;
                const btnX = lastX + 50;
                const lineEndY = extendedGridY * zoom + 40;

                return (
                  <g
                    className="cursor-pointer group"
                    onClick={(e) => {
                      e.stopPropagation();
                      openAddGridModal('X');
                    }}
                  >
                    {/* Connection line */}
                    <line x1={lastX + 16} y1={-35} x2={btnX - 16} y2={-35} stroke="#38bdf8" strokeWidth="1" strokeDasharray="3,3" />
                    {/* Top + Bubble */}
                    <circle
                      cx={btnX}
                      cy={-35}
                      r={16}
                      fill="#0284c7"
                      stroke="#38bdf8"
                      strokeWidth="2"
                      className="transition-all group-hover:scale-110 drop-shadow-[0_0_10px_rgba(56,189,248,0.7)]"
                    />
                    <text
                      x={btnX}
                      y={-29}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="18"
                      fontWeight="bold"
                    >
                      +
                    </text>
                    <text
                      x={btnX}
                      y={-56}
                      textAnchor="middle"
                      fill="#38bdf8"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      +เพิ่มกริด X
                    </text>

                    {/* Bottom + Bubble */}
                    <circle
                      cx={btnX}
                      cy={lineEndY + 15}
                      r={16}
                      fill="#0284c7"
                      stroke="#38bdf8"
                      strokeWidth="2"
                      className="transition-all group-hover:scale-110 drop-shadow-[0_0_10px_rgba(56,189,248,0.7)]"
                    />
                    <text
                      x={btnX}
                      y={lineEndY + 21}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="18"
                      fontWeight="bold"
                    >
                      +
                    </text>
                  </g>
                );
              })()}

              {/* 2. Grid Lines Y (Horizontal lines: Grid 1, 2, 3...) */}
              {sortedGridY.map((gy) => {
                const posY = (gy.positionMeters - (sortedGridY[0]?.positionMeters || 0)) * zoom;
                const lineStartX = -40;
                const lineEndX = extendedGridX * zoom + 40;

                return (
                  <g key={gy.id}>
                    {/* Dashed Grid Line */}
                    <line
                      x1={lineStartX}
                      y1={posY}
                      x2={lineEndX}
                      y2={posY}
                      stroke="#0284c7"
                      strokeWidth="1.5"
                      strokeDasharray="6,4"
                      opacity="0.8"
                    />
                    {/* Left Grid Bubble */}
                    <circle cx={-35} cy={posY} r={16} fill="#0f172a" stroke="#0284c7" strokeWidth="2" />
                    <text
                      x={-35}
                      y={posY + 5}
                      textAnchor="middle"
                      fill="#38bdf8"
                      fontSize="14"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                    >
                      {gy.label}
                    </text>
                    {/* Right Grid Bubble */}
                    <circle cx={lineEndX + 15} cy={posY} r={16} fill="#0f172a" stroke="#0284c7" strokeWidth="2" />
                    <text
                      x={lineEndX + 15}
                      y={posY + 5}
                      textAnchor="middle"
                      fill="#38bdf8"
                      fontSize="14"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                    >
                      {gy.label}
                    </text>
                    {/* Cumulative position dimension label */}
                    <text
                      x={-56}
                      y={posY + 3}
                      textAnchor="end"
                      fill="#94a3b8"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {gy.positionMeters}m
                    </text>
                  </g>
                );
              })}

              {/* Inter-Grid Y Span Dimension Lines (ระยะห่างระหว่างกริด Y) */}
              {sortedGridY.map((gy, idx) => {
                if (idx === 0) return null;
                const prevGy = sortedGridY[idx - 1];
                const y1 = (prevGy.positionMeters - (sortedGridY[0]?.positionMeters || 0)) * zoom;
                const y2 = (gy.positionMeters - (sortedGridY[0]?.positionMeters || 0)) * zoom;
                const spanMeters = Math.round((gy.positionMeters - prevGy.positionMeters) * 100) / 100;
                const midY = (y1 + y2) / 2;

                return (
                  <g
                    key={`dim_gy_${gy.id}`}
                    className="cursor-pointer group"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditSpanModal('Y', prevGy, gy, spanMeters);
                    }}
                  >
                    <title>{`คลิกเพื่อแก้ไขระยะห่างระหว่างกริด ${prevGy.label} ถึง ${gy.label} (ปัจจุบัน ${spanMeters}m)`}</title>
                    {/* Dimension Line left of grid bubble */}
                    <line x1={-72} y1={y1} x2={-72} y2={y2} stroke="#10b981" strokeWidth="1.5" strokeDasharray="3,2" className="group-hover:stroke-amber-400 group-hover:stroke-[2]" />
                    <line x1={-77} y1={y1} x2={-67} y2={y1} stroke="#10b981" strokeWidth="1.8" className="group-hover:stroke-amber-400" />
                    <line x1={-77} y1={y2} x2={-67} y2={y2} stroke="#10b981" strokeWidth="1.8" className="group-hover:stroke-amber-400" />
                    {/* Dimension Badge */}
                    <rect
                      x={-112}
                      y={midY - 11}
                      width={64}
                      height={22}
                      rx={5}
                      fill="#0f172a"
                      stroke="#059669"
                      strokeWidth="1.5"
                      className="transition-all group-hover:fill-emerald-950 group-hover:stroke-amber-400 group-hover:scale-110 drop-shadow-md"
                    />
                    <text
                      x={-80}
                      y={midY + 4}
                      textAnchor="middle"
                      fill="#34d399"
                      fontSize="11"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                      className="group-hover:fill-amber-300 transition-colors"
                    >
                      ✏️ {spanMeters.toFixed(1)}m
                    </text>
                  </g>
                );
              })}

              {/* Quick Add Grid Y Button (+) after last Grid Y */}
              {sortedGridY.length > 0 && (() => {
                const lastGy = sortedGridY[sortedGridY.length - 1];
                const lastY = lastGy.positionMeters * zoom;
                const btnY = lastY + 50;
                const lineEndX = extendedGridX * zoom + 40;

                return (
                  <g
                    className="cursor-pointer group"
                    onClick={(e) => {
                      e.stopPropagation();
                      openAddGridModal('Y');
                    }}
                  >
                    {/* Connection line */}
                    <line x1={-35} y1={lastY + 16} x2={-35} y2={btnY - 16} stroke="#34d399" strokeWidth="1" strokeDasharray="3,3" />
                    {/* Left + Bubble */}
                    <circle
                      cx={-35}
                      cy={btnY}
                      r={16}
                      fill="#059669"
                      stroke="#34d399"
                      strokeWidth="2"
                      className="transition-all group-hover:scale-110 drop-shadow-[0_0_10px_rgba(52,211,153,0.7)]"
                    />
                    <text
                      x={-35}
                      y={btnY + 6}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="18"
                      fontWeight="bold"
                    >
                      +
                    </text>
                    <text
                      x={-56}
                      y={btnY + 3}
                      textAnchor="end"
                      fill="#34d399"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      +เพิ่มกริด Y
                    </text>

                    {/* Right + Bubble */}
                    <circle
                      cx={lineEndX + 15}
                      cy={btnY}
                      r={16}
                      fill="#059669"
                      stroke="#34d399"
                      strokeWidth="2"
                      className="transition-all group-hover:scale-110 drop-shadow-[0_0_10px_rgba(52,211,153,0.7)]"
                    />
                    <text
                      x={lineEndX + 15}
                      y={btnY + 6}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="18"
                      fontWeight="bold"
                    >
                      +
                    </text>
                  </g>
                );
              })()}

              {/* 3. Render Walls (เส้นผนัง) */}
              {floorPlan.walls.map((wall) => {
                const x1 = wall.startX * zoom;
                const y1 = wall.startY * zoom;
                const x2 = wall.endX * zoom;
                const y2 = wall.endY * zoom;

                const thicknessPx = (wall.thicknessCm / 100) * zoom;
                const isSelected = selectedWallId === wall.id;

                // Color based on material & defect condition
                let strokeColor = '#94a3b8'; // default
                if (wall.material === 'full_brick') strokeColor = '#f97316';
                if (wall.material === 'half_brick') strokeColor = '#fb923c';
                if (wall.material === 'aac_block') strokeColor = '#38bdf8';
                if (wall.material === 'timber_board') strokeColor = '#d97706';

                if (wall.condition === 'structural_crack') strokeColor = '#ef4444';

                return (
                  <g
                    key={wall.id}
                    onClick={(e) => {
                      if (toolMode === 'wall') return;
                      if (toolMode === 'opening') {
                        e.stopPropagation();
                        handleWallClickToPlaceOpening(e, wall);
                      } else {
                        e.stopPropagation();
                        setSelectedWallId(wall.id);
                        setSelectedColId(null);
                        setSelectedOpeningId(null);
                        setSelectedDefectId(null);
                        setSelectedRoomId(null);
                        setDraggingWallId(null);
                        setDraggingWallHandle(null);
                        setWallDragInitialCoords(null);
                        setToolMode('select');
                      }
                    }}
                    className="cursor-pointer group"
                  >
                    {/* Base Thick Wall Line */}
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={strokeColor}
                      strokeWidth={Math.max(thicknessPx, 6)}
                      strokeLinecap="square"
                      onMouseDown={(e) => handleStartDragWallBody(e, wall)}
                      onTouchStart={(e) => handleStartDragWallBody(e, wall)}
                      className={`transition-all cursor-pointer ${isSelected ? 'stroke-amber-400 opacity-100' : 'opacity-90 hover:opacity-100'}`}
                    />

                    {/* Wall Dimension / Length Parallel to Wall (Removed per user request) */}
                    {(() => {
                      return null;
                    })()}

                    {/* Selection outline and drag handles */}
                    {isSelected && (
                      <>
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke="#f59e0b"
                          strokeWidth={Math.max(thicknessPx, 6) + 4}
                          strokeDasharray="4,4"
                          fill="none"
                        />
                        {/* Start handle */}
                        <circle
                          cx={x1}
                          cy={y1}
                          r={6}
                          fill="#f59e0b"
                          stroke="#ffffff"
                          strokeWidth="2"
                          onMouseDown={(e) => handleStartDragWallHandle(e, wall, 'start')}
                          onTouchStart={(e) => handleStartDragWallHandle(e, wall, 'start')}
                          onClick={(e) => e.stopPropagation()}
                          className="cursor-pointer hover:scale-125 transition-transform"
                        />
                        {/* End handle */}
                        <circle
                          cx={x2}
                          cy={y2}
                          r={6}
                          fill="#f59e0b"
                          stroke="#ffffff"
                          strokeWidth="2"
                          onMouseDown={(e) => handleStartDragWallHandle(e, wall, 'end')}
                          onTouchStart={(e) => handleStartDragWallHandle(e, wall, 'end')}
                          onClick={(e) => e.stopPropagation()}
                          className="cursor-pointer hover:scale-125 transition-transform"
                        />

                        {/* Nearest columns or walls dimension lines */}
                        {(() => {
                          const mx = (wall.startX + wall.endX) / 2;
                          const my = (wall.startY + wall.endY) / 2;
                          const mxPx = mx * zoom;
                          const myPx = my * zoom;

                          let minXDist = Infinity;
                          let nearestX = 0;
                          let minYDist = Infinity;
                          let nearestY = 0;

                          // Check columns
                          floorPlan.columns.forEach((col) => {
                            const w2 = (col.widthCm / 2) / 100;
                            const d2 = (col.depthCm / 2) / 100;
                            const xCoords = [col.x - w2, col.x, col.x + w2];
                            const yCoords = [col.y - d2, col.y, col.y + d2];

                            xCoords.forEach((cx) => {
                              const dist = Math.abs(cx - mx);
                              if (dist > 0.01 && dist < minXDist) {
                                minXDist = dist;
                                nearestX = cx;
                              }
                            });

                            yCoords.forEach((cy) => {
                              const dist = Math.abs(cy - my);
                              if (dist > 0.01 && dist < minYDist) {
                                minYDist = dist;
                                nearestY = cy;
                              }
                            });
                          });

                          // Check other walls
                          floorPlan.walls.forEach((other) => {
                            if (other.id === wall.id) return;
                            const xCoords = [other.startX, other.endX, (other.startX + other.endX) / 2];
                            const yCoords = [other.startY, other.endY, (other.startY + other.endY) / 2];

                            xCoords.forEach((cx) => {
                              const dist = Math.abs(cx - mx);
                              if (dist > 0.01 && dist < minXDist) {
                                minXDist = dist;
                                nearestX = cx;
                              }
                            });

                            yCoords.forEach((cy) => {
                              const dist = Math.abs(cy - my);
                              if (dist > 0.01 && dist < minYDist) {
                                minYDist = dist;
                                nearestY = cy;
                              }
                            });
                          });

                          const showX = minXDist > 0.02 && minXDist < 6.0;
                          const showY = minYDist > 0.02 && minYDist < 6.0;

                          return (
                            <>
                              {showX && (
                                <g className="pointer-events-none select-none">
                                  {/* Horizontal Dimension line along X axis to nearest vertical edge */}
                                  <line
                                    x1={mxPx}
                                    y1={myPx}
                                    x2={nearestX * zoom}
                                    y2={myPx}
                                    stroke="#ef4444"
                                    strokeWidth="1.5"
                                    strokeDasharray="3,3"
                                  />
                                  {/* Left & Right tick marks */}
                                  <line x1={mxPx} y1={myPx - 4} x2={mxPx} y2={myPx + 4} stroke="#ef4444" strokeWidth="1.5" />
                                  <line x1={nearestX * zoom} y1={myPx - 4} x2={nearestX * zoom} y2={myPx + 4} stroke="#ef4444" strokeWidth="1.5" />
                                  {/* Dimension text */}
                                  <text
                                    x={(mxPx + nearestX * zoom) / 2}
                                    y={myPx - 7}
                                    fill="#ef4444"
                                    fontSize="10"
                                    fontWeight="extrabold"
                                    fontFamily="monospace"
                                    textAnchor="middle"
                                    stroke="#020617"
                                    strokeWidth="3.5"
                                    paintOrder="stroke"
                                  >
                                    {minXDist.toFixed(2)}m
                                  </text>
                                </g>
                              )}
                              {showY && (
                                <g className="pointer-events-none select-none">
                                  {/* Vertical Dimension line along Y axis to nearest horizontal edge */}
                                  <line
                                    x1={mxPx}
                                    y1={myPx}
                                    x2={mxPx}
                                    y2={nearestY * zoom}
                                    stroke="#ef4444"
                                    strokeWidth="1.5"
                                    strokeDasharray="3,3"
                                  />
                                  {/* Top & Bottom tick marks */}
                                  <line x1={mxPx - 4} y1={myPx} x2={mxPx + 4} y2={myPx} stroke="#ef4444" strokeWidth="1.5" />
                                  <line x1={mxPx - 4} y1={nearestY * zoom} x2={mxPx + 4} y2={nearestY * zoom} stroke="#ef4444" strokeWidth="1.5" />
                                  {/* Dimension text */}
                                  <text
                                    x={mxPx + 7}
                                    y={(myPx + nearestY * zoom) / 2}
                                    fill="#ef4444"
                                    fontSize="10"
                                    fontWeight="extrabold"
                                    fontFamily="monospace"
                                    alignmentBaseline="middle"
                                    stroke="#020617"
                                    strokeWidth="3.5"
                                    paintOrder="stroke"
                                  >
                                    {minYDist.toFixed(2)}m
                                  </text>
                                </g>
                              )}
                            </>
                          );
                        })()}
                      </>
                    )}

                    {/* Wall-to-Grid guidelines (แสดงระยะจากกริดลายเมื่อเลือกหรือเลื่อนผนัง หรือแสดงตลอดเวลา) */}
                    {(() => {
                      // We will find nearest grid lines for start point and end point
                      
                      // For Start Point
                      let startGridX: typeof floorPlan.gridX[0] | null = null;
                      let startGridXDist = Infinity;
                      floorPlan.gridX.forEach((g) => {
                        const dist = Math.abs(g.positionMeters - wall.startX);
                        if (dist < startGridXDist) {
                          startGridXDist = dist;
                          startGridX = g;
                        }
                      });

                      let startGridY: typeof floorPlan.gridY[0] | null = null;
                      let startGridYDist = Infinity;
                      floorPlan.gridY.forEach((g) => {
                        const dist = Math.abs(g.positionMeters - wall.startY);
                        if (dist < startGridYDist) {
                          startGridYDist = dist;
                          startGridY = g;
                        }
                      });

                      // For End Point
                      let endGridX: typeof floorPlan.gridX[0] | null = null;
                      let endGridXDist = Infinity;
                      floorPlan.gridX.forEach((g) => {
                        const dist = Math.abs(g.positionMeters - wall.endX);
                        if (dist < endGridXDist) {
                          endGridXDist = dist;
                          endGridX = g;
                        }
                      });

                      let endGridY: typeof floorPlan.gridY[0] | null = null;
                      let endGridYDist = Infinity;
                      floorPlan.gridY.forEach((g) => {
                        const dist = Math.abs(g.positionMeters - wall.endY);
                        if (dist < endGridYDist) {
                          endGridYDist = dist;
                          endGridY = g;
                        }
                      });

                      const showStartX = startGridX !== null && startGridXDist > 0.01 && startGridXDist < 6.0;
                      const showStartY = startGridY !== null && startGridYDist > 0.01 && startGridYDist < 6.0;
                      const showEndX = endGridX !== null && endGridXDist > 0.01 && endGridXDist < 6.0;
                      const showEndY = endGridY !== null && endGridYDist > 0.01 && endGridYDist < 6.0;

                      return (
                        <g className="pointer-events-none select-none opacity-85">
                          {/* Start Point Guidelines */}
                          {showStartX && startGridX && (
                            <g>
                              <line
                                x1={startGridX.positionMeters * zoom}
                                y1={y1}
                                x2={x1}
                                y2={y1}
                                stroke="#10b981"
                                strokeWidth="1.2"
                                strokeDasharray="3,3"
                              />
                              <line x1={startGridX.positionMeters * zoom} y1={y1 - 4} x2={startGridX.positionMeters * zoom} y2={y1 + 4} stroke="#10b981" strokeWidth="1.2" />
                              <line x1={x1} y1={y1 - 4} x2={x1} y2={y1 + 4} stroke="#10b981" strokeWidth="1.2" />
                              <text
                                x={((startGridX.positionMeters * zoom) + x1) / 2}
                                y={y1 - 6}
                                textAnchor="middle"
                                fill="#10b981"
                                fontSize="9"
                                fontWeight="bold"
                                fontFamily="monospace"
                                stroke="#020617"
                                strokeWidth="2.5"
                                paintOrder="stroke"
                              >
                                {startGridXDist.toFixed(2)}m
                              </text>
                            </g>
                          )}
                          {showStartY && startGridY && (
                            <g>
                              <line
                                x1={x1}
                                y1={startGridY.positionMeters * zoom}
                                x2={x1}
                                y2={y1}
                                stroke="#10b981"
                                strokeWidth="1.2"
                                strokeDasharray="3,3"
                              />
                              <line x1={x1 - 4} y1={startGridY.positionMeters * zoom} x2={x1 + 4} y2={startGridY.positionMeters * zoom} stroke="#10b981" strokeWidth="1.2" />
                              <line x1={x1 - 4} y1={y1} x2={x1 + 4} y2={y1} stroke="#10b981" strokeWidth="1.2" />
                              <text
                                x={x1 + 6}
                                y={((startGridY.positionMeters * zoom) + y1) / 2 + 3}
                                textAnchor="start"
                                fill="#10b981"
                                fontSize="9"
                                fontWeight="bold"
                                fontFamily="monospace"
                                stroke="#020617"
                                strokeWidth="2.5"
                                paintOrder="stroke"
                              >
                                {startGridYDist.toFixed(2)}m
                              </text>
                            </g>
                          )}

                          {/* End Point Guidelines */}
                          {showEndX && endGridX && (
                            <g>
                              <line
                                x1={endGridX.positionMeters * zoom}
                                y1={y2}
                                x2={x2}
                                y2={y2}
                                stroke="#10b981"
                                strokeWidth="1.2"
                                strokeDasharray="3,3"
                              />
                              <line x1={endGridX.positionMeters * zoom} y1={y2 - 4} x2={endGridX.positionMeters * zoom} y2={y2 + 4} stroke="#10b981" strokeWidth="1.2" />
                              <line x1={x2} y1={y2 - 4} x2={x2} y2={y2 + 4} stroke="#10b981" strokeWidth="1.2" />
                              <text
                                x={((endGridX.positionMeters * zoom) + x2) / 2}
                                y={y2 - 6}
                                textAnchor="middle"
                                fill="#10b981"
                                fontSize="9"
                                fontWeight="bold"
                                fontFamily="monospace"
                                stroke="#020617"
                                strokeWidth="2.5"
                                paintOrder="stroke"
                              >
                                {endGridXDist.toFixed(2)}m
                              </text>
                            </g>
                          )}
                          {showEndY && endGridY && (
                            <g>
                              <line
                                x1={x2}
                                y1={endGridY.positionMeters * zoom}
                                x2={x2}
                                y2={y2}
                                stroke="#10b981"
                                strokeWidth="1.2"
                                strokeDasharray="3,3"
                              />
                              <line x1={x2 - 4} y1={endGridY.positionMeters * zoom} x2={x2 + 4} y2={endGridY.positionMeters * zoom} stroke="#10b981" strokeWidth="1.2" />
                              <line x1={x2 - 4} y1={y2} x2={x2 + 4} y2={y2} stroke="#10b981" strokeWidth="1.2" />
                              <text
                                x={x2 + 6}
                                y={((endGridY.positionMeters * zoom) + y2) / 2 + 3}
                                textAnchor="start"
                                fill="#10b981"
                                fontSize="9"
                                fontWeight="bold"
                                fontFamily="monospace"
                                stroke="#020617"
                                strokeWidth="2.5"
                                paintOrder="stroke"
                              >
                                {endGridYDist.toFixed(2)}m
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    })()}

                  </g>
                );
              })}

              {/* 4. Render Wall Openings (ประตู - หน้าต่าง) */}
              {floorPlan.openings.map((op) => {
                const parentWall = floorPlan.walls.find((w) => w.id === op.wallId);
                if (!parentWall) return null;

                const wx1 = parentWall.startX * zoom;
                const wy1 = parentWall.startY * zoom;
                const wx2 = parentWall.endX * zoom;
                const wy2 = parentWall.endY * zoom;

                // Position on wall
                const opX = wx1 + (wx2 - wx1) * op.positionOnWallRatio;
                const opY = wy1 + (wy2 - wy1) * op.positionOnWallRatio;

                const opWidthPx = (op.widthCm / 100) * zoom;
                const wallThicknessPx = (parentWall.thicknessCm / 100) * zoom;
                const isSelected = selectedOpeningId === op.id;
                const isDragging = draggingOpeningId === op.id;

                const isDoor = op.type === 'door';

                // Calculate dimensions for guidelines
                const wallDX = parentWall.endX - parentWall.startX;
                const wallDY = parentWall.endY - parentWall.startY;
                const wallLen = Math.sqrt(wallDX * wallDX + wallDY * wallDY);
                const opPosX = parentWall.startX + wallDX * op.positionOnWallRatio;
                const opPosY = parentWall.startY + wallDY * op.positionOnWallRatio;
                const opWidthM = op.widthCm / 100;
                const distToStart = (op.positionOnWallRatio * wallLen) - (opWidthM / 2);
                const distToEnd = ((1 - op.positionOnWallRatio) * wallLen) - (opWidthM / 2);

                // Find nearest grid lines
                let nearestGridX: typeof floorPlan.gridX[0] | null = null;
                let minDistX = Infinity;
                floorPlan.gridX.forEach(gx => {
                  const d = Math.abs(gx.positionMeters - opPosX);
                  if (d < minDistX) { minDistX = d; nearestGridX = gx; }
                });

                let nearestGridY: typeof floorPlan.gridY[0] | null = null;
                let minDistY = Infinity;
                floorPlan.gridY.forEach(gy => {
                  const d = Math.abs(gy.positionMeters - opPosY);
                  if (d < minDistY) { minDistY = d; nearestGridY = gy; }
                });

                return (
                  <g
                    key={op.id}
                    onClick={(e) => {
                      if (toolMode === 'wall') return;
                      e.stopPropagation();
                      setSelectedOpeningId(op.id);
                      setSelectedColId(null);
                      setSelectedWallId(null);
                      setSelectedDefectId(null);
                      setSelectedRoomId(null);
                      setDraggingOpeningId(null);
                      setToolMode('select');
                    }}
                    onMouseDown={(e) => handleStartDragOpening(e, op.id)}
                    onTouchStart={(e) => handleStartDragOpening(e, op.id)}
                    className="cursor-pointer"
                  >
                    {/* Opening Cutout box */}
                    <rect
                      x={-opWidthPx / 2}
                      y={-wallThicknessPx / 2}
                      width={opWidthPx}
                      height={wallThicknessPx}
                      fill={isDoor ? '#0284c7' : '#a855f7'}
                      stroke={isSelected ? '#f59e0b' : '#ffffff'}
                      strokeWidth={isSelected ? 2 : 1}
                      rx={1}
                      transform={`translate(${opX}, ${opY}) rotate(${(Math.atan2(wallDY, wallDX) * 180) / Math.PI})`}
                    />

                    {/* Guidelines and Dimensions when selected or dragging */}
                    {(isSelected || isDragging) && (
                      <g>
                        {/* 1. Distance to Wall Start */}
                        <line 
                          x1={wx1} y1={wy1} 
                          x2={opX - (wallDX / wallLen) * (opWidthPx / 2)} 
                          y2={opY - (wallDY / wallLen) * (opWidthPx / 2)} 
                          stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,2" 
                        />
                        <text 
                          x={(wx1 + opX - (wallDX / wallLen) * (opWidthPx / 2)) / 2} 
                          y={(wy1 + opY - (wallDY / wallLen) * (opWidthPx / 2)) / 2}
                          fill="#f59e0b" fontSize="14" fontWeight="bold" textAnchor="middle"
                          stroke="#020617" strokeWidth="3" paintOrder="stroke"
                          transform={`rotate(${(Math.atan2(wallDY, wallDX) * 180) / Math.PI}, ${(wx1 + opX - (wallDX / wallLen) * (opWidthPx / 2)) / 2}, ${(wy1 + opY - (wallDY / wallLen) * (opWidthPx / 2)) / 2}) translate(0, -10)`}
                        >
                          {distToStart.toFixed(2)}m
                        </text>

                        {/* 2. Distance to Wall End */}
                        <line 
                          x1={wx2} y1={wy2} 
                          x2={opX + (wallDX / wallLen) * (opWidthPx / 2)} 
                          y2={opY + (wallDY / wallLen) * (opWidthPx / 2)} 
                          stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,2" 
                        />
                        <text 
                          x={(wx2 + opX + (wallDX / wallLen) * (opWidthPx / 2)) / 2} 
                          y={(wy2 + opY + (wallDY / wallLen) * (opWidthPx / 2)) / 2}
                          fill="#f59e0b" fontSize="14" fontWeight="bold" textAnchor="middle"
                          stroke="#020617" strokeWidth="3" paintOrder="stroke"
                          transform={`rotate(${(Math.atan2(wallDY, wallDX) * 180) / Math.PI}, ${(wx2 + opX + (wallDX / wallLen) * (opWidthPx / 2)) / 2}, ${(wy2 + opY + (wallDY / wallLen) * (opWidthPx / 2)) / 2}) translate(0, -10)`}
                        >
                          {distToEnd.toFixed(2)}m
                        </text>

                        {/* 3. Distance to nearest X grid */}
                        {nearestGridX && Math.abs(nearestGridX.positionMeters - opPosX) > 0.05 && (
                          <g>
                            <line 
                              x1={nearestGridX.positionMeters * zoom} y1={opY} 
                              x2={opX} y2={opY} 
                              stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="5,3" 
                            />
                            <text 
                              x={(nearestGridX.positionMeters * zoom + opX) / 2} 
                              y={opY - 20}
                              fill="#0ea5e9" fontSize="14" fontWeight="bold" textAnchor="middle"
                              stroke="#020617" strokeWidth="3" paintOrder="stroke"
                            >
                              {(nearestGridX.positionMeters - opPosX).toFixed(2)}m
                            </text>
                          </g>
                        )}

                        {/* 4. Distance to nearest Y grid */}
                        {nearestGridY && Math.abs(nearestGridY.positionMeters - opPosY) > 0.05 && (
                          <g>
                            <line 
                              x1={opX} y1={nearestGridY.positionMeters * zoom} 
                              x2={opX} y2={opY} 
                              stroke="#10b981" strokeWidth="1.5" strokeDasharray="5,3" 
                            />
                            <text 
                              x={opX + 10} 
                              y={(nearestGridY.positionMeters * zoom + opY) / 2}
                              fill="#10b981" fontSize="14" fontWeight="bold" textAnchor="start"
                              stroke="#020617" strokeWidth="3" paintOrder="stroke"
                            >
                              {(nearestGridY.positionMeters - opPosY).toFixed(2)}m
                            </text>
                          </g>
                        )}
                      </g>
                    )}

                    {/* Rotated Label (Single Line) */}
                    <g transform={`translate(${opX}, ${opY}) rotate(${(Math.atan2(wallDY, wallDX) * 180) / Math.PI})`}>
                      <text
                        x={0}
                        y={0}
                        dy={4}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="10"
                        fontWeight="bold"
                        className="pointer-events-none select-none"
                        stroke="#000000"
                        strokeWidth="2"
                        paintOrder="stroke"
                      >
                        {op.label} ({op.widthCm}x{op.heightCm})
                      </text>
                    </g>

                  </g>
                );
              })}

              {/* 5. Render Columns (เสา) */}
              {floorPlan.columns.map((col) => {
                const colX = col.x * zoom;
                const colY = col.y * zoom;

                const widthPx = (col.widthCm / 100) * zoom;
                const depthPx = (col.depthCm / 100) * zoom;

                const isSelected = selectedColId === col.id;

                let fillColor = '#0284c7'; // default RC
                if (col.material === 'Steel') fillColor = '#6366f1';
                if (col.material === 'Timber') fillColor = '#d97706';
                if (col.material === 'Masonry') fillColor = '#ea580c';

                if (col.condition === 'critical_spalling') fillColor = '#dc2626';

                // Calculate offset dimensions if not on grid
                let hasXOffset = false; let hasYOffset = false;
                let nearestX = 0; let minXDist = Infinity;
                let nearestY = 0; let minYDist = Infinity;

                if (col.gridXLabel === 'custom' || col.gridYLabel === 'custom') {
                  floorPlan.gridX.forEach(g => {
                    const dist = Math.abs(g.positionMeters - col.x);
                    if (dist < minXDist) { minXDist = dist; nearestX = g.positionMeters; }
                  });
                  floorPlan.gridY.forEach(g => {
                    const dist = Math.abs(g.positionMeters - col.y);
                    if (dist < minYDist) { minYDist = dist; nearestY = g.positionMeters; }
                  });
                  hasXOffset = minXDist > 0.05 && minXDist !== Infinity;
                  hasYOffset = minYDist > 0.05 && minYDist !== Infinity;
                }

                return (
                  <g
                    key={col.id}
                    onClick={(e) => {
                      if (toolMode === 'wall') return;
                      e.stopPropagation();
                      setSelectedColId(col.id);
                      setSelectedWallId(null);
                      setSelectedOpeningId(null);
                      setSelectedDefectId(null);
                      setSelectedRoomId(null);
                      setDraggingColId(null);
                      setToolMode('select');
                    }}
                    onMouseDown={(e) => handleStartDragCol(e, col.id)}
                    onTouchStart={(e) => handleStartDragCol(e, col.id)}
                    className="cursor-pointer"
                  >
                    {/* Column Shape */}
                    {col.shape === 'rectangular' ? (
                      <rect
                        x={colX - widthPx / 2}
                        y={colY - depthPx / 2}
                        width={widthPx}
                        height={depthPx}
                        fill={fillColor}
                        stroke={isSelected ? '#f59e0b' : '#000000'}
                        strokeWidth={isSelected ? 3 : 1.5}
                        rx={1}
                      />
                    ) : (
                      <circle
                        cx={colX}
                        cy={colY}
                        r={widthPx / 2}
                        fill={fillColor}
                        stroke={isSelected ? '#f59e0b' : '#000000'}
                        strokeWidth={isSelected ? 3 : 1.5}
                      />
                    )}



                    {/* Grid line guidelines (แสดงระยะจากกริดลายเมื่อเลือกหรือเลื่อนเสา หรือแสดงตลอดเวลา) */}
                    {(() => {
                      let nearestGridX: typeof floorPlan.gridX[0] | null = null;
                      let minGridXDist = Infinity;
                      floorPlan.gridX.forEach((g) => {
                        const dist = Math.abs(g.positionMeters - col.x);
                        if (dist < minGridXDist) {
                          minGridXDist = dist;
                          nearestGridX = g;
                        }
                      });

                      let nearestGridY: typeof floorPlan.gridY[0] | null = null;
                      let minGridYDist = Infinity;
                      floorPlan.gridY.forEach((g) => {
                        const dist = Math.abs(g.positionMeters - col.y);
                        if (dist < minGridYDist) {
                          minGridYDist = dist;
                          nearestGridY = g;
                        }
                      });

                      const showXGuide = nearestGridX !== null && minGridXDist > 0.01;
                      const showYGuide = nearestGridY !== null && minGridYDist > 0.01;

                      return (
                        <g className="pointer-events-none select-none">
                          {showXGuide && nearestGridX && (
                            <g>
                              {/* Horizontal guideline */}
                              <line
                                x1={nearestGridX.positionMeters * zoom}
                                y1={colY}
                                x2={colX}
                                y2={colY}
                                stroke="#f59e0b"
                                strokeWidth="1.5"
                                strokeDasharray="4,3"
                              />
                              {/* Tick marks */}
                              <line x1={nearestGridX.positionMeters * zoom} y1={colY - 5} x2={nearestGridX.positionMeters * zoom} y2={colY + 5} stroke="#f59e0b" strokeWidth="1.5" />
                              <line x1={colX} y1={colY - 5} x2={colX} y2={colY + 5} stroke="#f59e0b" strokeWidth="1.5" />
                              {/* Dimension badge/label */}
                              <rect
                                x={((nearestGridX.positionMeters * zoom) + colX) / 2 - 25}
                                y={colY - 22}
                                width={50}
                                height={15}
                                rx={3}
                                fill="#0f172a"
                                stroke="#f59e0b"
                                strokeWidth="1"
                              />
                              <text
                                x={((nearestGridX.positionMeters * zoom) + colX) / 2}
                                y={colY - 11}
                                textAnchor="middle"
                                fill="#f59e0b"
                                fontSize="9"
                                fontWeight="bold"
                                fontFamily="monospace"
                              >
                                {minGridXDist.toFixed(2)}m
                              </text>
                            </g>
                          )}
                          {showYGuide && nearestGridY && (
                            <g>
                              {/* Vertical guideline */}
                              <line
                                x1={colX}
                                y1={nearestGridY.positionMeters * zoom}
                                x2={colX}
                                y2={colY}
                                stroke="#f59e0b"
                                strokeWidth="1.5"
                                strokeDasharray="4,3"
                              />
                              {/* Tick marks */}
                              <line x1={colX - 5} y1={nearestGridY.positionMeters * zoom} x2={colX + 5} y2={nearestGridY.positionMeters * zoom} stroke="#f59e0b" strokeWidth="1.5" />
                              <line x1={colX - 5} y1={colY} x2={colX + 5} y2={colY} stroke="#f59e0b" strokeWidth="1.5" />
                              {/* Dimension badge/label */}
                              <rect
                                x={colX + 8}
                                y={((nearestGridY.positionMeters * zoom) + colY) / 2 - 7}
                                width={50}
                                height={15}
                                rx={3}
                                fill="#0f172a"
                                stroke="#f59e0b"
                                strokeWidth="1"
                              />
                              <text
                                x={colX + 33}
                                y={((nearestGridY.positionMeters * zoom) + colY) / 2 + 4}
                                textAnchor="middle"
                                fill="#f59e0b"
                                fontSize="9"
                                fontWeight="bold"
                                fontFamily="monospace"
                              >
                                {minGridYDist.toFixed(2)}m
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    })()}
                  </g>
                );
              })}

              {/* 6. Render Defect / Photo Pin Markers (พินแนบรูปถ่ายสำรวจบนแปลน) */}
              {floorPlan.defectPins.map((def) => {
                const pinX = def.x * zoom;
                const pinY = def.y * zoom;
                const isSelected = selectedDefectId === def.id;

                return (
                  <g
                    key={def.id}
                    onClick={(e) => {
                      if (toolMode === 'wall') return;
                      e.stopPropagation();
                      setSelectedDefectId(def.id);
                      setSelectedColId(null);
                      setSelectedWallId(null);
                      setSelectedOpeningId(null);
                      setSelectedRoomId(null);
                      setToolMode('select');
                    }}
                    onMouseDown={(e) => {
                      if (toolMode === 'wall') return;
                      e.stopPropagation();
                      setSelectedDefectId(def.id);
                      setSelectedColId(null);
                      setSelectedWallId(null);
                      setSelectedOpeningId(null);
                      setSelectedRoomId(null);
                      setToolMode('select');
                    }}
                    onTouchStart={(e) => {
                      if (toolMode === 'wall') return;
                      e.stopPropagation();
                      setSelectedDefectId(def.id);
                      setSelectedColId(null);
                      setSelectedWallId(null);
                      setSelectedOpeningId(null);
                      setSelectedRoomId(null);
                      setToolMode('select');
                    }}
                    className="cursor-pointer group"
                  >
                    {def.photoUrl ? (
                      <g>
                        {/* Frame with Photo Thumbnail */}
                        <rect
                          x={pinX - 20}
                          y={pinY - 20}
                          width={40}
                          height={40}
                          rx={8}
                          fill="#0f172a"
                          stroke={isSelected ? '#38bdf8' : '#e11d48'}
                          strokeWidth={isSelected ? 3.5 : 2}
                          className={isSelected ? 'drop-shadow-[0_0_12px_rgba(56,189,248,0.9)]' : 'drop-shadow-lg'}
                        />
                        <image
                          href={def.photoUrl}
                          x={pinX - 17}
                          y={pinY - 17}
                          width={34}
                          height={34}
                          preserveAspectRatio="xMidYMid slice"
                        />
                        {/* Camera Mini Badge */}
                        <circle cx={pinX + 16} cy={pinY - 16} r={9} fill="#e11d48" stroke="#ffffff" strokeWidth="1.5" />
                        <text x={pinX + 16} y={pinY - 13} textAnchor="middle" fill="#ffffff" fontSize="9">📷</text>
                      </g>
                    ) : (
                      <g>
                        <circle
                          cx={pinX}
                          cy={pinY}
                          r={isSelected ? 15 : 13}
                          fill={isSelected ? '#0284c7' : '#e11d48'}
                          stroke={isSelected ? '#38bdf8' : '#ffffff'}
                          strokeWidth={isSelected ? 3 : 2}
                          className={isSelected ? 'drop-shadow-[0_0_12px_rgba(56,189,248,0.9)]' : 'drop-shadow-md'}
                        />
                        {/* Camera Icon representation */}
                        <text
                          x={pinX}
                          y={pinY + 4}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize={isSelected ? '12' : '10'}
                          fontWeight="bold"
                        >
                          📷
                        </text>
                      </g>
                    )}

                    <text
                      x={pinX}
                      y={pinY + (def.photoUrl ? 28 : 24)}
                      textAnchor="middle"
                      fill={isSelected ? '#38bdf8' : '#f43f5e'}
                      fontSize="10"
                      fontWeight="bold"
                      className="drop-shadow-md"
                    >
                      {def.title}
                    </text>
                  </g>
                );
              })}

              {/* 7. Render Room Pin Markers & Calculations (หมุดปักรายห้อง) */}
              {(floorPlan.roomPins || []).map((room) => {
                const pinX = room.x * zoom;
                const pinY = room.y * zoom;
                const isSelected = selectedRoomId === room.id;

                // Get calculated room properties
                const roomCalc = calculateRoomDimensions(room);
                const bounds = roomCalc.bounds;

                const shape = room.roomShape || 'rectangle';
                const iw = room.indentWidth || 0;
                const idep = room.indentDepth || 0;
                let polygonPoints = '';

                if (shape === 'l_shape' && iw > 0 && idep > 0) {
                  const pts = [
                    { x: bounds.xMin, y: bounds.yMin },
                    { x: bounds.xMax - iw, y: bounds.yMin },
                    { x: bounds.xMax - iw, y: bounds.yMin + idep },
                    { x: bounds.xMax, y: bounds.yMin + idep },
                    { x: bounds.xMax, y: bounds.yMax },
                    { x: bounds.xMin, y: bounds.yMax }
                  ];
                  polygonPoints = pts.map((p) => `${p.x * zoom},${p.y * zoom}`).join(' ');
                } else if (shape === 't_shape' && iw > 0 && idep > 0) {
                  const pts = [
                    { x: bounds.xMin + iw, y: bounds.yMin },
                    { x: bounds.xMax - iw, y: bounds.yMin },
                    { x: bounds.xMax - iw, y: bounds.yMin + idep },
                    { x: bounds.xMax, y: bounds.yMin + idep },
                    { x: bounds.xMax, y: bounds.yMax },
                    { x: bounds.xMin, y: bounds.yMax },
                    { x: bounds.xMin, y: bounds.yMin + idep },
                    { x: bounds.xMin + iw, y: bounds.yMin + idep }
                  ];
                  polygonPoints = pts.map((p) => `${p.x * zoom},${p.y * zoom}`).join(' ');
                } else {
                  const pts = [
                    { x: bounds.xMin, y: bounds.yMin },
                    { x: bounds.xMax, y: bounds.yMin },
                    { x: bounds.xMax, y: bounds.yMax },
                    { x: bounds.xMin, y: bounds.yMax }
                  ];
                  polygonPoints = pts.map((p) => `${p.x * zoom},${p.y * zoom}`).join(' ');
                }

                return (
                  <g key={room.id} className="group">
                    {/* Dynamic Boundary Polygon supporting indented shapes */}
                    <polygon
                      points={polygonPoints}
                      fill={isSelected ? 'rgba(249, 115, 22, 0.05)' : 'rgba(249, 115, 22, 0.01)'}
                      stroke={isSelected ? '#f97316' : 'rgba(249, 115, 22, 0.25)'}
                      strokeWidth={isSelected ? 1.8 : 1.2}
                      strokeDasharray={isSelected ? '5,3' : '4,4'}
                      pointerEvents="none"
                    />

                    {/* Room Dimension Lines (เส้นบอกระยะบอกขนาดจริงและจุดหักขยักของห้อง) */}
                    <g className="pointer-events-none opacity-80 select-none">
                      {/* Horizontal width dimension line */}
                      <line
                        x1={bounds.xMin * zoom}
                        y1={(bounds.yMax + 0.1) * zoom}
                        x2={bounds.xMax * zoom}
                        y2={(bounds.yMax + 0.1) * zoom}
                        stroke="#f97316"
                        strokeWidth="1.2"
                      />
                      <line x1={bounds.xMin * zoom} y1={(bounds.yMax + 0.05) * zoom} x2={bounds.xMin * zoom} y2={(bounds.yMax + 0.15) * zoom} stroke="#f97316" strokeWidth="1.2" />
                      <line x1={bounds.xMax * zoom} y1={(bounds.yMax + 0.05) * zoom} x2={bounds.xMax * zoom} y2={(bounds.yMax + 0.15) * zoom} stroke="#f97316" strokeWidth="1.2" />
                      
                      {/* Label text for Width (No border box) */}
                      <g transform={`translate(${((bounds.xMin + bounds.xMax) / 2) * zoom}, ${(bounds.yMax + 0.1) * zoom})`}>
                        <text
                          x={0}
                          y={2}
                          textAnchor="middle"
                          fill="#fdba74"
                          fontSize="9"
                          fontWeight="bold"
                          fontFamily="monospace"
                          stroke="#020617"
                          strokeWidth="2.5"
                          paintOrder="stroke"
                        >
                          {roomCalc.width.toFixed(2)}m
                        </text>
                      </g>

                      {/* Vertical depth dimension line */}
                      <line
                        x1={(bounds.xMax + 0.1) * zoom}
                        y1={bounds.yMin * zoom}
                        x2={(bounds.xMax + 0.1) * zoom}
                        y2={bounds.yMax * zoom}
                        stroke="#f97316"
                        strokeWidth="1.2"
                      />
                      <line x1={(bounds.xMax + 0.05) * zoom} y1={bounds.yMin * zoom} x2={(bounds.xMax + 0.15) * zoom} y2={bounds.yMin * zoom} stroke="#f97316" strokeWidth="1.2" />
                      <line x1={(bounds.xMax + 0.05) * zoom} y1={bounds.yMax * zoom} x2={(bounds.xMax + 0.15) * zoom} y2={bounds.yMax * zoom} stroke="#f97316" strokeWidth="1.2" />

                      {/* Label text for Depth (No border box) */}
                      <g transform={`translate(${(bounds.xMax + 0.1) * zoom}, ${((bounds.yMin + bounds.yMax) / 2) * zoom})`}>
                        <text
                          x={0}
                          y={2}
                          textAnchor="middle"
                          fill="#fdba74"
                          fontSize="9"
                          fontWeight="bold"
                          fontFamily="monospace"
                          stroke="#020617"
                          strokeWidth="2.5"
                          paintOrder="stroke"
                        >
                          {roomCalc.depth.toFixed(2)}m
                        </text>
                      </g>

                      {/* If indented shape (L-Shape / T-Shape), show the indent size text */}
                      {shape !== 'rectangle' && iw > 0 && idep > 0 && (
                        <g transform={`translate(${(bounds.xMax - iw / 2) * zoom}, ${(bounds.yMin + idep / 2) * zoom})`}>
                          <rect
                            x={-30}
                            y={-10}
                            width={60}
                            height={18}
                            rx={3}
                            fill="#7c2d12"
                            stroke="#ea580c"
                            strokeWidth="0.8"
                            className="opacity-90"
                          />
                          <text
                            x={0}
                            y={2}
                            textAnchor="middle"
                            fill="#ffedd5"
                            fontSize="8"
                            fontWeight="bold"
                            fontFamily="monospace"
                          >
                            ขยัก:{iw.toFixed(1)}x{idep.toFixed(1)}m
                          </text>
                        </g>
                      )}
                    </g>

                    {/* Room Anchor / Pin */}
                    <g
                      onClick={(e) => {
                        if (toolMode === 'wall') return;
                        e.stopPropagation();
                        setSelectedRoomId(room.id);
                        setSelectedColId(null);
                        setSelectedWallId(null);
                        setSelectedOpeningId(null);
                        setSelectedDefectId(null);
                        setDraggingRoomId(null);
                        setToolMode('select');
                      }}
                      onMouseDown={(e) => handleStartDragRoom(e, room.id)}
                      onTouchStart={(e) => handleStartDragRoom(e, room.id)}
                      className="cursor-move"
                    >
                      {/* Anchor circle */}
                      <circle
                        cx={pinX}
                        cy={pinY}
                        r={isSelected ? 8 : 6}
                        fill={isSelected ? '#f97316' : '#ea580c'}
                        stroke="#ffffff"
                        strokeWidth={2}
                        className="drop-shadow-md transition-all"
                      />
                      
                      {/* Information Card */}
                      <g transform={`translate(${pinX}, ${pinY + 12})`}>
                        {/* Shadow and Background Card */}
                        <rect
                          x={-75}
                          y={0}
                          width={150}
                          height={74}
                          rx={6}
                          fill="#0f172a"
                          stroke={isSelected ? '#f97316' : '#334155'}
                          strokeWidth={isSelected ? 1.5 : 1}
                          className="opacity-95"
                        />

                        {/* Room Name & Height */}
                        <text
                          x={-67}
                          y={16}
                          fill="#f8fafc"
                          fontSize="10"
                          fontWeight="bold"
                          textAnchor="start"
                        >
                          🚪 {room.name.length > 14 ? room.name.slice(0, 12) + '..' : room.name}
                        </text>

                        <text
                          x={67}
                          y={16}
                          fill="#cbd5e1"
                          fontSize="9"
                          fontWeight="bold"
                          fontFamily="monospace"
                          textAnchor="end"
                        >
                          H:{room.floorHeight.toFixed(2)}m
                        </text>

                        {/* Divider line */}
                        <line x1={-67} y1={23} x2={67} y2={23} stroke="#334155" strokeWidth={1} />

                        {/* Area calculations */}
                        <text x={-67} y={35} fill="#94a3b8" fontSize="8" textAnchor="start">
                          พื้น (Floor):
                        </text>
                        <text x={67} y={35} fill="#f8fafc" fontSize="8.5" fontFamily="monospace" fontWeight="semibold" textAnchor="end">
                          {roomCalc.floorArea.toFixed(2)} m²
                        </text>

                        <text x={-67} y={48} fill="#94a3b8" fontSize="8" textAnchor="start">
                          ฝ้า (Ceiling):
                        </text>
                        <text x={67} y={48} fill="#f8fafc" fontSize="8.5" fontFamily="monospace" fontWeight="semibold" textAnchor="end">
                          {roomCalc.ceilingArea.toFixed(2)} m²
                        </text>

                        <text x={-67} y={61} fill="#f97316" fontSize="8" fontWeight="bold" textAnchor="start">
                          ผนังสุทธิ (Net Wall):
                        </text>
                        <text x={67} y={61} fill="#ff781f" fontSize="8.5" fontFamily="monospace" fontWeight="bold" textAnchor="end">
                          {roomCalc.netWallArea.toFixed(2)} m²
                        </text>
                      </g>
                    </g>
                  </g>
                );
              })}

              {/* Active Drawing Preview for Wall (Rubberband Live Line) */}
              {toolMode === 'wall' && wallStartPoint && (() => {
                let targetX = hoverMeterPos ? hoverMeterPos.x : wallStartPoint.x;
                let targetY = hoverMeterPos ? hoverMeterPos.y : wallStartPoint.y;

                if (hoverMeterPos) {
                  const dx = Math.abs(hoverMeterPos.x - wallStartPoint.x);
                  const dy = Math.abs(hoverMeterPos.y - wallStartPoint.y);

                  if (isOrthoLocked || dx < 0.6 || dy < 0.6) {
                    if (dy >= dx) {
                      targetX = wallStartPoint.x; // Lock as Vertical Wall
                    } else {
                      targetY = wallStartPoint.y; // Lock as Horizontal Wall
                    }
                  }
                }

                // Reference line drawn by mouse
                const refStartPxX = wallStartPoint.x * zoom;
                const refStartPxY = wallStartPoint.y * zoom;
                const refEndPxX = targetX * zoom;
                const refEndPxY = targetY * zoom;

                // Center line of wall considering wallAlignment
                let startX = wallStartPoint.x;
                let startY = wallStartPoint.y;
                let endX = targetX;
                let endY = targetY;

                if (wallAlignment !== 'center') {
                  const wallThM = newWallThicknessCm / 100;
                  const halfThM = wallThM / 2;

                  const isVertical = Math.abs(startX - endX) < 0.05;
                  const isHorizontal = Math.abs(startY - endY) < 0.05;

                  if (isVertical) {
                    const shiftX = wallAlignment === 'left' ? halfThM : -halfThM;
                    startX += shiftX;
                    endX += shiftX;
                  } else if (isHorizontal) {
                    const shiftY = wallAlignment === 'left' ? halfThM : -halfThM;
                    startY += shiftY;
                    endY += shiftY;
                  }
                }

                const startPxX = startX * zoom;
                const startPxY = startY * zoom;
                const endPxX = endX * zoom;
                const endPxY = endY * zoom;

                const midPxX = (startPxX + endPxX) / 2;
                const midPxY = (startPxY + endPxY) / 2;

                const wallLength = Math.sqrt(
                  Math.pow(targetX - wallStartPoint.x, 2) + Math.pow(targetY - wallStartPoint.y, 2)
                ).toFixed(2);

                const isVertical = targetX === wallStartPoint.x && targetY !== wallStartPoint.y;
                const isHorizontal = targetY === wallStartPoint.y && targetX !== wallStartPoint.x;

                return (
                  <g className="pointer-events-none">
                    {/* User reference guide line if alignment is shifted */}
                    {wallAlignment !== 'center' && (
                      <line
                        x1={refStartPxX}
                        y1={refStartPxY}
                        x2={refEndPxX}
                        y2={refEndPxY}
                        stroke="#38bdf8"
                        strokeWidth="1.5"
                        strokeDasharray="3,3"
                        opacity="0.8"
                      />
                    )}

                    {/* Wall Body Live Fill Preview */}
                    <line
                      x1={startPxX}
                      y1={startPxY}
                      x2={endPxX}
                      y2={endPxY}
                      stroke="#f59e0b"
                      strokeWidth={(newWallThicknessCm / 100) * zoom}
                      opacity="0.5"
                    />

                    {/* Live Rubberband Center Line */}
                    <line
                      x1={startPxX}
                      y1={startPxY}
                      x2={endPxX}
                      y2={endPxY}
                      stroke="#fbbf24"
                      strokeWidth="2"
                      strokeDasharray="6,4"
                    />

                    {/* Start Point Pulse Circle */}
                    <circle cx={refStartPxX} cy={refStartPxY} r={8} fill="#f59e0b" className="animate-ping" />
                    <circle cx={refStartPxX} cy={refStartPxY} r={5} fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />

                    {/* Target End Point Pulse Circle */}
                    <circle cx={refEndPxX} cy={refEndPxY} r={8} fill="#fbbf24" stroke="#ffffff" strokeWidth="2" />

                    {/* Length & Alignment Badge */}
                    {hoverMeterPos && (
                      <g>
                        <rect
                          x={midPxX - 65}
                          y={midPxY - 24}
                          width={130}
                          height={22}
                          rx={5}
                          fill="#0f172a"
                          stroke="#f59e0b"
                          strokeWidth="1.5"
                          className="drop-shadow-lg"
                        />
                        <text
                          x={midPxX}
                          y={midPxY - 9}
                          textAnchor="middle"
                          fill="#fbbf24"
                          fontSize="10"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          L = {wallLength}m ({wallAlignment === 'left' ? 'มุมซ้าย/บน' : wallAlignment === 'right' ? 'มุมขวา/ล่าง' : 'ตรงกลาง'})
                        </text>
                      </g>
                    )}
                  </g>
                );
              })()}
            </g>
          </svg>
        </div>

        {/* Right Inspector Side Panel / Tool Drawer: Desktop Sidebar & Mobile Bottom Sheet Modal */}
        {(() => {
          const inspectorContent = (
            <div className="flex flex-col gap-3 lg:gap-4 h-full">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 lg:pb-3">
                <h3 className="font-semibold text-slate-200 text-xs sm:text-sm flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-blue-400" />
                  <span>แผงควบคุมและรายละเอียด</span>
                </h3>
              </div>

          {/* 1. Grid Line Management Mode */}
          {toolMode === 'grid_edit' && (
            <div className="space-y-4">
              <div className="bg-amber-950/40 border border-amber-800/60 rounded-lg p-3 text-xs text-amber-200">
                <p className="font-medium mb-1 flex items-center gap-1.5">
                  <Grid className="w-4 h-4 text-amber-400" />
                  จัดการกริดเสา (Grid Line Builder)
                </p>
                <p className="text-amber-300/80">
                  กำหนดระยะห่างระหว่างเสา (Span Width) ทั้งแนวแกน X และแกน Y
                </p>
              </div>

              {/* Add Grid X */}
              <div className="space-y-2 bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-xs font-semibold text-sky-400 block">+ เพิ่มลายกริด X (แนวตั้ง A, B, C)</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-slate-400 text-[10px] block mb-1">ชื่อลาย (Label):</label>
                    <input
                      type="text"
                      value={newGridXLabel}
                      onChange={(e) => setNewGridXLabel(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[10px] block mb-1">ระยะห่างถัดไป (เมตร):</label>
                    <input
                      type="number"
                      step="0.05"
                      value={newGridXDist}
                      onChange={(e) => setNewGridXDist(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddGridX}
                  className="w-full mt-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium py-1.5 rounded transition-colors shadow-sm"
                >
                  เพิ่มกริด X
                </button>
              </div>

              {/* Add Grid Y */}
              <div className="space-y-2 bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-xs font-semibold text-emerald-400 block">+ เพิ่มลายกริด Y (แนวนอน 1, 2, 3)</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-slate-400 text-[10px] block mb-1">ชื่อลาย (Label):</label>
                    <input
                      type="text"
                      value={newGridYLabel}
                      onChange={(e) => setNewGridYLabel(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[10px] block mb-1">ระยะห่างถัดไป (เมตร):</label>
                    <input
                      type="number"
                      step="0.05"
                      value={newGridYDist}
                      onChange={(e) => setNewGridYDist(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddGridY}
                  className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium py-1.5 rounded transition-colors shadow-sm"
                >
                  เพิ่มกริด Y
                </button>
              </div>

              {/* Current Grids List */}
              <div className="space-y-2 text-xs">
                <span className="text-slate-400 font-medium block">คลิกที่ระยะห่างเพื่อแก้ไข:</span>
                
                {/* Spans X */}
                <div className="space-y-1">
                  <span className="text-[10px] text-sky-400 font-bold block">แกน X (แนวตั้ง):</span>
                  <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                    {sortedGridX.map((gx, idx) => {
                      if (idx === 0) return null;
                      const prevGx = sortedGridX[idx - 1];
                      const span = Math.round((gx.positionMeters - prevGx.positionMeters) * 100) / 100;
                      return (
                        <button
                          key={`span_x_${gx.id}`}
                          onClick={() => openEditSpanModal('X', prevGx, gx, span)}
                          className="bg-slate-900 hover:bg-sky-950 border border-slate-700 hover:border-sky-500 rounded px-2 py-1 text-slate-200 flex items-center gap-1 transition-colors group"
                        >
                          <span className="text-slate-400 group-hover:text-sky-300">{prevGx.label}➔{gx.label}:</span>
                          <span className="text-sky-400 font-bold">{span.toFixed(1)}m</span>
                          <Edit2 className="w-3 h-3 text-slate-500 group-hover:text-amber-400 ml-0.5" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Spans Y */}
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] text-emerald-400 font-bold block">แกน Y (แนวนอน):</span>
                  <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                    {sortedGridY.map((gy, idx) => {
                      if (idx === 0) return null;
                      const prevGy = sortedGridY[idx - 1];
                      const span = Math.round((gy.positionMeters - prevGy.positionMeters) * 100) / 100;
                      return (
                        <button
                          key={`span_y_${gy.id}`}
                          onClick={() => openEditSpanModal('Y', prevGy, gy, span)}
                          className="bg-slate-900 hover:bg-emerald-950 border border-slate-700 hover:border-emerald-500 rounded px-2 py-1 text-slate-200 flex items-center gap-1 transition-colors group"
                        >
                          <span className="text-slate-400 group-hover:text-emerald-300">{prevGy.label}➔{gy.label}:</span>
                          <span className="text-emerald-400 font-bold">{span.toFixed(1)}m</span>
                          <Edit2 className="w-3 h-3 text-slate-500 group-hover:text-amber-400 ml-0.5" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Grid Lines List & Deletion */}
              <div className="space-y-3 pt-3 border-t border-slate-800 text-xs">
                <span className="text-slate-300 font-semibold block flex items-center gap-1.5 text-rose-400">
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  ลบลายกริด (จะลบเสา/ผนังในแนวกริดนี้ด้วย):
                </span>
                
                {/* Grid X Lines */}
                <div className="space-y-1">
                  <span className="text-[10px] text-sky-400 font-bold block">ลายกริด X (แนวตั้ง):</span>
                  <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                    {sortedGridX.map((gx) => (
                      <div
                        key={`delete_gx_${gx.id}`}
                        className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"
                      >
                        <span className="truncate">กริด {gx.label} ({gx.positionMeters.toFixed(1)}m)</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('Delete button clicked for grid X:', gx.label);
                            handleDeleteGridX(gx.id, gx.positionMeters, gx.label);
                          }}
                          className="p-1 hover:bg-rose-950 text-rose-400 hover:text-rose-300 rounded transition-colors shrink-0"
                          title="ลบกริดและองค์ประกอบร่วม"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Grid Y Lines */}
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] text-emerald-400 font-bold block">ลายกริด Y (แนวนอน):</span>
                  <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                    {sortedGridY.map((gy) => (
                      <div
                        key={`delete_gy_${gy.id}`}
                        className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"
                      >
                        <span className="truncate">กริด {gy.label} ({gy.positionMeters.toFixed(1)}m)</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('Delete button clicked for grid Y:', gy.label);
                            handleDeleteGridY(gy.id, gy.positionMeters, gy.label);
                          }}
                          className="p-1 hover:bg-rose-950 text-rose-400 hover:text-rose-300 rounded transition-colors shrink-0"
                          title="ลบกริดและองค์ประกอบร่วม"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Default Inspector state for Select & Pan mode when no object is selected */}
          {(toolMode === 'select' || toolMode === 'pan') &&
            !selectedCol &&
            !selectedWall &&
            !selectedOpening &&
            !selectedDefect && (
              <div className="space-y-4">
                <div className="bg-sky-950/40 border border-sky-800/60 rounded-lg p-3 text-xs text-sky-200">
                  <p className="font-semibold mb-1 flex items-center gap-1.5 text-sky-300">
                    <MousePointer className="w-4 h-4 text-sky-400" />
                    หน้าทำงานเขียนแบบ (Working Mode)
                  </p>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    คลิกที่เสา, ผนัง, ประตู/หน้าต่าง หรือรูปถ่ายบนแปลนเพื่อแก้ไขรายละเอียด หรือใช้ทางลัดเลือกเครื่องมือทำงานได้ทันที
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2 text-xs">
                  <span className="text-slate-400 font-semibold block text-[11px]">เครื่องมือลากวางบนแปลน:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleToolModeChange('column')}
                      className="flex items-center gap-1.5 p-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-slate-300 text-left transition-colors"
                    >
                      <Columns className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>+ วางเสา</span>
                    </button>
                    <button
                      onClick={() => handleToolModeChange('wall')}
                      className="flex items-center gap-1.5 p-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-slate-300 text-left transition-colors"
                    >
                      <Square className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>+ ลากผนัง</span>
                    </button>
                    <button
                      onClick={() => handleToolModeChange('opening')}
                      className="flex items-center gap-1.5 p-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-slate-300 text-left transition-colors"
                    >
                      <DoorClosed className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>+ ช่องเปิด</span>
                    </button>
                    <button
                      onClick={() => handleToolModeChange('defect')}
                      className="flex items-center gap-1.5 p-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-slate-300 text-left transition-colors"
                    >
                      <Camera className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>+ พินรูปถ่าย</span>
                    </button>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2 text-xs">
                  <span className="text-slate-300 font-semibold block text-[11px]">ภาพรวมโครงสร้างอาคาร:</span>
                  <div className="space-y-1.5 text-slate-400 text-[11px]">
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span>กริดระยะรวม (X × Y):</span>
                      <span className="text-slate-200 font-mono font-bold">
                        {floorPlan.gridX[floorPlan.gridX.length - 1]?.positionMeters || 12}m ×{' '}
                        {floorPlan.gridY[floorPlan.gridY.length - 1]?.positionMeters || 12}m
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span>จำนวนเสาโครงสร้าง:</span>
                      <span className="text-sky-400 font-mono font-bold">{floorPlan.columns.length} ต้น</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span>ผนังอาคารทั้งหมด:</span>
                      <span className="text-amber-400 font-mono font-bold">{floorPlan.walls.length} ช่วง</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>พินรูปถ่ายสำรวจ:</span>
                      <span className="text-rose-400 font-mono font-bold">{floorPlan.defectPins.length} จุด</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* Default Inspector state for Column tool mode when no column is selected */}
          {toolMode === 'column' && !selectedCol && (
            <div className="space-y-3 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
              <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 text-sky-400 font-bold">
                <Columns className="w-4 h-4" />
                <span>คำแนะนำและการวางเสา</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                กำหนดขนาดเสาก่อนวาง จากนั้นคลิกบนพื้นที่เพื่อวางเสา หรือกดปุ่มสร้างเสาทั้งหมดเพื่อวางเสาบนทุกจุดตัดกริดลายอัตโนมัติ
              </p>
              
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="text-slate-400 block mb-1">ความกว้างเสา (ซม.):</label>
                  <input
                    type="number"
                    value={newColumnWidth}
                    onChange={(e) => setNewColumnWidth(parseInt(e.target.value) || 20)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">ความลึกเสา (ซม.):</label>
                  <input
                    type="number"
                    value={newColumnDepth}
                    onChange={(e) => setNewColumnDepth(parseInt(e.target.value) || 20)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleGenerateAllGridColumns}
                  className="flex-1 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 shadow-lg transition-all text-xs"
                >
                  <Grid className="w-4 h-4 shrink-0" />
                  <span>สร้างเสาทั้งหมด</span>
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAllColumns}
                  disabled={floorPlan.columns.length === 0}
                  className="bg-rose-600 hover:bg-rose-500 active:bg-rose-700 disabled:opacity-40 disabled:hover:bg-rose-600 text-white font-bold py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 shadow-lg transition-all text-xs shrink-0"
                  title="ลบเสาทั้งหมดบนแปลน"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  <span>ลบเสาทั้งหมด</span>
                </button>
              </div>

              <div className="bg-sky-950/30 border border-sky-800/50 rounded p-2 text-sky-300 text-[11px]">
                * ถ้างวางเสานอกจุดตัดกริดลาย ระบบจะแสดงระยะห่างจากเส้นกริดให้อัตโนมัติ
              </div>
            </div>
          )}

          {/* Default Inspector state for Wall tool mode when no wall is selected */}
          {toolMode === 'wall' && !selectedWall && (
            <div className="space-y-3 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
              <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 text-amber-400 font-bold">
                <Square className="w-4 h-4" />
                <span>กำหนดค่าผนังก่อนลาก</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                เลือกแนวอ้างอิงลากเส้น ขนาดความหนา และประเภทผนังก่อนเริ่มลากบนแปลน
              </p>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold text-[11px]">
                  ตำแหน่งแนวอ้างอิงการลากเส้นผนัง (Wall Alignment):
                </label>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => setWallAlignment('left')}
                    className={`py-1.5 px-1 rounded border text-[10px] font-medium transition-all ${
                      wallAlignment === 'left'
                        ? 'bg-amber-600 text-white border-amber-400 font-bold shadow-sm'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                    }`}
                    title="แนวเส้นลากอ้างอิงขอบนอกด้านซ้าย (สำหรับแนวตั้ง) หรือขอบบน (สำหรับแนวนอน)"
                  >
                    📐 มุมซ้าย / บน
                  </button>
                  <button
                    type="button"
                    onClick={() => setWallAlignment('center')}
                    className={`py-1.5 px-1 rounded border text-[10px] font-medium transition-all ${
                      wallAlignment === 'center'
                        ? 'bg-amber-600 text-white border-amber-400 font-bold shadow-sm'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                    }`}
                    title="แนวเส้นลากอ้างอิงเส้นกึ่งกลางผนัง (เซนเตอร์กริด)"
                  >
                    🎯 ตรงกลาง
                  </button>
                  <button
                    type="button"
                    onClick={() => setWallAlignment('right')}
                    className={`py-1.5 px-1 rounded border text-[10px] font-medium transition-all ${
                      wallAlignment === 'right'
                        ? 'bg-amber-600 text-white border-amber-400 font-bold shadow-sm'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                    }`}
                    title="แนวเส้นลากอ้างอิงขอบนอกด้านขวา (สำหรับแนวตั้ง) หรือขอบล่าง (สำหรับแนวนอน)"
                  >
                    📐 มุมขวา / ล่าง
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">ความหนาผนัง (ซม.):</label>
                <select
                  value={newWallThicknessCm}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 10;
                    setNewWallThicknessCm(val);
                    if (val === 7.5) setNewWallMaterial('aac_block');
                    else if (val === 10) setNewWallMaterial('half_brick');
                    else if (val === 15) setNewWallMaterial('timber_board');
                    else if (val === 20) setNewWallMaterial('full_brick');
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
                >
                  <option value="7.5">7.5 ซม. (อิฐมวลเบา/ผนังเบา)</option>
                  <option value="10">10 ซม. (อิฐมอญครึ่งแผ่น)</option>
                  <option value="15">15 ซม. (ไม้กระดาน/ผนังผสม)</option>
                  <option value="20">20 ซม. (อิฐมอญเต็มแผ่น)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">ประเภทวัสดุผนัง:</label>
                <select
                  value={newWallMaterial}
                  onChange={(e) => setNewWallMaterial(e.target.value as WallMaterial)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                >
                  <option value="half_brick">อิฐมอญครึ่งแผ่น</option>
                  <option value="full_brick">อิฐมอญเต็มแผ่น</option>
                  <option value="aac_block">อิฐมวลเบา</option>
                  <option value="timber_board">ผนังไม้กระดานโบราณ</option>
                  <option value="lightweight_drywall">ผนังเบา</option>
                </select>
              </div>

              <div className="bg-amber-950/30 border border-amber-800/50 rounded p-2 text-amber-300 text-[11px]">
                * 1. คลิกจุดเริ่มต้นผนัง (ล็อคฉาก 90° อัตโนมัติ)<br />
                * 2. คลิกจุดสิ้นสุดเพื่อสร้างผนังตามแนวอ้างอิงที่เลือก
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleGenerateAllGridWalls}
                  className="flex-1 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 shadow-lg transition-all text-xs"
                >
                  <Grid className="w-4 h-4 shrink-0" />
                  <span>สร้างผนังทั้งหมด</span>
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAllWalls}
                  disabled={floorPlan.walls.length === 0}
                  className="bg-rose-600 hover:bg-rose-500 active:bg-rose-700 disabled:opacity-40 disabled:hover:bg-rose-600 text-white font-bold py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 shadow-lg transition-all text-xs shrink-0"
                  title="ลบผนังทั้งหมดบนแปลน"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  <span>ลบผนังทั้งหมด</span>
                </button>
              </div>
            </div>
          )}

          {/* Default Inspector state for Photo Pin tool mode when no pin is selected */}
          {toolMode === 'defect' && !selectedDefect && (
            <div className="space-y-3 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
              <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 text-rose-400 font-bold">
                <Camera className="w-4 h-4" />
                <span>เครื่องมือปักหมุดรูปถ่าย</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                คลิกตำแหน่งใดๆ บนแปลนเพื่อปักหมุดกล้องถ่ายรูป สามารถอัปโหลดภาพถ่ายสำรวจจากกล้องหรือคลังรูปภาพเพื่อแนบรายงานได้
              </p>
            </div>
          )}

          {/* Default Inspector state for Room Pin tool mode when no room is selected */}
          {toolMode === 'room' && !selectedRoom && (
            <div className="space-y-3 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
              <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 text-orange-400 font-bold">
                <MapPin className="w-4 h-4" />
                <span>เครื่องมือปักหมุดห้อง</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed mb-1">
                คลิกตำแหน่งใดๆ บนแปลนเพื่อเพิ่มหมุดชื่อห้องและเริ่มคำนวณพื้นที่
              </p>
              <div className="bg-slate-900 border border-slate-800 rounded p-2 text-[11px] text-slate-400 space-y-1.5">
                <span className="font-semibold text-slate-200 block text-[10px] uppercase tracking-wider">ฟีเจอร์เด่น:</span>
                <p>• <strong>ความสูงชั้น:</strong> ปรับระดับความสูงโครงสร้างชั้นมาตรฐาน (ม.)</p>
                <p>• <strong>คำนวณพื้นที่เรียลไทม์:</strong> แสดงพื้นที่พื้น พื้นที่ฝ้าเพดาน และพื้นที่ผนังสุทธิ หักลบช่องประตูหน้าต่างโดยรอบอัตโนมัติ</p>
                <p>• <strong>ยืดหยุ่นสูง:</strong> รองรับการคำนวณแบบ Auto อิงผนังกริดลายเสา หรือ Manual ระบุระยะกว้างลึกห้องเอง</p>
              </div>
            </div>
          )}

          {/* 2. Opening Selector Tool Settings */}
          {toolMode === 'opening' && !selectedOpening && (
            <div className="space-y-4">
              <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-lg p-3 text-xs text-emerald-200">
                <p className="font-semibold mb-2">เลือกประเภทที่ต้องการวาง:</p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    onClick={() => {
                      setOpeningTypeToAdd('door');
                      setNewOpeningMaterialType('ประตูไม้');
                      setNewOpeningWidthCm(90);
                      setNewOpeningHeightCm(205);
                      setNewOpeningSillHeightCm(0);
                    }}
                    className={`flex items-center justify-center gap-1.5 p-2 rounded-md border text-xs font-medium transition-all ${
                      openingTypeToAdd === 'door'
                        ? 'bg-sky-600 text-white border-sky-400 shadow-[0_0_8px_rgba(2,132,199,0.5)]'
                        : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <DoorClosed className="w-4 h-4" />
                    <span>ประตู</span>
                  </button>

                  <button
                    onClick={() => {
                      setOpeningTypeToAdd('window');
                      setNewOpeningMaterialType('หน้าต่างอลูมิเนียมบานกระทุ้ง');
                      setNewOpeningWidthCm(60);
                      setNewOpeningHeightCm(60);
                      setNewOpeningSillHeightCm(150);
                    }}
                    className={`flex items-center justify-center gap-1.5 p-2 rounded-md border text-xs font-medium transition-all ${
                      openingTypeToAdd === 'window'
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                        : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <AppWindow className="w-4 h-4" />
                    <span>หน้าต่าง</span>
                  </button>
                </div>

                <div className="space-y-3 bg-slate-950/50 p-3 rounded-lg border border-emerald-900/30">
                  <div className="space-y-1">
                    <label className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                      ชนิด{openingTypeToAdd === 'door' ? 'ประตู' : 'หน้าต่าง'}:
                    </label>
                    <select
                      value={newOpeningMaterialType}
                      onChange={(e) => {
                        const selectedVal = e.target.value;
                        setNewOpeningMaterialType(selectedVal);
                        const presets = openingTypeToAdd === 'door' ? DOOR_PRESETS : WINDOW_PRESETS;
                        const preset = presets.find((p) => p.label === selectedVal);
                        if (preset) {
                          setNewOpeningWidthCm(preset.width);
                          setNewOpeningHeightCm(preset.height);
                          setNewOpeningSillHeightCm(preset.sill);
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-100 text-xs focus:border-emerald-500 outline-none font-medium"
                    >
                      {(openingTypeToAdd === 'door' ? DOOR_PRESETS : WINDOW_PRESETS).map((preset) => (
                        <option key={preset.label} value={preset.label}>
                          {preset.label}
                        </option>
                      ))}
                    </select>

                    {newOpeningMaterialType === 'ระบุเอง...' && (
                      <div className="pt-1.5">
                        <label className="text-slate-400 text-[10px] block mb-1">
                          พิมพ์ชนิด{openingTypeToAdd === 'door' ? 'ประตู' : 'หน้าต่าง'}ระบุเอง:
                        </label>
                        <input
                          type="text"
                          placeholder={`พิมพ์ชนิด${openingTypeToAdd === 'door' ? 'ประตู' : 'หน้าต่าง'}...`}
                          value={customMaterialTypeName}
                          onChange={(e) => setCustomMaterialTypeName(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs focus:border-emerald-500 outline-none"
                        />
                      </div>
                    )}
                  </div>

                  <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider pt-1">
                    กำหนดขนาดละเอียด (ซม.):
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 text-[10px] block mb-1">กว้าง (ซม.):</label>
                      <input
                        type="number"
                        value={newOpeningWidthCm}
                        onChange={(e) => setNewOpeningWidthCm(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-xs focus:border-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 text-[10px] block mb-1">สูง (ซม.):</label>
                      <input
                        type="number"
                        value={newOpeningHeightCm}
                        onChange={(e) => setNewOpeningHeightCm(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-xs focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  {openingTypeToAdd === 'window' && (
                    <div>
                      <label className="text-slate-400 text-[10px] block mb-1">ความสูงสเต็ป/Sill (ซม.):</label>
                      <input
                        type="number"
                        value={newOpeningSillHeightCm}
                        onChange={(e) => setNewOpeningSillHeightCm(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-xs focus:border-emerald-500 outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-[11px] text-slate-300 space-y-2">
                <p className="flex gap-2">
                  <MousePointer className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span><strong>วิธีวาง:</strong> คลิกเลือกผนังที่ต้องการใส่ ระบบจะวางไว้กึ่งกลางผนังเบื้องต้น</span>
                </p>
                <p className="flex gap-2">
                  <Move className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span><strong>การปรับแต่ง:</strong> เมื่อวางแล้วสามารถลากเลื่อนตำแหน่งตามแนวผนังได้ (ความละเอียด 5 ซม.)</span>
                </p>
              </div>
            </div>
          )}

          {/* 3. Selected Column Inspector */}
          {selectedCol && (
            <div className="space-y-3 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-sky-400 flex items-center gap-1.5">
                  <Columns className="w-4 h-4" />
                  รายละเอียดเสา (Column Inspector)
                </span>
                <span className="text-slate-500 font-mono text-[10px]">{selectedCol.id}</span>
              </div>

              {/* Column Dimensions */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">ความกว้างเสา (ซม.):</label>
                  <input
                    type="number"
                    value={selectedCol.widthCm}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 20;
                      onChangeFloorPlan({
                        ...floorPlan,
                        columns: floorPlan.columns.map((c) => (c.id === selectedCol.id ? { ...c, widthCm: val } : c)),
                      });
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">ความลึกเสา (ซม.):</label>
                  <input
                    type="number"
                    value={selectedCol.depthCm}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 20;
                      onChangeFloorPlan({
                        ...floorPlan,
                        columns: floorPlan.columns.map((c) => (c.id === selectedCol.id ? { ...c, depthCm: val } : c)),
                      });
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
                  />
                </div>
              </div>

              {/* Column Material */}
              <div>
                <label className="text-slate-400 block mb-1">วัสดุโครงสร้างเสา:</label>
                <select
                  value={selectedCol.material}
                  onChange={(e) => {
                    const mat = e.target.value as ColumnMaterial;
                    onChangeFloorPlan({
                      ...floorPlan,
                      columns: floorPlan.columns.map((c) => (c.id === selectedCol.id ? { ...c, material: mat } : c)),
                    });
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                >
                  <option value="RC">คอนกรีตเสริมเหล็ก (RC)</option>
                  <option value="Steel">เหล็กรูปพรรณ (Structural Steel)</option>
                  <option value="Timber">เสาไม้โบราณ (Timber Column)</option>
                  <option value="Masonry">เสาก่ออิฐถือปูน (Masonry)</option>
                </select>
              </div>

              {/* Condition */}
              <div>
                <label className="text-slate-400 block mb-1">สภาพโครงสร้างเสา:</label>
                <select
                  value={selectedCol.condition}
                  onChange={(e) => {
                    const cond = e.target.value as any;
                    onChangeFloorPlan({
                      ...floorPlan,
                      columns: floorPlan.columns.map((c) => (c.id === selectedCol.id ? { ...c, condition: cond } : c)),
                    });
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                >
                  <option value="good">สมบูรณ์ดี (Good)</option>
                  <option value="minor_defect">มีรอยร้าวเล็กน้อย (Minor Defect)</option>
                  <option value="severe_crack">รอยร้าวรุนแรง (Severe Crack)</option>
                  <option value="critical_spalling">คอนกรีตกะเทาะเห็นเหล็กสนิม (Critical Spalling)</option>
                </select>
              </div>
            </div>
          )}

          {/* 4. Selected Wall Inspector */}
          {selectedWall && (
            <div className="space-y-3 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-orange-400 flex items-center gap-1.5">
                  <Square className="w-4 h-4" />
                  รายละเอียดผนัง (Wall Inspector)
                </span>
                <span className="text-slate-500 font-mono text-[10px]">{selectedWall.id}</span>
              </div>

              {/* Wall Thickness */}
              <div>
                <label className="text-slate-400 block mb-1">ความหนาผนัง (ซม.):</label>
                <select
                  value={selectedWall.thicknessCm}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 10;
                    onChangeFloorPlan({
                      ...floorPlan,
                      walls: floorPlan.walls.map((w) => (w.id === selectedWall.id ? { ...w, thicknessCm: val } : w)),
                    });
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
                >
                  <option value="7.5">7.5 ซม. (ผนังอิฐมวลเบา/ผนังเบา)</option>
                  <option value="10">10 ซม. (ผนังก่ออิฐมอญครึ่งแผ่น)</option>
                  <option value="15">15 ซม. (ผนังไม้กระดาน/ผนังผสม)</option>
                  <option value="20">20 ซม. (ผนังก่ออิฐมอญเต็มแผ่น)</option>
                </select>
              </div>

              {/* Wall Material */}
              <div>
                <label className="text-slate-400 block mb-1">ประเภทผนัง:</label>
                <select
                  value={selectedWall.material}
                  onChange={(e) => {
                    const mat = e.target.value as WallMaterial;
                    onChangeFloorPlan({
                      ...floorPlan,
                      walls: floorPlan.walls.map((w) => (w.id === selectedWall.id ? { ...w, material: mat } : w)),
                    });
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                >
                  <option value="half_brick">อิฐมอญครึ่งแผ่น (Half Brick)</option>
                  <option value="full_brick">อิฐมอญเต็มแผ่น (Full Brick)</option>
                  <option value="aac_block">อิฐมวลเบา (AAC Block)</option>
                  <option value="timber_board">ผนังไม้กระดานโบราณ (Timber Board)</option>
                </select>
              </div>

              {/* Wall Condition */}
              <div>
                <label className="text-slate-400 block mb-1">สภาพรอยร้าว/ความเสียหาย:</label>
                <select
                  value={selectedWall.condition}
                  onChange={(e) => {
                    const cond = e.target.value as any;
                    onChangeFloorPlan({
                      ...floorPlan,
                      walls: floorPlan.walls.map((w) => (w.id === selectedWall.id ? { ...w, condition: cond } : w)),
                    });
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                >
                  <option value="good">สภาพดี (Good)</option>
                  <option value="hairline_cracks">รอยร้าวลายตีนกา (Hairline Cracks)</option>
                  <option value="structural_crack">รอยร้าวเฉียง 45 องศา (Structural Crack)</option>
                  <option value="dampness">มีรอยคราบความชื้น/สีล่อน (Dampness)</option>
                </select>
              </div>

              {/* Wall Coordinates (Move / Stretch / Resize) */}
              <div className="border-t border-slate-800 pt-2 space-y-2">
                <span className="font-semibold text-slate-300 block text-[11px]">พิกัดตำแหน่ง & ความยาว (Move / Resize):</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-0.5 text-[10px]">จุดเริ่ม X (ม.):</label>
                    <input
                      type="number"
                      step="0.05"
                      value={selectedWall.startX}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        onChangeFloorPlan({
                          ...floorPlan,
                          walls: floorPlan.walls.map((w) => (w.id === selectedWall.id ? { ...w, startX: val } : w)),
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-0.5 text-[10px]">จุดเริ่ม Y (ม.):</label>
                    <input
                      type="number"
                      step="0.05"
                      value={selectedWall.startY}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        onChangeFloorPlan({
                          ...floorPlan,
                          walls: floorPlan.walls.map((w) => (w.id === selectedWall.id ? { ...w, startY: val } : w)),
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-0.5 text-[10px]">จุดสิ้นสุด X (ม.):</label>
                    <input
                      type="number"
                      step="0.05"
                      value={selectedWall.endX}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        onChangeFloorPlan({
                          ...floorPlan,
                          walls: floorPlan.walls.map((w) => (w.id === selectedWall.id ? { ...w, endX: val } : w)),
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-0.5 text-[10px]">จุดสิ้นสุด Y (ม.):</label>
                    <input
                      type="number"
                      step="0.05"
                      value={selectedWall.endY}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        onChangeFloorPlan({
                          ...floorPlan,
                          walls: floorPlan.walls.map((w) => (w.id === selectedWall.id ? { ...w, endY: val } : w)),
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 flex justify-between font-mono pt-1">
                  <span>ความยาวผนัง:</span>
                  <span className="text-amber-400 font-bold">
                    {Math.sqrt(Math.pow(selectedWall.endX - selectedWall.startX, 2) + Math.pow(selectedWall.endY - selectedWall.startY, 2)).toFixed(2)} เมตร
                  </span>
                </div>

                {/* Quick Align Wall to Column Outer Edge */}
                <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                  <span className="text-slate-400 block text-[10px] font-semibold">
                    จัดตำแหน่งขอบผนังกับริมเสา (Align Wall Edge):
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      onClick={() => handleAlignSelectedWallToColumn('outer_start')}
                      className="px-2 py-1 bg-slate-900 hover:bg-amber-950 border border-slate-700 hover:border-amber-500 rounded text-[10px] text-slate-200 font-medium transition-colors"
                      title="ขยับผนังให้อยู่ขอบนอกริมเสา (ซ้าย/บน)"
                    >
                      ริมเสานอก (ซ้าย/บน)
                    </button>
                    <button
                      onClick={() => handleAlignSelectedWallToColumn('center')}
                      className="px-2 py-1 bg-slate-900 hover:bg-sky-950 border border-slate-700 hover:border-sky-500 rounded text-[10px] text-slate-200 font-medium transition-colors"
                      title="จัดกึ่งกลางเสาตามแนวกริด"
                    >
                      เซนเตอร์ (กริด)
                    </button>
                    <button
                      onClick={() => handleAlignSelectedWallToColumn('outer_end')}
                      className="px-2 py-1 bg-slate-900 hover:bg-amber-950 border border-slate-700 hover:border-amber-500 rounded text-[10px] text-slate-200 font-medium transition-colors"
                      title="ขยับผนังให้อยู่ขอบนอกริมเสา (ขวา/ล่าง)"
                    >
                      ริมเสานอก (ขวา/ล่าง)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. Selected Opening Inspector (Door/Window) */}
          {selectedOpening && (
            <div className="space-y-3 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  {selectedOpening.type === 'door' ? (
                    <DoorClosed className="w-4 h-4 text-sky-400" />
                  ) : (
                    <AppWindow className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>รายละเอียด {selectedOpening.type === 'door' ? 'ประตู' : 'หน้าต่าง'}</span>
                </span>
                <span className="text-slate-500 font-mono text-[10px]">{selectedOpening.id}</span>
              </div>

              {/* Label */}
              <div>
                <label className="text-slate-400 block mb-1">ชื่อสัญลักษณ์ (Label):</label>
                <input
                  type="text"
                  value={selectedOpening.label}
                  onChange={(e) => {
                    const val = e.target.value;
                    onChangeFloorPlan({
                      ...floorPlan,
                      openings: floorPlan.openings.map((o) => (o.id === selectedOpening.id ? { ...o, label: val } : o)),
                    });
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
                />
              </div>

              {/* Material Type / Preset Dropdown */}
              <div>
                <label className="text-slate-400 block mb-1">
                  ชนิด{selectedOpening.type === 'door' ? 'ประตู' : 'หน้าต่าง'}:
                </label>
                <select
                  value={
                    (selectedOpening.type === 'door' ? DOOR_PRESETS : WINDOW_PRESETS).some(
                      (p) => p.label === selectedOpening.materialType
                    )
                      ? selectedOpening.materialType
                      : 'ระบุเอง...'
                  }
                  onChange={(e) => {
                    const selectedVal = e.target.value;
                    const presets = selectedOpening.type === 'door' ? DOOR_PRESETS : WINDOW_PRESETS;
                    const preset = presets.find((p) => p.label === selectedVal);
                    onChangeFloorPlan({
                      ...floorPlan,
                      openings: floorPlan.openings.map((o) => {
                        if (o.id !== selectedOpening.id) return o;
                        if (preset && preset.label !== 'ระบุเอง...') {
                          return {
                            ...o,
                            materialType: selectedVal,
                            widthCm: preset.width,
                            heightCm: preset.height,
                            sillHeightCm: preset.sill,
                            notes: `${selectedVal}${selectedOpening.type === 'window' && preset.sill > 0 ? ` (Sill ${preset.sill} ซม.)` : ''}`,
                          };
                        }
                        return { ...o, materialType: 'ระบุเอง...', notes: 'ระบุเอง...' };
                      }),
                    });
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-medium text-xs focus:border-emerald-500 outline-none"
                >
                  {(selectedOpening.type === 'door' ? DOOR_PRESETS : WINDOW_PRESETS).map((preset) => (
                    <option key={preset.label} value={preset.label}>
                      {preset.label}
                    </option>
                  ))}
                </select>

                {/* Text input if 'ระบุเอง...' or custom value */}
                {(selectedOpening.materialType === 'ระบุเอง...' ||
                  !(selectedOpening.type === 'door' ? DOOR_PRESETS : WINDOW_PRESETS).some(
                    (p) => p.label === selectedOpening.materialType && p.label !== 'ระบุเอง...'
                  )) && (
                  <div className="mt-2">
                    <label className="text-slate-400 text-[10px] block mb-1">
                      ระบุชนิด{selectedOpening.type === 'door' ? 'ประตู' : 'หน้าต่าง'}เอง:
                    </label>
                    <input
                      type="text"
                      placeholder={`พิมพ์ชนิด${selectedOpening.type === 'door' ? 'ประตู' : 'หน้าต่าง'}...`}
                      value={selectedOpening.materialType === 'ระบุเอง...' ? '' : (selectedOpening.materialType || '')}
                      onChange={(e) => {
                        const customVal = e.target.value;
                        onChangeFloorPlan({
                          ...floorPlan,
                          openings: floorPlan.openings.map((o) =>
                            o.id === selectedOpening.id
                              ? { ...o, materialType: customVal || 'ระบุเอง...', notes: customVal || 'ระบุเอง...' }
                              : o
                          ),
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-medium text-xs focus:border-emerald-500 outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Dimensions: Width x Height */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">ความกว้าง (ซม.):</label>
                  <input
                    type="number"
                    value={selectedOpening.widthCm}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 80;
                      onChangeFloorPlan({
                        ...floorPlan,
                        openings: floorPlan.openings.map((o) => (o.id === selectedOpening.id ? { ...o, widthCm: val } : o)),
                      });
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">ความสูงช่อง (ซม.):</label>
                  <input
                    type="number"
                    value={selectedOpening.heightCm}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 120;
                      onChangeFloorPlan({
                        ...floorPlan,
                        openings: floorPlan.openings.map((o) => (o.id === selectedOpening.id ? { ...o, heightCm: val } : o)),
                      });
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
                  />
                </div>
              </div>

              {/* Sill Height (ความสูงจากพื้นสำหรับหน้าต่าง) */}
              <div>
                <label className="text-emerald-300 font-semibold block mb-1">
                  ความสูงจากพื้นถึงขอบล่าง / Sill Height (ซม.):
                </label>
                <input
                  type="number"
                  value={selectedOpening.sillHeightCm}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    onChangeFloorPlan({
                      ...floorPlan,
                      openings: floorPlan.openings.map((o) =>
                        o.id === selectedOpening.id ? { ...o, sillHeightCm: val } : o
                      ),
                    });
                  }}
                  className="w-full bg-slate-900 border border-emerald-600/80 rounded px-2 py-1 text-emerald-300 font-bold font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  * สำหรับหน้าต่าง ระบุระดับความสูงของขอบล่างจากพื้น เช่น 80 ซม., 90 ซม., 100 ซม.
                </span>
              </div>
            </div>
          )}

          {/* 6. Selected Defect / Photo Pin Inspector */}
          {selectedDefect && (
            <div className="space-y-3 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-rose-400 flex items-center gap-1.5">
                  <Camera className="w-4 h-4" />
                  พินแนบรูปถ่ายสำรวจ (Photo Pin)
                </span>
                <span className="text-slate-500 font-mono text-[10px]">{selectedDefect.id}</span>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">ชื่อพิน / หัวข้อสำรวจ:</label>
                <input
                  type="text"
                  value={selectedDefect.title}
                  onChange={(e) => {
                    const val = e.target.value;
                    onChangeFloorPlan({
                      ...floorPlan,
                      defectPins: floorPlan.defectPins.map((d) => (d.id === selectedDefect.id ? { ...d, title: val } : d)),
                    });
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                />
              </div>

              {/* Photo Attachment Section */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-rose-400" />
                  <span>รูปถ่ายสำรวจ (Photo Attachment):</span>
                </label>
                {selectedDefect.photoUrl ? (
                  <div className="space-y-2">
                    <div className="relative group rounded-lg overflow-hidden border border-slate-700 bg-slate-900 aspect-video flex items-center justify-center">
                      <img src={selectedDefect.photoUrl} alt="Photo Pin" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          onChangeFloorPlan({
                            ...floorPlan,
                            defectPins: floorPlan.defectPins.map((d) =>
                              d.id === selectedDefect.id ? { ...d, photoUrl: undefined } : d
                            ),
                          });
                        }}
                        className="absolute top-1 right-1 bg-red-600/90 hover:bg-red-600 text-white p-1 rounded-full text-xs shadow-md"
                        title="ลบรูปถ่ายนี้"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded px-2 py-2 cursor-pointer text-[11px] transition-colors">
                        <Upload className="w-3.5 h-3.5 text-sky-400" />
                        <span>อัพโหลด</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const res = ev.target?.result as string;
                              if (res) {
                                onChangeFloorPlan({
                                  ...floorPlan,
                                  defectPins: floorPlan.defectPins.map((d) =>
                                    d.id === selectedDefect.id ? { ...d, photoUrl: res } : d
                                  ),
                                });
                              }
                            };
                            reader.readAsDataURL(file);
                          }}
                          className="hidden"
                        />
                      </label>
                      <label className="flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded px-2 py-2 cursor-pointer text-[11px] transition-colors">
                        <Camera className="w-3.5 h-3.5 text-emerald-400" />
                        <span>ถ่ายรูป</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const res = ev.target?.result as string;
                              if (res) {
                                onChangeFloorPlan({
                                  ...floorPlan,
                                  defectPins: floorPlan.defectPins.map((d) =>
                                    d.id === selectedDefect.id ? { ...d, photoUrl: res } : d
                                  ),
                                });
                              }
                            };
                            reader.readAsDataURL(file);
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-slate-700 hover:border-rose-500/80 rounded-lg bg-slate-900/50 hover:bg-rose-950/20 text-slate-400 hover:text-rose-300 cursor-pointer transition-all">
                      <Upload className="w-6 h-6 text-rose-400" />
                      <div className="text-center">
                        <span className="font-bold text-xs block">อัพโหลดรูปถ่าย</span>
                        <span className="text-[10px] text-slate-500">JPG, PNG, WEBP</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const res = ev.target?.result as string;
                            if (res) {
                              onChangeFloorPlan({
                                ...floorPlan,
                                defectPins: floorPlan.defectPins.map((d) =>
                                  d.id === selectedDefect.id ? { ...d, photoUrl: res } : d
                                ),
                              });
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                        className="hidden"
                      />
                    </label>

                    <label className="flex items-center justify-center gap-2 p-3 bg-slate-900 hover:bg-emerald-950/30 border border-slate-700 hover:border-emerald-500/50 text-slate-300 rounded-lg cursor-pointer transition-all">
                      <Camera className="w-5 h-5 text-emerald-400" />
                      <span className="font-bold text-xs">เปิดกล้องถ่ายรูป (Camera)</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const res = ev.target?.result as string;
                            if (res) {
                              onChangeFloorPlan({
                                ...floorPlan,
                                defectPins: floorPlan.defectPins.map((d) =>
                                  d.id === selectedDefect.id ? { ...d, photoUrl: res } : d
                                ),
                              });
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 7. Selected Room Pin Inspector */}
          {selectedRoom && (
            <div className="space-y-3 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs animate-in fade-in slide-in-from-right-3 duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-orange-400 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  พินปักหมุดห้อง (Room Pin)
                </span>
                <span className="text-slate-500 font-mono text-[10px]">{selectedRoom.id}</span>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">ชื่อห้อง (Room Name):</label>
                <input
                  type="text"
                  value={selectedRoom.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    onChangeFloorPlan({
                      ...floorPlan,
                      roomPins: (floorPlan.roomPins || []).map((r) =>
                        r.id === selectedRoom.id ? { ...r, name: val } : r
                      ),
                    });
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-bold"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">ระดับความสูงชั้น (Floor Height - m):</label>
                <input
                  type="number"
                  step="0.05"
                  min="1.0"
                  max="10.0"
                  value={selectedRoom.floorHeight}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    onChangeFloorPlan({
                      ...floorPlan,
                      roomPins: (floorPlan.roomPins || []).map((r) =>
                        r.id === selectedRoom.id ? { ...r, floorHeight: val } : r
                      ),
                    });
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono font-bold"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  * ระดับความสูงโครงสร้างแยกส่วนเฉพาะของห้องนี้โดยเฉพาะ
                </span>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">วิธีการคำนวณขนาดห้อง (Calculation Method):</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onChangeFloorPlan({
                        ...floorPlan,
                        roomPins: (floorPlan.roomPins || []).map((r) =>
                          r.id === selectedRoom.id ? { ...r, isAutoCalculated: true } : r
                        ),
                      });
                    }}
                    className={`p-1.5 rounded border font-medium text-center transition-colors ${
                      selectedRoom.isAutoCalculated
                        ? 'bg-orange-950/40 border-orange-600 text-orange-400'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    กริดอัตโนมัติ (Auto)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onChangeFloorPlan({
                        ...floorPlan,
                        roomPins: (floorPlan.roomPins || []).map((r) =>
                          r.id === selectedRoom.id
                            ? { ...r, isAutoCalculated: false, customWidth: r.customWidth || 4.0, customDepth: r.customDepth || 4.0 }
                            : r
                        ),
                      });
                    }}
                    className={`p-1.5 rounded border font-medium text-center transition-colors ${
                      !selectedRoom.isAutoCalculated
                        ? 'bg-orange-950/40 border-orange-600 text-orange-400'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ระบุระยะเอง (Manual)
                  </button>
                </div>
              </div>

              {!selectedRoom.isAutoCalculated && (
                <div className="grid grid-cols-2 gap-2 p-2 bg-slate-900/50 border border-slate-800 rounded-lg">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">ความกว้างห้อง (ม.):</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.5"
                      max="30.0"
                      value={selectedRoom.customWidth || 4.0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0.5;
                        onChangeFloorPlan({
                          ...floorPlan,
                          roomPins: (floorPlan.roomPins || []).map((r) =>
                            r.id === selectedRoom.id ? { ...r, customWidth: val } : r
                          ),
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">ความลึกห้อง (ม.):</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.5"
                      max="30.0"
                      value={selectedRoom.customDepth || 4.0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0.5;
                        onChangeFloorPlan({
                          ...floorPlan,
                          roomPins: (floorPlan.roomPins || []).map((r) =>
                            r.id === selectedRoom.id ? { ...r, customDepth: val } : r
                          ),
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-slate-100 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* รูปทรงห้องและการมีขยัก */}
              <div className="border-t border-slate-800 pt-2 space-y-2">
                <label className="text-slate-400 block mb-0.5">รูปทรงห้อง (Room Shape / ขยัก):</label>
                <select
                  value={selectedRoom.roomShape || 'rectangle'}
                  onChange={(e) => {
                    const val = e.target.value;
                    onChangeFloorPlan({
                      ...floorPlan,
                      roomPins: (floorPlan.roomPins || []).map((r) =>
                        r.id === selectedRoom.id ? { ...r, roomShape: val as any } : r
                      ),
                    });
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-medium"
                >
                  <option value="rectangle">สี่เหลี่ยมมาตรฐาน (Rectangle)</option>
                  <option value="l_shape">รูปตัว L (L-Shape / หักมุมขยัก 1 ตัว)</option>
                  <option value="t_shape">รูปตัว T (T-Shape / หักมุมขยัก 2 ตัว)</option>
                </select>
              </div>

              {((selectedRoom.roomShape === 'l_shape' || selectedRoom.roomShape === 't_shape') && (
                <div className="grid grid-cols-2 gap-2 p-2 bg-orange-950/20 border border-orange-900/40 rounded-lg">
                  <div>
                    <label className="text-[10px] text-orange-300 block mb-0.5">กว้างรอยขยัก (ม.):</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="15"
                      value={selectedRoom.indentWidth || 0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        onChangeFloorPlan({
                          ...floorPlan,
                          roomPins: (floorPlan.roomPins || []).map((r) =>
                            r.id === selectedRoom.id ? { ...r, indentWidth: val } : r
                          ),
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-slate-100 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-orange-300 block mb-0.5">ลึกรอยขยัก (ม.):</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="15"
                      value={selectedRoom.indentDepth || 0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        onChangeFloorPlan({
                          ...floorPlan,
                          roomPins: (floorPlan.roomPins || []).map((r) =>
                            r.id === selectedRoom.id ? { ...r, indentDepth: val } : r
                          ),
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-slate-100 font-mono text-xs"
                    />
                  </div>
                </div>
              ))}

              {/* ปรับละเอียดแมนนวล */}
              <div className="border-t border-slate-800 pt-2 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  ปรับแก้ขนาดละเอียดหน้างาน (Fine-tuning Adjustments)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">ชดเชยความกว้าง ± (ม.):</label>
                    <select
                      value={selectedRoom.widthOffset || 0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        onChangeFloorPlan({
                          ...floorPlan,
                          roomPins: (floorPlan.roomPins || []).map((r) =>
                            r.id === selectedRoom.id ? { ...r, widthOffset: val } : r
                          ),
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-xs"
                    >
                      <option value="0">0</option>
                      <option value="0.15">+0.15</option>
                      <option value="0.125">+0.125</option>
                      <option value="0.1">+0.1</option>
                      <option value="0.075">+0.075</option>
                      <option value="0.05">+0.05</option>
                      <option value="-0.05">-0.05</option>
                      <option value="-0.075">-0.075</option>
                      <option value="-0.1">-0.1</option>
                      <option value="-0.125">-0.125</option>
                      <option value="-0.15">-0.15</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">ชดเชยความลึก ± (ม.):</label>
                    <select
                      value={selectedRoom.depthOffset || 0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        onChangeFloorPlan({
                          ...floorPlan,
                          roomPins: (floorPlan.roomPins || []).map((r) =>
                            r.id === selectedRoom.id ? { ...r, depthOffset: val } : r
                          ),
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-xs"
                    >
                      <option value="0">0</option>
                      <option value="0.15">+0.15</option>
                      <option value="0.125">+0.125</option>
                      <option value="0.1">+0.1</option>
                      <option value="0.075">+0.075</option>
                      <option value="0.05">+0.05</option>
                      <option value="-0.05">-0.05</option>
                      <option value="-0.075">-0.075</option>
                      <option value="-0.1">-0.1</option>
                      <option value="-0.125">-0.125</option>
                      <option value="-0.15">-0.15</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 mt-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">ชดเชยรอบผนัง ± (ม.):</label>
                    <select
                      value={selectedRoom.wallLengthOffset || 0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        onChangeFloorPlan({
                          ...floorPlan,
                          roomPins: (floorPlan.roomPins || []).map((r) =>
                            r.id === selectedRoom.id ? { ...r, wallLengthOffset: val } : r
                          ),
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-xs"
                    >
                      <option value="0">0</option>
                      <option value="0.15">+0.15</option>
                      <option value="0.125">+0.125</option>
                      <option value="0.1">+0.1</option>
                      <option value="0.075">+0.075</option>
                      <option value="0.05">+0.05</option>
                      <option value="-0.05">-0.05</option>
                      <option value="-0.075">-0.075</option>
                      <option value="-0.1">-0.1</option>
                      <option value="-0.125">-0.125</option>
                      <option value="-0.15">-0.15</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Dynamic calculations breakdown panel */}
              {(() => {
                const roomCalc = calculateRoomDimensions(selectedRoom);
                return (
                  <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg space-y-1.5 font-mono text-[11px]">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      สรุปผลการคำนวณพื้นที่ห้อง (Real-time Area Calculation)
                    </span>
                    <div className="flex justify-between border-b border-slate-800 pb-1">
                      <span className="text-slate-400">ขนาดห้องจำลอง:</span>
                      <span className="text-slate-200 font-bold">{roomCalc.width.toFixed(2)}m × {roomCalc.depth.toFixed(2)}m</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">พื้นที่พื้น (Floor):</span>
                      <span className="text-slate-200 font-bold">{roomCalc.floorArea.toFixed(2)} m²</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">พื้นที่ฝ้า (Ceiling):</span>
                      <span className="text-slate-200 font-bold">{roomCalc.ceilingArea.toFixed(2)} m²</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">พื้นที่ผนังดิบ (Gross Wall):</span>
                      <span className="text-slate-400 font-bold">{roomCalc.grossWallArea.toFixed(2)} m²</span>
                    </div>
                    <div className="flex justify-between text-rose-400/90 border-b border-slate-800 pb-1">
                      <span>หักช่องเปิดประตู/หน้าต่าง:</span>
                      <span>- {roomCalc.subtractedArea.toFixed(2)} m²</span>
                    </div>
                    <div className="flex justify-between text-orange-400 font-bold text-xs pt-1">
                      <span>พื้นที่ผนังสุทธิ (Net Wall):</span>
                      <span>{roomCalc.netWallArea.toFixed(2)} m²</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Plan Summary Stats */}
          <div className="mt-auto border-t border-slate-800 pt-3 text-[11px] text-slate-400 space-y-1 font-mono">
            <div className="flex justify-between">
              <span>จำนวนเสาทั้งหมด:</span>
              <span className="text-sky-400 font-bold">{floorPlan.columns.length} ต้น</span>
            </div>
            <div className="flex justify-between">
              <span>จำนวนผนังทั้งหมด:</span>
              <span className="text-orange-400 font-bold">{floorPlan.walls.length} ช่วง</span>
            </div>
            <div className="flex justify-between">
              <span>ช่องเปิด (ประตู/หน้าต่าง):</span>
              <span className="text-emerald-400 font-bold">{floorPlan.openings.length} ช่อง</span>
            </div>
            <div className="flex justify-between">
              <span>ความสูงชั้น:</span>
              <span className="text-emerald-300 font-bold">{floorPlan.floorHeight || 2.8} m</span>
            </div>
          </div>
            </div>
          );

          return (
            <div
              onTouchStart={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              style={{ touchAction: 'pan-y' }}
              className="w-full landscape:w-80 lg:w-80 h-auto max-h-[220px] sm:max-h-[260px] landscape:max-h-none lg:max-h-none landscape:h-full lg:h-full bg-slate-900 border-t landscape:border-t-0 lg:border-t-0 border-l-0 landscape:border-l lg:border-l border-slate-800 p-3 sm:p-4 flex flex-col overflow-y-auto shrink-0 z-20 shadow-lg"
            >
              {inspectorContent}
            </div>
          );
        })()}
      </div>

      {/* Quick Add Grid Modal */}
      {gridModalState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-sm w-full shadow-2xl space-y-4 text-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Grid className={`w-4 h-4 ${gridModalState.axis === 'X' ? 'text-sky-400' : 'text-emerald-400'}`} />
                <span>
                  เพิ่มกริดลาย {gridModalState.axis === 'X' ? 'แนวตั้ง (แกน X)' : 'แนวนอน (แกน Y)'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setGridModalState(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">ชื่อลายกริด (Label):</label>
                <input
                  type="text"
                  value={gridModalState.label}
                  onChange={(e) => setGridModalState({ ...gridModalState, label: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white font-bold focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  ระยะห่างถัดไปจากกริดสุดท้าย (เมตร):
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  value={gridModalState.dist}
                  onChange={(e) =>
                    setGridModalState({
                      ...gridModalState,
                      dist: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setGridModalState(null)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmAddGridModal}
                className={`px-4 py-1.5 rounded text-white text-xs font-bold transition-colors shadow-md ${
                  gridModalState.axis === 'X'
                    ? 'bg-sky-600 hover:bg-sky-500'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                + เพิ่มกริดลาย {gridModalState.label}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Grid Span Modal */}
      {editSpanModalState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-sm w-full shadow-2xl space-y-4 text-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Edit2 className={`w-4 h-4 ${editSpanModalState.axis === 'X' ? 'text-sky-400' : 'text-emerald-400'}`} />
                <span>
                  แก้ไขระยะห่างกริด {editSpanModalState.axis === 'X' ? 'แนวตั้ง (แกน X)' : 'แนวนอน (แกน Y)'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setEditSpanModalState(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1">
              <div className="text-slate-400 text-[11px]">ช่วงลายกริด:</div>
              <div className="font-bold text-slate-200 text-sm flex items-center justify-between">
                <span>
                  กริด {editSpanModalState.prevGrid.label} ➔ กริด {editSpanModalState.targetGrid.label}
                </span>
                <span className="font-mono text-amber-400">
                  {editSpanModalState.currentSpan.toFixed(1)}m
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  ระบุระยะห่างใหม่ (เมตร):
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  value={editSpanModalState.newSpan}
                  onChange={(e) =>
                    setEditSpanModalState({
                      ...editSpanModalState,
                      newSpan: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white font-mono font-bold text-base focus:outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>

              <div>
                <span className="text-slate-400 text-[10px] block mb-1">เลือกระยะด่วน:</span>
                <div className="grid grid-cols-5 gap-1.5">
                  {[2.0, 3.0, 3.5, 4.0, 4.5, 5.0, 6.0, 7.0, 8.0, 9.0].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setEditSpanModalState({ ...editSpanModalState, newSpan: preset })}
                      className={`py-1 rounded text-[11px] font-mono border transition-colors ${
                        editSpanModalState.newSpan === preset
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {preset}m
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-[10px] text-slate-400 leading-tight bg-slate-950/50 p-2 rounded border border-slate-800/80">
                💡 *การปรับระยะห่าง จะขยับกริดถัดไปทั้งหมดและโครงสร้าง (เสา/ผนัง) ในโซนนั้นตามระยะใหม่โดยอัตโนมัติ
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditSpanModalState(null)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmEditSpanModal}
                className="px-4 py-1.5 rounded text-slate-950 bg-amber-400 hover:bg-amber-300 text-xs font-bold transition-colors shadow-md flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                บันทึกระยะใหม่
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
