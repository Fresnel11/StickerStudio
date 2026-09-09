import { useEffect, useRef, useState } from "react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type PercentCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { loadImage } from "../sticker";

export default function ImageCropper({
  image,
  onApply,
  onClose,
}: {
  image: HTMLImageElement;
  onApply: (image: HTMLImageElement) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [source] = useState(() => {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext("2d")!.drawImage(image, 0, 0);
    return canvas.toDataURL("image/png");
  });
  const [crop, setCrop] = useState<PercentCrop>({
    unit: "%",
    x: 10,
    y: 10,
    width: 80,
    height: 80,
  });
  const [aspect, setAspect] = useState<number | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  function selectAspect(value: string) {
    const ratio = value ? Number(value) : undefined;
    setAspect(ratio);
    setCrop(
      ratio
        ? centerCrop(
            makeAspectCrop(
              { unit: "%", width: 80 },
              ratio,
              image.naturalWidth,
              image.naturalHeight,
            ),
            image.naturalWidth,
            image.naturalHeight,
          )
        : { unit: "%", x: 10, y: 10, width: 80, height: 80 },
    );
  }
  async function apply() {
    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(
        1,
        Math.round((image.naturalWidth * crop.width) / 100),
      );
      canvas.height = Math.max(
        1,
        Math.round((image.naturalHeight * crop.height) / 100),
      );
      canvas
        .getContext("2d")!
        .drawImage(
          image,
          (image.naturalWidth * crop.x) / 100,
          (image.naturalHeight * crop.y) / 100,
          (image.naturalWidth * crop.width) / 100,
          (image.naturalHeight * crop.height) / 100,
          0,
          0,
          canvas.width,
          canvas.height,
        );
      onApply(await loadImage(canvas.toDataURL("image/png")));
    } catch {
      setError("Impossible de rogner cette image. Réessayez.");
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="crop-dialog"
      aria-labelledby="crop-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <h2 id="crop-title">Rogner l’image</h2>
      <p>Déplacez le cadre et ses poignées pour choisir la partie à garder.</p>
      <label className="crop-format">
        Format
        <select
          aria-label="Format"
          value={aspect ?? ""}
          onChange={(event) => selectAspect(event.target.value)}
          disabled={busy}
        >
          <option value="">Libre</option>
          <option value="1">Carré</option>
          <option value={4 / 3}>Paysage 4:3</option>
          <option value={3 / 4}>Portrait 3:4</option>
        </select>
      </label>
      <div className="crop-workspace">
        <ReactCrop
          crop={crop}
          aspect={aspect}
          onChange={(_, percent) => setCrop(percent)}
          disabled={busy}
          minWidth={12}
          minHeight={12}
          ruleOfThirds
        >
          <img src={source} alt="Image à rogner" draggable={false} />
        </ReactCrop>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="crop-actions">
        <button className="secondary" disabled={busy} onClick={onClose}>
          Annuler
        </button>
        <button
          className="primary"
          disabled={busy || !crop.width || !crop.height}
          onClick={() => void apply()}
        >
          {busy ? "Application…" : "Appliquer le rognage"}
        </button>
      </div>
    </dialog>
  );
}
