/**
 * SOAR.AI — Saudi Architectural Rules Engine
 * ============================================
 * قاعدة القواعد المعمارية السعودية الشاملة
 * مستخرجة من:
 * 1. مخططات فيلا سعودية حقيقية (10.5م × 22م، دورين)
 * 2. الكود السعودي للبناء SBC 1101 (الوطني الموحد)
 * 3. الممارسات المعمارية السعودية المعتمدة
 */

import {
  SBC_SETBACKS,
  SBC_COVERAGE,
  CEILING_HEIGHTS,
  VENTILATION,
  MIN_ROOM_AREAS,
  MIN_ROOM_WIDTHS,
  PRACTICAL_ROOM_AREA_CAPS,
  SBC_HEIGHT,
} from "./core/saudiCode";

// ─── أنواع البيانات ───────────────────────────────────────────────────────────

export interface RoomSpec {
  type: string;
  nameAr: string;
  nameEn: string;
  minWidth: number;       // أدنى عرض بالمتر
  minLength: number;      // أدنى طول بالمتر
  prefWidth: number;      // العرض المفضل (من المخططات الحقيقية)
  prefLength: number;     // الطول المفضل
  maxWidth: number;       // أقصى عرض
  maxLength: number;      // أقصى طول
  minArea: number;        // أدنى مساحة م²
  mustHaveWindow: boolean;
  mustHaveExternalWall: boolean;
  allowedFloors: number[]; // 0=أرضي، 1=أول، 2=ثاني، -1=أي دور
  priority: number;       // الأولوية في التوزيع (1=أعلى)
}

export interface AdjacencyRule {
  room1: string;
  room2: string;
  relation: "must_adjacent" | "preferred_adjacent" | "must_not_adjacent" | "preferred_not_adjacent";
  reason: string;
  reasonAr: string;
}

export interface PositionRule {
  roomType: string;
  preferredSide: "north" | "south" | "east" | "west" | "any";
  avoidSide: "north" | "south" | "east" | "west" | "none";
  mustBeCorner: boolean;
  mustHaveDirectAccess: boolean; // وصول مباشر من المدخل
  reason: string;
  reasonAr: string;
}

export interface FloorDistributionRule {
  roomType: string;
  floor: number;
  mandatory: boolean;
  reason: string;
  reasonAr: string;
}

// ─── مواصفات الغرف الحقيقية (من المخططات السعودية) ──────────────────────────
// المصدر: مخطط فيلا سعودية 10.5م × 22م، دورين

export const SAUDI_ROOM_SPECS: Record<string, RoomSpec> = {

  // ── مدخل البهو ──
  entrance_hall: {
    type: "entrance_hall",
    nameAr: "بهو المدخل",
    nameEn: "Entrance Hall",
    minWidth: 3.0, minLength: 1.5,
    prefWidth: 5.8, prefLength: 1.9,  // من المخطط الحقيقي
    maxWidth: 7.0, maxLength: 3.0,
    minArea: 6,
    mustHaveWindow: false,
    mustHaveExternalWall: true,  // يجب أن يكون على الواجهة
    allowedFloors: [0],
    priority: 1,
  },

  // ── مجلس رجال ──
  majlis: {
    type: "majlis",
    nameAr: "مجلس رجال",
    nameEn: "Men's Majlis",
    minWidth: 5.0, minLength: 3.5,
    prefWidth: 7.4, prefLength: 4.2,  // من المخطط الحقيقي (دور أرضي)
    maxWidth: 9.0, maxLength: 6.0,
    minArea: 25,
    mustHaveWindow: true,
    mustHaveExternalWall: true,
    allowedFloors: [0, 1],
    priority: 2,
  },

  // ── مجلس رجال الدور الأول ──
  majlis_upper: {
    type: "majlis_upper",
    nameAr: "مجلس رجال",
    nameEn: "Men's Majlis (Upper)",
    minWidth: 5.0, minLength: 3.5,
    prefWidth: 7.4, prefLength: 3.9,  // من المخطط الحقيقي (دور أول)
    maxWidth: 9.0, maxLength: 5.5,
    minArea: 22,
    mustHaveWindow: true,
    mustHaveExternalWall: true,
    allowedFloors: [1, 2],
    priority: 2,
  },

  // ── صالة عائلية (دور أرضي) ──
  family_hall_ground: {
    type: "family_hall_ground",
    nameAr: "صالة عائلية",
    nameEn: "Family Hall",
    minWidth: 4.0, minLength: 4.0,
    prefWidth: 5.46, prefLength: 5.0,  // من المخطط الحقيقي
    maxWidth: 7.0, maxLength: 7.0,
    minArea: 20,
    mustHaveWindow: true,
    mustHaveExternalWall: false,
    allowedFloors: [0],
    priority: 3,
  },

  // ── صالة عائلية (دور أول) ──
  family_living: {
    type: "family_living",
    nameAr: "صالة عائلية",
    nameEn: "Family Living",
    minWidth: 3.5, minLength: 3.5,
    prefWidth: 4.3, prefLength: 3.6,  // من المخطط الحقيقي
    maxWidth: 6.0, maxLength: 6.0,
    minArea: 15,
    mustHaveWindow: true,
    mustHaveExternalWall: false,
    allowedFloors: [1, 2],
    priority: 3,
  },

  // ── غرفة نوم ماستر ──
  master_bedroom: {
    type: "master_bedroom",
    nameAr: "غرفة نوم ماستر",
    nameEn: "Master Bedroom",
    minWidth: 4.0, minLength: 3.5,
    prefWidth: 4.6, prefLength: 3.6,  // من المخطط الحقيقي
    maxWidth: 6.0, maxLength: 5.0,
    minArea: 16,
    mustHaveWindow: true,
    mustHaveExternalWall: true,
    allowedFloors: [0, 1, 2],
    priority: 4,
  },

  // ── غرفة نوم عادية ──
  bedroom: {
    type: "bedroom",
    nameAr: "غرفة نوم",
    nameEn: "Bedroom",
    minWidth: 3.0, minLength: 3.0,
    prefWidth: 3.5, prefLength: 3.8,  // متوسط من المخطط الحقيقي
    maxWidth: 5.0, maxLength: 5.0,
    minArea: 12,
    mustHaveWindow: true,
    mustHaveExternalWall: true,
    allowedFloors: [-1],
    priority: 5,
  },

  // ── مطبخ ──
  kitchen: {
    type: "kitchen",
    nameAr: "مطبخ",
    nameEn: "Kitchen",
    minWidth: 2.5, minLength: 2.5,
    prefWidth: 3.14, prefLength: 4.0,  // من المخطط الحقيقي
    maxWidth: 4.5, maxLength: 5.5,
    minArea: 10,
    mustHaveWindow: true,
    mustHaveExternalWall: true,  // تهوية ضرورية
    allowedFloors: [-1],
    priority: 6,
  },

  // ── غرفة طعام ──
  dining: {
    type: "dining",
    nameAr: "غرفة طعام",
    nameEn: "Dining Room",
    minWidth: 3.0, minLength: 3.0,
    prefWidth: 4.24, prefLength: 3.0,  // من المخطط الحقيقي
    maxWidth: 5.5, maxLength: 4.5,
    minArea: 10,
    mustHaveWindow: false,
    mustHaveExternalWall: false,
    allowedFloors: [-1],
    priority: 7,
  },

  // ── حمام ──
  bathroom: {
    type: "bathroom",
    nameAr: "حمام",
    nameEn: "Bathroom",
    minWidth: 1.8, minLength: 1.5,
    prefWidth: 3.14, prefLength: 1.5,  // من المخطط الحقيقي
    maxWidth: 3.5, maxLength: 2.5,
    minArea: 4,
    mustHaveWindow: true,  // تهوية إجبارية
    mustHaveExternalWall: true,
    allowedFloors: [-1],
    priority: 8,
  },

  // ── دورة مياه ──
  toilet: {
    type: "toilet",
    nameAr: "دورة مياه",
    nameEn: "Toilet",
    minWidth: 1.0, minLength: 1.0,
    prefWidth: 1.3, prefLength: 1.45,  // من المخطط الحقيقي
    maxWidth: 1.8, maxLength: 1.8,
    minArea: 2,
    mustHaveWindow: false,
    mustHaveExternalWall: false,
    allowedFloors: [-1],
    priority: 9,
  },

  // ── درج ──
  staircase: {
    type: "staircase",
    nameAr: "درج",
    nameEn: "Staircase",
    minWidth: 2.5, minLength: 5.0,
    prefWidth: 2.5, prefLength: 6.6,  // من المخطط الحقيقي (دور أرضي)
    maxWidth: 3.5, maxLength: 8.0,
    minArea: 13,
    mustHaveWindow: false,
    mustHaveExternalWall: false,
    allowedFloors: [-1],
    priority: 10,
  },

  // ── موزع ──
  distributor: {
    type: "distributor",
    nameAr: "موزع",
    nameEn: "Distributor",
    minWidth: 1.5, minLength: 2.0,
    prefWidth: 2.6, prefLength: 3.7,  // من المخطط الحقيقي
    maxWidth: 3.5, maxLength: 7.0,
    minArea: 5,
    mustHaveWindow: false,
    mustHaveExternalWall: false,
    allowedFloors: [-1],
    priority: 11,
  },

  // ── غرفة خادمة ──
  maid_room: {
    type: "maid_room",
    nameAr: "غرفة خادمة",
    nameEn: "Maid Room",
    minWidth: 2.5, minLength: 2.0,
    prefWidth: 3.1, prefLength: 2.1,  // من المخطط الحقيقي
    maxWidth: 3.5, maxLength: 3.0,
    minArea: 6,
    mustHaveWindow: true,
    mustHaveExternalWall: false,
    allowedFloors: [0],
    priority: 12,
  },

  // ── مخزن ──
  storage: {
    type: "storage",
    nameAr: "مخزن",
    nameEn: "Storage",
    minWidth: 1.5, minLength: 1.5,
    prefWidth: 1.8, prefLength: 2.4,  // من المخطط الحقيقي
    maxWidth: 3.0, maxLength: 3.5,
    minArea: 3,
    mustHaveWindow: false,
    mustHaveExternalWall: false,
    allowedFloors: [0],
    priority: 13,
  },

  // ── بلكونة ──
  balcony: {
    type: "balcony",
    nameAr: "بلكونة",
    nameEn: "Balcony",
    minWidth: 3.0, minLength: 1.0,
    prefWidth: 5.6, prefLength: 1.8,  // من المخطط الحقيقي
    maxWidth: 7.0, maxLength: 2.5,
    minArea: 5,
    mustHaveWindow: false,
    mustHaveExternalWall: true,
    allowedFloors: [1, 2],
    priority: 14,
  },

  // ── موقف سيارة ──
  parking: {
    type: "parking",
    nameAr: "موقف سيارة",
    nameEn: "Parking",
    minWidth: 2.7, minLength: 5.0,
    prefWidth: 3.0, prefLength: 6.0,
    maxWidth: 3.5, maxLength: 7.0,
    minArea: 15,
    mustHaveWindow: false,
    mustHaveExternalWall: true,
    allowedFloors: [0],
    priority: 15,
  },

  // ── مصلى ──
  prayer: {
    type: "prayer",
    nameAr: "مصلى",
    nameEn: "Prayer Room",
    minWidth: 2.5, minLength: 2.5,
    prefWidth: 3.0, prefLength: 3.5,
    maxWidth: 4.5, maxLength: 5.0,
    minArea: 8,
    mustHaveWindow: true,
    mustHaveExternalWall: false,
    allowedFloors: [-1],
    priority: 16,
  },

  // ── غرفة غسيل ──
  laundry: {
    type: "laundry",
    nameAr: "غرفة غسيل",
    nameEn: "Laundry",
    minWidth: 1.8, minLength: 1.5,
    prefWidth: 2.0, prefLength: 2.0,
    maxWidth: 3.0, maxLength: 3.0,
    minArea: 4,
    mustHaveWindow: true,
    mustHaveExternalWall: true,
    allowedFloors: [0],
    priority: 17,
  },
};

// ─── قواعد التجاور (Adjacency Rules) ─────────────────────────────────────────
// المصدر: الممارسات المعمارية السعودية + الكود السعودي

export const ADJACENCY_RULES: AdjacencyRule[] = [
  // قواعد إجبارية
  {
    room1: "kitchen", room2: "dining",
    relation: "must_adjacent",
    reason: "Kitchen must be directly adjacent to dining room for functionality",
    reasonAr: "المطبخ يجب أن يكون ملاصقاً لغرفة الطعام للوظيفية",
  },
  {
    room1: "master_bedroom", room2: "bathroom",
    relation: "must_adjacent",
    reason: "Master bedroom requires en-suite bathroom",
    reasonAr: "غرفة النوم الماستر تتطلب حماماً خاصاً ملاصقاً",
  },
  {
    room1: "entrance_hall", room2: "majlis",
    relation: "must_adjacent",
    reason: "Majlis must be directly accessible from entrance for guests",
    reasonAr: "المجلس يجب أن يكون مباشراً من المدخل لاستقبال الضيوف",
  },
  {
    room1: "staircase", room2: "distributor",
    relation: "must_adjacent",
    reason: "Staircase and distributor must be connected for circulation",
    reasonAr: "الدرج والموزع يجب أن يكونا متصلين للحركة",
  },
  {
    room1: "maid_room", room2: "kitchen",
    relation: "preferred_adjacent",
    reason: "Maid room near kitchen for service access",
    reasonAr: "غرفة الخادمة بالقرب من المطبخ لسهولة الخدمة",
  },
  {
    room1: "laundry", room2: "maid_room",
    relation: "preferred_adjacent",
    reason: "Laundry near maid room for service zone",
    reasonAr: "الغسيل بجانب غرفة الخادمة لمنطقة الخدمة",
  },

  // قواعد المنع
  {
    room1: "kitchen", room2: "bathroom",
    relation: "must_not_adjacent",
    reason: "Kitchen must not be adjacent to bathroom — hygiene and building code",
    reasonAr: "المطبخ لا يجاور الحمام — صحة عامة وكود البناء",
  },
  {
    room1: "kitchen", room2: "toilet",
    relation: "must_not_adjacent",
    reason: "Kitchen must not be adjacent to toilet — hygiene requirement",
    reasonAr: "المطبخ لا يجاور دورة المياه — اشتراط صحي",
  },
  {
    room1: "majlis", room2: "master_bedroom",
    relation: "must_not_adjacent",
    reason: "Majlis (public) must be separated from master bedroom (private)",
    reasonAr: "المجلس (عام) يجب أن يكون بعيداً عن غرفة النوم الماستر (خاص)",
  },
  {
    room1: "majlis", room2: "kitchen",
    relation: "preferred_not_adjacent",
    reason: "Majlis should not be adjacent to kitchen — odors and privacy",
    reasonAr: "المجلس لا يفضل أن يجاور المطبخ — روائح وخصوصية",
  },
  {
    room1: "bedroom", room2: "entrance_hall",
    relation: "preferred_not_adjacent",
    reason: "Bedrooms should not be visible from entrance — privacy",
    reasonAr: "غرف النوم لا يجب أن تكون مرئية من المدخل — خصوصية",
  },
  {
    room1: "prayer", room2: "bathroom",
    relation: "must_not_adjacent",
    reason: "Prayer room must not be adjacent to bathroom — Islamic requirement",
    reasonAr: "المصلى لا يجاور الحمام — اشتراط إسلامي",
  },
  {
    room1: "prayer", room2: "toilet",
    relation: "must_not_adjacent",
    reason: "Prayer room must not be adjacent to toilet — Islamic requirement",
    reasonAr: "المصلى لا يجاور دورة المياه — اشتراط إسلامي",
  },
];

// ─── قواعد الموضع (Position Rules) ───────────────────────────────────────────

export const POSITION_RULES: PositionRule[] = [
  {
    roomType: "entrance_hall",
    preferredSide: "north",  // الواجهة الشمالية (الشارع)
    avoidSide: "none",
    mustBeCorner: false,
    mustHaveDirectAccess: true,
    reason: "Entrance must face the street (north in most Saudi plots)",
    reasonAr: "المدخل يجب أن يواجه الشارع (شمال في معظم القطع السعودية)",
  },
  {
    roomType: "majlis",
    preferredSide: "north",  // قريب من المدخل
    avoidSide: "none",
    mustBeCorner: true,
    mustHaveDirectAccess: true,
    reason: "Majlis must be at front of house, accessible from entrance",
    reasonAr: "المجلس يكون في مقدمة المنزل، يصل إليه من المدخل مباشرة",
  },
  {
    roomType: "kitchen",
    preferredSide: "west",  // الجهة الغربية أو الخلفية
    avoidSide: "north",     // لا يواجه الشارع
    mustBeCorner: false,
    mustHaveDirectAccess: false,
    reason: "Kitchen should be at back or side, not facing street",
    reasonAr: "المطبخ في الخلف أو الجانب، لا يواجه الشارع",
  },
  {
    roomType: "master_bedroom",
    preferredSide: "south",  // الجهة الجنوبية (الخلفية)
    avoidSide: "north",
    mustBeCorner: true,
    mustHaveDirectAccess: false,
    reason: "Master bedroom at back for maximum privacy",
    reasonAr: "غرفة النوم الماستر في الخلف لأقصى خصوصية",
  },
  {
    roomType: "prayer",
    preferredSide: "west",  // اتجاه القبلة
    avoidSide: "none",
    mustBeCorner: false,
    mustHaveDirectAccess: false,
    reason: "Prayer room should face Qibla direction (west)",
    reasonAr: "المصلى يتجه نحو القبلة (الغرب)",
  },
  {
    roomType: "maid_room",
    preferredSide: "west",
    avoidSide: "north",
    mustBeCorner: false,
    mustHaveDirectAccess: false,
    reason: "Maid room in service zone, away from main entrance",
    reasonAr: "غرفة الخادمة في منطقة الخدمة، بعيدة عن المدخل الرئيسي",
  },
  {
    roomType: "parking",
    preferredSide: "north",  // يفتح على الشارع
    avoidSide: "south",
    mustBeCorner: false,
    mustHaveDirectAccess: true,
    reason: "Parking must have direct street access",
    reasonAr: "الموقف يجب أن يكون له وصول مباشر للشارع",
  },
];

// ─── قواعد توزيع الأدوار ─────────────────────────────────────────────────────

export const FLOOR_DISTRIBUTION_RULES: FloorDistributionRule[] = [
  // الدور الأرضي — المنطقة العامة
  { roomType: "entrance_hall", floor: 0, mandatory: true, reason: "Entrance always on ground floor", reasonAr: "المدخل دائماً في الدور الأرضي" },
  { roomType: "majlis", floor: 0, mandatory: true, reason: "Men's majlis on ground floor for guest access", reasonAr: "مجلس الرجال في الدور الأرضي لاستقبال الضيوف" },
  { roomType: "kitchen", floor: 0, mandatory: true, reason: "Main kitchen on ground floor", reasonAr: "المطبخ الرئيسي في الدور الأرضي" },
  { roomType: "maid_room", floor: 0, mandatory: true, reason: "Maid room on ground floor near service areas", reasonAr: "غرفة الخادمة في الدور الأرضي قرب مناطق الخدمة" },
  { roomType: "parking", floor: 0, mandatory: true, reason: "Parking on ground floor", reasonAr: "الموقف في الدور الأرضي" },
  { roomType: "storage", floor: 0, mandatory: false, reason: "Storage preferred on ground floor", reasonAr: "المخزن يفضل في الدور الأرضي" },

  // الدور الأول — المنطقة الخاصة
  { roomType: "master_bedroom", floor: 1, mandatory: true, reason: "Master bedroom on upper floor for privacy", reasonAr: "غرفة النوم الماستر في الدور العلوي للخصوصية" },
  { roomType: "family_living", floor: 1, mandatory: true, reason: "Family living room on upper floor", reasonAr: "الصالة العائلية في الدور العلوي" },
  { roomType: "balcony", floor: 1, mandatory: false, reason: "Balcony on upper floors", reasonAr: "البلكونة في الأدوار العلوية" },
];

// ─── قواعد الكود السعودي للبناء SBC 1101 (موحد وطني) ────────────────────────
// القيم مستوردة من server/core/saudiCode.ts (المصدر الرسمي الموحد)

export const SAUDI_BUILDING_CODE = {
  // الإرتدادات — حد أدنى وطني (SBC 1101). البلديات قد تشترط أكثر.
  setbacks: {
    front_min: SBC_SETBACKS.frontMin,
    back_min: SBC_SETBACKS.backMin,
    side_min: SBC_SETBACKS.sideMin,
    side_corner_min: 3.0,   // للقطع الزاوية — ممارسة معتمدة
  },

  // نسب البناء (SBC 1101 — محدّثة 2025)
  coverage: {
    residential_max: SBC_COVERAGE.groundFloorMax,
    villa_max: SBC_COVERAGE.groundFloorMax,
    commercial_max: SBC_COVERAGE.absoluteMax,
  },

  // الارتفاعات (SBC R305.1)
  heights: {
    floor_to_ceiling_min: CEILING_HEIGHTS.habitableMin,
    floor_to_ceiling_pref: 3.2,
    ground_floor_max: 4.5,
    typical_floor_height: 3.5,
  },

  // الحد الأدنى لأبعاد الغرف (SBC R304.1 + ممارسات سعودية)
  min_dimensions: {
    bedroom_width: MIN_ROOM_WIDTHS.habitable,
    bedroom_area: MIN_ROOM_AREAS.bedroom,
    bathroom_width: MIN_ROOM_WIDTHS.bathroom,
    bathroom_area: MIN_ROOM_AREAS.bathroom,
    kitchen_width: MIN_ROOM_WIDTHS.habitable,
    kitchen_area: MIN_ROOM_AREAS.kitchen,
    corridor_width: MIN_ROOM_WIDTHS.corridor,
    staircase_width: MIN_ROOM_WIDTHS.corridor,
    staircase_min_step_width: 0.9,
  },

  // اشتراطات الإضاءة والتهوية (SBC R303)
  ventilation: {
    min_window_area_ratio: VENTILATION.minWindowAreaFraction,
    kitchen_must_have_external_window: true,
    bathroom_must_have_ventilation: true,
    bedroom_must_have_window: true,
  },

  // اشتراطات الحريق
  fire_safety: {
    max_dead_end_corridor: 15.0,
    min_door_width: 0.9,
    staircase_must_be_enclosed_above_floors: 3,
  },
};

// ─── بيانات المخطط الحقيقي كـ RAG Reference ─────────────────────────────────
// المصدر: مخطط فيلا سعودية 10.5م × 22م (موستقل.كوم)

export const REAL_BLUEPRINT_REFERENCE = {
  metadata: {
    source: "Saudi Villa Blueprint - mostaql.com",
    landWidth: 10.5,
    landLength: 22.0,
    landArea: 231,
    buildingWidth: 10.5,
    buildingDepth: 22.0,
    floors: 2,
    style: "Traditional Saudi Residential",
  },

  groundFloor: {
    totalArea: 231,
    rooms: [
      { type: "entrance_hall", nameAr: "بهو", nameEn: "Entrance Hall", width: 5.8, length: 1.9, area: 11.0, x: 0.0, y: 0.0, side: "north" },
      { type: "majlis", nameAr: "مجلس رجال", nameEn: "Men's Majlis", width: 7.4, length: 4.2, area: 31.1, x: 0.0, y: 1.9, side: "north-west" },
      { type: "staircase", nameAr: "درج", nameEn: "Staircase", width: 2.5, length: 6.6, area: 16.5, x: 8.0, y: 0.0, side: "north-east" },
      { type: "distributor", nameAr: "موزع", nameEn: "Distributor", width: 2.6, length: 3.7, area: 9.6, x: 5.5, y: 4.5, side: "center" },
      { type: "family_hall", nameAr: "صالة عائلية", nameEn: "Family Hall", width: 5.46, length: 5.0, area: 27.3, x: 0.0, y: 7.0, side: "west" },
      { type: "kitchen", nameAr: "مطبخ", nameEn: "Kitchen", width: 3.14, length: 4.0, area: 12.6, x: 7.0, y: 6.6, side: "east" },
      { type: "bathroom", nameAr: "حمام", nameEn: "Bathroom", width: 3.14, length: 1.5, area: 4.7, x: 7.0, y: 10.6, side: "east" },
      { type: "toilet", nameAr: "دورة مياه", nameEn: "Toilet", width: 1.3, length: 1.45, area: 1.9, x: 5.5, y: 4.5, side: "center" },
      { type: "maid_room", nameAr: "غرفة خادمة", nameEn: "Maid Room", width: 3.1, length: 2.1, area: 6.5, x: 7.0, y: 12.5, side: "east" },
      { type: "storage", nameAr: "مخزن", nameEn: "Storage", width: 1.8, length: 2.4, area: 4.3, x: 0.0, y: 12.0, side: "west" },
      { type: "bedroom", nameAr: "غرفة نوم 1", nameEn: "Bedroom 1", width: 3.1, length: 3.9, area: 12.1, x: 7.0, y: 14.5, side: "east" },
      { type: "bedroom", nameAr: "غرفة نوم 2", nameEn: "Bedroom 2", width: 4.3, length: 3.6, area: 15.5, x: 0.0, y: 18.0, side: "south-west" },
      { type: "master_bedroom", nameAr: "غرفة نوم ماستر", nameEn: "Master Bedroom", width: 4.6, length: 3.6, area: 16.6, x: 0.0, y: 18.0, side: "south" },
      { type: "distributor", nameAr: "موزع", nameEn: "Distributor 2", width: 2.3, length: 6.6, area: 15.2, x: 5.5, y: 14.5, side: "center" },
    ],
  },

  firstFloor: {
    totalArea: 231,
    rooms: [
      { type: "balcony", nameAr: "بلكونة", nameEn: "Balcony", width: 5.6, length: 1.8, area: 10.1, x: 0.0, y: 0.0, side: "north" },
      { type: "majlis", nameAr: "مجلس رجال", nameEn: "Men's Majlis", width: 7.4, length: 3.9, area: 28.9, x: 0.0, y: 1.8, side: "north-west" },
      { type: "staircase", nameAr: "درج", nameEn: "Staircase", width: 2.5, length: 6.0, area: 15.0, x: 8.0, y: 0.0, side: "north-east" },
      { type: "family_living", nameAr: "صالة عائلية", nameEn: "Family Living", width: 4.3, length: 3.6, area: 15.5, x: 0.0, y: 5.7, side: "west" },
      { type: "master_bedroom", nameAr: "غرفة نوم ماستر", nameEn: "Master Bedroom", width: 4.6, length: 3.6, area: 16.6, x: 0.0, y: 9.3, side: "west" },
      { type: "bathroom", nameAr: "حمام ماستر", nameEn: "Master Bathroom", width: 1.9, length: 2.0, area: 3.8, x: 0.0, y: 12.9, side: "west" },
      { type: "bedroom", nameAr: "غرفة نوم 1", nameEn: "Bedroom 1", width: 3.07, length: 3.0, area: 9.2, x: 5.4, y: 9.0, side: "center" },
      { type: "bedroom", nameAr: "غرفة نوم 2", nameEn: "Bedroom 2", width: 4.2, length: 3.0, area: 12.6, x: 5.4, y: 12.0, side: "center" },
      { type: "bedroom", nameAr: "غرفة نوم 3", nameEn: "Bedroom 3", width: 4.0, length: 5.0, area: 20.0, x: 0.0, y: 15.0, side: "west" },
      { type: "bedroom", nameAr: "غرفة نوم 4", nameEn: "Bedroom 4", width: 4.0, length: 4.2, area: 16.8, x: 0.0, y: 17.8, side: "south-west" },
      { type: "kitchen", nameAr: "مطبخ", nameEn: "Kitchen", width: 2.9, length: 4.0, area: 11.6, x: 0.0, y: 15.0, side: "east" },
      { type: "dining", nameAr: "غرفة طعام", nameEn: "Dining Room", width: 4.24, length: 3.0, area: 12.7, x: 5.5, y: 17.0, side: "east" },
      { type: "toilet", nameAr: "دورة مياه", nameEn: "Toilet", width: 1.0, length: 1.2, area: 1.2, x: 7.5, y: 9.0, side: "east" },
      { type: "family_living", nameAr: "صالة عائلية 2", nameEn: "Family Hall 2", width: 2.7, length: 4.2, area: 11.3, x: 7.5, y: 10.0, side: "east" },
      { type: "balcony", nameAr: "بلكونة 2", nameEn: "Balcony 2", width: 5.1, length: 1.0, area: 5.1, x: 0.0, y: 21.0, side: "south" },
      { type: "distributor", nameAr: "موزع", nameEn: "Distributor", width: 2.8, length: 5.0, area: 14.0, x: 5.5, y: 14.0, side: "center" },
    ],
  },
};

// ─── قواعد العمارة النجدية ────────────────────────────────────────────────────

export const NAJDI_ARCH_RULES = `
══════════════════════════════════════════════════════════════
 NAJDI ARCHITECTURE RULES (ACTIVE — Facade = نجدي)
══════════════════════════════════════════════════════════════
1. PROPORTIONS:
   - Solid walls dominate: window openings max 10-15% (Traditional), 20-30% (Transitional), up to 50% (Contemporary)
   - Asymmetric composition is ESSENTIAL — avoid symmetric facades
   - Horizontal layout with varied parapet heights creating non-linear skyline

2. MATERIALS:
   - Natural stone (Riyadh stone) or rough cement plaster mimicking clay
   - Athel wood for doors, ceilings, and drainage spouts
   - Matte finish surfaces only — no glossy or reflective materials

3. KEY ELEMENTS (MUST APPEAR IN DESIGN DESCRIPTION):
   - Darwa (درواة): High crenellated parapets at corners with 3 or 5 stepped points
   - Tarma (طرمة): Projecting upper observation opening / covered porch
   - Masarib (مصاريب): Exposed wooden drainage spouts as decorative facade elements
   - Arcades: Triangular or rectangular arches on cylindrical stone columns
   - Courtyard / Faryna (فارينا): Central courtyard for light, ventilation, and privacy

4. COLORS:
   - Base: Creamy white or clay beige covering entire building
   - Secondary: Dark wood tones (doors/windows), limited to 10-25% of facade
   - No bright or saturated colors

5. PATTERNS:
   - Triangle motifs as horizontal bands across facade
   - Geometric/floral carved wooden door decorations
   - White plaster frames around windows contrasting with clay wall color

SUB-STYLES:
   - Traditional (TR): Max 15% openings, small square windows, rich triangle/band decorations, massive solid walls
   - Transitional (TIN): 20-30% openings, mix of narrow and wide windows, minimal geometric decoration
   - Contemporary (C): Up to 50% openings, tall vertical windows, sharp angles, simplified historic patterns

APPLY THESE RULES: Describe the Najdi architectural elements explicitly in conceptDescription and highlightsAr. The floor plan should include a central courtyard (Faryna) for light and privacy, and the entrance should feature a Tarma (projecting porch).
══════════════════════════════════════════════════════════════
`;

// ─── دالة توليد الـ Prompt المحسّن ────────────────────────────────────────────

export function buildEnhancedArchPrompt(params: {
  buildingType: "villa" | "residential";
  landArea: number;
  landWidth?: number;
  landLength?: number;
  landShape: string;
  numberOfFloors: number;
  bedrooms: number;
  bathrooms: number;
  majlis: number;
  maidRooms: number;
  balconies: number;
  garages: number;
  additionalRequirements?: string;
  setbacks: { front: number; back: number; side: number };
  buildingRatio: number;
  conceptIndex: number;
  conceptStyle: { en: string; ar: string; focus: string };
  facadeStyle?: string;
}): string {

  const {
    buildingType, landArea, landWidth, landLength, landShape,
    numberOfFloors, bedrooms, bathrooms, majlis, maidRooms,
    balconies, garages, additionalRequirements,
    setbacks, buildingRatio, conceptIndex, conceptStyle, facadeStyle
  } = params;

  // حساب أبعاد المبنى
  const bldWidth = landWidth ? (landWidth - setbacks.side * 2) : Math.sqrt(landArea * buildingRatio / 100 * 0.5);
  const bldDepth = landLength ? (landLength - setbacks.front - setbacks.back) : (landArea * buildingRatio / 100) / bldWidth;
  const bldArea = Math.round(bldWidth * bldDepth);
  const totalArea = bldArea * (numberOfFloors + 1);

  const najdiBlock = facadeStyle === "arabic" ? NAJDI_ARCH_RULES : "";

  // ── اختيار استراتيجية التخطيط بحسب نوع المبنى ──────────────────────────────
  const isVilla = buildingType === "villa";

  // ── مراجع نسبية مبنية على أبعاد أرض المستخدم الفعلية ──────────────────────
  // Scale reference rooms proportionally to user's actual building footprint
  const rAw = parseFloat((bldWidth * 0.95).toFixed(1));
  const rAd = parseFloat((bldDepth * 0.95).toFixed(1));
  const rBw = parseFloat((bldWidth * 0.85).toFixed(1));
  const rBd = parseFloat((bldDepth * 0.90).toFixed(1));
  const rAarea = Math.round(rAw * rAd);
  const rBarea = Math.round(rBw * rBd);

  // Proportional room dimensions (scaled from real Saudi reference ratios)
  const majW = parseFloat((bldWidth * 0.52).toFixed(1));  // majlis ≈ 52% of width
  const majD = parseFloat((bldDepth * 0.19).toFixed(1));  // majlis ≈ 19% of depth
  const kitW = parseFloat((bldWidth * 0.22).toFixed(1));  // kitchen ≈ 22% of width
  const kitD = parseFloat((bldDepth * 0.18).toFixed(1));  // kitchen depth
  const bedW = parseFloat((bldWidth * 0.30).toFixed(1));  // bedroom ≈ 30% of width
  const bedD = parseFloat((bldDepth * 0.17).toFixed(1));  // bedroom depth
  const mbrW = parseFloat((bldWidth * 0.33).toFixed(1));  // master BR ≈ 33% of width
  const batW = parseFloat((bldWidth * 0.22).toFixed(1));  // bathroom ≈ 22%
  const batD = parseFloat((bldDepth * 0.07).toFixed(1));  // bathroom depth
  const staW = parseFloat((bldWidth * 0.18).toFixed(1));  // staircase width
  const staD = parseFloat((bldDepth * 0.30).toFixed(1));  // staircase depth
  const livW = parseFloat((bldWidth * 0.39).toFixed(1));  // living/family hall
  const livD = parseFloat((bldDepth * 0.23).toFixed(1));

  const villaReferences = `
══════════════════════════════════════════════════════════════
 PROPORTIONAL SAUDI VILLA REFERENCES — USE AS PROPORTIONAL GUIDE ONLY
 (Scaled to this project's building footprint: ${bldWidth.toFixed(1)}m × ${bldDepth.toFixed(1)}m)
══════════════════════════════════════════════════════════════
Reference A (${rAw}×${rAd}m, ${rAarea}m², ${numberOfFloors + 1} floors):
  GROUND: Entrance(${parseFloat((bldWidth*0.41).toFixed(1))}×${parseFloat((bldDepth*0.09).toFixed(1))}) | Majlis(${majW}×${majD}) | Staircase(${staW}×${staD})
          Distributor(${parseFloat((bldWidth*0.18).toFixed(1))}×${parseFloat((bldDepth*0.17).toFixed(1))}) | Family Hall(${livW}×${livD}) | Kitchen(${kitW}×${kitD})
          Bathroom(${batW}×${batD}) | Maid Room(${parseFloat((bldWidth*0.22).toFixed(1))}×${parseFloat((bldDepth*0.10).toFixed(1))}) | Storage(${parseFloat((bldWidth*0.13).toFixed(1))}×${parseFloat((bldDepth*0.11).toFixed(1))})
          Bedroom1(${parseFloat((bldWidth*0.22).toFixed(1))}×${bedD}) | Bedroom2(${bedW}×${bedD}) | Master BR(${mbrW}×${bedD})
  UPPER:  Balcony(${parseFloat((bldWidth*0.40).toFixed(1))}×${parseFloat((bldDepth*0.08).toFixed(1))}) | Family Living(${bedW}×${bedD}) | Master BR(${mbrW}×${bedD})
          Master Bath(${parseFloat((bldWidth*0.14).toFixed(1))}×${parseFloat((bldDepth*0.09).toFixed(1))}) | Bedroom1(${bedW}×${bedD}) | Bedroom2(${bedW}×${bedD})
          Kitchen(${parseFloat((bldWidth*0.21).toFixed(1))}×${kitD}) | Dining(${parseFloat((bldWidth*0.30).toFixed(1))}×${parseFloat((bldDepth*0.14).toFixed(1))})

Reference B (${rBw}×${rBd}m, ${rBarea}m², ${numberOfFloors + 1} floors):
  GROUND: Entrance(${parseFloat((bldWidth*0.29).toFixed(1))}×${parseFloat((bldDepth*0.11).toFixed(1))}) | Majlis(${parseFloat((bldWidth*0.43).toFixed(1))}×${majD}) | Parking(${parseFloat((bldWidth*0.43).toFixed(1))}×${parseFloat((bldDepth*0.14).toFixed(1))})
          Staircase(${parseFloat((bldWidth*0.20).toFixed(1))}×${parseFloat((bldDepth*0.25).toFixed(1))}) | Distributor(${parseFloat((bldWidth*0.18).toFixed(1))}×${parseFloat((bldDepth*0.18).toFixed(1))}) | Kitchen(${parseFloat((bldWidth*0.25).toFixed(1))}×${parseFloat((bldDepth*0.20).toFixed(1))})
          Dining(${parseFloat((bldWidth*0.25).toFixed(1))}×${parseFloat((bldDepth*0.16).toFixed(1))}) | Bathroom(${batW}×${parseFloat((bldDepth*0.11).toFixed(1))}) | Maid Room(${parseFloat((bldWidth*0.21).toFixed(1))}×${parseFloat((bldDepth*0.13).toFixed(1))})
  UPPER:  Corridor(${parseFloat((bldWidth*0.13).toFixed(1))}×${parseFloat((bldDepth*0.27).toFixed(1))}) | Family Living(${parseFloat((bldWidth*0.36).toFixed(1))}×${parseFloat((bldDepth*0.20).toFixed(1))}) | Master BR(${mbrW}×${parseFloat((bldDepth*0.20).toFixed(1))})
          Master Bath(${parseFloat((bldWidth*0.16).toFixed(1))}×${parseFloat((bldDepth*0.13).toFixed(1))}) | Bedroom2(${parseFloat((bldWidth*0.27).toFixed(1))}×${parseFloat((bldDepth*0.18).toFixed(1))}) | Bedroom3(${parseFloat((bldWidth*0.27).toFixed(1))}×${parseFloat((bldDepth*0.18).toFixed(1))})
          Prayer Room(${parseFloat((bldWidth*0.21).toFixed(1))}×${parseFloat((bldDepth*0.16).toFixed(1))}) | Balcony(${parseFloat((bldWidth*0.29).toFixed(1))}×${parseFloat((bldDepth*0.08).toFixed(1))})`;

  const aptW = parseFloat((bldWidth * 0.45).toFixed(1));
  const aptD = parseFloat((bldDepth * 0.18).toFixed(1));
  const residentialReferences = `
══════════════════════════════════════════════════════════════
 PROPORTIONAL RESIDENTIAL BUILDING (عمارة) REFERENCES — PROPORTIONAL GUIDE ONLY
 (Scaled to this project's building footprint: ${bldWidth.toFixed(1)}m × ${bldDepth.toFixed(1)}m)
══════════════════════════════════════════════════════════════
Reference A (${rAw}×${rAd}m, ${rAarea}m², ${numberOfFloors + 1} floors, ${bedrooms >= 4 ? "1 apt/floor" : "2 apts/floor"}):
  GROUND: Shared Lobby(${parseFloat((bldWidth*0.29).toFixed(1))}×${parseFloat((bldDepth*0.14).toFixed(1))}) | Elevator+Staircase(${parseFloat((bldWidth*0.25).toFixed(1))}×${parseFloat((bldDepth*0.25).toFixed(1))})
          Parking(${bldWidth.toFixed(1)}×${parseFloat((bldDepth*0.23).toFixed(1))}) | Guard Room(${parseFloat((bldWidth*0.18).toFixed(1))}×${parseFloat((bldDepth*0.11).toFixed(1))})
  TYPICAL FLOOR (${bedrooms >= 4 ? "1 large apartment" : "2 apartments"}):
    Apt-A: Living Room(${aptW}×${aptD}) | Kitchen(${parseFloat((bldWidth*0.21).toFixed(1))}×${parseFloat((bldDepth*0.16).toFixed(1))})
           Bedroom1(${parseFloat((bldWidth*0.25).toFixed(1))}×${parseFloat((bldDepth*0.16).toFixed(1))}) | Bedroom2(${parseFloat((bldWidth*0.21).toFixed(1))}×${parseFloat((bldDepth*0.16).toFixed(1))}) | Bathroom(${batW}×${parseFloat((bldDepth*0.11).toFixed(1))})
           Balcony(${parseFloat((bldWidth*0.25).toFixed(1))}×${parseFloat((bldDepth*0.07).toFixed(1))})
  CORRIDOR (shared): ${parseFloat((bldWidth*0.11).toFixed(1))}m wide, runs center of floor

Reference B (${rBw}×${rBd}m, ${rBarea}m², ${numberOfFloors + 1} floors, 1 apt/floor):
  GROUND: Shared Lobby(${parseFloat((bldWidth*0.33).toFixed(1))}×${parseFloat((bldDepth*0.16).toFixed(1))}) | Elevator+Staircase(${parseFloat((bldWidth*0.27).toFixed(1))}×${parseFloat((bldDepth*0.24).toFixed(1))})
          Parking(${bldWidth.toFixed(1)}×${parseFloat((bldDepth*0.24).toFixed(1))}) | Storage(${parseFloat((bldWidth*0.20).toFixed(1))}×${parseFloat((bldDepth*0.12).toFixed(1))})
  TYPICAL FLOOR (1 large apartment):
    Living Room(${parseFloat((bldWidth*0.43).toFixed(1))}×${parseFloat((bldDepth*0.20).toFixed(1))}) | Kitchen(${parseFloat((bldWidth*0.27).toFixed(1))}×${parseFloat((bldDepth*0.16).toFixed(1))}) | Dining(${parseFloat((bldWidth*0.27).toFixed(1))}×${parseFloat((bldDepth*0.14).toFixed(1))})
    Master BR(${mbrW}×${parseFloat((bldDepth*0.18).toFixed(1))}) | Master Bath(${parseFloat((bldWidth*0.18).toFixed(1))}×${parseFloat((bldDepth*0.12).toFixed(1))}) | Bedroom2(${parseFloat((bldWidth*0.27).toFixed(1))}×${parseFloat((bldDepth*0.14).toFixed(1))})
    Bedroom3(${parseFloat((bldWidth*0.25).toFixed(1))}×${parseFloat((bldDepth*0.14).toFixed(1))}) | Bathroom(${batW}×${parseFloat((bldDepth*0.11).toFixed(1))}) | Balcony(${parseFloat((bldWidth*0.36).toFixed(1))}×${parseFloat((bldDepth*0.08).toFixed(1))})
    Laundry(${parseFloat((bldWidth*0.18).toFixed(1))}×${parseFloat((bldDepth*0.09).toFixed(1))})`;

  // ── قواعد التخطيط المعماري حسب نوع المبنى ────────────────────────────────────
  const villaRules = `
═══════════════════════════════════════════════════════
VILLA LAYOUT RULES — CRITICAL (MUST FOLLOW):
═══════════════════════════════════════════════════════
ROOM PROGRAM (Villa — فيلا):
• Private entrance directly from street (not shared)
• Men's Majlis (مجلس رجال): large, NW corner, ground floor, direct from entrance — REQUIRED
• Family Hall (صالة عائلية): internal, separate from Majlis, ground or upper floor
• Master Bedroom: upper floor or south side, en-suite bathroom attached
• Maid Room: ground floor, near kitchen, in service zone — if requested
• Attached Garage/Parking: north side, direct street access
• Privacy is TOP PRIORITY: bedrooms/private spaces never visible from entrance or Majlis

ADJACENCY (required):
✓ Kitchen MUST be adjacent to Dining Room
✓ Master Bedroom MUST have en-suite Bathroom directly adjacent
✓ Majlis MUST be directly accessible from Entrance Hall (≤1 door separation)
✓ Staircase MUST connect to Distributor on each floor
✓ Maid Room NEAR Kitchen (service zone)

ADJACENCY (forbidden):
✗ Kitchen MUST NOT be adjacent to Bathroom/Toilet
✗ Majlis MUST NOT be adjacent to Master Bedroom
✗ Prayer Room MUST NOT be adjacent to Bathroom/Toilet
✗ Bedrooms MUST NOT be visible/accessible from Entrance or Majlis

POSITION RULES:
• Entrance Hall → North side (street-facing)
• Majlis → North-West corner, direct from entrance
• Parking/Garage → North side with street access
• Kitchen → West or East side, NOT facing street
• Master Bedroom → South side (maximum privacy from street)
• Maid Room → West/East side, away from entrance
• Prayer Room → West side (Qibla direction)`;

  const residentialRules = `
═══════════════════════════════════════════════════════
RESIDENTIAL BUILDING (عمارة) LAYOUT RULES — CRITICAL (MUST FOLLOW):
═══════════════════════════════════════════════════════
ROOM PROGRAM (Residential Building — عمارة):
• GROUND FLOOR: Shared entrance lobby (not private), elevator + staircase CORE in center, parking/garage
• TYPICAL UPPER FLOORS: ${bedrooms >= 4 ? "1 apartment per floor (large)" : "2 independent apartments per floor"}
• Each apartment has: its OWN front door opening onto shared corridor
• Each apartment contains: Living Room (NOT Majlis), Kitchen, ${bedrooms} Bedrooms total, Bathrooms, Balcony
• NO Majlis in apartments (use "Living Room" / "صالة معيشة" instead)
• NO Maid Room unless luxury specification requested
• SHARED elements per floor: corridor (1.5m min), elevator lobby
• Staircase + elevator shaft run vertically through ALL floors — same position on every floor
• Shared parking on ground floor or basement

ADJACENCY (required):
✓ Each apartment: Living Room accessible directly from apartment entrance door
✓ Kitchen adjacent to Living Room or Dining (if present)
✓ Master Bedroom has en-suite Bathroom adjacent (if present)
✓ Staircase + Elevator Core adjacent on EVERY floor
✓ Corridor connects all apartment doors to elevator/staircase core

ADJACENCY (forbidden):
✗ Kitchen MUST NOT be adjacent to Bathroom/Toilet
✗ Bedroom doors MUST NOT open directly to shared corridor (must go through apartment entrance)
✗ No private Majlis (use Living Room)

POSITION RULES:
• Shared lobby/entrance → Ground floor, North side (street-facing)
• Elevator + Staircase Core → Center of building footprint, all floors
• Parking → Ground floor or basement, North side with street access
• Living Rooms → Exterior walls (east or west), with windows
• Balconies → Exterior walls only (never interior)
• Kitchen + Bathrooms → Interior side or rear, NOT street-facing`;

  const architecturalRules = isVilla ? villaRules : residentialRules;
  const referenceBlueprints = isVilla ? villaReferences : residentialReferences;

  // ── مخطط JSON المطلوب حسب نوع المبنى ────────────────────────────────────────
  const villaJsonSchema = `{
  "title": "Concept ${conceptIndex}: ${conceptStyle.en}",
  "titleAr": "المفهوم ${conceptIndex}: ${conceptStyle.ar}",
  "conceptDescription": "Professional 2-paragraph description of this architectural concept",
  "conceptDescriptionAr": "وصف مهني من فقرتين لهذا المفهوم المعماري",
  "groundFloor": {
    "rooms": [
      {
        "type": "entrance_hall|majlis|kitchen|bathroom|toilet|bedroom|master_bedroom|family_hall|staircase|distributor|maid_room|storage|parking|laundry|prayer|dining",
        "nameAr": "اسم الغرفة",
        "nameEn": "Room Name",
        "width": <meters>,
        "length": <meters>,
        "area": <m²>,
        "x": <position from west wall in meters>,
        "y": <position from north wall in meters>,
        "hasWindow": <true/false>,
        "doorWall": "north|south|east|west",
        "notes": "brief architectural note"
      }
    ]
  },
  "upperFloors": [
    {
      "floorNumber": 1,
      "rooms": [ <same structure> ]
    }
  ],
  "summary": {
    "totalFloors": ${numberOfFloors + 1},
    "totalRooms": <count>,
    "totalBedrooms": ${bedrooms},
    "totalBathrooms": ${bathrooms},
    "totalArea": ${totalArea},
    "buildingWidth": ${bldWidth.toFixed(1)},
    "buildingDepth": ${bldDepth.toFixed(1)},
    "buildingArea": ${bldArea},
    "estimatedCost": "SAR X,XXX,XXX - X,XXX,XXX",
    "constructionDuration": "X-X months"
  },
  "highlights": ["Key feature 1", "Key feature 2", "Key feature 3"],
  "highlightsAr": ["الميزة الأولى", "الميزة الثانية", "الميزة الثالثة"],
  "complianceNotes": ["SBC compliant", "Setbacks verified"],
  "complianceNotesAr": ["متوافق مع الكود السعودي", "الإرتدادات مُراجَعة"]
}`;

  const residentialJsonSchema = `{
  "title": "Concept ${conceptIndex}: ${conceptStyle.en}",
  "titleAr": "المفهوم ${conceptIndex}: ${conceptStyle.ar}",
  "conceptDescription": "Professional 2-paragraph description of this architectural concept",
  "conceptDescriptionAr": "وصف مهني من فقرتين لهذا المفهوم المعماري",
  "groundFloor": {
    "label": "Ground Floor — Shared Lobby + Parking",
    "rooms": [
      {
        "type": "entrance_hall|staircase|elevator|parking|storage|guard_room",
        "nameAr": "اسم الفراغ",
        "nameEn": "Space Name",
        "width": <meters>,
        "length": <meters>,
        "area": <m²>,
        "x": <position from west wall in meters>,
        "y": <position from north wall in meters>,
        "hasWindow": <true/false>,
        "doorWall": "north|south|east|west",
        "notes": "brief note"
      }
    ]
  },
  "upperFloors": [
    {
      "floorNumber": 1,
      "label": "Floor 1 — Apartment(s)",
      "rooms": [
        {
          "type": "living_room|kitchen|bedroom|master_bedroom|bathroom|toilet|balcony|corridor|staircase|elevator|dining",
          "nameAr": "اسم الغرفة",
          "nameEn": "Room Name",
          "apartment": "A|B|shared",
          "width": <meters>,
          "length": <meters>,
          "area": <m²>,
          "x": <position from west wall in meters>,
          "y": <position from north wall in meters>,
          "hasWindow": <true/false>,
          "doorWall": "north|south|east|west",
          "notes": "brief note"
        }
      ]
    }
  ],
  "summary": {
    "totalFloors": ${numberOfFloors + 1},
    "apartmentsPerFloor": ${bedrooms >= 4 ? 1 : 2},
    "totalApartments": ${(bedrooms >= 4 ? 1 : 2) * numberOfFloors},
    "totalRooms": <count>,
    "totalBedrooms": ${bedrooms},
    "totalBathrooms": ${bathrooms},
    "totalArea": ${totalArea},
    "buildingWidth": ${bldWidth.toFixed(1)},
    "buildingDepth": ${bldDepth.toFixed(1)},
    "buildingArea": ${bldArea},
    "estimatedCost": "SAR X,XXX,XXX - X,XXX,XXX",
    "constructionDuration": "X-X months"
  },
  "highlights": ["Key feature 1", "Key feature 2", "Key feature 3"],
  "highlightsAr": ["الميزة الأولى", "الميزة الثانية", "الميزة الثالثة"],
  "complianceNotes": ["SBC compliant", "Setbacks verified"],
  "complianceNotesAr": ["متوافق مع الكود السعودي", "الإرتدادات مُراجَعة"]
}`;

  const jsonSchema = isVilla ? villaJsonSchema : residentialJsonSchema;

  return `You are a licensed Saudi residential architect (SBC-certified) with 25+ years designing ${isVilla ? "villas" : "residential buildings (عمارات)"} in Riyadh, Jeddah, and Dammam.
Generate CONCEPT #${conceptIndex}: "${conceptStyle.en}" (${conceptStyle.ar}).
Design philosophy: ${conceptStyle.focus}
${najdiBlock}
${referenceBlueprints}

${architecturalRules}

SAUDI BUILDING CODE SBC 1101 COMPLIANCE (National Minimums — uniform across all Saudi cities):
• Front setback: ${setbacks.front}m | Back: ${setbacks.back}m | Side: ${setbacks.side}m
• Max coverage: ${buildingRatio}% (SBC national max: ${Math.round(SBC_COVERAGE.groundFloorMax * 100)}%)
• Min ceiling height: ${CEILING_HEIGHTS.habitableMin}m (prefer 3.2m, max ${CEILING_HEIGHTS.habitableMax}m per SBC R305.1)
• Min bedroom: ${MIN_ROOM_WIDTHS.habitable}m width, ${MIN_ROOM_AREAS.bedroom}m² area (SBC R304.1)
• Min bathroom: ${MIN_ROOM_WIDTHS.bathroom}m width, ${MIN_ROOM_AREAS.bathroom}m² area
• Min corridor: ${MIN_ROOM_WIDTHS.corridor}m width
• Natural light: min ${Math.round(VENTILATION.minWindowAreaFraction * 100)}% of room floor area (SBC R303.1)
• Natural ventilation: min ${Math.round(VENTILATION.minVentilationFraction * 100)}% of room floor area (SBC R303.1)
• All bedrooms MUST have external windows
• Kitchen MUST have external window (ventilation)
• Bathrooms MUST have ventilation

═══════════════════════════════════════════════════════
PROJECT SPECIFICATIONS:
═══════════════════════════════════════════════════════
Building Type: ${isVilla ? "Residential Villa (فيلا سكنية)" : "Residential Building / عمارة (Multi-Unit)"}
Land: ${landWidth ? `${landWidth}m × ${landLength}m` : "N/A"} = ${landArea}m² | Shape: ${landShape}
Building Footprint: ~${bldWidth.toFixed(1)}m × ${bldDepth.toFixed(1)}m = ${bldArea}m²
Floors: ${numberOfFloors + 1} (Ground + ${numberOfFloors} upper)
Total Built Area: ~${totalArea}m²

ROOMS REQUIRED:
• Bedrooms: ${bedrooms}${isVilla ? " (include 1 Master Bedroom)" : " per apartment"}
• Bathrooms: ${bathrooms}${isVilla ? " (1 en-suite with Master)" : " per apartment"}
${isVilla ? `• Majlis: ${majlis} (ground floor required)` : `• Living Rooms: ${majlis > 0 ? majlis : 1} per apartment (NOT Majlis)`}
${isVilla && maidRooms > 0 ? `• Maid Rooms: ${maidRooms}` : ""}
• Balconies: ${balconies}
• Parking: ${garages} car(s)
${additionalRequirements ? `• Additional: ${additionalRequirements}` : ""}

═══════════════════════════════════════════════════════
RESPOND WITH VALID JSON ONLY (no markdown, no extra text):
═══════════════════════════════════════════════════════
${jsonSchema}`;
}

// ─── دالة تحويل بيانات AI إلى BSP Layout ─────────────────────────────────────

export function aiRoomsToLayoutRooms(aiFloorData: any[], floorNumber: number): {
  type: string; nameAr: string; nameEn: string;
  x: number; y: number; width: number; height: number;
  area: number; floor: number; hasWindow: boolean;
  hasDoor: boolean; doorWall: string;
}[] {
  if (!Array.isArray(aiFloorData)) return [];

  return aiFloorData.map((room: any, i: number) => ({
    type: room.type ?? "bedroom",
    nameAr: room.nameAr ?? "غرفة",
    nameEn: room.nameEn ?? "Room",
    x: parseFloat((room.x ?? i * 3).toFixed(2)),
    y: parseFloat((room.y ?? 0).toFixed(2)),
    width: parseFloat((room.width ?? 3.5).toFixed(2)),
    height: parseFloat((room.length ?? 3.5).toFixed(2)),
    area: parseFloat((room.area ?? (room.width ?? 3.5) * (room.length ?? 3.5)).toFixed(1)),
    floor: floorNumber,
    hasWindow: room.hasWindow ?? ["bedroom", "master_bedroom", "kitchen", "majlis", "living", "family_hall", "family_living", "dining", "balcony"].includes(room.type),
    hasDoor: room.type !== "balcony",
    doorWall: room.doorWall ?? "south",
  }));
}
