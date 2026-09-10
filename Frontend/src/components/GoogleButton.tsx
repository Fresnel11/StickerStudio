import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, getApiUrl } from "../lib/api";
export const googleErrors: Record<string, string> = {
  unavailable:
    "La connexion Google n’est pas encore disponible. Utilisez votre adresse e-mail pour le moment.",
  expired: "Cette demande de connexion a expiré. Réessayez avec Google.",
  cancelled: "La connexion Google a été annulée. Vous pouvez réessayer.",
  failed:
    "La connexion Google a échoué. Réessayez ou connectez-vous par e-mail.",
  existing_account:
    "Cette adresse possède déjà un compte. Connectez-vous avec votre mot de passe, puis associez Google depuis « Mes stickers ».",
  signin_first: "Connectez-vous à votre compte avant d’associer Google.",
  already_linked:
    "Ce compte Google est déjà associé à un autre compte Sticker Studio.",
  link_mismatch:
    "Choisissez le compte Google qui utilise la même adresse e-mail que votre compte Sticker Studio.",
};
export default function GoogleButton({ link = false }: { link?: boolean }) {
  const [provider, setProvider] = useState<{
    google: boolean;
    googleLinked: boolean;
  } | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [search] = useSearchParams();
  useEffect(() => {
    let active = true;
    setFailed(false);
    api<{ google: boolean; googleLinked: boolean }>("/auth/providers")
      .then((data) => {
        if (active) setProvider(data);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [retry]);
  const message = googleErrors[search.get("google") || ""];
  return (
    <div className={link ? "google-account" : "google-auth"}>
      {link && (
        <div>
          <strong>Votre connexion, encore plus simple.</strong>
          <p>
            Associez votre compte Google pour retrouver cette même collection.
          </p>
        </div>
      )}
      {link && provider?.googleLinked ? (
        <span className="google-linked">✓ Compte Google associé</span>
      ) : (
        <div>
          <button
            className="google-button"
            type="button"
            disabled={!provider?.google}
            onClick={() =>
              window.location.assign(
                getApiUrl(`/auth/google${link ? "?link=1" : ""}`),
              )
            }
          >
            <svg aria-hidden="true" width="19" height="19" viewBox="0 0 48 48">
              <path
                fill="#4285F4"
                d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.9h11a9.4 9.4 0 0 1-4.1 6.2v5.2h6.7c3.9-3.6 6-8.9 6-15.2Z"
              />
              <path
                fill="#34A853"
                d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.7-5.2c-1.8 1.2-4.1 1.9-6.8 1.9-5.3 0-9.8-3.6-11.4-8.4H5.7v5.4A20.4 20.4 0 0 0 24 44Z"
              />
              <path
                fill="#FBBC05"
                d="M12.6 27.4a12.2 12.2 0 0 1 0-7.8v-5.4H5.7a20.3 20.3 0 0 0 0 18.6l6.9-5.4Z"
              />
              <path
                fill="#EA4335"
                d="M24 11.2c3 0 5.6 1 7.7 3l5.8-5.8A19.4 19.4 0 0 0 24 3 20.4 20.4 0 0 0 5.7 14.2l6.9 5.4C14.2 14.8 18.7 11.2 24 11.2Z"
              />
            </svg>
            {link ? "Associer mon compte Google" : "Continuer avec Google"}
          </button>
          {provider && !provider.google && (
            <p className="google-hint">
              La connexion Google sera bientôt disponible.
            </p>
          )}
          {failed && (
            <p className="google-hint" role="alert">
              Impossible de vérifier la disponibilité.{" "}
              <button onClick={() => setRetry((value) => value + 1)}>
                Réessayer
              </button>
            </p>
          )}
        </div>
      )}
      {message && (
        <p className="form-error" role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
