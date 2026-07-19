import { describe, expect, it, vi } from "vitest";
import {
  CasoDeUsoSincronizarCortesPlanificacion,
  type Reloj,
} from "../src/aplicacion";
import { RepositorioCortesPlanificacionEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioCortesPlanificacionEnMemoria";
import {
  CORTE_CONFIRMAR_EN,
  crearCorteEnGracia,
} from "./contratoRepositorioCortesPlanificacion";
import { RelojFijo } from "./doblesAplicacion";

describe("sincronización de cortes de planificación", () => {
  it("deriva la cuenta restante de una única lectura del reloj y del vencimiento", async () => {
    const repositorio = new RepositorioCortesPlanificacionEnMemoria();
    await repositorio.guardar(crearCorteEnGracia("corte-activo"));
    const reloj = new RelojContado(new Date("2026-07-20T10:09:00.000Z"));

    const resultado = await new CasoDeUsoSincronizarCortesPlanificacion(
      repositorio,
      reloj,
    ).ejecutar();

    expect(reloj.lecturas).toBe(1);
    expect(resultado).toHaveLength(1);
    expect(resultado[0]).toMatchObject({
      id: "corte-activo",
      estado: "EN_GRACIA",
      cantidadBloques: 1,
      milisegundosRestantes: 60_000,
      confirmacionMaterializada: false,
    });
    expect(resultado[0]?.confirmarAutomaticamenteEn).toBe(
      CORTE_CONFIRMAR_EN.toISOString(),
    );
    expect(Object.isFrozen(resultado)).toBe(true);
    expect(Object.isFrozen(resultado[0]?.titulosBloques)).toBe(true);
  });

  it("materializa y persiste la confirmación al alcanzar el vencimiento", async () => {
    const repositorio = new RepositorioCortesPlanificacionEnMemoria();
    await repositorio.guardar(crearCorteEnGracia("corte-vencido"));
    const actualizar = vi.spyOn(repositorio, "actualizar");
    const reloj = new RelojFijo(CORTE_CONFIRMAR_EN);
    const casoDeUso = new CasoDeUsoSincronizarCortesPlanificacion(
      repositorio,
      reloj,
    );

    const [resultado] = await casoDeUso.ejecutar();

    expect(resultado).toMatchObject({
      estado: "CONFIRMADA",
      milisegundosRestantes: 0,
      confirmadaEn: CORTE_CONFIRMAR_EN.toISOString(),
      confirmacionMaterializada: true,
    });
    expect(actualizar).toHaveBeenCalledTimes(1);
    await expect(
      repositorio.obtenerPorId("corte-vencido"),
    ).resolves.toMatchObject({ estado: "CONFIRMADA" });
  });

  it("es idempotente después de persistir la confirmación", async () => {
    const repositorio = new RepositorioCortesPlanificacionEnMemoria();
    await repositorio.guardar(crearCorteEnGracia("corte-idempotente"));
    const actualizar = vi.spyOn(repositorio, "actualizar");
    const reloj = new RelojFijo(new Date("2026-07-20T10:30:00.000Z"));
    const casoDeUso = new CasoDeUsoSincronizarCortesPlanificacion(
      repositorio,
      reloj,
    );

    const primera = await casoDeUso.ejecutar();
    const segunda = await casoDeUso.ejecutar();

    expect(primera[0]?.confirmacionMaterializada).toBe(true);
    expect(segunda[0]?.confirmacionMaterializada).toBe(false);
    expect(segunda[0]?.confirmadaEn).toBe(CORTE_CONFIRMAR_EN.toISOString());
    expect(actualizar).toHaveBeenCalledTimes(1);
  });
});

class RelojContado implements Reloj {
  public lecturas = 0;

  constructor(private readonly instante: Date) {}

  public ahora(): Date {
    this.lecturas += 1;
    return new Date(this.instante);
  }
}
