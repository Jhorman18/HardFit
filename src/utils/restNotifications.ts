import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

export const ONGOING_ID = 7001
export const DONE_ID = 7002

export const CHANNEL_REST_ONGOING = 'rest-ongoing'
export const CHANNEL_REST_DONE = 'rest-done'

let initialized = false
let permissionGranted = false

/**
 * Formatea una cantidad de segundos en formato mm:ss.
 */
export function formatTimeLeft(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const m = Math.floor(safeSeconds / 60)
  const s = safeSeconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

/**
 * Inicialización idempotente de canales y permisos para notificaciones locales.
 * Solo actúa en plataformas nativas (Android/iOS); en web se comporta como no-op seguro.
 * Si el usuario deniega los permisos en Android 13+, marca el flag y degrada silenciosamente.
 */
export async function initRestNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  if (initialized && permissionGranted) return

  try {
    let perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted') {
      perm = await LocalNotifications.requestPermissions()
    }

    if (perm.display !== 'granted') {
      permissionGranted = false
      initialized = true
      return
    }

    permissionGranted = true

    // Canal para el conteo continuo: importancia baja (2), sin sonido ni vibración
    await LocalNotifications.createChannel({
      id: CHANNEL_REST_ONGOING,
      name: 'Descanso en curso',
      description: 'Notificación persistente con el conteo regresivo del descanso',
      importance: 2,
      vibration: false,
    })

    // Canal para la alerta final: importancia alta (5), con vibración y sonido por defecto
    await LocalNotifications.createChannel({
      id: CHANNEL_REST_DONE,
      name: 'Descanso terminado',
      description: 'Alerta con vibración y sonido al finalizar el tiempo de descanso',
      importance: 5,
      vibration: true,
    })

    initialized = true
  } catch (err) {
    console.warn('Error al inicializar notificaciones de descanso:', err)
    permissionGranted = false
    initialized = true
  }
}

/**
 * Programa la alerta final en el SO Android (exact/allowWhileIdle) y emite la
 * notificación inicial "en curso" con el conteo de descanso.
 *
 * NOTA DE SEGUNDO PLANO / PANTALLA BLOQUEADA:
 * En Android, cuando la pantalla se apaga o la app pasa a segundo plano, el sistema
 * congela la ejecución de JavaScript en WebView para ahorrar batería. Por lo tanto,
 * el conteo en tiempo real (updateRestCountdown) no avanzará segundo a segundo
 * mientras el dispositivo esté bloqueado; sin embargo, la alerta final (DONE_ID)
 * SÍ se disparará puntualmente con vibración y sonido porque se encuentra programada
 * nativamente en el AlarmManager del sistema operativo con allowWhileIdle: true.
 */
export async function startRestNotifications(targetEnd: number): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  try {
    await initRestNotifications()
    if (!permissionGranted) return

    // Limpiamos notificaciones previas si las hubiera
    await cancelRestNotifications()

    const now = Date.now()
    const secondsRemaining = Math.max(0, Math.ceil((targetEnd - now) / 1000))

    // 1. Programamos la alerta final en el SO
    await LocalNotifications.schedule({
      notifications: [
        {
          id: DONE_ID,
          title: 'Descanso terminado',
          body: 'Se acabó el tiempo de descanso, ¡vamos al siguiente!',
          channelId: CHANNEL_REST_DONE,
          schedule: { at: new Date(targetEnd), allowWhileIdle: true },
          smallIcon: 'ic_stat_icon_config_sample',
        },
      ],
    })

    // 2. Mostramos notificación en curso con el tiempo restante
    if (secondsRemaining > 0) {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: ONGOING_ID,
            title: 'Descanso',
            body: 'Descanso en curso',
            channelId: CHANNEL_REST_ONGOING,
            ongoing: true,
            autoCancel: false,
            smallIcon: 'ic_stat_icon_config_sample',
          },
        ],
      })
    }
  } catch (err) {
    console.warn('Error al iniciar notificaciones de descanso:', err)
  }
}

/**
 * Re-emite la notificación en curso (id ONGOING_ID) con el nuevo tiempo restante.
 * Diseñado para llamarse cada segundo desde el componente en primer plano.
 * En segundo plano el motor JS se congela, por lo que esta función solo actúa
 * de forma activa mientras la app está visible en primer plano.
 */
export async function updateRestCountdown(_secondsLeft: number): Promise<void> {
  // Intencionalmente NO-OP: la notificación "en curso" es FIJA (se publica una sola vez
  // en startRestNotifications). Antes se re-emitía cada segundo para actualizar el conteo,
  // lo que hacía que Android publicara una notificación por segundo (parpadeo). El conteo
  // en vivo se ve en la barra dentro de la app; la alerta final sigue programada en el SO.
}

/**
 * Cancela tanto las notificaciones programadas en el SO como las mostradas actualmente en pantalla.
 */
export async function cancelRestNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  try {
    await LocalNotifications.cancel({
      notifications: [{ id: ONGOING_ID }, { id: DONE_ID }],
    })
  } catch (err) {
    console.warn('Error al cancelar alarmas de descanso:', err)
  }

  try {
    await LocalNotifications.removeDeliveredNotificationsById({
      ids: [ONGOING_ID, DONE_ID],
    })
  } catch (err) {
    console.warn('Error al remover notificaciones entregadas de descanso:', err)
  }
}
