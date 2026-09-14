import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { StudioNative, supportsWhatsApp } from "../lib/native";
import type { Saved } from "../lib/api";

export default function WhatsAppButton({
  name,
  stickers,
  sourceId,
  disabled = false,
}: {
  name: string;
  stickers: Saved[];
  sourceId: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [choose, setChoose] = useState(false);
  if (!supportsWhatsApp()) return null;
  async function add(target?: string) {
    setNotice("");
    if (stickers.length < 3 || stickers.length > 6) {
      setNotice(
        "Votre pack doit contenir entre 3 et 6 stickers pour WhatsApp.",
      );
      return;
    }
    if (!name.trim()) {
      setNotice("Donnez d’abord un nom à votre pack.");
      return;
    }
    setBusy(true);
    try {
      const available = await StudioNative.availability();
      if (!available.whatsapp && !available.business) {
        setNotice("Installez WhatsApp sur cet appareil, puis réessayez.");
        return;
      }
      if (!target && available.whatsapp && available.business) {
        setChoose(true);
        return;
      }
      setChoose(false);
      const result = await StudioNative.addPack({
        name: name.trim(),
        sourceId,
        stickers: stickers.map((item) => item.data),
        target:
          target || (available.whatsapp ? "com.whatsapp" : "com.whatsapp.w4b"),
      });
      setNotice(
        result.added
          ? "Pack ajouté ! Retrouvez-le dans les stickers de WhatsApp."
          : "Ajout annulé. Votre pack reste disponible ici.",
      );
    } catch (error) {
      setNotice(
        (error as Error).message || "Impossible d’ajouter le pack. Réessayez.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="whatsapp-export">
      <button
        className="primary"
        disabled={disabled || busy}
        onClick={() => void add()}
      >
        <MessageCircle size={17} />{" "}
        {busy ? "Préparation du pack…" : "Ajouter à WhatsApp"}
      </button>
      {choose && (
        <div
          className="whatsapp-choices"
          role="group"
          aria-label="Choisir WhatsApp"
        >
          <button
            className="secondary"
            disabled={busy}
            onClick={() => void add("com.whatsapp")}
          >
            WhatsApp
          </button>
          <button
            className="secondary"
            disabled={busy}
            onClick={() => void add("com.whatsapp.w4b")}
          >
            WhatsApp Business
          </button>
          <button className="text-button" onClick={() => setChoose(false)}>
            Annuler
          </button>
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
    </div>
  );
}
