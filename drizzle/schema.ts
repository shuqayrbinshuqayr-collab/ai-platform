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
  buildingType: mysqlEnum("buildingType", ["residential", "commercial", "mixed", "industrial", "governmental", "educational", "healthcare"]).default("residential"),
  numberOfRooms: int("numberOfRooms"),
  numberOfFloors: int("numberOfFloors"),
  parkingSpaces: int("parkingSpaces"),
  additionalRequirements: text("additionalRequirements"),
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
  // Storage
  pdfUrl: varchar("pdfUrl", { length: 512 }),
  pngUrl: varchar("pngUrl", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Blueprint = typeof blueprints.$inferSelect;
export type InsertBlueprint = typeof blueprints.$inferInsert;
