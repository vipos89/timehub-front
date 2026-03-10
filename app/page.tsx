'use client';

import { useRouter } from 'next/navigation';
import { 
  Calendar, Clock, Shield, ArrowRight, Zap, 
  Users, BarChart3, MessageSquare, Smartphone, 
  Globe, CheckCircle2, Star, Menu, X, Play, MousePointer2, Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

export default function LandingPage() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      title: "Онлайн-запись",
      desc: "Удобные виджеты для сайта, соцсетей и мессенджеров. Клиенты записываются 24/7 без участия администратора.",
      icon: Globe,
      colSpan: "md:col-span-2",
      bg: "bg-neutral-900",
      text: "text-white",
      iconColor: "text-[#FF7A00]",
      imageMock: (
        <div className="mt-8 rounded-t-2xl bg-neutral-800 border-x border-t border-neutral-700 p-4 h-40 overflow-hidden group-hover:translate-y-[-10px] transition-transform duration-500">
           <div className="flex gap-2 mb-4 opacity-50"><div className="w-2 h-2 rounded-full bg-red-500" /><div className="w-2 h-2 rounded-full bg-yellow-500" /><div className="w-2 h-2 rounded-full bg-green-500" /></div>
           <div className="space-y-3">
             <div className="h-4 w-3/4 bg-neutral-700 rounded-full" />
             <div className="h-4 w-1/2 bg-neutral-700 rounded-full" />
             <div className="grid grid-cols-3 gap-2 mt-4">
               {[1,2,3].map(i => <div key={i} className="h-10 bg-[#FF7A00]/10 border border-[#FF7A00]/20 rounded-lg" />)}
             </div>
           </div>
        </div>
      )
    },
    {
      title: "Умное расписание",
      desc: "Управление сменами, гибкий график и защита от накладок.",
      icon: Calendar,
      colSpan: "md:col-span-1",
      bg: "bg-white border border-neutral-100",
      text: "text-neutral-900",
      iconColor: "text-neutral-900",
      imageMock: (
        <div className="mt-6 flex flex-col gap-2 group-hover:scale-105 transition-transform duration-500">
          {[
            { t: "10:00", n: "Alex B.", c: "bg-neutral-900 text-white" },
            { t: "11:30", n: "Maria K.", c: "bg-neutral-50 border border-neutral-100" },
            { t: "13:00", n: "John D.", c: "bg-[#FF7A00] border-none" },
          ].map((s, i) => (
            <div key={i} className={cn("px-4 py-2 rounded-xl text-[10px] font-bold flex justify-between items-center shadow-sm", s.c)}>
              <span>{s.t}</span>
              <span>{s.n}</span>
            </div>
          ))}
        </div>
      )
    },
    {
      title: "CRM & Лояльность",
      desc: "Вся история визитов, предпочтения и статистика в одном месте.",
      icon: Users,
      colSpan: "md:col-span-1",
      bg: "bg-white border border-neutral-100",
      text: "text-neutral-900",
      iconColor: "text-neutral-900",
      imageMock: (
        <div className="mt-8 flex justify-center group-hover:rotate-6 transition-transform duration-500">
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-neutral-50 border-4 border-white shadow-xl flex items-center justify-center overflow-hidden">
              <Users className="h-10 w-10 text-neutral-200" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-black text-[#FF7A00] text-[8px] font-black px-2 py-1 rounded-full shadow-lg">VIP</div>
          </div>
        </div>
      )
    },
    {
      title: "Авто-уведомления",
      desc: "Напоминания о визите и возврат клиентов через Telegram, SMS и Email.",
      icon: MessageSquare,
      colSpan: "md:col-span-2",
      bg: "bg-[#FF7A00]",
      text: "text-neutral-900",
      iconColor: "text-neutral-900",
      imageMock: (
        <div className="mt-8 flex gap-4 overflow-hidden mask-fade-right">
          {[
            { ch: "TG", msg: "Напоминаем о записи сегодня в 15:00" },
            { ch: "SMS", msg: "Ваш код подтверждения: 8832" },
            { ch: "Email", msg: "Оставьте отзыв о визите" },
          ].map((n, i) => (
            <div key={i} className="bg-white/80 backdrop-blur-sm border border-black/5 p-4 rounded-2xl min-w-[200px] shadow-lg shrink-0 group-hover:translate-x-[-20px] transition-transform duration-700">
               <div className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">{n.ch} Notification</div>
               <div className="text-[11px] font-bold leading-tight">{n.msg}</div>
            </div>
          ))}
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans selection:bg-[#FF7A00] selection:text-black flex flex-col overflow-x-hidden">
      {/* Dynamic Background Noise/Gradient */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#FF7A00] rounded-full blur-[150px] opacity-10 animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-neutral-200 rounded-full blur-[150px] opacity-20"></div>
      </div>

      {/* Header */}
      <header className={cn(
        "fixed top-0 w-full z-50 transition-all duration-300",
        scrolled ? "bg-white/80 backdrop-blur-xl border-b border-neutral-100 py-3" : "bg-transparent py-6"
      )}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="h-10 w-10 rounded-xl bg-neutral-900 flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
              <Zap className="h-5 w-5 text-[#FF7A00]" fill="currentColor" />
            </div>
            <span className="font-black text-2xl tracking-tighter text-neutral-900 italic">TimeHub</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 hover:text-neutral-900 transition-colors">Возможности</a>
            <a href="#benefits" className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 hover:text-neutral-900 transition-colors">Технологии</a>
            <div className="h-4 w-px bg-neutral-200 mx-2"></div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" className="font-black text-[10px] uppercase tracking-widest text-neutral-600 hover:bg-neutral-100 h-11 px-6 rounded-xl" onClick={() => router.push('/login')}>
                Войти
              </Button>
              <Button className="bg-neutral-900 text-white hover:bg-black hover:scale-105 h-11 px-8 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-black/10 transition-all" onClick={() => router.push('/register')}>
                Начать
              </Button>
            </div>
          </nav>

          <button className="md:hidden p-2 text-neutral-900" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-neutral-100 p-6 flex flex-col gap-4 shadow-2xl animate-in slide-in-from-top-4">
            <Button variant="ghost" className="w-full justify-start font-black text-xs uppercase tracking-widest h-14" onClick={() => { setMobileMenuOpen(false); router.push('/login'); }}>Войти</Button>
            <Button className="w-full bg-neutral-900 text-[#FF7A00] font-black text-xs uppercase tracking-widest h-14 rounded-2xl" onClick={() => { setMobileMenuOpen(false); router.push('/register'); }}>Создать аккаунт</Button>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-44 pb-20 md:pt-60 md:pb-40 px-6">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-10 animate-in fade-in slide-in-from-left-8 duration-1000">
              <Badge variant="secondary" className="bg-white border border-neutral-100 text-neutral-500 py-1.5 px-4 rounded-full text-[10px] font-black tracking-[0.2em] uppercase shadow-sm">
                Next-Gen Business System 2026
              </Badge>
              
              <h1 className="text-6xl md:text-8xl lg:text-[6.5rem] font-black tracking-tighter text-neutral-900 leading-[0.85] uppercase italic">
                ВАШ БИЗНЕС.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-neutral-900 via-neutral-600 to-neutral-400">НА АВТОПИЛОТЕ.</span>
              </h1>
              
              <p className="text-lg md:text-xl text-neutral-500 max-w-xl leading-relaxed font-medium">
                Единая платформа для онлайн-записи, управления персоналом и умных уведомлений. Высокие технологии в минималистичной оболочке.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
                <Button 
                  onClick={() => router.push('/register')}
                  className="h-16 px-12 bg-neutral-900 text-white hover:bg-black rounded-2xl shadow-2xl shadow-black/20 font-black uppercase tracking-widest transition-all hover:scale-105 w-full sm:w-auto flex items-center gap-3 group"
                >
                  Начать бесплатно
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <div className="flex items-center gap-4 px-6 opacity-60">
                  <div className="flex -space-x-3">
                    {[1,2,3].map(i => <div key={i} className="h-10 w-10 rounded-full border-2 border-white bg-neutral-200" />)}
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest leading-none">
                    500+ Компаний<br/><span className="text-neutral-400">Уже с нами</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Hero Mockup */}
            <div className="relative hidden lg:block animate-in fade-in slide-in-from-right-12 duration-1000 delay-300">
               {/* Decorative elements */}
               <div className="absolute -top-12 -right-12 h-64 w-64 bg-[#FF7A00] rounded-full blur-[100px] opacity-40 -z-10"></div>
               
               <div className="relative z-10 perspective-[2000px]">
                 <div className="bg-white rounded-[2.5rem] border border-neutral-100 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] p-2 rotate-y-[-15deg] rotate-x-[10deg] hover:rotate-y-[-5deg] hover:rotate-x-[5deg] transition-all duration-700 ease-out cursor-default overflow-hidden group">
                   {/* Top Bar Mockup */}
                   <div className="h-10 border-b border-neutral-50 px-6 flex items-center justify-between">
                     <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-neutral-100" /><div className="w-2.5 h-2.5 rounded-full bg-neutral-100" /></div>
                     <div className="h-4 w-32 bg-neutral-50 rounded-full" />
                   </div>
                   {/* Dashboard UI Mockup */}
                   <div className="p-8 space-y-8 bg-white min-h-[400px]">
                      <div className="flex justify-between items-end">
                        <div className="space-y-2">
                          <div className="h-3 w-20 bg-neutral-50 rounded-full" />
                          <div className="h-8 w-40 bg-neutral-900 rounded-xl" />
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-[#FF7A00] flex items-center justify-center shadow-lg"><Plus className="h-6 w-6 text-black" /></div>
                      </div>
                      
                      <div className="grid grid-cols-7 gap-3">
                        {Array.from({length: 7}).map((_, i) => (
                          <div key={i} className={cn(
                            "h-24 rounded-2xl border flex flex-col items-center justify-center gap-2",
                            i === 3 ? "bg-neutral-900 border-neutral-900 text-[#FF7A00]" : "bg-neutral-50 border-neutral-100"
                          )}>
                            <div className="text-[10px] font-black uppercase opacity-40">Пн</div>
                            <div className="text-lg font-black">{12 + i}</div>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-4">
                        {[
                          { name: "Стрижка + Борода", time: "12:00", price: "40.00", icon: <MousePointer2 className="h-4 w-4 absolute -right-2 -bottom-2 text-black fill-white" /> },
                          { name: "Оформление бровей", time: "14:30", price: "25.00", active: true }
                        ].map((b, i) => (
                          <div key={i} className={cn(
                            "p-5 rounded-2xl flex items-center justify-between relative",
                            b.active ? "bg-neutral-50 border border-neutral-100" : "bg-white border border-neutral-100 opacity-50"
                          )}>
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-full bg-neutral-200" />
                              <div className="flex flex-col">
                                <span className="text-xs font-black uppercase italic leading-none mb-1">{b.name}</span>
                                <span className="text-[10px] font-bold text-neutral-400">{b.time}</span>
                              </div>
                            </div>
                            <div className="text-sm font-black italic">{b.price}</div>
                            {b.icon}
                          </div>
                        ))}
                      </div>
                   </div>
                 </div>

                 {/* Floating Badges */}
                 <div className="absolute -left-10 top-1/4 p-4 bg-white rounded-2xl shadow-2xl border border-neutral-100 animate-bounce-slow">
                   <div className="flex items-center gap-3">
                     <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center"><CheckCircle2 className="h-5 w-5" /></div>
                     <div className="text-[10px] font-black uppercase tracking-widest">Запись создана</div>
                   </div>
                 </div>

                 <div className="absolute -right-6 bottom-10 p-4 bg-black rounded-2xl shadow-2xl animate-float">
                   <div className="flex items-center gap-3">
                     <div className="h-8 w-8 rounded-lg bg-[#FF7A00]/20 text-[#FF7A00] flex items-center justify-center"><Zap className="h-5 w-5" fill="currentColor" /></div>
                     <div className="text-[10px] font-black uppercase tracking-widest text-white">Выручка +24%</div>
                   </div>
                 </div>
               </div>
            </div>
          </div>
        </section>

        {/* Categories Marquee (Infinite scroll) */}
        <section className="py-10 bg-white border-y border-neutral-100 overflow-hidden relative">
          <div className="flex items-center gap-12 whitespace-nowrap animate-marquee">
            {["Barbershops", "Beauty Salons", "Tattoo Studios", "Medical Clinics", "Yoga Centers", "Photo Studios", "Dental Clinics", "Pet Grooming"].map((cat, i) => (
              <div key={i} className="flex items-center gap-4">
                 <div className="h-2 w-2 rounded-full bg-neutral-200" />
                 <span className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic text-neutral-100 hover:text-neutral-900 transition-colors cursor-default">{cat}</span>
              </div>
            ))}
            {/* Duplicate for infinite loop */}
            {["Barbershops", "Beauty Salons", "Tattoo Studios", "Medical Clinics", "Yoga Centers", "Photo Studios", "Dental Clinics", "Pet Grooming"].map((cat, i) => (
              <div key={i+"-dup"} className="flex items-center gap-4">
                 <div className="h-2 w-2 rounded-full bg-neutral-200" />
                 <span className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic text-neutral-100 hover:text-neutral-900 transition-colors cursor-default">{cat}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Bento Grid Features */}
        <section id="features" className="py-32 px-6 relative">
          <div className="max-w-7xl mx-auto space-y-20">
            <div className="max-w-3xl space-y-6">
              <Badge className="bg-neutral-900 text-[#FF7A00] rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-widest">Features</Badge>
              <h2 className="text-4xl md:text-6xl font-black tracking-tight uppercase italic leading-[0.9]">Всё, что нужно<br />для масштабирования</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((f, i) => (
                <div key={i} className={cn(
                  "p-12 rounded-[3rem] flex flex-col justify-between transition-all duration-500 hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)] group overflow-hidden relative",
                  f.colSpan, f.bg, f.text
                )}>
                  {/* Subtle Background Glow for cards */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF7A00] rounded-full blur-[80px] opacity-0 group-hover:opacity-20 transition-opacity" />
                  
                  <div className="space-y-6 relative z-10">
                    <div className={cn(
                      "h-16 w-16 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110",
                      f.bg === 'bg-neutral-900' ? "bg-white/10" : f.bg === 'bg-[#FF7A00]' ? "bg-black/5" : "bg-neutral-50"
                    )}>
                      <f.icon className={cn("h-8 w-8", f.iconColor)} />
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-3xl font-black tracking-tight uppercase italic">{f.title}</h3>
                      <p className={cn("text-base leading-relaxed font-medium opacity-70", f.bg === 'bg-neutral-900' ? "" : "")}>
                        {f.desc}
                      </p>
                    </div>
                  </div>
                  
                  {f.imageMock}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-40 px-6 bg-neutral-900 relative overflow-hidden text-center">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FF7A00] rounded-full blur-[180px] opacity-10"></div>
          
          <div className="max-w-4xl mx-auto space-y-12 relative z-10">
             <h2 className="text-5xl md:text-[7rem] font-black text-white leading-[0.8] uppercase italic tracking-tighter">
               ХВАТИТ<br />
               <span className="text-[#FF7A00]">ЖДАТЬ.</span>
             </h2>
             <p className="text-xl text-neutral-400 font-medium max-w-lg mx-auto leading-relaxed">
               Присоединяйтесь к TimeHub сегодня и переведите свой бизнес на современные рельсы.
             </p>
             <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Button 
                  onClick={() => router.push('/register')}
                  className="h-20 px-16 text-xl bg-[#FF7A00] text-black hover:bg-white rounded-[2rem] font-black uppercase tracking-widest transition-all hover:scale-110"
                >
                  Создать аккаунт
                </Button>
                <div className="text-left">
                  <div className="text-[#FF7A00] font-black text-2xl tracking-tight leading-none">FREE</div>
                  <div className="text-neutral-500 font-bold text-[10px] uppercase tracking-widest mt-1">До 100 записей/мес</div>
                </div>
             </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white py-16 px-6 border-t border-neutral-100">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="flex flex-col gap-4 items-center md:items-start">
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-neutral-900" fill="currentColor" />
              <span className="font-black text-2xl tracking-tighter italic">TimeHub</span>
            </div>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest max-w-[200px] text-center md:text-left leading-relaxed">
              Precision software for service based business.
            </p>
          </div>
          
          <div className="flex gap-12">
            <div className="flex flex-col gap-4">
               <span className="text-[10px] font-black uppercase text-neutral-900 tracking-[0.2em] mb-2">Продукт</span>
               <a href="#" className="text-xs font-bold text-neutral-400 hover:text-black transition-colors uppercase tracking-widest">Виджет</a>
               <a href="#" className="text-xs font-bold text-neutral-400 hover:text-black transition-colors uppercase tracking-widest">Тарифы</a>
            </div>
            <div className="flex flex-col gap-4">
               <span className="text-[10px] font-black uppercase text-neutral-900 tracking-[0.2em] mb-2">Компания</span>
               <a href="#" className="text-xs font-bold text-neutral-400 hover:text-black transition-colors uppercase tracking-widest">О нас</a>
               <a href="#" className="text-xs font-bold text-neutral-400 hover:text-black transition-colors uppercase tracking-widest">Блог</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Tailwind v4 Extra Styles for animations */}
      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 4s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0); }
          50% { transform: translateY(-15px) rotate(2deg); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .perspective-2000 {
          perspective: 2000px;
        }
        .rotate-y-n15 { transform: rotateY(-15deg); }
        .rotate-x-10 { transform: rotateX(10deg); }
        .mask-fade-right {
          mask-image: linear-gradient(to right, black 80%, transparent 100%);
        }
      `}</style>
    </div>
  );
}
