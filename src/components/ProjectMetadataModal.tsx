import React, { useState } from 'react';
import { SurveyProject, BuildingType, GPSCoords } from '../types';
import {
  Building2,
  Calendar,
  User,
  MapPin,
  Compass,
  FileText,
  X,
  Check,
  Navigation,
} from 'lucide-react';

interface ProjectMetadataModalProps {
  project: SurveyProject;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: SurveyProject) => void;
}

export const ProjectMetadataModal: React.FC<ProjectMetadataModalProps> = ({
  project,
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<SurveyProject>({ ...project });
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [selectedModalFloor, setSelectedModalFloor] = useState<number>(1);

  if (!isOpen) return null;

  // Fetch current browser GPS location
  const handleFetchGps = () => {
    if (!navigator.geolocation) {
      alert('เบราว์เซอร์ของคุณไม่รองรับการดึงพิกัด Geolocation');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setFormData({
          ...formData,
          gps: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            altitude: pos.coords.altitude || undefined,
            accuracy: pos.coords.accuracy || undefined,
          },
        });
      },
      (err) => {
        setIsLocating(false);
        alert(`ไม่สามารถดึงพิกัด GPS ได้: ${err.message}`);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
            <Building2 className="w-5 h-5" />
            <span>แก้ไขข้อมูลอาคารและรายละเอียดการสำรวจ (Project Metadata)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
          {/* Project Name */}
          <div className="space-y-1">
            <label className="text-slate-300 font-semibold block">ชื่ออาคาร / โครงการสำรวจ:</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500 font-bold"
            />
          </div>

          {/* Building Type & Floor Count */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold block">ประเภทโครงสร้างอาคาร:</label>
              <select
                value={formData.buildingType}
                onChange={(e) => setFormData({ ...formData, buildingType: e.target.value as BuildingType })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
              >
                <option value="rc_commercial">อาคาร คสล. (Reinforced Concrete)</option>
                <option value="historic_timber">เรือนไม้โบราณ (Historic Timber)</option>
                <option value="masonry_brick">อาคารก่ออิฐถือปูน (Masonry)</option>
                <option value="half_wood_half_rc">อาคารครึ่งตึกครึ่งไม้</option>
                <option value="heritage_monument">โบราณสถาน (Heritage Monument)</option>
                <option value="old_house">บ้านเก่าอยู่อาศัย</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold block">จำนวนชั้น (Floors):</label>
              <input
                type="number"
                value={formData.floorCount}
                onChange={(e) => setFormData({ ...formData, floorCount: parseInt(e.target.value) || 1 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
              />
            </div>
          </div>

          {/* Floor Heights Section (if floors > 1) */}
          {formData.floorCount > 1 ? (
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
              <label className="text-slate-300 font-semibold block">
                🏢 กำหนดความสูงชั้น (แยกตามแต่ละชั้น):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 text-[11px] block">เลือกชั้น:</label>
                  <select
                    value={selectedModalFloor}
                    onChange={(e) => setSelectedModalFloor(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-medium"
                  >
                    {Array.from({ length: formData.floorCount }, (_, i) => i + 1).map((fNum) => (
                      <option key={fNum} value={fNum}>
                        ชั้น {fNum} {fNum === 1 ? '(ชั้นล่าง/Ground)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 text-[11px] block">ความสูง ชั้น {selectedModalFloor} (เมตร):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.5"
                    max="10"
                    value={
                      formData.floorHeights?.[`floor_${selectedModalFloor}`] ??
                      (selectedModalFloor === 1 ? formData.defaultFloorHeight : 3.0)
                    }
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 3.0;
                      const newHeights = {
                        ...(formData.floorHeights || {}),
                        [`floor_${selectedModalFloor}`]: val,
                      };
                      setFormData({
                        ...formData,
                        floorHeights: newHeights,
                        defaultFloorHeight: selectedModalFloor === 1 ? val : formData.defaultFloorHeight,
                      });
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono font-bold"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold block">ความสูงชั้นมาตรฐาน (เมตร):</label>
              <input
                type="number"
                step="0.1"
                value={formData.defaultFloorHeight}
                onChange={(e) => setFormData({ ...formData, defaultFloorHeight: parseFloat(e.target.value) || 3.0 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
              />
            </div>
          )}

          {/* Surveyor Name & Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold block">ชื่อผู้สำรวจ / เลขใบอนุญาตวิศวกร:</label>
              <input
                type="text"
                value={formData.surveyorName}
                onChange={(e) => setFormData({ ...formData, surveyorName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold block">วันที่ลงพื้นที่สำรวจ:</label>
              <input
                type="date"
                value={formData.surveyDate}
                onChange={(e) => setFormData({ ...formData, surveyDate: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1">
            <label className="text-slate-300 font-semibold block">สถานที่ตั้งอาคาร / ที่อยู่:</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
            />
          </div>

          {/* GPS Section */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sky-400 flex items-center gap-1.5">
                <Compass className="w-4 h-4" />
                พิกัด GPS ตำแหน่งอาคาร
              </span>
              <button
                type="button"
                onClick={handleFetchGps}
                disabled={isLocating}
                className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'กำลังค้นหา GPS...' : 'ดึงพิกัด GPS ปัจจุบัน'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono">
              <div>
                <label className="text-slate-400 block mb-1">Latitude (ละติจูด):</label>
                <input
                  type="number"
                  step="0.00001"
                  value={formData.gps.lat}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      gps: { ...formData.gps, lat: parseFloat(e.target.value) || 0 },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Longitude (ลองจิจูด):</label>
                <input
                  type="number"
                  step="0.00001"
                  value={formData.gps.lng}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      gps: { ...formData.gps, lng: parseFloat(e.target.value) || 0 },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-slate-300 font-semibold block">หมายเหตุ / ข้อมูลประวัติการใช้งานอาคาร:</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-100"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-medium transition-colors flex items-center gap-1.5 shadow-md"
            >
              <Check className="w-4 h-4" />
              <span>บันทึกข้อมูล</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
