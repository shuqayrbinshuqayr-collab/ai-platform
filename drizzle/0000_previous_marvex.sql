CREATE TYPE "public"."buildingType" AS ENUM('residential', 'villa');--> statement-breakpoint
CREATE TYPE "public"."landShape" AS ENUM('rectangular', 'square', 'irregular', 'L-shape', 'T-shape');--> statement-breakpoint
CREATE TYPE "public"."memberStatus" AS ENUM('pending', 'active', 'removed');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('free', 'student', 'solo', 'office');--> statement-breakpoint
CREATE TYPE "public"."preferredLang" AS ENUM('ar', 'en');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('draft', 'processing', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "blueprints" (
	"id" serial PRIMARY KEY NOT NULL,
	"projectId" integer NOT NULL,
	"userId" integer NOT NULL,
	"title" varchar(255),
	"version" integer DEFAULT 1 NOT NULL,
	"conceptDescription" text,
	"conceptDescriptionAr" text,
	"structuredData" jsonb,
	"svgData" text,
	"regulatoryCompliance" jsonb,
	"aiModel" varchar(64),
	"generationTime" integer,
	"conceptIndex" integer DEFAULT 1 NOT NULL,
	"isSelected" boolean DEFAULT false NOT NULL,
	"batchId" varchar(64),
	"pdfUrl" varchar(512),
	"pngUrl" varchar(512),
	"editedSpaces" jsonb,
	"editorFeedback" text,
	"isEditedByEngineer" boolean DEFAULT false NOT NULL,
	"addedToRAG" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "officeMembers" (
	"id" serial PRIMARY KEY NOT NULL,
	"officeOwnerId" integer NOT NULL,
	"memberId" integer NOT NULL,
	"inviteEmail" varchar(320),
	"memberStatus" "memberStatus" DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"status" "status" DEFAULT 'draft' NOT NULL,
	"landArea" double precision,
	"landWidth" double precision,
	"landLength" double precision,
	"landCoordinates" varchar(255),
	"landShape" "landShape" DEFAULT 'rectangular',
	"buildingRatio" double precision,
	"floorAreaRatio" double precision,
	"maxFloors" integer,
	"frontSetback" double precision,
	"backSetback" double precision,
	"sideSetback" double precision,
	"buildingType" "buildingType" DEFAULT 'residential',
	"numberOfRooms" integer,
	"numberOfFloors" integer,
	"parkingSpaces" integer,
	"additionalRequirements" text,
	"bedrooms" integer,
	"bathrooms" integer,
	"majlis" integer DEFAULT 1,
	"garages" integer DEFAULT 1,
	"maidRooms" integer DEFAULT 0,
	"balconies" integer DEFAULT 1,
	"zoningCode" varchar(50),
	"deedNumber" varchar(100),
	"plotNumber" varchar(100),
	"blockNumber" varchar(50),
	"planNumber" varchar(100),
	"neighborhoodName" varchar(255),
	"propertyType" varchar(50),
	"northSetback" double precision,
	"southSetback" double precision,
	"eastSetback" double precision,
	"westSetback" double precision,
	"northLength" double precision,
	"southLength" double precision,
	"eastLength" double precision,
	"westLength" double precision,
	"deedFileUrl" varchar(500),
	"buildingCodeFileUrl" varchar(500),
	"extractedDeedData" jsonb,
	"extractedBuildingCodeData" jsonb,
	"isLargeProject" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"plan" "plan" DEFAULT 'student' NOT NULL,
	"blueprintsLimit" integer DEFAULT 1 NOT NULL,
	"blueprintsUsedToday" integer DEFAULT 0 NOT NULL,
	"projectsLimit" integer DEFAULT -1 NOT NULL,
	"seats" integer DEFAULT 1 NOT NULL,
	"officeId" integer,
	"isOfficeOwner" boolean DEFAULT false NOT NULL,
	"pricePerMonth" integer DEFAULT 20 NOT NULL,
	"blueprintsResetDate" timestamp,
	"expiresAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"officeName" varchar(255),
	"officePhone" varchar(64),
	"preferredLang" "preferredLang" DEFAULT 'ar' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
