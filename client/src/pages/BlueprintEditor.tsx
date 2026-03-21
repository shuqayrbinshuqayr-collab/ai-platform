import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
// i18n handled via localStorage
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Save,
  ArrowLeft,
  Move,
  Maximize2,
  Edit3,
  CheckCircle,
  Brain,
  RotateCcw,
  Info,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
interface EditableSpace {
  id: string;
  name: string;
  nameAr: string;
  type: string;
  x: number; // percentage 0-100
  y: number;
  width: number; // percentage 0-100
  height: number;
  floor: number;
}

type DragMode = "move" | "resize-se" | "resize-e" | "resize-s" | null;

const ROOM_COLORS: Record<string, string> = {
  bedroom: "#1e3a5f",
  master_bedroom: "#1a2f4a",
  living: "#2d1f0e",
  family: "#1a2d1a",
  kitchen: "#1a1a2d",
  bathroom: "#1a2d2d",
  maid: "#2d1a2d",
  garage: "#2a2a2a",
  entrance: "#1f2a1f",
  corridor: "#252525",
  balcony: "#1a1a1a",
  storage: "#222222",
  default: "#1e2a3a",
};

const ROOM_COLORS_LIGHT: Record<string, string> = {
  bedroom: "#dbeafe",
  master_bedroom: "#bfdbfe",
  living: "#fef3c7",
  family: "#d1fae5",
  kitchen: "#ede9fe",
  bathroom: "#cffafe",
  maid: "#fce7f3",
  garage: "#f3f4f6",
  entrance: "#dcfce7",
  corridor: "#f9fafb",
  balcony: "#f0fdf4",
  storage: "#f5f5f5",
  default: "#e0f2fe",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function BlueprintEditor() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const isAr = (localStorage.getItem("i18nextLng") ?? "ar") === "ar";
  const blueprintId = parseInt(id ?? "0");

  const { data: blueprint, isLoading } = trpc.blueprints.get.useQuery(
    { id: blueprintId },
    { enabled: !!blueprintId }
  );

  const { data: existingEdits } = trpc.blueprints.getEdits.useQuery(
    { blueprintId },
    { enabled: !!blueprintId }
  );

  const saveEditsMutation = trpc.blueprints.saveEdits.useMutation();
  const submitFeedbackMutation = trpc.blueprints.submitFeedback.useMutation();

  const canvasRef = useRef<HTMLDivElement>(null);
  const [spaces, setSpaces] = useState<EditableSpace[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    mode: DragMode;
    startX: number;
    startY: number;
    origSpace: EditableSpace;
  } | null>(null);
  const [editingRoom, setEditingRoom] = useState<EditableSpace | null>(null);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [addToRAG, setAddToRAG] = useState(false);
  const [ragLabel, setRagLabel] = useState("");
  const [activeFloor, setActiveFloor] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);

  // ─── Load spaces from blueprint ──────────────────────────────────────────
  useEffect(() => {
    if (!blueprint) return;
    const data = blueprint.structuredData as any ?? {};

    // Prefer edited spaces if available
    const source = (existingEdits?.editedSpaces as EditableSpace[]) ??
      (data.spaces as EditableSpace[]) ?? [];

    if (source.length > 0) {
      setSpaces(source);
    } else if (data.bspLayout?.floors) {
      // Convert BSP layout to editable spaces
      const converted: EditableSpace[] = [];
      data.bspLayout.floors.forEach((floor: any, fi: number) => {
        (floor.rooms ?? []).forEach((r: any, ri: number) => {
          converted.push({
            id: `f${fi}_r${ri}`,
            name: r.name ?? r.nameAr ?? "Room",
            nameAr: r.nameAr ?? r.name ?? "غرفة",
            type: r.type ?? "default",
            x: r.x ?? 0,
            y: r.y ?? 0,
            width: r.width ?? 20,
            height: r.height ?? 20,
            floor: fi,
          });
        });
      });
      setSpaces(converted);
    }

    if (existingEdits?.editorFeedback) {
      try {
        const parsed = JSON.parse(existingEdits.editorFeedback);
        setFeedback(parsed.feedback ?? existingEdits.editorFeedback);
      } catch {
        setFeedback(existingEdits.editorFeedback ?? "");
      }
    }
  }, [blueprint, existingEdits]);

  // ─── Mouse handlers ──────────────────────────────────────────────────────
  const getCanvasCoords = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  const handleMouseDown = useCallback((
    e: React.MouseEvent,
    space: EditableSpace,
    mode: DragMode
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(space.id);
    const coords = getCanvasCoords(e);
    setDragState({
      mode,
      startX: coords.x,
      startY: coords.y,
      origSpace: { ...space },
    });
  }, [getCanvasCoords]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState) return;
    const coords = getCanvasCoords(e);
    const dx = coords.x - dragState.startX;
    const dy = coords.y - dragState.startY;

    setSpaces(prev => prev.map(s => {
      if (s.id !== dragState.origSpace.id) return s;
      const orig = dragState.origSpace;
      if (dragState.mode === "move") {
        return {
          ...s,
          x: Math.max(0, Math.min(100 - orig.width, orig.x + dx)),
          y: Math.max(0, Math.min(100 - orig.height, orig.y + dy)),
        };
      } else if (dragState.mode === "resize-se") {
        return {
          ...s,
          width: Math.max(5, Math.min(100 - orig.x, orig.width + dx)),
          height: Math.max(5, Math.min(100 - orig.y, orig.height + dy)),
        };
      } else if (dragState.mode === "resize-e") {
        return {
          ...s,
          width: Math.max(5, Math.min(100 - orig.x, orig.width + dx)),
        };
      } else if (dragState.mode === "resize-s") {
        return {
          ...s,
          height: Math.max(5, Math.min(100 - orig.y, orig.height + dy)),
        };
      }
      return s;
    }));
    setHasChanges(true);
  }, [dragState, getCanvasCoords]);

  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  // ─── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    try {
      await saveEditsMutation.mutateAsync({
        blueprintId,
        editedSpaces: spaces,
        editorFeedback: feedback || undefined,
      });
      setHasChanges(false);
      toast.success(isAr ? "تم حفظ التعديلات بنجاح" : "Edits saved successfully");
    } catch {
      toast.error(isAr ? "فشل الحفظ" : "Save failed");
    }
  };

  // ─── Submit feedback & add to RAG ────────────────────────────────────────
  const handleSubmitFeedback = async () => {
    try {
      await saveEditsMutation.mutateAsync({ blueprintId, editedSpaces: spaces });
      await submitFeedbackMutation.mutateAsync({
        blueprintId,
        feedback,
        addToRAG,
        ragLabel: ragLabel || undefined,
      });
      setShowFeedbackDialog(false);
      toast.success(
        addToRAG
          ? (isAr ? "تم إضافة المخطط لقاعدة التعلم ✅" : "Blueprint added to learning base ✅")
          : (isAr ? "تم حفظ الملاحظات" : "Feedback saved")
      );
    } catch {
      toast.error(isAr ? "فشل الإرسال" : "Submission failed");
    }
  };

  // ─── Reset ────────────────────────────────────────────────────────────────
  const handleReset = () => {
    if (!blueprint) return;
    const data = blueprint.structuredData as any ?? {};
    const source = (data.spaces as EditableSpace[]) ?? [];
    setSpaces(source);
    setHasChanges(false);
    toast.info(isAr ? "تم إعادة ضبط المخطط" : "Blueprint reset");
  };

  // ─── Floors ───────────────────────────────────────────────────────────────
  const floors = Array.from(new Set(spaces.map(s => s.floor))).sort();
  const visibleSpaces = spaces.filter(s => s.floor === activeFloor);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-white/60">{isAr ? "جاري التحميل..." : "Loading..."}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col" dir={isAr ? "rtl" : "ltr"}>
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="border-b border-white/10 bg-[#0d0d14] px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/blueprints/${blueprintId}`)}
            className="text-white/60 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="font-bold text-sm">
              {isAr ? "محرر المخطط" : "Blueprint Editor"}
            </h1>
            <p className="text-xs text-white/40">
              {isAr ? "اسحب الغرف لتعديل موضعها وأبعادها" : "Drag rooms to edit position and size"}
            </p>
          </div>
          {hasChanges && (
            <Badge variant="outline" className="border-orange-500 text-orange-400 text-xs">
              {isAr ? "تعديلات غير محفوظة" : "Unsaved changes"}
            </Badge>
          )}
          {existingEdits?.isEditedByEngineer && (
            <Badge variant="outline" className="border-green-500 text-green-400 text-xs">
              <CheckCircle className="w-3 h-3 mr-1" />
              {isAr ? "معدّل" : "Edited"}
            </Badge>
          )}
          {existingEdits?.addedToRAG && (
            <Badge variant="outline" className="border-purple-500 text-purple-400 text-xs">
              <Brain className="w-3 h-3 mr-1" />
              {isAr ? "في قاعدة التعلم" : "In learning base"}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="border-white/20 text-white/60 hover:text-white text-xs"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            {isAr ? "إعادة ضبط" : "Reset"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFeedbackDialog(true)}
            className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10 text-xs"
          >
            <Brain className="w-3 h-3 mr-1" />
            {isAr ? "إضافة للتعلم" : "Add to Learning"}
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saveEditsMutation.isPending || !hasChanges}
            className="bg-orange-500 hover:bg-orange-600 text-white text-xs"
          >
            <Save className="w-3 h-3 mr-1" />
            {saveEditsMutation.isPending
              ? (isAr ? "جاري الحفظ..." : "Saving...")
              : (isAr ? "حفظ التعديلات" : "Save Edits")}
          </Button>
        </div>
      </div>

      {/* ─── Floor Tabs ─────────────────────────────────────────────────── */}
      {floors.length > 1 && (
        <div className="border-b border-white/10 bg-[#0d0d14] px-4 py-2 flex gap-2">
          {floors.map(f => (
            <button
              key={f}
              onClick={() => setActiveFloor(f)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeFloor === f
                  ? "bg-orange-500 text-white"
                  : "bg-white/5 text-white/50 hover:bg-white/10"
              }`}
            >
              {isAr ? `الطابق ${f === 0 ? "الأرضي" : f}` : `Floor ${f}`}
            </button>
          ))}
        </div>
      )}

      {/* ─── Main Layout ────────────────────────────────────────────────── */}
      <div className="flex-1 flex gap-0">
        {/* Canvas */}
        <div className="flex-1 p-6 flex items-center justify-center bg-[#0a0a0f]">
          <div
            ref={canvasRef}
            className="relative bg-white border-4 border-gray-800 shadow-2xl"
            style={{ width: "min(70vw, 600px)", height: "min(80vh, 700px)", cursor: dragState ? "grabbing" : "default" }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={() => setSelectedId(null)}
          >
            {/* Grid */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
              <defs>
                <pattern id="grid" width="5%" height="5%" patternUnits="userSpaceOnUse">
                  <path d="M 0 0 L 0 100% M 0 0 L 100% 0" stroke="#94a3b8" strokeWidth="0.5" fill="none"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Rooms */}
            {visibleSpaces.map(space => {
              const isSelected = selectedId === space.id;
              const bgColor = ROOM_COLORS_LIGHT[space.type] ?? ROOM_COLORS_LIGHT.default;
              const borderColor = isSelected ? "#f97316" : "#374151";
              return (
                <div
                  key={space.id}
                  className="absolute select-none"
                  style={{
                    left: `${space.x}%`,
                    top: `${space.y}%`,
                    width: `${space.width}%`,
                    height: `${space.height}%`,
                    backgroundColor: bgColor,
                    border: `${isSelected ? 2 : 1.5}px solid ${borderColor}`,
                    boxShadow: isSelected ? "0 0 0 2px rgba(249,115,22,0.4)" : "none",
                    zIndex: isSelected ? 10 : 1,
                    cursor: "grab",
                    transition: dragState ? "none" : "box-shadow 0.1s",
                  }}
                  onMouseDown={e => handleMouseDown(e, space, "move")}
                  onClick={e => { e.stopPropagation(); setSelectedId(space.id); }}
                >
                  {/* Room label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-1">
                    <span className="text-gray-800 font-semibold text-center leading-tight"
                      style={{ fontSize: `clamp(7px, ${space.width * 0.12}vw, 12px)` }}>
                      {isAr ? (space.nameAr || space.name) : space.name}
                    </span>
                    <span className="text-gray-500 text-center"
                      style={{ fontSize: `clamp(6px, ${space.width * 0.09}vw, 10px)` }}>
                      {(space.width ?? 0).toFixed(0)}×{(space.height ?? 0).toFixed(0)}%
                    </span>
                  </div>

                  {/* Edit button */}
                  {isSelected && (
                    <button
                      className="absolute top-0.5 right-0.5 bg-orange-500 text-white rounded-full p-0.5 z-20 hover:bg-orange-600"
                      style={{ fontSize: 8 }}
                      onMouseDown={e => e.stopPropagation()}
                      onClick={e => { e.stopPropagation(); setEditingRoom({ ...space }); }}
                    >
                      <Edit3 className="w-2 h-2" />
                    </button>
                  )}

                  {/* Resize handles */}
                  {isSelected && (
                    <>
                      {/* East */}
                      <div
                        className="absolute top-0 bottom-0 right-0 w-2 cursor-e-resize z-20"
                        onMouseDown={e => { e.stopPropagation(); handleMouseDown(e, space, "resize-e"); }}
                      />
                      {/* South */}
                      <div
                        className="absolute left-0 right-0 bottom-0 h-2 cursor-s-resize z-20"
                        onMouseDown={e => { e.stopPropagation(); handleMouseDown(e, space, "resize-s"); }}
                      />
                      {/* SE corner */}
                      <div
                        className="absolute bottom-0 right-0 w-3 h-3 bg-orange-500 cursor-se-resize z-30 rounded-tl"
                        onMouseDown={e => { e.stopPropagation(); handleMouseDown(e, space, "resize-se"); }}
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Side Panel ─────────────────────────────────────────────── */}
        <div className="w-64 border-l border-white/10 bg-[#0d0d14] p-4 flex flex-col gap-4 overflow-y-auto">
          <div>
            <h3 className="text-xs font-semibold text-white/60 uppercase mb-2">
              {isAr ? "تعليمات التحرير" : "Editing Instructions"}
            </h3>
            <div className="space-y-2 text-xs text-white/50">
              <div className="flex items-center gap-2">
                <Move className="w-3 h-3 text-orange-400 shrink-0" />
                <span>{isAr ? "اسحب الغرفة لتحريكها" : "Drag room to move"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Maximize2 className="w-3 h-3 text-blue-400 shrink-0" />
                <span>{isAr ? "اسحب الزاوية البرتقالية لتغيير الحجم" : "Drag orange corner to resize"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Edit3 className="w-3 h-3 text-green-400 shrink-0" />
                <span>{isAr ? "اضغط ✏️ لتعديل اسم الغرفة" : "Click ✏️ to rename room"}</span>
              </div>
            </div>
          </div>

          {/* Selected room info */}
          {selectedId && (() => {
            const s = spaces.find(sp => sp.id === selectedId);
            if (!s) return null;
            return (
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <h4 className="text-xs font-semibold text-orange-400 mb-2">
                  {isAr ? "الغرفة المحددة" : "Selected Room"}
                </h4>
                <p className="text-sm font-medium text-white mb-1">{isAr ? s.nameAr : s.name}</p>
                <div className="grid grid-cols-2 gap-1 text-xs text-white/50">
                  <span>X: {(s.x ?? 0).toFixed(1)}%</span>
                  <span>Y: {(s.y ?? 0).toFixed(1)}%</span>
                  <span>W: {(s.width ?? 0).toFixed(1)}%</span>
                  <span>H: {(s.height ?? 0).toFixed(1)}%</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-2 border-white/20 text-white/60 hover:text-white text-xs"
                  onClick={() => setEditingRoom({ ...s })}
                >
                  <Edit3 className="w-3 h-3 mr-1" />
                  {isAr ? "تعديل الاسم" : "Edit Name"}
                </Button>
              </div>
            );
          })()}

          {/* Rooms list */}
          <div>
            <h3 className="text-xs font-semibold text-white/60 uppercase mb-2">
              {isAr ? "قائمة الغرف" : "Rooms List"}
            </h3>
            <div className="space-y-1">
              {visibleSpaces.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full text-right px-2 py-1.5 rounded text-xs transition-colors ${
                    selectedId === s.id
                      ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                      : "bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{(s.width ?? 0).toFixed(0)}×{(s.height ?? 0).toFixed(0)}</span>
                    <span>{isAr ? s.nameAr : s.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="mt-auto bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Info className="w-3 h-3 text-blue-400 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-300/80">
                {isAr
                  ? "بعد التعديل، اضغط \"إضافة للتعلم\" لتحسين المخططات المستقبلية"
                  : "After editing, click \"Add to Learning\" to improve future blueprints"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Edit Room Name Dialog ───────────────────────────────────────── */}
      <Dialog open={!!editingRoom} onOpenChange={() => setEditingRoom(null)}>
        <DialogContent className="bg-[#0d0d14] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>{isAr ? "تعديل اسم الغرفة" : "Edit Room Name"}</DialogTitle>
          </DialogHeader>
          {editingRoom && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/60 mb-1 block">
                  {isAr ? "الاسم بالعربية" : "Arabic Name"}
                </label>
                <Input
                  value={editingRoom.nameAr}
                  onChange={e => setEditingRoom({ ...editingRoom, nameAr: e.target.value })}
                  className="bg-white/5 border-white/20 text-white"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="text-xs text-white/60 mb-1 block">
                  {isAr ? "الاسم بالإنجليزية" : "English Name"}
                </label>
                <Input
                  value={editingRoom.name}
                  onChange={e => setEditingRoom({ ...editingRoom, name: e.target.value })}
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingRoom(null)}
              className="border-white/20 text-white/60"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={() => {
                if (!editingRoom) return;
                setSpaces(prev => prev.map(s =>
                  s.id === editingRoom.id ? { ...editingRoom } : s
                ));
                setHasChanges(true);
                setEditingRoom(null);
              }}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {isAr ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Feedback & RAG Dialog ───────────────────────────────────────── */}
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent className="bg-[#0d0d14] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-400" />
              {isAr ? "إضافة للتعلم الذاتي" : "Add to Self-Learning"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-white/60 mb-1 block">
                {isAr ? "ملاحظاتك على المخطط" : "Your notes on this blueprint"}
              </label>
              <Textarea
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder={isAr
                  ? "مثال: المطبخ يجب أن يكون أكبر، الصالة في الوسط أفضل..."
                  : "e.g., Kitchen should be larger, living room better in center..."}
                className="bg-white/5 border-white/20 text-white min-h-[80px]"
                dir={isAr ? "rtl" : "ltr"}
              />
            </div>

            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addToRAG}
                  onChange={e => setAddToRAG(e.target.checked)}
                  className="w-4 h-4 accent-purple-500"
                />
                <div>
                  <p className="text-sm font-medium text-purple-300">
                    {isAr ? "إضافة هذا المخطط لقاعدة التعلم" : "Add blueprint to learning base"}
                  </p>
                  <p className="text-xs text-purple-400/70">
                    {isAr
                      ? "سيستخدم النظام هذا المخطط كمرجع لتحسين المخططات المستقبلية"
                      : "System will use this as reference to improve future blueprints"}
                  </p>
                </div>
              </label>
            </div>

            {addToRAG && (
              <div>
                <label className="text-xs text-white/60 mb-1 block">
                  {isAr ? "تسمية المخطط المرجعي (اختياري)" : "Reference label (optional)"}
                </label>
                <Input
                  value={ragLabel}
                  onChange={e => setRagLabel(e.target.value)}
                  placeholder={isAr ? "مثال: فيلا 300م² - حي الريان" : "e.g., Villa 300m² - Al Rayan"}
                  className="bg-white/5 border-white/20 text-white"
                  dir={isAr ? "rtl" : "ltr"}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowFeedbackDialog(false)}
              className="border-white/20 text-white/60"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={handleSubmitFeedback}
              disabled={submitFeedbackMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {submitFeedbackMutation.isPending
                ? (isAr ? "جاري الإرسال..." : "Submitting...")
                : (isAr ? "إرسال وحفظ" : "Submit & Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
