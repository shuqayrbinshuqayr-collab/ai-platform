ALTER TABLE `subscriptions` MODIFY COLUMN `plan` enum('free','student','solo','office') NOT NULL DEFAULT 'student';--> statement-breakpoint
ALTER TABLE `subscriptions` MODIFY COLUMN `blueprintsLimit` int NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `subscriptions` MODIFY COLUMN `projectsLimit` int NOT NULL DEFAULT -1;--> statement-breakpoint
ALTER TABLE `subscriptions` MODIFY COLUMN `pricePerMonth` int NOT NULL DEFAULT 20;--> statement-breakpoint
ALTER TABLE `subscriptions` DROP COLUMN `blueprintsUsed`;