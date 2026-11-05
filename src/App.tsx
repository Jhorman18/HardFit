import { useEffect, useState, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { seedIfEmpty } from './db'
import { useWorkoutStore, useAuthStore } from './store'
import { Layout } from './components/Layout'
import { BackButtonHandler } from './components/BackButtonHandler'

const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })))
const WorkoutPage = lazy(() => import('./pages/WorkoutPage').then((m) => ({ default: m.WorkoutPage })))
const HistoryPage = lazy(() => import('./pages/HistoryPage').then((m) => ({ default: m.HistoryPage })))
const RoutinesPage = lazy(() => import('./pages/RoutinesPage').then((m) => ({ default: m.RoutinesPage })))
const RoutineEditorPage = lazy(() => import('./pages/RoutineEditorPage').then((m) => ({ default: m.RoutineEditorPage })))
const ExercisesPage = lazy(() => import('./pages/ExercisesPage').then((m) => ({ default: m.ExercisesPage })))
const StatsPage = lazy(() => import('./pages/StatsPage').then((m) => ({ default: m.StatsPage })))
const MeasurementsPage = lazy(() => import('./pages/MeasurementsPage').then((m) => ({ default: m.MeasurementsPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const WorkoutSummaryPage = lazy(() => import('./pages/WorkoutSummaryPage').then((m) => ({ default: m.WorkoutSummaryPage })))

function PageFallback() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-xs text-neutral-400">Cargando…</p>
    </div>
  )
}

function SuspenseLayout() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Outlet />
    </Suspense>
  )
}

export function App() {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    seedIfEmpty()
      .then(() => useWorkoutStore.getState().rehydrate())
      .then(() => useAuthStore.getState().init())
      .catch((err) => console.error('Error inicializando base de datos local:', err))
      .finally(() => setIsReady(true))
  }, [])

  if (!isReady) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-center">
        <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-lg font-bold text-white">Iniciando HardFit...</h2>
        <p className="text-xs text-neutral-400 mt-1">Cargando base de datos local</p>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <BackButtonHandler />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route element={<SuspenseLayout />}>
              <Route index element={<HomePage />} />
              <Route path="workout" element={<WorkoutPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="history/:id" element={<HistoryPage />} />
              <Route path="routines" element={<RoutinesPage />} />
              <Route path="routines/new" element={<RoutineEditorPage />} />
              <Route path="routines/:id/edit" element={<RoutineEditorPage />} />
              <Route path="exercises" element={<ExercisesPage />} />
              <Route path="stats" element={<StatsPage />} />
              <Route path="measurements" element={<MeasurementsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="workout/summary/:id" element={<WorkoutSummaryPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App

