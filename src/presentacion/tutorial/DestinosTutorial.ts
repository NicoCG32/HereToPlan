import type { IdPasoTutorial } from "./RecorridoTutorial";

export type IdDestinoTutorial =
  | "NAVEGACION"
  | "ABRIR_NAVEGACION"
  | "CONTEXTO"
  | "CREAR_AGENDA"
  | "CREAR_ACTIVIDAD"
  | "ASIGNABLES"
  | "REVISION"
  | "GRACIA"
  | "EJECUCION";

export function atributosDestinoTutorial(
  destinos: IdDestinoTutorial | readonly IdDestinoTutorial[],
  completados: readonly IdDestinoTutorial[] = [],
) {
  return {
    "data-destino-tutorial":
      typeof destinos === "string" ? destinos : destinos.join(" "),
    "data-tutorial-completado": completados.join(" "),
  } as const;
}

const DESTINOS_POR_PASO: Readonly<
  Record<IdPasoTutorial, readonly IdDestinoTutorial[]>
> = {
  NAVEGACION: ["NAVEGACION", "ABRIR_NAVEGACION"],
  LIBRE: ["CONTEXTO"],
  AGENDA_OPCIONAL: ["CREAR_AGENDA"],
  ACTIVIDAD: ["CREAR_ACTIVIDAD"],
  ASIGNACION: ["ASIGNABLES"],
  REVISION: ["REVISION"],
  CONFIRMACION: ["GRACIA", "REVISION"],
  EJECUCION: ["EJECUCION"],
};

interface LecturaDestinoTutorial {
  readonly elemento: HTMLElement | null;
  readonly completado: boolean;
  readonly hayDialogo: boolean;
  readonly contexto: string;
}

export function crearObservadorDestinoTutorial(paso: IdPasoTutorial | null) {
  let anterior: LecturaDestinoTutorial = {
    elemento: null,
    completado: false,
    hayDialogo: false,
    contexto: "",
  };
  const leer = (): LecturaDestinoTutorial => {
    const hayDialogo = Boolean(
      document.querySelector('[role="dialog"][aria-modal="true"]'),
    );
    if (hayDialogo) {
      if (!anterior.hayDialogo) anterior = { ...anterior, hayDialogo: true };
      return anterior;
    }
    let elemento: HTMLElement | null = null;
    let completado = false;
    for (const destino of paso ? DESTINOS_POR_PASO[paso] : []) {
      const candidatos = document.querySelectorAll<HTMLElement>(
        `[data-destino-tutorial~="${destino}"]`,
      );
      for (const candidato of candidatos) {
        const estilo = getComputedStyle(candidato);
        const rect = candidato.getBoundingClientRect();
        if (
          candidato.closest("[hidden], [inert]") ||
          estilo.display === "none" ||
          estilo.visibility === "hidden" ||
          (rect.width > 0 && (rect.right <= 0 || rect.left >= innerWidth))
        )
          continue;
        elemento = candidato;
        completado =
          candidato.dataset.tutorialCompletado?.split(" ").includes(destino) ??
          false;
        break;
      }
      if (elemento) break;
    }
    const contexto = elemento?.getAttribute("data-tutorial-contexto") ?? "";
    if (
      anterior.elemento !== elemento ||
      anterior.completado !== completado ||
      anterior.hayDialogo !== hayDialogo ||
      anterior.contexto !== contexto
    ) {
      anterior = { elemento, completado, hayDialogo, contexto };
    }
    return anterior;
  };
  const suscribir = (actualizar: () => void) => {
    const observador = new MutationObserver(actualizar);
    observador.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [
        "data-destino-tutorial",
        "data-tutorial-completado",
        "data-tutorial-contexto",
        "aria-modal",
        "inert",
        "hidden",
        "style",
        "data-abierta",
      ],
    });
    window.addEventListener("resize", actualizar);
    return () => {
      observador.disconnect();
      window.removeEventListener("resize", actualizar);
    };
  };
  return { leer, suscribir };
}
