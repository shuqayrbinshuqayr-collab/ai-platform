ALTER TABLE `projects` ADD `bedrooms` int;--> statement-breakpoint
ALTER TABLE `projects` ADD `bathrooms` int;--> statement-breakpoint
ALTER TABLE `projects` ADD `majlis` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `projects` ADD `garages` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `projects` ADD `maidRooms` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `projects` ADD `balconies` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `projects` ADD `zoningCode` varchar(50);--> statement-breakpoint
ALTER TABLE `projects` ADD `deedNumber` varchar(100);--> statement-breakpoint
ALTER TABLE `projects` ADD `plotNumber` varchar(100);--> statement-breakpoint
ALTER TABLE `projects` ADD `blockNumber` varchar(50);--> statement-breakpoint
ALTER TABLE `projects` ADD `neighborhoodName` varchar(255);--> statement-breakpoint
ALTER TABLE `projects` ADD `deedFileUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `projects` ADD `buildingCodeFileUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `projects` ADD `extractedDeedData` json;--> statement-breakpoint
ALTER TABLE `projects` ADD `extractedBuildingCodeData` json;