import type { Reloj } from "../../aplicacion";

export class RelojSistema implements Reloj {
  public ahora(): Date {
    return new Date();
  }
}
