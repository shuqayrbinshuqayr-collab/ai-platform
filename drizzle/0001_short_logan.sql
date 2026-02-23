CREATE TABLE `blueprints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255),
	`version` int NOT NULL DEFAULT 1,
	`conceptDescription` text,
	`conceptDescriptionAr` text,
	`structuredData` json,
	`svgData` text,
	`regulatoryCompliance` json,
	`aiModel` varchar(64),
	`generationTime` int,
	`pdfUrl` varchar(512),
	`pngUrl` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `blueprints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`status` enum('draft','processing','completed','archived') NOT NULL DEFAULT 'draft',
	`landArea` float,
	`landWidth` float,
	`landLength` float,
	`landCoordinates` varchar(255),
	`landShape` enum('rectangular','square','irregular','L-shape','T-shape') DEFAULT 'rectangular',
	`buildingRatio` float,
	`floorAreaRatio` float,
	`maxFloors` int,
	`frontSetback` float,
	`backSetback` float,
	`sideSetback` float,
	`buildingType` enum('residential','commercial','mixed','industrial','governmental','educational','healthcare') DEFAULT 'residential',
	`numberOfRooms` int,
	`numberOfFloors` int,
	`parkingSpaces` int,
	`additionalRequirements` text,
	`isLargeProject` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `officeName` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `officePhone` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `preferredLang` enum('ar','en') DEFAULT 'ar' NOT NULL;