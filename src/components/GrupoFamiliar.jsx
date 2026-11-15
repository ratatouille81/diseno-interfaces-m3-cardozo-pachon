// Grupo familiar en Perfil (pantalla 10 del prototipo): lista, agregar y quitar familiares.
// Componente de formulario con validación y de listado de datos.
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { descripcionFamiliar, listarFamiliares } from '../lib/familiares'
import Alerta from './Alerta'
import Cargando from './Cargando'
import DialogoConfirmacion from './DialogoConfirmacion'
import FormularioFamiliar from './FormularioFamiliar'

function GrupoFamiliar() {
  const [familiares, setFamiliares] = useState(null) // null = cargando
  const [errorCarga, setErrorCarga] = useState(null)
  const [version, setVersion] = useState(0)
  const [formAbierto, setFormAbierto] = useState(false)
  const [aviso, setAviso] = useState(null)
  const [porQuitar, setPorQuitar] = useState(null)
  const [quitando, setQuitando] = useState(false)

  useEffect(() => {
    let vigente = true
    listarFamiliares().then(({ data, error }) => {
      if (!vigente) return
      if (error) setErrorCarga('No pudimos cargar tu grupo familiar. Revisa tu conexión e intenta de nuevo.')
      else {
        setErrorCarga(null)
        setFamiliares(data)
      }
    })
    return () => { vigente = false }
  }, [version])

  // El formulario guarda el familiar; aquí solo se avisa y se recarga la lista
  function alGuardado(nuevo) {
    setAviso({ tipo: 'exito', texto: `${nuevo.nombre} quedó en tu grupo familiar. Ya puedes agendarle citas.` })
    setFormAbierto(false)
    setVersion((v) => v + 1)
  }

  async function quitar() {
    setQuitando(true)
    const { error } = await supabase.from('familiares').delete().eq('id', porQuitar.id)
    setQuitando(false)
    setPorQuitar(null)
    if (error) setAviso({ tipo: 'error', texto: 'No pudimos quitar al familiar. Intenta de nuevo.' })
    else {
      setAviso({ tipo: 'exito', texto: `${porQuitar.nombre} ya no está en tu grupo familiar. Sus citas se conservan.` })
      setVersion((v) => v + 1)
    }
  }

  return (
    <section aria-labelledby="titulo-familia" className="mb-5">
      <h2 id="titulo-familia" className="h6 fw-bold mb-1">Grupo familiar</h2>
      <p className="small text-secondary mb-3">Las personas a las que les agendas citas. Aparecen como opción en el primer paso.</p>

      {aviso && <Alerta tipo={aviso.tipo}>{aviso.texto}</Alerta>}
      {errorCarga && <Alerta tipo="error">{errorCarga}</Alerta>}

      {familiares === null && !errorCarga ? (
        <Cargando texto="Cargando tu grupo familiar…" />
      ) : (
        <ul className="list-unstyled mb-3">
          {(familiares ?? []).map((f) => (
            <li key={f.id} className="tarjeta-opcion" style={{ cursor: 'default' }}>
              <span className="tarjeta-inicial" aria-hidden="true">{f.nombre.charAt(0).toUpperCase()}</span>
              <span className="flex-grow-1">
                <span className="d-block fw-semibold">{f.nombre}</span>
                <span className="d-block small text-secondary">{descripcionFamiliar(f)}</span>
              </span>
              <button type="button" className="btn btn-link boton-enlace p-0" onClick={() => setPorQuitar(f)}
                aria-label={`Quitar a ${f.nombre}`}>
                Quitar
              </button>
            </li>
          ))}
          {familiares?.length === 0 && <li className="text-secondary mb-2">Aún no has agregado familiares.</li>}
        </ul>
      )}

      {formAbierto ? (
        <FormularioFamiliar prefijo="perfil-familiar" alGuardado={alGuardado} alCancelar={() => setFormAbierto(false)} />
      ) : (
        <button type="button" className="btn btn-outline-primary btn-lg w-100" onClick={() => { setFormAbierto(true); setAviso(null) }}>
          Agregar familiar
        </button>
      )}

      <DialogoConfirmacion
        abierto={Boolean(porQuitar)}
        titulo="¿Quitar a este familiar?"
        textoConfirmar="Sí, quitar"
        textoCancelar="No, mantenerlo"
        procesando={quitando}
        alConfirmar={quitar}
        alCerrar={() => setPorQuitar(null)}
      >
        {porQuitar && (
          <p className="mb-0">
            {porQuitar.nombre} ya no aparecerá al agendar. Las citas que ya tiene se conservan.
          </p>
        )}
      </DialogoConfirmacion>
    </section>
  )
}

export default GrupoFamiliar
