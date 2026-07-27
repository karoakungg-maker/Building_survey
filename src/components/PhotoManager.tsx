import React, { useState } from 'react';
import { PhotoRecord, GPSCoords, DefectSeverity, PhotoAnnotation } from '../types';
import {
  Camera,
  MapPin,
  Upload,
  Trash2,
  Tag,
  Clock,
  Sparkles,
  Edit3,
  X,
  Plus,
  Check,
  AlertCircle,
  Maximize2,
} from 'lucide-react';

interface PhotoManagerProps {
  photos: PhotoRecord[];
  currentGps: GPSCoords;
  onChangePhotos: (photos: PhotoRecord[]) => void;
}

export const PhotoManager: React.FC<PhotoManagerProps> = ({
  photos,
  currentGps,
  onChangePhotos,
}) => {
  const [activePhoto, setActivePhoto] = useState<PhotoRecord | null>(null);
  const [isAnnotating, setIsAnnotating] = useState<boolean>(false);

  // New annotation state
  const [annText, setAnnText] = useState<string>('รอยแตกร้าวเฉือน 1.5 มม.');
  const [annType, setAnnType] = useState<'box' | 'arrow' | 'text'>('box');

  // Handle Photo File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: any) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const resultUrl = event.target?.result as string;
        const newPhoto: PhotoRecord = {
          id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          title: file.name.replace(/\.[^/.]+$/, ''),
          url: resultUrl,
          category: 'column',
          gps: { ...currentGps },
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          defectSeverity: 'moderate',
          notes: 'แนบภาพจากการสำรวจภาคสนาม',
          annotations: [],
        };

        onChangePhotos([...photos, newPhoto]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Add Annotation
  const handleAddAnnotation = (photoId: string) => {
    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return;

    const newAnn: PhotoAnnotation = {
      id: `ann_${Date.now()}`,
      type: annType,
      x: 30, // Default centered position percentage
      y: 35,
      width: annType === 'box' ? 40 : undefined,
      height: annType === 'box' ? 30 : undefined,
      color: '#ef4444', // Red warning
      text: annText,
    };

    const updated = photos.map((p) =>
      p.id === photoId ? { ...p, annotations: [...p.annotations, newAnn] } : p
    );
    onChangePhotos(updated);
    if (activePhoto && activePhoto.id === photoId) {
      setActivePhoto({ ...activePhoto, annotations: [...activePhoto.annotations, newAnn] });
    }
  };

  // Remove Annotation
  const handleRemoveAnnotation = (photoId: string, annId: string) => {
    const updated = photos.map((p) =>
      p.id === photoId ? { ...p, annotations: p.annotations.filter((a) => a.id !== annId) } : p
    );
    onChangePhotos(updated);
    if (activePhoto && activePhoto.id === photoId) {
      setActivePhoto({ ...activePhoto, annotations: activePhoto.annotations.filter((a) => a.id !== annId) });
    }
  };

  // Remove Photo
  const handleRemovePhoto = (photoId: string) => {
    onChangePhotos(photos.filter((p) => p.id !== photoId));
    if (activePhoto && activePhoto.id === photoId) {
      setActivePhoto(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Upload Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Camera className="w-5 h-5 text-sky-400" />
            <span>คลังรูปถ่ายสำรวจสภาพโครงสร้าง (Photo Gallery)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            แนบรูปภาพถ่ายความเสียหายของอาคาร แท็กหมวดหมู่ และวาดมาร์กอัปชี้จุดชำรุด
          </p>
        </div>

        {/* Upload Button */}
        <label className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs px-4 py-2.5 rounded-lg cursor-pointer transition-all shadow-md">
          <Upload className="w-4 h-4" />
          <span>แนบรูปถ่ายสำรวจ (+ Upload Photos)</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Photos Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col group hover:border-slate-700 transition-all shadow-md"
          >
            {/* Image Box with Annotations Overlay */}
            <div className="relative aspect-video bg-black overflow-hidden group">
              <img
                src={photo.url}
                alt={photo.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />

              {/* Render Annotations Overlay */}
              {photo.annotations.map((ann) => (
                <div
                  key={ann.id}
                  style={{
                    position: 'absolute',
                    left: `${ann.x}%`,
                    top: `${ann.y}%`,
                    width: ann.width ? `${ann.width}%` : 'auto',
                    height: ann.height ? `${ann.height}%` : 'auto',
                  }}
                  className="pointer-events-none"
                >
                  {ann.type === 'box' && (
                    <div className="w-full h-full border-2 border-red-500 bg-red-500/20 rounded flex items-start p-1">
                      <span className="bg-red-600 text-white text-[9px] font-bold px-1 rounded shadow">
                        {ann.text}
                      </span>
                    </div>
                  )}
                  {ann.type === 'arrow' && (
                    <div className="flex items-center gap-1 bg-amber-500 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded shadow">
                      <span>➔</span>
                      <span>{ann.text}</span>
                    </div>
                  )}
                </div>
              ))}

              {/* Severity Badge */}
              <div className="absolute top-2 left-2 z-10">
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded shadow backdrop-blur ${
                    photo.defectSeverity === 'critical'
                      ? 'bg-red-600/90 text-white'
                      : photo.defectSeverity === 'severe'
                      ? 'bg-orange-600/90 text-white'
                      : photo.defectSeverity === 'moderate'
                      ? 'bg-amber-600/90 text-white'
                      : 'bg-emerald-600/90 text-white'
                  }`}
                >
                  {photo.defectSeverity}
                </span>
              </div>

              {/* Expand Action Button */}
              <button
                onClick={() => setActivePhoto(photo)}
                className="absolute bottom-2 right-2 p-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity"
                title="ขยายรูปภาพและเพิ่มมาร์กอัป"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Details Content */}
            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
              <div>
                <input
                  type="text"
                  value={photo.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    onChangePhotos(
                      photos.map((p) => (p.id === photo.id ? { ...p, title } : p))
                    );
                  }}
                  className="font-bold text-xs text-slate-100 bg-transparent border-b border-transparent hover:border-slate-700 focus:border-sky-500 w-full focus:outline-none"
                />

                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{photo.notes}</p>
              </div>

              {/* Timestamp & Info Tag */}
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-[11px] font-mono space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-sky-400" /> วันที่-เวลาถ่ายภาพ:
                  </span>
                  <span>{photo.timestamp}</span>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between border-t border-slate-800 pt-2.5">
                <select
                  value={photo.category}
                  onChange={(e) => {
                    const cat = e.target.value as any;
                    onChangePhotos(photos.map((p) => (p.id === photo.id ? { ...p, category: cat } : p)));
                  }}
                  className="bg-slate-950 border border-slate-800 rounded text-[11px] text-slate-300 px-2 py-1"
                >
                  <option value="column">หมวดเสา (Column)</option>
                  <option value="beam">หมวดคาน (Beam)</option>
                  <option value="wall">หมวดผนัง (Wall)</option>
                  <option value="foundation">หมวดฐานราก (Foundation)</option>
                  <option value="roof">หมวดหลังคา (Roof)</option>
                  <option value="exterior">ภาพนอกอาคาร (Exterior)</option>
                </select>

                <button
                  onClick={() => handleRemovePhoto(photo.id)}
                  className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                  title="ลบรูปภาพ"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Expanded Photo Annotation Modal */}
      {activePhoto && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                <Edit3 className="w-4 h-4" />
                <span>มาร์กอัปรูปภาพชี้จุดรอยร้าว & ข้อความกำกับ ({activePhoto.title})</span>
              </div>
              <button
                onClick={() => setActivePhoto(null)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Image Preview with Annotations */}
              <div className="md:col-span-2 bg-black rounded-xl overflow-hidden relative min-h-[300px] flex items-center justify-center border border-slate-800">
                <img
                  src={activePhoto.url}
                  alt={activePhoto.title}
                  className="max-h-[60vh] object-contain w-full"
                />

                {/* Overlays */}
                {activePhoto.annotations.map((ann) => (
                  <div
                    key={ann.id}
                    style={{
                      position: 'absolute',
                      left: `${ann.x}%`,
                      top: `${ann.y}%`,
                      width: ann.width ? `${ann.width}%` : 'auto',
                      height: ann.height ? `${ann.height}%` : 'auto',
                    }}
                    className="group border-2 border-red-500 bg-red-500/20 p-1 rounded"
                  >
                    <div className="flex items-center justify-between bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                      <span>{ann.text}</span>
                      <button
                        onClick={() => handleRemoveAnnotation(activePhoto.id, ann.id)}
                        className="ml-2 hover:text-yellow-200"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Annotation Control Panel */}
              <div className="space-y-4 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-3">
                  <span className="font-bold text-slate-200 block border-b border-slate-800 pb-2">
                    + เพิ่มข้อความชี้จุดรอยร้าว (Add Annotation)
                  </span>

                  <div>
                    <label className="text-slate-400 block mb-1">รูปแบบมาร์กอัป:</label>
                    <select
                      value={annType}
                      onChange={(e) => setAnnType(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-200"
                    >
                      <option value="box">กรอบสี่เหลี่ยมสีแดง (Red Highlight Box)</option>
                      <option value="arrow">ลูกศรชี้ระบุข้อความ (Arrow Pointer)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">ข้อความระบุความเสียหาย:</label>
                    <input
                      type="text"
                      value={annText}
                      onChange={(e) => setAnnText(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-200"
                    />
                  </div>

                  <button
                    onClick={() => handleAddAnnotation(activePhoto.id)}
                    className="w-full bg-red-600 hover:bg-red-500 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>วางมาร์กอัปบนรูป</span>
                  </button>
                </div>

                {/* Existing Annotations List */}
                <div className="space-y-2">
                  <span className="font-semibold text-slate-400 block">
                    รายการมาร์กอัปบนภาพ ({activePhoto.annotations.length}):
                  </span>
                  {activePhoto.annotations.map((ann) => (
                    <div
                      key={ann.id}
                      className="flex items-center justify-between bg-slate-950 p-2 rounded border border-slate-800"
                    >
                      <span className="text-slate-300 font-medium">{ann.text}</span>
                      <button
                        onClick={() => handleRemoveAnnotation(activePhoto.id, ann.id)}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
