import {
  ErrorConflictoPersistenciaSesionCronometro,
  type RepositorioSesionesCronometro,
} from "../../../aplicacion";
import type { Identificador, SesionCronometro } from "../../../dominio";
import {
  convertirSesionCronometroEnV1,
  rehidratarSesionCronometroDesdeV1,
} from "../mapeadores/MapeadorSesionCronometroV1";
import type { SesionCronometroV1 } from "../registros/SesionCronometroV1";

export class RepositorioSesionesCronometroEnMemoria implements RepositorioSesionesCronometro {
  private registros = new Map<Identificador, SesionCronometroV1>();
  private cola: Promise<void> = Promise.resolve();

  public guardar(
    sesion: SesionCronometro,
    revisionEsperada: number,
  ): Promise<void> {
    const operacion = this.cola.then(() => {
      const registro = convertirSesionCronometroEnV1(sesion);
      const actual = this.registros.get(sesion.id);
      if (
        (actual && actual.revision !== revisionEsperada) ||
        (!actual && revisionEsperada !== 0)
      ) {
        throw new ErrorConflictoPersistenciaSesionCronometro();
      }
      for (const otro of this.registros.values()) {
        if (otro.id === sesion.id) continue;
        if (registro.claveAbierta && otro.claveAbierta) {
          throw new ErrorConflictoPersistenciaSesionCronometro();
        }
        if (
          registro.operacionesIds.some((id) => otro.operacionesIds.includes(id))
        ) {
          throw new ErrorConflictoPersistenciaSesionCronometro();
        }
      }
      const siguiente = new Map(this.registros);
      siguiente.set(sesion.id, registro);
      this.registros = siguiente;
    });
    this.cola = operacion.catch(() => undefined);
    return operacion;
  }

  public obtenerPorId(
    id: Identificador,
  ): Promise<SesionCronometro | undefined> {
    return Promise.resolve(this.rehidratar(this.registros.get(id)));
  }

  public obtenerPorOperacionId(
    operacionId: Identificador,
  ): Promise<SesionCronometro | undefined> {
    const registro = [...this.registros.values()].find((actual) =>
      actual.operacionesIds.includes(operacionId),
    );
    return Promise.resolve(this.rehidratar(registro));
  }

  public obtenerAbierta(): Promise<SesionCronometro | undefined> {
    const registro = [...this.registros.values()].find(
      ({ claveAbierta }) => claveAbierta === "ABIERTA",
    );
    return Promise.resolve(this.rehidratar(registro));
  }

  public listarPorBloque(
    bloqueId: Identificador,
  ): Promise<readonly SesionCronometro[]> {
    return Promise.resolve(
      [...this.registros.values()]
        .filter((registro) => registro.bloqueId === bloqueId)
        .map(rehidratarSesionCronometroDesdeV1),
    );
  }

  private rehidratar(
    registro: SesionCronometroV1 | undefined,
  ): SesionCronometro | undefined {
    return registro ? rehidratarSesionCronometroDesdeV1(registro) : undefined;
  }
}
