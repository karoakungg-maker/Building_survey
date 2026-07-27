import React, { useState } from 'react';
import {
  SurveyProject,
  FloorPlanData,
  PhotoRecord,
} from './types';
import { SAMPLE_PROJECT_1 } from './data/sampleProjects';
import { Header } from './components/Header';
import { CadCanvas } from './components/CadCanvas';
import { PhotoManager } from './components/PhotoManager';
import { ProjectMetadataModal } from './components/ProjectMetadataModal';
import { PrintReportView } from './components/PrintReportView';
import {
  Building2,
  MapPin,
  Grid,
  Ruler,
} from 'lucide-react';

const DRAFT_STORAGE_KEY = 'ai_survey_active_draft_v1';

export default function App() {
  const [project, setProject] = useState<SurveyProject>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.project) return parsed.project;
      }
    } catch (e) {
      console.warn('Failed to parse draft project state:', e);
    }
    return SAMPLE_PROJECT_1.project;
  });

  const [activeFloorId, setActiveFloorId] = useState<string>('floor_1');
  const [floorPlansMap, setFloorPlansMap] = useState<Record<string, FloorPlanData>>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.floorPlansMap) return parsed.floorPlansMap;
        if (parsed.floorPlan) {
          return { [parsed.floorPlan.floorId || 'floor_1']: parsed.floorPlan };
        }
      }
    } catch (e) {
      console.warn('Failed to parse draft floorPlansMap:', e);
    }
    return { [SAMPLE_PROJECT_1.floorPlan.floorId]: SAMPLE_PROJECT_1.floorPlan };
  });

  const floorPlan = floorPlansMap[activeFloorId] || floorPlansMap['floor_1'] || SAMPLE_PROJECT_1.floorPlan;

  const activeFloorHeight = floorPlan.floorHeight || project.floorHeights?.[activeFloorId] || project.defaultFloorHeight || 3.2;

  const handleUpdateActiveFloorHeight = (newHeight: number) => {
    setFloorPlan({
      ...floorPlan,
      floorHeight: newHeight,
    });
    setProject((prev) => ({
      ...prev,
      floorHeights: {
        ...(prev.floorHeights || {}),
        [activeFloorId]: newHeight,
      },
    }));
  };

  const setFloorPlan = (updated: FloorPlanData) => {
    setFloorPlansMap((prev) => ({
      ...prev,
      [activeFloorId]: updated,
    }));
  };

  const handleSelectFloor = (floorId: string) => {
    setActiveFloorId(floorId);
    if (!floorPlansMap[floorId]) {
      const floor1 = floorPlansMap['floor_1'] || Object.values(floorPlansMap)[0] || SAMPLE_PROJECT_1.floorPlan;
      const floorNum = parseInt(floorId.replace('floor_', '')) || 1;
      const floorHeight = project.floorHeights?.[floorId] ?? project.defaultFloorHeight;

      const newFloorData: FloorPlanData = {
        floorId: floorId,
        floorName: `ชั้น ${floorNum}`,
        floorHeight: floorHeight,
        ceilingHeight: project.defaultCeilingHeight,
        gridX: JSON.parse(JSON.stringify(floor1.gridX)),
        gridY: JSON.parse(JSON.stringify(floor1.gridY)),
        columns: JSON.parse(JSON.stringify(floor1.columns)),
        walls: [],
        openings: [],
        defectPins: [],
        roomPins: [],
      };
      setFloorPlansMap((prev) => ({
        ...prev,
        [floorId]: newFloorData,
      }));
    }
  };

  const [photos, setPhotos] = useState<PhotoRecord[]>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.photos) return parsed.photos;
      }
    } catch (e) {
      console.warn('Failed to parse draft photos state:', e);
    }
    return SAMPLE_PROJECT_1.photos;
  });

  // Auto-save current active state to localStorage on every change
  React.useEffect(() => {
    try {
      const draftData = {
        project,
        floorPlansMap,
        floorPlan,
        photos,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
    } catch (e) {
      console.warn('Could not auto-save active draft to localStorage:', e);
    }
  }, [project, floorPlansMap, floorPlan, photos]);

  const [activeTab, setActiveTab] = useState<'cad' | 'photos'>('cad');

  // Modal states
  const [isMetaModalOpen, setIsMetaModalOpen] = useState<boolean>(false);
  const [printPreview, setPrintPreview] = useState<{ isOpen: boolean; mode: 'report' | 'plan' }>({
    isOpen: false,
    mode: 'report'
  });

  // Load Sample Project
  const handleLoadSample = () => {
    setProject(SAMPLE_PROJECT_1.project);
    setFloorPlansMap({ [SAMPLE_PROJECT_1.floorPlan.floorId]: SAMPLE_PROJECT_1.floorPlan });
    setActiveFloorId(SAMPLE_PROJECT_1.floorPlan.floorId);
    setPhotos(SAMPLE_PROJECT_1.photos);
  };

  // Create Blank Survey Project
  const handleNewProject = () => {
    const newProj: SurveyProject = {
      id: `proj_${Date.now()}`,
      name: 'โครงการสำรวจอาคารเก่าใหม่',
      code: `SRV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      buildingType: 'old_house',
      yearBuilt: 1980,
      floorCount: 2,
      totalAreaSqM: 180,
      surveyorName: 'นายวิศวกร สำรวจ',
      surveyDate: new Date().toISOString().split('T')[0],
      address: 'กรุงเทพมหานคร',
      gps: { lat: 13.75633, lng: 100.50177 },
      defaultFloorHeight: 3.2,
      floorHeights: { floor_1: 3.2, floor_2: 3.0 },
      defaultCeilingHeight: 2.8,
      notes: 'อาคารพักอาศัยเดิมสลับก่ออิฐครึ่งตึกครึ่งไม้',
      status: 'in_progress',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const blankFloorPlan: FloorPlanData = {
      floorId: 'floor_1',
      floorName: 'ชั้น 1',
      floorHeight: 3.2,
      ceilingHeight: 2.8,
      gridX: [
        { id: 'gx_A', label: 'A', positionMeters: 0 },
        { id: 'gx_B', label: 'B', positionMeters: 4.0 },
        { id: 'gx_C', label: 'C', positionMeters: 8.0 },
      ],
      gridY: [
        { id: 'gy_1', label: '1', positionMeters: 0 },
        { id: 'gy_2', label: '2', positionMeters: 4.0 },
        { id: 'gy_3', label: '3', positionMeters: 8.0 },
        { id: 'gy_4', label: '4', positionMeters: 12.0 },
      ],
      columns: [
        { id: 'col_A1', gridXLabel: 'A', gridYLabel: '1', x: 0, y: 0, widthCm: 20, depthCm: 20, shape: 'rectangular', material: 'RC', condition: 'good' },
        { id: 'col_B1', gridXLabel: 'B', gridYLabel: '1', x: 4.0, y: 0, widthCm: 20, depthCm: 20, shape: 'rectangular', material: 'RC', condition: 'good' },
        { id: 'col_C1', gridXLabel: 'C', gridYLabel: '1', x: 8.0, y: 0, widthCm: 20, depthCm: 20, shape: 'rectangular', material: 'RC', condition: 'good' },
        { id: 'col_A2', gridXLabel: 'A', gridYLabel: '2', x: 0, y: 4.0, widthCm: 20, depthCm: 20, shape: 'rectangular', material: 'RC', condition: 'good' },
        { id: 'col_B2', gridXLabel: 'B', gridYLabel: '2', x: 4.0, y: 4.0, widthCm: 20, depthCm: 20, shape: 'rectangular', material: 'RC', condition: 'good' },
        { id: 'col_C2', gridXLabel: 'C', gridYLabel: '2', x: 8.0, y: 4.0, widthCm: 20, depthCm: 20, shape: 'rectangular', material: 'RC', condition: 'good' },
        { id: 'col_A3', gridXLabel: 'A', gridYLabel: '3', x: 0, y: 8.0, widthCm: 20, depthCm: 20, shape: 'rectangular', material: 'RC', condition: 'good' },
        { id: 'col_B3', gridXLabel: 'B', gridYLabel: '3', x: 4.0, y: 8.0, widthCm: 20, depthCm: 20, shape: 'rectangular', material: 'RC', condition: 'good' },
        { id: 'col_C3', gridXLabel: 'C', gridYLabel: '3', x: 8.0, y: 8.0, widthCm: 20, depthCm: 20, shape: 'rectangular', material: 'RC', condition: 'good' },
        { id: 'col_A4', gridXLabel: 'A', gridYLabel: '4', x: 0, y: 12.0, widthCm: 20, depthCm: 20, shape: 'rectangular', material: 'RC', condition: 'good' },
        { id: 'col_B4', gridXLabel: 'B', gridYLabel: '4', x: 4.0, y: 12.0, widthCm: 20, depthCm: 20, shape: 'rectangular', material: 'RC', condition: 'good' },
        { id: 'col_C4', gridXLabel: 'C', gridYLabel: '4', x: 8.0, y: 12.0, widthCm: 20, depthCm: 20, shape: 'rectangular', material: 'RC', condition: 'good' },
      ],
      walls: [],
      openings: [],
      defectPins: [],
    };
    setProject(newProj);
    setFloorPlansMap({ floor_1: blankFloorPlan });
    setActiveFloorId('floor_1');
    setPhotos([]);
    setIsMetaModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Main Navigation Header */}
      <Header
        project={project}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        activeFloorId={activeFloorId}
        onSelectFloor={handleSelectFloor}
        activeFloorHeight={activeFloorHeight}
        onUpdateActiveFloorHeight={handleUpdateActiveFloorHeight}
        onOpenMetaModal={() => setIsMetaModalOpen(true)}
        onOpenPrintView={(mode) => setPrintPreview({ isOpen: true, mode: mode || 'report' })}
        onLoadSample={handleLoadSample}
        onNewProject={handleNewProject}
      />

      {/* Building Overview Quick Metadata Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-2 sm:px-4 py-1 sm:py-1.5 text-[11px] sm:text-xs text-slate-300">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <span className="flex items-center gap-1 font-semibold text-slate-200">
              <Building2 className="w-3.5 h-3.5 text-sky-400" />
              <span>ประเภท: {project.buildingType}</span>
            </span>

            <span className="text-slate-700 hidden sm:inline">|</span>

            <span className="flex items-center gap-1 font-mono text-emerald-400">
              <Ruler className="w-3.5 h-3.5" />
              <span>สูงชั้น: {floorPlan.floorHeight || project.defaultFloorHeight}m</span>
            </span>

            <span className="text-slate-700 hidden sm:inline">|</span>

            <span className="flex items-center gap-1 font-mono text-sky-300">
              <Grid className="w-3.5 h-3.5" />
              <span>{floorPlan.columns.length} เสา / {floorPlan.walls.length} ผนัง</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="bg-sky-950/80 border border-sky-800 text-sky-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 text-[10px] sm:text-[11px]">
              <MapPin className="w-3 h-3 text-sky-400" />
              <span>{floorPlan.defectPins.length} พินรูปถ่าย</span>
            </span>

            <button
              onClick={() => setIsMetaModalOpen(true)}
              className="text-sky-400 hover:underline font-medium text-[11px]"
            >
              [แก้ไข]
            </button>
          </div>
        </div>
      </div>

      {/* Main Active Tab Workspace */}
      <main className="flex-1 p-1 sm:p-3 w-full mx-auto flex flex-col min-h-[calc(100vh-100px)]">
        {/* Tab 1: Interactive CAD Canvas & Structural Grid */}
        {activeTab === 'cad' && (
          <div className="flex-1 flex flex-col min-h-[450px] sm:min-h-[600px] h-full">
            <CadCanvas
              floorPlan={floorPlan}
              onChangeFloorPlan={setFloorPlan}
              project={project}
              activeFloorId={activeFloorId}
              onChangeActiveFloorId={handleSelectFloor}
              onOpenPrintView={(mode: 'report' | 'plan') => setPrintPreview({ isOpen: true, mode })}
            />
          </div>
        )}

        {/* Tab 2: Photos Gallery & GPS Tagging */}
        {activeTab === 'photos' && (
          <PhotoManager
            photos={photos}
            currentGps={project.gps}
            onChangePhotos={setPhotos}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-3 text-center text-[11px] text-slate-500 font-mono">
        Building Survey • ระบบสำรวจและบันทึกข้อมูลโครงสร้างอาคารเก่าสำหรับผู้เชี่ยวชาญด้านงานสำรวจ
      </footer>

      {/* Modals */}
      <ProjectMetadataModal
        project={project}
        isOpen={isMetaModalOpen}
        onClose={() => setIsMetaModalOpen(false)}
        onSave={(updated) => setProject(updated)}
      />

      {printPreview.isOpen && (
        <PrintReportView
          project={project}
          floorPlan={floorPlan}
          floorPlansMap={floorPlansMap}
          photos={photos}
          onClose={() => setPrintPreview({ ...printPreview, isOpen: false })}
          mode={printPreview.mode}
        />
      )}
    </div>
  );
}
