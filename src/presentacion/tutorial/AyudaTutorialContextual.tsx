import { useTutorial } from "./ContextoTutorial";
import { INDICACIONES_TUTORIAL } from "./IndicacionesTutorial";
import type { IdPasoTutorial } from "./RecorridoTutorial";

export function AyudaTutorialContextual({
  pasos,
}: {
  readonly pasos: readonly IdPasoTutorial[];
}) {
  const tutorial = useTutorial();
  const paso = tutorial?.estado.pasoActual;
  if (
    !tutorial?.visible ||
    tutorial.recuperacion ||
    tutorial.estado.situacion !== "EN_CURSO" ||
    !paso ||
    !pasos.includes(paso)
  )
    return null;
  return (
    <p className="ayuda-tutorial-contextual" role="note">
      <strong>Guía: {INDICACIONES_TUTORIAL[paso].titulo}.</strong>{" "}
      {INDICACIONES_TUTORIAL[paso].texto}
    </p>
  );
}
