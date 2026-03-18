import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, projects, blueprints, InsertProject, InsertBlueprint, Project, Blueprint, subscriptions, InsertSubscription, Subscription } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserProfile(userId: number, data: { officeName?: string; officePhone?: string; preferredLang?: "ar" | "en" }) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, userId));
}

// Projects
export async function createProject(data: InsertProject): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projects).values(data);
  return (result[0] as any).insertId;
}

export async function getProjectsByUser(userId: number): Promise<Project[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.createdAt));
}

export async function getProjectById(id: number, userId: number): Promise<Project | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.userId, userId))).limit(1);
  return result[0];
}

export async function updateProject(id: number, userId: number, data: Partial<InsertProject>) {
  const db = await getDb();
  if (!db) return;
  await db.update(projects).set(data).where(and(eq(projects.id, id), eq(projects.userId, userId)));
}

export async function deleteProject(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(projects).where(and(eq(projects.id, id), eq(projects.userId, userId)));
}

// Blueprints
export async function createBlueprint(data: InsertBlueprint): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(blueprints).values(data);
  return (result[0] as any).insertId;
}

export async function getBlueprintsByProject(projectId: number, userId: number): Promise<Blueprint[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(blueprints).where(and(eq(blueprints.projectId, projectId), eq(blueprints.userId, userId))).orderBy(desc(blueprints.createdAt));
}

export async function getBlueprintsByUser(userId: number): Promise<Blueprint[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(blueprints).where(eq(blueprints.userId, userId)).orderBy(desc(blueprints.createdAt));
}

export async function getBlueprintById(id: number, userId: number): Promise<Blueprint | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(blueprints).where(and(eq(blueprints.id, id), eq(blueprints.userId, userId))).limit(1);
  return result[0];
}

export async function updateBlueprintUrls(id: number, pdfUrl: string | null, pngUrl: string | null) {
  const db = await getDb();
  if (!db) return;
  await db.update(blueprints).set({ pdfUrl, pngUrl }).where(eq(blueprints.id, id));
}

export async function selectBlueprint(blueprintId: number, projectId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  // Deselect all blueprints in the same project first
  await db.update(blueprints).set({ isSelected: 0 }).where(and(eq(blueprints.projectId, projectId), eq(blueprints.userId, userId)));
  // Select the chosen blueprint
  await db.update(blueprints).set({ isSelected: 1 }).where(and(eq(blueprints.id, blueprintId), eq(blueprints.userId, userId)));
}

export async function getBlueprintsByBatch(batchId: string, userId: number): Promise<Blueprint[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(blueprints).where(and(eq(blueprints.batchId, batchId), eq(blueprints.userId, userId))).orderBy(blueprints.conceptIndex);
}

export async function getAllProjectsCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select().from(projects);
  return result.length;
}

export async function getAllUsersCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select().from(users);
  return result.length;
}

// ─── Subscription helpers ───

export async function getOrCreateSubscription(userId: number): Promise<Subscription> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const existing = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  if (existing.length > 0) {
    const sub = existing[0];
    // Reset daily counter for student plan if it's a new day
    if ((sub.plan === "student" || sub.plan === "free") && sub.blueprintsResetDate) {
      const lastReset = new Date(sub.blueprintsResetDate);
      const now = new Date();
      const isNewDay = lastReset.toDateString() !== now.toDateString();
      if (isNewDay) {
        const db2 = await getDb();
        if (db2) await db2.update(subscriptions)
          .set({ blueprintsUsedToday: 0, blueprintsResetDate: now })
          .where(eq(subscriptions.id, sub.id));
        return { ...sub, blueprintsUsedToday: 0, blueprintsResetDate: now };
      }
    }
    return sub;
  }
  // Create default student subscription: 1 project/day, 20 SAR/month
  const now = new Date();
  await db.insert(subscriptions).values({
    userId, plan: "student",
    blueprintsUsedToday: 0, blueprintsResetDate: now,
    blueprintsLimit: 1, projectsLimit: -1,
    pricePerMonth: 20, seats: 1,
  });
  const created = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  return created[0];
}

// Check if user can generate a blueprint (respects daily limit for student plan)
export async function canGenerateBlueprint(userId: number): Promise<{ allowed: boolean; reason?: string }> {
  const sub = await getOrCreateSubscription(userId);
  // solo and office have unlimited blueprints
  if (sub.plan === "solo" || sub.plan === "office") return { allowed: true };
  const usedToday = sub.blueprintsUsedToday ?? 0;
  const dailyLimit = sub.blueprintsLimit ?? 1;
  if (usedToday >= dailyLimit) {
    return { allowed: false, reason: `وصلت للحد اليومي (${dailyLimit} مخطط/يوم). ترقّ لخطة احترافي أو مختص لتوليد غير محدود.` };
  }
  return { allowed: true };
}
// Check if user can create a new project (all plans have unlimited projects)
export async function canCreateProject(userId: number, currentProjectCount: number): Promise<{ allowed: boolean; reason?: string }> {
  // All plans have unlimited projects
  return { allowed: true };
}

export async function updateSubscription(id: number, data: Partial<InsertSubscription>) {
  const db = await getDb();
  if (!db) return;
  await db.update(subscriptions).set(data).where(eq(subscriptions.id, id));
}

export async function incrementBlueprintsUsed(userId: number) {
  const db = await getDb();
  if (!db) return;
  const sub = await getOrCreateSubscription(userId);
  await db.update(subscriptions).set({ blueprintsUsedToday: (sub.blueprintsUsedToday ?? 0) + 1 }).where(eq(subscriptions.id, sub.id));
}

// ─── Learning System: Get blueprints added to RAG ────────────────────────────
export async function getLearnedBlueprints(): Promise<Blueprint[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(blueprints)
    .where(eq(blueprints.addedToRAG, 1))
    .limit(20);
}
