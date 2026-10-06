import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  ContextoTutorial,
  type HitoTutorial,
  type TutorialContextual,
} from "./ContextoTutorial";
import {
  cerrarTutorial,
  completarPasoTutorial,
  continuarTutorial,
  crearEstadoTutorial,
  iniciarTutorial,
  omitirTutorial,
  posponerTutorial,
} from "./RecorridoTutorial";

export function ProveedorTutorial({
  children,
  habilitado = true,
}: {
  readonly children: ReactNode;
  readonly habilitado?: boolean;
}) {
  const [estado, setEstado] = useState(crearEstadoTutorial);
  const [visible, setVisible] = useState(true);
  const [hitos, setHitos] = useState<ReadonlySet<HitoTutorial>>(
    () => new Set(),
  );
  const informarHito = useCallback((hito: HitoTutorial) => {
    setHitos((actuales) =>
      actuales.has(hito) ? actuales : new Set([...actuales, hito]),
    );
  }, []);
  const valor = useMemo<TutorialContextual>(
    () => ({
      estado,
      visible,
      hitos,
      informarHito,
      iniciar: () => {
        setEstado(iniciarTutorial);
        setVisible(true);
      },
      posponer: () => {
        setEstado((actual) =>
          posponerTutorial(
            actual.situacion === "NO_INICIADO"
              ? iniciarTutorial(actual)
              : actual,
          ),
        );
        setVisible(false);
      },
      continuar: () => {
        setEstado((actual) =>
          actual.situacion === "POSPUESTO" ? continuarTutorial(actual) : actual,
        );
        setVisible(true);
      },
      cerrar: () => {
        setEstado(cerrarTutorial);
        setVisible(false);
      },
      omitir: () => {
        setEstado(omitirTutorial);
        setVisible(false);
      },
      completar: (paso) =>
        setEstado((actual) => completarPasoTutorial(actual, paso)),
    }),
    [estado, visible, hitos, informarHito],
  );

  return habilitado ? (
    <ContextoTutorial.Provider value={valor}>
      {children}
    </ContextoTutorial.Provider>
  ) : (
    children
  );
}
