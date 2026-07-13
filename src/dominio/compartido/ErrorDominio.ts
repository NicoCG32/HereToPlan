export class ErrorDominio extends Error {
  public readonly codigo: string;

  constructor(codigo: string, mensaje: string) {
    super(mensaje);
    this.name = "ErrorDominio";
    this.codigo = codigo;
  }
}