ALTER TABLE `blueprints` ADD `conceptIndex` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `blueprints` ADD `isSelected` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `blueprints` ADD `batchId` varchar(64);