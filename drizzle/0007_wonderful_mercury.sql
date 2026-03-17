ALTER TABLE `blueprints` ADD `editedSpaces` json;--> statement-breakpoint
ALTER TABLE `blueprints` ADD `editorFeedback` text;--> statement-breakpoint
ALTER TABLE `blueprints` ADD `isEditedByEngineer` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `blueprints` ADD `addedToRAG` int DEFAULT 0 NOT NULL;