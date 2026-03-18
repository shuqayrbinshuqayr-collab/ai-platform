/**
 * SOAR.AI — Saudi Architectural Rules Engine
 * ============================================
 * قاعدة القواعد المعمارية السعودية الشاملة
 * مستخرجة من:
 * 1. مخططات فيلا سعودية حقيقية (10.5م × 22م، دورين)
 * 2. الكود السعودي للبناء (SBC)
 * 3. اشتراطات أمانة الرياض
 * 4. الممارسات المعمارية السعودية المعتمدة
 */

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
    preferredSide: "west",  // اتجاه القبلة (غرب في الرياض)
    avoidSide: "none",
    mustBeCorner: false,
    mustHaveDirectAccess: false,
    reason: "Prayer room should face Qibla direction (west from Riyadh)",
    reasonAr: "المصلى يتجه نحو القبلة (غرب من الرياض)",
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

// ─── قواعد الكود السعودي للبناء (SBC) ────────────────────────────────────────

export const SAUDI_BUILDING_CODE = {
  // الإرتدادات (بالمتر)
  setbacks: {
    front_min: 4.0,      // إرتداد أمامي
    back_min: 2.0,       // إرتداد خلفي
    side_min: 1.5,       // إرتداد جانبي
    side_corner_min: 3.0, // إرتداد جانبي للقطع الزاوية
  },

  // نسب البناء
  coverage: {
    residential_max: 0.60,    // أقصى نسبة بناء للسكني
    villa_max: 0.65,          // أقصى نسبة للفيلا
    commercial_max: 0.75,     // أقصى نسبة للتجاري
  },

  // الارتفاعات
  heights: {
    floor_to_ceiling_min: 2.9,  // أدنى ارتفاع من أرضية لسقف
    floor_to_ceiling_pref: 3.2, // الارتفاع المفضل
    ground_floor_max: 4.5,      // أقصى ارتفاع للدور الأرضي
    typical_floor_height: 3.5,  // ارتفاع الدور المعتاد
  },

  // الحد الأدنى لأبعاد الغرف
  min_dimensions: {
    bedroom_width: 3.0,
    bedroom_area: 12.0,
    bathroom_width: 1.5,
    bathroom_area: 4.0,
    kitchen_width: 2.5,
    kitchen_area: 8.0,
    corridor_width: 1.2,
    staircase_width: 1.2,
    staircase_min_step_width: 0.9,
  },

  // اشتراطات الإضاءة والتهوية
  ventilation: {
    min_window_area_ratio: 0.10,  // 10% من مساحة الغرفة
    kitchen_must_have_external_window: true,
    bathroom_must_have_ventilation: true,
    bedroom_must_have_window: true,
  },

  // اشتراطات الحريق
  fire_safety: {
    max_dead_end_corridor: 15.0,  // أقصى طول ممر مسدود
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
}): string {

  const {
    buildingType, landArea, landWidth, landLength, landShape,
    numberOfFloors, bedrooms, bathrooms, majlis, maidRooms,
    balconies, garages, additionalRequirements,
    setbacks, buildingRatio, conceptIndex, conceptStyle
  } = params;

  // حساب أبعاد المبنى
  const bldWidth = landWidth ? (landWidth - setbacks.side * 2) : Math.sqrt(landArea * buildingRatio / 100 * 0.5);
  const bldDepth = landLength ? (landLength - setbacks.front - setbacks.back) : (landArea * buildingRatio / 100) / bldWidth;
  const bldArea = Math.round(bldWidth * bldDepth);
  const totalArea = bldArea * (numberOfFloors + 1);

  // اختيار المرجع الأقرب من المخططات الحقيقية
  const refSimilarity = landArea <= 300 ? "EXACT MATCH" : landArea <= 500 ? "CLOSE MATCH" : "SCALED MATCH";

  return `You are a licensed Saudi residential architect (SBC-certified) with 25+ years designing villas in Riyadh, Jeddah, and Dammam.
Generate CONCEPT #${conceptIndex}: "${conceptStyle.en}" (${conceptStyle.ar}).
Design philosophy: ${conceptStyle.focus}

══════════════════════════════════════════════════════════════
 REAL SAUDI VILLA BLUEPRINTS — USE AS EXACT REFERENCE
══════════════════════════════════════════════════════════════
Reference A (10.5×22m, 231m², 2 floors):
  GROUND: Entrance(5.8×1.9) | Majlis(7.4×4.2) | Staircase(2.5×6.6)
          Distributor(2.6×3.7) | Family Hall(5.46×5.0) | Kitchen(3.14×4.0)
          Bathroom(3.14×1.5) | Maid Room(3.1×2.1) | Storage(1.8×2.4)
          Bedroom1(3.1×3.9) | Bedroom2(4.3×3.6) | Master BR(4.6×3.6)
  UPPER:  Balcony(5.6×1.8) | Majlis2(7.4×3.9) | Staircase(2.5×6.0)
          Family Living(4.3×3.6) | Master BR(4.6×3.6) | Master Bath(1.9×2.0)
          Bedroom1(3.07×3.0) | Bedroom2(4.2×3.0) | Bedroom3(4.0×5.0)
          Kitchen(2.9×4.0) | Dining(4.24×3.0) | Balcony(5.1×1.0)

Reference B (12×20m, 240m², 2 floors):
  GROUND: Entrance(4.0×2.5) | Majlis(6.0×5.0) | Parking(6.0×3.0)
          Staircase(2.8×5.5) | Distributor(2.5×4.0) | Kitchen(3.5×4.5)
          Dining(3.5×3.5) | Bathroom(2.0×2.5) | Toilet(1.5×2.0)
          Maid Room(3.0×2.8) | Storage(2.0×2.5) | Bedroom1(4.0×4.0)
  UPPER:  Staircase(2.8×5.5) | Corridor(1.8×6.0) | Family Living(5.0×4.5)
          Master BR(5.0×4.5) | Master Bath(2.2×2.8) | Bedroom2(3.8×4.0)
          Bedroom3(3.8×4.0) | Bedroom4(4.0×4.2) | Bathroom(2.0×2.5)
          Toilet(1.5×2.0) | Prayer Room(3.0×3.0) | Balcony(4.0×1.8)

═══════════════════════════════════════════════════════
CRITICAL ARCHITECTURAL RULES (MUST FOLLOW):
═══════════════════════════════════════════════════════
ADJACENCY (required):
✓ Kitchen MUST be adjacent to Dining Room
✓ Master Bedroom MUST have en-suite Bathroom adjacent
✓ Majlis MUST be directly accessible from Entrance
✓ Staircase MUST connect to Distributor on each floor
✓ Maid Room NEAR Kitchen (service zone)

ADJACENCY (forbidden):
✗ Kitchen MUST NOT be adjacent to Bathroom/Toilet
✗ Majlis MUST NOT be adjacent to Master Bedroom
✗ Prayer Room MUST NOT be adjacent to Bathroom/Toilet
✗ Bedrooms MUST NOT be visible from Entrance Hall

POSITION RULES:
• Entrance Hall → North side (street-facing)
• Majlis → North-West corner, direct from entrance
• Kitchen → West or East side, NOT facing street
• Master Bedroom → South side (maximum privacy)
• Parking → North side (street access)
• Prayer Room → West side (Qibla direction from Riyadh)

SAUDI BUILDING CODE (SBC) COMPLIANCE:
• Front setback: ${setbacks.front}m | Back: ${setbacks.back}m | Side: ${setbacks.side}m
• Max coverage: ${buildingRatio}%
• Min ceiling height: 2.9m (prefer 3.2m)
• Min bedroom: 3.0m width, 12m² area
• Min bathroom: 1.5m width, 4m² area
• Min corridor: 1.2m width
• All bedrooms MUST have external windows
• Kitchen MUST have external window (ventilation)
• Bathrooms MUST have ventilation

═══════════════════════════════════════════════════════
PROJECT SPECIFICATIONS:
═══════════════════════════════════════════════════════
Building Type: ${buildingType === "villa" ? "Residential Villa (فيلا سكنية)" : "Residential Building (مبنى سكني)"}
Land: ${landWidth ? `${landWidth}m × ${landLength}m` : "N/A"} = ${landArea}m² | Shape: ${landShape}
Building Footprint: ~${bldWidth.toFixed(1)}m × ${bldDepth.toFixed(1)}m = ${bldArea}m²
Floors: ${numberOfFloors + 1} (Ground + ${numberOfFloors} upper)
Total Built Area: ~${totalArea}m²

ROOMS REQUIRED:
• Bedrooms: ${bedrooms} (include 1 Master Bedroom)
• Bathrooms: ${bathrooms} (1 en-suite with Master)
• Majlis: ${majlis} (ground floor required)
• Maid Rooms: ${maidRooms}
• Balconies: ${balconies}
• Parking: ${garages} car(s)
${additionalRequirements ? `• Additional: ${additionalRequirements}` : ""}

═══════════════════════════════════════════════════════
RESPOND WITH VALID JSON ONLY (no markdown, no extra text):
═══════════════════════════════════════════════════════
{
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
        "width": <meters - use REAL dimensions from reference>,
        "length": <meters - use REAL dimensions from reference>,
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
      "rooms": [ <same structure as groundFloor.rooms> ]
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
