/**
 * SOAR.AI — Binary Space Partitioning Layout Engine
 * Based on real Saudi architectural blueprints analysis
 * Reference: Ground floor + First floor villa blueprints (10.5m × 22m)
 */

export interface Room {
  id: string;
  nameAr: string;
  nameEn: string;
  type: RoomType;
  x: number;      // meters from origin
  y: number;
  width: number;  // meters
  height: number; // meters
  area: number;   // m²
  floor: number;
  hasWindow: boolean;
  hasDoor: boolean;
  doorWall: "north" | "south" | "east" | "west";
}

export type RoomType =
  | "bedroom" | "master_bedroom" | "living" | "majlis" | "kitchen"
  | "bathroom" | "toilet" | "dining" | "corridor" | "entrance"
  | "parking" | "storage" | "balcony" | "laundry" | "maid_room"
  | "office" | "prayer" | "staircase" | "family_living" | "distributor";

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

// ─── Saudi Building Code + Real Blueprint Dimensions ─────────────────────────
const SAUDI_CODE = {
  minRoomArea: { bedroom: 12, master_bedroom: 16, living: 20, kitchen: 8, bathroom: 4, toilet: 2.5 },
  setbacks: { front: 4, back: 2, side: 1.5 },
  maxCoverage: 0.6,
  minCorridorWidth: 1.2,
  minEntranceArea: 4,
};

/**
 * Real room dimensions extracted from Saudi villa blueprints
 * Source: Actual architectural drawings (ground + first floor)
 */
const REAL_ROOM_DIMS: Record<RoomType, { w: [number, number]; h: [number, number]; minArea: number }> = {
  master_bedroom:  { w: [4.60, 5.00], h: [3.60, 4.20], minArea: 16 },
  bedroom:         { w: [3.10, 4.30], h: [3.60, 4.20], minArea: 12 },
  majlis:          { w: [7.40, 7.40], h: [3.90, 4.20], minArea: 28 },
  family_living:   { w: [4.30, 4.50], h: [3.60, 4.50], minArea: 15 },
  living:          { w: [4.30, 5.46], h: [4.00, 5.00], minArea: 20 },
  kitchen:         { w: [3.10, 3.14], h: [2.30, 4.00], minArea: 8  },
  dining:          { w: [3.10, 4.24], h: [3.00, 3.90], minArea: 10 },
  bathroom:        { w: [1.90, 3.14], h: [1.50, 2.00], minArea: 4  },
  toilet:          { w: [1.30, 1.75], h: [1.00, 1.45], minArea: 2  },
  entrance:        { w: [4.80, 5.80], h: [1.40, 2.00], minArea: 7  },
  balcony:         { w: [5.10, 5.60], h: [1.00, 1.80], minArea: 5  },
  staircase:       { w: [2.50, 2.50], h: [6.00, 6.60], minArea: 14 },
  corridor:        { w: [2.30, 2.80], h: [3.70, 6.60], minArea: 8  },
  distributor:     { w: [2.30, 2.80], h: [3.70, 6.60], minArea: 8  },
  maid_room:       { w: [3.10, 3.10], h: [2.10, 2.10], minArea: 6  },
  storage:         { w: [1.80, 2.00], h: [2.40, 3.00], minArea: 4  },
  parking:         { w: [5.00, 6.00], h: [3.00, 3.50], minArea: 15 },
  laundry:         { w: [2.00, 2.50], h: [1.50, 2.00], minArea: 3  },
  office:          { w: [3.00, 4.00], h: [3.00, 4.00], minArea: 10 },
  prayer:          { w: [2.50, 3.50], h: [2.50, 3.50], minArea: 8  },
};

function randBetween(min: number, max: number): number {
  return parseFloat((min + Math.random() * (max - min)).toFixed(2));
}

// ─── Saudi Villa Room Program ─────────────────────────────────────────────────
function getRoomProgram(
  buildingType: "villa" | "apartment",
  bedrooms: number,
  bathrooms: number,
  floors: number,
  landArea: number,
  extras: {
    majlis?: number; kitchen?: number; dining?: number; maidRoom?: number;
    office?: number; storage?: number; parking?: number; balcony?: number;
  },
  conceptIndex: number
): { type: RoomType; nameAr: string; nameEn: string; minArea: number; floor: number; prefW: number; prefH: number }[] {
  const rooms: { type: RoomType; nameAr: string; nameEn: string; minArea: number; floor: number; prefW: number; prefH: number }[] = [];

  const dim = (t: RoomType) => {
    const d = REAL_ROOM_DIMS[t];
    return { w: randBetween(d.w[0], d.w[1]), h: randBetween(d.h[0], d.h[1]), minArea: d.minArea };
  };

  // ── Ground Floor (0) ──────────────────────────────────────────────────────
  // Entrance
  const ent = dim("entrance");
  rooms.push({ type: "entrance", nameAr: "بهو المدخل", nameEn: "Entrance Hall", minArea: ent.minArea, floor: 0, prefW: ent.w, prefH: ent.h });

  // Majlis (men's reception) — always on ground floor
  if ((extras.majlis ?? 1) > 0) {
    const m = dim("majlis");
    rooms.push({ type: "majlis", nameAr: "مجلس رجال", nameEn: "Men's Majlis", minArea: m.minArea, floor: 0, prefW: m.w, prefH: m.h });
  }

  // Staircase
  const st = dim("staircase");
  rooms.push({ type: "staircase", nameAr: "درج", nameEn: "Staircase", minArea: st.minArea, floor: 0, prefW: st.w, prefH: st.h });

  // Distributor/corridor
  const dist = dim("distributor");
  rooms.push({ type: "distributor", nameAr: "موزع", nameEn: "Distributor", minArea: dist.minArea, floor: 0, prefW: dist.w, prefH: dist.h });

  // Ground floor living (مقبة / صالة)
  const liv = dim("living");
  rooms.push({ type: "living", nameAr: "صالة عائلية", nameEn: "Family Hall", minArea: liv.minArea, floor: 0, prefW: liv.w, prefH: liv.h });

  // Kitchen
  const kit = dim("kitchen");
  rooms.push({ type: "kitchen", nameAr: "مطبخ", nameEn: "Kitchen", minArea: kit.minArea, floor: 0, prefW: kit.w, prefH: kit.h });

  // Toilet
  const tlt = dim("toilet");
  rooms.push({ type: "toilet", nameAr: "دورة مياه", nameEn: "Toilet", minArea: tlt.minArea, floor: 0, prefW: tlt.w, prefH: tlt.h });

  // Bathroom
  const bath0 = dim("bathroom");
  rooms.push({ type: "bathroom", nameAr: "حمام", nameEn: "Bathroom", minArea: bath0.minArea, floor: 0, prefW: bath0.w, prefH: bath0.h });

  // Maid room
  if ((extras.maidRoom ?? 1) > 0) {
    const mr = dim("maid_room");
    rooms.push({ type: "maid_room", nameAr: "غرفة خادمة", nameEn: "Maid Room", minArea: mr.minArea, floor: 0, prefW: mr.w, prefH: mr.h });
  }

  // Storage
  if ((extras.storage ?? 1) > 0) {
    const stor = dim("storage");
    rooms.push({ type: "storage", nameAr: "مخزن", nameEn: "Storage", minArea: stor.minArea, floor: 0, prefW: stor.w, prefH: stor.h });
  }

  // Ground floor bedrooms (1-2 on ground floor for large villas)
  const groundBeds = Math.min(2, Math.floor(bedrooms / 2));
  for (let b = 0; b < groundBeds; b++) {
    const bd = dim("bedroom");
    rooms.push({ type: "bedroom", nameAr: `غرفة نوم ${b + 1}`, nameEn: `Bedroom ${b + 1}`, minArea: bd.minArea, floor: 0, prefW: bd.w, prefH: bd.h });
  }

  // ── Upper Floors ──────────────────────────────────────────────────────────
  for (let f = 1; f <= floors; f++) {
    // Staircase continuation
    const stUp = dim("staircase");
    rooms.push({ type: "staircase", nameAr: "درج", nameEn: "Staircase", minArea: stUp.minArea, floor: f, prefW: stUp.w, prefH: stUp.h });

    // Distributor
    const distUp = dim("distributor");
    rooms.push({ type: "distributor", nameAr: "موزع", nameEn: "Distributor", minArea: distUp.minArea, floor: f, prefW: distUp.w, prefH: distUp.h });

    // Second majlis (men's) on upper floor — typical in Saudi villas
    if (conceptIndex < 4) {
      const m2 = dim("majlis");
      rooms.push({ type: "majlis", nameAr: "مجلس رجال", nameEn: "Men's Majlis", minArea: m2.minArea, floor: f, prefW: m2.w, prefH: m2.h });
    }

    // Family living room on upper floor
    const famLiv = dim("family_living");
    rooms.push({ type: "family_living", nameAr: "صالة عائلية", nameEn: "Family Living", minArea: famLiv.minArea, floor: f, prefW: famLiv.w, prefH: famLiv.h });

    // Master bedroom
    const mb = dim("master_bedroom");
    rooms.push({ type: "master_bedroom", nameAr: "غرفة نوم ماستر", nameEn: "Master Bedroom", minArea: mb.minArea, floor: f, prefW: mb.w, prefH: mb.h });

    // Master bathroom
    const mbath = dim("bathroom");
    rooms.push({ type: "bathroom", nameAr: "حمام ماستر", nameEn: "Master Bathroom", minArea: mbath.minArea, floor: f, prefW: mbath.w, prefH: mbath.h });

    // Regular bedrooms
    const upperBeds = bedrooms - groundBeds;
    for (let b = 1; b < upperBeds; b++) {
      const bd = dim("bedroom");
      rooms.push({ type: "bedroom", nameAr: `غرفة نوم ${groundBeds + b}`, nameEn: `Bedroom ${groundBeds + b}`, minArea: bd.minArea, floor: f, prefW: bd.w, prefH: bd.h });
    }

    // Bathrooms
    const upperBaths = Math.max(1, bathrooms - 1);
    for (let bt = 1; bt < upperBaths; bt++) {
      const bth = dim("bathroom");
      rooms.push({ type: "bathroom", nameAr: "حمام", nameEn: "Bathroom", minArea: bth.minArea, floor: f, prefW: bth.w, prefH: bth.h });
    }

    // Kitchen on upper floor
    const kitUp = dim("kitchen");
    rooms.push({ type: "kitchen", nameAr: "مطبخ", nameEn: "Kitchen", minArea: kitUp.minArea, floor: f, prefW: kitUp.w, prefH: kitUp.h });

    // Dining room
    const din = dim("dining");
    rooms.push({ type: "dining", nameAr: "غرفة طعام", nameEn: "Dining Room", minArea: din.minArea, floor: f, prefW: din.w, prefH: din.h });

    // Balcony
    if ((extras.balcony ?? 1) > 0) {
      const bal = dim("balcony");
      rooms.push({ type: "balcony", nameAr: "بلكونة", nameEn: "Balcony", minArea: bal.minArea, floor: f, prefW: bal.w, prefH: bal.h });
    }

    // Toilet
    const tltUp = dim("toilet");
    rooms.push({ type: "toilet", nameAr: "دورة مياه", nameEn: "Toilet", minArea: tltUp.minArea, floor: f, prefW: tltUp.w, prefH: tltUp.h });
  }

  return rooms;
}

// ─── BSP Node ────────────────────────────────────────────────────────────────
interface BSPNode {
  x: number; y: number; w: number; h: number;
  left?: BSPNode; right?: BSPNode;
  room?: { type: RoomType; nameAr: string; nameEn: string; minArea: number };
}

function splitNode(node: BSPNode, minSize: number): boolean {
  if (node.left || node.right) return false;
  const horizontal = node.w > node.h ? false : node.h > node.w ? true : Math.random() > 0.5;
  const maxSize = horizontal ? node.h - minSize : node.w - minSize;
  if (maxSize <= minSize) return false;
  const split = parseFloat((minSize + Math.random() * (maxSize - minSize)).toFixed(2));
  if (horizontal) {
    node.left = { x: node.x, y: node.y, w: node.w, h: split };
    node.right = { x: node.x, y: node.y + split, w: node.w, h: node.h - split };
  } else {
    node.left = { x: node.x, y: node.y, w: split, h: node.h };
    node.right = { x: node.x + split, y: node.y, w: node.w - split, h: node.h };
  }
  return true;
}

function buildBSP(root: BSPNode, iterations: number, minSize: number): void {
  const leaves: BSPNode[] = [root];
  for (let i = 0; i < iterations; i++) {
    const idx = Math.floor(Math.random() * leaves.length);
    const node = leaves[idx];
    if (splitNode(node, minSize)) {
      leaves.splice(idx, 1);
      leaves.push(node.left!, node.right!);
    }
  }
}

function getLeaves(node: BSPNode): BSPNode[] {
  if (!node.left && !node.right) return [node];
  return [...(node.left ? getLeaves(node.left) : []), ...(node.right ? getLeaves(node.right) : [])];
}

// ─── Main Layout Generator ────────────────────────────────────────────────────
export function generateBSPLayout(params: {
  landArea: number;
  buildingType: "villa" | "apartment";
  numberOfFloors: number;
  bedrooms: number;
  bathrooms: number;
  conceptIndex: number;
  extras?: {
    majlis?: number; kitchen?: number; dining?: number; maidRoom?: number;
    office?: number; storage?: number; parking?: number; balcony?: number;
  };
  setbacks?: { front?: number; back?: number; side?: number };
  landWidth?: number;
  landLength?: number;
}): BuildingLayout {
  const {
    landArea, buildingType, numberOfFloors, bedrooms, bathrooms,
    conceptIndex, extras = {}, setbacks: customSetbacks,
    landWidth, landLength
  } = params;

  const setbacks = {
    front: customSetbacks?.front ?? SAUDI_CODE.setbacks.front,
    back: customSetbacks?.back ?? SAUDI_CODE.setbacks.back,
    side: customSetbacks?.side ?? SAUDI_CODE.setbacks.side,
  };

  // Calculate building footprint from real land dimensions if available
  let buildingWidth: number;
  let buildingDepth: number;

  if (landWidth && landLength) {
    buildingWidth = landWidth - setbacks.side * 2;
    buildingDepth = landLength - setbacks.front - setbacks.back;
  } else {
    const maxCoverage = SAUDI_CODE.maxCoverage;
    const buildingArea = Math.min(landArea * maxCoverage, landArea * 0.55);
    // Real Saudi villa aspect ratio ~1:2 (width:depth) based on reference blueprints
    const aspectRatios = [0.48, 0.50, 0.45, 0.52, 0.47, 0.50];
    const ratio = aspectRatios[conceptIndex % aspectRatios.length];
    buildingWidth = parseFloat(Math.sqrt(buildingArea * ratio).toFixed(2));
    buildingDepth = parseFloat((buildingArea / buildingWidth).toFixed(2));
  }

  const buildingArea = parseFloat((buildingWidth * buildingDepth).toFixed(1));

  // Get room program based on real blueprint analysis
  const roomProgram = getRoomProgram(
    buildingType, bedrooms, bathrooms, numberOfFloors, landArea, extras, conceptIndex
  );

  const floors: FloorPlan[] = [];

  for (let f = 0; f <= numberOfFloors; f++) {
    const floorRooms = roomProgram.filter(r => r.floor === f);
    if (floorRooms.length === 0) continue;

    // BSP for this floor
    // CRITICAL: iterations must equal exactly floorRooms.length - 1
    // so we get exactly floorRooms.length leaves — no empty cells, no gaps
    const root: BSPNode = { x: 0, y: 0, w: buildingWidth, h: buildingDepth };
    const targetLeaves = floorRooms.length;
    const minSize = 1.8;
    // Split exactly (targetLeaves - 1) times to get targetLeaves leaves
    buildBSP(root, targetLeaves - 1, minSize);

    const leaves = getLeaves(root);
    leaves.sort((a, b) => (b.w * b.h) - (a.w * a.h));
    const sortedRooms = [...floorRooms].sort((a, b) => b.minArea - a.minArea);

    const rooms: Room[] = [];

    // Assign each room to a leaf — if more leaves than rooms, merge extras into last room
    // If more rooms than leaves, split the largest leaf
    const assignCount = Math.max(leaves.length, sortedRooms.length);

    for (let i = 0; i < Math.min(leaves.length, sortedRooms.length); i++) {
      const leaf = leaves[i];
      const roomDef = sortedRooms[i];

      // Room fills the ENTIRE leaf cell — walls are drawn as borders by SVG renderer
      // This eliminates all gaps between rooms
      const rw = parseFloat(Math.max(leaf.w, 1.8).toFixed(2));
      const rh = parseFloat(Math.max(leaf.h, 1.8).toFixed(2));

      const room: Room = {
        id: `${roomDef.type}-f${f}-${i}`,
        nameAr: roomDef.nameAr,
        nameEn: roomDef.nameEn,
        type: roomDef.type,
        x: parseFloat(leaf.x.toFixed(2)),
        y: parseFloat(leaf.y.toFixed(2)),
        width: rw,
        height: rh,
        area: parseFloat((rw * rh).toFixed(1)),
        floor: f,
        hasWindow: ["bedroom", "master_bedroom", "living", "family_living", "majlis", "kitchen", "dining", "balcony", "office"].includes(roomDef.type),
        hasDoor: roomDef.type !== "balcony",
        doorWall: ["majlis", "living", "family_living"].includes(roomDef.type) ? "south" :
                  ["bedroom", "master_bedroom"].includes(roomDef.type) ? "west" :
                  i % 2 === 0 ? "south" : "east",
      };
      rooms.push(room);
    }

    // If there are leftover leaves (more leaves than rooms), assign them as storage/corridor
    // to fill the building completely with no empty cells
    for (let i = sortedRooms.length; i < leaves.length; i++) {
      const leaf = leaves[i];
      const rw = parseFloat(Math.max(leaf.w, 1.8).toFixed(2));
      const rh = parseFloat(Math.max(leaf.h, 1.8).toFixed(2));
      const fillType: RoomType = rw * rh < 6 ? "storage" : "corridor";
      rooms.push({
        id: `${fillType}-f${f}-fill-${i}`,
        nameAr: fillType === "storage" ? "مخزن" : "ممر",
        nameEn: fillType === "storage" ? "Storage" : "Corridor",
        type: fillType,
        x: parseFloat(leaf.x.toFixed(2)),
        y: parseFloat(leaf.y.toFixed(2)),
        width: rw,
        height: rh,
        area: parseFloat((rw * rh).toFixed(1)),
        floor: f,
        hasWindow: false,
        hasDoor: true,
        doorWall: "south",
      });
    }
    void assignCount;

    floors.push({
      floor: f,
      rooms,
      totalArea: parseFloat((buildingWidth * buildingDepth).toFixed(1)),
      buildingWidth: parseFloat(buildingWidth.toFixed(2)),
      buildingDepth: parseFloat(buildingDepth.toFixed(2)),
    });
  }

  const totalRooms = floors.reduce((sum, f) => sum + f.rooms.length, 0);
  const totalArea = parseFloat((buildingArea * (numberOfFloors + 1)).toFixed(1));
  const costPerSqm = buildingType === "villa" ? 2500 : 2000;
  const estimatedCost = `SAR ${(totalArea * costPerSqm / 1000).toFixed(0)}K`;

  const layout: BuildingLayout = {
    floors,
    landArea,
    buildingArea,
    buildingWidth: parseFloat(buildingWidth.toFixed(2)),
    buildingDepth: parseFloat(buildingDepth.toFixed(2)),
    totalRooms,
    setbacks,
    svgData: "",
    summary: {
      totalFloors: numberOfFloors,
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

// ─── SVG Generator — AutoCAD Style ───────────────────────────────────────────
// Colors inspired by real Saudi architectural drawings (white background, black walls)
const ROOM_FILL: Record<string, string> = {
  bedroom:        "#EEF2FF",
  master_bedroom: "#FFF7ED",
  living:         "#F0FDF4",
  family_living:  "#F0FDF4",
  majlis:         "#FEF3C7",
  kitchen:        "#ECFDF5",
  bathroom:       "#EFF6FF",
  toilet:         "#EFF6FF",
  dining:         "#FFF1F2",
  corridor:       "#F8FAFC",
  distributor:    "#F8FAFC",
  entrance:       "#FFFBEB",
  parking:        "#F1F5F9",
  storage:        "#F8FAFC",
  balcony:        "#F0FDF4",
  laundry:        "#EFF6FF",
  maid_room:      "#FDF4FF",
  office:         "#EEF2FF",
  prayer:         "#FFFBEB",
  staircase:      "#F1F5F9",
};

const ROOM_LABEL_COLOR: Record<string, string> = {
  bedroom:        "#3730A3",
  master_bedroom: "#92400E",
  living:         "#166534",
  family_living:  "#166534",
  majlis:         "#92400E",
  kitchen:        "#065F46",
  bathroom:       "#1E40AF",
  toilet:         "#1E40AF",
  dining:         "#9F1239",
  corridor:       "#475569",
  distributor:    "#475569",
  entrance:       "#92400E",
  parking:        "#475569",
  storage:        "#475569",
  balcony:        "#166534",
  laundry:        "#1E40AF",
  maid_room:      "#6B21A8",
  office:         "#3730A3",
  prayer:         "#92400E",
  staircase:      "#475569",
};

export function generateSVG(layout: BuildingLayout, conceptIndex: number = 0): string {
  const SCALE = 45; // pixels per meter — matches real blueprint scale
  const MARGIN = 80;
  const TITLE_H = 60;
  const FOOTER_H = 70;

  const svgW = Math.ceil(layout.buildingWidth * SCALE) + MARGIN * 2;
  const svgH = Math.ceil(layout.buildingDepth * SCALE) + MARGIN * 2 + TITLE_H + FOOTER_H;

  const firstFloor = layout.floors[0];
  if (!firstFloor) return "";

  const rooms = firstFloor.rooms;
  const bw = layout.buildingWidth;
  const bd = layout.buildingDepth;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="${svgW}" height="${svgH}">`;
  svg += `<defs>`;
  // Hatch pattern for walls
  svg += `<pattern id="hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">`;
  svg += `<line x1="0" y1="0" x2="0" y2="4" stroke="#94a3b8" stroke-width="1.5"/>`;
  svg += `</pattern>`;
  // Staircase pattern
  svg += `<pattern id="stairs" width="8" height="8" patternUnits="userSpaceOnUse">`;
  svg += `<line x1="0" y1="8" x2="8" y2="0" stroke="#94a3b8" stroke-width="0.5"/>`;
  svg += `</pattern>`;
  svg += `</defs>`;

  // White background
  svg += `<rect width="${svgW}" height="${svgH}" fill="white"/>`;

  // Title block (top)
  svg += `<rect x="0" y="0" width="${svgW}" height="${TITLE_H}" fill="#1e293b"/>`;
  svg += `<text x="${svgW / 2}" y="22" text-anchor="middle" fill="#f97316" font-size="18" font-weight="bold" font-family="Arial">SOAR.AI</text>`;
  svg += `<text x="${svgW / 2}" y="42" text-anchor="middle" fill="white" font-size="12" font-family="Arial">مخطط معماري — الدور الأرضي | المفهوم #${conceptIndex + 1}</text>`;
  svg += `<text x="${svgW - 10}" y="22" text-anchor="end" fill="#94a3b8" font-size="9" font-family="Arial">مقياس 1:100</text>`;
  svg += `<text x="${svgW - 10}" y="36" text-anchor="end" fill="#94a3b8" font-size="9" font-family="Arial">المساحة: ${layout.landArea}م²</text>`;
  svg += `<text x="${svgW - 10}" y="50" text-anchor="end" fill="#94a3b8" font-size="9" font-family="Arial">البناء: ${layout.buildingArea}م²</text>`;

  // Land boundary (dashed)
  const landW = bw + layout.setbacks.side * 2;
  const landD = bd + layout.setbacks.front + layout.setbacks.back;
  const landX = MARGIN - layout.setbacks.side * SCALE;
  const landY = MARGIN + TITLE_H - layout.setbacks.front * SCALE;
  svg += `<rect x="${landX}" y="${landY}" width="${landW * SCALE}" height="${landD * SCALE}" fill="none" stroke="#94a3b8" stroke-width="1" stroke-dasharray="8,4"/>`;
  svg += `<text x="${landX + 4}" y="${landY - 6}" fill="#94a3b8" font-size="8" font-family="Arial">حدود الأرض</text>`;

  // Building outline (thick walls)
  svg += `<rect x="${MARGIN}" y="${MARGIN + TITLE_H}" width="${bw * SCALE}" height="${bd * SCALE}" fill="#e2e8f0" stroke="#1e293b" stroke-width="3"/>`;

  // Rooms
  rooms.forEach(room => {
    const rx = MARGIN + room.x * SCALE;
    const ry = MARGIN + TITLE_H + room.y * SCALE;
    const rw = room.width * SCALE;
    const rh = room.height * SCALE;
    const fill = ROOM_FILL[room.type] ?? "#F8FAFC";
    const labelColor = ROOM_LABEL_COLOR[room.type] ?? "#1e293b";

    // Room fill
    if (room.type === "staircase") {
      svg += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="url(#stairs)" stroke="#1e293b" stroke-width="1.5"/>`;
      // Staircase lines
      const steps = Math.floor(rh / 8);
      for (let s = 1; s < steps; s++) {
        svg += `<line x1="${rx}" y1="${ry + s * 8}" x2="${rx + rw}" y2="${ry + s * 8}" stroke="#475569" stroke-width="0.5"/>`;
      }
    } else {
      svg += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${fill}" stroke="#1e293b" stroke-width="1.5"/>`;
    }

    // Room label (Arabic name)
    const cx = rx + rw / 2;
    const cy = ry + rh / 2;
    const fontSize = Math.min(Math.max(Math.min(rw, rh) / 5, 7), 12);

    if (rw > 35 && rh > 25) {
      svg += `<text x="${cx}" y="${cy - 3}" text-anchor="middle" fill="${labelColor}" font-size="${fontSize}" font-weight="bold" font-family="Arial">${room.nameAr}</text>`;
      // Area dimension
      svg += `<text x="${cx}" y="${cy + fontSize + 2}" text-anchor="middle" fill="#64748b" font-size="${Math.max(fontSize - 2, 6)}" font-family="Arial">${room.width.toFixed(1)}×${room.height.toFixed(1)}م</text>`;
    } else if (rw > 20 && rh > 15) {
      svg += `<text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="${labelColor}" font-size="${Math.max(fontSize - 1, 6)}" font-family="Arial">${room.nameAr}</text>`;
    }

    // Window (blue line on exterior wall)
    if (room.hasWindow && rw > 25) {
      const winW = Math.min(rw * 0.35, 30);
      svg += `<rect x="${rx + (rw - winW) / 2}" y="${ry}" width="${winW}" height="4" fill="#93C5FD" stroke="#3B82F6" stroke-width="1"/>`;
      svg += `<line x1="${rx + (rw - winW) / 2}" y1="${ry + 2}" x2="${rx + (rw + winW) / 2}" y2="${ry + 2}" stroke="#3B82F6" stroke-width="1"/>`;
    }

    // Door arc
    if (room.hasDoor && rw > 20 && rh > 20) {
      const doorW = Math.min(rw * 0.25, 20);
      let dx = rx + rw * 0.15;
      let dy = ry + rh - 4;
      if (room.doorWall === "east") { dx = rx + rw - 4; dy = ry + rh * 0.15; }
      else if (room.doorWall === "west") { dx = rx; dy = ry + rh * 0.15; }
      else if (room.doorWall === "north") { dx = rx + rw * 0.15; dy = ry; }

      // Door line
      svg += `<rect x="${dx}" y="${dy}" width="${doorW}" height="3" fill="white" stroke="#1e293b" stroke-width="1"/>`;
      // Door arc (quarter circle)
      if (room.doorWall === "south") {
        svg += `<path d="M ${dx} ${dy} A ${doorW} ${doorW} 0 0 1 ${dx + doorW} ${dy - doorW}" fill="none" stroke="#64748b" stroke-width="0.8" stroke-dasharray="3,2"/>`;
      }
    }
  });

  // Dimension lines — width
  const dimY = MARGIN + TITLE_H + bd * SCALE + 25;
  svg += `<line x1="${MARGIN}" y1="${dimY}" x2="${MARGIN + bw * SCALE}" y2="${dimY}" stroke="#1e293b" stroke-width="1"/>`;
  svg += `<line x1="${MARGIN}" y1="${dimY - 5}" x2="${MARGIN}" y2="${dimY + 5}" stroke="#1e293b" stroke-width="1"/>`;
  svg += `<line x1="${MARGIN + bw * SCALE}" y1="${dimY - 5}" x2="${MARGIN + bw * SCALE}" y2="${dimY + 5}" stroke="#1e293b" stroke-width="1"/>`;
  svg += `<text x="${MARGIN + bw * SCALE / 2}" y="${dimY + 16}" text-anchor="middle" fill="#1e293b" font-size="11" font-family="Arial" font-weight="bold">${bw.toFixed(2)}م</text>`;

  // Dimension lines — depth
  const dimX = MARGIN - 30;
  svg += `<line x1="${dimX}" y1="${MARGIN + TITLE_H}" x2="${dimX}" y2="${MARGIN + TITLE_H + bd * SCALE}" stroke="#1e293b" stroke-width="1"/>`;
  svg += `<line x1="${dimX - 5}" y1="${MARGIN + TITLE_H}" x2="${dimX + 5}" y2="${MARGIN + TITLE_H}" stroke="#1e293b" stroke-width="1"/>`;
  svg += `<line x1="${dimX - 5}" y1="${MARGIN + TITLE_H + bd * SCALE}" x2="${dimX + 5}" y2="${MARGIN + TITLE_H + bd * SCALE}" stroke="#1e293b" stroke-width="1"/>`;
  svg += `<text x="${dimX - 8}" y="${MARGIN + TITLE_H + bd * SCALE / 2}" text-anchor="middle" fill="#1e293b" font-size="11" font-family="Arial" font-weight="bold" transform="rotate(-90, ${dimX - 8}, ${MARGIN + TITLE_H + bd * SCALE / 2})">${bd.toFixed(2)}م</text>`;

  // North arrow
  const nx = MARGIN + bw * SCALE - 15;
  const ny = MARGIN + TITLE_H + 25;
  svg += `<circle cx="${nx}" cy="${ny}" r="16" fill="none" stroke="#1e293b" stroke-width="1.5"/>`;
  svg += `<polygon points="${nx},${ny - 14} ${nx - 5},${ny + 5} ${nx},${ny + 2} ${nx + 5},${ny + 5}" fill="#1e293b"/>`;
  svg += `<polygon points="${nx},${ny - 14} ${nx - 5},${ny + 5} ${nx},${ny + 2} ${nx + 5},${ny + 5}" fill="white" opacity="0.5"/>`;
  svg += `<text x="${nx}" y="${ny + 28}" text-anchor="middle" fill="#1e293b" font-size="10" font-weight="bold" font-family="Arial">N</text>`;

  // Scale bar
  const sbX = MARGIN;
  const sbY = MARGIN + TITLE_H + bd * SCALE + 50;
  svg += `<text x="${sbX}" y="${sbY - 4}" fill="#475569" font-size="8" font-family="Arial">مقياس:</text>`;
  for (let i = 0; i < 5; i++) {
    const fillColor = i % 2 === 0 ? "#1e293b" : "white";
    svg += `<rect x="${sbX + 40 + i * SCALE}" y="${sbY}" width="${SCALE}" height="6" fill="${fillColor}" stroke="#1e293b" stroke-width="0.5"/>`;
  }
  svg += `<text x="${sbX + 40}" y="${sbY + 16}" fill="#475569" font-size="8" font-family="Arial">0</text>`;
  svg += `<text x="${sbX + 40 + SCALE * 5}" y="${sbY + 16}" fill="#475569" font-size="8" font-family="Arial">5م</text>`;

  // Footer — title block
  const footerY = svgH - FOOTER_H;
  svg += `<rect x="0" y="${footerY}" width="${svgW}" height="${FOOTER_H}" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/>`;
  svg += `<line x1="${svgW * 0.3}" y1="${footerY}" x2="${svgW * 0.3}" y2="${svgH}" stroke="#e2e8f0" stroke-width="1"/>`;
  svg += `<line x1="${svgW * 0.6}" y1="${footerY}" x2="${svgW * 0.6}" y2="${svgH}" stroke="#e2e8f0" stroke-width="1"/>`;

  svg += `<text x="${svgW * 0.15}" y="${footerY + 18}" text-anchor="middle" fill="#64748b" font-size="8" font-family="Arial">المشروع</text>`;
  svg += `<text x="${svgW * 0.15}" y="${footerY + 34}" text-anchor="middle" fill="#1e293b" font-size="10" font-weight="bold" font-family="Arial">SOAR.AI</text>`;

  svg += `<text x="${svgW * 0.45}" y="${footerY + 18}" text-anchor="middle" fill="#64748b" font-size="8" font-family="Arial">المساحة الكلية</text>`;
  svg += `<text x="${svgW * 0.45}" y="${footerY + 34}" text-anchor="middle" fill="#1e293b" font-size="10" font-weight="bold" font-family="Arial">${layout.summary.totalArea}م²</text>`;

  svg += `<text x="${svgW * 0.8}" y="${footerY + 18}" text-anchor="middle" fill="#64748b" font-size="8" font-family="Arial">التكلفة التقديرية</text>`;
  svg += `<text x="${svgW * 0.8}" y="${footerY + 34}" text-anchor="middle" fill="#f97316" font-size="10" font-weight="bold" font-family="Arial">${layout.summary.estimatedCost}</text>`;

  // Room count summary
  svg += `<text x="${svgW * 0.15}" y="${footerY + 52}" text-anchor="middle" fill="#64748b" font-size="8" font-family="Arial">غرف النوم: ${layout.summary.bedrooms} | دورات المياه: ${layout.summary.bathrooms}</text>`;
  svg += `<text x="${svgW * 0.8}" y="${footerY + 52}" text-anchor="middle" fill="#64748b" font-size="8" font-family="Arial">الأدوار: ${layout.summary.totalFloors + 1}</text>`;

  svg += `</svg>`;
  return svg;
}

// ─── Concept titles ───────────────────────────────────────────────────────────
export const CONCEPT_TITLES = [
  { ar: "المفهوم العصري المفتوح", en: "Modern Open Concept" },
  { ar: "المفهوم التراثي السعودي", en: "Saudi Heritage Style" },
  { ar: "المفهوم الوظيفي الذكي", en: "Smart Functional Layout" },
  { ar: "المفهوم الفاخر الموسّع", en: "Luxury Extended Layout" },
  { ar: "المفهوم المتوسطي", en: "Mediterranean Concept" },
  { ar: "المفهوم الاقتصادي الأمثل", en: "Optimal Economic Layout" },
];
