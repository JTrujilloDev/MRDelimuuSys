import { FormEvent, useMemo, useRef, useState } from "react";
import { Modal } from "@heroui/react";
import {
  Camera,
  Expand,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  VideoOff,
  X,
} from "lucide-react";

type SecurityCamera = {
  id: string;
  name: string;
  location: string;
  playbackUrl: string;
};

type CameraDraft = Omit<SecurityCamera, "id">;

const STORAGE_KEY = "delimuu.security-cameras.v1";
const EMPTY_DRAFT: CameraDraft = { name: "", location: "", playbackUrl: "" };

const readStoredCameras = (): SecurityCamera[] => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (camera): camera is SecurityCamera =>
        typeof camera === "object" &&
        camera !== null &&
        typeof camera.id === "string" &&
        typeof camera.name === "string" &&
        typeof camera.location === "string" &&
        typeof camera.playbackUrl === "string",
    );
  } catch {
    return [];
  }
};

const normalizePlaybackUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `http://${trimmed}`;
};

const SecurityCameraCard = ({
  camera,
  onEdit,
  onDelete,
}: {
  camera: SecurityCamera;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [streamKey, setStreamKey] = useState(0);

  const enterFullscreen = async () => {
    try {
      await containerRef.current?.requestFullscreen();
    } catch {
      // Fullscreen can be blocked by browser or device policy.
    }
  };

  return (
    <article
      ref={containerRef}
      className="group flex min-h-0 flex-col overflow-hidden rounded-[26px] border border-border bg-pos-surface shadow-sm"
    >
      <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-neutral-950">
        <iframe
          key={streamKey}
          src={camera.playbackUrl}
          title={`Transmisión de ${camera.name}`}
          className="absolute inset-0 h-full w-full border-0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="no-referrer"
        />

        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/65 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          MONITOREO
        </div>

        <div className="absolute right-3 top-3 flex gap-2 opacity-100 transition md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <button
            type="button"
            onClick={() => setStreamKey((current) => current + 1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/65 text-white backdrop-blur-sm transition hover:bg-black/85"
            aria-label={`Recargar ${camera.name}`}
            title="Recargar transmisión"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={enterFullscreen}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/65 text-white backdrop-blur-sm transition hover:bg-black/85"
            aria-label={`Ver ${camera.name} en pantalla completa`}
            title="Pantalla completa"
          >
            <Expand className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 px-5 py-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Camera className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-black text-foreground">{camera.name}</h2>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {camera.location || "Ubicación sin especificar"}
          </p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          aria-label={`Editar ${camera.name}`}
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
          aria-label={`Eliminar ${camera.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
};

const SecurityCameras = () => {
  const [cameras, setCameras] = useState<SecurityCamera[]>(readStoredCameras);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CameraDraft>(EMPTY_DRAFT);
  const [formError, setFormError] = useState("");

  const sortedCameras = useMemo(
    () => [...cameras].sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" })),
    [cameras],
  );

  const persistCameras = (nextCameras: SecurityCamera[]) => {
    setCameras(nextCameras);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextCameras));
  };

  const openCreate = () => {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setFormError("");
    setIsEditorOpen(true);
  };

  const openEdit = (camera: SecurityCamera) => {
    setEditingId(camera.id);
    setDraft({ name: camera.name, location: camera.location, playbackUrl: camera.playbackUrl });
    setFormError("");
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setFormError("");
  };

  const saveCamera = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = draft.name.trim();
    const playbackUrl = normalizePlaybackUrl(draft.playbackUrl);

    if (!name || !playbackUrl) {
      setFormError("El nombre y la URL de reproducción son obligatorios.");
      return;
    }

    try {
      const parsedUrl = new URL(playbackUrl);
      if (!/^https?:$/.test(parsedUrl.protocol)) throw new Error();
    } catch {
      setFormError("Ingresa una URL HTTP o HTTPS válida entregada por el gateway.");
      return;
    }

    const normalizedDraft = {
      name,
      location: draft.location.trim(),
      playbackUrl,
    };

    if (editingId) {
      persistCameras(
        cameras.map((camera) =>
          camera.id === editingId ? { ...camera, ...normalizedDraft } : camera,
        ),
      );
    } else {
      persistCameras([
        ...cameras,
        { id: crypto.randomUUID(), ...normalizedDraft },
      ]);
    }

    closeEditor();
  };

  const deleteCamera = (camera: SecurityCamera) => {
    if (!window.confirm(`¿Eliminar la cámara “${camera.name}” de esta vista?`)) return;
    persistCameras(cameras.filter((item) => item.id !== camera.id));
  };

  return (
    <main className="flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <header className="shrink-0 border-b border-border bg-pos-surface/90 px-5 py-4 backdrop-blur-sm lg:px-8">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-primary">
              <ShieldCheck className="h-4 w-4" />
              Seguridad local
            </div>
            <h1 className="text-2xl font-black tracking-tight lg:text-3xl">Cámaras de seguridad</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Supervisa las áreas del negocio desde una sola pantalla.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="flex h-11 items-center gap-2 rounded-2xl bg-primary px-5 text-sm font-black text-primary-foreground shadow-sm transition hover:brightness-105"
          >
            <Plus className="h-5 w-5" />
            Agregar cámara
          </button>
        </div>
      </header>

      <section className="min-h-0 flex-1 overflow-y-auto p-5 lg:p-8">
        <div className="mx-auto max-w-[1800px]">
          {sortedCameras.length === 0 ? (
            <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-[32px] border border-dashed border-border bg-pos-surface/60 px-6 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-secondary text-muted-foreground">
                <VideoOff className="h-9 w-9" />
              </div>
              <h2 className="mt-6 text-xl font-black">Aún no hay cámaras configuradas</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Agrega la URL web de cada transmisión. Para cámaras RTSP necesitas un gateway local,
                como MediaMTX, que entregue una página WebRTC reproducible en el navegador.
              </p>
              <button
                type="button"
                onClick={openCreate}
                className="mt-6 flex h-11 items-center gap-2 rounded-2xl bg-primary px-5 text-sm font-black text-primary-foreground"
              >
                <Plus className="h-5 w-5" />
                Configurar primera cámara
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              {sortedCameras.map((camera) => (
                <SecurityCameraCard
                  key={camera.id}
                  camera={camera}
                  onEdit={() => openEdit(camera)}
                  onDelete={() => deleteCamera(camera)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <Modal>
        <Modal.Backdrop isOpen={isEditorOpen}>
          <Modal.Container placement="center" size="lg">
            <Modal.Dialog className="overflow-hidden rounded-[28px] border border-border bg-pos-surface text-foreground shadow-2xl">
              <Modal.CloseTrigger onClick={closeEditor} />
              <Modal.Header className="border-b border-border px-6 py-5">
                <div>
                  <Modal.Heading className="text-xl font-black">
                    {editingId ? "Editar cámara" : "Agregar cámara"}
                  </Modal.Heading>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Usa la URL HTTP del reproductor WebRTC de tu gateway local.
                  </p>
                </div>
              </Modal.Header>

              <form onSubmit={saveCamera}>
                <Modal.Body className="space-y-5 px-6 py-5">
                  <label className="block space-y-2 text-foreground">
                    <span className="text-sm font-black text-foreground">Nombre de la cámara</span>
                    <input
                      value={draft.name}
                      onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Ej. Entrada principal"
                      autoFocus
                      className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition placeholder:text-foreground/55 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </label>

                  <label className="block space-y-2 text-foreground">
                    <span className="text-sm font-black text-foreground">Ubicación</span>
                    <input
                      value={draft.location}
                      onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))}
                      placeholder="Ej. Salón, caja o bodega"
                      className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition placeholder:text-foreground/55 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </label>

                  <label className="block space-y-2 text-foreground">
                    <span className="text-sm font-black text-foreground">URL web de reproducción</span>
                    <input
                      value={draft.playbackUrl}
                      onChange={(event) => setDraft((current) => ({ ...current, playbackUrl: event.target.value }))}
                      placeholder="http://192.168.1.20:8889/entrada"
                      inputMode="url"
                      className="h-12 w-full rounded-2xl border border-border bg-background px-4 font-mono text-sm text-foreground outline-none transition placeholder:text-foreground/55 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <span className="block text-xs font-medium leading-5 text-foreground/70">
                      No pegues aquí la dirección RTSP ni sus credenciales. Usa el enlace WebRTC/HTTP
                      generado por MediaMTX, go2rtc, Frigate u otro gateway.
                    </span>
                  </label>

                  {formError && (
                    <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
                      {formError}
                    </div>
                  )}
                </Modal.Body>

                <Modal.Footer className="flex justify-end gap-3 border-t border-border bg-secondary/20 px-6 py-4">
                  <button
                    type="button"
                    onClick={closeEditor}
                    className="flex h-11 items-center gap-2 rounded-2xl border border-border bg-pos-surface px-5 text-sm font-bold transition hover:bg-secondary"
                  >
                    <X className="h-4 w-4" />
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex h-11 items-center gap-2 rounded-2xl bg-primary px-5 text-sm font-black text-primary-foreground transition hover:brightness-105"
                  >
                    <Camera className="h-4 w-4" />
                    {editingId ? "Guardar cambios" : "Agregar cámara"}
                  </button>
                </Modal.Footer>
              </form>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </main>
  );
};

export default SecurityCameras;
