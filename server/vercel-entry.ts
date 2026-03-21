import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerAuthRoutes } from "./_core/auth";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { registerUploadRoute } from "./uploadAudio";
import { registerUploadDocumentRoute } from "./uploadDocuments";

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

registerAuthRoutes(app);
registerUploadRoute(app);
registerUploadDocumentRoute(app);

app.use(
  "/api/trpc",
  createExpressMiddleware({ router: appRouter, createContext })
);

export default app;
