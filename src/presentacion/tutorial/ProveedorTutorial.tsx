import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import type { PreferenciasTutorial } from "../../aplicacion/puertos/PreferenciasTutorial";
import {
  CargarPreferenciasTutorial,
  GuardarPreferenciasTutorial,
  type ProblemaPreferenciasTutorial,
  type ResultadoCargaTutorial,
} from "../../aplicacion/tutorial/GestionarPreferenciasTutorial";
import {
  ContextoTutorial,
  type HitoTutorial,
  type TutorialContextual,
} from "./ContextoTutorial";
import {
  cerrarTutorial,
  completarPasoTutorial,
  continuarTutorial,
  crearEstadoTutorial,
  iniciarTutorial,
  omitirTutorial,
  posponerTutorial,
  reiniciarTutorial,
  type EstadoTutorialV1,
} from "./RecorridoTutorial";

interface ProveedorTutorialProps {
  readonly children: ReactNode;
  readonly habilitado?: boolean;
  readonly preferencias?: PreferenciasTutorial;
}

export function ProveedorTutorial({
  children,
  habilitado = true,
  preferencias,
}: ProveedorTutorialProps) {
  const [inicio] = useState<ResultadoCargaTutorial>(() =>
    habilitado && preferencias
      ? new CargarPreferenciasTutorial(preferencias).ejecutar()
      : { tipo: "NUEVO", estado: crearEstadoTutorial() },
  );
  const estadoInicial =
    inicio.tipo === "NUEVO" || inicio.tipo === "VALIDO"
      ? inicio.estado
      : crearEstadoTutorial();
  const problemaInicial =
    inicio.tipo === "NUEVO" || inicio.tipo === "VALIDO" ? null : inicio.tipo;
  const [estado, setEstado] = useState(estadoInicial);
  const estadoActualRef = useRef(estadoInicial);
  const permiteGuardarRef = useRef(Boolean(preferencias) && !problemaInicial);
  const reinicioAutorizadoRef = useRef(false);
  const [visible, setVisible] = useState(
    Boolean(problemaInicial) ||
      estadoInicial.situacion === "NO_INICIADO" ||
      estadoInicial.situacion === "EN_CURSO",
  );
  const [recuperacion, setRecuperacion] =
    useState<ProblemaPreferenciasTutorial | null>(problemaInicial);
  const [errorGuardado, setErrorGuardado] = useState<string>();
  const [persistencia, setPersistencia] = useState<"LOCAL" | "TEMPORAL">(
    preferencias && !problemaInicial ? "LOCAL" : "TEMPORAL",
  );
  const [hitos, setHitos] = useState<ReadonlySet<HitoTutorial>>(
    () => new Set(),
  );

  const guardar = useCallback(
    (progreso: EstadoTutorialV1) => {
      if (!preferencias || !permiteGuardarRef.current) return;
      const resultado = new GuardarPreferenciasTutorial(preferencias).ejecutar(
        progreso,
        reinicioAutorizadoRef.current,
      );
      if (resultado.tipo === "GUARDADO") {
        reinicioAutorizadoRef.current = false;
        setErrorGuardado(undefined);
        setPersistencia("LOCAL");
      } else if (
        resultado.tipo === "INCOMPATIBLE" ||
        resultado.tipo === "INVALIDO"
      ) {
        permiteGuardarRef.current = false;
        setRecuperacion(resultado.tipo);
        setErrorGuardado(undefined);
        setPersistencia("TEMPORAL");
        setVisible(true);
      } else {
        setPersistencia("TEMPORAL");
        setErrorGuardado(
          "No se pudo guardar la guía. El avance actual sigue disponible durante esta sesión.",
        );
      }
    },
    [preferencias],
  );

  const transitar = useCallback(
    (operacion: (actual: EstadoTutorialV1) => EstadoTutorialV1) => {
      const actual = estadoActualRef.current;
      const siguiente = operacion(actual);
      if (siguiente === actual) return;
      estadoActualRef.current = siguiente;
      setEstado(siguiente);
      guardar(siguiente);
    },
    [guardar],
  );

  const informarHito = useCallback((hito: HitoTutorial) => {
    setHitos((actuales) =>
      actuales.has(hito) ? actuales : new Set([...actuales, hito]),
    );
  }, []);

  const valor = useMemo<TutorialContextual>(
    () => ({
      estado,
      visible,
      hitos,
      recuperacion,
      errorGuardado,
      persistencia,
      informarHito,
      iniciar: () => {
        if (recuperacion) return;
        transitar(iniciarTutorial);
        setVisible(true);
      },
      posponer: () => {
        if (recuperacion) return;
        transitar((actual) =>
          posponerTutorial(
            actual.situacion === "NO_INICIADO"
              ? iniciarTutorial(actual)
              : actual,
          ),
        );
        setVisible(false);
      },
      continuar: () => {
        if (recuperacion) return;
        transitar((actual) =>
          actual.situacion === "POSPUESTO" ? continuarTutorial(actual) : actual,
        );
        setVisible(true);
      },
      cerrar: () => {
        transitar(cerrarTutorial);
        setVisible(false);
      },
      omitir: () => {
        if (recuperacion) return;
        transitar(omitirTutorial);
        setVisible(false);
      },
      completar: (paso) => {
        if (!recuperacion)
          transitar((actual) => completarPasoTutorial(actual, paso));
      },
      mostrar: () => setVisible(true),
      reiniciar: () => {
        const nuevo = reiniciarTutorial();
        estadoActualRef.current = nuevo;
        setEstado(nuevo);
        setHitos(new Set());
        setRecuperacion(null);
        setErrorGuardado(undefined);
        setVisible(true);
        permiteGuardarRef.current = Boolean(preferencias);
        reinicioAutorizadoRef.current = true;
        guardar(nuevo);
      },
      usarTemporal: () => {
        permiteGuardarRef.current = false;
        reinicioAutorizadoRef.current = false;
        setRecuperacion(null);
        setErrorGuardado(undefined);
        setPersistencia("TEMPORAL");
        setVisible(true);
      },
      reintentarLectura: () => {
        if (!preferencias) return;
        const cargado = new CargarPreferenciasTutorial(preferencias).ejecutar();
        if (cargado.tipo === "NUEVO" || cargado.tipo === "VALIDO") {
          estadoActualRef.current = cargado.estado;
          setEstado(cargado.estado);
          setHitos(new Set());
          setRecuperacion(null);
          setErrorGuardado(undefined);
          permiteGuardarRef.current = true;
          setPersistencia("LOCAL");
          setVisible(
            cargado.estado.situacion === "NO_INICIADO" ||
              cargado.estado.situacion === "EN_CURSO",
          );
        } else {
          setRecuperacion(cargado.tipo);
        }
      },
      reintentarGuardado: () => guardar(estadoActualRef.current),
    }),
    [
      estado,
      visible,
      hitos,
      recuperacion,
      errorGuardado,
      persistencia,
      informarHito,
      transitar,
      guardar,
      preferencias,
    ],
  );

  return habilitado ? (
    <ContextoTutorial.Provider value={valor}>
      {children}
    </ContextoTutorial.Provider>
  ) : (
    children
  );
}
