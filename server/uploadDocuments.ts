import { Application, Request, Response } from "express";
import multer from "multer";
import { nanoid } from "nanoid";
import { ENV } from "./_core/env";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB for PDFs
});

async function uploadToOpenAI(buffer: Buffer, mimetype: string, filename: string): Promise<string> {
  const blob = new Blob([buffer], { type: mimetype });
  const form = new FormData();
  form.append("file", blob, filename);
  form.append("purpose", "assistants");

  const res = await fetch("https://api.openai.com/v1/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`OpenAI file upload failed: ${text}`);
  }

  const data = await res.json() as { id: string };
  return `openai-file:${data.id}`;
}

export function registerUploadDocumentRoute(app: Application) {
  app.post("/api/upload/document", upload.single("file"), async (req: Request & { file?: Express.Multer.File }, res: Response) => {
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

      const filename = `document-${nanoid()}.${ext}`;
      const url = await uploadToOpenAI(req.file.buffer, mime, filename);

      return res.json({ url, key: filename });
    } catch (err: any) {
      console.error("[Upload Document]", err);
      return res.status(500).json({ error: err.message });
    }
  });
}
