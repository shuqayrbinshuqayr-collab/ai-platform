/**
 * Zoned Layout Engine — Saudi Residential Floor Plan
 *
 * Replicates the authentic Saudi architectural pattern observed in real blueprints:
 *
 *  ┌──────────────┬───────────────────┬──────────────┐
 *  │  LEFT ZONE   │   CENTRAL ZONE    │  RIGHT ZONE  │
 *  │  (service)   │  (circulation +   │  (reception) │
 *  │  ~28% width  │   family rooms)   │  ~32% width  │
 *  │              │     ~40% width    │              │
 *  │  Kitchen     │  Corridor/Dist.   │  Men's Majlis│
 *  │  Maid Room   │  Family Living    │  Women Majlis│
 *  │  Laundry     │  Bedrooms         │  Family Room │
 *  │  Bathrooms   │  Bathrooms        │  Dining      │
 *  │  Storage     │  Staircase        │  Kitchen(2nd)│
 *  └──────────────┴───────────────────┴──────────────┘
 *
 * Each zone is subdivided horizontally into rows (top-to-bottom).
 * Room heights are proportional to their minArea relative to zone area.
 */

export interface ZonedRoom {
  id: string;
  type: string;
  nameAr: string;
  name: string;
  minArea: number;
  floor: number;
  zone?: "left" | "center" | "right";
  priority?: number; // lower = placed first / higher in zone
}

export interface PlacedRoom {
  id: string;
  type: string;
  nameAr: string;
  name: string;
  x: number;       // meters from top-left
  y: number;
  width: number;
  height: number;
  area: number;
  floor: number;
}

export interface ZonedLayout {
  buildingWidth: number;
  buildingDepth: number;
  rooms: PlacedRoom[];
}

// ─── Zone width ratios ────────────────────────────────────────────────────────
const LEFT_RATIO   = 0.28;
const CENTER_RATIO = 0.40;
const RIGHT_RATIO  = 0.32;

// ─── Room type → zone assignment ─────────────────────────────────────────────
const ZONE_MAP: Record<string, "left" | "center" | "right"> = {
  // Left zone — service / private
  kitchen:        "left",
  maid_room:      "left",
  laundry:        "left",
  storage:        "left",
  bathroom:       "left",
  toilet:         "left",
  prayer:         "left",
  // Center zone — circulation / family
  corridor:       "center",
  distributor:    "center",
  staircase:      "center",
  family_living:  "center",
  living:         "center",
  bedroom:        "center",
  master_bedroom: "center",
  office:         "center",
  // Right zone — reception / public
  majlis:         "right",
  dining:         "right",
  entrance:       "right",
  parking:        "right",
  balcony:        "right",
};

// Priority within zone (lower = placed higher/first)
const ZONE_PRIORITY: Record<string, number> = {
  entrance:       1,
  majlis:         2,
  dining:         3,
  family_living:  2,
  living:         3,
  corridor:       1,
  distributor:    1,
  staircase:      2,
  master_bedroom: 3,
  bedroom:        4,
  kitchen:        2,
  maid_room:      3,
  laundry:        4,
  bathroom:       5,
  toilet:         5,
  storage:        6,
  prayer:         4,
  office:         4,
  balcony:        1,
  parking:        1,
};

function assignZone(room: ZonedRoom): "left" | "center" | "right" {
  if (room.zone) return room.zone;
  return ZONE_MAP[room.type] ?? "center";
}

function getPriority(room: ZonedRoom): number {
  return room.priority ?? ZONE_PRIORITY[room.type] ?? 5;
}

/**
 * Stack rooms vertically within a zone column.
 * Heights are proportional to minArea; minimum height = 2.5m.
 */
function stackRoomsInZone(
  rooms: ZonedRoom[],
  zoneX: number,
  zoneW: number,
  buildingDepth: number,
  floor: number
): PlacedRoom[] {
  if (rooms.length === 0) return [];

  const sorted = [...rooms].sort((a, b) => getPriority(a) - getPriority(b));
  const totalMinArea = sorted.reduce((s, r) => s + r.minArea, 0);

  const placed: PlacedRoom[] = [];
  let curY = 0;
  const remaining = buildingDepth;

  sorted.forEach((room, i) => {
    const isLast = i === sorted.length - 1;
    // Proportional height based on minArea
    let h = isLast
      ? buildingDepth - curY  // fill remaining space
      : Math.max(2.5, (room.minArea / totalMinArea) * remaining);

    // Clamp to reasonable bounds
    h = Math.min(h, buildingDepth - curY - (sorted.length - i - 1) * 2.5);
    h = Math.max(h, 2.5);

    placed.push({
      id: room.id,
      type: room.type,
      nameAr: room.nameAr,
      name: room.name,
      x: zoneX,
      y: curY,
      width: zoneW,
      height: parseFloat(h.toFixed(2)),
      area: parseFloat((zoneW * h).toFixed(2)),
      floor,
    });

    curY += h;
  });

  return placed;
}

/**
 * Handle special case: bathrooms/toilets in center zone get split
 * horizontally (side by side) to avoid taking full zone width.
 */
function splitSmallRooms(
  rooms: ZonedRoom[],
  zoneX: number,
  zoneW: number,
  buildingDepth: number,
  floor: number
): PlacedRoom[] {
  // Group consecutive small rooms (bathroom/toilet/storage) to place side-by-side
  const groups: ZonedRoom[][] = [];
  let current: ZonedRoom[] = [];

  const SMALL_TYPES = new Set(["bathroom", "toilet", "storage", "laundry", "prayer"]);

  rooms.forEach(room => {
    if (SMALL_TYPES.has(room.type)) {
      current.push(room);
    } else {
      if (current.length > 0) { groups.push([...current]); current = []; }
      groups.push([room]);
    }
  });
  if (current.length > 0) groups.push(current);

  const totalMinArea = rooms.reduce((s, r) => s + r.minArea, 0);
  const placed: PlacedRoom[] = [];
  let curY = 0;
  let groupIdx = 0;

  groups.forEach(group => {
    const isLastGroup = groupIdx === groups.length - 1;
    const groupArea = group.reduce((s, r) => s + r.minArea, 0);
    let groupH = isLastGroup
      ? buildingDepth - curY
      : Math.max(2.5 * (group.length > 1 ? 1 : 1), (groupArea / totalMinArea) * buildingDepth);
    groupH = Math.max(groupH, 2.5);
    groupH = Math.min(groupH, buildingDepth - curY - (groups.length - groupIdx - 1) * 2.5);

    if (group.length === 1) {
      placed.push({
        id: group[0].id,
        type: group[0].type,
        nameAr: group[0].nameAr,
        name: group[0].name,
        x: zoneX,
        y: curY,
        width: zoneW,
        height: parseFloat(groupH.toFixed(2)),
        area: parseFloat((zoneW * groupH).toFixed(2)),
        floor,
      });
    } else {
      // Place side by side within the group row
      const colW = zoneW / group.length;
      group.forEach((room, ci) => {
        placed.push({
          id: room.id,
          type: room.type,
          nameAr: room.nameAr,
          name: room.name,
          x: zoneX + ci * colW,
          y: curY,
          width: parseFloat(colW.toFixed(2)),
          height: parseFloat(groupH.toFixed(2)),
          area: parseFloat((colW * groupH).toFixed(2)),
          floor,
        });
      });
    }

    curY += groupH;
    groupIdx++;
  });

  return placed;
}

/**
 * Main layout function.
 * Assigns rooms to zones then stacks them vertically within each zone column.
 */
export function zonedLayoutFloor(params: {
  plotW: number;
  plotH: number;
  rooms: ZonedRoom[];
  floor: number;
}): ZonedLayout {
  const { plotW, plotH, rooms, floor } = params;

  const leftW   = parseFloat((plotW * LEFT_RATIO).toFixed(2));
  const centerW = parseFloat((plotW * CENTER_RATIO).toFixed(2));
  const rightW  = parseFloat((plotW - leftW - centerW).toFixed(2));

  const leftX   = 0;
  const centerX = leftW;
  const rightX  = leftW + centerW;

  // Separate rooms by zone
  const leftRooms:   ZonedRoom[] = [];
  const centerRooms: ZonedRoom[] = [];
  const rightRooms:  ZonedRoom[] = [];

  rooms.forEach(room => {
    const zone = assignZone(room);
    if (zone === "left")   leftRooms.push(room);
    else if (zone === "right") rightRooms.push(room);
    else centerRooms.push(room);
  });

  // Ensure each zone has at least one room (fallback)
  if (leftRooms.length === 0) {
    leftRooms.push({
      id: "util-left", type: "storage", nameAr: "مخزن", name: "Storage",
      minArea: 4, floor, zone: "left",
    });
  }
  if (rightRooms.length === 0) {
    rightRooms.push({
      id: "util-right", type: "corridor", nameAr: "ممر", name: "Corridor",
      minArea: 4, floor, zone: "right",
    });
  }
  if (centerRooms.length === 0) {
    centerRooms.push({
      id: "util-center", type: "family_living", nameAr: "صالة عائلية", name: "Family Living",
      minArea: 20, floor, zone: "center",
    });
  }

  // Stack rooms in each zone
  const leftPlaced   = splitSmallRooms(leftRooms, leftX, leftW, plotH, floor);
  const centerPlaced = stackRoomsInZone(centerRooms, centerX, centerW, plotH, floor);
  const rightPlaced  = splitSmallRooms(rightRooms, rightX, rightW, plotH, floor);

  return {
    buildingWidth: plotW,
    buildingDepth: plotH,
    rooms: [...leftPlaced, ...centerPlaced, ...rightPlaced],
  };
}

/**
 * Multi-floor layout: applies zonedLayoutFloor per floor.
 * Ground floor (0): reception-heavy (majlis, entrance, kitchen, parking)
 * Upper floors (1+): bedroom-heavy (bedrooms, family living, bathrooms)
 */
export function zonedLayoutMultiFloor(params: {
  plotW: number;
  plotH: number;
  allRooms: ZonedRoom[];
}): { floor: number; layout: ZonedLayout }[] {
  const { plotW, plotH, allRooms } = params;

  // Group by floor
  const byFloor = new Map<number, ZonedRoom[]>();
  allRooms.forEach(r => {
    const f = r.floor ?? 0;
    if (!byFloor.has(f)) byFloor.set(f, []);
    byFloor.get(f)!.push(r);
  });

  const results: { floor: number; layout: ZonedLayout }[] = [];
  byFloor.forEach((rooms, floor) => {
    results.push({
      floor,
      layout: zonedLayoutFloor({ plotW, plotH, rooms, floor }),
    });
  });

  return results.sort((a, b) => a.floor - b.floor);
}
