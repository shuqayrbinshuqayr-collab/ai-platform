// Saudi Villa Templates — extracted from real architectural plans
// Model C (273 m²): Wide plot, 2 bedrooms + master, large صالون
// Model A (310 m²): Deep plot, 3 bedrooms + master, جلسة خارجية, first-floor living

export interface RoomTemplate {
  nameAr: string;
  nameEn: string;
  type: string;
  x: number;   // meters from building left edge
  y: number;   // meters from building front edge
  w: number;   // width in meters
  h: number;   // depth in meters
  area: number;
  floor: number; // 0=ground, 1=first, 2=roof
}

export interface VillaTemplate {
  id: string;
  nameAr: string;
  nameEn: string;
  totalArea: number;
  plotShape: "wide" | "deep";
  bedroomCount: number; // not counting master
  landWidth: number;
  landDepth: number;
  buildingWidth: number;
  buildingDepth: number;
  rooms: RoomTemplate[];
}

// ─── Model C — Wide Plot Villa (273 m²) ──────────────────────────────────────
// Ground floor: entrance, salon, dining, living (full-width), kitchen, guest bath, laundry
// First floor: master suite (bedroom + bath + closet), 2 bedrooms, shared bath, terrace
// Roof: staircase access
//
// Ground floor layout (building ref 9.6m × 13.3m):
//   ┌──────────┬──────┬───────────┐
//   │ Entrance │ GBath│  Salon    │
//   │ 2.7×3.15 │2×1.55│  4.5×6   │
//   ├──────────┤──────┤           │
//   │ LivBath  │Lndry │           │
//   │ 2.9×1.05 │2×1.6 │           │
//   ├──────────┴──────┤           │
//   │   Dining        ├───────────┤
//   │   4.9×4.5       │  Kitchen  │
//   │                 │  4.5×3.2  │
//   ├─────────────────┴───────────┤
//   │       Living Room           │
//   │       9.6 × 4.1             │
//   └─────────────────────────────┘

const MODEL_C: VillaTemplate = {
  id: "model_c",
  nameAr: "نموذج C — فيلا عريضة ٢٧٣م²",
  nameEn: "Model C — Wide Villa 273m²",
  totalArea: 273,
  plotShape: "wide",
  bedroomCount: 2,
  landWidth: 12.5,
  landDepth: 25,
  buildingWidth: 9.6,
  buildingDepth: 13.3,
  rooms: [
    // ── Ground Floor (0) ──────────────────────────────────────────────────────
    { nameAr: "المدخل",       nameEn: "Entrance",     type: "entrance",       x: 0,    y: 0,    w: 2.7,  h: 3.15, area: 8.51,  floor: 0 },
    { nameAr: "حمام ضيوف",    nameEn: "Guest Bath",   type: "bathroom",       x: 2.7,  y: 0,    w: 2.0,  h: 1.55, area: 3.1,   floor: 0 },
    { nameAr: "مغسلة",        nameEn: "Laundry",      type: "laundry",        x: 2.7,  y: 1.55, w: 2.0,  h: 1.6,  area: 2.8,   floor: 0 },
    { nameAr: "الصالون",      nameEn: "Salon",        type: "majlis",         x: 5.1,  y: 0,    w: 4.5,  h: 6.0,  area: 27.0,  floor: 0 },
    { nameAr: "حمام المعيشة", nameEn: "Living Bath",  type: "bathroom",       x: 0,    y: 3.15, w: 2.9,  h: 1.05, area: 3.05,  floor: 0 },
    { nameAr: "صالة الطعام",  nameEn: "Dining Hall",  type: "dining",         x: 0,    y: 4.2,  w: 4.9,  h: 4.5,  area: 22.05, floor: 0 },
    { nameAr: "مطبخ",         nameEn: "Kitchen",      type: "kitchen",        x: 5.1,  y: 6.0,  w: 4.5,  h: 3.2,  area: 14.4,  floor: 0 },
    { nameAr: "صالة المعيشة", nameEn: "Living Room",  type: "family_living",  x: 0,    y: 9.2,  w: 9.6,  h: 4.1,  area: 39.36, floor: 0 },

    // ── First Floor (1) ───────────────────────────────────────────────────────
    { nameAr: "السلم",                nameEn: "Staircase",       type: "staircase",      x: 0,    y: 0,    w: 4.9,  h: 4.1,  area: 20.09, floor: 1 },
    { nameAr: "تراس",                 nameEn: "Terrace",         type: "balcony",        x: 4.9,  y: 0,    w: 4.6,  h: 3.2,  area: 14.72, floor: 1 },
    { nameAr: "حمام رئيسي",           nameEn: "Master Bath",     type: "bathroom",       x: 4.9,  y: 3.2,  w: 3.0,  h: 1.7,  area: 5.1,   floor: 1 },
    { nameAr: "موزع السلم",           nameEn: "Stair Hall",      type: "distributor",    x: 0,    y: 4.1,  w: 3.35, h: 1.7,  area: 5.7,   floor: 1 },
    { nameAr: "موزع داخلي",           nameEn: "Master Hall",     type: "corridor",       x: 3.35, y: 4.1,  w: 1.7,  h: 2.15, area: 3.66,  floor: 1 },
    { nameAr: "غرفة ملابس",           nameEn: "Walk-in Closet",  type: "storage",        x: 5.05, y: 4.9,  w: 3.0,  h: 1.75, area: 5.25,  floor: 1 },
    { nameAr: "غرفة النوم الرئيسية",  nameEn: "Master Bedroom",  type: "master_bedroom", x: 0,    y: 5.8,  w: 4.9,  h: 4.0,  area: 19.6,  floor: 1 },
    { nameAr: "حمام مشترك",           nameEn: "Shared Bath",     type: "bathroom",       x: 5.05, y: 6.65, w: 4.0,  h: 3.15, area: 12.6,  floor: 1 },
    { nameAr: "غرفة نوم ١",           nameEn: "Bedroom 1",       type: "bedroom",        x: 0,    y: 9.8,  w: 4.5,  h: 3.9,  area: 17.55, floor: 1 },
    { nameAr: "غرفة نوم ٢",           nameEn: "Bedroom 2",       type: "bedroom",        x: 4.6,  y: 9.8,  w: 4.5,  h: 3.9,  area: 17.55, floor: 1 },

    // ── Roof (2) ──────────────────────────────────────────────────────────────
    { nameAr: "السلم",  nameEn: "Staircase", type: "staircase", x: 0, y: 0, w: 4.9, h: 4.1, area: 20.09, floor: 2 },
    { nameAr: "غرفة غسيل", nameEn: "Utility", type: "laundry", x: 4.9, y: 0, w: 3.0, h: 2.5, area: 7.5, floor: 2 },
  ],
};

// ─── Model A — Deep Plot Villa (310 m²) ──────────────────────────────────────
// Ground floor: entrance + distributor, salon, dining, kitchen, outdoor seating,
//               living (full-width), guest bath, laundry
// First floor: stairs, first-floor living, master suite, 3 bedrooms,
//              bedroom terraces, bedroom 3 bath, shared bath
// Roof: staircase access
//
// Ground floor layout (building ref 7.6m × 19.45m):
//   ┌──────┬──────┬──────┬──────┐
//   │Entr  │Dist  │GBath │Lndry │
//   │2.3×1.8│1.6×1.8│1.9×1.8│1.8×1.6│
//   ├──────┴──────┼──────┴──────┤
//   │  Dining     │   Salon     │
//   │  3.7×4.5    │   3.7×6.3   │
//   │             │             │
//   ├─────────────┤             │
//   │  Kitchen    ├─────────────┤
//   │  3.7×5.4    │ Outdoor Sit │
//   │             │  3.7×2.8    │
//   ├─────────────┴─────────────┤
//   │  LivBath 2.33×1.45        │
//   ├───────────────────────────┤
//   │      Living Room          │
//   │      7.6 × 6.3            │
//   └───────────────────────────┘

const MODEL_A: VillaTemplate = {
  id: "model_a",
  nameAr: "نموذج A — فيلا عميقة ٣١٠م²",
  nameEn: "Model A — Deep Villa 310m²",
  totalArea: 310,
  plotShape: "deep",
  bedroomCount: 3,
  landWidth: 10,
  landDepth: 30,
  buildingWidth: 7.6,
  buildingDepth: 19.45,
  rooms: [
    // ── Ground Floor (0) ──────────────────────────────────────────────────────
    { nameAr: "المدخل",        nameEn: "Entrance",         type: "entrance",      x: 0,    y: 0,    w: 2.3,  h: 1.8,  area: 4.14,  floor: 0 },
    { nameAr: "موزع المدخل",   nameEn: "Entry Hall",       type: "distributor",   x: 2.3,  y: 0,    w: 1.6,  h: 1.8,  area: 2.88,  floor: 0 },
    { nameAr: "حمام ضيوف",     nameEn: "Guest Bath",       type: "bathroom",      x: 3.9,  y: 0,    w: 1.9,  h: 1.8,  area: 3.42,  floor: 0 },
    { nameAr: "مغسلة",         nameEn: "Laundry",          type: "laundry",       x: 5.8,  y: 0,    w: 1.8,  h: 1.6,  area: 3.04,  floor: 0 },
    { nameAr: "صالة الطعام",   nameEn: "Dining Hall",      type: "dining",        x: 0,    y: 1.8,  w: 3.7,  h: 4.5,  area: 16.65, floor: 0 },
    { nameAr: "الصالون",       nameEn: "Salon",            type: "majlis",        x: 3.9,  y: 1.8,  w: 3.7,  h: 6.3,  area: 23.31, floor: 0 },
    { nameAr: "مطبخ",          nameEn: "Kitchen",          type: "kitchen",       x: 0,    y: 6.3,  w: 3.7,  h: 5.4,  area: 19.98, floor: 0 },
    { nameAr: "جلسة خارجية",   nameEn: "Outdoor Seating",  type: "balcony",       x: 3.9,  y: 8.1,  w: 3.7,  h: 2.8,  area: 10.36, floor: 0 },
    { nameAr: "حمام المعيشة",  nameEn: "Living Bath",      type: "bathroom",      x: 0,    y: 11.7, w: 2.33, h: 1.45, area: 3.38,  floor: 0 },
    { nameAr: "صالة المعيشة",  nameEn: "Living Room",      type: "family_living", x: 0,    y: 13.15,w: 7.6,  h: 6.3,  area: 47.88, floor: 0 },

    // ── First Floor (1) ───────────────────────────────────────────────────────
    { nameAr: "السلم",                nameEn: "Staircase",        type: "staircase",      x: 0,    y: 0,     w: 3.7,  h: 4.73, area: 17.5,  floor: 1 },
    { nameAr: "صالة المعيشة",         nameEn: "Living Room",      type: "family_living",  x: 3.9,  y: 0,     w: 3.7,  h: 4.35, area: 16.10, floor: 1 },
    { nameAr: "غرفة النوم الرئيسية",  nameEn: "Master Bedroom",   type: "master_bedroom", x: 0,    y: 4.73,  w: 3.7,  h: 4.1,  area: 15.17, floor: 1 },
    { nameAr: "تراس المعيشة",         nameEn: "Living Terrace",   type: "balcony",        x: 3.9,  y: 4.35,  w: 2.9,  h: 2.4,  area: 6.96,  floor: 1 },
    { nameAr: "حمام رئيسي",           nameEn: "Master Bath",      type: "bathroom",       x: 3.9,  y: 6.75,  w: 2.05, h: 2.5,  area: 5.13,  floor: 1 },
    { nameAr: "غرفة نوم ١",           nameEn: "Bedroom 1",        type: "bedroom",        x: 0,    y: 8.83,  w: 3.7,  h: 3.9,  area: 14.43, floor: 1 },
    { nameAr: "تراس غرفة نوم",        nameEn: "Bedroom Terrace",  type: "balcony",        x: 3.9,  y: 9.25,  w: 3.7,  h: 2.2,  area: 8.14,  floor: 1 },
    { nameAr: "غرفة نوم ٢",           nameEn: "Bedroom 2",        type: "bedroom",        x: 0,    y: 12.73, w: 3.7,  h: 3.9,  area: 14.43, floor: 1 },
    { nameAr: "غرفة نوم ٣",           nameEn: "Bedroom 3",        type: "bedroom",        x: 3.9,  y: 11.45, w: 3.7,  h: 4.05, area: 14.99, floor: 1 },
    { nameAr: "حمام غرفة نوم ٣",      nameEn: "Bedroom 3 Bath",   type: "bathroom",       x: 3.9,  y: 15.5,  w: 2.3,  h: 2.1,  area: 4.83,  floor: 1 },
    { nameAr: "حمام مشترك",           nameEn: "Shared Bath",      type: "bathroom",       x: 0,    y: 16.63, w: 2.3,  h: 1.7,  area: 3.91,  floor: 1 },

    // ── Roof (2) ──────────────────────────────────────────────────────────────
    { nameAr: "السلم",      nameEn: "Staircase", type: "staircase", x: 0,   y: 0, w: 3.7, h: 4.73, area: 17.5, floor: 2 },
    { nameAr: "غرفة غسيل",  nameEn: "Utility",   type: "laundry",   x: 3.9, y: 0, w: 2.5, h: 2.5,  area: 6.25, floor: 2 },
  ],
};

export const VILLA_TEMPLATES: VillaTemplate[] = [MODEL_C, MODEL_A];

/**
 * Select the best template based on plot aspect ratio.
 * Wide plots (W/D >= 0.42) → Model C (wider building, 2 bedrooms)
 * Deep plots (W/D < 0.42) → Model A (narrower/deeper building, 3 bedrooms)
 */
export function findBestTemplate(landWidth: number, landDepth: number): VillaTemplate {
  const ratio = landWidth / Math.max(landDepth, 1);
  return ratio >= 0.42 ? MODEL_C : MODEL_A;
}

/**
 * Scale a template's rooms to fit a target building footprint.
 * Per-floor normalization: each floor's bounding box is shifted to (0,0)
 * then scaled to fill (targetBW × targetBD), with setback offsets applied.
 */
export function scaleTemplate(
  template: VillaTemplate,
  targetBW: number,
  targetBD: number,
  sX: number = 0,
  sY: number = 0,
  maxFloors: number = 3,
): RoomTemplate[] {
  const eligible = template.rooms.filter(r => r.floor < maxFloors);
  if (!eligible.length) return [];

  const floors = Array.from(new Set(eligible.map(r => r.floor))).sort((a, b) => a - b);
  const result: RoomTemplate[] = [];

  for (const f of floors) {
    const fRooms = eligible.filter(r => r.floor === f);

    // Bounding box of this floor's rooms
    const minX = Math.min(...fRooms.map(r => r.x));
    const minY = Math.min(...fRooms.map(r => r.y));
    const maxX = Math.max(...fRooms.map(r => r.x + r.w));
    const maxY = Math.max(...fRooms.map(r => r.y + r.h));
    const normW = maxX - minX || 1;
    const normH = maxY - minY || 1;

    const sx = targetBW / normW;
    const sy = targetBD / normH;

    // Remove rooms whose area is > 60% of floor area (parking overlay artifact)
    const floorArea = normW * normH;
    const filtered = fRooms.filter(r => (r.w * r.h) / floorArea < 0.6);

    for (const r of filtered) {
      result.push({
        ...r,
        x:    parseFloat(((r.x - minX) * sx + sX).toFixed(2)),
        y:    parseFloat(((r.y - minY) * sy + sY).toFixed(2)),
        w:    parseFloat((r.w * sx).toFixed(2)),
        h:    parseFloat((r.h * sy).toFixed(2)),
        area: parseFloat((r.w * sx * r.h * sy).toFixed(1)),
      });
    }
  }
  return result;
}
