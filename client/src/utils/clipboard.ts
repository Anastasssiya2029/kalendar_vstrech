/**
 * Безопасное копирование текста в буфер обмена с fallback
 * Работает даже если Clipboard API заблокирован
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Пытаемся использовать современный Clipboard API
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    // Fallback метод: создаем временный textarea
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      textArea.remove();
      
      return successful;
    } catch (fallbackError) {
      console.error('Copy failed:', error, fallbackError);
      return false;
    }
  }
}
