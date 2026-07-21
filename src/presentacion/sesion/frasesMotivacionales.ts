export const FRASES_MOTIVACIONALES = Object.freeze([
  "Un plan claro convierte la intención en avance.",
  "Lo importante también merece un lugar en tu calendario.",
  "Planificar es decidir con anticipación dónde poner tu energía.",
  "Cada bloque completado sostiene un propósito mayor.",
  "Ajustar el plan también es parte de avanzar.",
] as const);

export type SelectorFraseMotivacional = (frases: readonly string[]) => string;

export function seleccionarFraseMotivacional(
  selector: SelectorFraseMotivacional = seleccionarAleatoriamente,
): string {
  const frase = selector(FRASES_MOTIVACIONALES);
  return FRASES_MOTIVACIONALES.includes(
    frase as (typeof FRASES_MOTIVACIONALES)[number],
  )
    ? frase
    : FRASES_MOTIVACIONALES[0];
}

function seleccionarAleatoriamente(frases: readonly string[]): string {
  return frases[Math.floor(Math.random() * frases.length)] ?? frases[0] ?? "";
}
