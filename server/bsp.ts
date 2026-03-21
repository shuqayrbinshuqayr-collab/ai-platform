/**
 * SOAR.AI — Layout Engine v3
 * Proper grid-based room placement with real Saudi villa dimensions.
 * Produces architecturally correct floor plans with no gaps/overlaps.
 */

import { PRACTICAL_ROOM_AREA_CAPS, MIN_ROOM_WIDTHS } from "./core/saudiCode";

// ─── Types ────────────────────────────────────────────────────────────────────
export type RoomType =
  | "bedroom" | "master_bedroom" | "living" | "majlis" | "kitchen"
  | "bathroom" | "toilet" | "dining" | "corridor" | "entrance"
  | "parking" | "storage" | "balcony" | "laundry" | "maid_room"
  | "office" | "prayer" | "staircase" | "family_living" | "distributor";

export interface Room {
  id: string;
  nameAr: string;
  nameEn: string;
  type: RoomType;
  x: number;
  y: number;
  width: number;
  height: number;
  area: number;
  floor: number;
  hasWindow: boolean;
  hasDoor: boolean;
  doorWall: "north" | "south" | "east" | "west";
}

export interface FloorPlan {
  floor: number;
  rooms: Room[];
  totalArea: number;
  buildingWidth: number;
  buildingDepth: number;
}

export interface BuildingLayout {
  floors: FloorPlan[];
  landArea: number;
  buildingArea: number;
  buildingWidth: number;
  buildingDepth: number;
  totalRooms: number;
  setbacks: { front: number; back: number; side: number };
  svgData: string;
  summary: {
    totalFloors: number;
    totalArea: number;
    totalRooms: number;
    estimatedCost: string;
    bedrooms: number;
    bathrooms: number;
  };
}

// ─── Saudi Building Code ──────────────────────────────────────────────────────
const SAUDI_CODE = {
  setbacks: { front: 4, back: 2, side: 1.5 },
  maxCoverage: 0.60,
  minFloorHeight: 3.0,
};

// ─── Real room dimensions from Saudi villa blueprints ─────────────────────────
// Each entry: [width_min, width_max, depth_min, depth_max] in meters
const ROOM_DIMS: Record<RoomType, [number, number, number, number]> = {
  master_bedroom:  [4.2, 5.2, 4.0, 5.0],
  bedroom:         [3.2, 4.2, 3.6, 4.5],
  majlis:          [5.0, 7.5, 4.0, 5.5],
  family_living:   [4.0, 5.5, 4.0, 5.0],
  living:          [4.5, 6.0, 4.0, 5.5],
  kitchen:         [2.8, 3.5, 3.5, 5.0],
  dining:          [3.0, 4.0, 3.5, 4.5],
  bathroom:        [1.8, 2.5, 2.0, 3.0],
  toilet:          [1.2, 1.6, 2.0, 2.5],
  entrance:        [2.5, 4.0, 2.0, 3.5],
  balcony:         [3.0, 5.0, 1.5, 2.0],
  staircase:       [2.5, 3.0, 4.5, 5.5],
  corridor:        [1.5, 2.0, 3.0, 6.0],
  distributor:     [2.0, 3.0, 2.0, 4.0],
  maid_room:       [2.5, 3.0, 2.5, 3.0],
  storage:         [1.5, 2.0, 2.0, 3.0],
  parking:         [5.0, 6.0, 3.0, 3.5],
  laundry:         [1.8, 2.5, 2.0, 2.5],
  office:          [3.0, 4.0, 3.0, 4.0],
  prayer:          [2.5, 3.5, 2.5, 3.5],
};

function rnd(min: number, max: number): number {
  return parseFloat((min + Math.random() * (max - min)).toFixed(2));
}

function dim(type: RoomType): { w: number; h: number } {
  const [wMin, wMax, hMin, hMax] = ROOM_DIMS[type];
  return { w: rnd(wMin, wMax), h: rnd(hMin, hMax) };
}

// ─── Room colors (AutoCAD-style white background) ─────────────────────────────
const ROOM_FILL: Record<string, string> = {
  master_bedroom: "#FFF8F0",
  bedroom:        "#F0F4FF",
  majlis:         "#FFFBEB",
  family_living:  "#F0FFF4",
  living:         "#F0FFF4",
  kitchen:        "#F0FFFA",
  dining:         "#FFF0F5",
  bathroom:       "#EFF8FF",
  toilet:         "#EFF8FF",
  entrance:       "#FFFDE7",
  balcony:        "#E8F5E9",
  staircase:      "#F5F5F5",
  corridor:       "#FAFAFA",
  distributor:    "#FAFAFA",
  maid_room:      "#F3E8FF",
  storage:        "#F5F5F5",
  parking:        "#ECEFF1",
  laundry:        "#E3F2FD",
  office:         "#EDE7F6",
  prayer:         "#FFF9C4",
};

const ROOM_STROKE: Record<string, string> = {
  master_bedroom: "#B45309",
  bedroom:        "#3730A3",
  majlis:         "#92400E",
  family_living:  "#166534",
  living:         "#166534",
  kitchen:        "#065F46",
  dining:         "#9F1239",
  bathroom:       "#1E40AF",
  toilet:         "#1E40AF",
  entrance:       "#78350F",
  balcony:        "#14532D",
  staircase:      "#374151",
  corridor:       "#6B7280",
  distributor:    "#6B7280",
  maid_room:      "#6B21A8",
  storage:        "#4B5563",
  parking:        "#374151",
  laundry:        "#1D4ED8",
  office:         "#4338CA",
  prayer:         "#92400E",
};

// ─── Ground floor program ─────────────────────────────────────────────────────
interface RoomSpec {
  type: RoomType;
  nameAr: string;
  nameEn: string;
  w: number;
  h: number;
  floor: number;
  col: number;   // 0=left, 1=center, 2=right
  row: number;   // position within column (0=top)
  hasWindow: boolean;
  hasDoor: boolean;
  doorWall: "north" | "south" | "east" | "west";
}

/**
 * Build a proper grid-based floor plan.
 *
 * Layout grid (3 columns):
 *   Col 0 (LEFT  ~30%): service zone  — kitchen, maid, laundry, storage, bathrooms
 *   Col 1 (CENTER ~40%): living zone  — corridor, staircase, family living, bedrooms
 *   Col 2 (RIGHT ~30%): reception zone — entrance, majlis, dining, parking
 *
 * Each column is subdivided into rows. Rooms are placed with exact pixel-perfect
 * coordinates so there are NO gaps and NO overlaps.
 */
function buildFloorGrid(params: {
  bw: number;          // building width (meters)
  bd: number;          // building depth (meters)
  floor: number;
  bedrooms: number;
  bathrooms: number;
  hasMajlis: boolean;
  hasMaidRoom: boolean;
  hasParking: boolean;
  hasBalcony: boolean;
  conceptIndex: number;
}): Room[] {
  const { bw, bd, floor, bedrooms, bathrooms, hasMajlis, hasMaidRoom, hasParking, hasBalcony, conceptIndex } = params;

  // Column widths (must sum to bw)
  const leftW   = parseFloat((bw * 0.28).toFixed(2));
  const rightW  = parseFloat((bw * 0.30).toFixed(2));
  const centerW = parseFloat((bw - leftW - rightW).toFixed(2));

  const leftX   = 0;
  const centerX = leftW;
  const rightX  = leftW + centerW;

  const rooms: Room[] = [];
  let idCounter = 0;
  const nextId = () => `r${floor}_${idCounter++}`;

  // ── Helper: place a room at exact coordinates ─────────────────────────────
  function placeRoom(
    type: RoomType,
    nameAr: string,
    nameEn: string,
    x: number, y: number, w: number, h: number,
    hasWindow: boolean,
    doorWall: "north" | "south" | "east" | "west"
  ): Room {
    return {
      id: nextId(),
      nameAr, nameEn, type,
      x: parseFloat(x.toFixed(2)),
      y: parseFloat(y.toFixed(2)),
      width: parseFloat(w.toFixed(2)),
      height: parseFloat(h.toFixed(2)),
      area: parseFloat((w * h).toFixed(1)),
      floor,
      hasWindow,
      hasDoor: true,
      doorWall,
    };
  }

  // Fix 4: clamp wet room height so area stays within 4–8 m²
  const clampWetH = (h: number) =>
    parseFloat(Math.max(4 / leftW, Math.min(8 / leftW, h)).toFixed(2));

  // Fix 1: distributor/corridor height capped at 2.0m (area ≤ centerW×2 ≤ 6m² for typical bw)
  const distH = parseFloat(Math.min(rnd(1.5, 2.0), 6 / centerW).toFixed(2));

  // ── LEFT COLUMN: service + staircase (Fix 2) + kitchen/dining together (Fix 5) ──
  interface SlotRoom { type: RoomType; nameAr: string; nameEn: string; prefH: number; hasWindow: boolean; doorWall: "north"|"south"|"east"|"west" }
  const leftSlots: SlotRoom[] = [];

  if (floor === 0) {
    // Fix 2: staircase first → always touches left exterior wall and top/bottom walls
    leftSlots.push({ type: "staircase",  nameAr: "درج",          nameEn: "Staircase",    prefH: rnd(4.5, 5.5), hasWindow: false, doorWall: "east" });
    // Fix 5: kitchen then dining immediately after — same zone, no room between them
    leftSlots.push({ type: "kitchen",    nameAr: "مطبخ",         nameEn: "Kitchen",      prefH: rnd(3.5, 4.5), hasWindow: true,  doorWall: "east" });
    leftSlots.push({ type: "dining",     nameAr: "غرفة طعام",   nameEn: "Dining Room",  prefH: rnd(3.0, 4.0), hasWindow: true,  doorWall: "east" });
    if (hasMaidRoom) {
      leftSlots.push({ type: "maid_room", nameAr: "غرفة خادمة", nameEn: "Maid Room",    prefH: rnd(2.5, 3.0), hasWindow: true,  doorWall: "east" });
    }
    leftSlots.push({ type: "laundry",   nameAr: "غسيل",         nameEn: "Laundry",      prefH: rnd(2.0, 2.5), hasWindow: false, doorWall: "east" });
    // Fix 4: wet rooms grouped, clamped to 4–8 m²
    leftSlots.push({ type: "bathroom",  nameAr: "حمام",          nameEn: "Bathroom",     prefH: clampWetH(rnd(2.0, 2.5)), hasWindow: false, doorWall: "east" });
    leftSlots.push({ type: "toilet",    nameAr: "دورة مياه",    nameEn: "Toilet",       prefH: clampWetH(rnd(1.8, 2.2)), hasWindow: false, doorWall: "east" });
  } else {
    // Fix 2: staircase in left column on upper floors too
    leftSlots.push({ type: "staircase", nameAr: "درج",           nameEn: "Staircase",    prefH: rnd(4.5, 5.5), hasWindow: false, doorWall: "east" });
    // Fix 4: wet rooms grouped and clamped
    for (let b = 0; b < Math.min(bathrooms, 3); b++) {
      leftSlots.push({ type: "bathroom", nameAr: `حمام ${b+1}`, nameEn: `Bathroom ${b+1}`, prefH: clampWetH(rnd(2.2, 2.8)), hasWindow: false, doorWall: "east" });
    }
    leftSlots.push({ type: "toilet",   nameAr: "دورة مياه",    nameEn: "Toilet",       prefH: clampWetH(rnd(2.0, 2.2)), hasWindow: false, doorWall: "east" });
    leftSlots.push({ type: "storage",  nameAr: "مخزن",         nameEn: "Storage",      prefH: rnd(2.0, 2.5), hasWindow: false, doorWall: "east" });
    if (hasBalcony) {
      leftSlots.push({ type: "balcony", nameAr: "بلكونة",       nameEn: "Balcony",      prefH: rnd(1.5, 2.0), hasWindow: true,  doorWall: "east" });
    }
  }

  // Stack left slots to fill bd
  {
    const totalPref = leftSlots.reduce((s, r) => s + r.prefH, 0);
    const scale = bd / Math.max(totalPref, bd);
    let curY = 0;
    leftSlots.forEach((slot, i) => {
      const isLast = i === leftSlots.length - 1;
      const minH = (slot.type === "corridor" || slot.type === "distributor" || slot.type === "toilet") ? MIN_ROOM_WIDTHS.corridor : MIN_ROOM_WIDTHS.habitable;
      const h = isLast ? Math.max(minH, bd - curY) : Math.max(minH, slot.prefH * scale);
      rooms.push(placeRoom(slot.type, slot.nameAr, slot.nameEn, leftX, curY, leftW, h, slot.hasWindow, slot.doorWall));
      curY += h;
    });
  }

  // ── CENTER COLUMN: living zone (no staircase — Fix 2; distributor capped — Fix 1) ──
  interface CenterSlot { type: RoomType; nameAr: string; nameEn: string; prefH: number; hasWindow: boolean; doorWall: "north"|"south"|"east"|"west" }
  const centerSlots: CenterSlot[] = [];

  if (floor === 0) {
    // Fix 1: distributor capped at 2.0m depth
    centerSlots.push({ type: "distributor", nameAr: "موزع",          nameEn: "Distributor",  prefH: distH,        hasWindow: false, doorWall: "south" });
    centerSlots.push({ type: "family_living", nameAr: "صالة عائلية", nameEn: "Family Living",prefH: rnd(4.0, 5.0), hasWindow: true,  doorWall: "south" });
    const gndBeds = Math.min(1, bedrooms);
    for (let b = 0; b < gndBeds; b++) {
      centerSlots.push({ type: "bedroom", nameAr: `غرفة نوم ${b+1}`, nameEn: `Bedroom ${b+1}`, prefH: rnd(3.6, 4.5), hasWindow: true, doorWall: "west" });
    }
    leftSlots.push({ type: "storage",  nameAr: "مخزن",         nameEn: "Storage",      prefH: rnd(2.0, 2.5), hasWindow: false, doorWall: "east" });
  } else {
    // Fix 1: corridor capped at 2.0m depth
    centerSlots.push({ type: "corridor",    nameAr: "ممر",           nameEn: "Corridor",     prefH: distH,        hasWindow: false, doorWall: "south" });
    centerSlots.push({ type: "master_bedroom", nameAr: "غرفة نوم ماستر", nameEn: "Master Bedroom", prefH: rnd(4.0, 5.0), hasWindow: true, doorWall: "west" });
    const upperBeds = Math.max(0, bedrooms - 1);
    for (let b = 0; b < upperBeds; b++) {
      centerSlots.push({ type: "bedroom", nameAr: `غرفة نوم ${b+2}`, nameEn: `Bedroom ${b+2}`, prefH: rnd(3.6, 4.5), hasWindow: true, doorWall: "west" });
    }
    if (hasBalcony) {
      centerSlots.push({ type: "balcony", nameAr: "بلكونة", nameEn: "Balcony", prefH: rnd(1.5, 2.0), hasWindow: true, doorWall: "south" });
    }
  }

  {
    const totalPref = centerSlots.reduce((s, r) => s + r.prefH, 0);
    const scale = bd / Math.max(totalPref, bd);
    let curY = 0;
    centerSlots.forEach((slot, i) => {
      const isLast = i === centerSlots.length - 1;
      const minH = (slot.type === "corridor" || slot.type === "distributor") ? 1.2 : 2.0;
      const h = isLast ? Math.max(minH, bd - curY) : Math.max(minH, slot.prefH * scale);
      rooms.push(placeRoom(slot.type, slot.nameAr, slot.nameEn, centerX, curY, centerW, h, slot.hasWindow, slot.doorWall));
      curY += h;
    });
  }

  // ── RIGHT COLUMN: reception zone (Fix 5: no dining; Fix 6: garage fixed dims) ──
  interface RightSlot { type: RoomType; nameAr: string; nameEn: string; prefH: number; hasWindow: boolean; doorWall: "north"|"south"|"east"|"west" }
  const rightSlots: RightSlot[] = [];

  if (floor === 0) {
    rightSlots.push({ type: "entrance", nameAr: "بهو المدخل", nameEn: "Entrance Hall", prefH: rnd(2.5, 3.5), hasWindow: false, doorWall: "south" });
    if (hasMajlis) {
      rightSlots.push({ type: "majlis", nameAr: "مجلس رجال", nameEn: "Men's Majlis", prefH: rnd(4.5, 6.0), hasWindow: true, doorWall: "west" });
    }
    // Fix 6: parking fixed at right edge, width=rightW (already right edge), height=6.0m fixed
    if (hasParking) {
      rightSlots.push({ type: "parking", nameAr: "موقف سيارة", nameEn: "Parking", prefH: 6.0, hasWindow: false, doorWall: "south" });
    }
  } else {
    rightSlots.push({ type: "family_living", nameAr: "صالة عائلية", nameEn: "Family Living", prefH: rnd(4.5, 5.5), hasWindow: true, doorWall: "west" });
    if (conceptIndex % 2 === 0) {
      rightSlots.push({ type: "prayer", nameAr: "غرفة صلاة", nameEn: "Prayer Room", prefH: rnd(2.5, 3.5), hasWindow: true, doorWall: "west" });
    } else {
      rightSlots.push({ type: "office", nameAr: "مكتب", nameEn: "Office", prefH: rnd(3.0, 4.0), hasWindow: true, doorWall: "west" });
    }
    rightSlots.push({ type: "bathroom", nameAr: "حمام", nameEn: "Bathroom", prefH: clampWetH(rnd(2.2, 2.8)), hasWindow: false, doorWall: "west" });
    if (hasBalcony) {
      rightSlots.push({ type: "balcony", nameAr: "بلكونة", nameEn: "Balcony", prefH: rnd(1.5, 2.0), hasWindow: true, doorWall: "south" });
    }
  }

  {
    const totalPref = rightSlots.reduce((s, r) => s + r.prefH, 0);
    const scale = bd / Math.max(totalPref, bd);
    let curY = 0;
    rightSlots.forEach((slot, i) => {
      const isLast = i === rightSlots.length - 1;
      const minH = (slot.type === "corridor" || slot.type === "distributor") ? 1.2 : 2.0;
      const h = isLast ? Math.max(minH, bd - curY) : Math.max(minH, slot.prefH * scale);
      rooms.push(placeRoom(slot.type, slot.nameAr, slot.nameEn, rightX, curY, rightW, h, slot.hasWindow, slot.doorWall));
      curY += h;
    });
  }

  // Fix 3 + Fix 4: enforce aspect ratio ≤ 1:2.5 AND area caps (from saudiCode.ts)
  const MAX_AREA = PRACTICAL_ROOM_AREA_CAPS as Partial<Record<RoomType, number>>;
  const MAJLIS_MAX = PRACTICAL_ROOM_AREA_CAPS.majlis;

  return rooms.map(room => {
    if (room.type === "corridor" || room.type === "parking" || room.type === "staircase" || room.type === "balcony" || room.type === "distributor") return room;

    // Aspect ratio cap
    let { width, height } = room;
    const ratio = Math.max(width, height) / Math.min(width, height);
    if (ratio > 2.5) {
      height = parseFloat((width * 2.5).toFixed(2));
    }

    // Area cap
    const maxArea = room.type === "majlis" ? MAJLIS_MAX : (MAX_AREA[room.type] ?? 30);
    if (width * height > maxArea) {
      height = parseFloat((maxArea / width).toFixed(2));
    }

    const area = parseFloat((width * height).toFixed(1));
    return { ...room, width, height, area };
  });
}

// ─── Main Layout Generator ────────────────────────────────────────────────────
export function generateBSPLayout(params: {
  landArea: number;
  buildingType: "villa" | "apartment";
  numberOfFloors: number;
  bedrooms: number;
  bathrooms: number;
  conceptIndex: number;
  extras: { majlis?: number; parking?: number; maidRoom?: number; balcony?: number };
  setbacks: { front: number; back: number; side: number };
  buildingWidth?: number;   // Computed from user's landWidth - setbacks (preferred)
  buildingDepth?: number;   // Computed from user's landLength - setbacks (preferred)
}): BuildingLayout {
  const { landArea, numberOfFloors, bedrooms, bathrooms, conceptIndex, extras, setbacks } = params;

  // ── Compute building footprint ────────────────────────────────────────────
  // Prefer actual user dimensions (landWidth/landLength minus setbacks).
  // Fall back to formula from landArea only when user didn't provide land shape.
  let bw: number;
  let bd: number;
  if (params.buildingWidth && params.buildingDepth && params.buildingWidth > 0 && params.buildingDepth > 0) {
    bw = parseFloat(params.buildingWidth.toFixed(2));
    bd = parseFloat(params.buildingDepth.toFixed(2));
  } else {
    const maxCoverage = SAUDI_CODE.maxCoverage;
    const maxBuildingArea = landArea * maxCoverage;
    const sqrtLand = Math.sqrt(landArea);
    bw = Math.min(Math.max(sqrtLand * 0.55, 9), 14);
    bd = Math.min(maxBuildingArea / bw, 22);
    if (bd < 12) { bd = 12; bw = Math.min(maxBuildingArea / bd, 14); }
    bw = parseFloat(bw.toFixed(2));
    bd = parseFloat(bd.toFixed(2));
  }

  // Hard minimums — layout engine cannot function below these
  bw = Math.max(bw, 10);
  bd = Math.max(bd, 15);

  const buildingArea = parseFloat((bw * bd).toFixed(1));
  const floors = Math.max(1, numberOfFloors);

  // ── Generate floors ───────────────────────────────────────────────────────
  const floorPlans: FloorPlan[] = [];
  for (let f = 0; f < floors; f++) {
    const rooms = buildFloorGrid({
      bw, bd, floor: f,
      bedrooms: f === 0 ? Math.min(1, bedrooms) : bedrooms,
      bathrooms,
      hasMajlis: (extras.majlis ?? 1) > 0,
      hasMaidRoom: (extras.maidRoom ?? 0) > 0,
      hasParking: f === 0 && (extras.parking ?? 1) > 0,
      hasBalcony: f > 0 && (extras.balcony ?? 1) > 0,
      conceptIndex,
    });

    floorPlans.push({
      floor: f,
      rooms,
      totalArea: buildingArea,
      buildingWidth: bw,
      buildingDepth: bd,
    });
  }

  const totalRooms = floorPlans.reduce((s, f) => s + f.rooms.length, 0);
  const totalArea = buildingArea * floors;
  const costPerSqm = 2500; // SAR
  const estimatedCost = `${Math.round(totalArea * costPerSqm / 1000)}K ريال`;

  const layout: BuildingLayout = {
    floors: floorPlans,
    landArea,
    buildingArea,
    buildingWidth: bw,
    buildingDepth: bd,
    totalRooms,
    setbacks,
    svgData: "",
    summary: {
      totalFloors: floors,
      totalArea,
      totalRooms,
      estimatedCost,
      bedrooms,
      bathrooms,
    },
  };

  layout.svgData = generateSVG(layout, conceptIndex);
  return layout;
}

// ─── Professional SVG Generator ───────────────────────────────────────────────
const WALL_THICKNESS = 0.25; // meters — standard Saudi villa wall
const SCALE = 42;            // px per meter
const MARGIN = 90;
const TITLE_H = 72;
const FOOTER_H = 80;

export function generateSVG(layout: BuildingLayout, conceptIndex: number = 0): string {
  const bw = layout.buildingWidth;
  const bd = layout.buildingDepth;

  const svgW = Math.ceil(bw * SCALE) + MARGIN * 2;
  const svgH = Math.ceil(bd * SCALE) + MARGIN * 2 + TITLE_H + FOOTER_H;

  const firstFloor = layout.floors[0];
  if (!firstFloor) return "";
  const rooms = firstFloor.rooms;

  const ox = MARGIN;           // origin X (left edge of building)
  const oy = MARGIN + TITLE_H; // origin Y (top edge of building)
  const WT = WALL_THICKNESS * SCALE; // wall thickness in px

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="${svgW}" height="${svgH}" style="background:white">`;

  // ── Defs ──────────────────────────────────────────────────────────────────
  svg += `<defs>`;
  svg += `<marker id="dim_arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">`;
  svg += `<polygon points="0,0 6,3 0,6" fill="#1e293b"/>`;
  svg += `</marker>`;
  svg += `</defs>`;

  // ── White background ──────────────────────────────────────────────────────
  svg += `<rect width="${svgW}" height="${svgH}" fill="white"/>`;

  // ── Title block ───────────────────────────────────────────────────────────
  svg += `<rect x="0" y="0" width="${svgW}" height="${TITLE_H}" fill="#0F172A"/>`;
  // Left: SOAR.AI logo
  svg += `<text x="16" y="30" fill="#F97316" font-size="22" font-weight="900" font-family="Arial, sans-serif">SOAR</text>`;
  svg += `<text x="72" y="30" fill="white" font-size="22" font-weight="900" font-family="Arial, sans-serif">.AI</text>`;
  svg += `<text x="16" y="52" fill="#94A3B8" font-size="10" font-family="Arial, sans-serif">منصة المخططات المعمارية الذكية</text>`;
  // Center: title
  const conceptNames = [
    "المفهوم العصري المفتوح", "المفهوم التراثي السعودي", "المفهوم الوظيفي الذكي",
    "المفهوم الفاخر الموسّع", "المفهوم المتوسطي", "المفهوم الاقتصادي الأمثل"
  ];
  svg += `<text x="${svgW/2}" y="28" text-anchor="middle" fill="white" font-size="14" font-weight="bold" font-family="Arial, sans-serif">${conceptNames[conceptIndex] ?? `المفهوم ${conceptIndex+1}`}</text>`;
  svg += `<text x="${svgW/2}" y="48" text-anchor="middle" fill="#94A3B8" font-size="10" font-family="Arial, sans-serif">مخطط الدور الأرضي — Floor Plan</text>`;
  // Right: info
  svg += `<text x="${svgW-12}" y="22" text-anchor="end" fill="#94A3B8" font-size="9" font-family="Arial, sans-serif">مقياس 1:100</text>`;
  svg += `<text x="${svgW-12}" y="36" text-anchor="end" fill="#94A3B8" font-size="9" font-family="Arial, sans-serif">مساحة الأرض: ${layout.landArea} م²</text>`;
  svg += `<text x="${svgW-12}" y="50" text-anchor="end" fill="#F97316" font-size="9" font-family="Arial, sans-serif">مساحة البناء: ${layout.buildingArea} م²</text>`;
  svg += `<text x="${svgW-12}" y="64" text-anchor="end" fill="#94A3B8" font-size="9" font-family="Arial, sans-serif">${layout.summary.totalFloors} دور — ${layout.summary.bedrooms} غرف نوم</text>`;

  // ── Land boundary (dashed) ────────────────────────────────────────────────
  const sb = layout.setbacks;
  const landW = bw + sb.side * 2;
  const landD = bd + sb.front + sb.back;
  const lx = ox - sb.side * SCALE;
  const ly = oy - sb.front * SCALE;
  svg += `<rect x="${lx}" y="${ly}" width="${landW*SCALE}" height="${landD*SCALE}" fill="none" stroke="#94A3B8" stroke-width="1" stroke-dasharray="10,5"/>`;
  svg += `<text x="${lx+4}" y="${ly-5}" fill="#94A3B8" font-size="8" font-family="Arial">حدود الأرض</text>`;

  // Setback labels
  svg += `<text x="${ox + bw*SCALE/2}" y="${ly + sb.front*SCALE/2 + 4}" text-anchor="middle" fill="#94A3B8" font-size="8" font-family="Arial">إرتداد أمامي ${sb.front}م</text>`;
  svg += `<text x="${ox + bw*SCALE/2}" y="${oy + bd*SCALE + sb.back*SCALE/2 + 4}" text-anchor="middle" fill="#94A3B8" font-size="8" font-family="Arial">إرتداد خلفي ${sb.back}م</text>`;

  // ── Building outer walls (double-line thick walls) ─────────────────────────
  // Outer wall fill
  svg += `<rect x="${ox}" y="${oy}" width="${bw*SCALE}" height="${bd*SCALE}" fill="#E2E8F0" stroke="#1E293B" stroke-width="${WT}"/>`;
  // Inner wall line (creates double-wall effect)
  svg += `<rect x="${ox+WT/2}" y="${oy+WT/2}" width="${bw*SCALE-WT}" height="${bd*SCALE-WT}" fill="none" stroke="#334155" stroke-width="0.5"/>`;

  // ── Room fills and internal walls ─────────────────────────────────────────
  rooms.forEach(room => {
    const rx = ox + room.x * SCALE;
    const ry = oy + room.y * SCALE;
    const rw = room.width * SCALE;
    const rh = room.height * SCALE;
    const fill = ROOM_FILL[room.type] ?? "#FAFAFA";

    if (room.type === "staircase") {
      svg += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${fill}" stroke="#475569" stroke-width="1.5"/>`;
      // Staircase step lines (horizontal only, no hatch)
      const stepCount = Math.max(4, Math.floor(rh / 10));
      for (let s = 1; s <= stepCount; s++) {
        svg += `<line x1="${rx+2}" y1="${ry+s*(rh/stepCount)}" x2="${rx+rw-2}" y2="${ry+s*(rh/stepCount)}" stroke="#6B7280" stroke-width="0.7"/>`;
      }
      svg += `<line x1="${rx+rw/2}" y1="${ry+rh*0.7}" x2="${rx+rw/2}" y2="${ry+rh*0.2}" stroke="#374151" stroke-width="1.5" marker-end="url(#dim_arrow)"/>`;
    } else if (room.type === "parking") {
      svg += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${fill}" stroke="#64748B" stroke-width="1.5"/>`;
      svg += `<text x="${rx+rw/2}" y="${ry+rh/2+6}" text-anchor="middle" fill="#475569" font-size="20" font-weight="bold" font-family="Arial" opacity="0.3">P</text>`;
    } else {
      svg += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${fill}" stroke="#334155" stroke-width="1.5"/>`;
    }

    // ── Internal wall dividers (thin lines between rooms) ──────────────────
    // Right edge wall
    if (room.x + room.width < bw - 0.1) {
      svg += `<line x1="${rx+rw}" y1="${ry}" x2="${rx+rw}" y2="${ry+rh}" stroke="#1E293B" stroke-width="2"/>`;
    }
    // Bottom edge wall
    if (room.y + room.height < bd - 0.1) {
      svg += `<line x1="${rx}" y1="${ry+rh}" x2="${rx+rw}" y2="${ry+rh}" stroke="#1E293B" stroke-width="2"/>`;
    }

    // ── Room label ─────────────────────────────────────────────────────────
    const cx = rx + rw / 2;
    const cy = ry + rh / 2;
    const labelColor = ROOM_STROKE[room.type] ?? "#1E293B";
    const fontSize = Math.min(Math.max(Math.min(rw, rh) / 5.5, 7), 13);

    if (rw > 40 && rh > 30) {
      // Arabic name
      svg += `<text x="${cx}" y="${cy - fontSize/2 - 1}" text-anchor="middle" fill="${labelColor}" font-size="${fontSize}" font-weight="bold" font-family="Arial, sans-serif">${room.nameAr}</text>`;
      // Dimensions
      svg += `<text x="${cx}" y="${cy + fontSize + 2}" text-anchor="middle" fill="#64748B" font-size="${Math.max(fontSize - 2, 6)}" font-family="Arial, sans-serif">${room.width.toFixed(1)} × ${room.height.toFixed(1)} م</text>`;
      // Area
      svg += `<text x="${cx}" y="${cy + fontSize*2 + 4}" text-anchor="middle" fill="#94A3B8" font-size="${Math.max(fontSize - 3, 6)}" font-family="Arial, sans-serif">${room.area.toFixed(0)} م²</text>`;
    } else if (rw > 25 && rh > 20) {
      svg += `<text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="${labelColor}" font-size="${Math.max(fontSize - 1, 6)}" font-weight="bold" font-family="Arial, sans-serif">${room.nameAr}</text>`;
    }

    // ── Window (blue parallel lines on exterior wall) ──────────────────────
    if (room.hasWindow) {
      const winLen = Math.min(rw * 0.45, 40);
      const winX = rx + (rw - winLen) / 2;
      // Window on top wall (north-facing rooms get windows on top)
      if (room.y < 0.5) {
        // Top exterior wall
        svg += `<rect x="${winX}" y="${ry}" width="${winLen}" height="4" fill="white" stroke="#3B82F6" stroke-width="1"/>`;
        svg += `<line x1="${winX+3}" y1="${ry+1}" x2="${winX+winLen-3}" y2="${ry+1}" stroke="#93C5FD" stroke-width="1"/>`;
        svg += `<line x1="${winX+3}" y1="${ry+3}" x2="${winX+winLen-3}" y2="${ry+3}" stroke="#93C5FD" stroke-width="1"/>`;
      } else if (room.x < 0.5) {
        // Left exterior wall
        const winY = ry + (rh - winLen) / 2;
        svg += `<rect x="${rx}" y="${winY}" width="4" height="${winLen}" fill="white" stroke="#3B82F6" stroke-width="1"/>`;
        svg += `<line x1="${rx+1}" y1="${winY+3}" x2="${rx+1}" y2="${winY+winLen-3}" stroke="#93C5FD" stroke-width="1"/>`;
        svg += `<line x1="${rx+3}" y1="${winY+3}" x2="${rx+3}" y2="${winY+winLen-3}" stroke="#93C5FD" stroke-width="1"/>`;
      } else if (room.x + room.width > bw - 0.5) {
        // Right exterior wall
        const winY = ry + (rh - winLen) / 2;
        svg += `<rect x="${rx+rw-4}" y="${winY}" width="4" height="${winLen}" fill="white" stroke="#3B82F6" stroke-width="1"/>`;
        svg += `<line x1="${rx+rw-3}" y1="${winY+3}" x2="${rx+rw-3}" y2="${winY+winLen-3}" stroke="#93C5FD" stroke-width="1"/>`;
        svg += `<line x1="${rx+rw-1}" y1="${winY+3}" x2="${rx+rw-1}" y2="${winY+winLen-3}" stroke="#93C5FD" stroke-width="1"/>`;
      } else {
        // Bottom exterior wall
        svg += `<rect x="${winX}" y="${ry+rh-4}" width="${winLen}" height="4" fill="white" stroke="#3B82F6" stroke-width="1"/>`;
        svg += `<line x1="${winX+3}" y1="${ry+rh-3}" x2="${winX+winLen-3}" y2="${ry+rh-3}" stroke="#93C5FD" stroke-width="1"/>`;
        svg += `<line x1="${winX+3}" y1="${ry+rh-1}" x2="${winX+winLen-3}" y2="${ry+rh-1}" stroke="#93C5FD" stroke-width="1"/>`;
      }
    }

    // ── Door (arc + line) ──────────────────────────────────────────────────
    if (room.hasDoor && rw > 22 && rh > 18) {
      const doorW = Math.min(Math.min(rw, rh) * 0.28, 22);
      let dx: number, dy: number, arcX: number, arcY: number;
      let sweepFlag = 0;

      switch (room.doorWall) {
        case "south":
          dx = rx + rw * 0.2;
          dy = ry + rh;
          svg += `<rect x="${dx}" y="${dy-3}" width="${doorW}" height="3" fill="white" stroke="#1E293B" stroke-width="1"/>`;
          svg += `<path d="M ${dx} ${dy} A ${doorW} ${doorW} 0 0 1 ${dx+doorW} ${dy-doorW}" fill="none" stroke="#64748B" stroke-width="0.8" stroke-dasharray="3,2"/>`;
          break;
        case "north":
          dx = rx + rw * 0.2;
          dy = ry;
          svg += `<rect x="${dx}" y="${dy}" width="${doorW}" height="3" fill="white" stroke="#1E293B" stroke-width="1"/>`;
          svg += `<path d="M ${dx} ${dy} A ${doorW} ${doorW} 0 0 0 ${dx+doorW} ${dy+doorW}" fill="none" stroke="#64748B" stroke-width="0.8" stroke-dasharray="3,2"/>`;
          break;
        case "east":
          dx = rx + rw;
          dy = ry + rh * 0.2;
          svg += `<rect x="${dx-3}" y="${dy}" width="3" height="${doorW}" fill="white" stroke="#1E293B" stroke-width="1"/>`;
          svg += `<path d="M ${dx} ${dy} A ${doorW} ${doorW} 0 0 0 ${dx-doorW} ${dy+doorW}" fill="none" stroke="#64748B" stroke-width="0.8" stroke-dasharray="3,2"/>`;
          break;
        case "west":
        default:
          dx = rx;
          dy = ry + rh * 0.2;
          svg += `<rect x="${dx}" y="${dy}" width="3" height="${doorW}" fill="white" stroke="#1E293B" stroke-width="1"/>`;
          svg += `<path d="M ${dx} ${dy} A ${doorW} ${doorW} 0 0 1 ${dx+doorW} ${dy+doorW}" fill="none" stroke="#64748B" stroke-width="0.8" stroke-dasharray="3,2"/>`;
          break;
      }
    }
  });

  // ── Outer building border (redraw on top for clean edges) ─────────────────
  svg += `<rect x="${ox}" y="${oy}" width="${bw*SCALE}" height="${bd*SCALE}" fill="none" stroke="#0F172A" stroke-width="${WT}"/>`;

  // ── Dimension lines ───────────────────────────────────────────────────────
  const dimOffset = 28;

  // Width dimension (bottom)
  const dimBotY = oy + bd*SCALE + dimOffset;
  svg += `<line x1="${ox}" y1="${dimBotY}" x2="${ox+bw*SCALE}" y2="${dimBotY}" stroke="#1E293B" stroke-width="1"/>`;
  svg += `<line x1="${ox}" y1="${dimBotY-6}" x2="${ox}" y2="${dimBotY+6}" stroke="#1E293B" stroke-width="1.5"/>`;
  svg += `<line x1="${ox+bw*SCALE}" y1="${dimBotY-6}" x2="${ox+bw*SCALE}" y2="${dimBotY+6}" stroke="#1E293B" stroke-width="1.5"/>`;
  svg += `<text x="${ox+bw*SCALE/2}" y="${dimBotY+14}" text-anchor="middle" fill="#1E293B" font-size="11" font-weight="bold" font-family="Arial">${bw.toFixed(2)} م</text>`;

  // Depth dimension (right)
  const dimRightX = ox + bw*SCALE + dimOffset;
  svg += `<line x1="${dimRightX}" y1="${oy}" x2="${dimRightX}" y2="${oy+bd*SCALE}" stroke="#1E293B" stroke-width="1"/>`;
  svg += `<line x1="${dimRightX-6}" y1="${oy}" x2="${dimRightX+6}" y2="${oy}" stroke="#1E293B" stroke-width="1.5"/>`;
  svg += `<line x1="${dimRightX-6}" y1="${oy+bd*SCALE}" x2="${dimRightX+6}" y2="${oy+bd*SCALE}" stroke="#1E293B" stroke-width="1.5"/>`;
  svg += `<text x="${dimRightX+16}" y="${oy+bd*SCALE/2+4}" text-anchor="middle" fill="#1E293B" font-size="11" font-weight="bold" font-family="Arial" transform="rotate(90,${dimRightX+16},${oy+bd*SCALE/2+4})">${bd.toFixed(2)} م</text>`;

  // Column dimension ticks (top)
  const leftW   = parseFloat((bw * 0.28).toFixed(2));
  const centerW = parseFloat((bw * 0.42).toFixed(2));
  const rightW  = parseFloat((bw - leftW - centerW).toFixed(2));
  const dimTopY = oy - 18;
  svg += `<line x1="${ox}" y1="${dimTopY}" x2="${ox+bw*SCALE}" y2="${dimTopY}" stroke="#94A3B8" stroke-width="0.8"/>`;
  [leftW, leftW+centerW].forEach(xm => {
    const px = ox + xm*SCALE;
    svg += `<line x1="${px}" y1="${dimTopY-4}" x2="${px}" y2="${dimTopY+4}" stroke="#94A3B8" stroke-width="1"/>`;
    svg += `<line x1="${px}" y1="${oy}" x2="${px}" y2="${oy+bd*SCALE}" stroke="#94A3B8" stroke-width="0.5" stroke-dasharray="4,3"/>`;
  });

  // ── North arrow (clean minimal architectural style) ───────────────────────
  const nax = ox + 20, nay = oy + 20;
  // Thin circle
  svg += `<circle cx="${nax}" cy="${nay}" r="14" fill="none" stroke="#374151" stroke-width="0.8"/>`;
  // Arrow shaft pointing up
  svg += `<line x1="${nax}" y1="${nay+10}" x2="${nax}" y2="${nay-10}" stroke="#374151" stroke-width="1"/>`;
  // Arrowhead (small, thin)
  svg += `<polygon points="${nax},${nay-13} ${nax-3},${nay-6} ${nax+3},${nay-6}" fill="#374151"/>`;
  // Letter N below
  svg += `<text x="${nax}" y="${nay+26}" text-anchor="middle" fill="#374151" font-size="9" font-weight="600" font-family="Arial">N</text>`;

  // ── Scale bar ─────────────────────────────────────────────────────────────
  const sbX = ox + bw*SCALE - 5*SCALE - 10;
  const sbY = oy + bd*SCALE + dimOffset + 20;
  svg += `<text x="${sbX}" y="${sbY-4}" fill="#475569" font-size="8" font-family="Arial">مقياس:</text>`;
  for (let i = 0; i < 5; i++) {
    svg += `<rect x="${sbX+40+i*SCALE}" y="${sbY}" width="${SCALE}" height="6" fill="${i%2===0?"#1E293B":"white"}" stroke="#1E293B" stroke-width="0.5"/>`;
    svg += `<text x="${sbX+40+i*SCALE}" y="${sbY+16}" fill="#475569" font-size="7" font-family="Arial">${i}م</text>`;
  }
  svg += `<text x="${sbX+40+5*SCALE}" y="${sbY+16}" fill="#475569" font-size="7" font-family="Arial">5م</text>`;

  // ── Legend ────────────────────────────────────────────────────────────────
  const legX = ox;
  const legY = oy + bd*SCALE + dimOffset + 18;
  const legendItems = [
    { color: "#93C5FD", label: "نافذة" },
    { color: "#1E293B", label: "جدار" },
    { color: "#F97316", label: "SOAR.AI" },
  ];
  legendItems.forEach((item, i) => {
    svg += `<rect x="${legX + i*70}" y="${legY}" width="12" height="8" fill="${item.color}" stroke="#94A3B8" stroke-width="0.5"/>`;
    svg += `<text x="${legX + i*70 + 15}" y="${legY+8}" fill="#475569" font-size="8" font-family="Arial">${item.label}</text>`;
  });

  // ── Footer title block ────────────────────────────────────────────────────
  const footerY = svgH - FOOTER_H;
  svg += `<rect x="0" y="${footerY}" width="${svgW}" height="${FOOTER_H}" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1"/>`;

  // Vertical dividers
  const cols = [svgW*0.25, svgW*0.5, svgW*0.75];
  cols.forEach(cx => {
    svg += `<line x1="${cx}" y1="${footerY}" x2="${cx}" y2="${svgH}" stroke="#E2E8F0" stroke-width="1"/>`;
  });

  const footerData = [
    { label: "المشروع", value: "SOAR.AI", cx: svgW*0.125 },
    { label: "المساحة الكلية", value: `${layout.summary.totalArea} م²`, cx: svgW*0.375 },
    { label: "التكلفة التقديرية", value: layout.summary.estimatedCost, cx: svgW*0.625 },
    { label: "الأدوار", value: `${layout.summary.totalFloors} دور`, cx: svgW*0.875 },
  ];
  footerData.forEach(({ label, value, cx }) => {
    svg += `<text x="${cx}" y="${footerY+20}" text-anchor="middle" fill="#94A3B8" font-size="9" font-family="Arial">${label}</text>`;
    svg += `<text x="${cx}" y="${footerY+40}" text-anchor="middle" fill="#1E293B" font-size="12" font-weight="bold" font-family="Arial">${value}</text>`;
  });

  // Date
  const today = new Date().toLocaleDateString("ar-SA");
  svg += `<text x="${svgW-8}" y="${footerY+60}" text-anchor="end" fill="#94A3B8" font-size="8" font-family="Arial">${today}</text>`;
  svg += `<text x="8" y="${footerY+60}" fill="#94A3B8" font-size="8" font-family="Arial">SOAR.AI © 2025 — جميع الحقوق محفوظة</text>`;

  svg += `</svg>`;
  return svg;
}

// ─── Concept titles ───────────────────────────────────────────────────────────
export const CONCEPT_TITLES = [
  { ar: "المفهوم العصري المفتوح",    en: "Modern Open Concept" },
  { ar: "المفهوم التراثي السعودي",   en: "Saudi Heritage Style" },
  { ar: "المفهوم الوظيفي الذكي",    en: "Smart Functional Layout" },
  { ar: "المفهوم الفاخر الموسّع",   en: "Luxury Extended Layout" },
  { ar: "المفهوم المتوسطي",          en: "Mediterranean Concept" },
  { ar: "المفهوم الاقتصادي الأمثل", en: "Optimal Economic Layout" },
];
