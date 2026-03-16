import express, { Request } from "express";
import multer from "multer";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB for PDFs
});

export function registerUploadDocumentRoute(app: express.Express) {
  app.post("/api/upload", upload.single("file"), async (req: Request & { file?: Express.Multer.File }, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const mime = req.file.mimetype;
      const ext = mime.includes("pdf") ? "pdf"
        : mime.includes("png") ? "png"
        : mime.includes("jpeg") || mime.includes("jpg") ? "jpg"
        : mime.includes("webp") ? "webp"
        : "pdf";

      const key = `documents/${nanoid()}.${ext}`;
      const { url } = await storagePut(key, req.file.buffer, mime);

      return res.json({ url, key });
    } catch (err: any) {
      console.error("[Upload Document]", err);
      return res.status(500).json({ error: err.message });
    }
  });
}
