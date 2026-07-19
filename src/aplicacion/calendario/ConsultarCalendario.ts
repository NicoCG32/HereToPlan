import {
  FechaLocal,
  type Agenda,
  type BloquePlanificacion,
  type CortePlanificacion,
  type ContextoPlanificacion,
} from "../../dominio";
import { convertirActividadADto } from "../actividades/ActividadDto";
import { convertirContextoADto } from "../contextos/ContextoPlanificacionDto";
import type { CalendarioLocal } from "../puertos/CalendarioLocal";
import type { RepositorioActividades } from "../puertos/RepositorioActividades";
import type { RepositorioAgendas } from "../puertos/RepositorioAgendas";
import type { RepositorioBloquesPlanificacion } from "../puertos/RepositorioBloquesPlanificacion";
import type { RepositorioContextosPlanificacion } from "../puertos/RepositorioContextosPlanificacion";
import type { RepositorioCortesPlanificacion } from "../puertos/RepositorioCortesPlanificacion";
import type {
  BloqueCalendarioDto,
  CalendarioDto,
  DiaProximoCalendarioDto,
  RangoVisibleCalendarioDto,
  SeleccionContextoCalendarioDto,
  VistaTemporalCalendario,
} from "./CalendarioDto";

export type SeleccionContextoCalendario =
  | Readonly<{ tipo: "TODAS" }>
  | Readonly<{ tipo: "CONTEXTO"; contextoId: string }>;

export interface ConsultaCalendario {
  readonly seleccion: SeleccionContextoCalendario;
  readonly vistaTemporal: VistaTemporalCalendario;
  readonly fechaAncla: string;
  readonly diaSeleccionado?: string;
}

export class ErrorConsultaCalendario extends Error {
  constructor(
    public readonly codigo:
      | "CONTEXTO_SELECCIONADO_NO_ENCONTRADO"
      | "CONTEXTO_DE_AGENDA_NO_ENCONTRADO",
    mensaje: string,
  ) {
    super(mensaje);
    this.name = "ErrorConsultaCalendario";
  }
}

export class CasoDeUsoConsultarCalendario {
  constructor(
    private readonly repositorioContextos: RepositorioContextosPlanificacion,
    private readonly repositorioActividades: RepositorioActividades,
    private readonly repositorioAgendas: RepositorioAgendas,
    private readonly repositorioBloques: RepositorioBloquesPlanificacion,
    private readonly repositorioCortes: RepositorioCortesPlanificacion,
    private readonly calendarioLocal: CalendarioLocal,
  ) {}

  public async ejecutar(consulta: ConsultaCalendario): Promise<CalendarioDto> {
    const fechaAncla = FechaLocal.crear(consulta.fechaAncla);
    const diaSeleccionado = consulta.diaSeleccionado
      ? FechaLocal.crear(consulta.diaSeleccionado)
      : undefined;
    const [contextos, actividades, agendas, bloquesPlanificacion, cortes] =
      await Promise.all([
        this.repositorioContextos.listar(),
        this.repositorioActividades.listar(),
        this.repositorioAgendas.listar(),
        this.repositorioBloques.listar(),
        this.repositorioCortes.listar(),
      ]);
    const protecciones = construirProtecciones(cortes);
    const hoy = this.calendarioLocal.hoy();
    const contextosOrdenados = this.ordenarContextos(contextos);
    const seleccion = this.resolverSeleccion(
      consulta.seleccion,
      contextosOrdenados,
    );
    const bloquesSeleccionados = Object.freeze(
      [
        ...this.proyectarBloques(
          agendas,
          contextosOrdenados,
          consulta.seleccion,
        ),
        ...this.proyectarBloquesPlanificacion(
          bloquesPlanificacion,
          contextosOrdenados,
          consulta.seleccion,
          protecciones,
        ),
      ].sort(
        (a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id),
      ),
    );
    const rangoVisible = calcularRangoVisible(
      consulta.vistaTemporal,
      fechaAncla,
    );
    const bloquesVisibles = Object.freeze(
      bloquesSeleccionados.filter((bloque) =>
        estaDentroDelRango(bloque.fecha, rangoVisible),
      ),
    );
    const proximosSieteDias = this.proyectarProximosSieteDias(
      hoy,
      bloquesSeleccionados,
    );

    const actividadesOrdenadas = [...actividades]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(convertirActividadADto);
    const actividadesProgramadas = new Set([
      ...agendas.flatMap((agenda) =>
        agenda.listarBloques().map((bloque) => bloque.actividadId),
      ),
      ...bloquesPlanificacion.map((bloque) => bloque.actividadId),
    ]);

    return Object.freeze({
      seleccion,
      vistaTemporal: consulta.vistaTemporal,
      rangoVisible,
      ...(diaSeleccionado
        ? { diaSeleccionado: diaSeleccionado.toString() }
        : {}),
      hoy: hoy.toString(),
      contextos: Object.freeze(contextosOrdenados.map(convertirContextoADto)),
      actividadesAsignables: Object.freeze(actividadesOrdenadas),
      actividadesSinProgramar: Object.freeze(
        actividadesOrdenadas.filter(
          (actividad) => !actividadesProgramadas.has(actividad.id),
        ),
      ),
      bloquesVisibles,
      listaEquivalente: bloquesVisibles,
      proximosSieteDias,
      resumenSeleccion: Object.freeze({
        cantidadBloques: bloquesSeleccionados.length,
        minutosPlanificados: bloquesSeleccionados.reduce(
          (total, bloque) => total + bloque.minutosPlanificados,
          0,
        ),
      }),
    });
  }

  private ordenarContextos(
    contextos: readonly ContextoPlanificacion[],
  ): readonly ContextoPlanificacion[] {
    return [...contextos].sort((a, b) => {
      if (a.esLibre()) return -1;
      if (b.esLibre()) return 1;
      return a.id.localeCompare(b.id);
    });
  }

  private resolverSeleccion(
    seleccion: SeleccionContextoCalendario,
    contextos: readonly ContextoPlanificacion[],
  ): SeleccionContextoCalendarioDto {
    if (seleccion.tipo === "TODAS") {
      return Object.freeze({ tipo: "TODAS", nombre: "Todas" });
    }
    const contexto = contextos.find(
      (candidato) => candidato.id === seleccion.contextoId,
    );
    if (!contexto) {
      throw new ErrorConsultaCalendario(
        "CONTEXTO_SELECCIONADO_NO_ENCONTRADO",
        `No existe el contexto seleccionado ${seleccion.contextoId}.`,
      );
    }
    return Object.freeze({
      tipo: "CONTEXTO",
      contextoId: contexto.id,
      nombre: contexto.nombre,
      tipoContexto: contexto.tipo,
    });
  }

  private proyectarBloques(
    agendas: readonly Agenda[],
    contextos: readonly ContextoPlanificacion[],
    seleccion: SeleccionContextoCalendario,
  ): readonly BloqueCalendarioDto[] {
    const contextosPorId = new Map(
      contextos.map((contexto) => [contexto.id, contexto] as const),
    );
    const bloques = agendas.flatMap((agenda) => {
      const contexto = contextosPorId.get(agenda.id);
      if (seleccion.tipo === "CONTEXTO" && seleccion.contextoId !== agenda.id) {
        return [];
      }
      const origen = contexto
        ? Object.freeze({
            contextoId: contexto.id,
            nombreContexto: contexto.nombre,
            tipoContexto: contexto.tipo,
          })
        : Object.freeze({
            contextoId: agenda.id,
            nombreContexto: `${agenda.nombre} (agenda eliminada)`,
            tipoContexto: "NOMBRADO" as const,
          });
      return agenda.listarBloques().map((bloque) =>
        Object.freeze({
          id: bloque.id,
          actividadId: bloque.actividadId,
          titulo: bloque.titulo,
          fecha: bloque.fecha.toString(),
          minutosPlanificados: bloque.minutosPlanificados,
          estado: bloque.estado,
          origen,
          politica: Object.freeze({
            rigidez: bloque.politica.rigidez,
            autoridadPlazo: bloque.politica.autoridadPlazo,
            ajustesPermitidos: Object.freeze([
              ...bloque.politica.ajustesPermitidos,
            ]),
          }),
          editable: false,
        }),
      );
    });
    return Object.freeze(
      bloques.sort(
        (a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id),
      ),
    );
  }

  private proyectarBloquesPlanificacion(
    bloques: readonly BloquePlanificacion[],
    contextos: readonly ContextoPlanificacion[],
    seleccion: SeleccionContextoCalendario,
    protecciones: ReadonlyMap<
      string,
      Readonly<{ corteId: string; estado: "EN_GRACIA" | "CONFIRMADA" }>
    >,
  ): readonly BloqueCalendarioDto[] {
    const contextosPorId = new Map(
      contextos.map((contexto) => [contexto.id, contexto] as const),
    );
    return Object.freeze(
      bloques.flatMap((bloque) => {
        const contexto = contextosPorId.get(bloque.contextoId);
        if (!contexto) {
          throw new ErrorConsultaCalendario(
            "CONTEXTO_DE_AGENDA_NO_ENCONTRADO",
            `El bloque ${bloque.id} no posee un contexto de planificación.`,
          );
        }
        if (
          seleccion.tipo === "CONTEXTO" &&
          seleccion.contextoId !== contexto.id
        ) {
          return [];
        }
        const proteccion = protecciones.get(bloque.id);
        return [
          Object.freeze({
            id: bloque.id,
            actividadId: bloque.actividadId,
            titulo: bloque.titulo,
            fecha: bloque.fecha.toString(),
            minutosPlanificados: bloque.minutosPlanificados,
            estado: "PENDIENTE" as const,
            origen: Object.freeze({
              contextoId: contexto.id,
              nombreContexto: contexto.nombre,
              tipoContexto: contexto.tipo,
            }),
            politica: Object.freeze({
              rigidez: bloque.politica.rigidez,
              autoridadPlazo: bloque.politica.autoridadPlazo,
              ajustesPermitidos: Object.freeze([
                ...bloque.politica.ajustesPermitidos,
              ]),
            }),
            editable: proteccion === undefined,
            ...(proteccion ? { proteccion } : {}),
          }),
        ];
      }),
    );
  }

  private proyectarProximosSieteDias(
    hoy: FechaLocal,
    bloques: readonly BloqueCalendarioDto[],
  ): readonly DiaProximoCalendarioDto[] {
    return Object.freeze(
      Array.from({ length: 7 }, (_, desplazamiento) => {
        const fecha = sumarDias(hoy, desplazamiento).toString();
        const bloquesDelDia = Object.freeze(
          bloques.filter((bloque) => bloque.fecha === fecha),
        );
        return Object.freeze({
          fecha,
          esHoy: desplazamiento === 0,
          bloques: bloquesDelDia,
          minutosPlanificados: bloquesDelDia.reduce(
            (total, bloque) => total + bloque.minutosPlanificados,
            0,
          ),
        });
      }),
    );
  }
}

function construirProtecciones(
  cortes: readonly CortePlanificacion[],
): ReadonlyMap<
  string,
  Readonly<{ corteId: string; estado: "EN_GRACIA" | "CONFIRMADA" }>
> {
  const protecciones = new Map<
    string,
    Readonly<{ corteId: string; estado: "EN_GRACIA" | "CONFIRMADA" }>
  >();
  for (const corte of cortes) {
    if (corte.estado !== "EN_GRACIA" && corte.estado !== "CONFIRMADA") {
      continue;
    }
    for (const bloque of corte.listarBloques()) {
      protecciones.set(
        bloque.id,
        Object.freeze({ corteId: corte.id, estado: corte.estado }),
      );
    }
  }
  return protecciones;
}

export function calcularRangoVisible(
  vista: VistaTemporalCalendario,
  fechaAncla: FechaLocal,
): RangoVisibleCalendarioDto {
  if (vista === "DIA") {
    return congelarRango(fechaAncla, fechaAncla);
  }
  if (vista === "SEMANA") {
    const inicio = sumarDias(fechaAncla, 1 - fechaAncla.obtenerDiaSemanaIso());
    return congelarRango(inicio, sumarDias(inicio, 6));
  }
  const valorAncla = fechaAncla.toString();
  const anio = Number(valorAncla.slice(0, 4));
  const mes = Number(valorAncla.slice(5, 7));
  const inicio = FechaLocal.crear(
    `${String(anio).padStart(4, "0")}-${String(mes).padStart(2, "0")}-01`,
  );
  const ultimoDia = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const fin = FechaLocal.crear(
    `${String(anio).padStart(4, "0")}-${String(mes).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`,
  );
  return congelarRango(inicio, fin);
}

function congelarRango(
  inicio: FechaLocal,
  fin: FechaLocal,
): RangoVisibleCalendarioDto {
  return Object.freeze({
    fechaInicio: inicio.toString(),
    fechaFin: fin.toString(),
  });
}

function sumarDias(fecha: FechaLocal, cantidad: number): FechaLocal {
  const valor = fecha.toString();
  const anio = Number(valor.slice(0, 4));
  const mes = Number(valor.slice(5, 7));
  const dia = Number(valor.slice(8, 10));
  const instante = new Date(Date.UTC(anio, mes - 1, dia + cantidad));
  return FechaLocal.crear(
    `${String(instante.getUTCFullYear()).padStart(4, "0")}-${String(instante.getUTCMonth() + 1).padStart(2, "0")}-${String(instante.getUTCDate()).padStart(2, "0")}`,
  );
}

function estaDentroDelRango(
  fecha: string,
  rango: RangoVisibleCalendarioDto,
): boolean {
  return fecha >= rango.fechaInicio && fecha <= rango.fechaFin;
}
