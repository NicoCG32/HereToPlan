import type {
  GeneradorIdentificadores,
  Reloj,
  RepositorioAgendas,
} from "../src/aplicacion";
import { ErrorAgendaDuplicada } from "../src/aplicacion";
import type { Agenda, Identificador } from "../src/dominio";

export class RelojFijo implements Reloj {
  private instante: Date;

  constructor(instante: Date) {
    this.instante = new Date(instante);
  }

  public ahora(): Date {
    return new Date(this.instante);
  }

  public establecer(instante: Date): void {
    this.instante = new Date(instante);
  }
}

export class GeneradorIdentificadoresPredefinidos implements GeneradorIdentificadores {
  private readonly identificadores: Identificador[];

  constructor(identificadores: readonly Identificador[]) {
    this.identificadores = [...identificadores];
  }

  public generar(): Identificador {
    const identificador = this.identificadores.shift();
    if (identificador === undefined) {
      throw new Error("No quedan identificadores predefinidos.");
    }
    return identificador;
  }
}

export class RepositorioAgendasEnMemoriaParaPruebas implements RepositorioAgendas {
  private readonly agendas = new Map<Identificador, Agenda>();

  public guardar(agenda: Agenda): Promise<void> {
    if (this.agendas.has(agenda.id)) {
      return Promise.reject(new ErrorAgendaDuplicada(agenda.id));
    }
    this.agendas.set(agenda.id, agenda);
    return Promise.resolve();
  }

  public obtenerPorId(id: Identificador): Promise<Agenda | undefined> {
    return Promise.resolve(this.agendas.get(id));
  }
}
