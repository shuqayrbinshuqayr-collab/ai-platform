/**
 * Template Engine — generates 6 meaningful layout variations from villa templates.
 *
 * Variation strategies:
 *   0: Standard         — base template as designed
 *   1: Mirrored         — east↔west horizontal flip
 *   2: Grand Majlis     — enlarged صالون (+25% area), compact dining
 *   3: Open Plan        — merge dining into living room (large open family space)
 *   4: Prayer Room      — convert laundry to مصلى (prayer room)
 *   5: Compact Service  — smaller kitchen/laundry, larger living room
 *
 * Each variation modifies the template rooms BEFORE scaling,
 * so scaleTemplate's per-floor normalization handles fit.
 */

import type { RoomTemplate, VillaTemplate } from "./villaTemplates";

export interface VariationMeta {
  index: number;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
}

export const VARIATION_META: VariationMeta[] = [
  {
    index: 0,
    nameEn: "Standard Layout",
    nameAr: "التصميم الأساسي",
    descriptionEn: "Faithful reproduction of the original architectural plan with optimal room proportions",
    descriptionAr: "إعادة إنتاج أمينة للمخطط المعماري الأصلي بنسب غرف مثالية",
  },
  {
    index: 1,
    nameEn: "Mirror Layout",
    nameAr: "تصميم معكوس",
    descriptionEn: "Horizontally mirrored plan — ideal when the street or neighbor is on the opposite side",
    descriptionAr: "مخطط معكوس أفقياً — مثالي عندما يكون الشارع أو الجار على الجانب المقابل",
  },
  {
    index: 2,
    nameEn: "Grand Majlis",
    nameAr: "صالون كبير",
    descriptionEn: "Enlarged salon for large family gatherings, with a more compact dining area",
    descriptionAr: "صالون موسّع للتجمعات العائلية الكبيرة، مع منطقة طعام أكثر إحكاماً",
  },
  {
    index: 3,
    nameEn: "Open Plan Living",
    nameAr: "معيشة مفتوحة",
    descriptionEn: "Dining merged into the living room for a modern open-plan family space",
    descriptionAr: "دمج الطعام مع المعيشة لمساحة عائلية مفتوحة وعصرية",
  },
  {
    index: 4,
    nameEn: "With Prayer Room",
    nameAr: "مع مصلى",
    descriptionEn: "Dedicated prayer room (مصلى) replaces the laundry, which moves to the roof",
    descriptionAr: "غرفة مصلى مخصصة بدلاً من المغسلة التي تنتقل للسطح",
  },
  {
    index: 5,
    nameEn: "Extended Living",
    nameAr: "معيشة موسعة",
    descriptionEn: "Compact kitchen and service areas give extra space to the family living room",
    descriptionAr: "مطبخ وخدمات مدمجة تمنح مساحة إضافية لصالة المعيشة العائلية",
  },
];

/**
 * Apply a layout variation to the template rooms.
 * Returns a new room array (does not mutate the original).
 */
export function applyVariation(
  rooms: RoomTemplate[],
  variationIndex: number,
): RoomTemplate[] {
  // Deep clone rooms
  const clone = (): RoomTemplate[] => rooms.map(r => ({ ...r }));

  switch (variationIndex) {
    case 0: return clone();
    case 1: return mirrorHorizontal(clone());
    case 2: return grandMajlis(clone());
    case 3: return openPlan(clone());
    case 4: return prayerRoom(clone());
    case 5: return extendedLiving(clone());
    default: return clone();
  }
}

// ─── Variation 1: Mirror ─────────────────────────────────────────────────────
// Flip all rooms horizontally within each floor's bounding box.
function mirrorHorizontal(rooms: RoomTemplate[]): RoomTemplate[] {
  const floors = [...new Set(rooms.map(r => r.floor))];
  for (const f of floors) {
    const fRooms = rooms.filter(r => r.floor === f);
    const maxX = Math.max(...fRooms.map(r => r.x + r.w));
    for (const r of fRooms) {
      r.x = round(maxX - r.x - r.w);
    }
  }
  return rooms;
}

// ─── Variation 2: Grand Majlis ───────────────────────────────────────────────
// Enlarge salon by 25% width, shrink dining by 20% height.
function grandMajlis(rooms: RoomTemplate[]): RoomTemplate[] {
  for (const r of rooms) {
    if (r.type === "majlis" && r.floor === 0) {
      r.w = round(r.w * 1.25);
      r.area = round(r.w * r.h);
    }
    if (r.type === "dining" && r.floor === 0) {
      r.h = round(r.h * 0.8);
      r.area = round(r.w * r.h);
    }
  }
  return rooms;
}

// ─── Variation 3: Open Plan ──────────────────────────────────────────────────
// Remove dining room, extend living room upward to fill the space.
function openPlan(rooms: RoomTemplate[]): RoomTemplate[] {
  const dining = rooms.find(r => r.type === "dining" && r.floor === 0);
  const living = rooms.find(r => r.type === "family_living" && r.floor === 0);

  if (dining && living) {
    // Extend living room to absorb dining space
    const diningTop = dining.y;
    const livingBottom = living.y + living.h;
    living.y = diningTop;
    living.h = round(livingBottom - diningTop);
    living.area = round(living.w * living.h);
    living.nameAr = "صالة معيشة وطعام";
    living.nameEn = "Living & Dining";
    // Remove dining
    return rooms.filter(r => r !== dining);
  }
  return rooms;
}

// ─── Variation 4: Prayer Room ────────────────────────────────────────────────
// Convert ground-floor laundry into a prayer room.
function prayerRoom(rooms: RoomTemplate[]): RoomTemplate[] {
  const laundry = rooms.find(r => r.type === "laundry" && r.floor === 0);
  if (laundry) {
    laundry.type = "prayer";
    laundry.nameAr = "مصلى";
    laundry.nameEn = "Prayer Room";
  }
  return rooms;
}

// ─── Variation 5: Extended Living ────────────────────────────────────────────
// Shrink kitchen by 20%, enlarge living room proportionally.
function extendedLiving(rooms: RoomTemplate[]): RoomTemplate[] {
  const kitchen = rooms.find(r => r.type === "kitchen" && r.floor === 0);
  const living = rooms.find(r => r.type === "family_living" && r.floor === 0);

  if (kitchen && living) {
    const savedH = round(kitchen.h * 0.2);
    kitchen.h = round(kitchen.h * 0.8);
    kitchen.area = round(kitchen.w * kitchen.h);

    living.h = round(living.h + savedH);
    living.y = round(living.y - savedH);
    living.area = round(living.w * living.h);
  }
  return rooms;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function round(v: number): number {
  return parseFloat(v.toFixed(2));
}
