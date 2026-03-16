/**
 * SOAR.AI — Blueprint RAG (Retrieval-Augmented Generation) System
 * ================================================================
 * نظام استرجاع المخططات الحقيقية لتحسين توليد المخططات الجديدة
 *
 * كيف يعمل:
 * 1. عند طلب مخطط جديد، يبحث النظام في قاعدة بيانات المخططات الحقيقية
 * 2. يجد أقرب مخطط مشابه (بناءً على المساحة، عدد الغرف، الطوابق)
 * 3. يستخدم هذا المخطط كـ "context" للـ AI لتوليد مخطط مشابه
 * 4. النتيجة: مخططات أكثر واقعية وقابلية للتنفيذ
 */

import { REAL_BLUEPRINT_REFERENCE } from "./saudiArchRules";

// ─── أنواع البيانات ───────────────────────────────────────────────────────────

export interface BlueprintTemplate {
  id: string;
  name: string;
  nameAr: string;
  landArea: number;
  landWidth: number;
  landLength: number;
  floors: number;
  bedrooms: number;
  bathrooms: number;
  hasMajlis: boolean;
  hasParking: boolean;
  style: string;
  source: string;
  groundFloor: RoomData[];
  upperFloors: { floor: number; rooms: RoomData[] }[];
  tags: string[];
}

export interface RoomData {
  type: string;
  nameAr: string;
  nameEn: string;
  width: number;
  length: number;
  area: number;
  x: number;
  y: number;
  side: string;
  hasWindow?: boolean;
  doorWall?: string;
}

export interface RAGSearchParams {
  landArea: number;
  landWidth?: number;
  landLength?: number;
  floors: number;
  bedrooms: number;
  bathrooms: number;
  hasMajlis: boolean;
  hasParking: boolean;
}

export interface RAGResult {
  template: BlueprintTemplate;
  similarity: number;
  scaleFactor: number;
  notes: string;
}

// ─── قاعدة بيانات المخططات الحقيقية ─────────────────────────────────────────
// هذه المخططات مستخرجة من مخططات سعودية حقيقية وتُستخدم كمرجع للـ AI

const BLUEPRINT_DATABASE: BlueprintTemplate[] = [

  // ── المخطط 1: فيلا سعودية 10.5×22م (المرجع الأساسي) ──────────────────────
  {
    id: "villa_10x22_2floors",
    name: "Saudi Villa 10.5×22m - 2 Floors",
    nameAr: "فيلا سعودية 10.5×22م - دورين",
    landArea: 231,
    landWidth: 10.5,
    landLength: 22.0,
    floors: 2,
    bedrooms: 6,
    bathrooms: 4,
    hasMajlis: true,
    hasParking: false,
    style: "Traditional Saudi",
    source: "mostaql.com - Verified Blueprint",
    tags: ["traditional", "medium", "2floors", "majlis"],
    groundFloor: REAL_BLUEPRINT_REFERENCE.groundFloor.rooms as RoomData[],
    upperFloors: [
      { floor: 1, rooms: REAL_BLUEPRINT_REFERENCE.firstFloor.rooms as RoomData[] }
    ],
  },

  // ── المخطط 2: فيلا صغيرة 8×15م - دور واحد ────────────────────────────────
  {
    id: "villa_8x15_1floor",
    name: "Small Saudi Villa 8×15m - 1 Floor",
    nameAr: "فيلا سعودية صغيرة 8×15م - دور واحد",
    landArea: 120,
    landWidth: 8.0,
    landLength: 15.0,
    floors: 1,
    bedrooms: 3,
    bathrooms: 2,
    hasMajlis: true,
    hasParking: true,
    style: "Modern Compact",
    source: "Saudi Architectural Standards",
    tags: ["compact", "small", "1floor", "majlis"],
    groundFloor: [
      { type: "entrance_hall", nameAr: "بهو المدخل", nameEn: "Entrance Hall", width: 4.0, length: 1.5, area: 6.0, x: 0.0, y: 0.0, side: "north" },
      { type: "majlis", nameAr: "مجلس رجال", nameEn: "Men's Majlis", width: 5.5, length: 3.8, area: 20.9, x: 0.0, y: 1.5, side: "north-west" },
      { type: "staircase", nameAr: "درج", nameEn: "Staircase", width: 2.5, length: 4.5, area: 11.3, x: 5.5, y: 0.0, side: "north-east" },
      { type: "distributor", nameAr: "موزع", nameEn: "Distributor", width: 2.0, length: 3.0, area: 6.0, x: 4.0, y: 4.0, side: "center" },
      { type: "family_hall", nameAr: "صالة عائلية", nameEn: "Family Hall", width: 4.5, length: 4.0, area: 18.0, x: 0.0, y: 5.5, side: "west" },
      { type: "kitchen", nameAr: "مطبخ", nameEn: "Kitchen", width: 3.0, length: 3.5, area: 10.5, x: 5.0, y: 5.5, side: "east" },
      { type: "bathroom", nameAr: "حمام", nameEn: "Bathroom", width: 2.5, length: 1.5, area: 3.75, x: 5.0, y: 9.0, side: "east" },
      { type: "toilet", nameAr: "دورة مياه", nameEn: "Toilet", width: 1.2, length: 1.2, area: 1.44, x: 4.0, y: 7.0, side: "center" },
      { type: "master_bedroom", nameAr: "غرفة نوم ماستر", nameEn: "Master Bedroom", width: 4.0, length: 3.5, area: 14.0, x: 0.0, y: 10.0, side: "south-west" },
      { type: "bedroom", nameAr: "غرفة نوم 1", nameEn: "Bedroom 1", width: 3.0, length: 3.5, area: 10.5, x: 4.0, y: 10.0, side: "south-east" },
      { type: "bedroom", nameAr: "غرفة نوم 2", nameEn: "Bedroom 2", width: 3.5, length: 3.5, area: 12.25, x: 0.0, y: 13.5, side: "south" },
      { type: "parking", nameAr: "موقف سيارة", nameEn: "Parking", width: 3.0, length: 5.5, area: 16.5, x: 5.0, y: 0.0, side: "north-east" },
    ],
    upperFloors: [],
  },

  // ── المخطط 3: فيلا كبيرة 15×25م - 3 أدوار ────────────────────────────────
  {
    id: "villa_15x25_3floors",
    name: "Large Saudi Villa 15×25m - 3 Floors",
    nameAr: "فيلا سعودية كبيرة 15×25م - 3 أدوار",
    landArea: 375,
    landWidth: 15.0,
    landLength: 25.0,
    floors: 3,
    bedrooms: 8,
    bathrooms: 6,
    hasMajlis: true,
    hasParking: true,
    style: "Contemporary Luxury",
    source: "Saudi Architectural Standards",
    tags: ["luxury", "large", "3floors", "majlis", "parking"],
    groundFloor: [
      { type: "entrance_hall", nameAr: "بهو المدخل", nameEn: "Entrance Hall", width: 7.0, length: 2.5, area: 17.5, x: 0.0, y: 0.0, side: "north" },
      { type: "majlis", nameAr: "مجلس رجال", nameEn: "Men's Majlis", width: 9.0, length: 5.0, area: 45.0, x: 0.0, y: 2.5, side: "north-west" },
      { type: "staircase", nameAr: "درج", nameEn: "Staircase", width: 3.0, length: 7.0, area: 21.0, x: 12.0, y: 0.0, side: "north-east" },
      { type: "distributor", nameAr: "موزع", nameEn: "Distributor", width: 3.0, length: 4.0, area: 12.0, x: 9.0, y: 5.0, side: "center" },
      { type: "family_hall", nameAr: "صالة عائلية", nameEn: "Family Hall", width: 7.0, length: 6.0, area: 42.0, x: 0.0, y: 8.0, side: "west" },
      { type: "kitchen", nameAr: "مطبخ", nameEn: "Kitchen", width: 4.0, length: 5.0, area: 20.0, x: 9.0, y: 8.0, side: "east" },
      { type: "dining", nameAr: "غرفة طعام", nameEn: "Dining Room", width: 5.0, length: 4.0, area: 20.0, x: 9.0, y: 13.0, side: "east" },
      { type: "bathroom", nameAr: "حمام", nameEn: "Bathroom", width: 3.5, length: 2.0, area: 7.0, x: 9.0, y: 17.0, side: "east" },
      { type: "toilet", nameAr: "دورة مياه", nameEn: "Toilet", width: 1.5, length: 1.5, area: 2.25, x: 7.0, y: 7.0, side: "center" },
      { type: "maid_room", nameAr: "غرفة خادمة", nameEn: "Maid Room", width: 3.5, length: 2.5, area: 8.75, x: 9.0, y: 19.0, side: "east" },
      { type: "storage", nameAr: "مخزن", nameEn: "Storage", width: 2.5, length: 3.0, area: 7.5, x: 0.0, y: 14.0, side: "west" },
      { type: "master_bedroom", nameAr: "غرفة نوم ماستر", nameEn: "Master Bedroom", width: 5.5, length: 4.5, area: 24.75, x: 0.0, y: 18.0, side: "south-west" },
      { type: "bedroom", nameAr: "غرفة نوم 1", nameEn: "Bedroom 1", width: 4.0, length: 4.0, area: 16.0, x: 0.0, y: 14.0, side: "west" },
      { type: "parking", nameAr: "موقف سيارة", nameEn: "Parking", width: 6.0, length: 6.5, area: 39.0, x: 9.0, y: 0.0, side: "north-east" },
    ],
    upperFloors: [
      {
        floor: 1,
        rooms: [
          { type: "balcony", nameAr: "بلكونة", nameEn: "Balcony", width: 7.0, length: 2.0, area: 14.0, x: 0.0, y: 0.0, side: "north" },
          { type: "majlis", nameAr: "مجلس رجال", nameEn: "Men's Majlis", width: 9.0, length: 4.5, area: 40.5, x: 0.0, y: 2.0, side: "north-west" },
          { type: "staircase", nameAr: "درج", nameEn: "Staircase", width: 3.0, length: 7.0, area: 21.0, x: 12.0, y: 0.0, side: "north-east" },
          { type: "family_living", nameAr: "صالة عائلية", nameEn: "Family Living", width: 5.5, length: 4.5, area: 24.75, x: 0.0, y: 7.0, side: "west" },
          { type: "master_bedroom", nameAr: "غرفة نوم ماستر", nameEn: "Master Bedroom", width: 5.5, length: 4.5, area: 24.75, x: 0.0, y: 12.0, side: "west" },
          { type: "bathroom", nameAr: "حمام ماستر", nameEn: "Master Bathroom", width: 2.5, length: 2.5, area: 6.25, x: 0.0, y: 16.5, side: "west" },
          { type: "bedroom", nameAr: "غرفة نوم 1", nameEn: "Bedroom 1", width: 4.0, length: 4.0, area: 16.0, x: 6.0, y: 9.0, side: "center" },
          { type: "bedroom", nameAr: "غرفة نوم 2", nameEn: "Bedroom 2", width: 4.0, length: 4.0, area: 16.0, x: 6.0, y: 13.0, side: "center" },
          { type: "bedroom", nameAr: "غرفة نوم 3", nameEn: "Bedroom 3", width: 5.0, length: 5.0, area: 25.0, x: 0.0, y: 19.0, side: "south-west" },
          { type: "kitchen", nameAr: "مطبخ", nameEn: "Kitchen", width: 3.5, length: 4.5, area: 15.75, x: 9.0, y: 9.0, side: "east" },
          { type: "dining", nameAr: "غرفة طعام", nameEn: "Dining Room", width: 5.0, length: 3.5, area: 17.5, x: 9.0, y: 14.0, side: "east" },
          { type: "bathroom", nameAr: "حمام", nameEn: "Bathroom", width: 2.5, length: 2.0, area: 5.0, x: 9.0, y: 18.0, side: "east" },
          { type: "distributor", nameAr: "موزع", nameEn: "Distributor", width: 3.0, length: 5.0, area: 15.0, x: 9.0, y: 7.0, side: "center" },
          { type: "balcony", nameAr: "بلكونة 2", nameEn: "Balcony 2", width: 6.0, length: 1.5, area: 9.0, x: 0.0, y: 24.0, side: "south" },
        ]
      }
    ],
  },

  // ── المخطط 4: شقة سكنية 12×18م - دور واحد ────────────────────────────────
  {
    id: "apartment_12x18_1floor",
    name: "Saudi Apartment 12×18m - 1 Floor",
    nameAr: "شقة سكنية 12×18م - دور واحد",
    landArea: 216,
    landWidth: 12.0,
    landLength: 18.0,
    floors: 1,
    bedrooms: 4,
    bathrooms: 3,
    hasMajlis: false,
    hasParking: false,
    style: "Modern Apartment",
    source: "Saudi Architectural Standards",
    tags: ["apartment", "medium", "1floor"],
    groundFloor: [
      { type: "entrance_hall", nameAr: "مدخل", nameEn: "Entrance", width: 5.0, length: 1.8, area: 9.0, x: 0.0, y: 0.0, side: "north" },
      { type: "living", nameAr: "صالة", nameEn: "Living Room", width: 6.0, length: 5.0, area: 30.0, x: 0.0, y: 1.8, side: "north-west" },
      { type: "dining", nameAr: "غرفة طعام", nameEn: "Dining Room", width: 4.0, length: 3.5, area: 14.0, x: 6.0, y: 1.8, side: "north-east" },
      { type: "kitchen", nameAr: "مطبخ", nameEn: "Kitchen", width: 3.5, length: 4.0, area: 14.0, x: 8.5, y: 1.8, side: "east" },
      { type: "master_bedroom", nameAr: "غرفة نوم ماستر", nameEn: "Master Bedroom", width: 4.5, length: 4.0, area: 18.0, x: 0.0, y: 8.0, side: "west" },
      { type: "bathroom", nameAr: "حمام ماستر", nameEn: "Master Bathroom", width: 2.0, length: 2.0, area: 4.0, x: 0.0, y: 12.0, side: "west" },
      { type: "bedroom", nameAr: "غرفة نوم 1", nameEn: "Bedroom 1", width: 3.5, length: 3.8, area: 13.3, x: 5.0, y: 8.0, side: "center" },
      { type: "bedroom", nameAr: "غرفة نوم 2", nameEn: "Bedroom 2", width: 3.5, length: 3.8, area: 13.3, x: 8.5, y: 8.0, side: "east" },
      { type: "bedroom", nameAr: "غرفة نوم 3", nameEn: "Bedroom 3", width: 4.0, length: 4.0, area: 16.0, x: 5.0, y: 12.0, side: "south" },
      { type: "bathroom", nameAr: "حمام 1", nameEn: "Bathroom 1", width: 2.5, length: 1.8, area: 4.5, x: 5.0, y: 6.2, side: "center" },
      { type: "bathroom", nameAr: "حمام 2", nameEn: "Bathroom 2", width: 2.5, length: 1.8, area: 4.5, x: 9.5, y: 12.0, side: "east" },
      { type: "distributor", nameAr: "ممر", nameEn: "Corridor", width: 1.5, length: 8.0, area: 12.0, x: 5.0, y: 0.0, side: "center" },
    ],
    upperFloors: [],
  },
];

// ─── دالة البحث عن أقرب مخطط مشابه ──────────────────────────────────────────

export function findSimilarBlueprint(params: RAGSearchParams): RAGResult {
  let bestMatch = BLUEPRINT_DATABASE[0];
  let bestScore = 0;

  for (const template of BLUEPRINT_DATABASE) {
    let score = 0;

    // تشابه المساحة (40% من الدرجة)
    const areaDiff = Math.abs(template.landArea - params.landArea) / params.landArea;
    score += Math.max(0, 1 - areaDiff) * 40;

    // تشابه عدد الطوابق (25% من الدرجة)
    if (template.floors === params.floors) score += 25;
    else if (Math.abs(template.floors - params.floors) === 1) score += 12;

    // تشابه عدد غرف النوم (20% من الدرجة)
    const bedroomDiff = Math.abs(template.bedrooms - params.bedrooms);
    score += Math.max(0, 20 - bedroomDiff * 5);

    // وجود مجلس (10% من الدرجة)
    if (template.hasMajlis === params.hasMajlis) score += 10;

    // وجود موقف (5% من الدرجة)
    if (template.hasParking === params.hasParking) score += 5;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = template;
    }
  }

  // حساب معامل التحجيم
  const scaleFactor = params.landArea / bestMatch.landArea;

  return {
    template: bestMatch,
    similarity: Math.round(bestScore),
    scaleFactor,
    notes: `Found ${bestScore}% similar blueprint. Scale factor: ${scaleFactor.toFixed(2)}x`,
  };
}

// ─── دالة توليد سياق RAG للـ Prompt ──────────────────────────────────────────

export function generateRAGContext(params: RAGSearchParams): string {
  const result = findSimilarBlueprint(params);
  const { template, scaleFactor } = result;

  const scaleRoom = (room: RoomData) => ({
    ...room,
    width: parseFloat((room.width * Math.sqrt(scaleFactor)).toFixed(2)),
    length: parseFloat((room.length * Math.sqrt(scaleFactor)).toFixed(2)),
    area: parseFloat((room.area * scaleFactor).toFixed(1)),
    x: parseFloat((room.x * Math.sqrt(scaleFactor)).toFixed(2)),
    y: parseFloat((room.y * Math.sqrt(scaleFactor)).toFixed(2)),
  });

  const groundRooms = template.groundFloor.map(scaleRoom);
  const upperRooms = template.upperFloors.flatMap(f => f.rooms.map(scaleRoom));

  let context = `\nRAG REFERENCE (${result.similarity}% match - ${template.nameAr}):
Original: ${template.landWidth}m × ${template.landLength}m = ${template.landArea}m²
Target: ~${params.landWidth ?? Math.sqrt(params.landArea * 0.5).toFixed(1)}m × ${params.landLength ?? (params.landArea / Math.sqrt(params.landArea * 0.5)).toFixed(1)}m = ${params.landArea}m²
Scale factor: ${scaleFactor.toFixed(2)}x

SCALED GROUND FLOOR ROOMS (adjust to fit your land):
`;

  for (const room of groundRooms) {
    context += `  • ${room.nameAr} (${room.nameEn}): ${room.width}m × ${room.length}m = ${room.area}m² @ pos(${room.x}, ${room.y})\n`;
  }

  if (upperRooms.length > 0) {
    context += `\nSCALED UPPER FLOOR ROOMS:\n`;
    for (const room of upperRooms) {
      context += `  • ${room.nameAr} (${room.nameEn}): ${room.width}m × ${room.length}m = ${room.area}m² @ pos(${room.x}, ${room.y})\n`;
    }
  }

  return context;
}

// ─── دالة إضافة مخطط جديد لقاعدة البيانات ───────────────────────────────────
// تُستخدم لإضافة مخططات حقيقية جديدة عند توفرها

export function addBlueprintToDatabase(blueprint: BlueprintTemplate): void {
  BLUEPRINT_DATABASE.push(blueprint);
}

export function getBlueprintDatabase(): BlueprintTemplate[] {
  return BLUEPRINT_DATABASE;
}

export { BLUEPRINT_DATABASE };
