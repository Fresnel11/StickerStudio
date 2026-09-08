import { CloudUpload, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useSession } from "../context/Session";
export default function AccountBanner() {
  const { user, guestCount, importGuest, libraryLoading, libraryError } =
    useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (user && !guestCount) return null;
  return (
    <section className="account-banner">
      <span className="account-banner-icon">
        <CloudUpload size={23} />
      </span>
      <div>
        <strong>
          {user
            ? `${guestCount} sticker${guestCount > 1 ? "s" : ""} à retrouver dans votre compte`
            : "Vos créations méritent de vous suivre."}
        </strong>
        <p>
          {user
            ? "Transférez les stickers enregistrés sur ce navigateur dans votre collection personnelle."
            : "Créez un compte pour sauvegarder vos stickers et les retrouver sur vos autres appareils."}
        </p>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
      </div>
      {user ? (
        <button
          className="secondary"
          disabled={busy || libraryLoading || !!libraryError}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await importGuest();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Transfert…" : "Transférer mes stickers"}
        </button>
      ) : (
        <Link className="secondary" to="/inscription">
          Sauvegarder avec un compte <ArrowRight size={16} />
        </Link>
      )}
    </section>
  );
}
