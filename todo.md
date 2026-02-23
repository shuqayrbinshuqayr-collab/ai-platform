# SOAR AI - Project TODO

## Phase 1: Database & Core Infrastructure
- [x] Design and push database schema (projects, blueprints, land_data, requirements)
- [x] Add server-side query helpers in db.ts
- [x] Add tRPC routers for projects and blueprints
- [x] Set up i18n (Arabic/English) support

## Phase 2: Main UI & Visual Design
- [x] Blueprint aesthetic design (deep royal blue + grid pattern + CAD style)
- [x] Landing page with SOAR AI branding
- [x] Navigation with language toggle (AR/EN)
- [x] Dashboard layout for engineering offices
- [x] Responsive design for all screen sizes

## Phase 3: Data Entry Forms
- [x] Land information form (area, dimensions, coordinates)
- [x] Regulatory requirements form (building ratios, setbacks, floors)
- [x] User requirements form (rooms, building type, usage)
- [x] Form validation and error handling

## Phase 4: AI Blueprint Generation
- [x] AI integration for generating architectural blueprints
- [x] Structured blueprint output (rooms, dimensions, regulatory compliance)
- [x] Blueprint visualization component (SVG/Canvas CAD-style)
- [x] Download in multiple formats (SVG, JSON)

## Phase 5: Project Gallery & Management
- [x] Project gallery page with grid/list view
- [x] Save and manage blueprints per engineering office
- [x] Project history and versioning
- [x] Dashboard with stats overview

## Phase 6: Voice Input & Notifications
- [x] Voice input using Whisper API
- [x] Auto-convert voice to structured form data
- [x] Owner notifications for new registrations
- [x] Owner notifications for large project blueprints

## Phase 7: Testing & Polish
- [x] Write vitest tests for all routers (6 tests passing)
- [x] Cross-browser and mobile responsive design
- [x] Final checkpoint and delivery
