import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { dismissTop, hasOpenDismissable } from './ui/useDismissable'

const TAB_ROOTS = new Set(['/routines', '/history', '/stats'])

/**
 * Atrás de Android (botón o gesto): cierra la hoja abierta; si no hay, vuelve a la pantalla anterior,
 * las pestañas vuelven a Hoy y en Hoy se minimiza, para no cortar el descanso ni el entreno en curso.
 */
export function BackButtonHandler() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const pathnameRef = useRef(pathname)

  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const listener = App.addListener('backButton', ({ canGoBack }) => {
      const path = pathnameRef.current
      if (hasOpenDismissable()) dismissTop()
      else if (path === '/') void App.minimizeApp()
      else if (TAB_ROOTS.has(path) || !canGoBack) navigate('/')
      else navigate(-1)
    })
    return () => {
      void listener.then((handle) => handle.remove())
    }
  }, [navigate])

  return null
}
