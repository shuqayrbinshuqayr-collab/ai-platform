/**
 * Saudi Building Code (SBC) 1101 — Residential Requirements
 *
 * Sources:
 *  - SBC 1101 Code Requirements (2018 edition, updated 2024/2025): https://sbc.gov.sa
 *  - SBC 1101 is based on IRC 2009 with Saudi-specific modifications
 *  - archup.net villa requirements summary: https://archup.net/villa-building-requirements-saudi-arabia/
 *  - 2025 SBC residential update (coverage raised to 75%): sbc.gov.sa news
 *
 * These are NATIONAL minimums — municipalities may require more.
 * Setbacks vary by municipality; users must enter from their رخصة البناء (building permit) or صك (land deed).
 */

// ─── Section R304: Minimum Habitable Room Areas ──────────────────────────────
// SBC R304.1 (based on IRC R304.1, Saudi-modified)

export const MIN_ROOM_AREAS = {
  /** At least one habitable room must meet this minimum (R304.1) */
  primaryHabitableRoom: 11.15,   // m² (= 120 sq ft, IRC R304.1)

  /** All other habitable rooms (R304.1) */
  habitableRoom: 6.5,            // m² (= 70 sq ft, IRC R304.1)

  // Saudi-standard practical minimums (applied in practice, exceeds IRC):
  bedroom: 9.0,                  // m² — single bedroom
  masterBedroom: 12.0,           // m² — master bedroom
  maidRoom: 6.0,                 // m²
  driverRoom: 6.0,               // m²
  kitchen: 5.0,                  // m²
  livingRoom: 14.0,              // m² (صالة)
  familyRoom: 14.0,              // m² (غرفة معيشة)
  majlis: 16.0,                  // m² (مجلس) — reception hall
  diningRoom: 9.0,               // m² (غرفة طعام)
  bathroom: 2.5,                 // m² (حمام)
  wc: 1.2,                       // m² (دورة مياه — toilet only)
  laundry: 3.0,                  // m²
  storage: 2.0,                  // m²
  corridor: 1.0,                 // m² (minimum, width ≥ 1.2m)
  staircase: 4.0,                // m²
  garage: 15.0,                  // m² (single car)
} as const;

export type RoomAreaKey = keyof typeof MIN_ROOM_AREAS;

// ─── Section R305: Minimum Ceiling Heights ────────────────────────────────────
// SBC R305.1 — Saudi modified from IRC (raised from 2.44m to 2.70m)

export const CEILING_HEIGHTS = {
  /** Habitable rooms — net clear height (SBC R305.1 Saudi modification) */
  habitableMin: 2.70,            // m
  habitableMax: 3.50,            // m (SBC practical upper limit)

  /** Basement / underground parking */
  basement: 2.70,               // m (SBC R305 — same as habitable for Saudi)

  /** Bathrooms, WC, utility rooms */
  utility: 2.10,                // m

  /** Under-stair clearance */
  underStair: 2.25,             // m
} as const;

// ─── Section R303: Light and Ventilation ──────────────────────────────────────
// SBC R303.1 — every habitable room must have natural light and ventilation

export const VENTILATION = {
  /** Glazing area as fraction of room floor area (R303.1) */
  minWindowAreaFraction: 0.08,   // 8% of floor area for natural light

  /** Openable area as fraction of room floor area (R303.1) */
  minVentilationFraction: 0.04,  // 4% of floor area for natural ventilation

  /** Rooms that MUST have exterior windows */
  requiresExteriorWindow: ["bedroom", "master_bedroom", "living_room", "family_room", "majlis", "kitchen"] as string[],

  /** Rooms that may use mechanical ventilation instead */
  mechanicalVentOk: ["bathroom", "wc", "laundry", "storage", "corridor"] as string[],
} as const;

// ─── Chapter 3: Setbacks and Coverage (National Minimums) ────────────────────
// SBC R302 / SBC 201 Chapter 5 — these are NATIONAL minimums.
// Municipalities may require larger setbacks — always verify from رخصة البناء.

export const SBC_SETBACKS = {
  /** Front setback from street (minimum national) */
  frontMin: 4.0,                 // m (or 1/5 of street width, whichever is greater, max 6m)

  /** Back setback (minimum national) */
  backMin: 2.0,                  // m

  /** Side setback (minimum national) */
  sideMin: 1.5,                  // m (some municipalities require 2.0m)

  /** First-floor overhang toward street */
  overhangStreetMax: 1.20,       // m

  /** Staircase protrusion limit */
  staircaseProtrusionMax: 1.0,   // m
} as const;

// ─── Building Coverage (SBC 201 / SBC 1101) ──────────────────────────────────
// 2025 updated values (raised from 60/65% to 75%)

export const SBC_COVERAGE = {
  /** Ground floor max coverage as fraction of land area */
  groundFloorMax: 0.75,          // 75% (updated 2025 from 60%)

  /** Upper floors max coverage */
  upperFloorMax: 0.75,           // 75%

  /** Roof annex / upper annex max coverage (fraction of floor below) */
  roofAnnexMax: 0.70,            // 70% of floor area below

  /** Basement may cover entire land area */
  basementMax: 1.0,

  /** Absolute maximum as safety guard */
  absoluteMax: 0.75,
} as const;

// ─── Building Height (SBC 1101 / SBC 201) ────────────────────────────────────

export const SBC_HEIGHT = {
  /** Maximum building height for residential villa */
  maxBuildingHeight: 12.0,       // m (including all components)

  /** Minimum parapet wall on roof from roof slab */
  minParapetHeight: 1.80,        // m

  /** Default maximum floors for residential zone */
  defaultMaxFloors: 4,
} as const;

// ─── Plot Requirements ────────────────────────────────────────────────────────

export const SBC_PLOT = {
  /** Minimum plot area for residential villa */
  minPlotArea: 200,              // m²

  /** Minimum street frontage */
  minStreetFrontage: 12,         // m
} as const;

// ─── Practical Room Area Caps (upper bounds for realistic floor plans) ────────
// These are NOT from SBC — they are practical maximums for AI generation
// to prevent a single room from dominating the entire floor plan.

export const PRACTICAL_ROOM_AREA_CAPS = {
  bedroom: 20,                   // m²
  master_bedroom: 25,            // m²
  family_living: 25,             // m²
  living_room: 25,               // m²
  dining_room: 20,               // m²
  kitchen: 15,                   // m²
  laundry: 8,                    // m²
  storage: 8,                    // m²
  maid_room: 12,                 // m²
  driver_room: 12,               // m²
  bathroom: 8,                   // m²
  wc: 4,                         // m²
  corridor: 15,                  // m²
  entrance: 12,                  // m²
  majlis: 30,                    // m² (larger allowed for reception)
  prayer: 10,                    // m²
  staircase: 15,                 // m²
  elevator: 4,                   // m²
  parking: 30,                   // m²
  garage: 30,                    // m²
} as const;

// ─── Minimum Room Widths ──────────────────────────────────────────────────────

export const MIN_ROOM_WIDTHS = {
  habitable: 2.0,               // m — any habitable room
  corridor: 1.2,                // m
  wc: 0.9,                      // m
  bathroom: 1.2,                // m
} as const;
