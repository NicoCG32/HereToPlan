import type { HitoTutorial } from "./ContextoTutorial";
import type { IdPasoTutorial } from "./RecorridoTutorial";

interface IndicacionTutorial {
  readonly titulo: string;
  readonly texto: string;
  readonly requisito?: string;
  readonly hito?: HitoTutorial;
}

export const INDICACIONES_TUTORIAL: Readonly<
  Record<IdPasoTutorial, IndicacionTutorial>
> = {
  NAVEGACION: {
    titulo: "Tu espacio de trabajo",
    texto:
      "Calendario organiza fechas; Crear reúne agendas y actividades; Puntos muestra tu economía; Respaldo permite conservar tus datos. Tu nombre y saldo acompañan todas las páginas.",
  },
  LIBRE: {
    titulo: "Empieza en Libre",
    texto:
      "Libre está disponible desde el inicio y no se elimina. Todas reúne sus bloques con los de las agendas nombradas. Elegir un contexto filtra la vista; una actividad ocupa una fecha cuando le asignas un bloque.",
  },
  AGENDA_OPCIONAL: {
    titulo: "Una agenda es opcional",
    texto:
      "Usa Crear agenda si quieres separar trabajo, estudios u otro propósito. Puedes continuar usando Libre y pasar al siguiente paso sin crear una agenda.",
  },
  ACTIVIDAD: {
    titulo: "Define una actividad",
    texto:
      "Usa Crear actividad para definir qué harás y su tiempo necesario. Guardar sin programar la deja disponible para reutilizarla, sin ocupar ninguna fecha.",
    requisito:
      "Guarda una actividad o utiliza una que ya exista en el catálogo.",
    hito: "ACTIVIDAD_CREADA",
  },
  ASIGNACION: {
    titulo: "Elige cuándo realizarla",
    texto:
      "En Actividades para asignar, elige una fecha y usa Asignar. En el editor comprueba actividad, agenda, minutos y política antes de agregar el bloque. Arrastrar es opcional.",
    requisito: "Agrega un bloque o consulta una fecha donde ya tengas uno.",
    hito: "BLOQUE_ASIGNADO",
  },
  REVISION: {
    titulo: "Revisa tu selección",
    texto:
      "En la lista equivalente, selecciona los bloques editables y usa Revisar selección. Comprueba fechas, minutos y políticas antes de comprometerte; puedes cancelar la revisión.",
    requisito:
      "Abre la revisión de al menos un bloque editable, o consulta una planificación ya revisada.",
    hito: "REVISION_PREPARADA",
  },
  CONFIRMACION: {
    titulo: "Comprende la gracia",
    texto:
      "Confirmar revisión inicia diez minutos de gracia. Puedes corregir durante ese período; al vencer, el corte queda confirmado y protegido. Agregar un bloque y confirmar una revisión son acciones distintas.",
    requisito:
      "Confirma una revisión cuando estés de acuerdo, o consulta una planificación que ya esté en gracia o confirmada.",
    hito: "CORTE_ASIGNADO",
  },
  EJECUCION: {
    titulo: "Registra el resultado real",
    texto:
      "Cuando el bloque esté confirmado, usa sus acciones para completarlo o marcarlo incumplido. El modo cronometrado permite medir la sesión. Registra el resultado de lo que realizaste; la guía no lo decide por ti.",
    requisito:
      "Resuelve un bloque confirmado cuando corresponda, o consulta un resultado ya registrado. Puedes posponer la guía hasta entonces.",
    hito: "BLOQUE_RESUELTO",
  },
};
