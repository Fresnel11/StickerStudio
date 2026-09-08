import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  ChevronRight,
  CircleHelp,
  FolderHeart,
  ImagePlus,
  Layers,
  MessageCircle,
  MousePointer2,
  Plus,
  RotateCcw,
  ShieldCheck,
  Smile,
  Sparkles,
  Sticker,
  Trash2,
  Type,
  WandSparkles,
  X,
} from "lucide-react";
import JSZip from "jszip";
import {
  defaults,
  download,
  encodeWebp,
  loadImage,
  removePlainBackground,
  renderSticker,
  type Settings,
} from "../sticker";
import { useSession } from "../context/Session";
import AccountBanner from "../components/AccountBanner";
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
  } = useSession();
  const [s, setS] = useState<Settings>(defaults);
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const original = useRef<HTMLImageElement | null>(null);
  const [tab, setTab] = useState("image");
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [help, setHelp] = useState(false);
  const [packName, setPackName] = useState(storedPackName);
  useEffect(() => setPackName(storedPackName), [storedPackName]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const pack = useRef<HTMLElement>(null);
  const update = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setS((p) => ({ ...p, [key]: value }));
  useEffect(() => {
    if (canvas.current) renderSticker(canvas.current, photo, s);
  }, [photo, s]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 6500);
    return () => clearTimeout(t);
  }, [notice]);
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
        original.current = image;
        setPhoto(image);
        setS({ ...defaults, text: "", rotation: 0 });
        setTab("image");
        setNotice("Image importée. À vous de jouer !");
      } finally {
        URL.revokeObjectURL(url);
      }
    });
  }
  async function addSticker() {
    await run(async () => {
      if (saved.length >= 30)
        throw new Error("Un pack peut contenir au maximum 30 stickers.");
      const blob = await encodeWebp(canvas.current!);
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
        `${packName}\n\nStickers statiques WebP, 512 × 512 pixels, moins de 100 Ko.\nImportez les fichiers dans une application de création de packs compatible avec votre téléphone.\nCe ZIP ne s’installe pas directement dans WhatsApp. Un pack WhatsApp nécessite 3 à 30 stickers.\n`,
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
    key: "zoom" | "rotation" | "outline" | "textSize" | "x" | "y",
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
              <Sparkles size={17} />
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
                    <small>JPG, PNG, WEBP · 15 Mo max.</small>
                  </button>
                  <input
                    ref={input}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    hidden
                    onChange={(e) => {
                      void importFile(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  <button
                    className="wide-button"
                    disabled={!photo || busy}
                    onClick={() =>
                      run(async () => {
                        setPhoto(
                          await removePlainBackground(original.current!),
                        );
                        setNotice(
                          "Fond uni retiré. Vous pouvez restaurer l’original avec Réinitialiser.",
                        );
                      })
                    }
                  >
                    <WandSparkles size={17} /> Retirer le fond uni{" "}
                    <span className="mini-tag">AUTO</span>
                  </button>
                  <p className="hint">
                    Idéal pour un fond uni, de la même couleur que le coin
                    supérieur gauche.
                  </p>
                  <div className="divider" />
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
                </>
              )}
              {tab === "text" && (
                <>
                  <h3>Faites parler votre sticker</h3>
                  <label className="field-label">
                    Votre texte
                    <input
                      maxLength={32}
                      value={s.text}
                      placeholder="Votre meilleure réplique…"
                      onChange={(e) => update("text", e.target.value)}
                    />
                  </label>
                  <p className="hint">{s.text.length}/32 caractères</p>
                  {range("Taille du texte", "textSize", 24, 80)}
                  <label className="field-label">
                    Couleur du texte
                    <input
                      className="color-picker"
                      type="color"
                      value={s.color}
                      onChange={(e) => update("color", e.target.value)}
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
                  <div className="emoji-grid">
                    {[
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
                    ].map((emoji) => (
                      <button
                        key={emoji}
                        aria-label={`Utiliser ${emoji}`}
                        onClick={() => {
                          setPhoto(null);
                          original.current = null;
                          update("emoji", emoji);
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div className="divider" />
              {range("Contour blanc", "outline", 0, 16, " px")}
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
              <button
                className="icon-button"
                title="Réinitialiser les réglages"
                aria-label="Réinitialiser les réglages"
                onClick={() => {
                  setS({
                    ...defaults,
                    ...(original.current ? { text: "", rotation: 0 } : {}),
                  });
                  setPhoto(original.current);
                }}
              >
                <RotateCcw size={17} />
              </button>
            </div>
            <div className={`stage ${preview ? "chat-stage" : ""}`}>
              <div className="stage-label">
                {preview
                  ? "APERÇU CONVERSATION"
                  : "LAISSEZ PARLER VOTRE CRÉATIVITÉ"}
              </div>
              {preview && (
                <div className="chat-bubble">
                  Alors, cette journée ? <small>14:32</small>
                </div>
              )}
              <canvas ref={canvas} aria-label="Aperçu de votre sticker" />
              <span className="dimensions">
                512 × 512 px · fond transparent
              </span>
            </div>
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
            </div>
            <div className="export-bar">
              <div>
                <strong>Prêt à faire sourire ?</strong>
                <span>Votre prochaine réaction préférée est ici.</span>
              </div>
              <div className="export-actions">
                <button
                  className="secondary"
                  disabled={busy || libraryLoading || !!libraryError}
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
                <label className="sr-only" htmlFor="pack-name">
                  Nom du pack
                </label>
                <input
                  id="pack-name"
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
                    : `${saved.length}/30 stickers · ${user ? "sauvegardés dans votre compte" : "sauvegardés dans ce navigateur"}`}
                </p>
              </div>
            </div>
            <button
              className="text-button"
              disabled={!saved.length || busy}
              onClick={exportPack}
            >
              Exporter le pack <ArrowRight size={16} />
            </button>
          </div>
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
                busy || saved.length >= 30 || libraryLoading || !!libraryError
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
              directement. Préparez 3 à 30 stickers pour votre pack.
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
