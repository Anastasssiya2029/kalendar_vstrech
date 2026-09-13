/**
 * Безопасная работа с localStorage с обработкой ошибок
 * Полезно когда localStorage заблокирован или недоступен (например, в iframe)
 */

export function safeLocalStorageGet(key: string, defaultValue: string | null = null): string | null {
  try {
    return localStorage.getItem(key) ?? defaultValue;
  } catch (error) {
    console.warn(`Failed to get item from localStorage: ${key}`, error);
    return defaultValue;
  }
}

export function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`Failed to set item in localStorage: ${key}`, error);
    return false;
  }
}

export function safeLocalStorageRemove(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`Failed to remove item from localStorage: ${key}`, error);
    return false;
  }
}

export function safeLocalStorageClear(): boolean {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.warn('Failed to clear localStorage', error);
    return false;
  }
}

/**
 * Безопасная работа с sessionStorage
 */

export function safeSessionStorageGet(key: string, defaultValue: string | null = null): string | null {
  try {
    return sessionStorage.getItem(key) ?? defaultValue;
  } catch (error) {
    console.warn(`Failed to get item from sessionStorage: ${key}`, error);
    return defaultValue;
  }
}

export function safeSessionStorageSet(key: string, value: string): boolean {
  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`Failed to set item in sessionStorage: ${key}`, error);
    return false;
  }
}

export function safeSessionStorageRemove(key: string): boolean {
  try {
    sessionStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`Failed to remove item from sessionStorage: ${key}`, error);
    return false;
  }
}
