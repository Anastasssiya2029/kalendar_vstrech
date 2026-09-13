import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  rotation: number;
  rotationSpeed: number;
  type: 'clock' | 'percent' | 'ruble';
  emoji?: string;
  opacity: number;
}

const CLOCK_EMOJIS = ['🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛'];

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Устанавливаем размеры canvas
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Создаем частицы
    const createParticles = () => {
      const particles: Particle[] = [];
      const particleCount = Math.floor((canvas.width * canvas.height) / 15000); // Адаптивное количество

      for (let i = 0; i < particleCount; i++) {
        const type = Math.random() < 0.33 ? 'clock' : Math.random() < 0.5 ? 'percent' : 'ruble';
        
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 20 + 15, // 15-35px
          speedX: (Math.random() - 0.5) * 0.5, // Медленная скорость
          speedY: (Math.random() - 0.5) * 0.5,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.02,
          type,
          emoji: type === 'clock' ? CLOCK_EMOJIS[Math.floor(Math.random() * CLOCK_EMOJIS.length)] : undefined,
          opacity: Math.random() * 0.3 + 0.1 // 0.1-0.4
        });
      }

      particlesRef.current = particles;
    };

    createParticles();

    // Анимация
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Рисуем градиентный фон
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#0f172a'); // темно-синий
      gradient.addColorStop(0.3, '#1e1b4b'); // темно-фиолетовый
      gradient.addColorStop(0.6, '#4c1d95'); // фиолетовый
      gradient.addColorStop(1, '#7c2d12'); // темно-красный
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Звезды (маленькие точки)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = Math.random() * 2;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Обновляем и рисуем частицы
      particlesRef.current.forEach((particle) => {
        // Обновляем позицию
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        particle.rotation += particle.rotationSpeed;

        // Wrap around edges
        if (particle.x < -50) particle.x = canvas.width + 50;
        if (particle.x > canvas.width + 50) particle.x = -50;
        if (particle.y < -50) particle.y = canvas.height + 50;
        if (particle.y > canvas.height + 50) particle.y = -50;

        // Сохраняем контекст для трансформации
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        ctx.globalAlpha = particle.opacity;

        if (particle.type === 'clock' && particle.emoji) {
          // Рисуем emoji часов
          ctx.font = `${particle.size}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(particle.emoji, 0, 0);
        } else if (particle.type === 'percent') {
          // Рисуем %
          ctx.font = `bold ${particle.size}px Arial`;
          ctx.fillStyle = '#A855F7'; // фиолетовый
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('%', 0, 0);
        } else if (particle.type === 'ruble') {
          // Рисуем ₽
          ctx.font = `bold ${particle.size}px Arial`;
          ctx.fillStyle = '#10B981'; // зеленый
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('₽', 0, 0);
        }

        ctx.restore();
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full -z-10 pointer-events-none"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 30%, #4c1d95 60%, #7c2d12 100%)' }}
    />
  );
}
