import React from 'react';
import { QuizQuestionData } from '../../types/quiz';
import { Check } from 'lucide-react';

interface Q4Props {
  question: QuizQuestionData;
  selected: string[];
  onToggle: (id: string) => void;
}

export const Q4Shedding: React.FC<Q4Props> = ({ question, selected, onToggle }) => {
  const currentId = selected[0] || '';
  const currentOpt = question.options.find((o) => o.id === currentId);
  const activeLevel = currentOpt?.level ?? -1;

  return (
    <div>
      {/* Interactive Notch Track - slightly taller on mobile */}
      <div className="py-3.5 sm:py-2.5 px-3.5 sm:px-3 mb-3.5 sm:mb-3 bg-stone-50 border border-stone-200 rounded-xl">
        <div className="flex justify-between mb-3 sm:mb-2.5 px-0.5">
          {question.options.map((opt, idx) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onToggle(opt.id)}
              className={`flex-1 text-center text-[11px] sm:text-xs font-semibold px-0.5 cursor-pointer transition-colors leading-tight ${
                idx === activeLevel ? 'text-emerald-700 font-bold' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center px-4">
          {question.options.map((opt, idx) => {
            const isFilled = activeLevel >= idx;
            const isAct = activeLevel === idx;

            return (
              <React.Fragment key={opt.id}>
                <button
                  type="button"
                  onClick={() => onToggle(opt.id)}
                  className={`w-4 h-4 rounded-full border-2 transition-all cursor-pointer shrink-0 relative z-10 ${
                    isAct
                      ? 'bg-emerald-600 border-emerald-600 ring-2 ring-emerald-100 scale-125'
                      : isFilled
                      ? 'bg-emerald-600 border-emerald-600'
                      : 'bg-white border-stone-300 hover:border-emerald-400'
                  }`}
                  aria-label={opt.label}
                />

                {idx < question.options.length - 1 && (
                  <div
                    className={`flex-1 h-1 transition-colors ${
                      activeLevel > idx ? 'bg-emerald-600' : 'bg-stone-200'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Stacked Options - slightly taller on mobile */}
      <div className="space-y-2.5 sm:space-y-2">
        {question.options.map((opt) => {
          const isSel = opt.id === currentId;

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onToggle(opt.id)}
              className={`w-full text-left px-4 sm:px-3.5 py-3 sm:py-2.5 rounded-xl transition-all duration-150 cursor-pointer flex items-center justify-between border active:scale-[0.99] min-h-[48px] sm:min-h-0 ${
                isSel
                  ? 'bg-emerald-50/90 border-emerald-600 ring-2 ring-emerald-600/20 shadow-2xs'
                  : 'bg-white border-stone-200 hover:border-emerald-500/50 hover:bg-stone-50/50'
              }`}
              aria-pressed={isSel}
            >
              <span
                className={`text-xs sm:text-sm font-semibold transition-colors ${
                  isSel ? 'text-emerald-950 font-bold' : 'text-stone-800'
                }`}
              >
                {opt.label}
              </span>

              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                  isSel
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-stone-300 bg-white text-transparent'
                }`}
              >
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
