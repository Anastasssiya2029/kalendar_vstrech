import { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { LogIn, Clock } from 'lucide-react';
export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  
  // Generate symbols once
  const backgroundSymbols = useMemo(() => {
    const colors = [
      'color-mix(in srgb, oklch(.714 .203 305.504) 40%, transparent)',
      'color-mix(in srgb, oklch(.707 .165 254.624) 40%, transparent)',
      'color-mix(in srgb, oklch(.673 .182 276.935) 40%, transparent)',
      'color-mix(in srgb, oklch(.702 .183 293.541) 40%, transparent)',
      'color-mix(in srgb, oklch(.789 .154 211.53) 30%, transparent)',
    ];
    
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      color: colors[Math.floor(Math.random() * colors.length)],
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 3 + Math.random() * 3,
      size: 16 + Math.random() * 16,
      rotation: Math.random() * 360,
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Заполните все поля');
      return;
    }

    setIsLoading(true);

    try {
      console.log('Login attempt for:', email);
      await login(email, password);
      console.log('Login successful');
    } catch (err) {
      console.error('Login error:', err);
      const message = err instanceof Error ? err.message : 'Ошибка входа';
      if (message.includes('Invalid login credentials')) {
        setError('Неверный email или пароль');
      } else if (message.includes('rate limit')) {
        setError('Слишком много попыток. Подождите несколько минут.');
      } else if (message.includes('Email not confirmed')) {
        setError('Email не подтверждён. Проверьте почту.');
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page min-h-screen relative overflow-hidden flex items-center justify-center">
      {/* Background */}
      <div className="fixed inset-0 login-page">
        <div className="absolute inset-0 opacity-60">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full bg-[#eaf1ff]/60 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[700px] h-[700px] rounded-full bg-[#f2f5fb] blur-3xl" />
        </div>
        
        {/* Stars */}
        <div className="absolute inset-0">
          {backgroundSymbols.map((item) => (
            <div
              key={item.id}
              className="login-clock absolute animate-twinkle select-none pointer-events-none"
              style={{
                left: `${item.left}%`,
                top: `${item.top}%`,
                animationDelay: `${item.delay}s`,
                animationDuration: `${item.duration}s`,
                color: item.color,
              }}
            >
              <Clock 
                size={item.size} 
                style={{ transform: `rotate(${item.rotation}deg)` }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="login-card rounded-3xl transition-shadow duration-300 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="brand-logo inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" aria-hidden="true">
              <img src="/7k-logo.png" alt="" />
            </div>
            <h2 className="mb-2">Вход в систему</h2>
            <p className="text-gray-600">Управление календарем встреч</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="email" className="text-gray-900">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@school.com"
                required
                className="rounded-xl h-12"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="password" className="text-gray-900">Пароль</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="rounded-xl h-12"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="brand-primary-button w-full rounded-xl h-12"
            >
              {isLoading ? (
                'Вход...'
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Войти
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Учётные записи создаёт администратор календаря.
          </p>
        </div>
      </div>
    </div>
  );
}
