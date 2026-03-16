import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { generateBSPLayout, CONCEPT_TITLES } from "./bsp";
import { notifyOwner } from "./_core/notification";
import { transcribeAudio } from "./_core/voiceTranscription";
import {
  createProject, getProjectsByUser, getProjectById, updateProject, deleteProject,
  createBlueprint, getBlueprintsByProject, getBlueprintsByUser, getBlueprintById,
  updateUserProfile, getAllProjectsCount, getAllUsersCount,
  getOrCreateSubscription, updateSubscription,
  selectBlueprint, getBlueprintsByBatch,
} from "./db";

// ─── Saudi Building Code Checker ───────────────────────────────────────────
function checkSaudiBuildingCode(project: {
  landArea?: number | null;
  buildingRatio?: number | null;
  floorAreaRatio?: number | null;
  maxFloors?: number | null;
  frontSetback?: number | null;
  backSetback?: number | null;
  sideSetback?: number | null;
  buildingType?: string | null;
  numberOfFloors?: number | null;
}) {
  const warnings: string[] = [];
  const warningsAr: string[] = [];

  const landArea = project.landArea ?? 0;
  const buildingRatio = project.buildingRatio ?? 60;
  const maxFloors = project.maxFloors ?? 4;
  const frontSetback = project.frontSetback ?? 4;
  const backSetback = project.backSetback ?? 3;
  const sideSetback = project.sideSetback ?? 2;
  const requestedFloors = project.numberOfFloors ?? 2;

  // Saudi Building Code: Residential setbacks
  if (frontSetback < 4) {
    warnings.push("Front setback must be at least 4m per Saudi Building Code");
    warningsAr.push("الإرتداد الأمامي يجب أن يكون 4م على الأقل وفق الكود السعودي");
  }
  if (backSetback < 2) {
    warnings.push("Back setback must be at least 2m per Saudi Building Code");
    warningsAr.push("الإرتداد الخلفي يجب أن يكون 2م على الأقل وفق الكود السعودي");
  }
  if (sideSetback < 1.5) {
    warnings.push("Side setback must be at least 1.5m per Saudi Building Code");
    warningsAr.push("الإرتداد الجانبي يجب أن يكون 1.5م على الأقل وفق الكود السعودي");
  }
  if (buildingRatio > 75) {
    warnings.push("Building coverage ratio exceeds 75% — typical Saudi residential max");
    warningsAr.push("نسبة البناء تتجاوز 75% — الحد المعتاد للمناطق السكنية السعودية");
  }
  if (requestedFloors > maxFloors) {
    warnings.push(`Requested ${requestedFloors} floors exceeds allowed ${maxFloors} floors`);
    warningsAr.push(`الطوابق المطلوبة (${requestedFloors}) تتجاوز الحد المسموح (${maxFloors})`);
  }
  if (landArea > 0 && landArea < 100) {
    warnings.push("Land area is very small for a residential project (< 100m²)");
    warningsAr.push("مساحة الأرض صغيرة جداً للمشروع السكني (أقل من 100م²)");
  }

  // Auto-correct setbacks to minimum Saudi code values
  const corrected = {
    frontSetback: Math.max(frontSetback, 4),
    backSetback: Math.max(backSetback, 2),
    sideSetback: Math.max(sideSetback, 1.5),
    buildingRatio: Math.min(buildingRatio, 75),
    numberOfFloors: Math.min(requestedFloors, maxFloors),
  };

  return { warnings, warningsAr, corrected, isCompliant: warnings.length === 0 };
}

// ─── Build AI prompt for one concept ───────────────────────────────────────
function buildConceptPrompt(project: any, conceptIndex: number, corrected: any) {
  const conceptStyles = [
    { style: "Modern Minimalist", styleAr: "عصري مينيمالي", focus: "open spaces, clean lines, maximum natural light" },
    { style: "Traditional Saudi Heritage", styleAr: "تراثي سعودي", focus: "mashrabiya elements, central courtyard, Arabic arches" },
    { style: "Contemporary Luxury", styleAr: "معاصر فاخر", focus: "double-height spaces, premium finishes, panoramic views" },
    { style: "Functional Compact", styleAr: "وظيفي مدمج", focus: "efficient space utilization, smart storage, practical layout" },
    { style: "Mediterranean", styleAr: "متوسطي", focus: "arched windows, terracotta tones, garden integration" },
    { style: "Smart Home Ready", styleAr: "جاهز للمنزل الذكي", focus: "integrated tech spaces, home office, flexible rooms" },
  ];
  const concept = conceptStyles[conceptIndex - 1] ?? conceptStyles[0];
  const rooms = project.additionalRequirements ?? "";

  return `Generate architectural blueprint concept #${conceptIndex} with style: "${concept.style}" (${concept.styleAr}).
Focus: ${concept.focus}

PROJECT DATA:
- Building Type: ${project.buildingType === "villa" ? "Residential Villa (فيلا سكنية)" : "Residential Building (مبنى سكني)"}
- Land Area: ${project.landArea ?? "N/A"} m²
- Land Shape: ${project.landShape ?? "rectangular"}
- Floors Allowed: ${corrected.numberOfFloors}
- Building Coverage: ${corrected.buildingRatio}%
- Front Setback: ${corrected.frontSetback}m | Back: ${corrected.backSetback}m | Side: ${corrected.sideSetback}m
- Room Requirements: ${rooms || "Standard residential layout"}

CRITICAL: Respond ONLY with valid JSON, no markdown, no extra text.
{
  "title": "Concept ${conceptIndex}: ${concept.style}",
  "titleAr": "المفهوم ${conceptIndex}: ${concept.styleAr}",
  "conceptDescription": "2-paragraph description of this architectural concept in English",
  "conceptDescriptionAr": "وصف من فقرتين لهذا المفهوم المعماري بالعربية",
  "regulatoryCompliance": {
    "buildingFootprint": <number m²>,
    "actualCoverageRatio": <number %>,
    "totalBuiltArea": <number m²>,
    "actualFloorAreaRatio": <number>,
    "isCompliant": true,
    "complianceNotes": ["Saudi Building Code compliant", "Setbacks verified"],
    "complianceNotesAr": ["متوافق مع الكود السعودي", "الإرتدادات مُراجَعة"]
  },
  "spaces": [
    {
      "name": "Space name in English",
      "nameAr": "اسم المساحة بالعربية",
      "floor": <0=ground, 1=first, etc>,
      "width": <meters>,
      "length": <meters>,
      "area": <m²>,
      "type": "bedroom|living|kitchen|bathroom|majlis|parking|corridor|balcony|storage|lobby|other",
      "x": <0-100>,
      "y": <0-100>,
      "w": <0-100>,
      "h": <0-100>
    }
  ],
  "summary": {
    "totalFloors": <number>,
    "totalRooms": <number>,
    "totalBathrooms": <number>,
    "totalArea": <number m²>,
    "parkingSpaces": <number>,
    "estimatedCost": "SAR X,XXX,XXX - X,XXX,XXX",
    "constructionDuration": "X-X months"
  },
  "highlights": ["Key feature 1", "Key feature 2", "Key feature 3"],
  "highlightsAr": ["الميزة الأولى", "الميزة الثانية", "الميزة الثالثة"]
}`;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    updateProfile: protectedProcedure
      .input(z.object({
        officeName: z.string().optional(),
        officePhone: z.string().optional(),
        preferredLang: z.enum(["ar", "en"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateUserProfile(ctx.user.id, input);
        return { success: true };
      }),
  }),

  projects: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getProjectsByUser(ctx.user.id);
    }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await getProjectById(input.id, ctx.user.id);
        if (!project) throw new Error("Project not found");
        return project;
      }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        landArea: z.number().optional(),
        landWidth: z.number().optional(),
        landLength: z.number().optional(),
        landCoordinates: z.string().optional(),
        landShape: z.enum(["rectangular", "square", "irregular", "L-shape", "T-shape"]).optional(),
        buildingRatio: z.number().optional(),
        floorAreaRatio: z.number().optional(),
        maxFloors: z.number().optional(),
        frontSetback: z.number().optional(),
        backSetback: z.number().optional(),
        sideSetback: z.number().optional(),
        buildingType: z.enum(["residential", "villa"]).optional(),
        numberOfRooms: z.number().optional(),
        numberOfFloors: z.number().optional(),
        parkingSpaces: z.number().optional(),
        additionalRequirements: z.string().optional(),
        bedrooms: z.number().optional(),
        bathrooms: z.number().optional(),
        majlis: z.number().optional(),
        garages: z.number().optional(),
        maidRooms: z.number().optional(),
        balconies: z.number().optional(),
        zoningCode: z.string().optional(),
        deedNumber: z.string().optional(),
        plotNumber: z.string().optional(),
        blockNumber: z.string().optional(),
        neighborhoodName: z.string().optional(),
        deedFileUrl: z.string().optional(),
        buildingCodeFileUrl: z.string().optional(),
        extractedDeedData: z.any().optional(),
        extractedBuildingCodeData: z.any().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const isLarge = (input.landArea ?? 0) > 5000 || (input.numberOfFloors ?? 0) > 10;
        const id = await createProject({
          ...input,
          userId: ctx.user.id,
          status: "draft",
          isLargeProject: isLarge ? 1 : 0,
        });
        return { id };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        landArea: z.number().optional(),
        landWidth: z.number().optional(),
        landLength: z.number().optional(),
        landCoordinates: z.string().optional(),
        landShape: z.enum(["rectangular", "square", "irregular", "L-shape", "T-shape"]).optional(),
        buildingRatio: z.number().optional(),
        floorAreaRatio: z.number().optional(),
        maxFloors: z.number().optional(),
        frontSetback: z.number().optional(),
        backSetback: z.number().optional(),
        sideSetback: z.number().optional(),
        buildingType: z.enum(["residential", "villa"]).optional(),
        numberOfRooms: z.number().optional(),
        numberOfFloors: z.number().optional(),
        parkingSpaces: z.number().optional(),
        additionalRequirements: z.string().optional(),
        bedrooms: z.number().optional(),
        bathrooms: z.number().optional(),
        majlis: z.number().optional(),
        garages: z.number().optional(),
        maidRooms: z.number().optional(),
        balconies: z.number().optional(),
        zoningCode: z.string().optional(),
        deedNumber: z.string().optional(),
        plotNumber: z.string().optional(),
        blockNumber: z.string().optional(),
        neighborhoodName: z.string().optional(),
        deedFileUrl: z.string().optional(),
        buildingCodeFileUrl: z.string().optional(),
        extractedDeedData: z.any().optional(),
        extractedBuildingCodeData: z.any().optional(),
        status: z.enum(["draft", "processing", "completed", "archived"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateProject(id, ctx.user.id, data);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteProject(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  blueprints: router({
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        return getBlueprintsByProject(input.projectId, ctx.user.id);
      }),
    listAll: protectedProcedure.query(async ({ ctx }) => {
      return getBlueprintsByUser(ctx.user.id);
    }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const bp = await getBlueprintById(input.id, ctx.user.id);
        if (!bp) throw new Error("Blueprint not found");
        return bp;
      }),
    listByBatch: protectedProcedure
      .input(z.object({ batchId: z.string() }))
      .query(async ({ ctx, input }) => {
        return getBlueprintsByBatch(input.batchId, ctx.user.id);
      }),
    select: protectedProcedure
      .input(z.object({ blueprintId: z.number(), projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await selectBlueprint(input.blueprintId, input.projectId, ctx.user.id);
        await updateProject(input.projectId, ctx.user.id, { status: "completed" });
        return { success: true };
      }),

    // ─── Generate 6 concepts at once ───────────────────────────────────
    generate6: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        lang: z.enum(["ar", "en"]).default("ar"),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");

        // Step 1: Auto-check Saudi Building Code
        const codeCheck = checkSaudiBuildingCode(project);

        // Step 2: Apply auto-corrections silently
        if (!codeCheck.isCompliant) {
          await updateProject(input.projectId, ctx.user.id, {
            frontSetback: codeCheck.corrected.frontSetback,
            backSetback: codeCheck.corrected.backSetback,
            sideSetback: codeCheck.corrected.sideSetback,
            buildingRatio: codeCheck.corrected.buildingRatio,
            numberOfFloors: codeCheck.corrected.numberOfFloors,
          });
        }

        await updateProject(input.projectId, ctx.user.id, { status: "processing" });

        // Step 3: Generate batch ID
        const batchId = `batch_${Date.now()}_${ctx.user.id}`;
        const startTime = Date.now();

        // Step 4: Generate 6 concepts in parallel (BSP + AI)
        const conceptPromises = Array.from({ length: 6 }, (_, i) => {
          const conceptIndex = i + 1;

          // 4a: Generate BSP layout (deterministic, instant)
          const bspLayout = generateBSPLayout({
            landArea: project.landArea ?? 300,
            buildingType: (project.buildingType === "villa" ? "villa" : "apartment") as "villa" | "apartment",
            numberOfFloors: codeCheck.corrected.numberOfFloors,
            bedrooms: project.bedrooms ?? 3,
            bathrooms: project.bathrooms ?? 2,
            conceptIndex: i,
            extras: {
              majlis: project.majlis ?? 1,
              parking: project.garages ?? 1,
              maidRoom: project.maidRooms ?? 0,
              balcony: project.balconies ?? 1,
            },
            setbacks: {
              front: codeCheck.corrected.frontSetback,
              back: codeCheck.corrected.backSetback,
              side: codeCheck.corrected.sideSetback,
            },
          });

          // 4b: AI enrichment (titles, descriptions, highlights)
          const prompt = buildConceptPrompt(project, conceptIndex, codeCheck.corrected);
          return invokeLLM({
            messages: [
              {
                role: "system",
                content: "You are an expert Saudi architectural AI. Generate precise floor plan data. Always respond with valid JSON only, no markdown.",
              },
              { role: "user", content: prompt },
            ],
          }).then(async (response) => {
            const rawContent = response.choices[0]?.message?.content;
            const content = typeof rawContent === "string" ? rawContent : "{}";
            let aiData: any = {};
            try {
              const cleaned = content.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
              aiData = JSON.parse(cleaned);
            } catch {
              aiData = {};
            }

            // Merge BSP layout with AI enrichment
            const conceptTitle = CONCEPT_TITLES[i];
            const structuredData = {
              ...aiData,
              title: aiData.title ?? `Concept ${conceptIndex}: ${conceptTitle.en}`,
              titleAr: aiData.titleAr ?? `المفهوم ${conceptIndex}: ${conceptTitle.ar}`,
              // BSP-generated accurate floor plans override AI spaces
              spaces: bspLayout.floors.flatMap(f =>
                f.rooms.map(r => ({
                  name: r.nameEn,
                  nameAr: r.nameAr,
                  floor: r.floor,
                  width: r.width,
                  length: r.height,
                  area: r.area,
                  type: r.type,
                  x: (r.x / bspLayout.buildingWidth) * 100,
                  y: (r.y / bspLayout.buildingDepth) * 100,
                  w: (r.width / bspLayout.buildingWidth) * 100,
                  h: (r.height / bspLayout.buildingDepth) * 100,
                }))
              ),
              summary: {
                totalFloors: bspLayout.summary.totalFloors,
                totalRooms: bspLayout.summary.totalRooms,
                totalArea: bspLayout.summary.totalArea,
                estimatedCost: bspLayout.summary.estimatedCost,
                bedrooms: bspLayout.summary.bedrooms,
                bathrooms: bspLayout.summary.bathrooms,
                buildingWidth: bspLayout.buildingWidth,
                buildingDepth: bspLayout.buildingDepth,
                buildingArea: bspLayout.buildingArea,
              },
              regulatoryCompliance: {
                isCompliant: codeCheck.isCompliant,
                buildingFootprint: bspLayout.buildingArea,
                actualCoverageRatio: Math.round((bspLayout.buildingArea / (project.landArea ?? 300)) * 100),
                setbacks: bspLayout.setbacks,
                complianceNotes: ["Saudi Building Code verified", "Setbacks applied"],
                complianceNotesAr: ["تم التحقق من الكود السعودي", "تم تطبيق الإرتدادات"],
              },
              // SVG floor plan data
              svgData: bspLayout.svgData,
              bspLayout: {
                floors: bspLayout.floors,
                buildingWidth: bspLayout.buildingWidth,
                buildingDepth: bspLayout.buildingDepth,
                setbacks: bspLayout.setbacks,
              },
            };

            const blueprintId = await createBlueprint({
              projectId: input.projectId,
              userId: ctx.user.id,
              title: structuredData.title,
              version: 1,
              conceptIndex,
              batchId,
              conceptDescription: structuredData.conceptDescription ?? "",
              conceptDescriptionAr: structuredData.conceptDescriptionAr ?? "",
              structuredData,
              regulatoryCompliance: structuredData.regulatoryCompliance,
              aiModel: "bsp+llm",
              generationTime: Date.now() - startTime,
            });
            return { blueprintId, conceptIndex, structuredData };
          });
        });

        const results = await Promise.all(conceptPromises);

        await updateProject(input.projectId, ctx.user.id, { status: "completed" });

        if (project.isLargeProject) {
          await notifyOwner({
            title: `Large Project — 6 Blueprints Generated: ${project.name}`,
            content: `6 blueprint concepts generated for "${project.name}" (User ID: ${ctx.user.id}). Batch: ${batchId}`,
          });
        }

        return {
          batchId,
          blueprints: results,
          codeWarnings: codeCheck.warningsAr,
          codeWarningsEn: codeCheck.warnings,
          autoCorrections: !codeCheck.isCompliant ? codeCheck.corrected : null,
        };
      }),

    // Keep legacy single generate for backward compat
    generate: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        lang: z.enum(["ar", "en"]).default("ar"),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        await updateProject(input.projectId, ctx.user.id, { status: "processing" });
        const startTime = Date.now();
        const codeCheck = checkSaudiBuildingCode(project);
        const prompt = buildConceptPrompt(project, 1, codeCheck.corrected);
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are an expert Saudi architectural AI. Always respond with valid JSON only, no markdown." },
            { role: "user", content: prompt },
          ],
        });
        const rawContent = response.choices[0]?.message?.content;
        const content = typeof rawContent === "string" ? rawContent : "{}";
        let structuredData: any = {};
        try {
          const cleaned = content.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
          structuredData = JSON.parse(cleaned);
        } catch {
          structuredData = { error: "Failed to parse AI response", raw: content };
        }
        const generationTime = Date.now() - startTime;
        const blueprintId = await createBlueprint({
          projectId: input.projectId,
          userId: ctx.user.id,
          title: structuredData.title ?? project.name,
          version: 1,
          conceptIndex: 1,
          conceptDescription: structuredData.conceptDescription ?? "",
          conceptDescriptionAr: structuredData.conceptDescriptionAr ?? "",
          structuredData,
          regulatoryCompliance: structuredData.regulatoryCompliance ?? {},
          aiModel: "built-in",
          generationTime,
        });
        await updateProject(input.projectId, ctx.user.id, { status: "completed" });
        return { blueprintId, structuredData };
      }),
  }),

  voice: router({
    transcribe: protectedProcedure
      .input(z.object({
        audioUrl: z.string().url(),
        language: z.enum(["ar", "en"]).default("ar"),
      }))
      .mutation(async ({ input }) => {
        const result = await transcribeAudio({
          audioUrl: input.audioUrl,
          language: input.language === "ar" ? "ar" : "en",
          prompt: input.language === "ar"
            ? "هذا تسجيل صوتي لمتطلبات مشروع معماري من مكتب هندسي"
            : "This is a voice recording of architectural project requirements from an engineering office",
        });
        const text = "text" in result ? result.text : "";
        const lang = "language" in result ? (result as any).language : input.language;
        return { text, language: lang };
      }),
    parseRequirements: protectedProcedure
      .input(z.object({ text: z.string(), lang: z.enum(["ar", "en"]).default("ar") }))
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are an expert at extracting structured architectural project data from natural language text. Always respond with valid JSON only.",
            },
            {
              role: "user",
              content: `Extract structured project data from this text and return JSON with these fields (use null for missing values):
{
  "name": string,
  "buildingType": "residential"|"villa"|null,
  "landArea": number|null,
  "landWidth": number|null,
  "landLength": number|null,
  "buildingRatio": number|null,
  "maxFloors": number|null,
  "frontSetback": number|null,
  "backSetback": number|null,
  "sideSetback": number|null,
  "numberOfRooms": number|null,
  "numberOfFloors": number|null,
  "parkingSpaces": number|null,
  "additionalRequirements": string|null
}

Text: "${input.text}"`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "project_requirements",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  buildingType: { type: "string" },
                  landArea: { type: "number" },
                  landWidth: { type: "number" },
                  landLength: { type: "number" },
                  buildingRatio: { type: "number" },
                  maxFloors: { type: "number" },
                  frontSetback: { type: "number" },
                  backSetback: { type: "number" },
                  sideSetback: { type: "number" },
                  numberOfRooms: { type: "number" },
                  numberOfFloors: { type: "number" },
                  parkingSpaces: { type: "number" },
                  additionalRequirements: { type: "string" },
                },
                required: ["name", "buildingType", "landArea", "landWidth", "landLength", "buildingRatio", "maxFloors", "frontSetback", "backSetback", "sideSetback", "numberOfRooms", "numberOfFloors", "parkingSpaces", "additionalRequirements"],
                additionalProperties: false,
              },
            },
          },
        });
        const rawContent2 = response.choices[0]?.message?.content;
        const content2 = typeof rawContent2 === "string" ? rawContent2 : "{}";
        try {
          return JSON.parse(content2);
        } catch {
          return {};
        }
      }),
  }),

  stats: router({
    overview: protectedProcedure.query(async ({ ctx }) => {
      const [projects, blueprints] = await Promise.all([
        getProjectsByUser(ctx.user.id),
        getBlueprintsByUser(ctx.user.id),
      ]);
      return {
        totalProjects: projects.length,
        totalBlueprints: blueprints.length,
        completedProjects: projects.filter((p) => p.status === "completed").length,
        draftProjects: projects.filter((p) => p.status === "draft").length,
      };
    }),
  }),

  documents: router({
    // Extract data from deed PDF (صك الأرض)
    extractDeed: protectedProcedure
      .input(z.object({
        fileUrl: z.string(),
        projectId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are an expert at reading Saudi real estate deed documents (صكوك الأراضي). Extract all land data accurately. Always respond with valid JSON only, no markdown.",
            },
            {
              role: "user",
              content: [
                {
                  type: "text" as const,
                  text: `Extract all data from this Saudi land deed (صك الأرض) and return JSON:
{
  "deedNumber": string|null,
  "plotNumber": string|null,
  "blockNumber": string|null,
  "neighborhoodName": string|null,
  "districtName": string|null,
  "cityName": string|null,
  "landArea": number|null,
  "landWidth": number|null,
  "landLength": number|null,
  "landShape": "rectangular"|"square"|"irregular"|"L-shape"|"T-shape"|null,
  "coordinates": string|null,
  "ownerName": string|null,
  "deedDate": string|null,
  "notes": string|null
}
Return ONLY valid JSON, no extra text.`,
                },
                {
                  type: "image_url" as const,
                  image_url: { url: input.fileUrl, detail: "high" as const },
                },
              ],
            },
          ],
        });
        const rawContent = response.choices[0]?.message?.content;
        const content = typeof rawContent === "string" ? rawContent : "{}";
        let extracted: any = {};
        try {
          const cleaned = content.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
          extracted = JSON.parse(cleaned);
        } catch {
          extracted = { error: "Could not parse deed", raw: content.slice(0, 300) };
        }
        // Auto-update project if provided
        if (input.projectId && !extracted.error) {
          await updateProject(input.projectId, ctx.user.id, {
            deedFileUrl: input.fileUrl,
            extractedDeedData: extracted,
            deedNumber: extracted.deedNumber ?? undefined,
            plotNumber: extracted.plotNumber ?? undefined,
            blockNumber: extracted.blockNumber ?? undefined,
            neighborhoodName: extracted.neighborhoodName ?? undefined,
            landArea: extracted.landArea ?? undefined,
            landWidth: extracted.landWidth ?? undefined,
            landLength: extracted.landLength ?? undefined,
            landShape: extracted.landShape ?? undefined,
            landCoordinates: extracted.coordinates ?? undefined,
          });
        }
        return { extracted, success: !extracted.error };
      }),

    // Extract data from building code PDF (نظام البناء من أمانة الرياض)
    extractBuildingCode: protectedProcedure
      .input(z.object({
        fileUrl: z.string(),
        projectId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are an expert at reading Saudi municipal building code documents (نظام البناء من أمانة الرياض). Extract all building regulations accurately. Always respond with valid JSON only, no markdown.",
            },
            {
              role: "user",
              content: [
                {
                  type: "text" as const,
                  text: `Extract all building regulations from this Saudi building code document (نظام البناء) and return JSON:
{
  "zoningCode": string|null,
  "allowedUses": string|null,
  "buildingRatio": number|null,
  "floorAreaRatio": number|null,
  "maxFloors": number|null,
  "maxHeight": number|null,
  "frontSetback": number|null,
  "backSetback": number|null,
  "sideSetback": number|null,
  "parkingRequirements": string|null,
  "specialConditions": string|null,
  "neighborhoodName": string|null,
  "municipalityName": string|null,
  "plotNumber": string|null,
  "blockNumber": string|null,
  "planNumber": string|null
}
Return ONLY valid JSON, no extra text.`,
                },
                {
                  type: "image_url" as const,
                  image_url: { url: input.fileUrl, detail: "high" as const },
                },
              ],
            },
          ],
        });
        const rawContent = response.choices[0]?.message?.content;
        const content = typeof rawContent === "string" ? rawContent : "{}";
        let extracted: any = {};
        try {
          const cleaned = content.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
          extracted = JSON.parse(cleaned);
        } catch {
          extracted = { error: "Could not parse building code", raw: content.slice(0, 300) };
        }
        // Auto-update project if provided
        if (input.projectId && !extracted.error) {
          await updateProject(input.projectId, ctx.user.id, {
            buildingCodeFileUrl: input.fileUrl,
            extractedBuildingCodeData: extracted,
            zoningCode: extracted.zoningCode ?? undefined,
            buildingRatio: extracted.buildingRatio ?? undefined,
            floorAreaRatio: extracted.floorAreaRatio ?? undefined,
            maxFloors: extracted.maxFloors ?? undefined,
            frontSetback: extracted.frontSetback ?? undefined,
            backSetback: extracted.backSetback ?? undefined,
            sideSetback: extracted.sideSetback ?? undefined,
            neighborhoodName: extracted.neighborhoodName ?? undefined,
            plotNumber: extracted.plotNumber ?? undefined,
            blockNumber: extracted.blockNumber ?? undefined,
          });
        }
        return { extracted, success: !extracted.error };
      }),
  }),

  subscription: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return getOrCreateSubscription(ctx.user.id);
    }),
    upgrade: protectedProcedure
      .input(z.object({ plan: z.enum(["free", "pro"]) }))
      .mutation(async ({ ctx, input }) => {
        const sub = await getOrCreateSubscription(ctx.user.id);
        const limit = input.plan === "pro" ? -1 : 3;
        const projLimit = input.plan === "pro" ? -1 : 5;
        await updateSubscription(sub.id, {
          plan: input.plan,
          blueprintsLimit: limit,
          projectsLimit: projLimit,
          expiresAt: input.plan === "pro" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
        });
        if (input.plan === "pro") {
          await notifyOwner({
            title: "New Pro Subscription",
            content: `User ${ctx.user.name} (${ctx.user.email}) upgraded to Pro plan.`,
          });
        }
        return { success: true, plan: input.plan };
      }),
  }),
});

export type AppRouter = typeof appRouter;
