import type {
  CortePlanificacion,
  EstadoCortePlanificacion,
} from "../../dominio";
import type { Reloj } from "../puertos/Reloj";
import type { RepositorioCortesPlanificacion } from "../puertos/RepositorioCortesPlanificacion";

export interface CortePlanificacionDto {
  readonly id: string;
  readonly estado: EstadoCortePlanificacion;
  readonly bloqueIds: readonly string[];
  readonly titulosBloques: readonly string[];
  readonly cantidadBloques: number;
  readonly creadoEn: string;
  readonly asignadaEn?: string;
  readonly confirmarAutomaticamenteEn?: string;
  readonly confirmadaEn?: string;
  readonly milisegundosRestantes?: number;
  readonly confirmacionMaterializada: boolean;
}

export class CasoDeUsoSincronizarCortesPlanificacion {
  constructor(
    private readonly repositorio: RepositorioCortesPlanificacion,
    private readonly reloj: Reloj,
  ) {}

  public async ejecutar(): Promise<readonly CortePlanificacionDto[]> {
    const ahora = this.reloj.ahora();
    const cortes = await this.repositorio.listar();
    const resultados: CortePlanificacionDto[] = [];

    for (const corte of cortes) {
      const confirmacionMaterializada = corte.actualizarSegunReloj(ahora);
      if (confirmacionMaterializada) {
        await this.repositorio.actualizar(corte);
      }
      resultados.push(
        convertirCortePlanificacionADto(
          corte,
          ahora,
          confirmacionMaterializada,
        ),
      );
    }

    return Object.freeze(
      resultados.sort((a, b) => {
        if (a.estado === "EN_GRACIA" && b.estado !== "EN_GRACIA") return -1;
        if (a.estado !== "EN_GRACIA" && b.estado === "EN_GRACIA") return 1;
        return compararInstantes(
          a.confirmarAutomaticamenteEn ?? a.creadoEn,
          b.confirmarAutomaticamenteEn ?? b.creadoEn,
        );
      }),
    );
  }
}

export function convertirCortePlanificacionADto(
  corte: CortePlanificacion,
  ahora: Date,
  confirmacionMaterializada = false,
): CortePlanificacionDto {
  const bloques = corte.listarBloques();
  const confirmarAutomaticamenteEn = corte.confirmarAutomaticamenteEn;
  const asignadaEn = corte.asignadaEn;
  const confirmadaEn = corte.confirmadaEn;
  return Object.freeze({
    id: corte.id,
    estado: corte.estado,
    bloqueIds: Object.freeze(bloques.map((bloque) => bloque.id)),
    titulosBloques: Object.freeze(bloques.map((bloque) => bloque.titulo)),
    cantidadBloques: bloques.length,
    creadoEn: corte.creadoEn.toISOString(),
    ...(asignadaEn ? { asignadaEn: asignadaEn.toISOString() } : {}),
    ...(confirmarAutomaticamenteEn
      ? {
          confirmarAutomaticamenteEn: confirmarAutomaticamenteEn.toISOString(),
          milisegundosRestantes: Math.max(
            0,
            confirmarAutomaticamenteEn.getTime() - ahora.getTime(),
          ),
        }
      : {}),
    ...(confirmadaEn ? { confirmadaEn: confirmadaEn.toISOString() } : {}),
    confirmacionMaterializada,
  });
}

function compararInstantes(primero: string, segundo: string): number {
  return new Date(primero).getTime() - new Date(segundo).getTime();
}
