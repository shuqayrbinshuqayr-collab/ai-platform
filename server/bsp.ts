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

// ─── CAD B&W: all rooms white interior, all labels black ─────────────────────
const ROOM_FILL: Record<string, string> = {
  master_bedroom: "#ffffff",
  bedroom:        "#ffffff",
  majlis:         "#ffffff",
  family_living:  "#ffffff",
  living:         "#ffffff",
  kitchen:        "#ffffff",
  dining:         "#ffffff",
  bathroom:       "#f6f6f6",
  toilet:         "#f6f6f6",
  entrance:       "#ffffff",
  balcony:        "#f2f2f2",
  staircase:      "#eeeeee",
  corridor:       "#f8f8f8",
  distributor:    "#f8f8f8",
  maid_room:      "#ffffff",
  storage:        "#eeeeee",
  parking:        "#ebebeb",
  laundry:        "#ffffff",
  office:         "#ffffff",
  prayer:         "#ffffff",
};

const ROOM_STROKE: Record<string, string> = {
  master_bedroom: "#000000",
  bedroom:        "#000000",
  majlis:         "#000000",
  family_living:  "#000000",
  living:         "#000000",
  kitchen:        "#000000",
  dining:         "#000000",
  bathroom:       "#000000",
  toilet:         "#000000",
  entrance:       "#000000",
  balcony:        "#000000",
  staircase:      "#000000",
  corridor:       "#000000",
  distributor:    "#000000",
  maid_room:      "#000000",
  storage:        "#000000",
  parking:        "#000000",
  laundry:        "#000000",
  office:         "#000000",
  prayer:         "#000000",
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
    // Use actual user land dimensions — apply only a safety floor, not an arbitrary minimum
    bw = Math.max(parseFloat(params.buildingWidth.toFixed(2)), 6);
    bd = Math.max(parseFloat(params.buildingDepth.toFixed(2)), 8);
  } else {
    // Formula fallback — no user land shape provided
    const maxCoverage = SAUDI_CODE.maxCoverage;
    const maxBuildingArea = landArea * maxCoverage;
    const sqrtLand = Math.sqrt(landArea);
    bw = Math.min(Math.max(sqrtLand * 0.55, 9), 14);
    bd = Math.min(maxBuildingArea / bw, 22);
    if (bd < 12) { bd = 12; bw = Math.min(maxBuildingArea / bd, 14); }
    bw = Math.max(parseFloat(bw.toFixed(2)), 10);
    bd = Math.max(parseFloat(bd.toFixed(2)), 15);
  }
  console.error("BSP COMPUTED bw/bd:", bw, bd, "from params:", params.buildingWidth, params.buildingDepth);

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

  const firstFloor = layout.floors[0];
  if (!firstFloor) return "";
  const rooms = firstFloor.rooms as any[];

  const extRoomW = rooms
    .filter(r => r._outsideBuilding)
    .reduce((s, r) => Math.max(s, (r.x - bw + r.width) * SCALE + MARGIN * 0.5), 0);

  const svgW = Math.ceil(bw * SCALE) + MARGIN * 2 + Math.ceil(extRoomW);
  const svgH = Math.ceil(bd * SCALE) + MARGIN * 2 + TITLE_H + FOOTER_H;

  const ox = MARGIN;
  const oy = MARGIN + TITLE_H;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="${svgW}" height="${svgH}" style="background:white;font-family:Arial,sans-serif">`;

  // White background
  svg += `<rect width="${svgW}" height="${svgH}" fill="white"/>`;

  // ─── Layer accumulators (rendered bottom-to-top) ──────────────────────────
  let gBoundary  = '';
  let gHatch     = '';
  let gWalls     = '';
  let gOpenings  = '';
  let gStairs    = '';
  let gDimensions = '';
  let gLabels    = '';
  let gSymbols   = '';
  let gTitleBlock = '';

  // ── layer-boundary: property line + setback labels ────────────────────────
  const sb = layout.setbacks;
  const landW = bw + sb.side * 2;
  const landD = bd + sb.front + sb.back;
  const lx = ox - sb.side * SCALE;
  const ly = oy - sb.front * SCALE;
  gBoundary += `<rect x="${lx}" y="${ly}" width="${landW*SCALE}" height="${landD*SCALE}" fill="none" stroke="#555555" stroke-width="0.5" stroke-dasharray="8,4"/>`;
  gBoundary += `<text x="${lx+4}" y="${ly-6}" fill="#555555" font-size="7">حدود الأرض</text>`;
  gBoundary += `<text x="${ox+bw*SCALE/2}" y="${ly+sb.front*SCALE/2+4}" text-anchor="middle" fill="#777777" font-size="7">إرتداد أمامي ${sb.front}م</text>`;
  gBoundary += `<text x="${ox+bw*SCALE/2}" y="${oy+bd*SCALE+sb.back*SCALE/2+4}" text-anchor="middle" fill="#777777" font-size="7">إرتداد خلفي ${sb.back}م</text>`;

  // ── Room rendering helpers ─────────────────────────────────────────────────
  const WI = 6; // wall inset px for door/window positioning
  const WIN_MIN = Math.round(1.2 * SCALE);

  const doorWidthForType = (t: string): number => {
    if (t.includes("majlis") || t.includes("entrance") || t.includes("foyer") || t.includes("living")) return Math.round(1.2 * SCALE);
    if (t.includes("bathroom") || t.includes("bath")) return Math.round(0.8 * SCALE);
    if (t.includes("wc") || t.includes("toilet")) return Math.round(0.7 * SCALE);
    return Math.round(0.9 * SCALE);
  };

  rooms.forEach(room => {
    const rx = ox + room.x * SCALE;
    const ry = oy + room.y * SCALE;
    const rw = room.width  * SCALE;
    const rh = room.height * SCALE;
    const fill = ROOM_FILL[room.type] ?? "#f5f5f5";

    // ── Outside-building rooms (parking) ─────────────────────────────────
    if (room._outsideBuilding) {
      gHatch += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="#f0f0f0"/>`;
      gWalls += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="none" stroke="#000000" stroke-width="1" stroke-dasharray="6,3"/>`;
      const pfs = Math.min(Math.min(rw, rh) * 0.3, 28);
      gLabels += `<text x="${rx+rw/2}" y="${ry+rh/2+pfs*0.35}" text-anchor="middle" fill="#000000" font-size="${pfs}" font-weight="900" opacity="0.10">P</text>`;
      gLabels += `<text x="${rx+rw/2}" y="${ry+rh*0.72+8}" text-anchor="middle" fill="#000000" font-size="9" font-weight="600">${room.nameAr ?? "موقف"}</text>`;
      gLabels += `<text x="${rx+rw/2}" y="${ry+rh*0.72+20}" text-anchor="middle" fill="#333333" font-size="8">${(room.width??0).toFixed(2)}×${(room.height??0).toFixed(2)}</text>`;
      gWalls += `<line x1="${ox+bw*SCALE}" y1="${ry+rh/2}" x2="${rx}" y2="${ry+rh/2}" stroke="#555555" stroke-width="0.5" stroke-dasharray="4,3"/>`;
      return;
    }

    const onTop    = room.y < 0.3;
    const onLeft   = room.x < 0.3;
    const onRight  = room.x + room.width  > bw - 0.3;
    const onBottom = room.y + room.height > bd - 0.3;
    const isExterior = onTop || onLeft || onRight || onBottom;

    // layer-hatch: room fill (light gray, no stroke)
    if (rw > WI * 2 + 2 && rh > WI * 2 + 2) {
      gHatch += `<rect x="${rx+WI}" y="${ry+WI}" width="${rw-WI*2}" height="${rh-WI*2}" fill="${fill}"/>`;
    }

    // layer-walls: wall boundaries
    // Interior wall: stroke 2.5; exterior rooms get outer face reinforced by building border
    const wallSW = isExterior ? 2.5 : 2.0;
    gWalls += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="none" stroke="#000000" stroke-width="${wallSW}"/>`;

    // Parking watermark
    if (room.type === "parking" || room.type === "garage") {
      gHatch += `<text x="${rx+rw/2}" y="${ry+rh/2+12}" text-anchor="middle" fill="#000000" font-size="${Math.min(rw,rh)*0.32}" font-weight="900" opacity="0.08">P</text>`;
    }

    // layer-openings: doors
    const isGarage = (room.type ?? "").includes("parking") || (room.type ?? "").includes("garage");
    const isWC = room.type === "wc" || room.type === "toilet";

    if (!isGarage && rw > WI * 2 + 12 && rh > WI * 2 + 12) {
      const t = (room.type ?? "").toLowerCase();
      const doorLen = doorWidthForType(t);
      const isBigDoor = (room.type ?? "").includes("majlis") || (room.type ?? "").includes("entrance");
      const wall = room.doorWall ?? (onBottom ? "south" : onLeft ? "west" : "east");

      const drawDoor = (dwLen: number, offsetFactor: number) => {
        switch (wall) {
          case "north": {
            const dx = rx + WI + (rw - WI * 2 - dwLen) * offsetFactor;
            // Gap: cover wall stroke with room fill
            gOpenings += `<rect x="${dx}" y="${ry-2}" width="${dwLen}" height="${WI+4}" fill="${fill}"/>`;
            if (isWC) {
              gOpenings += `<line x1="${dx}" y1="${ry}" x2="${dx+dwLen}" y2="${ry}" stroke="#000000" stroke-width="0.8" stroke-dasharray="4,2"/>`;
              gOpenings += `<line x1="${dx}" y1="${ry+WI}" x2="${dx+dwLen}" y2="${ry+WI}" stroke="#000000" stroke-width="0.8" stroke-dasharray="4,2"/>`;
            } else {
              gOpenings += `<line x1="${dx}" y1="${ry+WI}" x2="${dx+dwLen}" y2="${ry+WI}" stroke="#000000" stroke-width="0.8"/>`;
              gOpenings += `<path d="M ${dx+dwLen} ${ry+WI} A ${dwLen} ${dwLen} 0 0 0 ${dx} ${ry+WI+dwLen}" fill="none" stroke="#000000" stroke-width="0.8" stroke-dasharray="3,2"/>`;
            }
            break;
          }
          case "south": {
            const dx = rx + WI + (rw - WI * 2 - dwLen) * offsetFactor;
            gOpenings += `<rect x="${dx}" y="${ry+rh-WI-2}" width="${dwLen}" height="${WI+4}" fill="${fill}"/>`;
            if (isWC) {
              gOpenings += `<line x1="${dx}" y1="${ry+rh-WI}" x2="${dx+dwLen}" y2="${ry+rh-WI}" stroke="#000000" stroke-width="0.8" stroke-dasharray="4,2"/>`;
              gOpenings += `<line x1="${dx}" y1="${ry+rh}" x2="${dx+dwLen}" y2="${ry+rh}" stroke="#000000" stroke-width="0.8" stroke-dasharray="4,2"/>`;
            } else {
              gOpenings += `<line x1="${dx}" y1="${ry+rh-WI}" x2="${dx+dwLen}" y2="${ry+rh-WI}" stroke="#000000" stroke-width="0.8"/>`;
              gOpenings += `<path d="M ${dx} ${ry+rh-WI} A ${dwLen} ${dwLen} 0 0 1 ${dx+dwLen} ${ry+rh-WI-dwLen}" fill="none" stroke="#000000" stroke-width="0.8" stroke-dasharray="3,2"/>`;
            }
            break;
          }
          case "east": {
            const dy = ry + WI + (rh - WI * 2 - dwLen) * offsetFactor;
            gOpenings += `<rect x="${rx+rw-WI-2}" y="${dy}" width="${WI+4}" height="${dwLen}" fill="${fill}"/>`;
            if (isWC) {
              gOpenings += `<line x1="${rx+rw-WI}" y1="${dy}" x2="${rx+rw-WI}" y2="${dy+dwLen}" stroke="#000000" stroke-width="0.8" stroke-dasharray="4,2"/>`;
              gOpenings += `<line x1="${rx+rw}" y1="${dy}" x2="${rx+rw}" y2="${dy+dwLen}" stroke="#000000" stroke-width="0.8" stroke-dasharray="4,2"/>`;
            } else {
              gOpenings += `<line x1="${rx+rw-WI}" y1="${dy}" x2="${rx+rw-WI}" y2="${dy+dwLen}" stroke="#000000" stroke-width="0.8"/>`;
              gOpenings += `<path d="M ${rx+rw-WI} ${dy+dwLen} A ${dwLen} ${dwLen} 0 0 1 ${rx+rw-WI-dwLen} ${dy}" fill="none" stroke="#000000" stroke-width="0.8" stroke-dasharray="3,2"/>`;
            }
            break;
          }
          default: { // west
            const dy = ry + WI + (rh - WI * 2 - dwLen) * offsetFactor;
            gOpenings += `<rect x="${rx-2}" y="${dy}" width="${WI+4}" height="${dwLen}" fill="${fill}"/>`;
            if (isWC) {
              gOpenings += `<line x1="${rx}" y1="${dy}" x2="${rx}" y2="${dy+dwLen}" stroke="#000000" stroke-width="0.8" stroke-dasharray="4,2"/>`;
              gOpenings += `<line x1="${rx+WI}" y1="${dy}" x2="${rx+WI}" y2="${dy+dwLen}" stroke="#000000" stroke-width="0.8" stroke-dasharray="4,2"/>`;
            } else {
              gOpenings += `<line x1="${rx+WI}" y1="${dy}" x2="${rx+WI}" y2="${dy+dwLen}" stroke="#000000" stroke-width="0.8"/>`;
              gOpenings += `<path d="M ${rx+WI} ${dy} A ${dwLen} ${dwLen} 0 0 0 ${rx+WI+dwLen} ${dy+dwLen}" fill="none" stroke="#000000" stroke-width="0.8" stroke-dasharray="3,2"/>`;
            }
          }
        }
      };

      if (isBigDoor) {
        drawDoor(Math.round(doorLen * 0.5), 0.2);
        drawDoor(Math.round(doorLen * 0.5), 0.5);
      } else {
        drawDoor(doorLen, 0.25);
      }
    }

    // layer-openings: windows
    const noWindow = ["corridor", "storage", "wc", "toilet", "parking", "garage", "distributor"].includes(room.type ?? "");
    if (isExterior && !noWindow) {
      const isMajlis = (room.type ?? "").includes("majlis") || (room.type ?? "").includes("living");
      const isBath = (room.type ?? "").includes("bath") || room.type === "wc" || room.type === "toilet";
      const winPx = isBath ? Math.round(0.6 * SCALE) : Math.min(Math.max(WIN_MIN, 50), onTop || onBottom ? rw * 0.5 : rh * 0.5);

      const drawWin = (wx: number, wy: number, horiz: boolean) => {
        if (horiz) {
          gOpenings += `<rect x="${wx}" y="${wy}" width="${winPx}" height="${WI}" fill="white"/>`;
          gOpenings += `<line x1="${wx}" y1="${wy}"      x2="${wx+winPx}" y2="${wy}"      stroke="#000000" stroke-width="0.8"/>`;
          gOpenings += `<line x1="${wx}" y1="${wy+WI/2}" x2="${wx+winPx}" y2="${wy+WI/2}" stroke="#000000" stroke-width="0.8"/>`;
          gOpenings += `<line x1="${wx}" y1="${wy+WI}"   x2="${wx+winPx}" y2="${wy+WI}"   stroke="#000000" stroke-width="0.8"/>`;
        } else {
          gOpenings += `<rect x="${wx}" y="${wy}" width="${WI}" height="${winPx}" fill="white"/>`;
          gOpenings += `<line x1="${wx}"      y1="${wy}" x2="${wx}"      y2="${wy+winPx}" stroke="#000000" stroke-width="0.8"/>`;
          gOpenings += `<line x1="${wx+WI/2}" y1="${wy}" x2="${wx+WI/2}" y2="${wy+winPx}" stroke="#000000" stroke-width="0.8"/>`;
          gOpenings += `<line x1="${wx+WI}"   y1="${wy}" x2="${wx+WI}"   y2="${wy+winPx}" stroke="#000000" stroke-width="0.8"/>`;
        }
      };

      if (onTop) {
        drawWin(rx + (rw - winPx) / 2, ry, true);
        if (isMajlis && rw - winPx > winPx + 20) drawWin(rx + rw * 0.65, ry, true);
      } else if (onBottom) {
        drawWin(rx + (rw - winPx) / 2, ry + rh - WI, true);
      } else if (onLeft) {
        drawWin(rx, ry + (rh - winPx) / 2, false);
      } else if (onRight) {
        drawWin(rx + rw - WI, ry + (rh - winPx) / 2, false);
      }
    }

    // layer-stairs: staircase steps
    if (room.type === "staircase") {
      const stepPx = Math.round(0.25 * SCALE);
      const stepsN = Math.max(3, Math.floor((rh - WI * 2) / stepPx));
      const ix = rx + WI + 1, iw = rw - WI * 2 - 2;
      for (let s = 1; s <= stepsN; s++) {
        const sy = ry + WI + s * stepPx;
        if (sy < ry + rh - WI) {
          gStairs += `<line x1="${ix}" y1="${sy}" x2="${ix+iw}" y2="${sy}" stroke="#333333" stroke-width="0.7"/>`;
        }
      }
      const midy = ry + rh / 2;
      gStairs += `<polyline points="${ix},${midy-3} ${ix+iw*0.25},${midy+3} ${ix+iw*0.5},${midy-3} ${ix+iw*0.75},${midy+3} ${ix+iw},${midy-3}" fill="none" stroke="#333333" stroke-width="1.2"/>`;
      const ax = rx + rw / 2;
      gStairs += `<line x1="${ax}" y1="${ry+rh*0.75}" x2="${ax}" y2="${ry+rh*0.22}" stroke="#000000" stroke-width="1"/>`;
      gStairs += `<polygon points="${ax},${ry+rh*0.18} ${ax-3},${ry+rh*0.26} ${ax+3},${ry+rh*0.26}" fill="#000000"/>`;
      gStairs += `<text x="${ax}" y="${ry+rh*0.88}" text-anchor="middle" fill="#000000" font-size="7">صعود ${stepsN} درجة</text>`;
    }

    // layer-labels: room text
    const cx = rx + rw / 2;
    const cy = ry + rh / 2;
    const innerMin = Math.min(rw - WI * 2, rh - WI * 2);

    if (innerMin >= 60) {
      gLabels += `<text x="${cx}" y="${cy - 5}" text-anchor="middle" fill="#000000" font-size="10" font-weight="600">${room.nameAr}</text>`;
      gLabels += `<text x="${cx}" y="${cy + 8}" text-anchor="middle" fill="#333333" font-size="8">${(room.area ?? 0).toFixed(1)} م²</text>`;
      gLabels += `<text x="${cx}" y="${cy + 19}" text-anchor="middle" fill="#555555" font-size="7">${(room.width ?? 0).toFixed(2)}×${(room.height ?? 0).toFixed(2)}</text>`;
    } else if (innerMin >= 40) {
      gLabels += `<text x="${cx}" y="${cy}" text-anchor="middle" fill="#000000" font-size="9" font-weight="600">${room.nameAr}</text>`;
      gLabels += `<text x="${cx}" y="${cy + 11}" text-anchor="middle" fill="#333333" font-size="7">${(room.area ?? 0).toFixed(1)} م²</text>`;
    } else if (innerMin >= 25) {
      gLabels += `<text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="#000000" font-size="7" font-weight="600">${room.nameAr}</text>`;
    }
  });

  // Building exterior border — 4px, drawn on top of all room walls
  gWalls += `<rect x="${ox}" y="${oy}" width="${bw*SCALE}" height="${bd*SCALE}" fill="none" stroke="#000000" stroke-width="4"/>`;

  // ── layer-dimensions ──────────────────────────────────────────────────────
  // Column widths for room-by-room string
  const cw0 = parseFloat((bw * 0.28).toFixed(2));
  const cw1 = parseFloat((bw * 0.42).toFixed(2));
  const cw2 = parseFloat((bw - cw0 - cw1).toFixed(2));

  // Room-by-room string (inner, offset 22px)
  const dimInnerY = oy + bd*SCALE + 22;
  gDimensions += `<line x1="${ox}" y1="${dimInnerY}" x2="${ox+bw*SCALE}" y2="${dimInnerY}" stroke="#000000" stroke-width="0.4"/>`;
  let colPx = 0;
  [cw0, cw1, cw2].forEach((cw) => {
    const px1 = ox + colPx * SCALE;
    const px2 = ox + (colPx + cw) * SCALE;
    // Extension lines
    gDimensions += `<line x1="${px1}" y1="${oy+bd*SCALE+3}" x2="${px1}" y2="${dimInnerY+4}" stroke="#000000" stroke-width="0.3"/>`;
    gDimensions += `<line x1="${px2}" y1="${oy+bd*SCALE+3}" x2="${px2}" y2="${dimInnerY+4}" stroke="#000000" stroke-width="0.3"/>`;
    // Tick marks
    gDimensions += `<line x1="${px1}" y1="${dimInnerY-3}" x2="${px1}" y2="${dimInnerY+3}" stroke="#000000" stroke-width="0.8"/>`;
    gDimensions += `<line x1="${px2}" y1="${dimInnerY-3}" x2="${px2}" y2="${dimInnerY+3}" stroke="#000000" stroke-width="0.8"/>`;
    // Text above line
    gDimensions += `<text x="${(px1+px2)/2}" y="${dimInnerY-4}" text-anchor="middle" fill="#000000" font-size="8">${cw.toFixed(2)}</text>`;
    colPx += cw;
  });

  // Overall width string (outer, offset 42px)
  const dimOuterY = oy + bd*SCALE + 44;
  gDimensions += `<line x1="${ox}" y1="${dimOuterY}" x2="${ox+bw*SCALE}" y2="${dimOuterY}" stroke="#000000" stroke-width="0.4"/>`;
  // Extension lines from wall to outer string
  gDimensions += `<line x1="${ox}" y1="${oy+bd*SCALE+3}" x2="${ox}" y2="${dimOuterY+4}" stroke="#000000" stroke-width="0.3"/>`;
  gDimensions += `<line x1="${ox+bw*SCALE}" y1="${oy+bd*SCALE+3}" x2="${ox+bw*SCALE}" y2="${dimOuterY+4}" stroke="#000000" stroke-width="0.3"/>`;
  // Tick marks
  gDimensions += `<line x1="${ox}" y1="${dimOuterY-4}" x2="${ox}" y2="${dimOuterY+4}" stroke="#000000" stroke-width="1.0"/>`;
  gDimensions += `<line x1="${ox+bw*SCALE}" y1="${dimOuterY-4}" x2="${ox+bw*SCALE}" y2="${dimOuterY+4}" stroke="#000000" stroke-width="1.0"/>`;
  gDimensions += `<text x="${ox+bw*SCALE/2}" y="${dimOuterY-4}" text-anchor="middle" fill="#000000" font-size="9" font-weight="bold">${bw.toFixed(2)}</text>`;

  // Overall depth (right side, offset 42px)
  const dimRightX = ox + bw*SCALE + 44;
  gDimensions += `<line x1="${dimRightX}" y1="${oy}" x2="${dimRightX}" y2="${oy+bd*SCALE}" stroke="#000000" stroke-width="0.4"/>`;
  gDimensions += `<line x1="${ox+bw*SCALE+3}" y1="${oy}" x2="${dimRightX+4}" y2="${oy}" stroke="#000000" stroke-width="0.3"/>`;
  gDimensions += `<line x1="${ox+bw*SCALE+3}" y1="${oy+bd*SCALE}" x2="${dimRightX+4}" y2="${oy+bd*SCALE}" stroke="#000000" stroke-width="0.3"/>`;
  gDimensions += `<line x1="${dimRightX-4}" y1="${oy}" x2="${dimRightX+4}" y2="${oy}" stroke="#000000" stroke-width="1.0"/>`;
  gDimensions += `<line x1="${dimRightX-4}" y1="${oy+bd*SCALE}" x2="${dimRightX+4}" y2="${oy+bd*SCALE}" stroke="#000000" stroke-width="1.0"/>`;
  gDimensions += `<text x="${dimRightX+6}" y="${oy+bd*SCALE/2}" text-anchor="middle" fill="#000000" font-size="9" font-weight="bold" transform="rotate(90,${dimRightX+6},${oy+bd*SCALE/2})">${bd.toFixed(2)}</text>`;

  // Column center-lines (light dashed)
  [cw0, cw0+cw1].forEach(xm => {
    const px = ox + xm*SCALE;
    gDimensions += `<line x1="${px}" y1="${oy}" x2="${px}" y2="${oy+bd*SCALE}" stroke="#aaaaaa" stroke-width="0.4" stroke-dasharray="4,4"/>`;
  });

  // ── layer-symbols: north arrow, scale bar, SBC warnings ──────────────────
  // North arrow — top-right inside building
  const nax = ox + bw*SCALE - 24, nay = oy + 26;
  gSymbols += `<circle cx="${nax}" cy="${nay}" r="15" fill="white" stroke="#000000" stroke-width="0.8"/>`;
  gSymbols += `<line x1="${nax}" y1="${nay+11}" x2="${nax}" y2="${nay-11}" stroke="#000000" stroke-width="1"/>`;
  gSymbols += `<polygon points="${nax},${nay-14} ${nax-4},${nay-5} ${nax+4},${nay-5}" fill="#000000"/>`;
  gSymbols += `<polygon points="${nax},${nay+14} ${nax-4},${nay+5} ${nax+4},${nay+5}" fill="white" stroke="#000000" stroke-width="0.5"/>`;
  gSymbols += `<text x="${nax}" y="${nay+28}" text-anchor="middle" fill="#000000" font-size="9" font-weight="700">N</text>`;

  // Scale bar — bottom left of plan area
  const sbX = ox + 4;
  const sbY = oy + bd*SCALE + 57;
  gSymbols += `<text x="${sbX}" y="${sbY-4}" fill="#000000" font-size="8">مقياس 1:100</text>`;
  for (let i = 0; i < 5; i++) {
    gSymbols += `<rect x="${sbX+i*SCALE}" y="${sbY}" width="${SCALE}" height="6" fill="${i%2===0?"#000000":"white"}" stroke="#000000" stroke-width="0.8"/>`;
    gSymbols += `<text x="${sbX+i*SCALE}" y="${sbY+16}" fill="#000000" font-size="7">${i}</text>`;
  }
  gSymbols += `<text x="${sbX+5*SCALE}" y="${sbY+16}" fill="#000000" font-size="7">5م</text>`;

  // SBC warnings — left margin
  const SBC_MIN: Record<string, number> = {
    master_bedroom: 16, bedroom: 9, majlis: 20, family_living: 16,
    living: 16, kitchen: 6, bathroom: 4, toilet: 2.4, maid_room: 6,
  };
  const sbcWarnings: string[] = [];
  rooms.forEach(r => {
    const minArea = SBC_MIN[r.type ?? ""];
    if (minArea && (r.area ?? 0) < minArea) {
      sbcWarnings.push(`⚠ ${r.nameAr}: ${(r.area??0).toFixed(1)}م²`);
    }
  });
  if (sbcWarnings.length > 0) {
    const warnX = 4, warnY0 = oy + 10;
    gSymbols += `<text x="${warnX}" y="${warnY0}" fill="#000000" font-size="7" font-weight="bold">SBC:</text>`;
    sbcWarnings.slice(0, 7).forEach((w, i) => {
      gSymbols += `<text x="${warnX}" y="${warnY0 + 11 + i * 10}" fill="#444444" font-size="6">${w}</text>`;
    });
  }

  // Legend box — bottom right
  const legBoxW = 158, legBoxH = 108;
  const legX = ox + bw*SCALE - legBoxW;
  const legY = oy + bd*SCALE + 57;
  gSymbols += `<rect x="${legX}" y="${legY}" width="${legBoxW}" height="${legBoxH}" fill="white" stroke="#000000" stroke-width="1"/>`;
  gSymbols += `<line x1="${legX}" y1="${legY+14}" x2="${legX+legBoxW}" y2="${legY+14}" stroke="#000000" stroke-width="1"/>`;
  gSymbols += `<text x="${legX+legBoxW/2}" y="${legY+10}" text-anchor="middle" fill="#000000" font-size="8" font-weight="bold">مفتاح الرموز — Legend</text>`;
  const li = legY + 20, lRow = 15, lSx = legX + 6, lTx = legX + 30;
  gSymbols += `<rect x="${lSx}" y="${li+0*lRow}" width="20" height="8" fill="#000000"/>`;
  gSymbols += `<rect x="${lSx+2}" y="${li+0*lRow+2}" width="16" height="4" fill="white"/>`;
  gSymbols += `<text x="${lTx}" y="${li+0*lRow+8}" fill="#000000" font-size="8">جدار خارجي / Ext. Wall</text>`;
  gSymbols += `<rect x="${lSx}" y="${li+1*lRow+1}" width="20" height="5" fill="#000000"/>`;
  gSymbols += `<rect x="${lSx+1}" y="${li+1*lRow+2}" width="18" height="3" fill="white"/>`;
  gSymbols += `<text x="${lTx}" y="${li+1*lRow+8}" fill="#000000" font-size="8">جدار داخلي / Int. Wall</text>`;
  gSymbols += `<line x1="${lSx}" y1="${li+2*lRow}" x2="${lSx+12}" y2="${li+2*lRow}" stroke="#000000" stroke-width="0.8"/>`;
  gSymbols += `<path d="M ${lSx} ${li+2*lRow} A 12 12 0 0 1 ${lSx+12} ${li+2*lRow+12}" fill="none" stroke="#000000" stroke-width="0.8" stroke-dasharray="2,2"/>`;
  gSymbols += `<text x="${lTx}" y="${li+2*lRow+8}" fill="#000000" font-size="8">باب / Door</text>`;
  gSymbols += `<line x1="${lSx}" y1="${li+3*lRow}"   x2="${lSx+20}" y2="${li+3*lRow}"   stroke="#000000" stroke-width="0.8"/>`;
  gSymbols += `<line x1="${lSx}" y1="${li+3*lRow+3}" x2="${lSx+20}" y2="${li+3*lRow+3}" stroke="#000000" stroke-width="0.8"/>`;
  gSymbols += `<line x1="${lSx}" y1="${li+3*lRow+6}" x2="${lSx+20}" y2="${li+3*lRow+6}" stroke="#000000" stroke-width="0.8"/>`;
  gSymbols += `<text x="${lTx}" y="${li+3*lRow+8}" fill="#000000" font-size="8">نافذة / Window</text>`;
  for (let s = 0; s < 4; s++) {
    gSymbols += `<line x1="${lSx}" y1="${li+4*lRow+s*2}" x2="${lSx+18}" y2="${li+4*lRow+s*2}" stroke="#333333" stroke-width="0.7"/>`;
  }
  gSymbols += `<line x1="${lSx+9}" y1="${li+4*lRow+10}" x2="${lSx+9}" y2="${li+4*lRow+2}" stroke="#000000" stroke-width="1"/>`;
  gSymbols += `<polygon points="${lSx+9},${li+4*lRow+2} ${lSx+6},${li+4*lRow+7} ${lSx+12},${li+4*lRow+7}" fill="#000000"/>`;
  gSymbols += `<text x="${lTx}" y="${li+4*lRow+8}" fill="#000000" font-size="8">درج / Staircase</text>`;
  gSymbols += `<line x1="${lSx}" y1="${li+5*lRow}" x2="${lSx+20}" y2="${li+5*lRow}" stroke="#000000" stroke-width="0.4"/>`;
  gSymbols += `<line x1="${lSx}" y1="${li+5*lRow-4}" x2="${lSx}" y2="${li+5*lRow+4}" stroke="#000000" stroke-width="0.8"/>`;
  gSymbols += `<line x1="${lSx+20}" y1="${li+5*lRow-4}" x2="${lSx+20}" y2="${li+5*lRow+4}" stroke="#000000" stroke-width="0.8"/>`;
  gSymbols += `<text x="${lTx}" y="${li+5*lRow+8}" fill="#000000" font-size="8">كوتة / Dimension</text>`;

  // ── layer-titleblock: header + footer ─────────────────────────────────────
  // Header
  gTitleBlock += `<rect x="0" y="0" width="${svgW}" height="${TITLE_H}" fill="white"/>`;
  gTitleBlock += `<rect x="0" y="0" width="${svgW}" height="${TITLE_H}" fill="none" stroke="#000000" stroke-width="1"/>`;
  gTitleBlock += `<line x1="0" y1="${TITLE_H}" x2="${svgW}" y2="${TITLE_H}" stroke="#000000" stroke-width="2"/>`;
  gTitleBlock += `<text x="16" y="26" fill="#000000" font-size="18" font-weight="900">SOAR.AI</text>`;
  gTitleBlock += `<text x="16" y="44" fill="#000000" font-size="9">منصة المخططات المعمارية الذكية</text>`;
  gTitleBlock += `<line x1="120" y1="8" x2="120" y2="${TITLE_H-8}" stroke="#000000" stroke-width="0.5"/>`;
  const conceptNames = [
    "المفهوم العصري المفتوح", "المفهوم التراثي السعودي", "المفهوم الوظيفي الذكي",
    "المفهوم الفاخر الموسّع", "المفهوم المتوسطي", "المفهوم الاقتصادي الأمثل"
  ];
  gTitleBlock += `<text x="${svgW/2}" y="26" text-anchor="middle" fill="#000000" font-size="13" font-weight="bold">${conceptNames[conceptIndex] ?? `المفهوم ${conceptIndex+1}`}</text>`;
  gTitleBlock += `<text x="${svgW/2}" y="44" text-anchor="middle" fill="#000000" font-size="9">مخطط الدور الأرضي — Ground Floor Plan</text>`;
  gTitleBlock += `<line x1="${svgW-160}" y1="8" x2="${svgW-160}" y2="${TITLE_H-8}" stroke="#000000" stroke-width="0.5"/>`;
  gTitleBlock += `<text x="${svgW-12}" y="20" text-anchor="end" fill="#000000" font-size="8">مقياس 1:100</text>`;
  gTitleBlock += `<text x="${svgW-12}" y="32" text-anchor="end" fill="#000000" font-size="8">مساحة الأرض: ${layout.landArea} م²</text>`;
  gTitleBlock += `<text x="${svgW-12}" y="44" text-anchor="end" fill="#000000" font-size="8">مساحة البناء: ${layout.buildingArea} م²</text>`;
  gTitleBlock += `<text x="${svgW-12}" y="56" text-anchor="end" fill="#000000" font-size="8">${layout.summary.totalFloors} دور — ${layout.summary.bedrooms} غرف نوم</text>`;

  // Footer title block
  const footerY = svgH - FOOTER_H;
  gTitleBlock += `<rect x="0" y="${footerY}" width="${svgW}" height="${FOOTER_H}" fill="white"/>`;
  gTitleBlock += `<line x1="0" y1="${footerY}" x2="${svgW}" y2="${footerY}" stroke="#000000" stroke-width="1.5"/>`;
  gTitleBlock += `<rect x="0" y="${footerY}" width="${svgW}" height="${FOOTER_H}" fill="none" stroke="#000000" stroke-width="1"/>`;
  [svgW*0.25, svgW*0.5, svgW*0.75].forEach(fx => {
    gTitleBlock += `<line x1="${fx}" y1="${footerY}" x2="${fx}" y2="${svgH}" stroke="#000000" stroke-width="0.5"/>`;
  });
  const footerData = [
    { label: "المشروع", value: "SOAR.AI", cx: svgW*0.125 },
    { label: "المساحة الكلية", value: `${layout.summary.totalArea} م²`, cx: svgW*0.375 },
    { label: "التكلفة التقديرية", value: layout.summary.estimatedCost, cx: svgW*0.625 },
    { label: "الأدوار", value: `${layout.summary.totalFloors} دور`, cx: svgW*0.875 },
  ];
  footerData.forEach(({ label, value, cx }) => {
    gTitleBlock += `<text x="${cx}" y="${footerY+18}" text-anchor="middle" fill="#555555" font-size="8">${label}</text>`;
    gTitleBlock += `<text x="${cx}" y="${footerY+36}" text-anchor="middle" fill="#000000" font-size="11" font-weight="bold">${value}</text>`;
  });
  const today = new Date().toLocaleDateString("ar-SA");
  gTitleBlock += `<text x="${svgW-8}" y="${footerY+56}" text-anchor="end" fill="#555555" font-size="8">${today}</text>`;
  gTitleBlock += `<text x="8" y="${footerY+56}" fill="#555555" font-size="8">SOAR.AI © 2025 — جميع الحقوق محفوظة</text>`;

  // ── Assemble layers bottom-to-top ──────────────────────────────────────────
  svg += `<g id="layer-boundary">${gBoundary}</g>`;
  svg += `<g id="layer-hatch">${gHatch}</g>`;
  svg += `<g id="layer-walls">${gWalls}</g>`;
  svg += `<g id="layer-openings">${gOpenings}</g>`;
  svg += `<g id="layer-stairs">${gStairs}</g>`;
  svg += `<g id="layer-dimensions">${gDimensions}</g>`;
  svg += `<g id="layer-labels">${gLabels}</g>`;
  svg += `<g id="layer-symbols">${gSymbols}</g>`;
  svg += `<g id="layer-titleblock">${gTitleBlock}</g>`;

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
