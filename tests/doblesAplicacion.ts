import type { GeneradorIdentificadores, Reloj } from "../src/aplicacion";
import type { Identificador } from "../src/dominio";

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
