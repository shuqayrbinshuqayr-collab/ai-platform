/**
 * dxfGenerator.ts
 * Converts architectural floor plan spaces to AutoCAD DXF format (AC1015 / AutoCAD 2000+)
 * Pure TypeScript — no external dependencies.
 */

export interface DXFSpace {
  x: number;        // metres from origin (relative 0-100 or absolute metres)
  y: number;
  width?: number;   // metres
  height?: number;  // metres
  w?: number;       // percentage (0-100) — fallback
  h?: number;       // percentage (0-100) — fallback
  nameAr?: string;
  name?: string;
  type?: string;
  area?: number | string;
  floor?: number;
}

export interface DXFBuildingLayout {
  buildingWidth?: number;   // metres
  buildingDepth?: number;   // metres
}

// ─── Layer definitions ────────────────────────────────────────────────────────
const LAYERS = [
  { name: "WALLS",      color: 7  },   // white/black
  { name: "ROOMS",      color: 3  },   // green
  { name: "DOORS",      color: 1  },   // red
  { name: "WINDOWS",    color: 5  },   // blue
  { name: "TEXT",       color: 7  },
  { name: "DIMENSIONS", color: 2  },   // yellow
  { name: "HATCH",      color: 8  },   // grey
  { name: "BORDER",     color: 7  },
];

// Room type → layer colour index (for hatch)
const ROOM_COLORS: Record<string, number> = {
  bedroom: 140, master_bedroom: 30, living: 92, family_living: 92,
  majlis: 50, kitchen: 82, bathroom: 150, toilet: 150,
  corridor: 253, distributor: 253, entrance: 50, parking: 252,
  storage: 253, balcony: 92, laundry: 150, maid_room: 200,
  office: 140, prayer: 50, staircase: 252, other: 253,
};

// ─── DXF helpers ─────────────────────────────────────────────────────────────

function group(code: number, value: string | number): string {
  return `${code}\n${value}\n`;
}

function header(): string {
  return [
    group(0, "SECTION"),
    group(2, "HEADER"),
    group(9, "$ACADVER"),
    group(1, "AC1015"),
    group(9, "$INSUNITS"),
    group(70, 6),           // metres
    group(9, "$MEASUREMENT"),
    group(70, 1),           // metric
    group(9, "$EXTMIN"),
    group(10, -1), group(20, -1), group(30, 0),
    group(9, "$EXTMAX"),
    group(10, 100), group(20, 100), group(30, 0),
    group(0, "ENDSEC"),
  ].join("");
}

function tables(): string {
  const layerDefs = LAYERS.map(l =>
    [
      group(0, "LAYER"),
      group(5, `L${l.name}`),
      group(100, "AcDbSymbolTableRecord"),
      group(100, "AcDbLayerTableRecord"),
      group(2, l.name),
      group(70, 0),
      group(62, l.color),
      group(6, "Continuous"),
    ].join("")
  ).join("");

  return [
    group(0, "SECTION"),
    group(2, "TABLES"),
    group(0, "TABLE"),
    group(2, "LAYER"),
    group(5, "2"),
    group(100, "AcDbSymbolTable"),
    group(70, LAYERS.length),
    layerDefs,
    group(0, "ENDTAB"),
    group(0, "ENDSEC"),
  ].join("");
}

// Draw a rectangle as 4 LINE entities on WALLS layer
function rectLines(x1: number, y1: number, x2: number, y2: number, layer = "WALLS", lw = 0.25): string {
  const pts = [
    [x1, y1, x2, y1],
    [x2, y1, x2, y2],
    [x2, y2, x1, y2],
    [x1, y2, x1, y1],
  ];
  return pts.map(([ax, ay, bx, by]) =>
    [
      group(0, "LINE"),
      group(8, layer),
      group(370, Math.round(lw * 100)),
      group(10, ax.toFixed(4)), group(20, ay.toFixed(4)), group(30, 0),
      group(11, bx.toFixed(4)), group(21, by.toFixed(4)), group(31, 0),
    ].join("")
  ).join("");
}

// Solid hatch fill for a room
function solidHatch(x: number, y: number, w: number, h: number, color: number, name: string): string {
  return [
    group(0, "HATCH"),
    group(8, "HATCH"),
    group(62, color),
    group(100, "AcDbEntity"),
    group(100, "AcDbHatch"),
    group(10, (x + w / 2).toFixed(4)), group(20, (y + h / 2).toFixed(4)), group(30, 0),
    group(210, 0), group(220, 0), group(230, 1),
    group(2, "SOLID"),
    group(70, 1),   // solid fill
    group(71, 0),
    group(91, 1),   // 1 boundary path
    group(92, 1),   // external
    group(93, 4),   // 4 edges
    // Edge 1: bottom
    group(72, 1), group(10, x.toFixed(4)), group(20, y.toFixed(4)), group(11, (x+w).toFixed(4)), group(21, y.toFixed(4)),
    // Edge 2: right
    group(72, 1), group(10, (x+w).toFixed(4)), group(20, y.toFixed(4)), group(11, (x+w).toFixed(4)), group(21, (y+h).toFixed(4)),
    // Edge 3: top
    group(72, 1), group(10, (x+w).toFixed(4)), group(20, (y+h).toFixed(4)), group(11, x.toFixed(4)), group(21, (y+h).toFixed(4)),
    // Edge 4: left
    group(72, 1), group(10, x.toFixed(4)), group(20, (y+h).toFixed(4)), group(11, x.toFixed(4)), group(21, y.toFixed(4)),
    group(97, 0),
    group(75, 0), group(76, 1),
    group(98, 1), group(10, (x + w/2).toFixed(4)), group(20, (y + h/2).toFixed(4)),
  ].join("");
}

// Text entity
function text(x: number, y: number, str: string, height = 0.3, layer = "TEXT"): string {
  // Remove Arabic diacritics for DXF compatibility
  const clean = str.replace(/[\u064B-\u065F]/g, "").substring(0, 30);
  return [
    group(0, "MTEXT"),
    group(8, layer),
    group(10, x.toFixed(4)), group(20, y.toFixed(4)), group(30, 0),
    group(40, height),
    group(71, 5),   // middle-center alignment
    group(72, 1),
    group(1, clean),
  ].join("");
}

// Door arc (quarter circle)
function doorArc(x: number, y: number, r: number, startAngle: number, endAngle: number): string {
  return [
    group(0, "ARC"),
    group(8, "DOORS"),
    group(62, 1),
    group(10, x.toFixed(4)), group(20, y.toFixed(4)), group(30, 0),
    group(40, r.toFixed(4)),
    group(50, startAngle.toFixed(2)),
    group(51, endAngle.toFixed(2)),
  ].join("");
}

// Door opening line
function doorLine(x1: number, y1: number, x2: number, y2: number): string {
  return [
    group(0, "LINE"),
    group(8, "DOORS"),
    group(62, 1),
    group(10, x1.toFixed(4)), group(20, y1.toFixed(4)), group(30, 0),
    group(11, x2.toFixed(4)), group(21, y2.toFixed(4)), group(31, 0),
  ].join("");
}

// Window symbol (3 parallel lines on wall)
function windowSymbol(x: number, y: number, w: number, onVerticalWall = false): string {
  const lines: string[] = [];
  if (!onVerticalWall) {
    // Horizontal window on top wall
    const offsets = [-0.05, 0, 0.05];
    offsets.forEach(dy => {
      lines.push(
        group(0, "LINE"),
        group(8, "WINDOWS"),
        group(62, 5),
        group(10, x.toFixed(4)), group(20, (y + dy).toFixed(4)), group(30, 0),
        group(11, (x + w).toFixed(4)), group(21, (y + dy).toFixed(4)), group(31, 0),
      );
    });
  } else {
    // Vertical window on right wall
    const offsets = [-0.05, 0, 0.05];
    offsets.forEach(dx => {
      lines.push(
        group(0, "LINE"),
        group(8, "WINDOWS"),
        group(62, 5),
        group(10, (x + dx).toFixed(4)), group(20, y.toFixed(4)), group(30, 0),
        group(11, (x + dx).toFixed(4)), group(21, (y + w).toFixed(4)), group(31, 0),
      );
    });
  }
  return lines.join("");
}

// Linear dimension
function linearDim(x1: number, y1: number, x2: number, y2: number, dimY: number, isVertical = false): string {
  const mid = isVertical ? (y1 + y2) / 2 : (x1 + x2) / 2;
  return [
    group(0, "DIMENSION"),
    group(8, "DIMENSIONS"),
    group(62, 2),
    group(100, "AcDbEntity"),
    group(100, "AcDbDimension"),
    // Dimension line location
    group(10, isVertical ? dimY : mid), group(20, isVertical ? mid : dimY), group(30, 0),
    // First extension line
    group(13, x1), group(23, y1), group(33, 0),
    // Second extension line
    group(14, x2), group(24, y2), group(34, 0),
    group(70, isVertical ? 33 : 32),   // aligned dimension
    group(100, "AcDbAlignedDimension"),
    group(13, x1), group(23, y1), group(33, 0),
    group(14, x2), group(24, y2), group(34, 0),
  ].join("");
}

// ─── Main export function ─────────────────────────────────────────────────────

export function generateDXF(
  spaces: DXFSpace[],
  bspLayout: DXFBuildingLayout | undefined,
  projectName: string,
  floor: number
): string {
  const floorSpaces = spaces.filter(s => (s.floor ?? 0) === floor);
  if (floorSpaces.length === 0) return "";

  const bldW = bspLayout?.buildingWidth ?? 10;
  const bldH = bspLayout?.buildingDepth ?? 20;

  // Normalise coordinates to metres
  const rooms = floorSpaces.map(s => {
    const hasMetre = s.width !== undefined && s.width > 0;
    if (hasMetre) {
      return {
        x: s.x ?? 0,
        y: s.y ?? 0,
        w: s.width ?? 3,
        h: s.height ?? 3,
        name: s.nameAr ?? s.name ?? s.type ?? "غرفة",
        type: s.type ?? "other",
        area: s.area,
      };
    }
    return {
      x: ((s.x ?? 0) / 100) * bldW,
      y: ((s.y ?? 0) / 100) * bldH,
      w: ((s.w ?? 10) / 100) * bldW,
      h: ((s.h ?? 10) / 100) * bldH,
      name: s.nameAr ?? s.name ?? s.type ?? "غرفة",
      type: s.type ?? "other",
      area: s.area,
    };
  });

  const WALL_T = 0.2;   // wall thickness in metres

  let entities = "";

  // ── 1. Room hatches ──────────────────────────────────────────────────────
  rooms.forEach(r => {
    const color = ROOM_COLORS[r.type] ?? 253;
    entities += solidHatch(r.x, r.y, r.w, r.h, color, r.name);
  });

  // ── 2. Outer building border (thick) ────────────────────────────────────
  entities += rectLines(0, 0, bldW, bldH, "BORDER", 0.5);

  // ── 3. Room walls + doors + windows + labels ─────────────────────────────
  rooms.forEach((r, i) => {
    // Inner wall lines
    entities += rectLines(r.x, r.y, r.x + r.w, r.y + r.h, "WALLS", 0.25);

    // Door (bottom wall, centred)
    const hasDoor = !["parking", "balcony", "staircase"].includes(r.type);
    if (hasDoor && r.w > 0.8) {
      const doorW = Math.min(r.w * 0.35, 1.0);
      const dx = r.x + r.w / 2 - doorW / 2;
      const dy = r.y;
      // Gap in wall
      entities += doorLine(dx, dy, dx + doorW, dy);
      // Arc
      entities += doorArc(dx, dy, doorW, 0, 90);
    }

    // Window (top wall, centred) for living/bedroom/kitchen
    const hasWindow = ["bedroom","master_bedroom","living","family_living","majlis","kitchen","dining","office","prayer","balcony"].includes(r.type);
    if (hasWindow && r.w > 1.0) {
      const winW = Math.min(r.w * 0.4, 1.8);
      const wx = r.x + r.w / 2 - winW / 2;
      const wy = r.y + r.h;
      entities += windowSymbol(wx, wy, winW, false);
    }

    // Room label
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    entities += text(cx, cy + 0.15, r.name, 0.25, "TEXT");
    const area = r.area ?? (r.w * r.h).toFixed(1);
    entities += text(cx, cy - 0.15, `${parseFloat(String(area)).toFixed(1)}m²`, 0.18, "TEXT");

    // Dimensions
    // Width dimension below room
    entities += linearDim(r.x, r.y - 0.5, r.x + r.w, r.y - 0.5, r.y - 0.5, false);
    // Height dimension right of room
    entities += linearDim(r.x + r.w + 0.5, r.y, r.x + r.w + 0.5, r.y + r.h, r.x + r.w + 0.5, true);
  });

  // ── 4. Title block ───────────────────────────────────────────────────────
  const titleY = -2.5;
  entities += rectLines(-0.5, titleY - 0.8, bldW + 0.5, titleY + 0.2, "BORDER", 0.3);
  entities += text(bldW / 2, titleY - 0.3, projectName, 0.4, "TEXT");
  const floorLabel = floor === 0 ? "الدور الأرضي" : `الدور ${floor}`;
  entities += text(bldW / 2, titleY - 0.65, `${floorLabel}  |  ${bldW.toFixed(1)}م × ${bldH.toFixed(1)}م  |  مقياس 1:100`, 0.22, "TEXT");

  // ── 5. North arrow ───────────────────────────────────────────────────────
  const nx = bldW + 1.5;
  const ny = bldH - 1.5;
  entities += [
    group(0, "LINE"), group(8, "BORDER"), group(10, nx), group(20, ny - 0.8), group(30, 0), group(11, nx), group(21, ny + 0.8), group(31, 0),
    group(0, "LINE"), group(8, "BORDER"), group(10, nx - 0.3), group(20, ny + 0.3), group(30, 0), group(11, nx), group(21, ny + 0.8), group(31, 0),
    group(0, "LINE"), group(8, "BORDER"), group(10, nx + 0.3), group(20, ny + 0.3), group(30, 0), group(11, nx), group(21, ny + 0.8), group(31, 0),
  ].join("");
  entities += text(nx, ny + 1.0, "N", 0.3, "TEXT");

  // ── Assemble DXF ─────────────────────────────────────────────────────────
  const dxf = [
    header(),
    tables(),
    group(0, "SECTION"),
    group(2, "ENTITIES"),
    entities,
    group(0, "ENDSEC"),
    group(0, "EOF"),
  ].join("");

  return dxf;
}
