import { ArrowLeft, Home, Sparkles } from "lucide-react";
import { useState, type PointerEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../app/auth/AuthProvider";
import "./not-found.css";

const secretMessages = [
  "Parece que alguien se comió la página…",
  "Solo quedaron unas cuantas migas.",
  "Easter egg desbloqueado: POSTRE404 ✨",
];

export default function NotFound() {
  const { state } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [dessertClicks, setDessertClicks] = useState(0);

  const destination = state?.activeContext
    ? "/app/pos"
    : state
      ? "/select-context"
      : "/login";
  const destinationLabel = state?.activeContext ? "Volver al POS" : "Ir al inicio";
  const secretIndex = Math.min(dessertClicks, secretMessages.length - 1);

  const moveScene = (event: PointerEvent<HTMLButtonElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    event.currentTarget.style.setProperty("--scene-rotate-x", `${-y * 14}deg`);
    event.currentTarget.style.setProperty("--scene-rotate-y", `${x * 18}deg`);
  };

  const resetScene = (event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.style.setProperty("--scene-rotate-x", "-4deg");
    event.currentTarget.style.setProperty("--scene-rotate-y", "7deg");
  };

  return (
    <main className="lost-dessert-page">
      <div className="lost-dessert-glow lost-dessert-glow-one" />
      <div className="lost-dessert-glow lost-dessert-glow-two" />

      <section className="lost-dessert-content" aria-labelledby="not-found-title">
        <div className="lost-dessert-copy">
          <p className="lost-dessert-kicker"><Sparkles aria-hidden="true" /> Fuera de menú</p>
          <h1 id="not-found-title">Este postre se nos perdió.</h1>
          <p className="lost-dessert-description">
            La dirección que buscabas no existe o tomó un atajo hacia otra dimensión.
            La caja y tus datos siguen a salvo.
          </p>
          <code className="lost-dessert-path">{location.pathname}</code>

          <div className="lost-dessert-actions">
            <button type="button" className="lost-dessert-primary" onClick={() => navigate(destination, { replace: true })}>
              <Home aria-hidden="true" /> {destinationLabel}
            </button>
            <button type="button" className="lost-dessert-secondary" onClick={() => navigate(-1)}>
              <ArrowLeft aria-hidden="true" /> Página anterior
            </button>
          </div>
        </div>

        <div className="lost-dessert-visual">
          <button
            type="button"
            className={`lost-dessert-scene ${dessertClicks >= 2 ? "is-discovered" : ""}`}
            onPointerMove={moveScene}
            onPointerLeave={resetScene}
            onClick={() => setDessertClicks((clicks) => clicks + 1)}
            aria-label="Postre flotante. Haz clic para descubrir el secreto."
          >
            <span className="lost-dessert-number" aria-hidden="true">404</span>
            <span className="lost-dessert-orbit orbit-one" aria-hidden="true"><i /></span>
            <span className="lost-dessert-orbit orbit-two" aria-hidden="true"><i /></span>
            <span className="lost-dessert-orbit orbit-three" aria-hidden="true"><i /></span>

            <span className="lost-dessert-cake" aria-hidden="true">
              <span className="cake-shadow" />
              <span className="cake-plate" />
              <span className="cake-body cake-body-back" />
              <span className="cake-body cake-body-front" />
              <span className="cake-filling" />
              <span className="cake-top" />
              <span className="cake-cream cream-one" />
              <span className="cake-cream cream-two" />
              <span className="cake-cherry" />
            </span>
          </button>

          <p className={`lost-dessert-secret ${dessertClicks ? "is-visible" : ""}`} aria-live="polite">
            {dessertClicks ? secretMessages[secretIndex] : "Pista: el postre parece sospechosamente interactivo."}
          </p>
        </div>
      </section>
    </main>
  );
}

