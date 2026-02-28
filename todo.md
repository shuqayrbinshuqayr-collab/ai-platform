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

## Phase 8: SOAR Vision Alignment (Major Update)
- [x] Redesign visual identity: dark background + orange accent (#FF6B00) + SOAR logo
- [x] Update landing page with SOAR brand and welcome screen (Create Plan / Create Image / Create Project)
- [x] Integrate Google Maps for land location pinning
- [x] Add AI land analysis report (area, zoning, compliance score)
- [x] Update data entry form with detailed fields (bathrooms, kitchens, majlis, maid rooms, elevators, garages, balconies, facades)
- [x] Generate 6 simultaneous blueprint concepts for user to choose from
- [x] Build Free/Pro subscription system with feature gating
- [x] Pro features: private project portfolio, more concepts, download formats
- [x] Add facade selection UI with ready-made options
- [x] Add DXF/AutoCAD export option (Pro)

## Phase 9: 4-Version Roadmap Update

- [ ] Add Roadmap page showing 4 phases (V1→V4) with timeline and target audience
- [ ] Update Home page to reflect 4 phases clearly (V1 live, V2-V4 coming soon)
- [ ] Update Pricing page to reflect V1 Free/Pro and tease V2-V4 as upcoming paid tiers
- [ ] Update NavBar with Roadmap link
- [ ] Update Pitch Deck: solution, business model, GTM, financials slides
- [ ] Update Pitch Deck: correct target audience per phase
- [ ] Re-generate updated Pitch Deck slides
