import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { PerfilUsuarioDto } from "../../aplicacion";
import type { ServiciosPerfil } from "../perfil/ServiciosPerfil";
import type { ServiciosPuntos } from "../puntos/ServiciosPuntos";
import { DialogoPerfilUsuario } from "./DialogoPerfilUsuario";
import {
  seleccionarFraseMotivacional,
  type SelectorFraseMotivacional,
} from "./frasesMotivacionales";
import {
  ContextoSesion,
  type EstadoCargaSesion,
  type SesionAplicacion,
} from "./ContextoSesionAplicacion";

interface ProveedorSesionAplicacionProps {
  readonly children: ReactNode;
  readonly serviciosPerfil?: ServiciosPerfil;
  readonly serviciosPuntos?: ServiciosPuntos;
  readonly selectorFrase?: SelectorFraseMotivacional;
}

export function ProveedorSesionAplicacion({
  children,
  serviciosPerfil,
  serviciosPuntos,
  selectorFrase,
}: ProveedorSesionAplicacionProps) {
  const [perfil, setPerfil] = useState<PerfilUsuarioDto>();
  const [saldoPuntos, setSaldoPuntos] = useState(0);
  const [carga, setCarga] = useState<EstadoCargaSesion>(
    serviciosPerfil || serviciosPuntos ? "CARGANDO" : "LISTA",
  );
  const [error, setError] = useState<string>();
  const [revisionDatos, setRevisionDatos] = useState(0);
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [frase] = useState(() => seleccionarFraseMotivacional(selectorFrase));
  const origenEdicionRef = useRef<HTMLElement | undefined>(undefined);

  const consultarPerfil = useCallback(async () => {
    if (!serviciosPerfil) return;
    setPerfil(await serviciosPerfil.consultar.ejecutar());
  }, [serviciosPerfil]);

  const consultarSaldo = useCallback(async () => {
    if (!serviciosPuntos) return;
    const billetera = await serviciosPuntos.consultarBilletera.ejecutar();
    setSaldoPuntos(billetera.saldo);
  }, [serviciosPuntos]);

  const refrescarProyecciones = useCallback(async () => {
    setCarga("CARGANDO");
    setError(undefined);
    try {
      await Promise.all([consultarPerfil(), consultarSaldo()]);
      setRevisionDatos((actual) => actual + 1);
      setCarga("LISTA");
    } catch (causa: unknown) {
      setError(
        causa instanceof Error
          ? causa.message
          : "No fue posible actualizar el resumen personal.",
      );
      setCarga("ERROR");
    }
  }, [consultarPerfil, consultarSaldo]);

  useEffect(() => {
    let activo = true;
    if (!serviciosPerfil && !serviciosPuntos) return;
    Promise.all([
      serviciosPerfil?.consultar.ejecutar(),
      serviciosPuntos?.consultarBilletera.ejecutar(),
    ]).then(
      ([perfilConsultado, billetera]) => {
        if (!activo) return;
        setPerfil(perfilConsultado);
        setSaldoPuntos(billetera?.saldo ?? 0);
        setCarga("LISTA");
      },
      (causa: unknown) => {
        if (!activo) return;
        setError(
          causa instanceof Error
            ? causa.message
            : "No fue posible iniciar la sesión local.",
        );
        setCarga("ERROR");
      },
    );
    return () => {
      activo = false;
    };
  }, [serviciosPerfil, serviciosPuntos]);

  const cerrarEdicion = useCallback(() => {
    setEditandoPerfil(false);
    queueMicrotask(() => origenEdicionRef.current?.focus());
  }, []);

  const valor: SesionAplicacion = {
    ...(perfil ? { perfil } : {}),
    saldoPuntos,
    carga,
    ...(error ? { error } : {}),
    revisionDatos,
    frase,
    identidadDisponible: Boolean(serviciosPerfil),
    abrirEdicionPerfil: (origen) => {
      origenEdicionRef.current = origen;
      setEditandoPerfil(true);
    },
    refrescarPerfil: consultarPerfil,
    refrescarProyecciones,
    notificarDatosCambiados: () => {
      setRevisionDatos((actual) => actual + 1);
      void consultarSaldo();
    },
  };

  return (
    <ContextoSesion.Provider value={valor}>
      {children}
      {serviciosPerfil && carga === "LISTA" && !perfil && (
        <DialogoPerfilUsuario
          modo="BIENVENIDA"
          onGuardar={async (nombre) => {
            const resultado = await serviciosPerfil.crear.ejecutar(nombre);
            if (resultado.exito) setPerfil(resultado.perfil);
            return resultado;
          }}
        />
      )}
      {serviciosPerfil && perfil && editandoPerfil && (
        <DialogoPerfilUsuario
          modo="EDICION"
          nombreInicial={perfil.nombreVisible}
          onCancelar={cerrarEdicion}
          onGuardar={async (nombre) => {
            const resultado = await serviciosPerfil.actualizar.ejecutar(nombre);
            if (resultado.exito) {
              setPerfil(resultado.perfil);
              cerrarEdicion();
            }
            return resultado;
          }}
        />
      )}
    </ContextoSesion.Provider>
  );
}
