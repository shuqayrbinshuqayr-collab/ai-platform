/**
 * SOAR.AI — Binary Space Partitioning Layout Engine
 * Generates real architectural floor plans with accurate dimensions
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
  | "office" | "prayer" | "staircase";

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

// ─── Saudi Building Code defaults ────────────────────────────────────────────
const SAUDI_CODE = {
  minRoomArea: { bedroom: 12, master_bedroom: 16, living: 20, kitchen: 8, bathroom: 4, toilet: 2.5 },
  setbacks: { front: 4, back: 2, side: 1.5 },
  maxCoverage: 0.6,
  minCorridorWidth: 1.2,
  minEntranceArea: 4,
};

// ─── Room area requirements by building type ──────────────────────────────────
function getRoomProgram(
  buildingType: "villa" | "apartment",
  bedrooms: number,
  bathrooms: number,
  floors: number,
  landArea: number,
  extras: {
    majlis?: number; kitchen?: number; dining?: number; maidRoom?: number;
    office?: number; storage?: number; parking?: number; balcony?: number;
  }
): { type: RoomType; nameAr: string; nameEn: string; minArea: number; floor: number }[] {
  const rooms: { type: RoomType; nameAr: string; nameEn: string; minArea: number; floor: number }[] = [];
  const roomsPerFloor = Math.ceil((bedrooms + 4) / floors);

  // Ground floor always has: entrance, living, majlis, kitchen, dining, parking
  rooms.push({ type: "entrance", nameAr: "مدخل", nameEn: "Entrance", minArea: 5, floor: 0 });
  rooms.push({ type: "living", nameAr: "غرفة المعيشة", nameEn: "Living Room", minArea: 24, floor: 0 });

  if ((extras.majlis ?? 1) > 0) {
    rooms.push({ type: "majlis", nameAr: "المجلس", nameEn: "Majlis", minArea: 20, floor: 0 });
  }
  rooms.push({ type: "kitchen", nameAr: "المطبخ", nameEn: "Kitchen", minArea: 12, floor: 0 });
  if ((extras.dining ?? 1) > 0) {
    rooms.push({ type: "dining", nameAr: "غرفة الطعام", nameEn: "Dining Room", minArea: 14, floor: 0 });
  }
  rooms.push({ type: "toilet", nameAr: "دورة مياه", nameEn: "Toilet", minArea: 3, floor: 0 });
  if ((extras.parking ?? 1) > 0) {
    rooms.push({ type: "parking", nameAr: "موقف السيارة", nameEn: "Parking", minArea: 18, floor: 0 });
  }
  if ((extras.maidRoom ?? 0) > 0) {
    rooms.push({ type: "maid_room", nameAr: "غرفة الخادمة", nameEn: "Maid Room", minArea: 10, floor: 0 });
  }

  // Upper floors: bedrooms + bathrooms
  for (let f = 1; f <= floors; f++) {
    const floorBeds = f === floors ? bedrooms - (roomsPerFloor * (floors - 1)) : roomsPerFloor;
    const actualBeds = Math.max(1, floorBeds);

    // Master bedroom on first upper floor
    if (f === 1) {
      rooms.push({ type: "master_bedroom", nameAr: "غرفة النوم الرئيسية", nameEn: "Master Bedroom", minArea: 20, floor: f });
      rooms.push({ type: "bathroom", nameAr: "حمام رئيسي", nameEn: "Master Bathroom", minArea: 6, floor: f });
    }

    // Regular bedrooms
    for (let b = f === 1 ? 1 : 0; b < actualBeds; b++) {
      rooms.push({ type: "bedroom", nameAr: `غرفة نوم ${b + 1}`, nameEn: `Bedroom ${b + 1}`, minArea: 14, floor: f });
    }

    // Bathrooms per floor
    const floorBaths = Math.max(1, Math.ceil(bathrooms / floors));
    for (let bt = f === 1 ? 1 : 0; bt < floorBaths; bt++) {
      rooms.push({ type: "bathroom", nameAr: "حمام", nameEn: "Bathroom", minArea: 5, floor: f });
    }

    if ((extras.balcony ?? 1) > 0) {
      rooms.push({ type: "balcony", nameAr: "بلكونة", nameEn: "Balcony", minArea: 6, floor: f });
    }

    rooms.push({ type: "corridor", nameAr: "ممر", nameEn: "Corridor", minArea: 6, floor: f });
  }

  // Staircase on all floors except ground if multi-floor
  if (floors > 1) {
    for (let f = 0; f <= floors; f++) {
      rooms.push({ type: "staircase", nameAr: "درج", nameEn: "Staircase", minArea: 8, floor: f });
    }
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

  // Decide split direction
  const horizontal = node.w > node.h ? false : node.h > node.w ? true : Math.random() > 0.5;

  const maxSize = horizontal ? node.h - minSize : node.w - minSize;
  if (maxSize <= minSize) return false;

  const split = Math.floor(minSize + Math.random() * (maxSize - minSize));

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
}): BuildingLayout {
  const {
    landArea, buildingType, numberOfFloors, bedrooms, bathrooms,
    conceptIndex, extras = {}, setbacks: customSetbacks
  } = params;

  // Apply Saudi Building Code setbacks
  const setbacks = {
    front: customSetbacks?.front ?? SAUDI_CODE.setbacks.front,
    back: customSetbacks?.back ?? SAUDI_CODE.setbacks.back,
    side: customSetbacks?.side ?? SAUDI_CODE.setbacks.side,
  };

  // Calculate building footprint
  const maxCoverage = SAUDI_CODE.maxCoverage;
  const buildingArea = Math.min(landArea * maxCoverage, landArea * 0.55);

  // Determine building dimensions based on concept variation
  const aspectRatios = [1.2, 1.4, 1.0, 1.6, 1.3, 1.1];
  const ratio = aspectRatios[conceptIndex % aspectRatios.length];
  const buildingWidth = Math.sqrt(buildingArea * ratio);
  const buildingDepth = buildingArea / buildingWidth;

  // Get room program
  const roomProgram = getRoomProgram(
    buildingType, bedrooms, bathrooms, numberOfFloors, landArea, extras
  );

  const floors: FloorPlan[] = [];

  for (let f = 0; f <= numberOfFloors; f++) {
    const floorRooms = roomProgram.filter(r => r.floor === f);
    if (floorRooms.length === 0) continue;

    // BSP for this floor
    const root: BSPNode = { x: 0, y: 0, w: buildingWidth, h: buildingDepth };
    const iterations = Math.max(floorRooms.length - 1, 2);
    const minSize = 2.5; // minimum 2.5m dimension
    buildBSP(root, iterations, minSize);

    const leaves = getLeaves(root);

    // Sort leaves by area descending, sort rooms by minArea descending
    leaves.sort((a, b) => (b.w * b.h) - (a.w * a.h));
    const sortedRooms = [...floorRooms].sort((a, b) => b.minArea - a.minArea);

    // Assign rooms to leaves
    const rooms: Room[] = [];
    for (let i = 0; i < Math.min(leaves.length, sortedRooms.length); i++) {
      const leaf = leaves[i];
      const roomDef = sortedRooms[i];

      // Add small padding inside each room (0.1m wall thickness)
      const pad = 0.1;
      const room: Room = {
        id: `${roomDef.type}-f${f}-${i}`,
        nameAr: roomDef.nameAr,
        nameEn: roomDef.nameEn,
        type: roomDef.type,
        x: leaf.x + pad,
        y: leaf.y + pad,
        width: Math.max(leaf.w - pad * 2, 2),
        height: Math.max(leaf.h - pad * 2, 2),
        area: parseFloat(((leaf.w - pad * 2) * (leaf.h - pad * 2)).toFixed(1)),
        floor: f,
        hasWindow: ["bedroom", "master_bedroom", "living", "majlis", "kitchen", "dining", "balcony"].includes(roomDef.type),
        hasDoor: roomDef.type !== "balcony",
        doorWall: i % 2 === 0 ? "south" : "east",
      };
      rooms.push(room);
    }

    floors.push({
      floor: f,
      rooms,
      totalArea: parseFloat((buildingWidth * buildingDepth).toFixed(1)),
      buildingWidth: parseFloat(buildingWidth.toFixed(2)),
      buildingDepth: parseFloat(buildingDepth.toFixed(2)),
    });
  }

  const totalRooms = floors.reduce((sum, f) => sum + f.rooms.length, 0);
  const totalArea = parseFloat((buildingArea * numberOfFloors).toFixed(1));
  const costPerSqm = buildingType === "villa" ? 2500 : 2000;
  const estimatedCost = `SAR ${(totalArea * costPerSqm / 1000).toFixed(0)}K`;

  const layout: BuildingLayout = {
    floors,
    landArea,
    buildingArea: parseFloat(buildingArea.toFixed(1)),
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

  // Generate SVG
  layout.svgData = generateSVG(layout, conceptIndex);

  return layout;
}

// ─── SVG Generator ────────────────────────────────────────────────────────────
const ROOM_FILL: Record<string, string> = {
  bedroom: "#1a2744",
  master_bedroom: "#1a1f3a",
  living: "#0f2233",
  majlis: "#1a2030",
  kitchen: "#0f1f2a",
  bathroom: "#1a1a2e",
  toilet: "#1a1a2e",
  dining: "#0f2233",
  corridor: "#111827",
  entrance: "#0f1a2e",
  parking: "#0a0f1a",
  storage: "#111111",
  balcony: "#0a1a10",
  laundry: "#1a1a2e",
  maid_room: "#1a2030",
  office: "#1a2030",
  prayer: "#1a1f3a",
  staircase: "#1a1a1a",
};

const ROOM_STROKE: Record<string, string> = {
  bedroom: "#f97316",
  master_bedroom: "#fb923c",
  living: "#60a5fa",
  majlis: "#f97316",
  kitchen: "#4ade80",
  bathroom: "#a78bfa",
  toilet: "#a78bfa",
  dining: "#60a5fa",
  corridor: "#6b7280",
  entrance: "#fbbf24",
  parking: "#6b7280",
  storage: "#6b7280",
  balcony: "#4ade80",
  laundry: "#a78bfa",
  maid_room: "#6b7280",
  office: "#60a5fa",
  prayer: "#fbbf24",
  staircase: "#6b7280",
};

export function generateSVG(layout: BuildingLayout, conceptIndex: number = 0): string {
  const SCALE = 40; // pixels per meter
  const MARGIN = 60;
  const TITLE_H = 50;
  const LEGEND_W = 180;

  const svgW = Math.ceil(layout.buildingWidth * SCALE) + MARGIN * 2 + LEGEND_W;
  const svgH = Math.ceil(layout.buildingDepth * SCALE) + MARGIN * 2 + TITLE_H;

  const firstFloor = layout.floors[0];
  if (!firstFloor) return "";

  const rooms = firstFloor.rooms;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="${svgW}" height="${svgH}" font-family="monospace">`;

  // Background
  svg += `<rect width="${svgW}" height="${svgH}" fill="#0a0e1a"/>`;

  // Grid
  svg += `<defs><pattern id="grid" width="${SCALE}" height="${SCALE}" patternUnits="userSpaceOnUse">`;
  svg += `<path d="M ${SCALE} 0 L 0 0 0 ${SCALE}" fill="none" stroke="#1e293b" stroke-width="0.5"/>`;
  svg += `</pattern></defs>`;
  svg += `<rect x="${MARGIN}" y="${MARGIN + TITLE_H}" width="${layout.buildingWidth * SCALE}" height="${layout.buildingDepth * SCALE}" fill="url(#grid)"/>`;

  // Title bar
  svg += `<rect x="0" y="0" width="${svgW}" height="${TITLE_H}" fill="#0f172a"/>`;
  svg += `<text x="${MARGIN}" y="32" fill="#f97316" font-size="16" font-weight="bold">SOAR.AI</text>`;
  svg += `<text x="${MARGIN + 80}" y="32" fill="#94a3b8" font-size="12">مخطط معماري — الدور الأرضي</text>`;
  svg += `<text x="${svgW - LEGEND_W - 10}" y="20" fill="#64748b" font-size="9" text-anchor="end">المفهوم #${conceptIndex + 1}</text>`;
  svg += `<text x="${svgW - LEGEND_W - 10}" y="34" fill="#64748b" font-size="9" text-anchor="end">المساحة: ${layout.landArea}م²</text>`;
  svg += `<text x="${svgW - LEGEND_W - 10}" y="46" fill="#64748b" font-size="9" text-anchor="end">مقياس 1:100</text>`;

  // Building outline
  svg += `<rect x="${MARGIN}" y="${MARGIN + TITLE_H}" width="${layout.buildingWidth * SCALE}" height="${layout.buildingDepth * SCALE}" fill="none" stroke="#f97316" stroke-width="2"/>`;

  // Rooms
  rooms.forEach(room => {
    const rx = MARGIN + room.x * SCALE;
    const ry = MARGIN + TITLE_H + room.y * SCALE;
    const rw = room.width * SCALE;
    const rh = room.height * SCALE;
    const fill = ROOM_FILL[room.type] ?? "#111827";
    const stroke = ROOM_STROKE[room.type] ?? "#6b7280";

    // Room fill
    svg += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;

    // Room label
    const cx = rx + rw / 2;
    const cy = ry + rh / 2;
    const fontSize = Math.min(Math.max(rw / 8, 7), 11);

    if (rw > 30 && rh > 20) {
      svg += `<text x="${cx}" y="${cy - 4}" text-anchor="middle" fill="${stroke}" font-size="${fontSize}" font-weight="bold">${room.nameAr}</text>`;
      svg += `<text x="${cx}" y="${cy + 10}" text-anchor="middle" fill="#64748b" font-size="${Math.max(fontSize - 2, 6)}">${room.area}م²</text>`;
    }

    // Window indicator
    if (room.hasWindow && rw > 20) {
      svg += `<rect x="${rx + rw * 0.3}" y="${ry}" width="${rw * 0.4}" height="3" fill="#60a5fa" opacity="0.8"/>`;
    }

    // Door indicator
    if (room.hasDoor) {
      const doorX = room.doorWall === "east" ? rx + rw - 2 : rx + rw * 0.4;
      const doorY = room.doorWall === "south" ? ry + rh - 2 : ry + rh * 0.4;
      const dw = room.doorWall === "east" || room.doorWall === "west" ? 3 : rw * 0.2;
      const dh = room.doorWall === "north" || room.doorWall === "south" ? 3 : rh * 0.2;
      svg += `<rect x="${doorX}" y="${doorY}" width="${dw}" height="${dh}" fill="#fbbf24" opacity="0.9"/>`;
    }
  });

  // Dimension lines
  const bw = layout.buildingWidth;
  const bd = layout.buildingDepth;
  // Width dimension
  svg += `<line x1="${MARGIN}" y1="${MARGIN + TITLE_H + bd * SCALE + 20}" x2="${MARGIN + bw * SCALE}" y2="${MARGIN + TITLE_H + bd * SCALE + 20}" stroke="#64748b" stroke-width="1" marker-end="url(#arrow)"/>`;
  svg += `<text x="${MARGIN + bw * SCALE / 2}" y="${MARGIN + TITLE_H + bd * SCALE + 35}" text-anchor="middle" fill="#94a3b8" font-size="10">${bw.toFixed(1)}م</text>`;
  // Depth dimension
  svg += `<line x1="${MARGIN - 20}" y1="${MARGIN + TITLE_H}" x2="${MARGIN - 20}" y2="${MARGIN + TITLE_H + bd * SCALE}" stroke="#64748b" stroke-width="1"/>`;
  svg += `<text x="${MARGIN - 35}" y="${MARGIN + TITLE_H + bd * SCALE / 2}" text-anchor="middle" fill="#94a3b8" font-size="10" transform="rotate(-90, ${MARGIN - 35}, ${MARGIN + TITLE_H + bd * SCALE / 2})">${bd.toFixed(1)}م</text>`;

  // North arrow
  const nx = MARGIN + bw * SCALE - 20;
  const ny = MARGIN + TITLE_H + 20;
  svg += `<polygon points="${nx},${ny - 12} ${nx - 6},${ny + 4} ${nx},${ny} ${nx + 6},${ny + 4}" fill="#f97316"/>`;
  svg += `<text x="${nx}" y="${ny + 18}" text-anchor="middle" fill="#f97316" font-size="9" font-weight="bold">N</text>`;

  // Scale bar
  const sbX = MARGIN;
  const sbY = MARGIN + TITLE_H + bd * SCALE + 48;
  svg += `<rect x="${sbX}" y="${sbY}" width="${SCALE * 5}" height="5" fill="none" stroke="#64748b" stroke-width="1"/>`;
  for (let i = 0; i < 5; i++) {
    if (i % 2 === 0) svg += `<rect x="${sbX + i * SCALE}" y="${sbY}" width="${SCALE}" height="5" fill="#64748b"/>`;
  }
  svg += `<text x="${sbX}" y="${sbY + 16}" fill="#64748b" font-size="8">0</text>`;
  svg += `<text x="${sbX + SCALE * 5}" y="${sbY + 16}" fill="#64748b" font-size="8">5م</text>`;

  // Legend
  const legendX = svgW - LEGEND_W + 10;
  const legendY = MARGIN + TITLE_H;
  svg += `<rect x="${legendX - 5}" y="${legendY - 5}" width="${LEGEND_W - 10}" height="${rooms.length * 18 + 20}" fill="#0f172a" stroke="#1e293b" stroke-width="1" rx="4"/>`;
  svg += `<text x="${legendX + 5}" y="${legendY + 10}" fill="#94a3b8" font-size="9" font-weight="bold">الغرف</text>`;

  rooms.slice(0, 12).forEach((room, i) => {
    const ly = legendY + 22 + i * 16;
    const stroke = ROOM_STROKE[room.type] ?? "#6b7280";
    svg += `<rect x="${legendX}" y="${ly - 8}" width="10" height="10" fill="${ROOM_FILL[room.type] ?? "#111"}" stroke="${stroke}" stroke-width="1"/>`;
    svg += `<text x="${legendX + 14}" y="${ly}" fill="#94a3b8" font-size="8">${room.nameAr} — ${room.area}م²</text>`;
  });

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
