import React, { useState } from 'react';
import { QuizQuestionData } from '../../types/quiz';
import { Check, ZoomIn, X } from 'lucide-react';
import { DynamicIcon } from '../DynamicIcon';

interface Q7Props {
  question: QuizQuestionData;
  selected: string[];
  onToggle: (id: string) => void;
}

export const Q7ScalpSymptoms: React.FC<Q7Props> = ({ question, selected, onToggle }) => {
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string } | null>(null);

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-2">
        {question.options.map((opt) => {
          const isSel = selected.includes(opt.id);

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onToggle(opt.id)}
              className={`group relative text-left p-3 sm:p-2.5 rounded-xl transition-all duration-150 cursor-pointer flex flex-col justify-between min-h-[82px] sm:min-h-[72px] border active:scale-[0.98] ${
                isSel
                  ? 'bg-emerald-50/90 border-emerald-600 ring-2 ring-emerald-600/20 shadow-2xs'
                  : 'bg-white border-stone-200 hover:border-emerald-500/50 hover:bg-stone-50/50'
              }`}
              aria-pressed={isSel}
            >
              <div className="flex items-center justify-between w-full mb-1.5 sm:mb-1">
                {opt.image ? (
                  /* Real Clinical Photo Thumbnail for Dandruff / Scalp Issue */
                  <div className="relative w-10 h-10 sm:w-8 sm:h-8 rounded-lg overflow-hidden bg-stone-100 shrink-0 border border-stone-200 shadow-2xs">
                    <img
                      src={opt.image}
                      alt={opt.label}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewImage({ src: opt.image!, title: opt.label });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.stopPropagation();
                          setPreviewImage({ src: opt.image!, title: opt.label });
                        }
                      }}
                      className="absolute inset-0 bg-stone-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                      title="Zoom"
                    >
                      <ZoomIn className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                    </div>
                  </div>
                ) : (
                  <div
                    className={`w-8 h-8 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center transition-colors ${
                      isSel ? 'bg-emerald-700 text-white' : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    <DynamicIcon name={opt.iconName} className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  </div>
                )}

                <div
                  className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0 ml-1 ${
                    isSel
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-stone-300 bg-white text-transparent'
                  }`}
                >
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              </div>

              <span
                className={`text-xs sm:text-sm font-semibold transition-colors leading-tight ${
                  isSel ? 'text-emerald-950 font-bold' : 'text-stone-800'
                }`}
              >
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Real Clinical Photo Preview Modal */}
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
                type="button"
                onClick={() => setPreviewImage(null)}
                className="w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors cursor-pointer"
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
