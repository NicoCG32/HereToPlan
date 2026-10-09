import { createContext, useContext } from "react";
import type { EstadoTutorialV1, IdPasoTutorial } from "./RecorridoTutorial";
import type { ProblemaPreferenciasTutorial } from "../../aplicacion/tutorial/GestionarPreferenciasTutorial";

export type HitoTutorial =
  | "ACTIVIDAD_CREADA"
  | "BLOQUE_ASIGNADO"
  | "REVISION_PREPARADA"
  | "CORTE_ASIGNADO"
  | "BLOQUE_RESUELTO";

export interface TutorialContextual {
  readonly estado: EstadoTutorialV1;
  readonly visible: boolean;
  readonly hitos: ReadonlySet<HitoTutorial>;
  readonly recuperacion: ProblemaPreferenciasTutorial | null;
  readonly errorGuardado: string | undefined;
  readonly persistencia: "LOCAL" | "TEMPORAL";
  readonly iniciar: () => void;
  readonly posponer: () => void;
  readonly continuar: () => void;
  readonly cerrar: () => void;
  readonly omitir: () => void;
  readonly completar: (paso: IdPasoTutorial) => void;
  readonly informarHito: (hito: HitoTutorial) => void;
  readonly mostrar: () => void;
  readonly reiniciar: () => void;
  readonly usarTemporal: () => void;
  readonly reintentarLectura: () => void;
  readonly reintentarGuardado: () => void;
}

export const ContextoTutorial = createContext<TutorialContextual | undefined>(
  undefined,
);

export function useTutorial() {
  return useContext(ContextoTutorial);
}
