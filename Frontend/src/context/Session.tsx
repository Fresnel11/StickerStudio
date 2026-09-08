import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, readGuestStickers, type Saved, type User } from "../lib/api";
type SessionValue = {
  user: User | null;
  ready: boolean;
  sessionError: string;
  retrySession: () => void;
  authenticate: (
    mode: "login" | "register",
    values: { email: string; password: string; name?: string },
  ) => Promise<void>;
  logout: () => Promise<void>;
  saved: Saved[];
  packName: string;
  libraryLoading: boolean;
  libraryError: string;
  reloadLibrary: () => Promise<void>;
  addSticker: (data: string) => Promise<void>;
  deleteSticker: (id: string) => Promise<void>;
  renamePack: (name: string) => Promise<void>;
  guestCount: number;
  importGuest: () => Promise<void>;
};
const SessionContext = createContext<SessionValue | null>(null);
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [saved, setSaved] = useState<Saved[]>([]);
  const [packName, setPackName] = useState("Mon premier pack");
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [libraryError, setLibraryError] = useState("");
  const [guestCount, setGuestCount] = useState(
    () => readGuestStickers().length,
  );
  const generation = useRef(0);
  async function retrySession() {
    setReady(false);
    setSessionError("");
    try {
      const data = await api<{ user: User | null }>("/auth/me");
      setUser(data.user);
    } catch (e) {
      setSessionError((e as Error).message);
    } finally {
      setReady(true);
    }
  }
  useEffect(() => {
    void retrySession();
  }, []);
  useEffect(() => {
    const expired = () => {
      generation.current++;
      setSaved([]);
      setUser(null);
    };
    window.addEventListener("studio-session-expired", expired);
    return () => window.removeEventListener("studio-session-expired", expired);
  }, []);
  async function reloadLibrary() {
    const current = ++generation.current;
    setLibraryLoading(true);
    setLibraryError("");
    try {
      if (user) {
        const data = await api<{ name: string; stickers: Saved[] }>("/library");
        if (current === generation.current) {
          setSaved(data.stickers);
          setPackName(data.name);
        }
      } else {
        setSaved(readGuestStickers());
        try {
          setPackName(
            localStorage.getItem("sticker-studio-pack-name") ||
              "Mon premier pack",
          );
        } catch {
          setPackName("Mon premier pack");
        }
      }
    } catch (e) {
      if (current === generation.current) setLibraryError((e as Error).message);
    } finally {
      if (current === generation.current) setLibraryLoading(false);
    }
  }
  useEffect(() => {
    setSaved([]);
    if (ready) void reloadLibrary();
    return () => {
      generation.current++;
    };
  }, [user?.id, ready]);
  function persistGuest(items: Saved[]) {
    try {
      localStorage.setItem("sticker-studio-pack", JSON.stringify(items));
    } catch {
      throw new Error(
        "Le stockage de ce navigateur est plein. Exportez vos stickers pour libérer de la place.",
      );
    }
    setSaved(items);
    setGuestCount(items.length);
  }
  async function authenticate(
    mode: "login" | "register",
    values: { email: string; password: string; name?: string },
  ) {
    const result = await api<{ user: User }>(`/auth/${mode}`, {
      method: "POST",
      body: JSON.stringify(values),
    });
    setSaved([]);
    setLibraryLoading(true);
    setUser(result.user);
  }
  async function logout() {
    await api("/auth/logout", { method: "POST" });
    generation.current++;
    setSaved([]);
    setUser(null);
  }
  async function addSticker(data: string) {
    if (libraryLoading || libraryError)
      throw new Error(
        "Attendez le chargement de votre collection ou réessayez.",
      );
    const current = generation.current;
    if (user) {
      const result = await api<{ sticker: Saved }>("/stickers", {
        method: "POST",
        body: JSON.stringify({ data }),
      });
      if (current === generation.current)
        setSaved((items) =>
          items.some((item) => item.id === result.sticker.id)
            ? items
            : [...items, result.sticker],
        );
    } else {
      if (saved.length >= 30)
        throw new Error("Votre pack contient déjà 30 stickers.");
      persistGuest([...saved, { id: crypto.randomUUID(), data }]);
    }
  }
  async function deleteSticker(id: string) {
    const current = generation.current;
    if (user) {
      await api(`/stickers/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (current === generation.current)
        setSaved((items) => items.filter((item) => item.id !== id));
    } else persistGuest(saved.filter((item) => item.id !== id));
  }
  async function renamePack(name: string) {
    const normalized = name.trim();
    if (!normalized || normalized.length > 40)
      throw new Error("Le nom doit contenir entre 1 et 40 caractères.");
    const current = generation.current;
    if (user)
      await api("/library", {
        method: "PATCH",
        body: JSON.stringify({ name: normalized }),
      });
    else localStorage.setItem("sticker-studio-pack-name", normalized);
    if (current === generation.current) setPackName(normalized);
  }
  async function importGuest() {
    const current = generation.current;
    const result = await api<{ stickers: Saved[] }>("/stickers/import", {
      method: "POST",
      body: JSON.stringify({ stickers: readGuestStickers() }),
    });
    if (current !== generation.current) return;
    setSaved(result.stickers);
    try {
      localStorage.removeItem("sticker-studio-pack");
    } catch {
      /* Import is idempotent: remaining local copies are safe. */
    }
    setGuestCount(readGuestStickers().length);
  }
  return (
    <SessionContext.Provider
      value={{
        user,
        ready,
        sessionError,
        retrySession,
        authenticate,
        logout,
        saved,
        packName,
        libraryLoading,
        libraryError,
        reloadLibrary,
        addSticker,
        deleteSticker,
        renamePack,
        guestCount,
        importGuest,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("SessionProvider manquant");
  return session;
}
