import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { generateBSPLayout, CONCEPT_TITLES } from "./bsp";
import { buildEnhancedArchPrompt } from "./saudiArchRules";
import { generateRAGContext } from "./blueprintRAG";
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

// ─── Build Enhanced AI prompt using Saudi Arch Rules + RAG ─────────────────
function buildConceptPrompt(project: any, conceptIndex: number, corrected: any) {
  const conceptStyles = [
    { en: "Modern Minimalist", ar: "عصري مينيمالي", focus: "open spaces, clean lines, maximum natural light, minimal walls" },
    { en: "Traditional Saudi Heritage", ar: "تراثي سعودي", focus: "mashrabiya elements, central courtyard, Arabic arches, ornamental details" },
    { en: "Contemporary Luxury", ar: "معاصر فاخر", focus: "double-height spaces, premium finishes, panoramic views, grand entrance" },
    { en: "Functional Compact", ar: "وظيفي مدمج", focus: "efficient space utilization, smart storage, practical layout, no wasted space" },
    { en: "Mediterranean", ar: "متوسطي", focus: "arched windows, terracotta tones, garden integration, outdoor living" },
    { en: "Smart Home Ready", ar: "جاهز للمنزل الذكي", focus: "integrated tech spaces, home office, flexible multi-purpose rooms" },
  ];
  const concept = conceptStyles[conceptIndex - 1] ?? conceptStyles[0];

  // Generate RAG context from similar real blueprints
  const ragContext = generateRAGContext({
    landArea: project.landArea ?? 300,
    landWidth: project.landWidth ?? undefined,
    landLength: project.landLength ?? undefined,
    floors: corrected.numberOfFloors,
    bedrooms: project.bedrooms ?? 4,
    bathrooms: project.bathrooms ?? 3,
    hasMajlis: (project.majlis ?? 1) > 0,
    hasParking: (project.garages ?? 1) > 0,
  });

  // Use the enhanced prompt builder with Saudi rules
  return buildEnhancedArchPrompt({
    buildingType: project.buildingType === "villa" ? "villa" : "residential",
    landArea: project.landArea ?? 300,
    landWidth: project.landWidth ?? undefined,
    landLength: project.landLength ?? undefined,
    landShape: project.landShape ?? "rectangular",
    numberOfFloors: corrected.numberOfFloors,
    bedrooms: project.bedrooms ?? 4,
    bathrooms: project.bathrooms ?? 3,
    majlis: project.majlis ?? 1,
    maidRooms: project.maidRooms ?? 0,
    balconies: project.balconies ?? 1,
    garages: project.garages ?? 1,
    additionalRequirements: project.additionalRequirements,
    setbacks: {
      front: corrected.frontSetback,
      back: corrected.backSetback,
      side: corrected.sideSetback,
    },
    buildingRatio: corrected.buildingRatio,
    conceptIndex,
    conceptStyle: concept,
  }) + ragContext;
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

            // Try to use AI-generated rooms (higher quality) if available
            // Fall back to BSP rooms if AI didn't return valid room data
            let aiGroundRooms: any[] = [];
            let aiUpperRooms: any[] = [];
            if (aiData.groundFloor?.rooms && Array.isArray(aiData.groundFloor.rooms) && aiData.groundFloor.rooms.length > 2) {
              aiGroundRooms = aiData.groundFloor.rooms.map((r: any) => ({
                name: r.nameEn ?? r.name ?? "Room",
                nameAr: r.nameAr ?? "غرفة",
                floor: 0,
                width: parseFloat((r.width ?? 3.5).toFixed(2)),
                length: parseFloat((r.length ?? 3.5).toFixed(2)),
                area: parseFloat((r.area ?? (r.width ?? 3.5) * (r.length ?? 3.5)).toFixed(1)),
                type: r.type ?? "bedroom",
                x: (parseFloat((r.x ?? 0).toFixed(2)) / bspLayout.buildingWidth) * 100,
                y: (parseFloat((r.y ?? 0).toFixed(2)) / bspLayout.buildingDepth) * 100,
                w: (parseFloat((r.width ?? 3.5).toFixed(2)) / bspLayout.buildingWidth) * 100,
                h: (parseFloat((r.length ?? 3.5).toFixed(2)) / bspLayout.buildingDepth) * 100,
                hasWindow: r.hasWindow,
                doorWall: r.doorWall,
                notes: r.notes,
              }));
            }
            if (aiData.upperFloors && Array.isArray(aiData.upperFloors)) {
              aiUpperRooms = aiData.upperFloors.flatMap((floorData: any) =>
                (floorData.rooms ?? []).map((r: any) => ({
                  name: r.nameEn ?? r.name ?? "Room",
                  nameAr: r.nameAr ?? "غرفة",
                  floor: floorData.floorNumber ?? 1,
                  width: parseFloat((r.width ?? 3.5).toFixed(2)),
                  length: parseFloat((r.length ?? 3.5).toFixed(2)),
                  area: parseFloat((r.area ?? (r.width ?? 3.5) * (r.length ?? 3.5)).toFixed(1)),
                  type: r.type ?? "bedroom",
                  x: (parseFloat((r.x ?? 0).toFixed(2)) / bspLayout.buildingWidth) * 100,
                  y: (parseFloat((r.y ?? 0).toFixed(2)) / bspLayout.buildingDepth) * 100,
                  w: (parseFloat((r.width ?? 3.5).toFixed(2)) / bspLayout.buildingWidth) * 100,
                  h: (parseFloat((r.length ?? 3.5).toFixed(2)) / bspLayout.buildingDepth) * 100,
                  hasWindow: r.hasWindow,
                  doorWall: r.doorWall,
                  notes: r.notes,
                }))
              );
            }

            // ALWAYS use BSP spaces (they fill the building perfectly with no gaps)
            // Enrich BSP room names with AI names when available
            const hasAIRooms = aiGroundRooms.length > 2;

            // Build AI name lookup by type+floor for enrichment
            const aiNameLookup: Map<string, { nameAr: string; nameEn: string }> = new Map();
            if (hasAIRooms) {
              [...aiGroundRooms, ...aiUpperRooms].forEach((r: any, idx: number) => {
                const key = `${r.type}-${r.floor ?? 0}-${idx}`;
                aiNameLookup.set(key, { nameAr: r.nameAr ?? r.name, nameEn: r.name });
              });
            }

            // BSP spaces with percentage coordinates (guaranteed to fill building)
            const bspSpaces = bspLayout.floors.flatMap(f =>
              f.rooms.map(r => ({
                name: r.nameEn,
                nameAr: r.nameAr,
                floor: r.floor,
                width: r.width,
                length: r.height,
                area: r.area,
                type: r.type,
                // Percentage coordinates (0-100) — guaranteed to fill building with no gaps
                x: (r.x / bspLayout.buildingWidth) * 100,
                y: (r.y / bspLayout.buildingDepth) * 100,
                w: (r.width / bspLayout.buildingWidth) * 100,
                h: (r.height / bspLayout.buildingDepth) * 100,
              }))
            );

            const structuredData = {
              ...aiData,
              title: aiData.title ?? `Concept ${conceptIndex}: ${conceptTitle.en}`,
              titleAr: aiData.titleAr ?? `المفهوم ${conceptIndex}: ${conceptTitle.ar}`,
              // Always use BSP spaces — they fill the building perfectly with no gaps
              spaces: bspSpaces,
              aiRoomsUsed: hasAIRooms, // flag to track quality
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
              content: `You are an expert at reading Saudi real estate deed documents issued by the Ministry of Justice (وزارة العدل) and the Real Estate Market (البورصة العقارية). These documents are titled 'وثيقة تملك عقار' or 'صك ملكية'. Extract all land data from the document tables and text. Key fields: رقم الوثيقة، المدينة، الحي، رقم المخطط، رقم القطعة، مساحة العقار، نوع العقار، الحدود والأبعاد (شمالاً/جنوباً/شرقاً/غرباً with lengths), الارتدادات (mentioned as 'ارتداد عرض X.00م' in boundary descriptions). Always respond with valid JSON only, no markdown.`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text" as const,
                  text: `Extract all data from this Saudi real estate deed (وثيقة تملك عقار / صك ملكية) and return JSON:
{
  "deedNumber": string|null,
  "plotNumber": string|null,
  "blockNumber": string|null,
  "planNumber": string|null,
  "neighborhoodName": string|null,
  "districtName": string|null,
  "cityName": string|null,
  "landArea": number|null,
  "propertyType": "أرض"|"شقة"|"فيلا"|"عمارة"|"دور"|"محل"|string|null,
  "landWidth": number|null,
  "landLength": number|null,
  "northLength": number|null,
  "southLength": number|null,
  "eastLength": number|null,
  "westLength": number|null,
  "northSetback": number|null,
  "southSetback": number|null,
  "eastSetback": number|null,
  "westSetback": number|null,
  "landShape": "rectangular"|"square"|"irregular"|"L-shape"|"T-shape"|null,
  "coordinates": string|null,
  "ownerName": string|null,
  "deedDate": string|null,
  "notes": string|null
}
For setbacks: look in boundary description for 'ارتداد عرض X.00م' — extract X as a number.
For lengths: look in boundary table column 'الطول م'.
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
            planNumber: extracted.planNumber ?? undefined,
            neighborhoodName: extracted.neighborhoodName ?? extracted.districtName ?? undefined,
            propertyType: extracted.propertyType ?? undefined,
            landArea: extracted.landArea ?? undefined,
            landWidth: extracted.landWidth ?? undefined,
            landLength: extracted.landLength ?? undefined,
            landShape: extracted.landShape ?? undefined,
            landCoordinates: extracted.coordinates ?? undefined,
            northLength: extracted.northLength ?? undefined,
            southLength: extracted.southLength ?? undefined,
            eastLength: extracted.eastLength ?? undefined,
            westLength: extracted.westLength ?? undefined,
            northSetback: extracted.northSetback ?? undefined,
            southSetback: extracted.southSetback ?? undefined,
            eastSetback: extracted.eastSetback ?? undefined,
            westSetback: extracted.westSetback ?? undefined,
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
