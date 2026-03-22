// Auto-generated from Saudi villa DXF files
// Source: C:\Users\shuqa\Downloads\مخططات\فلة 1 & فلة 2
// Generated: 2026-03-22T18:26:17.953Z
// Land: 12.5m × 36m | 3 floors | Coverage: 52.5%

export interface RoomTemplate {
  nameAr: string;
  nameEn: string;
  type: string;
  x: number;   // meters from building left edge
  y: number;   // meters from building front
  w: number;   // width in meters
  h: number;   // depth in meters
  area: number;
  floor: number; // 0=ground, 1=first, 2=second
}

export interface VillaTemplate {
  id: string;
  nameAr: string;
  nameEn: string;
  landWidth: number;
  landDepth: number;
  buildingWidth: number;  // land − setbacks
  buildingDepth: number;
  rooms: RoomTemplate[];
}

export const VILLA_TEMPLATES: VillaTemplate[] = [
  {
    id: "villa_1",
    nameAr: "فيلا 1 — 12.5م × 36م",
    nameEn: "Villa Type 1 — 12.5m × 36m",
    landWidth: 12.5,
    landDepth: 36,
    buildingWidth: 11.12,
    buildingDepth: 35.18,
    rooms: [
      { nameAr: "مخزن", nameEn: "storage", type: "storage", x: 4.52, y: 6.82, w: 2, h: 2.85, area: 5.7, floor: 1 },
      { nameAr: "بهو المدخل", nameEn: "entrance", type: "entrance", x: 4.72, y: 6.82, w: 6.4, h: 5.2, area: 33.3, floor: 1 },
      { nameAr: "صالة عائلية", nameEn: "family_living", type: "family_living", x: 4.52, y: 12.82, w: 6.6, h: 3.2, area: 21.1, floor: 1 },
      { nameAr: "ممر", nameEn: "corridor", type: "corridor", x: 4.72, y: 16.82, w: 6.4, h: 1.1, area: 7, floor: 1 },
      { nameAr: "صالة عائلية", nameEn: "family_living", type: "family_living", x: 4.72, y: 18.72, w: 6.4, h: 3.2, area: 20.5, floor: 1 },
      { nameAr: "غرفة نوم", nameEn: "bedroom", type: "bedroom", x: 4.72, y: 22.72, w: 6.4, h: 3.1, area: 19.8, floor: 1 },
      { nameAr: "حمام", nameEn: "bathroom", type: "bathroom", x: 7.92, y: 26.62, w: 3.2, h: 1.1, area: 3.5, floor: 1 },
      { nameAr: "صالة عائلية", nameEn: "family_living", type: "family_living", x: 4.67, y: 26.62, w: 6.45, h: 5.8, area: 37.4, floor: 1 },
      { nameAr: "غسيل", nameEn: "W/D", type: "laundry", x: 2.62, y: 33.22, w: 8.5, h: 1.4, area: 11.9, floor: 1 },
      { nameAr: "حمام", nameEn: "bathroom", type: "bathroom", x: 4.52, y: 23.42, w: 1.9, h: 2.25, area: 4.3, floor: 2 },
      { nameAr: "حمام", nameEn: "bathroom", type: "bathroom", x: 7.92, y: 26.62, w: 3.2, h: 1.1, area: 3.5, floor: 2 },
      { nameAr: "ممر", nameEn: "corridor", type: "corridor", x: 2.62, y: 7.38, w: 0.95, h: 11, area: 10.4, floor: 0 },
      { nameAr: "حمام", nameEn: "bathroom", type: "bathroom", x: 4.52, y: 7.38, w: 1.7, h: 2.9, area: 4.9, floor: 0 },
      { nameAr: "دورة مياه", nameEn: "toilet", type: "toilet", x: 9.52, y: 7.38, w: 1.6, h: 1.3, area: 2.1, floor: 0 },
      { nameAr: "ممر", nameEn: "corridor", type: "corridor", x: 4.72, y: 11.18, w: 6.4, h: 1.5, area: 9.6, floor: 0 },
      { nameAr: "ممر", nameEn: "corridor", type: "corridor", x: 4.72, y: 13.28, w: 6.4, h: 1.8, area: 11.5, floor: 0 },
      { nameAr: "ممر", nameEn: "corridor", type: "corridor", x: 4.72, y: 17.38, w: 6.4, h: 1.2, area: 7.7, floor: 0 },
      { nameAr: "صالة عائلية", nameEn: "Living room", type: "family_living", x: 4.72, y: 19.18, w: 6.4, h: 6.1, area: 39, floor: 0 },
      { nameAr: "موقف سيارة", nameEn: "parking", type: "parking", x: 2.62, y: 19.33, w: 7.2, h: 15.85, area: 114.1, floor: 0 },
      { nameAr: "صالة عائلية", nameEn: "family_living", type: "family_living", x: 4.72, y: 25.98, w: 6.4, h: 7, area: 44.8, floor: 0 },
      { nameAr: "ممر", nameEn: "corridor", type: "corridor", x: 4.52, y: 33.78, w: 6.6, h: 1.4, area: 9.2, floor: 0 },
    ],
  },
  {
    id: "villa_2",
    nameAr: "فيلا 2 — 12.5م × 36م",
    nameEn: "Villa Type 2 — 12.5m × 36m",
    landWidth: 12.5,
    landDepth: 36,
    buildingWidth: 11.12,
    buildingDepth: 35.18,
    rooms: [
      { nameAr: "مخزن", nameEn: "storage", type: "storage", x: 4.52, y: 6.82, w: 2, h: 2.85, area: 5.7, floor: 1 },
      { nameAr: "بهو المدخل", nameEn: "entrance", type: "entrance", x: 4.72, y: 6.82, w: 6.4, h: 5.2, area: 33.3, floor: 1 },
      { nameAr: "صالة عائلية", nameEn: "family_living", type: "family_living", x: 4.52, y: 12.82, w: 6.6, h: 3.2, area: 21.1, floor: 1 },
      { nameAr: "ممر", nameEn: "corridor", type: "corridor", x: 4.72, y: 16.82, w: 6.4, h: 1.1, area: 7, floor: 1 },
      { nameAr: "صالة عائلية", nameEn: "family_living", type: "family_living", x: 4.72, y: 18.72, w: 6.4, h: 3.2, area: 20.5, floor: 1 },
      { nameAr: "غرفة نوم", nameEn: "bedroom", type: "bedroom", x: 4.72, y: 22.72, w: 6.4, h: 3.1, area: 19.8, floor: 1 },
      { nameAr: "حمام", nameEn: "bathroom", type: "bathroom", x: 7.92, y: 26.62, w: 3.2, h: 1.1, area: 3.5, floor: 1 },
      { nameAr: "صالة عائلية", nameEn: "family_living", type: "family_living", x: 4.67, y: 26.62, w: 6.45, h: 5.8, area: 37.4, floor: 1 },
      { nameAr: "غسيل", nameEn: "W/D", type: "laundry", x: 2.62, y: 33.22, w: 8.5, h: 1.4, area: 11.9, floor: 1 },
      { nameAr: "حمام", nameEn: "bathroom", type: "bathroom", x: 4.52, y: 23.42, w: 1.9, h: 2.25, area: 4.3, floor: 2 },
      { nameAr: "حمام", nameEn: "bathroom", type: "bathroom", x: 7.92, y: 26.62, w: 3.2, h: 1.1, area: 3.5, floor: 2 },
      { nameAr: "ممر", nameEn: "corridor", type: "corridor", x: 2.62, y: 7.38, w: 0.95, h: 11, area: 10.4, floor: 0 },
      { nameAr: "حمام", nameEn: "bathroom", type: "bathroom", x: 4.52, y: 7.38, w: 1.7, h: 2.9, area: 4.9, floor: 0 },
      { nameAr: "دورة مياه", nameEn: "toilet", type: "toilet", x: 9.52, y: 7.38, w: 1.6, h: 1.3, area: 2.1, floor: 0 },
      { nameAr: "ممر", nameEn: "corridor", type: "corridor", x: 4.72, y: 11.18, w: 6.4, h: 1.5, area: 9.6, floor: 0 },
      { nameAr: "ممر", nameEn: "corridor", type: "corridor", x: 4.72, y: 13.28, w: 6.4, h: 1.8, area: 11.5, floor: 0 },
      { nameAr: "ممر", nameEn: "corridor", type: "corridor", x: 4.72, y: 17.38, w: 6.4, h: 1.2, area: 7.7, floor: 0 },
      { nameAr: "صالة عائلية", nameEn: "Living room", type: "family_living", x: 4.72, y: 19.18, w: 6.4, h: 6.1, area: 39, floor: 0 },
      { nameAr: "موقف سيارة", nameEn: "parking", type: "parking", x: 2.62, y: 19.33, w: 7.2, h: 15.85, area: 114.1, floor: 0 },
      { nameAr: "صالة عائلية", nameEn: "family_living", type: "family_living", x: 4.72, y: 25.98, w: 6.4, h: 7, area: 44.8, floor: 0 },
      { nameAr: "ممر", nameEn: "corridor", type: "corridor", x: 4.52, y: 33.78, w: 6.6, h: 1.4, area: 9.2, floor: 0 },
    ],
  },
];

/**
 * Find the best-matching template for the given land dimensions.
 * Returns the template whose land area is closest to the request.
 */
export function findBestTemplate(landWidth: number, landDepth: number): VillaTemplate {
  const target = landWidth * landDepth;
  let best = VILLA_TEMPLATES[0];
  let bestDiff = Infinity;
  for (const t of VILLA_TEMPLATES) {
    const diff = Math.abs(t.landWidth * t.landDepth - target);
    if (diff < bestDiff) { bestDiff = diff; best = t; }
  }
  return best;
}

/**
 * Scale a template's rooms to fit a target building footprint,
 * adding setback offsets so room coords are land-absolute (matching generateZoneLayout output).
 *
 * @param template  - source VillaTemplate
 * @param targetBW  - target building width in meters (land − side setbacks)
 * @param targetBD  - target building depth in meters (land − front/back setbacks)
 * @param sX        - side setback offset (added to room x)
 * @param sY        - back setback offset (added to room y)
 * @param maxFloors - only include rooms on floors 0..maxFloors-1
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

  // Normalize per-floor: each floor's rooms are shifted so their bounding box
  // starts at (0,0), then scaled to fill the target building footprint exactly.
  // This removes the "front setback gap" baked into the DXF coordinates.
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

    // Remove rooms whose bbox area is > 60% of floor area (parking carport overlay)
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
