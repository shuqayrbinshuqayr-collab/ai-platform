CREATE TABLE `officeMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`officeOwnerId` int NOT NULL,
	`memberId` int NOT NULL,
	`inviteEmail` varchar(320),
	`status` enum('pending','active','removed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `officeMembers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `subscriptions` MODIFY COLUMN `plan` enum('free','solo','office') NOT NULL DEFAULT 'free';--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `seats` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `officeId` int;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `isOfficeOwner` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `pricePerMonth` int DEFAULT 0 NOT NULL;