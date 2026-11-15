// Mi Cita: estructura general de la aplicación.
// Escucha la sesión de Supabase y decide qué mostrar: cargando, ingreso o la pantalla elegida
// en la barra inferior (Inicio, Mis citas, Asistente o Perfil).
import { lazy, Suspense, useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { useLetraGrande } from './lib/preferencias'
import BarraInferior from './components/BarraInferior'
import Cargando from './components/Cargando'
import DialogoConfirmacion from './components/DialogoConfirmacion'
import Ingreso from './pages/Ingreso'
import Inicio from './pages/Inicio'
// Mejora M3 (hallazgo R1 de Lighthouse): las pantallas que no se ven al abrir la app se descargan
// solo cuando el usuario entra a ellas (división de código), así la primera carga trae menos JavaScript.
const AgendarCita = lazy(() => import('./pages/AgendarCita'))
const MisCitas = lazy(() => import('./pages/MisCitas'))
const Asistente = lazy(() => import('./pages/Asistente'))
const Perfil = lazy(() => import('./pages/Perfil'))
const NuevaContrasena = lazy(() => import('./pages/NuevaContrasena'))

const cargandoPantalla = <main className="contenedor-app contenido"><Cargando texto="Cargando…" /></main>

function App() {
  const [sesion, setSesion] = useState(null)
  const [revisando, setRevisando] = useState(true)
  const [vista, setVista] = useState('inicio') // 'inicio', 'agendar', 'mis-citas', 'asistente' o 'perfil'
  const [agendaInicial, setAgendaInicial] = useState(null) // datos para "Repetir última cita"
  const [letraGrande, setLetraGrande] = useLetraGrande()
  const [recuperando, setRecuperando] = useState(false) // llegó desde el enlace de recuperación
  // Mejora M3 (hallazgo H2): si hay una cita a medio agendar, salir desde la barra inferior pide confirmación
  const [agendaEnCurso, setAgendaEnCurso] = useState(false)
  const [salidaPendiente, setSalidaPendiente] = useState(null) // sección a la que quería ir

  useEffect(() => {
    // 1. Al abrir la app, revisa si ya había una sesión guardada
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session)
      setRevisando(false)
    })
    // 2. Desde ahí, escucha cada ingreso o salida para actualizar la pantalla
    const { data: suscripcion } = supabase.auth.onAuthStateChange((evento, nuevaSesion) => {
      setSesion(nuevaSesion)
      // Abrió el enlace de "¿Olvidaste tu contraseña?": hay que pedirle la contraseña nueva
      if (evento === 'PASSWORD_RECOVERY') setRecuperando(true)
    })
    return () => suscripcion.subscription.unsubscribe()
  }, [])

  function navegar(destino) {
    setVista(destino)
    window.scrollTo(0, 0)
  }

  // La barra inferior pasa por aquí: si saldría de un agendamiento sin terminar, primero pregunta
  function navegarDesdeBarra(destino) {
    if (vista === 'agendar' && agendaEnCurso) {
      setSalidaPendiente(destino)
      return
    }
    navegar(destino)
  }

  function confirmarSalida() {
    const destino = salidaPendiente
    setSalidaPendiente(null)
    setAgendaEnCurso(false)
    navegar(destino)
  }

  function agendar(inicial = null) {
    setAgendaInicial(inicial)
    navegar('agendar')
  }

  function cerrarSesion() {
    setVista('inicio')
    supabase.auth.signOut()
  }

  if (revisando) {
    return <main className="contenedor-app contenido"><Cargando texto="Revisando tu sesión…" /></main>
  }
  if (recuperando && sesion) {
    return <Suspense fallback={cargandoPantalla}><NuevaContrasena alTerminar={() => setRecuperando(false)} /></Suspense>
  }
  if (!sesion) return <Ingreso />

  const preferenciasLetra = { letraGrande, alCambiarLetra: setLetraGrande }

  return (
    <>
      <Suspense fallback={cargandoPantalla}>
      {vista === 'agendar' ? (
        <AgendarCita
          key={agendaInicial?.reprogramar?.id ?? 'nueva'}
          inicial={agendaInicial}
          alTerminar={() => navegar('inicio')}
          alVerCitas={() => navegar('mis-citas')}
          alCambiarProgreso={setAgendaEnCurso}
        />
      ) : vista === 'mis-citas' ? (
        <MisCitas
          alAgendar={() => agendar()}
          alReprogramar={(cita) => agendar({
            especialidadId: cita.agenda.especialidad_id,
            sedeId: cita.agenda.sede_id,
            reprogramar: { id: cita.id, paciente: cita.paciente, familiarId: cita.familiar_id, fechaHora: cita.agenda.fecha_hora },
          })}
        />
      ) : vista === 'asistente' ? (
        <Asistente />
      ) : vista === 'perfil' ? (
        <Perfil correo={sesion.user.email} alCerrarSesion={cerrarSesion} {...preferenciasLetra} />
      ) : (
        <Inicio
          alAgendar={agendar}
          alVerCitas={() => navegar('mis-citas')}
          alAsistente={() => navegar('asistente')}
          {...preferenciasLetra}
        />
      )}
      </Suspense>
      <BarraInferior vista={vista} alNavegar={navegarDesdeBarra} />
      <DialogoConfirmacion
        abierto={salidaPendiente !== null}
        titulo="¿Salir sin terminar de agendar?"
        textoCancelar="No, seguir agendando"
        textoConfirmar="Sí, salir"
        alConfirmar={confirmarSalida}
        alCerrar={() => setSalidaPendiente(null)}
      >
        <p className="mb-0">Tu cita todavía no está agendada. Si sales, perderás lo que elegiste.</p>
      </DialogoConfirmacion>
      <footer className="visually-hidden">Mi Cita es un proyecto académico. No corresponde a ninguna EPS real.</footer>
    </>
  )
}

export default App
