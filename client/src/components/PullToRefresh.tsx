// Задача #25 - Pull to refresh для мобильных устройств
import { useState, useEffect, useRef, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const threshold = 80; // Минимальная дистанция для триггера обновления
  const maxDistance = 120; // Максимальная дистанция pull

  const handleTouchStart = (e: TouchEvent) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (startY === 0 || window.scrollY > 0 || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const distance = Math.min(currentY - startY, maxDistance);
    
    if (distance > 0) {
      setPullDistance(distance);
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold);
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
    setStartY(0);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [startY, pullDistance, isRefreshing]);

  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 360;

  return (
    <div ref={containerRef} className="relative">
      <AnimatePresence>
        {(pullDistance > 0 || isRefreshing) && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute top-0 left-0 right-0 flex justify-center items-center pointer-events-none z-50"
            style={{ height: `${pullDistance}px` }}
          >
            <div className="bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg">
              <RefreshCw 
                className={`w-6 h-6 text-purple-600 ${isRefreshing ? 'animate-spin' : ''}`}
                style={{ 
                  transform: isRefreshing ? undefined : `rotate(${rotation}deg)`,
                  transition: 'transform 0.1s ease-out'
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div 
        style={{ 
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
          transition: pullDistance === 0 ? 'transform 0.3s ease-out' : 'none'
        }}
      >
        {children}
      </div>
    </div>
  );
}
