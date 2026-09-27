import React from 'react';
import { QuizQuestionData } from '../../types/quiz';
import { Check } from 'lucide-react';
import { DynamicIcon } from '../DynamicIcon';

interface Q5Props {
  question: QuizQuestionData;
  selected: string[];
  onToggle: (id: string) => void;
}

export const Q5FamilyHistory: React.FC<Q5Props> = ({ question, selected, onToggle }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-2.5">
      {question.options.map((opt) => {
        const isSel = selected.includes(opt.id);

        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onToggle(opt.id)}
            className={`relative text-left px-3.5 sm:px-3 py-3 sm:py-2.5 rounded-xl transition-all duration-150 cursor-pointer flex items-center justify-between border active:scale-[0.98] min-h-[52px] sm:min-h-0 ${
              isSel
                ? 'bg-emerald-50/90 border-emerald-600 ring-2 ring-emerald-600/20 shadow-2xs'
                : 'bg-white border-stone-200 hover:border-emerald-500/50 hover:bg-stone-50/50'
            }`}
            aria-pressed={isSel}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8.5 h-8.5 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  isSel ? 'bg-emerald-700 text-white' : 'bg-stone-100 text-stone-600'
                }`}
              >
                <DynamicIcon name={opt.iconName} className="w-4 h-4 sm:w-4 sm:h-4" />
              </div>

              <span
                className={`text-xs sm:text-sm font-semibold transition-colors truncate ${
                  isSel ? 'text-emerald-950 font-bold' : 'text-stone-800'
                }`}
              >
                {opt.label}
              </span>
            </div>

            <div
              className={`w-4 h-4 rounded-md border shrink-0 flex items-center justify-center transition-colors ml-2 ${
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
  );
};
