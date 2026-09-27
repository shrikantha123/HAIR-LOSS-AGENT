import React from 'react';
import { QuizQuestionData } from '../../types/quiz';
import { Check } from 'lucide-react';

interface Q1Props {
  question: QuizQuestionData;
  selected: string[];
  onToggle: (id: string) => void;
}

export const Q1Onset: React.FC<Q1Props> = ({ question, selected, onToggle }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-2.5">
      {question.options.map((opt) => {
        const isSel = selected.includes(opt.id);

        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onToggle(opt.id)}
            className={`relative text-left p-4 sm:p-3 rounded-2xl transition-all duration-150 cursor-pointer flex flex-col justify-between min-h-[96px] sm:min-h-[74px] border active:scale-[0.98] ${
              isSel
                ? 'bg-emerald-50/90 border-emerald-600 ring-2 ring-emerald-600/20 shadow-2xs'
                : 'bg-white border-stone-200 hover:border-emerald-500/60 hover:bg-stone-50/50'
            }`}
            aria-pressed={isSel}
          >
            <div className="flex items-center justify-between w-full mb-2 sm:mb-1">
              <div
                className={`w-3.5 h-3.5 sm:w-2.5 sm:h-2.5 rounded-full transition-colors ${
                  isSel ? 'bg-emerald-600 ring-2 ring-emerald-200' : 'bg-stone-300'
                }`}
              />
              {isSel && (
                <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}
            </div>

            <span
              className={`text-xs sm:text-sm font-semibold transition-colors leading-snug ${
                isSel ? 'text-emerald-950 font-bold' : 'text-stone-800'
              }`}
            >
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
