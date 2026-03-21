import {
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  doublePrecision,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";

// Enums
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const preferredLangEnum = pgEnum("preferredLang", ["ar", "en"]);
export const projectStatusEnum = pgEnum("status", ["draft", "processing", "completed", "archived"]);
export const landShapeEnum = pgEnum("landShape", ["rectangular", "square", "irregular", "L-shape", "T-shape"]);
export const buildingTypeEnum = pgEnum("buildingType", ["residential", "villa"]);
export const planEnum = pgEnum("plan", ["free", "student", "solo", "office"]);
export const memberStatusEnum = pgEnum("memberStatus", ["pending", "active", "removed"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: text("passwordHash"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  officeName: varchar("officeName", { length: 255 }),
  officePhone: varchar("officePhone", { length: 64 }),
  preferredLang: preferredLangEnum("preferredLang").default("ar").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: projectStatusEnum("status").default("draft").notNull(),
  // Land data
  landArea: doublePrecision("landArea"),
  landWidth: doublePrecision("landWidth"),
  landLength: doublePrecision("landLength"),
  landCoordinates: varchar("landCoordinates", { length: 255 }),
  landShape: landShapeEnum("landShape").default("rectangular"),
  // Regulatory constraints
  buildingRatio: doublePrecision("buildingRatio"),
  floorAreaRatio: doublePrecision("floorAreaRatio"),
  maxFloors: integer("maxFloors"),
  frontSetback: doublePrecision("frontSetback"),
  backSetback: doublePrecision("backSetback"),
  sideSetback: doublePrecision("sideSetback"),
  // User requirements
  buildingType: buildingTypeEnum("buildingType").default("residential"),
  numberOfRooms: integer("numberOfRooms"),
  numberOfFloors: integer("numberOfFloors"),
  parkingSpaces: integer("parkingSpaces"),
  additionalRequirements: text("additionalRequirements"),
  // Room details
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  majlis: integer("majlis").default(1),
  garages: integer("garages").default(1),
  maidRooms: integer("maidRooms").default(0),
  balconies: integer("balconies").default(1),
  // Zoning & documents
  zoningCode: varchar("zoningCode", { length: 50 }),
  deedNumber: varchar("deedNumber", { length: 100 }),
  plotNumber: varchar("plotNumber", { length: 100 }),
  blockNumber: varchar("blockNumber", { length: 50 }),
  planNumber: varchar("planNumber", { length: 100 }),
  neighborhoodName: varchar("neighborhoodName", { length: 255 }),
  propertyType: varchar("propertyType", { length: 50 }),
  northSetback: doublePrecision("northSetback"),
  southSetback: doublePrecision("southSetback"),
  eastSetback: doublePrecision("eastSetback"),
  westSetback: doublePrecision("westSetback"),
  northLength: doublePrecision("northLength"),
  southLength: doublePrecision("southLength"),
  eastLength: doublePrecision("eastLength"),
  westLength: doublePrecision("westLength"),
  deedFileUrl: varchar("deedFileUrl", { length: 500 }),
  buildingCodeFileUrl: varchar("buildingCodeFileUrl", { length: 500 }),
  extractedDeedData: jsonb("extractedDeedData"),
  extractedBuildingCodeData: jsonb("extractedBuildingCodeData"),
  isLargeProject: boolean("isLargeProject").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

export const blueprints = pgTable("blueprints", {
  id: serial("id").primaryKey(),
  projectId: integer("projectId").notNull(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 255 }),
  version: integer("version").default(1).notNull(),
  // AI-generated content
  conceptDescription: text("conceptDescription"),
  conceptDescriptionAr: text("conceptDescriptionAr"),
  structuredData: jsonb("structuredData"), // rooms, spaces, dimensions
  svgData: text("svgData"), // SVG blueprint visualization
  regulatoryCompliance: jsonb("regulatoryCompliance"),
  aiModel: varchar("aiModel", { length: 64 }),
  generationTime: integer("generationTime"), // ms
  // Concept index (1-6) for batch generation
  conceptIndex: integer("conceptIndex").default(1).notNull(),
  // Whether this blueprint was selected by the user
  isSelected: boolean("isSelected").default(false).notNull(),
  // Batch ID to group 6 generated blueprints together
  batchId: varchar("batchId", { length: 64 }),
  // Storage
  pdfUrl: varchar("pdfUrl", { length: 512 }),
  pngUrl: varchar("pngUrl", { length: 512 }),
  // Engineer edits - stores modified room layout after manual editing
  editedSpaces: jsonb("editedSpaces"), // Array of edited room spaces
  editorFeedback: text("editorFeedback"), // Engineer's notes on the edit
  isEditedByEngineer: boolean("isEditedByEngineer").default(false).notNull(), // true if manually edited
  addedToRAG: boolean("addedToRAG").default(false).notNull(), // true if used as RAG reference
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type Blueprint = typeof blueprints.$inferSelect;
export type InsertBlueprint = typeof blueprints.$inferInsert;

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  // Plans: student (20 SAR/month, 1 project/day) | solo (500 SAR/month) | office (2000 SAR/month, up to 3 seats)
  plan: planEnum("plan").default("student").notNull(),
  blueprintsLimit: integer("blueprintsLimit").default(1).notNull(), // student=1/day, solo/office=unlimited(-1)
  blueprintsUsedToday: integer("blueprintsUsedToday").default(0).notNull(), // resets daily for student plan

  projectsLimit: integer("projectsLimit").default(-1).notNull(), // student=-1 (unlimited), solo/office=unlimited(-1)
  // Office plan: seat management
  seats: integer("seats").default(1).notNull(), // 1 for student/solo, up to 3 for office
  officeId: integer("officeId"), // links members to the office owner's subscription
  isOfficeOwner: boolean("isOfficeOwner").default(false).notNull(), // true if this user owns the office plan

  pricePerMonth: integer("pricePerMonth").default(20).notNull(), // SAR: 20=student, 500=solo, 2000=office
  blueprintsResetDate: timestamp("blueprintsResetDate"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

// Office members table: links users to an office plan
export const officeMembers = pgTable("officeMembers", {
  id: serial("id").primaryKey(),
  officeOwnerId: integer("officeOwnerId").notNull(), // userId of the office plan owner
  memberId: integer("memberId").notNull(), // userId of the member
  inviteEmail: varchar("inviteEmail", { length: 320 }),
  status: memberStatusEnum("memberStatus").default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type OfficeMember = typeof officeMembers.$inferSelect;
export type InsertOfficeMember = typeof officeMembers.$inferInsert;
