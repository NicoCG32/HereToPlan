import axe from "axe-core";
import { expect } from "vitest";

const criteriosWcag = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];

export async function comprobarAccesibilidad(
  contexto: Element = document.body,
): Promise<void> {
  const resultado = await axe.run(contexto, {
    runOnly: {
      type: "tag",
      values: criteriosWcag,
    },
    rules: {
      "color-contrast": { enabled: false },
    },
  });
  const defectos = resultado.violations.map((violacion) => ({
    regla: violacion.id,
    impacto: violacion.impact,
    descripcion: violacion.description,
    elementos: violacion.nodes.map((nodo) => nodo.target.join(" ")),
  }));

  expect(
    defectos,
    `La auditoría automática encontró defectos:\n${JSON.stringify(defectos, null, 2)}`,
  ).toEqual([]);
}
