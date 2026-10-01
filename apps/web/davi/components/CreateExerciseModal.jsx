'use client';

import React, { useRef, useState } from "react";
import { X, Link as LinkIcon, Upload, Save, Sparkles, ImageIcon } from "lucide-react";
import ExerciseGif from "@/davi/components/ExerciseGif";

/**
 * CreateExerciseModal — lets the Personal add a brand-new exercise to the library.
 * A movement demo is optional and can be supplied by URL or local upload.
 */
export const CreateExerciseModal = ({ onCancel, onCreate }) => {
  const [source, setSource] = useState("url");
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
  const canSave = Boolean(name.trim() && muscle.trim() && equipment.trim());

  const clearDemo = () => {
    setGifUrl("");
    setDataUrl("");
    setFileName("");
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFile = (file) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      setError("Selecione um GIF, WebP ou arquivo de imagem válido.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Arquivo muito grande (máx 8 MB).");
      return;
    }

    setError("");
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => setDataUrl(event.target?.result || "");
    reader.readAsDataURL(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    handleFile(event.dataTransfer.files?.[0]);
  };

  const handleSubmit = () => {
    if (!canSave) return;

    onCreate({
      id: `custom-${Date.now().toString(36)}`,
      name: name.trim(),
      muscle: muscle.trim(),
      equipment: equipment.trim(),
      gif: previewSrc || "",
      custom: true,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      data-testid="create-exercise-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-exercise-title"
    >
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ background: "rgba(10,10,10,0.75)" }}
        onClick={onCancel}
      />
      <div
        className="relative w-full max-w-xl rounded-3xl flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200"
        style={{
          background: "var(--shapeos-surface)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 30px 70px rgba(0,0,0,0.6)",
          maxHeight: "90vh",
        }}
      >
        <div
          className="flex items-start gap-3 p-6"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "rgba(34,199,199,0.1)",
              border: "1px solid rgba(34,199,199,0.35)",
            }}
          >
            <Sparkles className="w-5 h-5 text-[#22C7C7]" />
          </div>
          <div className="flex-1">
            <h3
              id="create-exercise-title"
              className="text-xl text-[#edf2f3] leading-tight"
              style={{
                fontFamily: "'Unbounded', sans-serif",
                fontWeight: 600,
                letterSpacing: "-0.01em",
              }}
            >
              Novo exercício
            </h3>
            <p
              className="text-xs text-muted-foreground mt-1"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Cadastre o exercício e, se quiser, adicione um GIF demonstrando a execução.
            </p>
          </div>
          <button
            onClick={onCancel}
            data-testid="create-close-button"
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/5 text-muted-foreground"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5" style={{ fontFamily: "'Sora', sans-serif" }}>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Nome do exercício</label>
              <input
                data-testid="create-name-input"
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="ex: Supino Reto na Máquina"
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl text-sm text-[#edf2f3] placeholder:text-muted-foreground outline-none focus:border-[#22C7C7]/60 focus:ring-2 focus:ring-[#22C7C7]/20"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Grupo muscular</label>
                <input
                  data-testid="create-muscle-input"
                  value={muscle}
                  onChange={(event) => setMuscle(event.target.value)}
                  placeholder="ex: Peitoral"
                  className="mt-1.5 w-full px-3 py-2.5 rounded-xl text-sm text-[#edf2f3] placeholder:text-muted-foreground outline-none focus:border-[#22C7C7]/60 focus:ring-2 focus:ring-[#22C7C7]/20"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Equipamento</label>
                <input
                  data-testid="create-equipment-input"
                  value={equipment}
                  onChange={(event) => setEquipment(event.target.value)}
                  placeholder="ex: Máquina"
                  className="mt-1.5 w-full px-3 py-2.5 rounded-xl text-sm text-[#edf2f3] placeholder:text-muted-foreground outline-none focus:border-[#22C7C7]/60 focus:ring-2 focus:ring-[#22C7C7]/20"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                />
              </div>
            </div>
          </div>

          <div
            className="rounded-2xl p-4"
            style={{ background: "rgba(34,199,199,0.025)", border: "1px solid rgba(34,199,199,0.14)" }}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#edf2f3]">Demonstração em GIF</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[9px] uppercase tracking-widest text-[#22C7C7]"
                    style={{ background: "rgba(34,199,199,0.08)", border: "1px solid rgba(34,199,199,0.2)" }}
                  >
                    Opcional
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Use uma URL direta ou envie um GIF/WebP do seu dispositivo.
                </p>
              </div>
              {previewSrc && (
                <button
                  type="button"
                  onClick={clearDemo}
                  className="text-[11px] text-muted-foreground transition-colors hover:text-red-300"
                >
                  Remover mídia
                </button>
              )}
            </div>

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
                  source === "url" ? "text-[#121719]" : "text-muted-foreground hover:text-[#edf2f3]"
                }`}
                style={{ background: source === "url" ? "#22C7C7" : "transparent" }}
              >
                <LinkIcon className="w-3.5 h-3.5" /> URL do GIF
              </button>
              <button
                type="button"
                data-testid="source-tab-upload"
                onClick={() => setSource("upload")}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${
                  source === "upload" ? "text-[#121719]" : "text-muted-foreground hover:text-[#edf2f3]"
                }`}
                style={{ background: source === "upload" ? "#22C7C7" : "transparent" }}
              >
                <Upload className="w-3.5 h-3.5" /> Enviar GIF
              </button>
            </div>

            <div className="mt-3">
              {source === "url" ? (
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-muted-foreground">URL direta do GIF</label>
                  <div className="mt-1.5 relative">
                    <LinkIcon className="w-3.5 h-3.5 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      data-testid="create-url-input"
                      value={gifUrl}
                      onChange={(event) => {
                        setGifUrl(event.target.value);
                        setError("");
                      }}
                      placeholder="https://exemplo.com/exercicio.gif"
                      inputMode="url"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-[#edf2f3] placeholder:text-muted-foreground outline-none focus:border-[#22C7C7]/60 focus:ring-2 focus:ring-[#22C7C7]/20"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Prefira um link direto terminado em .gif ou .webp e use mídia que você tenha direito de utilizar.
                  </p>
                </div>
              ) : (
                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="create-dropzone"
                  className="rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all"
                  style={{
                    background: dragOver ? "rgba(34,199,199,0.08)" : "rgba(255,255,255,0.03)",
                    border: `1.5px dashed ${dragOver ? "rgba(34,199,199,0.6)" : "rgba(255,255,255,0.12)"}`,
                  }}
                >
                  <input
                    ref={fileInputRef}
                    data-testid="create-file-input"
                    type="file"
                    accept="image/gif,image/webp,image/*"
                    className="hidden"
                    onChange={(event) => handleFile(event.target.files?.[0])}
                  />
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(34,199,199,0.1)", border: "1px solid rgba(34,199,199,0.25)" }}
                  >
                    <Upload className="w-5 h-5 text-[#22C7C7]" />
                  </div>
                  <div className="mt-3 text-sm text-[#edf2f3]">
                    {fileName ? (
                      <>
                        Arquivo pronto: <span className="text-[#22C7C7]">{fileName}</span>
                      </>
                    ) : (
                      <>
                        Arraste um <span className="text-[#22C7C7]">GIF</span> aqui ou clique para escolher
                      </>
                    )}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">GIF · WebP · imagem · até 8 MB</div>
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
                  color: "#f18d8d",
                }}
              >
                {error}
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Pré-visualização</label>
            <div
              className="mt-2 flex items-center gap-4 p-3 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              {previewSrc ? (
                <ExerciseGif src={previewSrc} alt={name || "Exercício"} size={96} />
              ) : (
                <div
                  className="w-24 h-24 rounded-xl flex flex-col items-center justify-center flex-shrink-0 gap-1.5"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px dashed rgba(255,255,255,0.1)",
                  }}
                >
                  <ImageIcon className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />
                  <span className="text-[9px] uppercase tracking-widest text-muted-foreground">Sem GIF</span>
                </div>
              )}
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {muscle || "Grupo muscular"} · {equipment || "Equipamento"}
                </div>
                <div
                  className="text-sm text-[#edf2f3] mt-1 truncate"
                  style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
                >
                  {name || "Nome do exercício"}
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {previewSrc ? "A demonstração será exibida na ficha." : "Você pode criar agora e adicionar uma demonstração depois."}
                </p>
              </div>
            </div>
          </div>
        </div>

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
            className="flex-1 py-3 rounded-xl text-sm text-[#edf2f3] transition-all hover:bg-white/5"
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
            className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-[#121719] transition-all hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{
              background: "#22C7C7",
              boxShadow: canSave
                ? "0 10px 24px rgba(34,199,199,0.35), inset 0 -3px 0 rgba(0,0,0,0.12)"
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
