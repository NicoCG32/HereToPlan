import { descripcionCapaAplicacion } from "../aplicacion/descripcionCapaAplicacion";
import { descripcionCapaDominio } from "../dominio/descripcionCapaDominio";
import { descripcionCapaInfraestructura } from "../infraestructura/descripcionCapaInfraestructura";
import type { CapaDemostracion } from "../presentacion/componentes/PanelCapas";

export function obtenerCapasDemostracion(): readonly CapaDemostracion[] {
  return [
    {
      nombre: "Presentación",
      mensaje: "Esta es la capa de presentación.",
    },
    {
      nombre: "Aplicación",
      mensaje: descripcionCapaAplicacion,
    },
    {
      nombre: "Dominio",
      mensaje: descripcionCapaDominio,
    },
    {
      nombre: "Infraestructura",
      mensaje: descripcionCapaInfraestructura,
    },
  ];
}
