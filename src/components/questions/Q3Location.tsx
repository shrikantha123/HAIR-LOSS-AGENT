import React, { useState } from 'react';
import { QuizQuestionData } from '../../types/quiz';
import { Check, ZoomIn, X } from 'lucide-react';

interface Q3Props {
  question: QuizQuestionData;
  selected: string[];
  onToggle: (id: string) => void;
}

export const Q3Location: React.FC<Q3Props> = ({ question, selected, onToggle }) => {
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string } | null>(null);

  const isFront = selected.includes('front');
  const isTemples = selected.includes('temples');
  const isMid = selected.includes('mid');
  const isCrown = selected.includes('crown');

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4">
        {/* Scalp View Diagram - slightly increased height on mobile only */}
        <div className="w-32 sm:w-28 shrink-0 bg-stone-100/80 border border-stone-200 rounded-xl p-2.5 sm:p-1.5 flex flex-col items-center">
          <span className="text-[11px] sm:text-[9px] font-bold text-stone-500 uppercase tracking-wider mb-1">
            Scalp View
          </span>

          <div className="relative w-24 sm:w-20 h-28 sm:h-24 flex items-center justify-center">
            <svg
              className="w-full h-full select-none"
              viewBox="0 0 170 210"
              xmlns="http://www.w3.org/2000/svg"
            >
              <ellipse cx="85" cy="118" rx="72" ry="90" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
              <path d="M 11 105 C 5 115 5 133 14 141" fill="none" stroke="#94a3b8" strokeWidth="1.5" />
              <path d="M 159 105 C 165 115 165 133 156 141" fill="none" stroke="#94a3b8" strokeWidth="1.5" />

              {/* FRONT */}
              <path
                d="M 38 50 Q 85 30 132 50 L 128 70 Q 85 58 42 70 Z"
                fill={isFront ? '#16a34a' : '#e2e8f0'}
                fillOpacity={isFront ? 0.95 : 0.6}
                stroke={isFront ? '#15803d' : '#cbd5e1'}
                strokeWidth="1.5"
                className="cursor-pointer transition-colors"
                onClick={() => onToggle('front')}
              />

              {/* TEMPLES */}
              <path
                d="M 14 68 Q 28 52 42 70 L 38 95 Q 22 84 12 92 Z"
                fill={isTemples ? '#16a34a' : '#e2e8f0'}
                fillOpacity={isTemples ? 0.95 : 0.6}
                stroke={isTemples ? '#15803d' : '#cbd5e1'}
                strokeWidth="1.5"
                className="cursor-pointer transition-colors"
                onClick={() => onToggle('temples')}
              />
              <path
                d="M 156 68 Q 142 52 128 70 L 132 95 Q 148 84 158 92 Z"
                fill={isTemples ? '#16a34a' : '#e2e8f0'}
                fillOpacity={isTemples ? 0.95 : 0.6}
                stroke={isTemples ? '#15803d' : '#cbd5e1'}
                strokeWidth="1.5"
                className="cursor-pointer transition-colors"
                onClick={() => onToggle('temples')}
              />

              {/* MID-SCALP */}
              <ellipse
                cx="85"
                cy="108"
                rx="46"
                ry="26"
                fill={isMid ? '#16a34a' : '#e2e8f0'}
                fillOpacity={isMid ? 0.95 : 0.6}
                stroke={isMid ? '#15803d' : '#cbd5e1'}
                strokeWidth="1.5"
                className="cursor-pointer transition-colors"
                onClick={() => onToggle('mid')}
              />

              {/* CROWN */}
              <ellipse
                cx="85"
                cy="154"
                rx="34"
                ry="24"
                fill={isCrown ? '#16a34a' : '#e2e8f0'}
                fillOpacity={isCrown ? 0.95 : 0.6}
                stroke={isCrown ? '#15803d' : '#cbd5e1'}
                strokeWidth="1.5"
                className="cursor-pointer transition-colors"
                onClick={() => onToggle('crown')}
              />

              <text x="85" y="46" fill={isFront ? '#ffffff' : '#64748b'} fontSize="7" textAnchor="middle" fontWeight="700" pointerEvents="none">FRONT</text>
              <text x="26" y="78" fill={isTemples ? '#ffffff' : '#64748b'} fontSize="6" textAnchor="middle" fontWeight="700" pointerEvents="none">TEMPLE</text>
              <text x="144" y="78" fill={isTemples ? '#ffffff' : '#64748b'} fontSize="6" textAnchor="middle" fontWeight="700" pointerEvents="none">TEMPLE</text>
              <text x="85" y="110" fill={isMid ? '#ffffff' : '#64748b'} fontSize="7" textAnchor="middle" fontWeight="700" pointerEvents="none">MID</text>
              <text x="85" y="157" fill={isCrown ? '#ffffff' : '#64748b'} fontSize="7" textAnchor="middle" fontWeight="700" pointerEvents="none">CROWN</text>
            </svg>
          </div>
        </div>

        {/* Real Clinical Photo Cards Grid - slightly increased height on mobile only */}
        <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-2">
          {question.options.map((opt) => {
            const isSel = selected.includes(opt.id);

            return (
              <div
                key={opt.id}
                onClick={() => onToggle(opt.id)}
                className={`group relative text-left rounded-xl sm:rounded-xl overflow-hidden transition-all duration-150 cursor-pointer flex items-center p-2.5 sm:p-1.5 gap-2.5 sm:gap-2 border active:scale-[0.98] min-h-[66px] sm:min-h-0 ${
                  isSel
                    ? 'bg-emerald-50/90 border-emerald-600 ring-2 ring-emerald-600/20 shadow-2xs'
                    : 'bg-white border-stone-200 hover:border-emerald-500/60'
                }`}
                role="checkbox"
                aria-checked={isSel}
              >
                {/* Real Photo Thumbnail - slightly taller on mobile */}
                <div className="relative w-14 h-14 sm:w-12 sm:h-12 rounded-lg bg-stone-100 overflow-hidden shrink-0 shadow-2xs">
                  {opt.image && (
                    <img
                      src={opt.image}
                      alt={opt.label}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}
                  {opt.image && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewImage({ src: opt.image!, title: opt.label });
                      }}
                      className="absolute inset-0 bg-stone-900/30 opacity-0 group-hover:opacity-100 sm:opacity-0 flex items-center justify-center text-white transition-opacity"
                      title="Zoom"
                    >
                      <ZoomIn className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                    </button>
                  )}
                </div>

                {/* Option Label */}
                <div className="flex-1 min-w-0 pr-0.5">
                  <h4
                    className={`text-xs sm:text-xs font-semibold leading-tight transition-colors line-clamp-2 ${
                      isSel ? 'text-emerald-950 font-bold' : 'text-stone-800'
                    }`}
                  >
                    {opt.label}
                  </h4>
                </div>

                {/* Checkbox square */}
                <div
                  className={`w-4 h-4 rounded-md border shrink-0 flex items-center justify-center transition-colors ${
                    isSel
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-stone-300 bg-white text-transparent'
                  }`}
                >
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-xs"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative bg-white rounded-2xl overflow-hidden max-w-sm w-full shadow-2xl p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-stone-200">
              <h3 className="text-sm font-bold text-stone-900">{previewImage.title}</h3>
              <button
                onClick={() => setPreviewImage(null)}
                className="w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mt-2 aspect-square rounded-xl overflow-hidden bg-stone-100">
              <img src={previewImage.src} alt={previewImage.title} className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
