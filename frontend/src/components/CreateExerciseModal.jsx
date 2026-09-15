import React, { useRef, useState } from "react";
import { X, Link as LinkIcon, Upload, Save, Sparkles, ImageIcon } from "lucide-react";
import ExerciseGif from "@/components/ExerciseGif";

/**
 * CreateExerciseModal — lets the Personal add a brand-new exercise to the library.
 * The GIF/image source can be pasted as a URL from the internet OR uploaded from the
 * device (converted to a data-URL and used as the image src).
 */
export const CreateExerciseModal = ({ onCancel, onCreate }) => {
  const [source, setSource] = useState("url"); // "url" | "upload"
  const [name, setName] = useState("");
  const [muscle, setMuscle] = useState("");
  const [equipment, setEquipment] = useState("");
  const [gifUrl, setGifUrl] = useState("");
  const [dataUrl, setDataUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const previewSrc = source === "url" ? gifUrl.trim() : dataUrl;
  const canSave = name.trim() && muscle.trim() && equipment.trim() && previewSrc;

  const handleFile = (file) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      setError("Selecione um arquivo de imagem ou GIF válido.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Arquivo muito grande (máx 8 MB).");
      return;
    }
    setError("");
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => setDataUrl(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const handleSubmit = () => {
    if (!canSave) return;
    onCreate({
      id: `custom-${Date.now().toString(36)}`,
      name: name.trim(),
      muscle: muscle.trim(),
      equipment: equipment.trim(),
      gif: previewSrc,
      custom: true,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      data-testid="create-exercise-modal"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ background: "rgba(10,10,10,0.75)" }}
        onClick={onCancel}
      />
      <div
        className="relative w-full max-w-xl rounded-3xl flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200"
        style={{
          background: "linear-gradient(160deg, rgba(30,30,30,0.98), rgba(18,18,18,0.98))",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 30px 70px rgba(0,0,0,0.6)",
          maxHeight: "90vh",
        }}
      >
        {/* Header */}
        <div
          className="flex items-start gap-3 p-6"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "rgba(0,210,210,0.1)",
              border: "1px solid rgba(0,210,210,0.35)",
            }}
          >
            <Sparkles className="w-5 h-5 text-[#00D2D2]" />
          </div>
          <div className="flex-1">
            <h3
              className="text-xl text-[#F5F5F5] leading-tight"
              style={{
                fontFamily: "'Unbounded', sans-serif",
                fontWeight: 600,
                letterSpacing: "-0.01em",
              }}
            >
              Novo exercício
            </h3>
            <p
              className="text-xs text-zinc-500 mt-1"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Cole uma URL de GIF da internet ou envie um arquivo do seu computador.
            </p>
          </div>
          <button
            onClick={onCancel}
            data-testid="create-close-button"
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/5 text-zinc-400"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5" style={{ fontFamily: "'Sora', sans-serif" }}>
          {/* Basic info */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-zinc-500">Nome do exercício</label>
              <input
                data-testid="create-name-input"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: Supino Reto na Máquina"
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl text-sm text-[#F5F5F5] placeholder:text-zinc-600 outline-none focus:border-[#00D2D2]/60 focus:ring-2 focus:ring-[#00D2D2]/20"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-zinc-500">Grupo muscular</label>
                <input
                  data-testid="create-muscle-input"
                  value={muscle}
                  onChange={(e) => setMuscle(e.target.value)}
                  placeholder="ex: Peitoral"
                  className="mt-1.5 w-full px-3 py-2.5 rounded-xl text-sm text-[#F5F5F5] placeholder:text-zinc-600 outline-none focus:border-[#00D2D2]/60 focus:ring-2 focus:ring-[#00D2D2]/20"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-zinc-500">Equipamento</label>
                <input
                  data-testid="create-equipment-input"
                  value={equipment}
                  onChange={(e) => setEquipment(e.target.value)}
                  placeholder="ex: Máquina"
                  className="mt-1.5 w-full px-3 py-2.5 rounded-xl text-sm text-[#F5F5F5] placeholder:text-zinc-600 outline-none focus:border-[#00D2D2]/60 focus:ring-2 focus:ring-[#00D2D2]/20"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                />
              </div>
            </div>
          </div>

          {/* Source tabs */}
          <div>
            <div
              className="grid grid-cols-2 gap-1 p-1 rounded-xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
              data-testid="create-source-tabs"
            >
              <button
                type="button"
                data-testid="source-tab-url"
                onClick={() => setSource("url")}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${
                  source === "url" ? "text-[#1A1A1A]" : "text-zinc-400 hover:text-[#F5F5F5]"
                }`}
                style={{
                  background: source === "url" ? "#00D2D2" : "transparent",
                }}
              >
                <LinkIcon className="w-3.5 h-3.5" /> Colar URL
              </button>
              <button
                type="button"
                data-testid="source-tab-upload"
                onClick={() => setSource("upload")}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${
                  source === "upload" ? "text-[#1A1A1A]" : "text-zinc-400 hover:text-[#F5F5F5]"
                }`}
                style={{
                  background: source === "upload" ? "#00D2D2" : "transparent",
                }}
              >
                <Upload className="w-3.5 h-3.5" /> Enviar arquivo
              </button>
            </div>

            <div className="mt-3">
              {source === "url" ? (
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500">
                    URL do GIF / imagem
                  </label>
                  <div className="mt-1.5 relative">
                    <LinkIcon className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      data-testid="create-url-input"
                      value={gifUrl}
                      onChange={(e) => setGifUrl(e.target.value)}
                      placeholder="https://... .gif"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-[#F5F5F5] placeholder:text-zinc-600 outline-none focus:border-[#00D2D2]/60 focus:ring-2 focus:ring-[#00D2D2]/20"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-zinc-500">
                    Dica: procure no Google Imagens por &quot;{name || "exercício"} gif&quot;, clique com o botão direito e copie o endereço da imagem.
                  </p>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="create-dropzone"
                  className="rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all"
                  style={{
                    background: dragOver ? "rgba(0,210,210,0.08)" : "rgba(255,255,255,0.03)",
                    border: `1.5px dashed ${dragOver ? "rgba(0,210,210,0.6)" : "rgba(255,255,255,0.12)"}`,
                  }}
                >
                  <input
                    ref={fileInputRef}
                    data-testid="create-file-input"
                    type="file"
                    accept="image/*,image/gif"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(0,210,210,0.1)", border: "1px solid rgba(0,210,210,0.25)" }}
                  >
                    <Upload className="w-5 h-5 text-[#00D2D2]" />
                  </div>
                  <div className="mt-3 text-sm text-[#F5F5F5]">
                    {fileName ? (
                      <>
                        Arquivo pronto: <span className="text-[#00D2D2]">{fileName}</span>
                      </>
                    ) : (
                      <>
                        Arraste um <span className="text-[#00D2D2]">GIF</span> ou imagem aqui — ou clique para escolher
                      </>
                    )}
                  </div>
                  <div className="mt-1 text-[11px] text-zinc-500">.gif · .jpg · .png · até 8 MB</div>
                </div>
              )}
            </div>

            {error && (
              <div
                data-testid="create-error"
                className="mt-2 text-xs px-3 py-2 rounded-lg"
                style={{
                  background: "rgba(255,80,80,0.08)",
                  border: "1px solid rgba(255,80,80,0.3)",
                  color: "#ff8a8a",
                }}
              >
                {error}
              </div>
            )}
          </div>

          {/* Preview */}
          <div>
            <label className="text-[10px] uppercase tracking-widest text-zinc-500">Pré-visualização</label>
            <div
              className="mt-2 flex items-center gap-4 p-3 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              {previewSrc ? (
                <ExerciseGif src={previewSrc} alt={name || "Exercício"} size={96} />
              ) : (
                <div
                  className="w-24 h-24 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px dashed rgba(255,255,255,0.1)",
                  }}
                >
                  <ImageIcon className="w-6 h-6 text-zinc-600" strokeWidth={1.5} />
                </div>
              )}
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500">
                  {muscle || "Grupo muscular"} · {equipment || "Equipamento"}
                </div>
                <div
                  className="text-sm text-[#F5F5F5] mt-1 truncate"
                  style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
                >
                  {name || "Nome do exercício"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex gap-3 p-6"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            fontFamily: "'Sora', sans-serif",
          }}
        >
          <button
            data-testid="create-cancel-button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl text-sm text-[#F5F5F5] transition-all hover:bg-white/5"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            Cancelar
          </button>
          <button
            data-testid="create-save-button"
            onClick={handleSubmit}
            disabled={!canSave}
            className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-[#1A1A1A] transition-all hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{
              background: "#00D2D2",
              boxShadow: canSave
                ? "0 10px 24px rgba(0,210,210,0.35), inset 0 -3px 0 rgba(0,0,0,0.12)"
                : "none",
            }}
          >
            <Save className="w-4 h-4" /> Criar exercício
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateExerciseModal;
