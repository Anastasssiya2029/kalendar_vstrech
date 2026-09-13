import React from 'react';

export function StatusLegend() {
  return (
    <div className="bg-white rounded-3xl shadow-3d hover:shadow-3d-hover transition-all duration-500 hover:-translate-y-1">
      <div className="p-6">
        <h4 className="text-gray-900 mb-4 font-semibold">Статусы надежности клиентов</h4>
        <div className="flex gap-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center shadow-sm">
              <span className="text-3xl">💗</span>
            </div>
            <div>
              <p className="text-gray-900 font-semibold">Надежный клиент</p>
              <p className="text-gray-600">Нет просрочек по платежам</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-100 to-pink-100 flex items-center justify-center shadow-sm">
              <span className="text-3xl">💔</span>
            </div>
            <div>
              <p className="text-gray-900 font-semibold">Ненадежный клиент</p>
              <p className="text-gray-600">Есть история просрочек</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}