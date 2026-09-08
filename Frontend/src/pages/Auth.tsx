import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import GoogleButton from "../components/GoogleButton";
import {
  ArrowLeft,
  ArrowRight,
  Cloud,
  Eye,
  EyeOff,
  LockKeyhole,
  Smartphone,
} from "lucide-react";
import { useSession } from "../context/Session";
export default function Auth({ mode }: { mode: "login" | "register" }) {
  const { user, authenticate } = useSession();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const register = mode === "register";
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);
  if (user)
    return (
      <Navigate
        to={`/mes-stickers${search.has("google") ? `?google=${encodeURIComponent(search.get("google")!)}` : ""}`}
        replace
      />
    );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const data = new FormData(e.currentTarget);
    try {
      await authenticate(mode, {
        name: String(data.get("name") || ""),
        email: String(data.get("email")),
        password: String(data.get("password")),
      });
      navigate("/mes-stickers", { replace: true });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-story">
        <Link className="back-link" to="/">
          <ArrowLeft size={16} /> Retour à l’accueil
        </Link>
        <div className="eyebrow">VOTRE PETIT COIN DE CRÉATIVITÉ</div>
        <h1>
          Vos stickers.
          <br />
          Votre collection.
          <br />
          <span>Partout avec vous.</span>
        </h1>
        <div className="auth-emojis" aria-hidden="true">
          <span>😎</span>
          <span>💜</span>
          <span>✌️</span>
        </div>
        <p>
          Les réactions passent.
          <br />
          Vos meilleures créations restent.
        </p>
        <div className="auth-benefits">
          <span>
            <Cloud size={18} /> Sauvegarde dans votre compte
          </span>
          <span>
            <Smartphone size={18} /> Accessible sur vos appareils
          </span>
          <span>
            <LockKeyhole size={18} /> Collection privée
          </span>
        </div>
      </section>
      <section className="auth-form-card">
        <span className="form-kicker">
          {register ? "BIENVENUE CHEZ VOUS" : "HEUREUX DE VOUS RETROUVER"}
        </span>
        <h2>{register ? "Créez votre compte" : "Bon retour !"}</h2>
        <p>
          {register
            ? "Un espace pour garder toutes vos bonnes réactions."
            : "Votre collection n’attend plus que vous."}
        </p>
        <GoogleButton />
        <div className="auth-divider">
          <span>ou avec votre e-mail</span>
        </div>
        <form onSubmit={submit}>
          {register && (
            <label>
              Votre prénom
              <input
                autoComplete="given-name"
                name="name"
                minLength={2}
                maxLength={60}
                required
                placeholder="Comment vous appeler ?"
                disabled={busy}
              />
            </label>
          )}
          <label>
            Adresse e-mail
            <input
              autoComplete="email"
              type="email"
              name="email"
              maxLength={254}
              required
              placeholder="vous@exemple.com"
              disabled={busy}
            />
          </label>
          <label>
            Mot de passe
            <div className="password-field">
              <input
                autoComplete={register ? "new-password" : "current-password"}
                type={visible ? "text" : "password"}
                name="password"
                minLength={10}
                maxLength={128}
                required
                placeholder={
                  register ? "Au moins 10 caractères" : "Votre mot de passe"
                }
                disabled={busy}
              />
              <button
                type="button"
                onClick={() => setVisible(!visible)}
                aria-label={
                  visible
                    ? "Masquer le mot de passe"
                    : "Afficher le mot de passe"
                }
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          {register && (
            <p className="form-hint">
              10 caractères minimum. Utilisez un mot de passe unique.
            </p>
          )}
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <button className="primary auth-submit" disabled={busy}>
            {busy
              ? "Un instant…"
              : register
                ? "Créer mon compte"
                : "Me connecter"}
            {!busy && <ArrowRight size={18} />}
          </button>
        </form>
        <p className="auth-switch">
          {register ? "Vous avez déjà un compte ?" : "Pas encore de compte ?"}{" "}
          <Link to={register ? "/connexion" : "/inscription"}>
            {register ? "Se connecter" : "Créer un compte"}
          </Link>
        </p>
        <div className="auth-divider">
          <span>ou</span>
        </div>
        <Link className="guest-link" to="/atelier">
          Essayer l’atelier sans compte <ArrowRight size={15} />
        </Link>
        <p className="form-privacy">
          Seuls les stickers ajoutés à votre collection sont envoyés au serveur.
          Vos photos originales restent sur votre appareil.
        </p>
      </section>
    </main>
  );
}
