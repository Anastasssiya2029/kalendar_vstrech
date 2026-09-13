// Задача #21 - Haptic feedback для мобильных устройств

export const hapticFeedback = {
  // Легкая вибрация при нажатии на кнопки
  light: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },

  // Средняя вибрация при успешном действии
  medium: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(20);
    }
  },

  // Сильная вибрация при ошибке или важном действии
  heavy: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([30, 10, 30]);
    }
  },

  // Вибрация при успехе
  success: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 50, 10]);
    }
  },

  // Вибрация при ошибке
  error: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 30, 50, 30, 50]);
    }
  },

  // Вибрация при выборе (toggle)
  selection: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(5);
    }
  }
};
