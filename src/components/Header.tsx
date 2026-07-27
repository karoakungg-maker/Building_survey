import React from 'react';
import { SurveyProject } from '../types';
// @ts-ignore
import logoImg from '../assets/images/building_survey_logo_1785066287566.jpg';
import {
  Grid,
  Camera,
  Printer,
  Edit3,
  MapPin,
  FolderOpen,
  PlusCircle,
  Layers,
  Building,
} from 'lucide-react';

interface HeaderProps {
  project: SurveyProject;
  activeTab: 'cad' | 'photos';
  onChangeTab: (tab: 'cad' | 'photos') => void;
  activeFloorId: string;
  onSelectFloor: (floorId: string) => void;
  onOpenMetaModal: () => void;
  onOpenPrintView: (mode: 'report' | 'plan') => void;
  onLoadSample: () => void;
  onNewProject: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  activeTab,
  onChangeTab,
  activeFloorId,
  onSelectFloor,
  onOpenMetaModal,
  onOpenPrintView,
  onLoadSample,
  onNewProject,
}) => {
  const floorCount = Math.max(1, project.floorCount || 1);
  const floors = Array.from({ length: floorCount }, (_, i) => {
    const fNum = i + 1;
    return {
      id: `floor_${fNum}`,
      name: `ชั้น ${fNum}`,
      height: project.floorHeights?.[`floor_${fNum}`] ?? (fNum === 1 ? project.defaultFloorHeight : 3.0),
    };
  });

  return (
    <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-1.5 sm:py-2 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
        {/* Brand Title & Active Project Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg overflow-hidden border border-slate-800 shadow-md shrink-0 flex items-center justify-center bg-slate-900">
            <img 
              src={logoImg} 
              alt="Building Survey Logo" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-xs sm:text-sm font-extrabold text-slate-100 tracking-tight">
                Building Survey
              </h1>
              <span className="bg-sky-950 text-sky-400 border border-sky-800 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-full font-mono">
                v2.5
              </span>
            </div>

            {/* Active Building Name & GPS Badge */}
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-400 mt-0.5">
              <span className="font-semibold text-slate-200 truncate max-w-[120px] sm:max-w-xs">{project.name}</span>
              <span className="text-slate-600">•</span>
              <button
                onClick={onOpenMetaModal}
                className="hover:text-sky-400 flex items-center gap-0.5 font-mono text-[10px] sm:text-[11px]"
                title="คลิกเพื่อแก้ไขข้อมูลและพิกัด GPS"
              >
                <MapPin className="w-3 h-3 text-sky-400" />
                <span className="hidden sm:inline">
                  GPS ({project.gps.lat.toFixed(4)}, {project.gps.lng.toFixed(4)})
                </span>
                <span className="inline sm:hidden">GPS</span>
                <Edit3 className="w-3 h-3 text-slate-500 ml-0.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-slate-900 p-0.5 sm:p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => onChangeTab('cad')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all ${
              activeTab === 'cad'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Grid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>1. ผังกริดและโครงสร้าง</span>
          </button>

          <button
            onClick={() => onChangeTab('photos')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all ${
              activeTab === 'photos'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>2. คลังรูปภาพและพินสำรวจ</span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-0.5">
          {/* Print PDF Button */}
          <button
            onClick={() => onOpenPrintView('report')}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] sm:text-xs px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg border border-slate-700 transition-colors shrink-0"
            title="พิมพ์รายงานการสำรวจ"
          >
            <Printer className="w-3.5 h-3.5 text-sky-400" />
            <span>ออกรายงาน</span>
          </button>

          {/* Sample Load Button */}
          <button
            onClick={onLoadSample}
            className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-[11px] sm:text-xs px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-lg border border-slate-800 transition-colors shrink-0"
            title="โหลดอาคารตัวอย่าง"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>ตัวอย่าง</span>
          </button>

          {/* New Survey Button */}
          <button
            onClick={onNewProject}
            className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-[11px] sm:text-xs px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-lg border border-slate-800 transition-colors shrink-0"
            title="สร้างงานสำรวจใหม่"
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>สร้างใหม่</span>
          </button>
        </div>
      </div>

      {/* Floor Selection Bar (No Title, Just Options) */}
      <div className="bg-slate-950/90 border-t border-slate-800 px-3 py-1.5 flex items-center justify-start gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {floors.map((fl) => {
            const isActive = activeFloorId === fl.id;
            return (
              <button
                key={fl.id}
                onClick={() => onSelectFloor(fl.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/50'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700'
                }`}
              >
                <Building className="w-3.5 h-3.5 opacity-80" />
                <span>{fl.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${isActive ? 'bg-amber-600/30 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'}`}>
                  {fl.height}m
                </span>
              </button>
            );
          })}

          <button
            onClick={onOpenMetaModal}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-400 hover:text-sky-300 rounded-lg text-xs font-medium transition-colors shrink-0"
            title="ตั้งค่าจำนวนชั้นและความสูง"
          >
            <PlusCircle className="w-3.5 h-3.5 text-sky-400" />
            <span>ตั้งค่าจำนวนชั้น ({floorCount})</span>
          </button>
        </div>
      </div>
    </header>
  );
};
