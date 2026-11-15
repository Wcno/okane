import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { estadoInicial, registrarGasto, type Estado } from '../data/sample'

export interface GastoNuevo {
  monto: number
  categoria: string
  cuentaId: string
}

interface Almacen {
  estado: Estado
  /** Última Cuenta usada: el siguiente Gasto la propone por defecto. */
  ultimaCuentaId: string
  /** Categoría del último Gasto registrado, para resaltar qué cambió. */
  categoriaReciente: string | null
  /** Cuántos Gastos se han registrado en esta sesión; reinicia el resaltado en cada uno. */
  registros: number
  /** Confirmación del último registro, con su consecuencia. */
  aviso: string | null
  registrar: (gasto: GastoNuevo, aviso: string) => void
  descartarAviso: () => void
  formularioAbierto: boolean
  abrirFormulario: () => void
  cerrarFormulario: () => void
}

const Contexto = createContext<Almacen | null>(null)

export function ProveedorDeDatos({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState(estadoInicial)
  const [ultimaCuentaId, setUltimaCuentaId] = useState('corriente')
  const [categoriaReciente, setCategoriaReciente] = useState<string | null>(null)
  const [registros, setRegistros] = useState(0)
  const [aviso, setAviso] = useState<string | null>(null)
  const [formularioAbierto, setFormularioAbierto] = useState(false)

  const registrar = useCallback((gasto: GastoNuevo, mensaje: string) => {
    setEstado((anterior) => registrarGasto(anterior, gasto))
    setUltimaCuentaId(gasto.cuentaId)
    setCategoriaReciente(gasto.categoria)
    setRegistros((cuenta) => cuenta + 1)
    setAviso(mensaje)
  }, [])

  const descartarAviso = useCallback(() => setAviso(null), [])
  const abrirFormulario = useCallback(() => setFormularioAbierto(true), [])
  const cerrarFormulario = useCallback(() => setFormularioAbierto(false), [])

  const valor = useMemo(
    () => ({
      estado,
      ultimaCuentaId,
      categoriaReciente,
      registros,
      aviso,
      registrar,
      descartarAviso,
      formularioAbierto,
      abrirFormulario,
      cerrarFormulario,
    }),
    [
      estado,
      ultimaCuentaId,
      categoriaReciente,
      registros,
      aviso,
      registrar,
      descartarAviso,
      formularioAbierto,
      abrirFormulario,
      cerrarFormulario,
    ],
  )

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useDatos() {
  const almacen = useContext(Contexto)
  if (!almacen) throw new Error('useDatos debe usarse dentro de ProveedorDeDatos')
  return almacen
}
