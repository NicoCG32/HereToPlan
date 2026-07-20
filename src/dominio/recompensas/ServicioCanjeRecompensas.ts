import type { Agenda } from "../agendas/Agenda";
import { ErrorDominio } from "../compartido/ErrorDominio";
import type { FechaLocal } from "../compartido/FechaLocal";
import type { Identificador } from "../compartido/tipos";
import { exigirIdentificador } from "../compartido/validaciones";
import { AjusteCompromiso } from "../compromisos/AjusteCompromiso";
import type { BilleteraPuntos } from "../puntos/BilleteraPuntos";
import { TransaccionPuntos } from "../puntos/TransaccionPuntos";
import { CanjeRecompensa } from "./CanjeRecompensa";
import type { DefinicionRecompensa } from "./DefinicionRecompensa";

interface SolicitudDiaLibre {
  idCanje: Identificador;
  idTransaccion: Identificador;
  crearIdAjuste: (
    agendaId: Identificador,
    bloqueId: Identificador,
  ) => Identificador;
  recompensa: DefinicionRecompensa;
  billetera: BilleteraPuntos;
  agendas: readonly Agenda[];
  fechaObjetivo: FechaLocal;
  fechaActual: FechaLocal;
  fechaCanje: Date;
}

export interface AjustesAgendaPreparados {
  agendaId: Identificador;
  ajustes: readonly AjusteCompromiso[];
}

export interface ResultadoCanjeDiaLibre {
  canje: CanjeRecompensa;
  gasto: TransaccionPuntos;
  ajustesPorAgenda: readonly AjustesAgendaPreparados[];
}

export class ServicioCanjeRecompensas {
  public prepararCanjeDiaLibre(
    solicitud: SolicitudDiaLibre,
  ): ResultadoCanjeDiaLibre {
    if (solicitud.recompensa.tipoEfecto !== "DIA_LIBRE") {
      throw new ErrorDominio(
        "RECOMPENSA_INCORRECTA",
        "La recompensa indicada no corresponde a un día libre.",
      );
    }
    if (!solicitud.fechaObjetivo.esPosteriorA(solicitud.fechaActual)) {
      throw new ErrorDominio(
        "DIA_LIBRE_FUERA_DE_VENTANA",
        "El día libre debe canjearse para una fecha local posterior al día actual.",
      );
    }
    if (solicitud.billetera.saldo < solicitud.recompensa.costoPuntos) {
      throw new ErrorDominio(
        "SALDO_INSUFICIENTE",
        "No existen puntos suficientes para canjear el día libre.",
      );
    }

    const elegibles = solicitud.agendas.flatMap((agenda) =>
      agenda
        .listarBloquesElegibles(solicitud.fechaObjetivo, "EXCUSAR")
        .map((bloque) => ({ agenda, bloque })),
    );

    if (elegibles.length === 0) {
      throw new ErrorDominio(
        "DIA_LIBRE_SIN_COMPROMISOS_ELEGIBLES",
        "No existen compromisos flexibles elegibles en la fecha seleccionada.",
      );
    }

    const bloquesAfectados = elegibles.map(({ bloque }) => bloque.id);
    if (new Set(bloquesAfectados).size !== bloquesAfectados.length) {
      throw new ErrorDominio(
        "BLOQUES_GLOBALES_DUPLICADOS",
        "Los identificadores de bloque deben ser únicos entre agendas.",
      );
    }

    const canje = new CanjeRecompensa({
      id: solicitud.idCanje,
      recompensaId: solicitud.recompensa.id,
      puntosGastados: solicitud.recompensa.costoPuntos,
      canjeadoEn: solicitud.fechaCanje,
      fechaObjetivo: solicitud.fechaObjetivo,
      bloquesAfectados,
    });

    const gasto = new TransaccionPuntos({
      id: solicitud.idTransaccion,
      tipo: "GASTO",
      cantidad: solicitud.recompensa.costoPuntos,
      fuenteTipo: "CANJE_RECOMPENSA",
      fuenteId: canje.id,
      descripcion: `Canje de recompensa: ${solicitud.recompensa.nombre}`,
      ocurridaEn: solicitud.fechaCanje,
    });

    const agrupados = new Map<Identificador, AjusteCompromiso[]>();
    for (const { agenda, bloque } of elegibles) {
      const ajuste = new AjusteCompromiso({
        id: exigirIdentificador(
          solicitud.crearIdAjuste(agenda.id, bloque.id),
          "identificador generado de ajuste",
        ),
        bloqueId: bloque.id,
        canjeRecompensaId: canje.id,
        tipo: "EXCUSAR",
        aplicadoEn: solicitud.fechaCanje,
      });
      const actuales = agrupados.get(agenda.id) ?? [];
      actuales.push(ajuste);
      agrupados.set(agenda.id, actuales);
    }

    return {
      canje,
      gasto,
      ajustesPorAgenda: [...agrupados.entries()].map(([agendaId, ajustes]) => ({
        agendaId,
        ajustes,
      })),
    };
  }
}
