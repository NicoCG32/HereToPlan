import { NavLink } from "react-router-dom";

import logoHereToPlan from "../recursos/logos/HereToPlanLogo.svg";

interface NavegacionPrincipalProps {
  readonly onNavegar: () => void;
}

const ENLACES = [
  ["/calendario", "Calendario"],
  ["/crear", "Crear"],
  ["/puntos", "Puntos"],
  ["/respaldo", "Respaldo"],
] as const;

export function NavegacionPrincipal({ onNavegar }: NavegacionPrincipalProps) {
  return (
    <nav className="navegacion-principal" aria-label="Navegación principal">
      <div className="marca-navegacion">
        <img src={logoHereToPlan} width="1536" height="384" alt="HereToPlan" />
      </div>
      <p className="etiqueta-navegacion">Planificación consciente</p>
      <div className="opciones-navegacion">
        {ENLACES.map(([ruta, etiqueta]) => (
          <NavLink
            key={ruta}
            to={ruta}
            onClick={onNavegar}
            className={({ isActive }) =>
              [
                "enlace-navegacion",
                isActive ? "enlace-navegacion-activo" : "",
                ruta === "/respaldo" ? "enlace-navegacion-delicado" : "",
              ]
                .filter(Boolean)
                .join(" ")
            }
          >
            {etiqueta}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
