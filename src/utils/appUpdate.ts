import { Capacitor, CapacitorHttp, registerPlugin, type PluginListenerHandle } from '@capacitor/core'
import { App } from '@capacitor/app'
import { create } from 'zustand'

export const VERSION_URL =
  'https://www.dropbox.com/scl/fi/w4umgqs2d1qode4enpq6g/version.json?rlkey=z87vgp2o8nb39b1p13swxfl9w&dl=1'
export const APK_URL =
  'https://www.dropbox.com/scl/fi/qa7si8lp484stk455yppk/HardFit.apk?rlkey=4hxsfvtdqvzfjdy2h2gulm8qc&dl=1'

export interface UpdateInfo {
  versionCode: number
  versionName: string
  notes: string
}

export interface AppUpdaterPlugin {
  canInstall(): Promise<{ value: boolean }>
  openInstallSettings(): Promise<void>
  downloadAndInstall(options: { url: string }): Promise<void>
  addListener(
    eventName: 'progress',
    listenerFunc: (data: { percent: number }) => void
  ): Promise<PluginListenerHandle>
}

export const AppUpdater = registerPlugin<AppUpdaterPlugin>('AppUpdater')

export class InstallPermissionError extends Error {
  constructor(message = 'Android necesita que permitas instalar desde HardFit.') {
    super(message)
    this.name = 'InstallPermissionError'
  }
}

export interface CheckUpdateOptions {
  /** Si es true, lanza error en caso de fallo de red o datos para distinguir error de estar al día */
  throwOnError?: boolean
}

/**
 * Comprueba si hay una actualización disponible.
 * Si no es nativo o si la versión remota no es mayor que la instalada, devuelve null.
 * Si ocurre un error: devuelve null por defecto (automático), o lanza el error si throwOnError es true (manual).
 */
export async function checkForUpdate(options?: CheckUpdateOptions): Promise<UpdateInfo | null> {
  if (!Capacitor.isNativePlatform()) {
    return null
  }

  try {
    // Nativo a propósito: la redirección de Dropbox no trae CORS y un fetch fallaría siempre.
    const response = await CapacitorHttp.get({
      url: VERSION_URL,
      responseType: 'text',
      headers: { 'Cache-Control': 'no-cache' },
      connectTimeout: 8000,
      readTimeout: 8000,
    })

    if (response.status !== 200) {
      throw new Error(`Error en el servidor: HTTP ${response.status}`)
    }

    const data: unknown =
      typeof response.data === 'string' ? JSON.parse(response.data) : response.data
    if (
      typeof data !== 'object' ||
      data === null ||
      typeof (data as Record<string, unknown>).versionCode !== 'number' ||
      typeof (data as Record<string, unknown>).versionName !== 'string' ||
      typeof (data as Record<string, unknown>).notes !== 'string'
    ) {
      throw new Error('El formato del archivo de versión no es válido.')
    }

    const remoteInfo: UpdateInfo = {
      versionCode: (data as { versionCode: number }).versionCode,
      versionName: (data as { versionName: string }).versionName,
      notes: (data as { notes: string }).notes,
    }

    const appInfo = await App.getInfo()
    const currentVersionCode = parseInt(appInfo.build, 10)

    if (Number.isFinite(currentVersionCode) && remoteInfo.versionCode > currentVersionCode) {
      return remoteInfo
    }

    return null
  } catch (error) {
    if (options?.throwOnError) {
      throw error
    }
    return null
  }
}

export async function canInstall(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false
  const res = await AppUpdater.canInstall()
  return res.value
}

export async function openInstallSettings(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  await AppUpdater.openInstallSettings()
}

/**
 * Descarga e inicia la instalación de la actualización.
 * Si no tiene permiso para instalar paquetes desconocidos, lanza InstallPermissionError.
 */
export async function installUpdate(onProgress?: (percent: number) => void): Promise<void> {
  const allowed = await canInstall()
  if (!allowed) {
    throw new InstallPermissionError()
  }

  let handle: PluginListenerHandle | null = null
  if (onProgress) {
    handle = await AppUpdater.addListener('progress', ({ percent }) => {
      onProgress(percent)
    })
  }

  try {
    await AppUpdater.downloadAndInstall({ url: APK_URL })
  } finally {
    if (handle) {
      await handle.remove()
    }
  }
}

export interface UpdatePromptStore {
  isOpen: boolean
  info: UpdateInfo | null
  open: (info: UpdateInfo) => void
  close: () => void
}

export const useUpdatePromptStore = create<UpdatePromptStore>((set) => ({
  isOpen: false,
  info: null,
  open: (info) => set({ isOpen: true, info }),
  close: () => set({ isOpen: false, info: null }),
}))
