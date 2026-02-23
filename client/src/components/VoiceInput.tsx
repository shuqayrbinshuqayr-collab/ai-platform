import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { t } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";


interface VoiceInputProps {
  lang: Lang;
  onParsed: (data: Record<string, any>) => void;
}

export default function VoiceInput({ lang, onParsed }: VoiceInputProps) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const transcribeMutation = trpc.voice.transcribe.useMutation();
  const parseMutation = trpc.voice.parseRequirements.useMutation();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });

        if (blob.size > 16 * 1024 * 1024) {
          toast.error(lang === "ar" ? "حجم الملف كبير جداً (الحد الأقصى 16MB)" : "File too large (max 16MB)");
          setProcessing(false);
          return;
        }

        setProcessing(true);
        try {
          // Upload audio to storage
          const arrayBuffer = await blob.arrayBuffer();
          const uint8 = new Uint8Array(arrayBuffer);
          const base64 = btoa(Array.from(uint8).map(b => String.fromCharCode(b)).join(''));
          const audioUrl = `data:audio/webm;base64,${base64}`;

          // Use the upload endpoint
          const formData = new FormData();
          formData.append("audio", blob, "recording.webm");

          // Upload via fetch to get a URL
          const uploadRes = await fetch("/api/upload-audio", {
            method: "POST",
            body: formData,
          });

          let audioFileUrl = audioUrl;
          if (uploadRes.ok) {
            const { url } = await uploadRes.json();
            audioFileUrl = url;
          }

          const transcribeResult = await transcribeMutation.mutateAsync({
            audioUrl: audioFileUrl,
            language: lang,
          });

          if (transcribeResult.text) {
            toast.success(lang === "ar" ? "تم التعرف على الكلام!" : "Speech recognized!");
            const parsed = await parseMutation.mutateAsync({
              text: transcribeResult.text,
              lang,
            });
            onParsed(parsed);
          }
        } catch (err: any) {
          toast.error(lang === "ar" ? "فشل في معالجة الصوت" : "Failed to process audio");
          console.error(err);
        } finally {
          setProcessing(false);
        }
      };

      mediaRecorder.start();
      setRecording(true);
      toast.info(lang === "ar" ? "جاري التسجيل... اضغط مرة أخرى للإيقاف" : "Recording... Press again to stop");
    } catch (err) {
      toast.error(lang === "ar" ? "لا يمكن الوصول إلى الميكروفون" : "Cannot access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const handleClick = () => {
    if (processing) return;
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <Button
      type="button"
      variant={recording ? "destructive" : "outline"}
      size="sm"
      onClick={handleClick}
      disabled={processing}
      className={`gap-2 transition-all ${
        recording
          ? "bg-red-500/20 border-red-500/50 text-red-300 animate-pulse"
          : "border-purple-500/40 text-purple-300 hover:bg-purple-500/10"
      }`}
    >
      {processing ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : recording ? (
        <MicOff className="w-4 h-4" />
      ) : (
        <Mic className="w-4 h-4" />
      )}
      {processing
        ? (lang === "ar" ? "جاري المعالجة..." : "Processing...")
        : recording
        ? t(lang, "stopRecording")
        : t(lang, "startRecording")}
    </Button>
  );
}
