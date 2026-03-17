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

  // ── المخطط 5: فيلا حي الريان - الرياض (نوع A/B) ─────────────────────────
  {
    id: "riyan_villa_ab_2floors",
    name: "Riyan District Villa A/B - Riyadh",
    nameAr: "فيلا حي الريان - الرياض (نوع أ/ب)",
    landArea: 315,
    landWidth: 13.0,
    landLength: 24.0,
    floors: 2,
    bedrooms: 4,
    bathrooms: 6,
    hasMajlis: true,
    hasParking: true,
    style: "Contemporary Saudi",
    source: "Riyan District Riyadh - Verified Project",
    tags: ["contemporary", "large", "2floors", "majlis", "parking", "riyadh"],
    groundFloor: [
      { type: "majlis", nameAr: "مجلس رجال", nameEn: "Men's Majlis", width: 5.50, length: 4.05, area: 22.3, x: 0.0, y: 0.0, side: "north-west" },
      { type: "entrance_hall", nameAr: "مدخل", nameEn: "Entrance", width: 3.15, length: 2.50, area: 7.9, x: 5.50, y: 0.0, side: "north" },
      { type: "toilet", nameAr: "دورة مياه ضيوف", nameEn: "Guest WC", width: 1.65, length: 1.20, area: 2.0, x: 0.0, y: 4.05, side: "west" },
      { type: "toilet", nameAr: "مغسلة ضيوف", nameEn: "Guest Powder Room", width: 1.65, length: 1.20, area: 2.0, x: 1.65, y: 4.05, side: "west" },
      { type: "dining", nameAr: "منطقة طعام", nameEn: "Dining Area", width: 4.95, length: 4.50, area: 22.3, x: 0.0, y: 5.25, side: "west" },
      { type: "family_hall", nameAr: "منطقة معيشة", nameEn: "Living Area", width: 4.95, length: 4.50, area: 22.3, x: 5.50, y: 2.50, side: "center" },
      { type: "toilet", nameAr: "دورة مياه عائلة", nameEn: "Family WC", width: 1.65, length: 1.20, area: 2.0, x: 0.0, y: 9.75, side: "west" },
      { type: "toilet", nameAr: "مغسلة عائلة", nameEn: "Family Powder Room", width: 1.65, length: 1.20, area: 2.0, x: 1.65, y: 9.75, side: "west" },
      { type: "kitchen", nameAr: "مطبخ خارجي", nameEn: "Clean Kitchen", width: 2.65, length: 3.15, area: 8.3, x: 0.0, y: 10.95, side: "south-west" },
      { type: "kitchen", nameAr: "مطبخ داخلي", nameEn: "Dirty Kitchen", width: 4.50, length: 3.00, area: 13.5, x: 3.30, y: 10.95, side: "south" },
      { type: "parking", nameAr: "موقف سيارة", nameEn: "Parking", width: 6.00, length: 5.50, area: 33.0, x: 7.00, y: 0.0, side: "north-east" },
      { type: "staircase", nameAr: "درج", nameEn: "Staircase", width: 3.00, length: 5.50, area: 16.5, x: 10.00, y: 5.50, side: "east" },
    ],
    upperFloors: [
      {
        floor: 1,
        rooms: [
          { type: "master_bedroom", nameAr: "غرفة نوم رئيسية", nameEn: "Master Bedroom", width: 4.60, length: 4.00, area: 18.4, x: 0.0, y: 0.0, side: "north-west" },
          { type: "wardrobe", nameAr: "غرفة ملابس رئيسية", nameEn: "Master Walk-in Closet", width: 2.65, length: 4.00, area: 10.6, x: 4.60, y: 0.0, side: "north" },
          { type: "bathroom", nameAr: "دورة مياه رئيسية", nameEn: "Master WC", width: 1.75, length: 4.00, area: 7.0, x: 7.25, y: 0.0, side: "north-east" },
          { type: "bedroom", nameAr: "غرفة نوم 1", nameEn: "Bedroom 1", width: 4.20, length: 4.00, area: 16.8, x: 0.0, y: 4.00, side: "west" },
          { type: "bathroom", nameAr: "دورة مياه 1", nameEn: "WC 1", width: 1.65, length: 2.45, area: 4.0, x: 4.20, y: 4.00, side: "center" },
          { type: "bedroom", nameAr: "غرفة نوم 2", nameEn: "Bedroom 2", width: 4.00, length: 4.00, area: 16.0, x: 0.0, y: 8.00, side: "west" },
          { type: "bedroom", nameAr: "غرفة نوم 3", nameEn: "Bedroom 3", width: 4.30, length: 4.00, area: 17.2, x: 4.50, y: 8.00, side: "east" },
          { type: "bathroom", nameAr: "دورة مياه 2", nameEn: "WC 2", width: 1.65, length: 2.45, area: 4.0, x: 8.80, y: 8.00, side: "east" },
          { type: "staircase", nameAr: "درج", nameEn: "Staircase", width: 3.00, length: 5.50, area: 16.5, x: 10.00, y: 0.0, side: "east" },
          { type: "distributor", nameAr: "ممر", nameEn: "Corridor", width: 2.00, length: 8.00, area: 16.0, x: 4.20, y: 0.0, side: "center" },
        ]
      },
      {
        floor: 2,
        rooms: [
          { type: "maid_room", nameAr: "غرفة خادمة", nameEn: "Maid's Room", width: 3.60, length: 2.20, area: 7.9, x: 0.0, y: 0.0, side: "north-west" },
          { type: "bathroom", nameAr: "دورة مياه خادمة", nameEn: "Maid's WC", width: 1.55, length: 1.50, area: 2.3, x: 3.60, y: 0.0, side: "north" },
          { type: "laundry", nameAr: "غرفة غسيل", nameEn: "Laundry Room", width: 2.80, length: 1.50, area: 4.2, x: 0.0, y: 2.20, side: "west" },
        ]
      }
    ],
  },

  // ── المخطط 6: فيلا حي الريان - الرياض (نوع C مع ديوانية) ──────────────────
  {
    id: "riyan_villa_c_2floors",
    name: "Riyan District Villa C - Riyadh (with Diwaniya)",
    nameAr: "فيلا حي الريان - الرياض (نوع ج مع ديوانية)",
    landArea: 263,
    landWidth: 11.0,
    landLength: 24.0,
    floors: 2,
    bedrooms: 4,
    bathrooms: 6,
    hasMajlis: true,
    hasParking: true,
    style: "Contemporary Saudi with Diwaniya",
    source: "Riyan District Riyadh - Verified Project",
    tags: ["contemporary", "medium", "2floors", "majlis", "diwaniya", "parking", "riyadh"],
    groundFloor: [
      { type: "diwaniya", nameAr: "ديوانية", nameEn: "Diwaniya", width: 5.15, length: 4.00, area: 20.6, x: 0.0, y: 0.0, side: "north-west" },
      { type: "majlis", nameAr: "مجلس رجال", nameEn: "Men's Majlis", width: 5.50, length: 4.05, area: 22.3, x: 0.0, y: 4.00, side: "west" },
      { type: "entrance_hall", nameAr: "مدخل", nameEn: "Entrance", width: 3.15, length: 2.00, area: 6.3, x: 5.50, y: 0.0, side: "north" },
      { type: "toilet", nameAr: "دورة مياه ضيوف", nameEn: "Guest WC", width: 1.75, length: 1.20, area: 2.1, x: 0.0, y: 8.05, side: "west" },
      { type: "toilet", nameAr: "مغسلة ضيوف", nameEn: "Guest Powder Room", width: 1.75, length: 1.75, area: 3.1, x: 1.75, y: 8.05, side: "west" },
      { type: "dining", nameAr: "منطقة طعام", nameEn: "Dining Area", width: 4.59, length: 3.85, area: 17.7, x: 0.0, y: 9.80, side: "west" },
      { type: "family_hall", nameAr: "منطقة معيشة", nameEn: "Living Area", width: 4.95, length: 4.50, area: 22.3, x: 5.50, y: 2.00, side: "center" },
      { type: "kitchen", nameAr: "مطبخ خارجي", nameEn: "Clean Kitchen", width: 2.65, length: 3.15, area: 8.3, x: 0.0, y: 13.65, side: "south-west" },
      { type: "kitchen", nameAr: "مطبخ داخلي", nameEn: "Dirty Kitchen", width: 4.50, length: 3.00, area: 13.5, x: 3.30, y: 13.65, side: "south" },
      { type: "parking", nameAr: "موقف سيارة", nameEn: "Parking", width: 6.00, length: 5.50, area: 33.0, x: 5.00, y: 0.0, side: "north-east" },
      { type: "staircase", nameAr: "درج", nameEn: "Staircase", width: 3.00, length: 5.50, area: 16.5, x: 8.00, y: 5.50, side: "east" },
    ],
    upperFloors: [
      {
        floor: 1,
        rooms: [
          { type: "master_bedroom", nameAr: "غرفة نوم رئيسية", nameEn: "Master Bedroom", width: 4.60, length: 4.00, area: 18.4, x: 0.0, y: 0.0, side: "north-west" },
          { type: "wardrobe", nameAr: "غرفة ملابس رئيسية", nameEn: "Master Walk-in Closet", width: 2.30, length: 4.00, area: 9.2, x: 4.60, y: 0.0, side: "north" },
          { type: "bathroom", nameAr: "دورة مياه رئيسية", nameEn: "Master WC", width: 1.75, length: 4.00, area: 7.0, x: 6.90, y: 0.0, side: "north-east" },
          { type: "bedroom", nameAr: "غرفة نوم 1", nameEn: "Bedroom 1", width: 4.20, length: 4.00, area: 16.8, x: 0.0, y: 4.00, side: "west" },
          { type: "bathroom", nameAr: "دورة مياه 1", nameEn: "WC 1", width: 1.65, length: 2.45, area: 4.0, x: 4.20, y: 4.00, side: "center" },
          { type: "bedroom", nameAr: "غرفة نوم 2", nameEn: "Bedroom 2", width: 4.00, length: 4.00, area: 16.0, x: 0.0, y: 8.00, side: "west" },
          { type: "bedroom", nameAr: "غرفة نوم 3", nameEn: "Bedroom 3", width: 4.30, length: 4.00, area: 17.2, x: 4.50, y: 8.00, side: "east" },
          { type: "bathroom", nameAr: "دورة مياه 2", nameEn: "WC 2", width: 1.65, length: 2.45, area: 4.0, x: 8.80, y: 8.00, side: "east" },
          { type: "distributor", nameAr: "ممر", nameEn: "Corridor", width: 2.00, length: 8.00, area: 16.0, x: 4.20, y: 0.0, side: "center" },
        ]
      }
    ],
  },

  // ── المخطط 7: فيلا حي النخيل - الرياض (فيلا فاخرة مع بيسمنت) ──────────────
  {
    id: "nakheel_villa_luxury_3floors",
    name: "Nakheel District Luxury Villa - Riyadh (Basement + 2 Floors)",
    nameAr: "فيلا فاخرة حي النخيل - الرياض (بيسمنت + دورين)",
    landArea: 500,
    landWidth: 16.0,
    landLength: 31.0,
    floors: 3,
    bedrooms: 5,
    bathrooms: 8,
    hasMajlis: true,
    hasParking: true,
    style: "Luxury Contemporary",
    source: "Nakheel District Riyadh - Verified Project",
    tags: ["luxury", "large", "3floors", "basement", "majlis", "parking", "riyadh", "pool"],
    groundFloor: [
      { type: "kitchen", nameAr: "مطبخ", nameEn: "Kitchen", width: 4.25, length: 4.40, area: 18.7, x: 0.0, y: 0.0, side: "north-west" },
      { type: "pantry", nameAr: "مستودع", nameEn: "Pantry", width: 2.00, length: 4.40, area: 8.8, x: 4.25, y: 0.0, side: "north" },
      { type: "maid_room", nameAr: "غرفة خادمة", nameEn: "Maid's Room", width: 2.00, length: 3.00, area: 6.0, x: 6.25, y: 0.0, side: "north-east" },
      { type: "entrance_hall", nameAr: "مدخل عائلي", nameEn: "Family Entrance", width: 2.00, length: 2.00, area: 4.0, x: 4.25, y: 4.40, side: "center" },
      { type: "dining", nameAr: "غرفة طعام", nameEn: "Dining", width: 4.00, length: 4.00, area: 16.0, x: 0.0, y: 4.40, side: "west" },
      { type: "outdoor", nameAr: "جلسة خارجية", nameEn: "Outdoor Seating", width: 3.00, length: 4.40, area: 13.2, x: 0.0, y: 8.40, side: "west" },
      { type: "family_hall", nameAr: "صالة معيشة", nameEn: "Living Hall", width: 3.00, length: 4.40, area: 13.2, x: 4.00, y: 8.40, side: "center" },
      { type: "balcony", nameAr: "بلكونة", nameEn: "Balcony", width: 2.00, length: 2.00, area: 4.0, x: 7.00, y: 8.40, side: "east" },
      { type: "entrance_hall", nameAr: "مدخل رئيسي", nameEn: "Main Entrance", width: 2.00, length: 3.00, area: 6.0, x: 4.00, y: 12.80, side: "center" },
      { type: "majlis", nameAr: "مجلس", nameEn: "Majlis", width: 4.25, length: 4.28, area: 18.2, x: 0.0, y: 12.80, side: "south-west" },
      { type: "parking", nameAr: "موقف سيارة", nameEn: "Garage", width: 6.00, length: 5.00, area: 30.0, x: 10.00, y: 0.0, side: "north-east" },
      { type: "staircase", nameAr: "درج", nameEn: "Staircase", width: 3.00, length: 5.00, area: 15.0, x: 13.00, y: 5.00, side: "east" },
    ],
    upperFloors: [
      {
        floor: 1,
        rooms: [
          { type: "master_bedroom", nameAr: "غرفة نوم ماستر 1", nameEn: "Master Bedroom 1", width: 4.00, length: 5.00, area: 20.0, x: 0.0, y: 0.0, side: "north-west" },
          { type: "wardrobe", nameAr: "غرفة ملابس 1", nameEn: "Dressing 1", width: 4.00, length: 2.00, area: 8.0, x: 0.0, y: 5.00, side: "west" },
          { type: "master_bedroom", nameAr: "غرفة نوم ماستر 2", nameEn: "Master Bedroom 2", width: 4.00, length: 5.40, area: 21.6, x: 0.0, y: 7.00, side: "west" },
          { type: "wardrobe", nameAr: "غرفة ملابس 2", nameEn: "Dressing 2", width: 4.00, length: 2.00, area: 8.0, x: 0.0, y: 12.40, side: "west" },
          { type: "wardrobe", nameAr: "غرفة ملابس 3", nameEn: "Dressing 3", width: 4.00, length: 4.00, area: 16.0, x: 0.0, y: 14.40, side: "south-west" },
          { type: "master_bedroom", nameAr: "غرفة نوم ماستر 3", nameEn: "Master Bedroom 3", width: 4.00, length: 4.22, area: 16.9, x: 5.00, y: 14.40, side: "south" },
          { type: "family_hall", nameAr: "منطقة جلوس", nameEn: "Seating Area", width: 4.24, length: 4.22, area: 17.9, x: 5.00, y: 10.00, side: "center" },
          { type: "double_height", nameAr: "ارتفاع مزدوج", nameEn: "Double Height", width: 3.00, length: 4.38, area: 13.1, x: 9.00, y: 5.00, side: "east" },
          { type: "office", nameAr: "مكتب", nameEn: "Office", width: 1.40, length: 4.40, area: 6.2, x: 5.00, y: 0.0, side: "north" },
          { type: "balcony", nameAr: "بلكونة", nameEn: "Balcony", width: 2.02, length: 1.40, area: 2.8, x: 9.00, y: 18.00, side: "south-east" },
          { type: "staircase", nameAr: "درج", nameEn: "Staircase", width: 3.00, length: 5.00, area: 15.0, x: 13.00, y: 0.0, side: "east" },
        ]
      },
      {
        floor: 2,
        rooms: [
          { type: "master_bedroom", nameAr: "غرفة نوم ماستر 4", nameEn: "Master Bedroom 4", width: 3.00, length: 4.40, area: 13.2, x: 0.0, y: 0.0, side: "north-west" },
          { type: "family_hall", nameAr: "منطقة جلوس", nameEn: "Seating Area", width: 4.00, length: 4.00, area: 16.0, x: 0.0, y: 4.40, side: "west" },
          { type: "outdoor", nameAr: "جلسة خارجية", nameEn: "Outdoor Seating", width: 9.20, length: 3.00, area: 27.6, x: 0.0, y: 8.40, side: "south" },
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

// ─── Learning System: Generate RAG context from user-edited blueprints ────────
// This function is called at generation time to include learned patterns
export function generateLearnedContext(learnedBlueprints: any[]): string {
  if (!learnedBlueprints || learnedBlueprints.length === 0) return "";
  
  let context = "\n\n=== ENGINEER-APPROVED PATTERNS (Learn from these) ===\n";
  
  for (const bp of learnedBlueprints.slice(0, 3)) {
    // Try to parse ragEntry from editorFeedback
    let ragEntry: any = null;
    let feedback = "";
    
    try {
      const parsed = JSON.parse(bp.editorFeedback ?? "{}");
      ragEntry = parsed.ragEntry ?? null;
      feedback = parsed.feedback ?? "";
    } catch {
      feedback = bp.editorFeedback ?? "";
    }
    
    const spaces = (bp.editedSpaces as any[]) ?? [];
    if (spaces.length === 0 && !ragEntry) continue;
    
    const label = ragEntry?.label ?? `مخطط معدّل #${bp.id}`;
    context += `\n--- ${label} ---\n`;
    
    if (feedback) {
      context += `Engineer notes: ${feedback}\n`;
    }
    
    if (ragEntry?.rooms) {
      context += "Approved room layout:\n";
      for (const room of ragEntry.rooms) {
        context += `  • ${room.name}: ${room.width}×${room.length}m = ${room.area}m² (${room.position})\n`;
      }
    } else if (spaces.length > 0) {
      context += "Approved spaces:\n";
      for (const s of spaces.slice(0, 10)) {
        context += `  • ${s.nameAr ?? s.name}: pos(${s.x.toFixed(0)}%, ${s.y.toFixed(0)}%) size(${s.width.toFixed(0)}%×${s.height.toFixed(0)}%)\n`;
      }
    }
  }
  
  context += "\n=== END LEARNED PATTERNS ===\n";
  return context;
}
