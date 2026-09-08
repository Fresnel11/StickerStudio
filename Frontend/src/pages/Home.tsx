import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Cloud,
  Download,
  Heart,
  ImagePlus,
  Layers3,
  LockKeyhole,
  Smartphone,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { useSession } from "../context/Session";
export default function Home() {
  const { user } = useSession();
  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span /> VOTRE CRÉATIVITÉ, SANS FILTRE.
          </div>
          <h1>
            Des stickers
            <br />
            qui sont tout
            <br />
            <span>vous.</span>
            <span className="hero-spark">✦</span>
          </h1>
          <p>
            Votre tête du lundi. Votre blague préférée. Ce petit moment qui
            mérite mieux qu’un emoji.
            <br />
            Transformez-les en stickers pour WhatsApp.
          </p>
          <div className="hero-actions">
            <Link className="primary" to="/atelier">
              Créer mon premier sticker <ArrowRight size={18} />
            </Link>
            <a className="how-link" href="#comment-ca-marche">
              Comment ça marche ?
            </a>
          </div>
          <div className="hero-reassurance">
            <span>
              <Check size={14} /> Sans installation
            </span>
            <span>
              <Check size={14} /> Essai sans compte
            </span>
            <span>
              <Check size={14} /> À votre image
            </span>
          </div>
        </div>
        <div
          className="hero-board"
          aria-label="Exemples de stickers : Trop cool, Love et On y va"
        >
          <div className="board-caption">
            <span className="live-dot" /> LA VIE EST MIEUX EN STICKERS{" "}
            <Sparkles size={15} />
          </div>
          <div className="hero-sticker cool">
            <span>😎</span>
            <strong>TROP COOL !</strong>
          </div>
          <div className="hero-sticker love">
            <span>🫶</span>
            <strong>LOVE YOU</strong>
          </div>
          <div className="hero-sticker party">
            <span>🥳</span>
            <strong>ON Y VA !</strong>
          </div>
          <span className="board-star one">✦</span>
          <span className="board-star two">✧</span>
          <span className="small-heart">💜</span>
          <div className="board-note">
            <Heart size={15} /> 100 % votre personnalité.
          </div>
          <span className="floating-label">
            <WandSparkles size={17} /> Une photo. Mille réactions.
          </span>
        </div>
      </section>
      <section className="steps-section" id="comment-ca-marche">
        <div className="section-heading">
          <div>
            <div className="eyebrow">DE L’IDÉE AU STICKER</div>
            <h2>Trois étapes. Et beaucoup de vous.</h2>
          </div>
          <p>
            Pas besoin de savoir dessiner.
            <br />
            Juste d’avoir quelque chose à exprimer.
          </p>
        </div>
        <div className="home-steps">
          {[
            {
              icon: ImagePlus,
              title: "Choisissez votre image",
              text: "Importez une photo ou partez d’un emoji. Les meilleures idées sont souvent déjà dans votre galerie.",
            },
            {
              icon: WandSparkles,
              title: "Ajoutez votre touche",
              text: "Un texte bien senti, un contour, un petit recadrage… et votre image prend une autre dimension.",
            },
            {
              icon: Download,
              title: "Emportez vos créations",
              text: "Téléchargez vos stickers ou un pack, puis importez-les dans une application compatible avec WhatsApp.",
            },
          ].map((item, i) => (
            <article key={item.title}>
              <div className="step-top">
                <span className={`feature-icon feature-${i}`}>
                  <item.icon size={23} />
                </span>
                <span className="step-number">0{i + 1}</span>
              </div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="account-feature">
        <div className="collection-illustration" aria-hidden="true">
          <div className="mini-library">
            <div className="mini-library-top">
              <span>
                <Layers3 size={19} /> Ma petite collection
              </span>
              <span className="cloud-status">
                <Cloud size={13} /> Sauvegardée
              </span>
            </div>
            <div className="mini-stickers">
              <span>😍</span>
              <span>😎</span>
              <span>✌️</span>
              <span>🥳</span>
              <span>💜</span>
              <span>😂</span>
            </div>
            <div className="mini-library-bottom">
              Vos meilleures réactions, au même endroit.
              <Heart size={14} />
            </div>
          </div>
          <div className="device-note">
            <Smartphone size={22} />
            <div>
              <strong>On se retrouve partout.</strong>
              <span>Un compte, vos appareils.</span>
            </div>
            <span className="device-check">
              <Check size={15} />
            </span>
          </div>
        </div>
        <div className="account-copy">
          <div className="eyebrow">CRÉEZ AUJOURD’HUI. RETROUVEZ DEMAIN.</div>
          <h2>
            Les bons stickers,
            <br />
            ça se garde.
          </h2>
          <p>
            Ne laissez pas vos meilleures créations dans un seul navigateur.
            Avec un compte, votre collection vous accompagne.
          </p>
          <ul>
            <li>
              <span>
                <Cloud size={19} />
              </span>
              <div>
                <strong>Vos stickers sauvegardés</strong>
                <p>
                  Ajoutez-les à votre collection personnelle, conservée dans
                  votre compte.
                </p>
              </div>
            </li>
            <li>
              <span>
                <Smartphone size={19} />
              </span>
              <div>
                <strong>Retrouvez-les sur vos appareils</strong>
                <p>
                  Connectez-vous sur votre téléphone ou votre ordinateur pour
                  les télécharger.
                </p>
              </div>
            </li>
            <li>
              <span>
                <LockKeyhole size={19} />
              </span>
              <div>
                <strong>Un espace rien qu’à vous</strong>
                <p>
                  Vos créations restent privées, accessibles avec votre compte.
                </p>
              </div>
            </li>
          </ul>
          <Link
            className="primary"
            to={user ? "/mes-stickers" : "/inscription"}
          >
            {user ? "Retrouver mes stickers" : "Créer mon compte"}
            <ArrowRight size={17} />
          </Link>
          <span className="account-footnote">
            Vous avez déjà créé des stickers ? Transférez-les après inscription.
          </span>
        </div>
      </section>
      <section className="last-call">
        <div>
          <h2>Alors, quelle sera votre prochaine réaction ?</h2>
          <p>Une idée suffit. L’atelier s’occupe du reste.</p>
        </div>
        <Link className="primary" to="/atelier">
          À moi de créer <ArrowRight size={18} />
        </Link>
      </section>
      <footer>
        <span>
          © {new Date().getFullYear()} Sticker Studio · Fait pour exprimer ce
          qui vous ressemble.
        </span>
        <span>Application indépendante, non affiliée à WhatsApp.</span>
      </footer>
    </main>
  );
}
