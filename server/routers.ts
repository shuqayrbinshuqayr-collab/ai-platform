import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import { transcribeAudio } from "./_core/voiceTranscription";
import {
  createProject, getProjectsByUser, getProjectById, updateProject, deleteProject,
  createBlueprint, getBlueprintsByProject, getBlueprintsByUser, getBlueprintById,
  updateUserProfile, getAllProjectsCount, getAllUsersCount,
  getOrCreateSubscription, updateSubscription
} from "./db";

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
        buildingType: z.enum(["residential", "commercial", "mixed", "industrial", "governmental", "educational", "healthcare"]).optional(),
        numberOfRooms: z.number().optional(),
        numberOfFloors: z.number().optional(),
        parkingSpaces: z.number().optional(),
        additionalRequirements: z.string().optional(),
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
        buildingType: z.enum(["residential", "commercial", "mixed", "industrial", "governmental", "educational", "healthcare"]).optional(),
        numberOfRooms: z.number().optional(),
        numberOfFloors: z.number().optional(),
        parkingSpaces: z.number().optional(),
        additionalRequirements: z.string().optional(),
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

        const systemPrompt = `You are an expert architectural consultant AI specializing in generating preliminary architectural blueprints for engineering offices. 
You analyze land data, regulatory constraints, and user requirements to produce structured architectural concepts.
Always respond with valid JSON only, no markdown, no extra text.`;

        const userPrompt = `Generate a preliminary architectural blueprint based on the following data:

PROJECT: ${project.name}
BUILDING TYPE: ${project.buildingType}

LAND DATA:
- Area: ${project.landArea ?? "N/A"} m²
- Width: ${project.landWidth ?? "N/A"} m
- Length: ${project.landLength ?? "N/A"} m
- Shape: ${project.landShape ?? "rectangular"}

REGULATORY CONSTRAINTS:
- Building Coverage Ratio: ${project.buildingRatio ?? 60}%
- Floor Area Ratio: ${project.floorAreaRatio ?? 2.0}
- Max Floors Allowed: ${project.maxFloors ?? 4}
- Front Setback: ${project.frontSetback ?? 4} m
- Back Setback: ${project.backSetback ?? 3} m
- Side Setback: ${project.sideSetback ?? 2} m

USER REQUIREMENTS:
- Number of Rooms: ${project.numberOfRooms ?? 4}
- Number of Floors: ${project.numberOfFloors ?? 2}
- Parking Spaces: ${project.parkingSpaces ?? 2}
- Additional Requirements: ${project.additionalRequirements ?? "None"}

Respond with this exact JSON structure:
{
  "title": "Blueprint title in English",
  "titleAr": "Blueprint title in Arabic",
  "conceptDescription": "Detailed architectural concept description in English (3-4 paragraphs)",
  "conceptDescriptionAr": "Detailed architectural concept description in Arabic (3-4 paragraphs)",
  "regulatoryCompliance": {
    "buildingFootprint": <number in m²>,
    "actualCoverageRatio": <number as percentage>,
    "totalBuiltArea": <number in m²>,
    "actualFloorAreaRatio": <number>,
    "isCompliant": <boolean>,
    "complianceNotes": ["note1", "note2"],
    "complianceNotesAr": ["ملاحظة1", "ملاحظة2"]
  },
  "spaces": [
    {
      "name": "Space name",
      "nameAr": "اسم المساحة",
      "floor": <floor number starting from 0 for ground>,
      "width": <number in m>,
      "length": <number in m>,
      "area": <number in m²>,
      "type": "bedroom|living|kitchen|bathroom|office|parking|corridor|balcony|storage|lobby|other",
      "x": <position x on floor plan 0-100>,
      "y": <position y on floor plan 0-100>,
      "w": <width percentage 0-100>,
      "h": <height percentage 0-100>
    }
  ],
  "summary": {
    "totalFloors": <number>,
    "totalRooms": <number>,
    "totalBathrooms": <number>,
    "totalArea": <number in m²>,
    "parkingSpaces": <number>,
    "estimatedCost": "<cost range in SAR>",
    "constructionDuration": "<duration estimate>"
  }
}`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });

        const rawContent = response.choices[0]?.message?.content;
        const content = typeof rawContent === 'string' ? rawContent : "{}";
        let structuredData: any = {};
        try {
          structuredData = JSON.parse(content);
        } catch {
          structuredData = { error: "Failed to parse AI response", raw: content };
        }

        const generationTime = Date.now() - startTime;

        const blueprintId = await createBlueprint({
          projectId: input.projectId,
          userId: ctx.user.id,
          title: structuredData.title ?? project.name,
          version: 1,
          conceptDescription: structuredData.conceptDescription ?? "",
          conceptDescriptionAr: structuredData.conceptDescriptionAr ?? "",
          structuredData: structuredData,
          regulatoryCompliance: structuredData.regulatoryCompliance ?? {},
          aiModel: "built-in",
          generationTime,
        });

        await updateProject(input.projectId, ctx.user.id, { status: "completed" });

        // Notify owner for large projects
        if (project.isLargeProject) {
          await notifyOwner({
            title: `Large Project Blueprint Generated - ${project.name}`,
            content: `A blueprint was generated for a large project "${project.name}" by user ID ${ctx.user.id}. This project requires review and technical support. Blueprint ID: ${blueprintId}`,
          });
        }

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
        const text = 'text' in result ? result.text : '';
        const lang = 'language' in result ? (result as any).language : input.language;
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
  "buildingType": "residential"|"commercial"|"mixed"|"industrial"|"governmental"|"educational"|"healthcare"|null,
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
        const content2 = typeof rawContent2 === 'string' ? rawContent2 : "{}";
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
        completedProjects: projects.filter(p => p.status === "completed").length,
        draftProjects: projects.filter(p => p.status === "draft").length,
      };
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
