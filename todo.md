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

## Phase 10: Building Type Restriction
- [x] Limit building types to: Residential Building (مبنى سكني) and Residential Villa (فيلا سكنية) only
- [x] Update NewProject.tsx form to show only these 2 types
- [x] Update ProjectDetail.tsx blueprint generation to reflect residential types
- [x] Update AI prompt in routers.ts to focus on residential buildings and villas only
- [x] Update Gallery.tsx filters to show only residential/villa types

## Phase 11: MVP الجديد — إعادة بناء الـ Flow الكامل
- [x] مراجعة الـ Flow الحالي وتحديد الفجوات مقارنة بالـ MVP المطلوب
- [x] تحديث New Project Flow: Step 1 (رفع مخطط موجود / إنشاء جديد)
- [x] تحديث Step 2: أسئلة ذكية (فيلا/عمارة، غرف، دورات مياه، إلخ)
- [x] تحقق تلقائي من الكود المعماري السعودي في الـ Backend (checkSaudiBuildingCode)
- [x] توليد 6 مخططات معمارية بالـ AI مع عرضها بشكل احترافي (generate6 + GenerateBlueprints page)
- [x] شاشة اختيار المخطط النهائي (BlueprintCard + confirm selection)
- [x] تجميل الـ UI وتحسين تجربة المستخدم للـ Case Study
- [x] Checkpoint نهائي للـ MVP (version: 821b8fdc)

## Phase 12: BSP Layout Engine + PDF Export

- [ ] BSP Algorithm في server/bsp.ts — يُقسّم مساحة الأرض ويوزّع الغرف بأبعاد حقيقية
- [ ] SVG Generator — يُنتج SVG هندسي مع كوتات واتجاه الشمال ومقياس رسم
- [ ] tRPC procedure: blueprints.generateSVG — يُعيد SVG string
- [ ] تحديث GenerateBlueprints.tsx لعرض SVG الهندسي في كل بطاقة
- [ ] تحديث BlueprintView.tsx لعرض SVG الكامل مع تفاصيل الغرف
- [ ] PDF Export endpoint — يُنتج PDF A3 احترافي
- [ ] Branded PDF مع شعار المكتب + جدول الغرف + بيانات المشروع
- [ ] Demo Mode بدون Login في الـ Landing Page
- [ ] Checkpoint نهائي

## Phase 13: رفع الملفين + AI Extractor + PDF Export

- [x] إضافة حقول bedrooms/bathrooms/majlis/garages/maidRooms/balconies للـ Schema
- [x] pnpm db:push لتحديث قاعدة البيانات
- [x] إصلاح أخطاء TypeScript في routers.ts (project.majlis etc.)
- [x] tRPC procedure: documents.extractDeed — يستخرج بيانات الصك من PDF
- [x] tRPC procedure: documents.extractBuildingCode — يستخرج نظام البناء من PDF
- [x] صفحة UploadDocuments.tsx — رفع الصك ونظام البناء مع AI extraction
- [x] ملء تلقائي لحقول المشروع بعد استخراج الملفين
- [x] /api/upload endpoint لرفع PDF/صور إلى S3
- [x] تحديث NewProject Flow ليوجه لـ upload بعد إنشاء المشروع
- [ ] PDF Export endpoint — يُنتج PDF A3 احترافي مع SVG المخطط
- [ ] زر تحميل PDF في BlueprintView
- [ ] Checkpoint نهائي

## Phase 14: إخفاء اشتراطات الكود السعودي من الـ UI
- [x] إزالة عرض codeWarnings/autoCorrections من GenerateBlueprints.tsx
- [x] إزالة Step 1 الاشتراطات كاملاً من NewProject form (تخطي تلقائي)
- [x] إخفاء regulatoryCompliance section من BlueprintView
- [x] تحديث عداد الخطوات ليعكس 3 خطوات فقط (بدل 4)
- [ ] Checkpoint نهائي

## Phase 15: رفع الصك ونظام البناء في Step 0 (اختياري)
- [ ] إضافة قسم "وثائق الأرض (اختياري)" في Step 0 من NewProject بعد حقول المساحة
- [ ] زر رفع صك الأرض + زر رفع نظام البناء مع preview للملف المرفوع
- [ ] ربط الرفع بـ /api/upload/document مع AI extraction تلقائي في الخلفية
- [ ] Checkpoint نهائي

## Phase 16: تعديل Step 0 — خياران حصريان
- [ ] تعديل Step 0 ليعرض خيارين: "ارفع الوثائق" أو "أدخل البيانات يدوياً"
- [ ] عند اختيار رفع الوثائق: إخفاء حقول المساحة/العرض/الطول وإظهار زري الرفع فقط
- [ ] عند اختيار الإدخال اليدوي: إخفاء قسم الوثائق وإظهار الحقول فقط
- [ ] Checkpoint نهائي

## Phase 17: تحسين جودة المخططات — Saudi Arch Rules + RAG System
- [x] إنشاء server/saudiArchRules.ts — قاعدة 50+ قاعدة معمارية سعودية (أبعاد حقيقية، قواعد تجاور، قواعد موضع)
- [x] إنشاء server/blueprintRAG.ts — نظام RAG بـ 4 مخططات مرجعية حقيقية
- [x] تحديث buildConceptPrompt في routers.ts لاستخدام buildEnhancedArchPrompt + generateRAGContext
- [x] تحديث generate6 procedure لاستخدام AI rooms عند توفرها (بدلاً من BSP فقط)
- [ ] اختبار النظام المحسّن بتوليد مخطط حقيقي
- [ ] Checkpoint نهائي

## Phase 18: تحسين توزيع الغرف ليشبه المخطط السعودي الحقيقي
- [x] بناء Zoned Layout Engine يعكس النمط السعودي (شريطان + ممر مركزي)
- [x] تحديث routers.ts لاستخدام المحرك الجديد
- [x] اختبار التوزيع الجديد وحفظ Checkpoint

## Phase 19: تحسين الشكل البصري للمخططات
- [x] إعادة كتابة FloorPlan SVG renderer بجدران سميكة وأبواب وقوس ونوافذ
- [x] تحديث MiniFloorPlan بنفس الأسلوب
- [x] حفظ Checkpoint

## Phase 20: تصدير DXF لـ AutoCAD
- [x] بناء dxfGenerator.ts في server
- [x] إضافة tRPC procedure لتصدير DXF
- [x] إضافة زر تحميل DXF في BlueprintView.tsx
- [x] حفظ Checkpoint

## Phase 21: محرر مخططات تفاعلي مع التعلم من التعديلات
- [ ] تحديث drizzle schema لحفظ editedSpaces في جدول blueprints
- [ ] pnpm db:push لتحديث قاعدة البيانات
- [ ] إضافة tRPC procedures: blueprints.saveEdits, blueprints.submitFeedback
- [ ] بناء واجهة المحرر التفاعلي في BlueprintEditor.tsx (سحب + تغيير أبعاد + تسمية)
- [ ] إضافة زر "تعديل المخطط" في BlueprintView.tsx
- [ ] نظام التعلم: حفظ المخططات المعدّلة كمرجع جديد في RAG عند الموافقة
- [ ] حفظ Checkpoint
