import { Link, NavLink, useNavigate } from "react-router-dom";
import { LogOut, Sticker, UserRound } from "lucide-react";
import { useState } from "react";
import { useSession } from "../context/Session";
export default function Header() {
  const { user, logout } = useSession();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <header className="topbar site-header">
        <Link className="brand" to="/" aria-label="Sticker Studio — Accueil">
          <span className="brand-icon">
            <Sticker size={23} />
          </span>
          sticker<span className="brand-light">studio</span>
          <span className="beta">BÊTA</span>
        </Link>
        <nav aria-label="Navigation principale">
          <NavLink to="/" end>
            Accueil
          </NavLink>
          <NavLink to="/atelier">L’atelier</NavLink>
          {user && <NavLink to="/mes-stickers">Mes stickers</NavLink>}
        </nav>
        <div className="header-account">
          {user ? (
            <>
              <Link to="/mes-stickers" className="user-chip">
                <UserRound size={16} />
                <span>{user.name}</span>
              </Link>
              <button
                className="logout-button"
                disabled={busy}
                aria-label="Se déconnecter"
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await logout();
                    navigate("/");
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <LogOut size={17} />
              </button>
            </>
          ) : (
            <>
              <Link className="login-link" to="/connexion">
                Se connecter
              </Link>
              <Link className="primary" to="/inscription">
                Créer un compte
              </Link>
            </>
          )}
        </div>
      </header>
      {error && (
        <div className="global-error" role="alert">
          {error}
        </div>
      )}
    </>
  );
}
