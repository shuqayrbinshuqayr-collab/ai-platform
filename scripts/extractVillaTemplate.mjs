/**
 * Saudi Villa DXF → villaTemplates.ts
 * Strategy: walls layer polylines + dimension text parsing + position-based type inference
 */
import fs from 'fs';
import path from 'path';

// ── English label → room type ─────────────────────────────────────────────────
const LABEL_TYPE = {
  'living room': 'family_living', 'living': 'family_living', 'salon': 'family_living',
  'master bedroom': 'master_bedroom', 'master': 'master_bedroom',
  'bedroom': 'bedroom', 'bed room': 'bedroom',
  'kitchen': 'kitchen',
  'bathroom': 'bathroom', 'bath': 'bathroom',
  'toilet': 'toilet', 'wc': 'toilet', 'restroom': 'toilet',
  'storage': 'storage', 'store': 'storage', 'storeroom': 'storage',
  'maid': 'maid_room', 'maid room': 'maid_room', 'maids': 'maid_room',
  'laundry': 'laundry', 'w/d': 'laundry', 'washing': 'laundry',
  'garage': 'parking', 'parking': 'parking', 'car': 'parking',
  'entrance': 'entrance', 'entry': 'entrance', 'foyer': 'entrance', 'hall': 'entrance',
  'stair': 'staircase', 'stairs': 'staircase', 'staircase': 'staircase',
  'corridor': 'corridor', 'passage': 'corridor',
  'balcony': 'balcony', 'terrace': 'balcony',
  'dining': 'dining', 'dining room': 'dining',
  'majlis': 'majlis', 'reception': 'majlis',
  'roof': 'other', 'rooftop': 'other',
  'console': 'other', 'left': 'other',
};

const TYPE_AR = {
  family_living: 'صالة عائلية', master_bedroom: 'غرفة نوم ماستر',
  bedroom: 'غرفة نوم', kitchen: 'مطبخ', bathroom: 'حمام', toilet: 'دورة مياه',
  storage: 'مخزن', maid_room: 'غرفة خادمة', laundry: 'غسيل', parking: 'موقف سيارة',
  entrance: 'بهو المدخل', staircase: 'درج', corridor: 'ممر', balcony: 'بلكونة',
  dining: 'غرفة طعام', majlis: 'مجلس رجال', other: 'أخرى',
};

// ── Post-process: reclassify obvious mismatches ────────────────────────────
function reclassify(rooms, bDM) {
  const SKIP = new Set(['laundry', 'bathroom', 'toilet', 'parking']);
  return rooms.map(r => {
    if (SKIP.has(r.type)) return r;
    const minDim = Math.min(r.w, r.h);
    const maxDim = Math.max(r.w, r.h);
    const ratio  = maxDim / minDim;

    // Corridor: very narrow (< 1.2m) or elongated strip (ratio > 3.5, thin, small)
    if (minDim < 1.2 || (ratio > 3.5 && minDim < 2.0 && r.area < 15)) {
      return { ...r, type: 'corridor', nameAr: TYPE_AR.corridor, nameEn: 'corridor' };
    }

    // Large "storage" → reclassify by y-position
    if (r.type === 'storage' && r.area > 15) {
      const yPct = bDM > 0 ? r.y / bDM : 0.5;
      let type;
      if (r.area > 30)      type = 'family_living';
      else if (yPct < 0.35) type = 'majlis';
      else if (yPct < 0.65) type = 'family_living';
      else                  type = 'dining';
      return { ...r, type, nameAr: TYPE_AR[type], nameEn: type };
    }

    return r;
  });
}

function labelToType(label) {
  const l = label.toLowerCase().trim();
  if (LABEL_TYPE[l]) return LABEL_TYPE[l];
  for (const [k, v] of Object.entries(LABEL_TYPE)) {
    if (l.includes(k)) return v;
  }
  return null;
}

// ── Parse DXF into code-value pairs ──────────────────────────────────────────
function parsePairs(raw) {
  const lines = raw.split(/\r?\n/).map(l => l.trim());
  const pairs = [];
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = parseInt(lines[i], 10);
    if (!isNaN(code)) pairs.push({ code, value: lines[i + 1] });
  }
  return pairs;
}

// ── Extract header: EXTMIN/EXTMAX ─────────────────────────────────────────────
function extractHeader(pairs) {
  let extMin = { x: 0, y: 0 }, extMax = { x: 0, y: 0 };
  let inHdr = false, cur = null;
  for (const { code, value } of pairs) {
    if (code === 2 && value === 'HEADER') inHdr = true;
    if (code === 2 && value === 'ENTITIES') break;
    if (!inHdr) continue;
    if (code === 9 && value === '$EXTMIN') cur = 'min';
    if (code === 9 && value === '$EXTMAX') cur = 'max';
    if (cur === 'min') {
      if (code === 10) extMin.x = parseFloat(value);
      if (code === 20) { extMin.y = parseFloat(value); cur = null; }
    }
    if (cur === 'max') {
      if (code === 10) extMax.x = parseFloat(value);
      if (code === 20) { extMax.y = parseFloat(value); cur = null; }
    }
  }
  return { extMin, extMax };
}

// ── Extract all LWPOLYLINE + TEXT/MTEXT ───────────────────────────────────────
function extractEntities(pairs) {
  const polylines = [], texts = [];
  let inEnt = false, i = 0;
  while (i < pairs.length) {
    const { code, value } = pairs[i];
    if (code === 2 && value === 'ENTITIES') inEnt = true;
    if (code === 0 && value === 'ENDSEC') inEnt = false;
    if (!inEnt) { i++; continue; }

    if (code === 0 && value === 'LWPOLYLINE') {
      const p = { layer: '', vertices: [], closed: false };
      i++;
      while (i < pairs.length && pairs[i].code !== 0) {
        const q = pairs[i];
        if (q.code === 8) p.layer = q.value;
        if (q.code === 70) p.closed = (parseInt(q.value) & 1) === 1;
        if (q.code === 10) p.vertices.push({ x: parseFloat(q.value), y: null });
        if (q.code === 20 && p.vertices.length > 0)
          p.vertices[p.vertices.length - 1].y = parseFloat(q.value);
        i++;
      }
      const valid = p.vertices.filter(v => v.y !== null);
      if (valid.length >= 3) {
        const xs = valid.map(v => v.x), ys = valid.map(v => v.y);
        p.bbox = { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
        p.cx = (p.bbox.minX + p.bbox.maxX) / 2;
        p.cy = (p.bbox.minY + p.bbox.maxY) / 2;
        p.areaUnits = (p.bbox.maxX - p.bbox.minX) * (p.bbox.maxY - p.bbox.minY);
        polylines.push(p);
      }
      continue;
    }

    if (code === 0 && (value === 'TEXT' || value === 'MTEXT')) {
      const t = { kind: value, text: '', x: 0, y: 0, layer: '', height: 0 };
      i++;
      while (i < pairs.length && pairs[i].code !== 0) {
        const q = pairs[i];
        if (q.code === 8) t.layer = q.value;
        if (q.code === 10) t.x = parseFloat(q.value);
        if (q.code === 20) t.y = parseFloat(q.value);
        if (q.code === 40) t.height = parseFloat(q.value);
        if (q.code === 1) t.text = q.value.replace(/\\P/g, ' ').replace(/\\[a-zA-Z][^;]*;/g, '').replace(/[{}]/g, '').trim();
        i++;
      }
      if (t.text && !t.text.match(/^\s*$/)) texts.push(t);
      continue;
    }
    i++;
  }
  return { polylines, texts };
}

// ── Match label texts to polylines ────────────────────────────────────────────
function matchLabels(polys, texts) {
  // Only use texts that look like room names (not dimension strings, not title block)
  const dimPattern = /^\d[\d.]*\s*m\s*[Xx×]\s*\d/;
  const titlePattern = /land size|floor:|total|%|toltal/i;
  const stepPattern = /^\d{1,2}$/;

  const roomLabels = texts.filter(t =>
    !dimPattern.test(t.text) &&
    !titlePattern.test(t.text) &&
    !stepPattern.test(t.text) &&
    t.text.length > 1
  );

  const result = polys.map(p => ({ poly: p, label: null, dist: Infinity }));

  for (const txt of roomLabels) {
    // Find polyline whose bbox contains the text point
    let best = null, bestDist = Infinity;
    for (const r of result) {
      const { bbox, cx, cy } = r.poly;
      const inside =
        txt.x >= bbox.minX && txt.x <= bbox.maxX &&
        txt.y >= bbox.minY && txt.y <= bbox.maxY;
      const d = Math.hypot(txt.x - cx, txt.y - cy);
      const score = inside ? d : d * 5;
      if (score < bestDist) { bestDist = score; best = r; }
    }
    if (best && bestDist < best.dist) {
      best.label = txt.text;
      best.dist = bestDist;
    }
  }

  // Also parse dimension strings to extract w×h info
  const dimLabels = texts.filter(t => dimPattern.test(t.text));
  const dims = {};
  for (const t of dimLabels) {
    const m = t.text.match(/([\d.]+)\s*m\s*[Xx×]\s*([\d.]+)\s*m/);
    if (m) {
      // Find closest polyline center
      let best = null, bestDist = Infinity;
      for (const r of result) {
        const d = Math.hypot(t.x - r.poly.cx, t.y - r.poly.cy);
        if (d < bestDist) { bestDist = d; best = r; }
      }
      if (best && bestDist < 200) {
        best.dimW = parseFloat(m[1]);
        best.dimH = parseFloat(m[2]);
      }
    }
  }
  return result;
}

// ── Infer room type from position + size ──────────────────────────────────────
function inferType(label, bbox, bW, bD, extMin) {
  const fromLabel = label ? labelToType(label) : null;
  if (fromLabel && fromLabel !== 'other') return fromLabel;

  const xPct = (bbox.minX - extMin.x) / bW;  // 0=left, 1=right
  const yPct = (bbox.minY - extMin.y) / bD;   // 0=bottom, 1=top
  const wM = (bbox.maxX - bbox.minX) / 100;
  const hM = (bbox.maxY - bbox.minY) / 100;
  const area = wM * hM;

  if (area < 3) return 'toilet';
  if (area < 5) return area < 4 && wM < 2 ? 'toilet' : 'bathroom';
  if (area < 8 && wM < 2) return 'corridor';
  if (area > 150) return 'other'; // outer boundary
  if (area > 50) return 'parking';
  if (yPct < 0.2 && area > 15) return 'entrance';
  if (yPct < 0.3 && xPct > 0.5 && area > 10) return 'majlis';
  if (xPct < 0.3 && area > 8) return 'kitchen';
  if (area > 20) return 'family_living';
  if (area > 12) return 'bedroom';
  return 'storage';
}

// ── Convert units (DXF cm → meters) ──────────────────────────────────────────
const m = v => parseFloat((v / 100).toFixed(2));

// ── Process one DXF file ──────────────────────────────────────────────────────
function processDXF(filePath, floorNum, landW, landD) {
  const raw = fs.readFileSync(filePath, 'latin1');
  const pairs = parsePairs(raw);
  const { extMin, extMax } = extractHeader(pairs);
  const { polylines, texts } = extractEntities(pairs);

  // Filter to walls layer only + skip outer boundaries (>200m²)
  const wallPolys = polylines.filter(p => p.layer === 'walls');
  const bW = extMax.x - extMin.x;  // drawing width in DXF units
  const bD = extMax.y - extMin.y;  // drawing depth in DXF units
  const MAX_AREA = bW * bD * 0.7;  // skip anything > 70% of drawing (outer boundaries)
  const MIN_DIM = 80;              // minimum 0.8m in any dimension (DXF cm units)

  const roomPolys = wallPolys.filter(p => {
    if (p.areaUnits >= MAX_AREA || p.areaUnits < 2000) return false; // too big or too small (< 2m²)
    const wU = p.bbox.maxX - p.bbox.minX, hU = p.bbox.maxY - p.bbox.minY;
    if (Math.min(wU, hU) < MIN_DIM) return false;                    // fixture-scale
    if (Math.max(wU, hU) / Math.min(wU, hU) > 12) return false;     // extreme aspect ratio (strips)
    return true;
  });
  const matched = matchLabels(roomPolys, texts);

  console.log(`  Floor ${floorNum}: ${wallPolys.length} wall polys, ${roomPolys.length} valid rooms`);

  const rawRooms = [];
  for (const r of matched) {
    const { bbox } = r.poly;
    const wUnits = bbox.maxX - bbox.minX;
    const hUnits = bbox.maxY - bbox.minY;
    const type = inferType(r.label, bbox, bW, bD, extMin);
    if (type === 'other') continue;

    const xM = m(bbox.minX - extMin.x);
    const yM = m(bbox.minY - extMin.y);
    const wM = m(wUnits);
    const hM = m(hUnits);
    const area = parseFloat((wM * hM).toFixed(1));

    const lblType = r.label ? labelToType(r.label) : null;
    const nameEn = lblType && lblType !== 'other' ? r.label : type;
    const nameAr = TYPE_AR[type] ?? 'أخرى';

    rawRooms.push({ nameAr, nameEn, type, x: xM, y: yM, w: wM, h: hM, area, floor: floorNum });
  }

  const bDM = m(bD);  // building depth in meters
  const rooms = reclassify(rawRooms, bDM);
  for (const r of rooms) {
    console.log(`    ${r.nameAr.padEnd(18)} (${r.nameEn.padEnd(15)}) x=${r.x} y=${r.y} w=${r.w} h=${r.h} area=${r.area}m²`);
  }
  return rooms;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const VILLAS = [
  {
    id: 'villa_1',
    dir: 'C:/Users/shuqa/Downloads/\u0645\u062e\u0637\u0637\u0627\u062a/\u0641\u0644\u0629 1',
    nameAr: '\u0641\u064a\u0644\u0627 1 \u2014 12.5\u0645 \u00d7 36\u0645',
    nameEn: 'Villa Type 1 — 12.5m × 36m',
    landWidth: 12.5, landDepth: 36,
  },
  {
    id: 'villa_2',
    dir: 'C:/Users/shuqa/Downloads/\u0645\u062e\u0637\u0637\u0627\u062a/\u0641\u0644\u0629 2',
    nameAr: '\u0641\u064a\u0644\u0627 2 \u2014 12.5\u0645 \u00d7 36\u0645',
    nameEn: 'Villa Type 2 — 12.5m × 36m',
    landWidth: 12.5, landDepth: 36,
  },
];

const FLOOR_MAP = { 'ground': 0, '1st': 1, '2nd': 2 };

let tsOut = `// Auto-generated from Saudi villa DXF files
// Source: C:\\Users\\shuqa\\Downloads\\مخططات\\فلة 1 & فلة 2
// Generated: ${new Date().toISOString()}
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

export const VILLA_TEMPLATES: VillaTemplate[] = [\n`;

for (const villa of VILLAS) {
  console.log(`\n${'█'.repeat(50)}`);
  console.log(`VILLA: ${villa.nameEn}`);
  const files = fs.readdirSync(villa.dir).filter(f => f.endsWith('.dxf'));
  const allRooms = [];

  for (const file of files) {
    const floorKey = Object.keys(FLOOR_MAP).find(k => file.toLowerCase().includes(k));
    const floorNum = floorKey !== undefined ? FLOOR_MAP[floorKey] : 0;
    console.log(`  File: ${file} → floor ${floorNum}`);
    const rooms = processDXF(path.join(villa.dir, file), floorNum, villa.landWidth, villa.landDepth);
    allRooms.push(...rooms);
  }

  // Estimate building footprint from ground-floor rooms
  const gfRooms = allRooms.filter(r => r.floor === 0);
  const maxX = gfRooms.length ? Math.max(...gfRooms.map(r => r.x + r.w)) : villa.landWidth - 3;
  const maxY = gfRooms.length ? Math.max(...gfRooms.map(r => r.y + r.h)) : villa.landDepth - 7;

  tsOut += `  {\n`;
  tsOut += `    id: "${villa.id}",\n`;
  tsOut += `    nameAr: "${villa.nameAr}",\n`;
  tsOut += `    nameEn: "${villa.nameEn}",\n`;
  tsOut += `    landWidth: ${villa.landWidth},\n`;
  tsOut += `    landDepth: ${villa.landDepth},\n`;
  tsOut += `    buildingWidth: ${parseFloat(maxX.toFixed(2))},\n`;
  tsOut += `    buildingDepth: ${parseFloat(maxY.toFixed(2))},\n`;
  tsOut += `    rooms: [\n`;
  for (const r of allRooms) {
    tsOut += `      { nameAr: "${r.nameAr}", nameEn: "${r.nameEn}", type: "${r.type}", x: ${r.x}, y: ${r.y}, w: ${r.w}, h: ${r.h}, area: ${r.area}, floor: ${r.floor} },\n`;
  }
  tsOut += `    ],\n`;
  tsOut += `  },\n`;

  console.log(`  → ${allRooms.length} total rooms across all floors`);
}

tsOut += `];

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
  const sx = template.buildingWidth  > 0 ? targetBW / template.buildingWidth  : 1;
  const sy = template.buildingDepth > 0 ? targetBD / template.buildingDepth : 1;
  return template.rooms
    .filter(r => r.floor < maxFloors)
    .map(r => ({
      ...r,
      x:    parseFloat((r.x * sx + sX).toFixed(2)),
      y:    parseFloat((r.y * sy + sY).toFixed(2)),
      w:    parseFloat((r.w * sx).toFixed(2)),
      h:    parseFloat((r.h * sy).toFixed(2)),
      area: parseFloat((r.w * sx * r.h * sy).toFixed(1)),
    }));
}
`;

// Write output
const outDir = 'C:/Users/shuqa/ai-platform/server/core';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = outDir + '/villaTemplates.ts';
fs.writeFileSync(outPath, tsOut, 'utf-8');
console.log(`\n✓ Written: ${outPath}`);
