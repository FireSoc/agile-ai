import { Link } from 'react-router-dom';
import { FlaskConical, Inbox, Sparkles, LayoutDashboard, ArrowRight, Zap } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const FEATURES = [
  {
    title: 'Simulation',
    description: 'Run timeline simulations to see how delays and assumptions affect go-live.',
    icon: FlaskConical,
  },
  {
    title: 'Virtual inboxes',
    description: 'Preview how work lands in ops inboxes before it happens in real life.',
    icon: Inbox,
  },
  {
    title: 'AI insights',
    description: 'Get risk bands and recommendations powered by your project and playbook data.',
    icon: Sparkles,
  },
  {
    title: 'Project visibility',
    description: 'Track stages, tasks, and customer onboarding health in one place.',
    icon: LayoutDashboard,
  },
];

const STEPS = [
  'Configure your onboarding project and playbook.',
  'Run a simulation with your assumptions.',
  'Review virtual inbox impact and AI risk insights.',
  'Take action in projects and ops inbox.',
];

export function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="page-container flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold text-foreground">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Zap className="size-4" aria-hidden />
            </div>
            <span>Agile Onboarding</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/dashboard" className={cn(buttonVariants({ variant: 'ghost' }))}>
              Dashboard
            </Link>
            <Link to="/simulator" className={cn(buttonVariants())}>
              Simulator
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="border-b border-border bg-muted/30 py-16 md:py-24">
          <div className="page-container flex flex-col items-center gap-8 text-center">
            <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              Simulate onboarding workflows. See risk before it happens.
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Run timeline simulations, preview virtual inboxes, and get AI-powered recommendations—so you can ship onboarding operations with confidence.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link to="/dashboard" className={cn(buttonVariants({ size: 'lg' }), 'gap-2')}>
                Open dashboard
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link to="/simulator" className={cn(buttonVariants({ size: 'lg', variant: 'outline' }), 'gap-2')}>
                View simulator
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="page-container">
            <h2 className="text-center text-2xl font-semibold text-foreground sm:text-3xl">
              Built for B2B onboarding operations
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-muted-foreground">
              From simulation to execution, one workflow.
            </p>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map(({ title, description, icon: Icon }) => (
                <div
                  key={title}
                  className="rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm"
                >
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-muted/30 py-16 md:py-20">
          <div className="page-container">
            <h2 className="text-center text-2xl font-semibold text-foreground sm:text-3xl">
              How it works
            </h2>
            <ul className="mx-auto mt-10 max-w-md space-y-4">
              {STEPS.map((step, i) => (
                <li key={i} className="flex gap-3 text-left">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                  <span className="text-sm text-muted-foreground">{step}</span>
                </li>
              ))}
            </ul>
            <div className="mt-10 flex justify-center">
              <Link to="/dashboard" className={cn(buttonVariants({ size: 'lg' }), 'gap-2')}>
                Enter the app
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6">
        <div className="page-container flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            Agile Onboarding — workflow simulation and ops visibility.
          </p>
          <div className="flex gap-4">
            <Link to="/dashboard" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
              Dashboard
            </Link>
            <Link to="/simulator" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
              Simulator
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
