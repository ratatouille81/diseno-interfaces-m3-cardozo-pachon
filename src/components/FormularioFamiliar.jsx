// Formulario para agregar un familiar al grupo (componente de formulario con validación).
// Se usa en Perfil (Grupo familiar) y, desde el módulo 3, también en el paso 1 del agendamiento
// (mejora N1: agregar al familiar sin salir del agendamiento ni perder lo elegido).
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { diaISO } from '../lib/formato'
import { PARENTESCOS } from '../lib/familiares'
import Alerta from './Alerta'

const VACIO = { nombre: '', parentesco: '', fechaNacimiento: '' }

function validar(datos) {
  const errores = {}
  const nombre = datos.nombre.trim()
  if (nombre.length < 3) errores.nombre = 'Escribe el nombre completo (mínimo 3 letras).'
  else if (nombre.length > 80) errores.nombre = 'El nombre es muy largo. Usa máximo 80 caracteres.'
  if (!datos.parentesco) errores.parentesco = 'Elige el parentesco.'
  if (datos.fechaNacimiento && datos.fechaNacimiento > diaISO(0)) errores.fechaNacimiento = 'La fecha de nacimiento no puede ser futura.'
  return errores
}

// "prefijo" evita ids repetidos si el formulario aparece en dos lugares.
// alGuardado recibe el familiar creado ({ id, nombre, parentesco, fecha_nacimiento }).
function FormularioFamiliar({ prefijo = 'familiar', alGuardado, alCancelar }) {
  const [datos, setDatos] = useState(VACIO)
  const [errores, setErrores] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState(null)

  const cambiar = (campo) => (e) => {
    setDatos({ ...datos, [campo]: e.target.value })
    setErrores({ ...errores, [campo]: undefined })
  }

  async function guardar(evento) {
    evento.preventDefault()
    const encontrados = validar(datos)
    setErrores(encontrados)
    if (Object.keys(encontrados).length > 0) return
    setGuardando(true)
    setErrorGuardar(null)
    const { data, error } = await supabase.from('familiares').insert({
      nombre: datos.nombre.trim(),
      parentesco: datos.parentesco,
      fecha_nacimiento: datos.fechaNacimiento || null,
    }).select('id, nombre, parentesco, fecha_nacimiento').single()
    setGuardando(false)
    if (error) {
      setErrorGuardar('No pudimos guardar el familiar. Revisa tu conexión e intenta de nuevo.')
      return
    }
    setDatos(VACIO)
    alGuardado(data)
  }

  const id = (campo) => `${prefijo}-${campo}`

  return (
    <form onSubmit={guardar} noValidate className="tarjeta">
      {errorGuardar && <Alerta tipo="error">{errorGuardar}</Alerta>}
      <div className="mb-3">
        <label htmlFor={id('nombre')} className="form-label">Nombre completo</label>
        <input id={id('nombre')} className={`form-control form-control-lg ${errores.nombre ? 'is-invalid' : ''}`}
          value={datos.nombre} onChange={cambiar('nombre')} autoComplete="off" maxLength={80}
          aria-invalid={Boolean(errores.nombre)} aria-describedby={errores.nombre ? id('error-nombre') : undefined} />
        {errores.nombre && <div id={id('error-nombre')} className="invalid-feedback">{errores.nombre}</div>}
      </div>
      <div className="mb-3">
        <label htmlFor={id('parentesco')} className="form-label">Parentesco</label>
        <select id={id('parentesco')} className={`form-select form-control-lg ${errores.parentesco ? 'is-invalid' : ''}`}
          value={datos.parentesco} onChange={cambiar('parentesco')}
          aria-invalid={Boolean(errores.parentesco)} aria-describedby={errores.parentesco ? id('error-parentesco') : undefined}>
          <option value="">Elige una opción</option>
          {PARENTESCOS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        {errores.parentesco && <div id={id('error-parentesco')} className="invalid-feedback">{errores.parentesco}</div>}
      </div>
      <div className="mb-3">
        <label htmlFor={id('nacimiento')} className="form-label">Fecha de nacimiento (opcional)</label>
        <input id={id('nacimiento')} type="date" max={diaISO(0)}
          className={`form-control form-control-lg ${errores.fechaNacimiento ? 'is-invalid' : ''}`}
          value={datos.fechaNacimiento} onChange={cambiar('fechaNacimiento')}
          aria-invalid={Boolean(errores.fechaNacimiento)}
          aria-describedby={errores.fechaNacimiento ? id('error-nacimiento') : id('ayuda-nacimiento')} />
        {errores.fechaNacimiento
          ? <div id={id('error-nacimiento')} className="invalid-feedback">{errores.fechaNacimiento}</div>
          : <div id={id('ayuda-nacimiento')} className="form-text">Sirve para mostrar la edad, por ejemplo "Hijo, 3 años".</div>}
      </div>
      <div className="d-flex flex-column gap-2">
        <button type="submit" className="btn btn-primary btn-lg" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar familiar'}
        </button>
        <button type="button" className="btn btn-outline-primary btn-lg"
          onClick={() => { setDatos(VACIO); setErrores({}); alCancelar() }}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

export default FormularioFamiliar
