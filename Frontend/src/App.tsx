import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import { SessionProvider, useSession } from "./context/Session";
import Header from "./components/Header";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Studio from "./pages/Studio";
import Library from "./pages/Library";
function Site() {
  const { user, ready, sessionError, retrySession } = useSession();
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    const titles: Record<string, string> = {
      "/": "Vos idées méritent un sticker",
      "/atelier": "L’atelier",
      "/connexion": "Connexion",
      "/inscription": "Créer un compte",
      "/mes-stickers": "Mes stickers",
    };
    document.title = `${titles[pathname] || "Page introuvable"} — Sticker Studio`;
  }, [pathname]);
  if (!ready)
    return (
      <div className="app-loading" role="status">
        <span className="loading-mark">✦</span>Ouverture de Sticker Studio…
      </div>
    );
  if (sessionError)
    return (
      <div className="app-loading" role="alert">
        <h1>Un instant, on se reconnecte.</h1>
        <p>{sessionError}</p>
        <button className="primary" onClick={retrySession}>
          Réessayer
        </button>
      </div>
    );
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/atelier" element={<Studio key={user?.id ?? "guest"} />} />
        <Route path="/connexion" element={<Auth key="login" mode="login" />} />
        <Route
          path="/inscription"
          element={<Auth key="register" mode="register" />}
        />
        <Route path="/mes-stickers" element={<Library />} />
        <Route
          path="*"
          element={
            <main className="empty-state">
              <h1>Cette page s’est décollée.</h1>
              <Link className="primary" to="/">
                Retour à l’accueil
              </Link>
            </main>
          }
        />
      </Routes>
    </>
  );
}
export default function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <Site />
      </SessionProvider>
    </BrowserRouter>
  );
}
