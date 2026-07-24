import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sliders,
  Wand2,
  Palette,
  BarChart3,
  Cog,
  Gauge,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { useSettings } from '@/hooks/useSettings';
import { GeneralSection } from './components/GeneralSection';
import { BehaviorSection } from './components/BehaviorSection';
import { AppearanceSection } from './components/AppearanceSection';
import { StatisticsSection } from './components/StatisticsSection';
import { AdvancedSection } from './components/AdvancedSection';
import { Skeleton } from '@/components/ui/misc';

type Tab = 'general' | 'behavior' | 'appearance' | 'statistics' | 'advanced';

const NAV: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'General', icon: <Sliders className="h-4 w-4" /> },
  { id: 'behavior', label: 'Behavior', icon: <Wand2 className="h-4 w-4" /> },
  { id: 'appearance', label: 'Appearance', icon: <Palette className="h-4 w-4" /> },
  { id: 'statistics', label: 'Statistics', icon: <BarChart3 className="h-4 w-4" /> },
  { id: 'advanced', label: 'Advanced', icon: <Cog className="h-4 w-4" /> },
];

export function App() {
  const { settings, update, loading } = useSettings();
  const [tab, setTab] = useState<Tab>('general');

  return (
    <ThemeProvider
      theme={settings?.theme ?? 'system'}
      accent={settings?.accent ?? 'violet'}
    >
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10 lg:flex-row lg:gap-12 lg:py-16">
          {/* Sidebar */}
          <aside className="lg:w-56 lg:shrink-0">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent/60 shadow-glow">
                <Gauge className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-semibold tracking-tight">Aperture</h1>
                <p className="text-xs text-muted-foreground">Settings</p>
              </div>
            </div>

            <nav
              aria-label="Settings sections"
              className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0"
            >
              {NAV.map((item) => {
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      active
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute inset-0 rounded-xl bg-surface shadow-soft"
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2.5">
                      {item.icon}
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Content */}
          <main className="min-w-0 flex-1">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              {loading || !settings ? (
                <div className="space-y-4">
                  <Skeleton className="h-40 w-full" />
                  <Skeleton className="h-40 w-full" />
                </div>
              ) : (
                <>
                  {tab === 'general' && (
                    <GeneralSection settings={settings} update={update} />
                  )}
                  {tab === 'behavior' && (
                    <BehaviorSection settings={settings} update={update} />
                  )}
                  {tab === 'appearance' && (
                    <AppearanceSection settings={settings} update={update} />
                  )}
                  {tab === 'statistics' && (
                    <StatisticsSection settings={settings} />
                  )}
                  {tab === 'advanced' && (
                    <AdvancedSection settings={settings} update={update} />
                  )}
                </>
              )}
            </motion.div>
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
