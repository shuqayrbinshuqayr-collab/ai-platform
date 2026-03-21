import express, { Application, Request, Response } from "express";
import multer from "multer";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 16 * 1024 * 1024 }, // 16MB
});

export function registerUploadRoute(app: Application) {
  app.post("/api/upload-audio", upload.single("audio"), async (req: Request & { file?: Express.Multer.File }, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const ext = req.file.mimetype.includes("webm") ? "webm"
        : req.file.mimetype.includes("mp3") ? "mp3"
        : req.file.mimetype.includes("wav") ? "wav"
        : "webm";

      const key = `voice-recordings/${nanoid()}.${ext}`;
      const { url } = await storagePut(key, req.file.buffer, req.file.mimetype);

      return res.json({ url, key });
    } catch (err: any) {
      console.error("[Upload Audio]", err);
      return res.status(500).json({ error: err.message });
    }
  });
}
