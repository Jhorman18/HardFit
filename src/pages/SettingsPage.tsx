import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { patchAppSettings } from '../utils/healthMetrics'
import { ScreenHeader } from '../components/ui'
import { TrainingSection } from '../components/settings/TrainingSection'
import { AppearanceSection } from '../components/settings/AppearanceSection'
import { HealthSection } from '../components/settings/HealthSection'
import { DataSection } from '../components/settings/DataSection'
import { AccountSection } from '../components/settings/AccountSection'
import { AboutSection } from '../components/settings/AboutSection'
import type { Settings } from '../types'

export function SettingsPage() {
  const settings = useLiveQuery(async () => {
    const s = await db.settings.get('app')
    return s && 'units' in s ? s : undefined
  }, [])

  const patchSettings = async (patch: Partial<Omit<Settings, 'id'>>) => {
    await patchAppSettings(patch)
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      <ScreenHeader title="Ajustes" back="/" />

      <div className="flex-1 max-w-md w-full mx-auto">
        <TrainingSection settings={settings} patchSettings={patchSettings} />
        <AppearanceSection />
        <HealthSection settings={settings} patchSettings={patchSettings} />
        <DataSection />
        <AccountSection />
        <AboutSection />
      </div>
    </div>
  )
}
