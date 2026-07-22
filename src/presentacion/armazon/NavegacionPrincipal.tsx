import { NavLink } from "react-router-dom";

import iconoCalendario from "../recursos/iconos/navegacion/icono-calendario.svg";
import iconoCrear from "../recursos/iconos/navegacion/icono-crear.svg";
import iconoPuntos from "../recursos/iconos/navegacion/icono-puntos.svg";
import iconoRespaldo from "../recursos/iconos/navegacion/icono-respaldo.svg";
import logoHereToPlan from "../recursos/logos/HereToPlanLogo.svg";

interface NavegacionPrincipalProps {
  readonly onNavegar: () => void;
}

const ENLACES = [
  { ruta: "/calendario", etiqueta: "Calendario", icono: iconoCalendario },
  { ruta: "/crear", etiqueta: "Crear", icono: iconoCrear },
  { ruta: "/puntos", etiqueta: "Puntos", icono: iconoPuntos },
  { ruta: "/respaldo", etiqueta: "Respaldo", icono: iconoRespaldo },
] as const;

export function NavegacionPrincipal({ onNavegar }: NavegacionPrincipalProps) {
  return (
    <nav className="navegacion-principal" aria-label="Navegación principal">
      <div className="marca-navegacion">
        <img src={logoHereToPlan} width="1536" height="384" alt="HereToPlan" />
      </div>
      <p className="etiqueta-navegacion">Planificación consciente</p>
      <div className="opciones-navegacion">
        {ENLACES.map(({ ruta, etiqueta, icono }) => (
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
            <img
              className="icono-navegacion"
              src={icono}
              alt=""
              aria-hidden="true"
            />
            <span>{etiqueta}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
