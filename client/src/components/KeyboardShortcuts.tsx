import React, { useEffect, useState } from 'react';
import { Keyboard, X } from 'lucide-react';

interface Shortcut {
  key: string;
  description: string;
  action: () => void;
}

interface KeyboardShortcutsProps {
  shortcuts: Shortcut[];
}

export function KeyboardShortcuts({ shortcuts }: KeyboardShortcutsProps) {
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Показать справку по горячим клавишам (Ctrl/Cmd + ?)
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShowHelp(true);
        return;
      }

      // Закрыть справку (Escape)
      if (e.key === 'Escape' && showHelp) {
        setShowHelp(false);
        return;
      }

      // Не обрабатываем shortcuts если фокус в input/textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      // Обрабатываем shortcuts
      shortcuts.forEach(shortcut => {
        const keys = shortcut.key.toLowerCase().split('+');
        const hasCtrl = keys.includes('ctrl') || keys.includes('cmd');
        const hasShift = keys.includes('shift');
        const hasAlt = keys.includes('alt');
        const mainKey = keys[keys.length - 1];

        const ctrlMatch = hasCtrl ? (e.ctrlKey || e.metaKey) : !e.ctrlKey && !e.metaKey;
        const shiftMatch = hasShift ? e.shiftKey : !e.shiftKey;
        const altMatch = hasAlt ? e.altKey : !e.altKey;
        const keyMatch = e.key.toLowerCase() === mainKey;

        if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
          e.preventDefault();
          shortcut.action();
        }
      });
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [shortcuts, showHelp]);

  if (!showHelp) {
    return (
      <button
        onClick={() => setShowHelp(true)}
        className="fixed bottom-6 left-6 z-40 p-3 bg-gray-900 text-white rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 group"
        title="Горячие клавиши (Ctrl+/)"
      >
        <Keyboard className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Keyboard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2>Горячие клавиши</h2>
                <p className="text-sm text-gray-600">Быстрое управление системой</p>
              </div>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-3">
            {shortcuts.map((shortcut, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl hover:shadow-md transition-all"
              >
                <span className="text-gray-700 font-medium">{shortcut.description}</span>
                <kbd className="px-3 py-2 bg-white border-2 border-gray-300 rounded-lg font-mono text-sm font-semibold text-gray-900 shadow-sm">
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-yellow-50 rounded-2xl border border-yellow-200">
            <p className="text-sm text-gray-700">
              💡 <strong>Подсказка:</strong> Нажмите <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">Ctrl+/</kbd> чтобы открыть эту справку в любой момент
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook для использования shortcuts
export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  return <KeyboardShortcuts shortcuts={shortcuts} />;
}
