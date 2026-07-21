import { useEffect, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

interface RutasAplicacionProps {
  readonly calendario: ReactNode;
  readonly crear: ReactNode;
  readonly puntos: ReactNode;
  readonly respaldo: ReactNode;
}

const TITULOS: Readonly<Record<string, string>> = {
  "/calendario": "Calendario · HereToPlan",
  "/crear": "Crear · HereToPlan",
  "/puntos": "Puntos · HereToPlan",
  "/respaldo": "Respaldo · HereToPlan",
};

export function RutasAplicacion(props: RutasAplicacionProps) {
  const ubicacion = useLocation();

  useEffect(() => {
    document.title = TITULOS[ubicacion.pathname] ?? "HereToPlan";
  }, [ubicacion.pathname]);

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/calendario" replace />} />
      <Route path="/calendario" element={props.calendario} />
      <Route path="/crear" element={props.crear} />
      <Route path="/puntos" element={props.puntos} />
      <Route path="/respaldo" element={props.respaldo} />
      <Route path="*" element={<Navigate to="/calendario" replace />} />
    </Routes>
  );
}
