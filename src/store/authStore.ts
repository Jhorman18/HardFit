import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, isCloudConfigured } from '../lib/supabase'
import { db } from '../db'
import { useSyncStore } from '../sync/syncStore'

export interface AuthState {
  session: Session | null
  user: User | null
  loading: boolean
  isConfigured: boolean
  message: { type: 'success' | 'error'; text: string } | null

  setMessage: (msg: { type: 'success' | 'error'; text: string } | null) => void
  signUp: (email: string, password: string) => Promise<{ success: boolean; message: string }>
  signInWithPassword: (email: string, password: string) => Promise<{ success: boolean; message: string }>
  signOut: () => Promise<void>
  init: () => Promise<void>
}

function translateAuthError(errMessage: string): string {
  const lower = errMessage.toLowerCase()
  if (lower.includes('invalid login credentials')) {
    return 'Correo o contraseña incorrectos.'
  }
  if (lower.includes('email not confirmed')) {
    return 'Debes confirmar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.'
  }
  if (lower.includes('user already registered')) {
    return 'Ya existe una cuenta con este correo electrónico.'
  }
  if (lower.includes('password should be at least')) {
    return 'La contraseña debe tener al menos 6 caracteres.'
  }
  if (lower.includes('unable to validate email') || lower.includes('invalid email')) {
    return 'El formato del correo electrónico no es válido.'
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Demasiados intentos. Por favor espera unos minutos.'
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Error de conexión. Comprueba tu red e inténtalo de nuevo.'
  }
  return errMessage || 'Ocurrió un error inesperado al procesar la solicitud.'
}

let isInitialized = false

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  loading: true,
  isConfigured: isCloudConfigured,
  message: null,

  setMessage: (message) => set({ message }),

  init: async () => {
    if (isInitialized) return
    isInitialized = true

    if (!supabase || !isCloudConfigured) {
      set({ session: null, user: null, loading: false, isConfigured: false })
      return
    }

    try {
      const { data } = await supabase.auth.getSession()
      const currentSession = data.session

      set({
        session: currentSession,
        user: currentSession?.user ?? null,
        loading: false,
      })

      // Cargar la fecha de la última sincronización
      useSyncStore.getState().loadLastSyncAt()

      // Si hay sesión activa al cargar la aplicación, sincronizar en segundo plano
      if (currentSession?.user) {
        useSyncStore
          .getState()
          .sync()
          .catch((err) => console.error('Error sincronizando al inicio:', err))
      }

      // Suscripción a cambios de estado de autenticación
      supabase.auth.onAuthStateChange(async (event, session) => {
        set({
          session,
          user: session?.user ?? null,
          loading: false,
        })

        if (event === 'SIGNED_IN' && session?.user) {
          useSyncStore.getState().loadLastSyncAt()
          useSyncStore
            .getState()
            .sync()
            .catch((err) => console.error('Error sincronizando en SIGNED_IN:', err))
        }
      })
    } catch (err) {
      console.error('Error al inicializar sesión de Supabase:', err)
      set({ session: null, user: null, loading: false })
    }
  },

  signUp: async (email: string, password: string) => {
    if (!supabase || !isCloudConfigured) {
      const msg = 'La sincronización en la nube no está configurada.'
      set({ message: { type: 'error', text: msg } })
      return { success: false, message: msg }
    }

    set({ loading: true, message: null })
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })

      if (error) {
        const text = translateAuthError(error.message)
        set({ loading: false, message: { type: 'error', text } })
        return { success: false, message: text }
      }

      if (data.session) {
        set({
          session: data.session,
          user: data.session.user,
          loading: false,
          message: { type: 'success', text: 'Cuenta creada con éxito.' },
        })
        useSyncStore.getState().sync().catch(console.error)
        return { success: true, message: 'Cuenta creada con éxito.' }
      }

      // Supabase requiere confirmación de email
      const text = 'Cuenta creada. Revisa tu correo electrónico para confirmar antes de iniciar sesión.'
      set({
        loading: false,
        message: { type: 'success', text },
      })
      return { success: true, message: text }
    } catch (err: any) {
      const text = translateAuthError(err?.message || 'Error al registrar usuario.')
      set({ loading: false, message: { type: 'error', text } })
      return { success: false, message: text }
    }
  },

  signInWithPassword: async (email: string, password: string) => {
    if (!supabase || !isCloudConfigured) {
      const msg = 'La sincronización en la nube no está configurada.'
      set({ message: { type: 'error', text: msg } })
      return { success: false, message: msg }
    }

    set({ loading: true, message: null })
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        const text = translateAuthError(error.message)
        set({ loading: false, message: { type: 'error', text } })
        return { success: false, message: text }
      }

      set({
        session: data.session,
        user: data.user,
        loading: false,
        message: null,
      })

      useSyncStore.getState().loadLastSyncAt()
      useSyncStore.getState().sync().catch(console.error)

      return { success: true, message: 'Sesión iniciada con éxito.' }
    } catch (err: any) {
      const text = translateAuthError(err?.message || 'Error al iniciar sesión.')
      set({ loading: false, message: { type: 'error', text } })
      return { success: false, message: text }
    }
  },

  signOut: async () => {
    if (!supabase) return
    set({ loading: true })
    try {
      await supabase.auth.signOut()
      // Limpiar metadatos de sincronización para evitar colisiones con otra cuenta
      await db.syncMeta.clear()
    } catch (err) {
      console.error('Error al cerrar sesión:', err)
    } finally {
      set({
        session: null,
        user: null,
        loading: false,
        message: null,
      })
    }
  },
}))
