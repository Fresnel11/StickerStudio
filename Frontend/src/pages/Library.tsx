import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  ArrowDownToLine,
  ArrowRight,
  Cloud as CloudCheck,
  FolderHeart,
  Plus,
  Trash2,
} from "lucide-react";
import JSZip from "jszip";
import { download } from "../sticker";
import { useSession } from "../context/Session";
import AccountBanner from "../components/AccountBanner";
import GoogleButton from "../components/GoogleButton";
export default function Library() {
  const {
    user,
    saved,
    packName,
    libraryError,
    libraryLoading,
    reloadLibrary,
    deleteSticker,
    renamePack,
  } = useSession();
  const [name, setName] = useState(packName);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  useEffect(() => setName(packName), [packName]);
  if (!user) return <Navigate to="/connexion" replace />;
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="library-page">
      <section className="library-intro">
        <div>
          <div className="eyebrow">
            <span /> VOTRE ESPACE PERSONNEL
          </div>
          <h1>
            La collection de <span>{user.name}.</span>
          </h1>
          <p>Vos meilleures réactions, prêtes à reprendre du service.</p>
        </div>
        <Link className="primary" to="/atelier">
          <Plus size={18} /> Créer un sticker
        </Link>
      </section>
      <AccountBanner />
      <GoogleButton link />
      {libraryLoading ? (
        <div className="empty-state" role="status">
          Chargement de votre collection…
        </div>
      ) : libraryError ? (
        <div className="empty-state" role="alert">
          <p>{libraryError}</p>
          <button className="secondary" onClick={() => void reloadLibrary()}>
            Réessayer
          </button>
          <Link to="/connexion">Revenir à la connexion</Link>
        </div>
      ) : (
        <section className="library-panel panel">
          <div className="library-toolbar">
            <div className="library-pack-name">
              <span className="pack-icon">
                <FolderHeart size={23} />
              </span>
              <div>
                <label className="sr-only" htmlFor="library-name">
                  Nom de votre pack
                </label>
                <input
                  id="library-name"
                  value={name}
                  maxLength={40}
                  onChange={(e) => setName(e.target.value)}
                  disabled={busy}
                />
                <span>
                  {saved.length}/6 stickers <span>·</span>{" "}
                  <CloudCheck size={13} /> Sauvegardés dans votre compte
                </span>
              </div>
              {name !== packName && (
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await renamePack(name);
                      setNotice("Nom du pack enregistré.");
                    })
                  }
                >
                  Enregistrer
                </button>
              )}
            </div>
            <button
              className="secondary"
              disabled={!saved.length || saved.length > 6 || busy}
              onClick={() =>
                run(async () => {
                  const zip = new JSZip();
                  saved.forEach((item, i) =>
                    zip.file(`sticker-${i + 1}.webp`, item.data.split(",")[1], {
                      base64: true,
                    }),
                  );
                  zip.file(
                    "LISEZ-MOI.txt",
                    `${packName}\nImportez ces fichiers WebP dans une application de création de stickers compatible avec votre téléphone. Ce ZIP ne s’installe pas directement dans WhatsApp. Sticker Studio limite chaque pack à 6 stickers.`,
                  );
                  await download(
                    await zip.generateAsync({ type: "blob" }),
                    `${packName.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 40) || "stickers"}.zip`,
                  );
                })
              }
            >
              <ArrowDownToLine size={16} /> Télécharger le pack
            </button>
          </div>
          {saved.length ? (
            <div className="library-grid">
              {saved.map((item, index) => (
                <article className="library-sticker" key={item.id}>
                  <div className="library-sticker-image">
                    <img src={item.data} alt={`Sticker ${index + 1}`} />
                  </div>
                  <div className="library-sticker-actions">
                    <span>Sticker {index + 1}</span>
                    <button
                      aria-label={`Télécharger le sticker ${index + 1}`}
                      onClick={() =>
                        run(async () =>
                          download(
                            await (await fetch(item.data)).blob(),
                            `sticker-${index + 1}.webp`,
                          ),
                        )
                      }
                      disabled={busy}
                    >
                      <ArrowDownToLine size={16} />
                    </button>
                    <button
                      aria-label={`Supprimer le sticker ${index + 1}`}
                      disabled={busy}
                      onClick={() => setPendingDelete(item.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  {pendingDelete === item.id && (
                    <div className="delete-confirm">
                      <p>Supprimer ce sticker du compte ?</p>
                      <button
                        disabled={busy}
                        onClick={() =>
                          run(async () => {
                            await deleteSticker(item.id);
                            setPendingDelete(null);
                            setNotice("Sticker supprimé.");
                          })
                        }
                      >
                        Supprimer
                      </button>
                      <button onClick={() => setPendingDelete(null)}>
                        Annuler
                      </button>
                    </div>
                  )}
                </article>
              ))}
              <Link className="library-new" to="/atelier">
                <Plus size={30} />
                <span>Une nouvelle réaction ?</span>
              </Link>
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-emoji" aria-hidden="true">
                ✌️
              </span>
              <h2>Votre collection commence ici.</h2>
              <p>
                Créez votre premier sticker dans l’atelier, puis cliquez sur «
                Au pack ».
                <br />
                Il sera sauvegardé ici, dans votre compte.
              </p>
              <Link className="primary" to="/atelier">
                Créer mon premier sticker <ArrowRight size={17} />
              </Link>
            </div>
          )}
        </section>
      )}
      {notice && (
        <p className="library-notice" role="status">
          {notice}
        </p>
      )}
      <p className="library-footnote">
        <CloudCheck size={15} /> Votre collection est liée à votre compte.
        Retrouvez-la en vous connectant sur un autre appareil.
      </p>
    </main>
  );
}
