'use client';

import {
  Badge,
  Button,
  Card,
  Chip,
  Input,
  MiniBarGraph,
  SegmentedControl,
  Stack,
  Stepper,
  Switch,
  Text,
} from '@acme/ui';
import { ProgressRing } from '@acme/ui/web';
import {
  AlertTriangle,
  BatteryCharging,
  Calendar,
  CheckCircle2,
  Dumbbell,
  Flame,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Share2,
  Timer,
  Trash2,
  Trophy,
  User,
} from 'lucide-react';
import { useState } from 'react';

const FILTERS = ['Full Body', 'Push', 'Pull', 'Legs', 'Core'];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="glass-panel flex flex-col gap-4">
      <Text variant="headlineLg" className="font-display text-primary uppercase">
        {title}
      </Text>
      <Stack gap="lg">{children}</Stack>
    </Card>
  );
}

function Sample({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Stack gap="xs">
      <Text variant="dataLabel" tone="muted">
        {label}
      </Text>
      {children}
    </Stack>
  );
}

export default function ComponentsPage() {
  const [activeFilter, setActiveFilter] = useState<string>('Full Body');
  const [tab, setTab] = useState('all');
  const [warmupSets, setWarmupSets] = useState(true);
  const [autoRest, setAutoRest] = useState(false);
  const [weight, setWeight] = useState(225);
  const [reps, setReps] = useState(8);

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Stack gap="lg">
        <Text variant="heading" className="font-display text-primary text-3xl uppercase">
          Extended Component Library
        </Text>

        <Section title="Typography">
          <Sample label="Display XL (Anton)">
            <Text variant="displayXl" className="font-display text-primary">
              CRUSH LIMITS
            </Text>
          </Sample>
          <Sample label="Headline LG (Anton)">
            <Text variant="headlineLg" className="font-display text-primary">
              WORKOUT SUMMARY
            </Text>
          </Sample>
          <Sample label="Headline LG Mobile (Anton)">
            <Text variant="headlineLgMobile" className="font-display text-primary">
              CURRENT SET
            </Text>
          </Sample>
          <Sample label="Body MD (Inter)">
            <Text variant="body">
              Maintain tension throughout the eccentric phase of the movement.
            </Text>
          </Sample>
          <Sample label="Data Label (JetBrains Mono)">
            <Text variant="dataLabel" className="text-primary">
              RPE 8.5 / 225 LBS / 5 REPS
            </Text>
          </Sample>
        </Section>

        <Section title="Action Buttons">
          <Sample label="Primary Solid">
            <Button size="lg" className="font-display glow-primary uppercase tracking-wide">
              Start Workout
            </Button>
          </Sample>
          <Sample label="Secondary Ghost">
            <Button variant="outline" size="lg" className="font-display uppercase tracking-wide">
              Add Exercise
            </Button>
          </Sample>
          <Sample label="Icon Actions">
            <Stack direction="row" gap="sm">
              <Button size="icon" variant="secondary">
                <Plus className="h-5 w-5" aria-hidden="true" />
              </Button>
              <Button size="icon" variant="outline">
                <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
              </Button>
              <Button
                size="icon"
                variant="destructive"
                className="bg-destructive/20 text-destructive"
              >
                <Trash2 className="h-5 w-5" aria-hidden="true" />
              </Button>
            </Stack>
          </Sample>
        </Section>

        <Section title="Data & Metrics">
          <Sample label="Metric Cards">
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Heart, label: 'Avg HR', value: '142', unit: 'bpm' },
                { icon: Flame, label: 'Calories', value: '845', unit: 'kcal' },
                { icon: Dumbbell, label: 'Volume', value: '12.4', unit: 'k' },
                { icon: Timer, label: 'Duration', value: '1:15', unit: 'hr' },
              ].map(({ icon: Icon, label, value, unit }) => (
                <div key={label} className="bg-card border-border rounded-2xl border p-4">
                  <div className="text-muted-foreground mb-2 flex items-center gap-2">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <Text variant="dataLabel">{label}</Text>
                  </div>
                  <Text variant="headlineLgMobile" className="font-display text-primary">
                    {value}{' '}
                    <span className="text-muted-foreground text-sm font-normal">{unit}</span>
                  </Text>
                </div>
              ))}
            </div>
          </Sample>
          <Sample label="Workout Progress Card">
            <div className="bg-card border-border rounded-2xl border p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <Text variant="headlineLgMobile" className="font-display text-primary">
                    Upper Body Power
                  </Text>
                  <Text variant="dataLabel" tone="muted">
                    4 of 6 Exercises Completed
                  </Text>
                </div>
                <ProgressRing percent={66} glow>
                  <Text variant="dataLabel" className="text-primary">
                    66%
                  </Text>
                </ProgressRing>
              </div>
              <div className="bg-secondary h-2 w-full rounded-full">
                <div className="bg-primary glow-primary h-2 w-2/3 rounded-full" />
              </div>
            </div>
          </Sample>
          <Sample label="Data Visualization">
            <MiniBarGraph values={[40, 60, 30, 80, 100, 50, 70]} highlightIndex={4} />
          </Sample>
        </Section>

        <Section title="Exercise & Workout">
          <Sample label="Exercise Card">
            <div className="bg-card border-border hover:border-primary/50 flex flex-col gap-4 rounded-2xl border p-4 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-secondary flex h-12 w-12 items-center justify-center rounded-full">
                    <Dumbbell className="text-primary h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <Text className="font-semibold">Barbell Bench Press</Text>
                    <Text variant="dataLabel" tone="muted">
                      Bar to mid-chest, elbows ~45°.
                    </Text>
                  </div>
                </div>
                <MoreHorizontal className="text-muted-foreground h-5 w-5" aria-hidden="true" />
              </div>
              <Stack direction="row" gap="sm">
                {['Chest', 'Triceps', 'Shoulders'].map((tag) => (
                  <Chip key={tag} tabIndex={-1} className="cursor-default px-2 py-1 text-xs">
                    {tag}
                  </Chip>
                ))}
              </Stack>
              <div className="border-border flex items-center justify-between border-t pt-3">
                <Text variant="dataLabel" className="text-primary">
                  3 SETS × 8-10 REPS
                </Text>
                <Text variant="dataLabel" tone="muted">
                  Last: 225 lbs
                </Text>
              </div>
            </div>
          </Sample>
          <Sample label="Rest Timer Widget">
            <div className="bg-card border-border flex flex-col items-center rounded-2xl border p-6">
              <ProgressRing percent={45} size={128} tone="warning" glow>
                <div className="flex flex-col items-center">
                  <Text variant="headlineLgMobile" className="font-display text-primary">
                    0:45
                  </Text>
                  <Text variant="dataLabel" tone="muted">
                    REST
                  </Text>
                </div>
              </ProgressRing>
              <Stack direction="row" gap="md" className="mt-4">
                <Button variant="secondary" className="font-display rounded-full">
                  +15s
                </Button>
                <Button variant="secondary" className="font-display text-primary rounded-full">
                  SKIP
                </Button>
              </Stack>
            </div>
          </Sample>
          <Sample label="Interactive Stepper">
            <Stack gap="md">
              <Stepper value={weight} onChange={setWeight} unit="LBS" label="weight" step={5} />
              <Stepper value={reps} onChange={setReps} unit="REPS" label="reps" />
            </Stack>
          </Sample>
        </Section>

        <Section title="Navigation & Controls">
          <Sample label="Tab Bar">
            <SegmentedControl
              value={tab}
              onChange={setTab}
              options={[
                { value: 'all', label: 'All' },
                { value: 'strength', label: 'Strength' },
                { value: 'cardio', label: 'Cardio' },
              ]}
            />
          </Sample>
          <Sample label="Filter Chips">
            <Stack direction="row" gap="sm" className="flex-wrap">
              {FILTERS.map((filter) => (
                <Chip
                  key={filter}
                  selected={filter === activeFilter}
                  onClick={() => setActiveFilter(filter)}
                >
                  {filter}
                </Chip>
              ))}
            </Stack>
          </Sample>
          <Sample label="Toggle Switch">
            <Stack gap="sm">
              <label htmlFor="warmup-sets" className="flex items-center gap-3">
                <Switch id="warmup-sets" checked={warmupSets} onCheckedChange={setWarmupSets} />
                <Text variant="dataLabel">Warmup Sets</Text>
              </label>
              <label htmlFor="auto-rest" className="flex items-center gap-3">
                <Switch id="auto-rest" checked={autoRest} onCheckedChange={setAutoRest} />
                <Text variant="dataLabel" tone="muted">
                  Auto-Rest
                </Text>
              </label>
            </Stack>
          </Sample>
          <Sample label="Search Input">
            <div className="relative">
              <Search
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <Input placeholder="Search exercises…" className="pl-11" />
            </div>
          </Sample>
        </Section>

        <Section title="Feedback & Social">
          <Sample label="Status Badges">
            <Stack direction="row" gap="sm" className="flex-wrap">
              <Badge tone="primary">
                <Trophy className="h-3 w-3" aria-hidden="true" /> PR Alert
              </Badge>
              <Badge tone="warning">
                <BatteryCharging className="h-3 w-3" aria-hidden="true" /> Recovery Mode
              </Badge>
              <Badge tone="destructive">
                <AlertTriangle className="h-3 w-3" aria-hidden="true" /> High Intensity
              </Badge>
              <Badge tone="neutral">
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Completed
              </Badge>
              <Badge tone="muted">
                <Calendar className="h-3 w-3" aria-hidden="true" /> Scheduled
              </Badge>
            </Stack>
          </Sample>
          <Sample label="Social Feed Snippet">
            <div className="bg-card border-border rounded-2xl border p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-secondary flex h-10 w-10 items-center justify-center rounded-full">
                    <User className="text-muted-foreground h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <Text variant="dataLabel" className="font-bold">
                      ALEX M.
                    </Text>
                    <Text variant="caption" tone="muted">
                      2 hours ago
                    </Text>
                  </div>
                </div>
                <MoreHorizontal className="text-muted-foreground h-5 w-5" aria-hidden="true" />
              </div>
              <Text className="mb-4 text-sm">
                Crushed the new PR program! The volume was insane but pushed through. 🚀
              </Text>
              <div className="bg-background border-border mb-4 flex items-center gap-4 rounded-xl border p-3">
                <div className="bg-secondary flex h-16 w-16 shrink-0 items-center justify-center rounded-lg">
                  <Dumbbell className="text-primary h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <Text
                    variant="headlineLgMobile"
                    className="font-display text-primary text-xl leading-tight"
                  >
                    Lower Body Destruction
                  </Text>
                  <Text variant="dataLabel" className="text-primary mt-1">
                    1h 45m • 14,200 LBS
                  </Text>
                </div>
              </div>
              <div className="border-border flex items-center gap-6 border-t pt-3">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-primary flex items-center gap-2"
                >
                  <Heart className="h-4 w-4" aria-hidden="true" />
                  <Text variant="dataLabel">24</Text>
                </button>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-primary flex items-center gap-2"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  <Text variant="dataLabel">5</Text>
                </button>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-primary ml-auto flex items-center gap-2"
                >
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </Sample>
        </Section>
      </Stack>
    </main>
  );
}
