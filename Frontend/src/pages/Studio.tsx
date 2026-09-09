import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  FolderHeart,
  ImagePlus,
  Layers,
  MessageCircle,
  Monitor,
  MousePointer2,
  Plus,
  Redo2,
  RotateCcw,
  ShieldCheck,
  Smile,
  Crop,
  Sticker,
  Smartphone,
  Tablet,
  Trash2,
  Type,
  Undo2,
  WandSparkles,
  X,
} from "lucide-react";
import JSZip from "jszip";
import {
  defaults,
  download,
  encodeWebp,
  encodeAnimatedWebp,
  loadImage,
  removeImageBackground,
  renderSticker,
  type Settings,
} from "../sticker";
import { useSession } from "../context/Session";
import AccountBanner from "../components/AccountBanner";
import ImageCropper from "../components/ImageCropper";

const emojiOptions = [
  "😎",
  "😂",
  "🥹",
  "😍",
  "🥳",
  "😭",
  "🤩",
  "🤔",
  "🫶",
  "🔥",
  "💜",
  "✌️",
  "😴",
  "🤯",
  "🙌",
  "🎉",
  "🥰",
  "😋",
  "🤗",
  "😇",
  "😡",
  "🤪",
  "😱",
  "💯",
  "⭐",
  "🌈",
  "👋",
  "👍",
  "🙏",
  "💔",
  "💖",
  "🍀",
  "🎈",
  "🎁",
  "🎂",
  "🚀",
  "🌟",
  "☀️",
  "🌻",
  "🐶",
  "🐱",
  "🦄",
  "🍕",
  "🍩",
  "☕",
  "🎸",
  "🎮",
  "🏆",
];
const studioDraftKey = "sticker-studio-draft";
const studioImageDb = "sticker-studio-images";
const studioImageStore = "draft";

function readStudioDraft() {
  try {
    const value = localStorage.getItem(studioDraftKey);
    if (!value) return {};
    const draft = JSON.parse(value) as Partial<Settings> & {
      previewDevice?: "desktop" | "tablet" | "smartphone";
      preview?: boolean;
      tab?: string;
      videoStart?: number;
      videoEnd?: number;
    };
    return draft;
  } catch {
    return {};
  }
}

function openStudioImageDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(studioImageDb, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(studioImageStore);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function imageToDataUrl(image: HTMLImageElement) {
  const imageCanvas = document.createElement("canvas");
  imageCanvas.width = image.width;
  imageCanvas.height = image.height;
  imageCanvas.getContext("2d")!.drawImage(image, 0, 0);
  return imageCanvas.toDataURL("image/png");
}

async function saveStudioImages(
  photo: HTMLImageElement | null,
  original: HTMLImageElement | null,
  video: File | null,
) {
  const database = await openStudioImageDb();
  const transaction = database.transaction(studioImageStore, "readwrite");
  if (photo) {
    transaction
      .objectStore(studioImageStore)
      .put(imageToDataUrl(photo), "photo");
    transaction
      .objectStore(studioImageStore)
      .put(
        original ? imageToDataUrl(original) : imageToDataUrl(photo),
        "original",
      );
  } else {
    transaction.objectStore(studioImageStore).delete("photo");
    transaction.objectStore(studioImageStore).delete("original");
  }
  if (video) {
    transaction
      .objectStore(studioImageStore)
      .put(video.slice(0, video.size, video.type), "video");
  } else {
    transaction.objectStore(studioImageStore).delete("video");
  }
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

async function readStudioImages() {
  const database = await openStudioImageDb();
  const transaction = database.transaction(studioImageStore, "readonly");
  const store = transaction.objectStore(studioImageStore);
  const read = (key: string) =>
    new Promise<unknown>((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  const images = {
    photo: await read("photo"),
    original: await read("original"),
    video: await read("video"),
  };
  database.close();
  return images;
}

export default function Studio() {
  const {
    user,
    saved,
    packName: storedPackName,
    libraryLoading,
    libraryError,
    reloadLibrary,
    addSticker: saveSticker,
    deleteSticker,
    renamePack,
    packs,
    activePackId,
    selectPack,
    createPack,
  } = useSession();
  const storedDraft = readStudioDraft();
  const initialSettings: Settings = { ...defaults, ...storedDraft };
  const [s, setS] = useState<Settings>(initialSettings);
  const [, refreshHistory] = useState(0);
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
    const [animatedSticker, setAnimatedSticker] = useState<string | null>(null);
    const [animatedPreview, setAnimatedPreview] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoStart, setVideoStart] = useState(0);
  const [videoEnd, setVideoEnd] = useState(0);
  const [videoProgress, setVideoProgress] = useState(0);
  const original = useRef<HTMLImageElement | null>(null);
  type HistoryEntry = {
    settings: Settings;
    photo: HTMLImageElement | null;
    original: HTMLImageElement | null;
  };
  const settingsHistory = useRef<HistoryEntry[]>([
    { settings: initialSettings, photo: null, original: null },
  ]);
  const settingsHistoryIndex = useRef(0);
  const [tab, setTab] = useState(storedDraft.tab || "image");
  const [emojiPage, setEmojiPage] = useState(0);
  const [preview, setPreview] = useState(storedDraft.preview || false);
  const [previewDevice, setPreviewDevice] = useState<
    "desktop" | "tablet" | "smartphone"
  >(storedDraft.previewDevice || "desktop");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [help, setHelp] = useState(false);
  const [cropping, setCropping] = useState(false);
  const [packName, setPackName] = useState(storedPackName);
  const [createPackOpen, setCreatePackOpen] = useState(false);
  const [newPackName, setNewPackName] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const restoredImages = useRef(false);
  useEffect(() => setPackName(storedPackName), [storedPackName]);
  useEffect(() => {
    void readStudioImages()
      .then(async (images) => {
        if (images.video instanceof Blob) {
          const file = new File([images.video], "sticker-video", {
            type: images.video.type || "video/mp4",
          });
          const url = URL.createObjectURL(file);
          setVideoFile(file);
          setAnimatedPreview(url);
          const video = document.createElement("video");
          video.preload = "metadata";
          video.onloadedmetadata = () => {
            const duration = video.duration;
            setVideoDuration(duration);
            setVideoStart(
              Math.min(storedDraft.videoStart || 0, Math.max(0, duration - 1)),
            );
            setVideoEnd(
              Math.min(
                storedDraft.videoEnd || Math.min(10, duration),
                duration,
              ),
            );
          };
          video.src = url;
        }
        if (typeof images.photo !== "string") return;
        const originalData =
          typeof images.original === "string" ? images.original : images.photo;
        const [photoImage, originalImage] = await Promise.all([
          loadImage(images.photo),
          loadImage(originalData),
        ]);
        original.current = originalImage;
        restoredImages.current = true;
        setPhoto(photoImage);
      })
      .catch(() => {
        restoredImages.current = true;
      })
      .finally(() => setDraftReady(true));
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(
        studioDraftKey,
        JSON.stringify({ ...s, tab, preview, previewDevice, videoStart, videoEnd }),
      );
    } catch {
      setNotice(
        "Les réglages ne peuvent pas être sauvegardés dans ce navigateur.",
      );
    }
  }, [s, tab, preview, previewDevice, videoStart, videoEnd]);
  useEffect(() => {
    if (!restoredImages.current && !photo && !videoFile) return;
    void saveStudioImages(photo, original.current, videoFile).catch(() => {
      setNotice("L’image ne peut pas être sauvegardée dans ce navigateur.");
    });
  }, [photo, videoFile]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const pack = useRef<HTMLElement>(null);
  const sourceVideo = useRef<HTMLVideoElement>(null);
  const historyGesture = useRef<{ key: keyof Settings; recorded: boolean } | null>(null);
  function beginGesture(key: keyof Settings) {
    if (historyGesture.current?.key !== key) historyGesture.current = { key, recorded: false };
  }
  function endGesture() {
    historyGesture.current = null;
  }
  useEffect(() => {
    const releasePointer = () => {
      // Text and color edits form a session until focus leaves the field.
      if (historyGesture.current?.key !== "text" && historyGesture.current?.key !== "color") endGesture();
    };
    window.addEventListener("pointerup", releasePointer);
    window.addEventListener("pointercancel", releasePointer);
    window.addEventListener("blur", endGesture);
    return () => {
      window.removeEventListener("pointerup", releasePointer);
      window.removeEventListener("pointercancel", releasePointer);
      window.removeEventListener("blur", endGesture);
    };
  }, []);
  function commitSettings(
    next: Settings,
    nextPhoto: HTMLImageElement | null = photo,
    nextOriginal: HTMLImageElement | null = original.current,
    gestureKey?: keyof Settings,
  ) {
    if (gestureKey !== historyGesture.current?.key) endGesture();
    const gesture = historyGesture.current;
    const replace = gesture?.recorded === true;
    const nextHistory = settingsHistory.current.slice(
      0,
      settingsHistoryIndex.current + (replace ? 0 : 1),
    );
    if (!replace) nextHistory[nextHistory.length - 1] = { settings: s, photo, original: original.current };
    nextHistory.push({
      settings: next,
      photo: nextPhoto,
      original: nextOriginal,
    });
    settingsHistory.current = nextHistory;
    settingsHistoryIndex.current = nextHistory.length - 1;
    if (gesture) gesture.recorded = true;
    setS(next);
    original.current = nextOriginal;
    setPhoto(nextPhoto);
    refreshHistory((value) => value + 1);
  }
  const update = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    s[key] !== value && commitSettings({ ...s, [key]: value }, photo, original.current, key);
  function undoSettings() {
    endGesture();
    if (settingsHistoryIndex.current === 0) return;
    settingsHistoryIndex.current -= 1;
    const entry = settingsHistory.current[settingsHistoryIndex.current];
    setS(entry.settings);
    original.current = entry.original;
    setPhoto(entry.photo);
    refreshHistory((value) => value + 1);
  }
  function redoSettings() {
    endGesture();
    if (settingsHistoryIndex.current >= settingsHistory.current.length - 1)
      return;
    settingsHistoryIndex.current += 1;
    const entry = settingsHistory.current[settingsHistoryIndex.current];
    setS(entry.settings);
    original.current = entry.original;
    setPhoto(entry.photo);
    refreshHistory((value) => value + 1);
  }
  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (busy || cropping || help || event.defaultPrevented || event.isComposing || event.altKey || !(event.ctrlKey || event.metaKey)) return;
      const target = event.target;
      if (target instanceof HTMLElement && (
        target.isContentEditable || target.closest("textarea, select") ||
        (target instanceof HTMLInputElement && !["range", "checkbox", "radio", "button"].includes(target.type))
      )) return;
      const key = event.key.toLowerCase();
      if (key === "z" || key === "y") {
        event.preventDefault();
        if (key === "y" || event.shiftKey) redoSettings();
        else undoSettings();
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [busy, cropping, help]);
  useEffect(() => {
    if (draftReady && canvas.current) renderSticker(canvas.current, photo, s);
  }, [draftReady, photo, preview, s]);
  useEffect(() => {
    const video = sourceVideo.current;
    if (!video || !videoFile || animatedSticker) return;
    const playSelection = () => {
      if (video.currentTime < videoStart || video.currentTime >= videoEnd)
        video.currentTime = videoStart;
      void video.play().catch(() => undefined);
    };
    const loopSelection = () => {
      if (video.currentTime >= videoEnd) {
        video.currentTime = videoStart;
        void video.play().catch(() => undefined);
      }
    };
    video.addEventListener("loadedmetadata", playSelection);
    video.addEventListener("timeupdate", loopSelection);
    playSelection();
    return () => {
      video.removeEventListener("loadedmetadata", playSelection);
      video.removeEventListener("timeupdate", loopSelection);
    };
  }, [animatedSticker, videoEnd, videoFile, videoStart]);
  useEffect(() => {
    if (!notice || busy) return;
    const t = setTimeout(() => setNotice(""), 6500);
    return () => clearTimeout(t);
  }, [notice, busy]);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  }
  async function importFile(file?: File) {
    if (!file) return;
    if (file.type.startsWith("video/")) {
      await run(async () => {
        if (file.size > 16 * 1024 * 1024)
          throw new Error("La vidéo doit faire moins de 16 Mo.");
        const duration = await new Promise<number>((resolve, reject) => {
          const source = URL.createObjectURL(file);
          const video = document.createElement("video");
          video.preload = "metadata";
          video.onloadedmetadata = () => {
            URL.revokeObjectURL(source);
            resolve(video.duration);
          };
          video.onerror = () => {
            URL.revokeObjectURL(source);
            reject(new Error("Impossible de lire cette vidéo."));
          };
          video.src = source;
        });
        if (!Number.isFinite(duration) || duration < 1)
          throw new Error("La vidéo doit durer au moins 1 seconde.");
        setVideoFile(file);
        setVideoDuration(duration);
        setVideoStart(0);
        setVideoEnd(Math.min(10, duration));
        if (animatedPreview) URL.revokeObjectURL(animatedPreview);
        setAnimatedPreview(URL.createObjectURL(file));
        setAnimatedSticker(null);
        setPhoto(null);
        original.current = null;
        setNotice("Vidéo chargée. Choisissez la séquence à transformer.");
      });
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setNotice("Choisissez une image PNG, JPG ou WebP.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setNotice("Votre image doit faire moins de 15 Mo.");
      return;
    }
    await run(async () => {
      const url = URL.createObjectURL(file);
      try {
        const image = await loadImage(url);
        if (image.width * image.height > 40000000)
          throw new Error(
            "Image trop grande : choisissez une image de moins de 40 mégapixels.",
          );
        commitSettings({ ...defaults, text: "", rotation: 0 }, image, image);
        setVideoFile(null);
        setVideoDuration(0);
        setAnimatedSticker(null);
        if (animatedPreview) URL.revokeObjectURL(animatedPreview);
        setAnimatedPreview(null);
        setTab("image");
        setNotice("Image importée. À vous de jouer !");
      } finally {
        URL.revokeObjectURL(url);
      }
    });
  }
  async function createAnimatedSticker() {
    if (!videoFile) return;
    await run(async () => {
      const duration = videoEnd - videoStart;
      if (duration < 1) throw new Error("Sélectionnez au moins 1 seconde de vidéo.");
      setVideoProgress(0);
      const blob = await encodeAnimatedWebp(
        videoFile,
        videoStart,
        duration,
        setVideoProgress,
        s.text,
        s.color,
      );
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      setAnimatedSticker(data);
      setVideoProgress(1);
      setNotice(
        s.text
          ? "Sticker animé avec texte prêt à être ajouté au pack."
          : "Sticker animé prêt à être ajouté au pack.",
      );
    });
  }
  async function addSticker() {
    await run(async () => {
      if (saved.length >= 6)
        throw new Error("Un pack peut contenir au maximum 6 stickers.");
      const blob = animatedSticker
        ? await (await fetch(animatedSticker)).blob()
        : await encodeWebp(canvas.current!);
      const data = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
      await saveSticker(data);
      setNotice(
        user
          ? "Sticker sauvegardé dans votre compte !"
          : "Sticker ajouté à votre pack sur ce navigateur !",
      );
    });
  }
  function openCreatePack() {
    setNewPackName(`Mon pack ${packs.length + 1}`);
    setCreatePackOpen(true);
  }
  async function submitCreatePack() {
    await run(async () => {
      await createPack(newPackName);
      setCreatePackOpen(false);
      setNotice("Nouveau pack créé.");
    });
  }
  function removeCurrentImage() {
    commitSettings({ ...defaults, text: "", rotation: 0 }, null, null);
    setAnimatedSticker(null);
    if (animatedPreview) URL.revokeObjectURL(animatedPreview);
    setAnimatedPreview(null);
    setNotice("Image supprimée. Vous pouvez en importer une nouvelle.");
  }
  function chooseEmoji(emoji: string) {
    if (animatedPreview) URL.revokeObjectURL(animatedPreview);
    setVideoFile(null);
    setVideoDuration(0);
    setAnimatedPreview(null);
    setAnimatedSticker(null);
    commitSettings({ ...s, emoji }, null, null);
    setNotice("Nouvel emoji sélectionné : la vidéo a été remplacée.");
  }
  async function exportPack() {
    await run(async () => {
      const zip = new JSZip();
      saved.forEach((item, i) =>
        zip.file(`sticker-${i + 1}.webp`, item.data.split(",")[1], {
          base64: true,
        }),
      );
      zip.file(
        "LISEZ-MOI.txt",
        `${packName}\n\nStickers statiques WebP, 512 × 512 pixels, moins de 100 Ko.\nImportez les fichiers dans une application de création de packs compatible avec votre téléphone.\nCe ZIP ne s’installe pas directement dans WhatsApp. Sticker Studio limite chaque pack à 6 stickers.\n`,
      );
      download(
        await zip.generateAsync({ type: "blob" }),
        `${packName.replace(/[^a-zA-Z0-9À-ÿ_-]/g, "-").slice(0, 60) || "stickers"}.zip`,
      );
      setNotice("Pack téléchargé. Les instructions sont dans le ZIP.");
    });
  }
  const range = (
    label: string,
    key: "zoom" | "rotation" | "outline" | "textSize" | "textZoom" | "textRotation" | "textX" | "textY" | "x" | "y",
    min: number,
    max: number,
    suffix = "",
  ) => (
    <label className="range-label">
      {label}
      <span>
        {s[key]}
        {suffix}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={s[key]}
        onPointerDown={() => beginGesture(key)}
        onKeyDown={(event) => {
          if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(event.key)) beginGesture(key);
        }}
        onKeyUp={endGesture}
        onBlur={endGesture}
        onChange={(e) => update(key, Number(e.target.value))}
      />
    </label>
  );
  return (
    <>
      <main>
        <section className="intro">
          <div>
            <div className="eyebrow">
              <span /> PETITES IMAGES. GRANDES ÉMOTIONS.
            </div>
            <h1>
              Vos idées méritent
              <br className="mobile-break" /> un <span>sticker.</span>
              <svg viewBox="0 0 32 36" aria-hidden="true">
                <path d="M4 18L22 5M13 26L30 23M3 9L7 1" />
              </svg>
            </h1>
            <p>
              Une photo, une touche de vous. Créez des stickers pour vos
              conversations.
            </p>
          </div>
          <div className="intro-art" aria-hidden="true">
            <span>✌️</span>
            <span>HEY !</span>
            <i>✦</i>
          </div>
        </section>
        <AccountBanner />
        {libraryError && (
          <div className="global-error" role="alert">
            {libraryError}{" "}
            <button onClick={() => void reloadLibrary()}>Réessayer</button>
          </div>
        )}
        <div className="workspace" id="atelier">
          <aside className="tools panel">
            <div className="panel-heading">
              <span className="step">1</span>
              <h2>À vous de créer</h2>
            </div>
            <div
              className="tabs"
              role="tablist"
              aria-label="Outils de création"
            >
              {[
                { id: "image", icon: ImagePlus, name: "Image" },
                { id: "text", icon: Type, name: "Texte" },
                { id: "emoji", icon: Smile, name: "Emojis" },
              ].map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={tab === t.id ? "selected" : ""}
                >
                  <t.icon size={19} />
                  {t.name}
                </button>
              ))}
            </div>
            <div className="tool-content">
              {tab === "image" && (
                <>
                  <h3>Tout commence par une image</h3>
                  <button
                    className="upload"
                    disabled={busy}
                    onClick={() => input.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      void importFile(e.dataTransfer.files[0]);
                    }}
                  >
                    <span className="upload-icon">
                      <ImagePlus size={24} />
                    </span>
                    <strong>
                      {photo ? "Changer mon image" : "Importez votre image"}
                    </strong>
                    <span>ou glissez-la juste ici</span>
                    <small>JPG, PNG, WEBP ou vidéo · 16 Mo · 10 s max.</small>
                  </button>
                  <input
                    ref={input}
                    type="file"
                    hidden
                    accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime"
                    onChange={(e) => {
                      void importFile(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  {(photo || videoFile || animatedSticker) && (
                    <button
                      className="wide-button"
                      disabled={busy}
                      onClick={() => setCropping(true)}
                    >
                      <Crop size={17} /> Rogner l’image
                    </button>
                  )}
                  {photo && (
                    <button
                      className="wide-button remove-image"
                      disabled={busy}
                      onClick={removeCurrentImage}
                    >
                      <Trash2 size={17} /> Supprimer l’image en cours
                    </button>
                  )}
                  <button
                    className="wide-button"
                    disabled={!photo || busy}
                    onClick={() =>
                      run(async () => {
                        const processed = await removeImageBackground(
                          photo!,
                          setNotice,
                        );
                        commitSettings(s, processed, original.current);
                        setNotice(
                          "Arrière-plan supprimé. Vous pouvez restaurer l’original avec Réinitialiser.",
                        );
                      })
                    }
                  >
                    <WandSparkles size={17} /> Retirer l’arrière-plan{" "}
                    <span className="mini-tag">AUTO</span>
                  </button>
                  <p className="hint">
                    Isole automatiquement le sujet principal de votre image. Le
                    premier usage télécharge le modèle IA et peut prendre un
                    moment.
                  </p>
                  <div className="divider" />
                  <fieldset className="image-settings" disabled={!!videoFile}>
                    <legend>{videoFile ? "Réglages image indisponibles pour une vidéo" : "Réglages de l’image"}</legend>
                    {range("Zoom", "zoom", 30, 180, "%")}
                    {range("Rotation", "rotation", -45, 45, "°")}
                    {photo && (
                      <>
                        {range("Position horizontale", "x", -180, 180)}
                        {range("Position verticale", "y", -180, 180)}
                        <label className="check-label">
                          <input
                            type="checkbox"
                            checked={s.round}
                            onChange={(e) => update("round", e.target.checked)}
                          />{" "}
                          Recadrage en cercle
                        </label>
                      </>
                    )}
                  </fieldset>
                </>
              )}
              {tab === "text" && (
                <>
                  <h3>Faites parler votre sticker</h3>
                  {videoFile && (
                    <p className="mode-hint">
                      Le texte sera incrusté dans chaque image de la vidéo lors de la conversion.
                    </p>
                  )}
                  <label className="field-label">
                    Votre texte
                    <input
                      maxLength={32}
                      value={s.text}
                      placeholder="Votre meilleure réplique…"
                      onFocus={() => beginGesture("text")}
                      onBlur={endGesture}
                      onChange={(e) => { beginGesture("text"); update("text", e.target.value); }}
                    />
                  </label>
                  <p className="hint">{s.text.length}/32 caractères</p>
                  {range("Taille du texte", "textSize", 12, 140, " px")}
                  {range("Zoom du texte", "textZoom", 30, 180, "%")}
                  {range("Rotation du texte", "textRotation", -180, 180, "°")}
                  {range("Position horizontale du texte", "textX", -256, 256, " px")}
                  {range("Position verticale du texte", "textY", -418, 94, " px")}
                  <label className="field-label">
                    Couleur du texte
                    <input
                      className="color-picker"
                      type="color"
                      value={s.color}
                      onFocus={() => beginGesture("color")}
                      onBlur={endGesture}
                      onChange={(e) => { beginGesture("color"); update("color", e.target.value); }}
                    />
                  </label>
                  <div className="swatches">
                    {[
                      "#7554eb",
                      "#151d2d",
                      "#ff6b6b",
                      "#15966a",
                      "#f2b43f",
                    ].map((color) => (
                      <button
                        key={color}
                        style={{ background: color }}
                        aria-label={`Couleur ${color}`}
                        onClick={() => update("color", color)}
                      >
                        {s.color === color && <Check size={16} />}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {tab === "emoji" && (
                <>
                  <h3>Une humeur, un sticker</h3>
                  <p className="hint">
                    Choisissez un emoji pour remplacer l’image.
                  </p>
                  {videoFile && (
                    <p className="mode-hint">
                      Choisir un emoji remplace la vidéo et démarre un nouveau sticker.
                    </p>
                  )}
                  <div className="emoji-picker">
                    <button
                      className="emoji-nav"
                      aria-label="Emojis précédents"
                      disabled={emojiPage === 0}
                      onClick={() => setEmojiPage((page) => page - 1)}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <div className="emoji-grid">
                      {emojiOptions
                        .slice(emojiPage * 16, emojiPage * 16 + 16)
                        .map((emoji) => (
                          <button
                            key={emoji}
                            aria-label={`Utiliser ${emoji}`}
                            onClick={() => {
                              chooseEmoji(emoji);
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                    </div>
                    <button
                      className="emoji-nav"
                      aria-label="Emojis suivants"
                      disabled={
                        emojiPage === Math.ceil(emojiOptions.length / 16) - 1
                      }
                      onClick={() => setEmojiPage((page) => page + 1)}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </>
              )}
              <div className="divider" />
              <fieldset className="image-settings" disabled={!!videoFile}>
                <legend>Contour du sticker</legend>
                {range("Contour blanc", "outline", 0, 16, " px")}
              </fieldset>
              <div className="privacy">
                <ShieldCheck size={17} />
                <span>
                  Vos photos restent sur votre appareil.
                  <br />
                  {user
                    ? "Les stickers ajoutés au pack sont sauvegardés dans votre compte."
                    : "Vos stickers sont conservés dans ce navigateur."}
                </span>
              </div>
            </div>
          </aside>
          <section className="editor panel">
            <div className="editor-heading">
              <div>
                <span className="live-dot" /> Votre sticker, en direct
              </div>
              <div className="history-actions">
                <button
                  className="icon-button"
                  title="Annuler la dernière modification"
                  aria-label="Annuler la dernière modification"
                  disabled={settingsHistoryIndex.current === 0}
                  onClick={undoSettings}
                >
                  <Undo2 size={17} />
                </button>
                <button
                  className="icon-button"
                  title="Rétablir la modification"
                  aria-label="Rétablir la modification"
                  disabled={
                    settingsHistoryIndex.current >=
                    settingsHistory.current.length - 1
                  }
                  onClick={redoSettings}
                >
                  <Redo2 size={17} />
                </button>
                <button
                  className="icon-button"
                  title="Réinitialiser les réglages"
                  aria-label="Réinitialiser les réglages"
                  onClick={() => {
                    commitSettings(
                      {
                        ...defaults,
                        ...(original.current ? { text: "", rotation: 0 } : {}),
                      },
                      original.current,
                      original.current,
                    );
                  }}
                >
                  <RotateCcw size={17} />
                </button>
              </div>
            </div>
            <div
              className={`stage ${preview ? `chat-stage chat-stage-${previewDevice}` : ""}`}
            >
              <div className="stage-label">
                {preview
                  ? "APERÇU CONVERSATION"
                  : "LAISSEZ PARLER VOTRE CRÉATIVITÉ"}
              </div>
              {preview && (
                <div className={`device-frame device-frame-${previewDevice}`}>
                  <div className="device-chrome">
                    <span className="device-lights">
                      <i />
                      <i />
                      <i />
                    </span>
                    <strong>WhatsApp</strong>
                    <span className="device-status">•••</span>
                  </div>
                  <div className="device-chat">
                    <div className="chat-bubble">
                      Alors, cette journée ? <small>14:32</small>
                    </div>
                    {animatedSticker ? (
                      <img className="animated-sticker" src={animatedSticker} alt="Aperçu du sticker animé" />
                    ) : videoFile && animatedPreview ? (
                      <video
                        className="video-sticker-preview"
                        src={animatedPreview}
                        ref={sourceVideo}
                        muted
                        playsInline
                      />
                    ) : (
                      <canvas ref={canvas} aria-label="Aperçu de votre sticker" />
                    )}
                  </div>
                </div>
              )}
              {!preview && (
                animatedSticker ? (
                  <img className="animated-sticker" src={animatedSticker} alt="Aperçu du sticker animé" />
                ) : videoFile && animatedPreview ? (
                  <video
                    className="video-sticker-preview"
                    src={animatedPreview}
                    ref={sourceVideo}
                    muted
                    playsInline
                  />
                ) : (
                  <canvas ref={canvas} aria-label="Aperçu de votre sticker" />
                )
              )}
              <span className="dimensions">
                512 × 512 px · fond transparent
              </span>
            </div>
            {videoFile && animatedPreview && (
              <section className="video-timeline" aria-label="Timeline vidéo">
                <div className="video-timeline-topline">
                  <strong>Timeline vidéo</strong>
                  <span className="timeline-time-pill">
                    {videoStart.toFixed(1)} s — {videoEnd.toFixed(1)} s
                  </span>
                </div>
                <div className="video-ruler" aria-hidden="true">
                  {Array.from({ length: Math.ceil(videoDuration) + 1 }, (_, index) => (
                    <span key={index} style={{ left: `${(index / videoDuration) * 100}%` }}>
                      {index}s
                    </span>
                  ))}
                </div>
                <div className="video-track">
                  <div
                    className="video-selection"
                    style={{
                      left: `${(videoStart / videoDuration) * 100}%`,
                      width: `${((videoEnd - videoStart) / videoDuration) * 100}%`,
                    }}
                  />
                  <input
                    className="timeline-handle timeline-start"
                    type="range"
                    min="0"
                    max={Math.max(0, videoDuration - 1)}
                    step="0.1"
                    value={videoStart}
                    disabled={busy}
                    aria-label="Début de l’extrait"
                    onChange={(event) =>
                      setVideoStart(Math.min(Number(event.target.value), videoEnd - 1))
                    }
                  />
                  <input
                    className="timeline-handle timeline-end"
                    type="range"
                    min={Math.min(videoDuration, videoStart + 1)}
                    max={Math.min(videoDuration, videoStart + 10)}
                    step="0.1"
                    value={videoEnd}
                    disabled={busy}
                    aria-label="Fin de l’extrait"
                    onChange={(event) =>
                      setVideoEnd(Math.max(videoStart + 1, Number(event.target.value)))
                    }
                  />
                </div>
                <div className="video-timeline-footer">
                  <span>Extrait : {(videoEnd - videoStart).toFixed(1)} s · min. 1 s · max. 10 s</span>
                  <div className="video-convert-status" aria-live="polite">
                    {busy
                      ? `Conversion : ${Math.round(videoProgress * 100)} %`
                      : videoProgress >= 1
                        ? "Conversion terminée"
                        : "Prêt à convertir"}
                  </div>
                  <button
                    className="secondary"
                    disabled={busy || videoEnd - videoStart < 1}
                    onClick={() => void createAnimatedSticker()}
                  >
                    {busy ? "Conversion…" : "Préparer le sticker animé"}
                  </button>
                </div>
                <div className="video-progress" aria-hidden="true">
                  <div
                    className="video-progress-bar"
                    style={{ width: `${Math.round(videoProgress * 100)}%` }}
                  />
                </div>
              </section>
            )}
            <div className="canvas-toolbar">
              <span>
                <MousePointer2 size={14} /> Un petit sticker, beaucoup de
                personnalité.
              </span>
              <button
                className={preview ? "preview active" : "preview"}
                onClick={() => setPreview(!preview)}
              >
                <MessageCircle size={16} />
                {preview ? "Retour à l’atelier" : "Aperçu conversation"}
              </button>
              {preview && (
                <div className="device-switcher" aria-label="Choisir l’écran">
                  <span>Écran</span>
                  <button
                    className={previewDevice === "desktop" ? "selected" : ""}
                    aria-label="Ordinateur"
                    aria-pressed={previewDevice === "desktop"}
                    title="Ordinateur"
                    onClick={() => setPreviewDevice("desktop")}
                  >
                    <Monitor size={15} />
                    <span>Desktop</span>
                  </button>
                  <button
                    className={previewDevice === "tablet" ? "selected" : ""}
                    aria-label="Tablette"
                    aria-pressed={previewDevice === "tablet"}
                    title="Tablette"
                    onClick={() => setPreviewDevice("tablet")}
                  >
                    <Tablet size={15} />
                    <span>Tablette</span>
                  </button>
                  <button
                    className={previewDevice === "smartphone" ? "selected" : ""}
                    aria-label="Smartphone"
                    aria-pressed={previewDevice === "smartphone"}
                    title="Smartphone"
                    onClick={() => setPreviewDevice("smartphone")}
                  >
                    <Smartphone size={15} />
                    <span>Mobile</span>
                  </button>
                </div>
              )}
            </div>
            <div className="export-bar">
              <div>
                <strong>Prêt à faire sourire ?</strong>
                <span>Votre prochaine réaction préférée est ici.</span>
              </div>
              <div className="export-actions">
                <button
                  className="secondary"
                  disabled={busy || libraryLoading || !!libraryError || saved.length >= 6}
                  onClick={addSticker}
                >
                  <Plus size={17} /> Au pack
                </button>
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      download(
                        await encodeWebp(canvas.current!),
                        "mon-sticker.webp",
                      );
                      setNotice("Votre sticker a été téléchargé !");
                    })
                  }
                >
                  <ArrowDownToLine size={17} />
                  {busy ? "Un instant…" : "Télécharger"}
                </button>
              </div>
            </div>
          </section>
        </div>
        <section className="pack panel" ref={pack}>
          <div className="pack-header">
            <div className="pack-title">
              <span className="pack-icon">
                <FolderHeart size={22} />
              </span>
              <div>
                <label className="field-label" htmlFor="pack-name">
                  Nom du pack
                </label>
                <input
                  id="pack-name"
                  placeholder="Ex. Mes meilleures réactions"
                  value={packName}
                  maxLength={40}
                  onChange={(e) => setPackName(e.target.value)}
                  onBlur={() => {
                    if (packName !== storedPackName)
                      void run(async () => {
                        await renamePack(packName);
                        setNotice("Nom du pack enregistré.");
                      });
                  }}
                  disabled={libraryLoading || !!libraryError || busy}
                />
                <p>
                  {libraryLoading
                    ? "Chargement de la collection…"
                    : `${saved.length}/6 stickers · ${user ? "sauvegardés dans votre compte" : "sauvegardés dans ce navigateur"}`}
                </p>
              </div>
            </div>
            <button
              className="text-button"
              disabled={!saved.length || saved.length > 6 || busy}
              onClick={exportPack}
            >
              Exporter le pack <ArrowRight size={16} />
            </button>
            {user && (
              <button
                className="secondary"
                onClick={openCreatePack}
                disabled={busy || packs.length >= 5}
                title={packs.length >= 5 ? "Limite de 5 packs atteinte" : "Créer un pack"}
              >
                <Plus size={16} /> Nouveau pack
              </button>
            )}
          </div>
          {packs.length > 1 && (
            <div className="pack-tabs" role="tablist" aria-label="Vos packs">
              {packs.map((packOption) => (
                <button
                  key={packOption.id}
                  role="tab"
                  aria-selected={activePackId === packOption.id}
                  className={activePackId === packOption.id ? "active" : ""}
                  disabled={busy || libraryLoading}
                  onClick={() =>
                    void run(async () => {
                      await selectPack(packOption.id);
                      setNotice("Pack sélectionné.");
                    })
                  }
                >
                  {packOption.name}
                </button>
              ))}
            </div>
          )}
          <div className="pack-items">
            {saved.map((item, i) => (
              <div className="saved-sticker" key={item.id}>
                <img src={item.data} alt={`Sticker ${i + 1}`} />
                <button
                  aria-label={`Supprimer le sticker ${i + 1}`}
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await deleteSticker(item.id);
                      setNotice("Sticker supprimé.");
                    })
                  }
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              className="add-slot"
              disabled={
                busy || saved.length >= 6 || libraryLoading || !!libraryError
              }
              onClick={addSticker}
              aria-label="Ajouter le sticker actuel au pack"
            >
              <Plus size={22} />
              <span>Ajouter</span>
            </button>
            {!saved.length && (
              <div className="pack-empty">
                <strong>Les meilleures réactions se collectionnent.</strong>
                <p>Ajoutez vos créations et emportez-les dans un seul pack.</p>
              </div>
            )}
          </div>
        </section>
        <footer>
          <span>
            <Sticker size={15} /> Fait pour vos « ahaha », vos « wow » et tout
            le reste.
          </span>
          <button onClick={() => setHelp(true)}>
            Et ensuite, sur WhatsApp ? <ChevronRight size={14} />
          </button>
        </footer>
      </main>
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button
            aria-label="Fermer la notification"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {createPackOpen && (
        <div className="modal-backdrop" onClick={() => setCreatePackOpen(false)}>
          <section
            className="modal create-pack-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-pack-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="close-modal icon-button"
              aria-label="Fermer la création de pack"
              onClick={() => setCreatePackOpen(false)}
            >
              <X size={20} />
            </button>
            <span className="pack-icon"><FolderHeart size={22} /></span>
            <h2 id="create-pack-title">Créer un pack</h2>
            <label className="field-label" htmlFor="new-pack-name">
              Nom du pack
              <input
                id="new-pack-name"
                value={newPackName}
                maxLength={40}
                autoFocus
                onChange={(event) => setNewPackName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void submitCreatePack();
                }}
              />
            </label>
            <button className="primary" onClick={() => void submitCreatePack()} disabled={busy}>
              Créer le pack <Plus size={16} />
            </button>
          </section>
        </div>
      )}
      {cropping && photo && (
        <ImageCropper
          image={original.current ?? photo}
          onClose={() => setCropping(false)}
          onApply={(cropped) => {
            commitSettings({ ...s, x: 0, y: 0 }, cropped);
            setCropping(false);
            setNotice("Image rognée. Vous pouvez annuler cette modification.");
          }}
        />
      )}
      {help && (
        <div className="modal-backdrop" onClick={() => setHelp(false)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") setHelp(false);
            }}
          >
            <button
              autoFocus
              className="close-modal icon-button"
              aria-label="Fermer l’aide"
              onClick={() => setHelp(false)}
            >
              <X size={20} />
            </button>
            <span className="pack-icon">
              <Layers />
            </span>
            <h2 id="help-title">De l’idée à la conversation.</h2>
            <ol>
              <li>Importez une photo ou choisissez un emoji.</li>
              <li>Ajustez l’image, le texte et le contour.</li>
              <li>Téléchargez votre sticker WebP ou votre pack ZIP.</li>
            </ol>
            <p>
              Les fichiers sont exportés en 512 × 512 pixels et limités à 100 Ko
              par sticker. Pour installer un pack dans WhatsApp, importez-les
              dans une application de création de stickers compatible avec votre
              téléphone.
            </p>
            <p>
              Le ZIP est une archive de vos images, pas un pack installable
              directement. Préparez 3 à 6 stickers pour votre pack.
              L’installation directe depuis cet atelier n’est pas encore
              disponible.
            </p>
            <button className="primary" onClick={() => setHelp(false)}>
              À moi de créer <ArrowRight size={16} />
            </button>
          </section>
        </div>
      )}
    </>
  );
}
