'use client';

import { useRouter } from 'next/navigation';
import { Calendar, CheckCircle, Clock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-neutral-900 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-neutral-900">TimeHub</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="text-neutral-600 hover:text-neutral-900" onClick={() => router.push('/login')}>
              Войти
            </Button>
            <Button className="bg-neutral-900 text-white hover:bg-neutral-800 px-6 rounded-full" onClick={() => router.push('/register')}>
              Начать бесплатно
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <Badge variant="secondary" className="bg-neutral-100 text-neutral-600 py-1.5 px-4 rounded-full text-xs font-bold tracking-widest uppercase">
            Управление временем — это просто
          </Badge>
          <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight text-neutral-900 leading-[1.1]">
            Ваш бизнес на <span className="text-neutral-400">автопилоте.</span>
          </h1>
          <p className="text-xl text-neutral-500 max-w-2xl mx-auto leading-relaxed">
            TimeHub — это современная экосистема для онлайн-записи, управления персоналом
            и автоматизации сервисных компаний. От барбершопов до стоматологий.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button className="h-14 px-10 text-lg bg-neutral-900 text-white hover:bg-neutral-800 rounded-full shadow-lg transition-all" onClick={() => router.push('/register')}>
              Попробовать сейчас
            </Button>
            <Button variant="outline" className="h-14 px-10 text-lg border-neutral-200 rounded-full hover:bg-neutral-50" onClick={() => router.push('/book/1')}>
              Демонстрация записи
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-12">
          {[
            {
              title: 'Онлайн-запись 24/7',
              desc: 'Ваши клиенты могут записываться в любое время через удобный интерфейс.',
              icon: Clock,
            },
            {
              title: 'Умное расписание',
              desc: 'Гибкая настройка графиков работы и автоматический расчет свободных окон.',
              icon: Calendar,
            },
            {
              title: 'Безопасность',
              desc: 'Ваши данные надежно защищены. Полный контроль доступов сотрудников.',
              icon: Shield,
            },
          ].map((f, i) => (
            <div key={i} className="space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-white border border-neutral-200 shadow-sm flex items-center justify-center">
                <f.icon className="h-6 w-6 text-neutral-900" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900">{f.title}</h3>
              <p className="text-neutral-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// Simple Badge component mockup since we didn't add it globally yet but it's in components
import { Badge } from '@/components/ui/badge';
