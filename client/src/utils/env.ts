/**
 * Утилита для безопасного доступа к переменным окружения
 */

/**
 * Проверяет, подключен ли реальный API
 * @returns true если API подключен, false если используются моки
 */
export const isApiConnected = (): boolean => {
  try {
    return !!import.meta.env.VITE_API_URL;
  } catch {
    return false;
  }
};

/**
 * Получает URL API или пустую строку для мокового режима
 * @returns URL API или пустая строка
 */
export const getApiUrl = (): string => {
  try {
    return import.meta.env.VITE_API_URL || '';
  } catch {
    return '';
  }
};

/**
 * Проверяет, используется ли моковый API
 * @returns true если используются моки, false если реальный API
 */
export const useMockApi = (): boolean => {
  return !isApiConnected();
};
