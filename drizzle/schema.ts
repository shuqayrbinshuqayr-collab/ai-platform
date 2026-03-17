import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
  json,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  officeName: varchar("officeName", { length: 255 }),
  officePhone: varchar("officePhone", { length: 64 }),
  preferredLang: mysqlEnum("preferredLang", ["ar", "en"]).default("ar").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["draft", "processing", "completed", "archived"]).default("draft").notNull(),
  // Land data
  landArea: float("landArea"),
  landWidth: float("landWidth"),
  landLength: float("landLength"),
  landCoordinates: varchar("landCoordinates", { length: 255 }),
  landShape: mysqlEnum("landShape", ["rectangular", "square", "irregular", "L-shape", "T-shape"]).default("rectangular"),
  // Regulatory constraints
  buildingRatio: float("buildingRatio"),
  floorAreaRatio: float("floorAreaRatio"),
  maxFloors: int("maxFloors"),
  frontSetback: float("frontSetback"),
  backSetback: float("backSetback"),
  sideSetback: float("sideSetback"),
  // User requirements
  buildingType: mysqlEnum("buildingType", ["residential", "villa"]).default("residential"),
  numberOfRooms: int("numberOfRooms"),
  numberOfFloors: int("numberOfFloors"),
  parkingSpaces: int("parkingSpaces"),
  additionalRequirements: text("additionalRequirements"),
  // Room details
  bedrooms: int("bedrooms"),
  bathrooms: int("bathrooms"),
  majlis: int("majlis").default(1),
  garages: int("garages").default(1),
  maidRooms: int("maidRooms").default(0),
  balconies: int("balconies").default(1),
  // Zoning & documents
  zoningCode: varchar("zoningCode", { length: 50 }),
  deedNumber: varchar("deedNumber", { length: 100 }),
  plotNumber: varchar("plotNumber", { length: 100 }),
  blockNumber: varchar("blockNumber", { length: 50 }),
  planNumber: varchar("planNumber", { length: 100 }),
  neighborhoodName: varchar("neighborhoodName", { length: 255 }),
  propertyType: varchar("propertyType", { length: 50 }),
  northSetback: float("northSetback"),
  southSetback: float("southSetback"),
  eastSetback: float("eastSetback"),
  westSetback: float("westSetback"),
  northLength: float("northLength"),
  southLength: float("southLength"),
  eastLength: float("eastLength"),
  westLength: float("westLength"),
  deedFileUrl: varchar("deedFileUrl", { length: 500 }),
  buildingCodeFileUrl: varchar("buildingCodeFileUrl", { length: 500 }),
  extractedDeedData: json("extractedDeedData"),
  extractedBuildingCodeData: json("extractedBuildingCodeData"),
  isLargeProject: int("isLargeProject").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

export const blueprints = mysqlTable("blueprints", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }),
  version: int("version").default(1).notNull(),
  // AI-generated content
  conceptDescription: text("conceptDescription"),
  conceptDescriptionAr: text("conceptDescriptionAr"),
  structuredData: json("structuredData"), // rooms, spaces, dimensions
  svgData: text("svgData"), // SVG blueprint visualization
  regulatoryCompliance: json("regulatoryCompliance"),
  aiModel: varchar("aiModel", { length: 64 }),
  generationTime: int("generationTime"), // ms
  // Concept index (1-6) for batch generation
  conceptIndex: int("conceptIndex").default(1).notNull(),
  // Whether this blueprint was selected by the user
  isSelected: int("isSelected").default(0).notNull(),
  // Batch ID to group 6 generated blueprints together
  batchId: varchar("batchId", { length: 64 }),
  // Storage
  pdfUrl: varchar("pdfUrl", { length: 512 }),
  pngUrl: varchar("pngUrl", { length: 512 }),
  // Engineer edits - stores modified room layout after manual editing
  editedSpaces: json("editedSpaces"), // Array of edited room spaces
  editorFeedback: text("editorFeedback"), // Engineer's notes on the edit
  isEditedByEngineer: int("isEditedByEngineer").default(0).notNull(), // 1 if manually edited
  addedToRAG: int("addedToRAG").default(0).notNull(), // 1 if used as RAG reference
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Blueprint = typeof blueprints.$inferSelect;
export type InsertBlueprint = typeof blueprints.$inferInsert;

export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  plan: mysqlEnum("plan", ["free", "pro"]).default("free").notNull(),
  blueprintsUsed: int("blueprintsUsed").default(0).notNull(),
  blueprintsLimit: int("blueprintsLimit").default(3).notNull(), // free=3/month, pro=unlimited(-1)
  projectsLimit: int("projectsLimit").default(5).notNull(), // free=5, pro=unlimited(-1)
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;
