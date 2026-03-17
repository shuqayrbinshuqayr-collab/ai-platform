ALTER TABLE `subscriptions` MODIFY COLUMN `blueprintsLimit` int NOT NULL DEFAULT 2;--> statement-breakpoint
ALTER TABLE `subscriptions` MODIFY COLUMN `projectsLimit` int NOT NULL DEFAULT 2;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `blueprintsUsedToday` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `blueprintsResetDate` timestamp;