import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "25mb" }));

  // Helper to initialize Gemini SDK safely
  const getAi = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  };

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // AI Structural Analysis Endpoint
  app.post("/api/survey/ai-analysis", async (req, res) => {
    try {
      const ai = getAi();
      if (!ai) {
        return res.status(500).json({
          error: "GEMINI_API_KEY_MISSING",
          message: "ไม่พบ GEMINI_API_KEY ในระบบ กรุณาตั้งค่า API key ใน Secrets",
        });
      }

      const { project, structuralData, photos, floorPlan } = req.body;

      const prompt = `
คุณคือวิศวกรผู้เชี่ยวชาญด้านวิศวกรรมโครงสร้างและการบูรณะสำรวจอาคารเก่า (Senior Structural & Heritage Restoration Engineer)
กรุณาวิเคราะห์ข้อมูลการสำรวจอาคารต่อไปนี้อย่างเป็นระบบและให้คำแนะนำแบบมืออาชีพภาษาไทย:

[ข้อมูลอาคาร]
- ชื่อโครงการ/อาคาร: ${project?.name || "ไม่ระบุ"}
- ประเภทอาคาร: ${project?.buildingType || "ไม่ระบุ"}
- อายุอาคาร / ปีที่สร้าง: ${project?.yearBuilt || "ไม่ระบุ"}
- พิกัด GPS: Lat ${project?.gps?.lat || "-"}, Lng ${project?.gps?.lng || "-"}
- จำนวนชั้น: ${project?.floorCount || 1} ชั้น
- ความสูงฝ้าเพดาน: ${floorPlan?.ceilingHeight || project?.defaultCeilingHeight || "2.80"} เมตร
- หมายเหตุการสำรวจ: ${project?.notes || "ไม่มี"}

[ผลการตรวจสภาพโครงสร้างแยกตามส่วนประกอบ]
- ฐานราก (Foundation): Rating ${structuralData?.foundation?.rating || 3}/5 - หมายเหตุ: ${structuralData?.foundation?.notes || "ปกติ"} - รายการชำรุด: ${(structuralData?.foundation?.defects || []).join(", ") || "ไม่มี"}
- เสา (Columns): Rating ${structuralData?.columns?.rating || 3}/5 - หมายเหตุ: ${structuralData?.columns?.notes || "ปกติ"} - รายการชำรุด: ${(structuralData?.columns?.defects || []).join(", ") || "ไม่มี"}
- คาน (Beams): Rating ${structuralData?.beams?.rating || 3}/5 - หมายเหตุ: ${structuralData?.beams?.notes || "ปกติ"} - รายการชำรุด: ${(structuralData?.beams?.defects || []).join(", ") || "ไม่มี"}
- พื้น (Slabs): Rating ${structuralData?.slabs?.rating || 3}/5 - หมายเหตุ: ${structuralData?.slabs?.notes || "ปกติ"} - รายการชำรุด: ${(structuralData?.slabs?.defects || []).join(", ") || "ไม่มี"}
- ผนัง (Walls): Rating ${structuralData?.walls?.rating || 3}/5 - หมายเหตุ: ${structuralData?.walls?.notes || "ปกติ"} - รายการชำรุด: ${(structuralData?.walls?.defects || []).join(", ") || "ไม่มี"}
- หลังคา/โครงหลังคา (Roof): Rating ${structuralData?.roof?.rating || 3}/5 - หมายเหตุ: ${structuralData?.roof?.notes || "ปกติ"} - รายการชำรุด: ${(structuralData?.roof?.defects || []).join(", ") || "ไม่มี"}

[ข้อมูลแปลนโครงสร้าง & กริด]
- กริด X: ${floorPlan?.gridX?.length || 0} ลาย, กริด Y: ${floorPlan?.gridY?.length || 0} ลาย
- จำนวนเสา: ${floorPlan?.columns?.length || 0} ต้น
- จำนวนผนัง: ${floorPlan?.walls?.length || 0} ช่วง
- จำนวนประตู/หน้าต่าง: ${floorPlan?.openings?.length || 0} ช่อง
- จำนวนจุดพินชำรุดบนแปลน: ${floorPlan?.defectPins?.length || 0} จุด

[รูปถ่ายและพิกัดที่แนบ]
- จำนวนรูปถ่าย: ${photos?.length || 0} ภาพ

กรุณาสรุปรายงานผลการประเมินวิศวกรรมโครงสร้างเป็นรูปแบบ JSON Response โดยมีโครงสร้างดังนี้:
{
  "overallSafetyGrade": "GREEN (ปลอดภัย)" | "YELLOW (เฝ้าระวัง/ต้องซ่อมแซม)" | "ORANGE (เสียหายปานกลางถึงรุนแรง)" | "RED (อันตรายวิกฤต/ห้ามใช้งาน)",
  "riskScore": 1-100,
  "executiveSummary": "สรุปผลการสำรวจและประเมินสภาพโครงสร้างในภาพรวม 2-3 ประโยค",
  "criticalConcerns": [
    "รายการปัญหาจุดวิกฤตที่ต้องเฝ้าระวังหรือซ่อมแซมด่วน"
  ],
  "rootCauseAnalysis": "การวิเคราะห์สาเหตุหลักของการเสื่อมสภาพ (เช่น การทรุดตัวของฐานราก ความชื้นสะสม คอนกรีตเสื่อมสภาพตามอายุ ปลวกกินโครงสร้างไม้ ฯลฯ)",
  "recommendedRemediation": [
    {
      "element": "ส่วนโครงสร้าง (เช่น เสา, คาน, ผนัง)",
      "method": "วิธีซ่อมแซม/เสริมความแข็งแรงแบบมาตรฐานวิศวกรรม (เช่น Epoxy injection, CFRP wrapping, Jacketing, เปลี่ยนไม้เนื้อแข็ง, Micro-piling)",
      "urgency": "ด่วนที่สุด" | "ปานกลาง" | "ซ่อมบำรุงตามระยะเวลา"
    }
  ],
  "heritageConservationNotes": "คำแนะนำพิเศษหากเป็นอาคารเก่า/อนุรักษ์อาคารโบราณสถาน",
  "nextSurveySteps": "ขั้นตอนการทดสอบทางวิศวกรรมเพิ่มเติมที่แนะนำ (เช่น Non-Destructive Test, Rebound Hammer, Ultrasonic Pulse Velocity, Core Testing)"
}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response.text || "{}";
      const result = JSON.parse(text);
      return res.json({ success: true, analysis: result });
    } catch (err: any) {
      console.error("AI Analysis Error:", err);
      return res.status(500).json({
        error: "ANALYSIS_FAILED",
        message: err.message || "เกิดข้อผิดพลาดในการประมวลผล AI",
      });
    }
  });

  // Google Sheets Export Proxy Endpoint (Server-side to avoid browser CORS/iframe fetch issues)
  app.post("/api/sheets/export", async (req, res) => {
    try {
      const { accessToken, project, structuralData, floorPlan, photos } = req.body;

      if (!accessToken) {
        return res.status(401).json({
          error: "UNAUTHORIZED",
          message: "ไม่พบ Google Access Token กรุณาล็อกอินด้วย Google Account อีกครั้ง",
        });
      }

      const TARGET_DRIVE_FOLDER_ID = "15ujc2vDkOVmd4Hajn796LGKfAXeXc_28";
      const dateStr = new Date().toLocaleDateString("th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const sheetTitle = `รายงานการสำรวจอาคาร - ${project?.name || "ไม่ระบุชื่อ"} (${dateStr})`;

      let spreadsheetId = "";

      // 1. Check if a spreadsheet with the exact same title already exists in Drive (Overwrite feature)
      try {
        const searchQuery = `name = '${sheetTitle.replace(/'/g, "\\'")}' and trashed = false`;
        const searchRes = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(searchQuery)}&fields=files(id,name)`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.files && searchData.files.length > 0) {
            spreadsheetId = searchData.files[0].id;
            console.log(`Found existing Google Sheet (${sheetTitle}) ID: ${spreadsheetId}. Overwriting existing sheet...`);
          }
        }
      } catch (searchErr) {
        console.warn("Drive search error, proceeding with new creation:", searchErr);
      }

      // 2. If no existing file found, create a new Google Spreadsheet via Sheets API v4
      if (!spreadsheetId) {
        const createSheetRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            properties: { title: sheetTitle },
            sheets: [
              { properties: { title: "สรุปข้อมูลโครงการ" } },
              { properties: { title: "ตรวจสภาพโครงสร้าง" } },
              { properties: { title: "แปลนและผังกริด" } },
              { properties: { title: "คลังรูปภาพสำรวจ" } },
            ],
          }),
        });

        if (!createSheetRes.ok) {
          const errJson = await createSheetRes.json().catch(() => ({}));
          console.error("Sheets API creation failed, falling back to Drive API:", errJson);

          // Fallback: Create via Drive API v3
          const fallbackDriveRes = await fetch("https://www.googleapis.com/drive/v3/files", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: sheetTitle,
              mimeType: "application/vnd.google-apps.spreadsheet",
              parents: [TARGET_DRIVE_FOLDER_ID],
            }),
          });

          if (!fallbackDriveRes.ok) {
            const fbErr = await fallbackDriveRes.json().catch(() => ({}));
            return res.status(400).json({
              error: "DRIVE_CREATE_FAILED",
              message: `ไม่สามารถสร้างไฟล์ใน Google Drive: ${fbErr.error?.message || "โปรดยอมรับสิทธิ์การใช้งาน Google Drive"}`,
            });
          }

          const fbData = await fallbackDriveRes.json();
          spreadsheetId = fbData.id;
        } else {
          const sheetData = await createSheetRes.json();
          spreadsheetId = sheetData.spreadsheetId;

          // Try moving created spreadsheet into target drive folder
          try {
            await fetch(
              `https://www.googleapis.com/drive/v3/files/${spreadsheetId}?addParents=${TARGET_DRIVE_FOLDER_ID}&enforceSingleParent=true`,
              {
                method: "PATCH",
                headers: { Authorization: `Bearer ${accessToken}` },
              }
            );
          } catch (mErr) {
            console.warn("Parent folder assignment notice:", mErr);
          }
        }
      }

      // 3. Ensure required tabs exist if using an existing spreadsheet or fallback file
      const getSheetMetaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      let existingSheets: any[] = [];
      if (getSheetMetaRes.ok) {
        const metaData = await getSheetMetaRes.json();
        existingSheets = metaData.sheets || [];
      }

      const existingTitles = existingSheets.map((s) => s.properties?.title);
      const requiredTabs = ["สรุปข้อมูลโครงการ", "ตรวจสภาพโครงสร้าง", "แปลนและผังกริด", "คลังรูปภาพสำรวจ"];
      const tabRequests: any[] = [];

      // If tab 0 exists with default title like "Sheet1" or "ชีต1", rename it to "สรุปข้อมูลโครงการ"
      if (existingSheets.length > 0 && !existingTitles.includes("สรุปข้อมูลโครงการ")) {
        const firstSheetId = existingSheets[0].properties?.sheetId ?? 0;
        tabRequests.push({
          updateSheetProperties: {
            properties: { sheetId: firstSheetId, title: "สรุปข้อมูลโครงการ" },
            fields: "title",
          },
        });
      }

      // Add missing tabs
      for (const reqTab of requiredTabs) {
        if (reqTab === "สรุปข้อมูลโครงการ" && (existingTitles.includes("สรุปข้อมูลโครงการ") || tabRequests.length > 0)) {
          continue;
        }
        if (!existingTitles.includes(reqTab)) {
          tabRequests.push({ addSheet: { properties: { title: reqTab } } });
        }
      }

      if (tabRequests.length > 0) {
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ requests: tabRequests }),
        });
      }

      // 4. Prepare data for each tab
      // Sheet 1: สรุปข้อมูลโครงการ
      const latVal = typeof project?.gps?.lat === "number" ? project.gps.lat.toFixed(6) : "-";
      const lngVal = typeof project?.gps?.lng === "number" ? project.gps.lng.toFixed(6) : "-";
      const gpsStr = (latVal !== "-" && lngVal !== "-") ? `${latVal}, ${lngVal}` : "-";

      const sheet1Values = [
        ["รายงานผลการสำรวจและประเมินสภาพอาคาร (Building Structural Survey Report)"],
        [""],
        ["ข้อมูลทั่วไปของโครงการ / อาคาร"],
        ["ชื่ออาคาร / โครงการ", String(project?.name || "-")],
        ["ประเภทโครงสร้าง", String(project?.buildingType || "-")],
        ["จำนวนชั้น", `${project?.floorCount || 1} ชั้น`],
        ["ความสูงฝ้าเพดาน (เมตร)", `${floorPlan?.ceilingHeight ?? project?.defaultCeilingHeight ?? 2.8} m`],
        ["พื้นที่รวมโดยประมาณ", `${project?.totalAreaSqM || 0} ตร.ม.`],
        ["สถานที่ / ที่อยู่", String(project?.address || "-")],
        ["พิกัด GPS สถานที่ (Lat, Lng)", gpsStr],
        ["ผู้สำรวจวิศวกรรม", String(project?.surveyorName || "-")],
        ["วันที่สำรวจภาคสนาม", String(project?.surveyDate || "-")],
        ["สถานะการสำรวจ", project?.status === "completed" ? "สำรวจเสร็จสิ้น" : "อยู่ระหว่างดำเนินการ"],
        ["หมายเหตุการสำรวจ", String(project?.notes || "-")],
        [""],
        ["ระบบสารสนเทศสร้างโดยระบบ AI Structural Survey & CAD Platform"],
      ];

      // Sheet 2: ตรวจสภาพโครงสร้าง
      const elementLabels: Record<string, string> = {
        foundation: "ฐานราก (Foundation)",
        columns: "เสาโครงสร้าง (Columns)",
        beams: "คานโครงสร้าง (Beams)",
        slabs: "พื้นอาคาร (Slabs)",
        walls: "ผนังรับแรง/ผนังก่ออิฐ (Walls)",
        roof: "โครงหลังคา/หลังคา (Roof Structure)",
      };

      const getRatingStatus = (r: number) => {
        if (r >= 5) return "สมบูรณ์ดีมาก (Excellent)";
        if (r >= 4) return "ดี (Good)";
        if (r >= 3) return "พอใช้/เสื่อมสภาพตามอายุ (Fair)";
        if (r >= 2) return "ชำรุดปานกลาง (Moderate Defects)";
        return "ชำรุดวิกฤต/ต้องซ่อมแซมด่วน (Critical)";
      };

      const sheet2Values = [
        ["ผลการตรวจสภาพโครงสร้างแยกตามองค์อาคาร (Structural Element Audit)"],
        [""],
        ["องค์อาคารโครงสร้าง", "คะแนนประเมิน (1-5)", "สถานะความปลอดภัย", "รายการชำรุด/รอยแตกร้าวที่พบ", "ข้อสังเกตและหมายเหตุเพิ่มเติม"],
        ...Object.entries(structuralData || {}).map(([key, item]: [string, any]) => {
          const ratingNum = typeof item?.rating === "number" ? item.rating : 3;
          const defectsArr = Array.isArray(item?.defects) ? item.defects : [];
          return [
            elementLabels[key] || String(key),
            `${ratingNum} / 5`,
            getRatingStatus(ratingNum),
            defectsArr.length > 0 ? defectsArr.join(", ") : "ไม่พบรายการชำรุดรุนแรง",
            String(item?.notes || "-"),
          ];
        }),
      ];

      // Sheet 3: แปลนและผังกริด
      const gridX = Array.isArray(floorPlan?.gridX) ? floorPlan.gridX : [];
      const gridY = Array.isArray(floorPlan?.gridY) ? floorPlan.gridY : [];
      const sortedX = [...gridX].sort((a: any, b: any) => (Number(a?.positionMeters) || 0) - (Number(b?.positionMeters) || 0));
      const sortedY = [...gridY].sort((a: any, b: any) => (Number(a?.positionMeters) || 0) - (Number(b?.positionMeters) || 0));

      const sheet3Values = [
        ["ข้อมูลการออกแบบผังกริดและองค์อาคารบนแปลน CAD (Grid & Plan Layout)"],
        [""],
        ["[รายการกริดลายแนวตั้ง (Axis X)]"],
        ["ชื่อกริด", "ระยะจากจุดอ้างอิง (เมตร)", "ระยะห่างจากกริดก่อนหน้า (เมตร)"],
        ...sortedX.map((gx: any, idx: number) => {
          const posX = Number(gx?.positionMeters) || 0;
          const prevPos = idx === 0 ? 0 : (Number(sortedX[idx - 1]?.positionMeters) || 0);
          const span = Math.round((posX - prevPos) * 100) / 100;
          return [String(gx?.label || `X${idx + 1}`), `${posX.toFixed(2)} m`, idx === 0 ? "-" : `${span.toFixed(2)} m`];
        }),
        [""],
        ["[รายการกริดลายแนวนอน (Axis Y)]"],
        ["ชื่อกริด", "ระยะจากจุดอ้างอิง (เมตร)", "ระยะห่างจากกริดก่อนหน้า (เมตร)"],
        ...sortedY.map((gy: any, idx: number) => {
          const posY = Number(gy?.positionMeters) || 0;
          const prevPos = idx === 0 ? 0 : (Number(sortedY[idx - 1]?.positionMeters) || 0);
          const span = Math.round((posY - prevPos) * 100) / 100;
          return [String(gy?.label || `Y${idx + 1}`), `${posY.toFixed(2)} m`, idx === 0 ? "-" : `${span.toFixed(2)} m`];
        }),
        [""],
        ["[สรุปจำนวนองค์อาคารในแปลน]"],
        ["รายการองค์อาคาร", "จำนวนที่ติดตั้ง"],
        ["เสาโครงสร้าง (Columns)", `${Array.isArray(floorPlan?.columns) ? floorPlan.columns.length : 0} ต้น`],
        ["ผนัง (Walls)", `${Array.isArray(floorPlan?.walls) ? floorPlan.walls.length : 0} ช่วง`],
        ["ประตู / หน้าต่าง (Openings)", `${Array.isArray(floorPlan?.openings) ? floorPlan.openings.length : 0} ช่อง`],
        ["พินระบุจุดความเสียหาย (Defect Pins)", `${Array.isArray(floorPlan?.defectPins) ? floorPlan.defectPins.length : 0} จุด`],
      ];

      // Sheet 4: คลังรูปภาพสำรวจ
      const photoList = Array.isArray(photos) ? photos : [];
      const sheet4Values = [
        ["รายการรูปภาพถ่ายสำรวจสภาพอาคาร (Inspection Photo Gallery)"],
        [""],
        ["ลำดับ", "หัวข้อรูปภาพ", "หมวดหมู่", "ระดับความรุนแรง", "วันที่-เวลาถ่ายภาพ", "หมายเหตุรูปภาพ", "URL รูปภาพ"],
        ...photoList.map((p: any, idx: number) => [
          idx + 1,
          String(p?.title || "-"),
          String(p?.category || "-"),
          p?.defectSeverity === "critical" ? "วิกฤต (Critical)" : p?.defectSeverity === "moderate" ? "ปานกลาง (Moderate)" : "เล็กน้อย (Minor)",
          String(p?.timestamp || "-"),
          String(p?.notes || "-"),
          typeof p?.url === "string" && p.url.startsWith("data:") ? "[รูปภาพแนบในระบบ]" : String(p?.url || "-"),
        ]),
      ];

      // 5. Write All Values using batchUpdate
      const batchValuesRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate?valueInputOption=USER_ENTERED`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            valueInputOption: "USER_ENTERED",
            data: [
              { range: "'สรุปข้อมูลโครงการ'!A1", majorDimension: "ROWS", values: sheet1Values },
              { range: "'ตรวจสภาพโครงสร้าง'!A1", majorDimension: "ROWS", values: sheet2Values },
              { range: "'แปลนและผังกริด'!A1", majorDimension: "ROWS", values: sheet3Values },
              { range: "'คลังรูปภาพสำรวจ'!A1", majorDimension: "ROWS", values: sheet4Values },
            ],
          }),
        }
      );

      if (!batchValuesRes.ok) {
        const batchErr = await batchValuesRes.json().catch(() => ({}));
        console.error("Batch update values error:", JSON.stringify(batchErr));
        throw new Error(`ไม่สามารถเขียนข้อมูลลง Google Sheets: ${batchErr.error?.message || batchErr.message || JSON.stringify(batchErr)}`);
      }

      // 6. Header Styling
      try {
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requests: [
              {
                repeatCell: {
                  range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 2 },
                  cell: {
                    userEnteredFormat: {
                      backgroundColor: { red: 0.06, green: 0.32, blue: 0.20 },
                      textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 13, bold: true },
                    },
                  },
                  fields: "userEnteredFormat(backgroundColor,textFormat)",
                },
              },
            ],
          }),
        });
      } catch (styleErr) {
        console.warn("Sheet style warning:", styleErr);
      }

      const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
      return res.json({ success: true, spreadsheetId, spreadsheetUrl });
    } catch (err: any) {
      console.error("Sheets export error:", err);
      return res.status(500).json({
        error: "EXPORT_FAILED",
        message: err.message || "เกิดข้อผิดพลาดในการส่งออก Google Sheets บนเซิร์ฟเวอร์",
      });
    }
  });

  // Endpoint to list files saved in Google Drive target folder
  app.get("/api/drive/files", async (req, res) => {
    try {
      const accessToken = req.query.accessToken as string;
      if (!accessToken) {
        return res.status(401).json({ error: "UNAUTHORIZED", message: "ไม่พบ Access Token" });
      }

      const TARGET_DRIVE_FOLDER_ID = "15ujc2vDkOVmd4Hajn796LGKfAXeXc_28";
      const q = `'${TARGET_DRIVE_FOLDER_ID}' in parents and trashed = false`;
      const driveUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,createdTime,modifiedTime,webViewLink)&orderBy=createdTime+desc`;

      const response = await fetch(driveUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        return res.status(response.status).json({
          error: "DRIVE_FETCH_FAILED",
          message: errJson.error?.message || "ไม่สามารถดึงข้อมูลไฟล์จาก Google Drive ได้",
        });
      }

      const data = await response.json();
      return res.json({ success: true, files: data.files || [] });
    } catch (err: any) {
      console.error("Drive list error:", err);
      return res.status(500).json({ error: "SERVER_ERROR", message: err.message });
    }
  });

  // Endpoint to read values from a Google Sheet for preview in app
  app.get("/api/sheets/read", async (req, res) => {
    try {
      const accessToken = req.query.accessToken as string;
      const spreadsheetId = req.query.spreadsheetId as string;
      if (!accessToken || !spreadsheetId) {
        return res.status(400).json({ error: "BAD_REQUEST", message: "ขาด accessToken หรือ spreadsheetId" });
      }

      const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'สรุปข้อมูลโครงการ'!A1:B20`;
      const response = await fetch(sheetsUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        return res.status(response.status).json({
          error: "SHEETS_READ_FAILED",
          message: errJson.error?.message || "ไม่สามารถอ่านข้อมูลจาก Google Sheet ได้",
        });
      }

      const data = await response.json();
      return res.json({ success: true, values: data.values || [] });
    } catch (err: any) {
      console.error("Sheets read error:", err);
      return res.status(500).json({ error: "SERVER_ERROR", message: err.message });
    }
  });

  // Vite development vs production serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
