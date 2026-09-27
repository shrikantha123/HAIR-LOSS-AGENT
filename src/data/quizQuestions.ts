import { QuizQuestionData } from '../types/quiz';
import frontalsImg from '../assets/images/frontals.jpg';
import templeImg from '../assets/images/temple.jpg';
import midsImg from '../assets/images/mids.jpg';
import crownImg from '../assets/images/crownthinning.webp';
import diffuseImg from '../assets/images/diffuse.jpg';
import patchyImg from '../assets/images/scalp_patchy_photo_1790514581297.jpg';
import dandruffImg from '../assets/images/dandruff.jpg';
import rednessImg from '../assets/images/scalp_redness_photo_1790516374382.jpg';
import itchingImg from '../assets/images/scalp_itching_photo_1790516624618.jpg';
import burningImg from '../assets/images/scalp_burning_photo_1790516648868.jpg';
import painImg from '../assets/images/scalp_pain_photo_1790516660943.jpg';
import oilinessImg from '../assets/images/scalp_oiliness_photo_1790516637768.jpg';

export const EXACT_QUIZ_QUESTIONS: QuizQuestionData[] = [
  {
    id: 'q1',
    qNumber: 1,
    label: 'Onset',
    title: 'When did you first notice your hair loss?',
    subtitle: 'This helps us understand how long the hair-loss pattern has been present.',
    hint: 'Select one option',
    type: 'single',
    options: [
      { id: '<3mo', label: 'Less than 3 months' },
      { id: '3-6mo', label: '3 – 6 months' },
      { id: '6-12mo', label: '6 – 12 months' },
      { id: '1-2yr', label: '1 – 2 years' },
      { id: '>2yr', label: 'More than 2 years' },
      { id: 'unsure', label: 'Not sure' }
    ]
  },
  {
    id: 'q2',
    qNumber: 2,
    label: 'Pattern',
    title: 'How has your hair loss changed over time?',
    subtitle: 'Choose the pattern that most closely describes your experience.',
    hint: 'Select one option',
    type: 'single',
    options: [
      { id: 'gradual', label: 'Gradual and progressive', trendType: 'gradual' },
      { id: 'sudden', label: 'Sudden', trendType: 'sudden' },
      { id: 'fluctuating', label: 'Comes and goes', trendType: 'fluctuating' },
      { id: 'stable', label: 'Stable / little change', trendType: 'stable' },
      { id: 'unsure', label: 'Not sure', trendType: 'unsure' }
    ]
  },
  {
    id: 'q3',
    qNumber: 3,
    label: 'Location',
    title: 'Where are you experiencing the most hair loss?',
    subtitle: 'Select all areas that apply. Tap the scalp diagram or the options list.',
    hint: 'Select all that apply',
    type: 'multi',
    options: [
      {
        id: 'front',
        label: 'Front / Hairline',
        image: frontalsImg
      },
      {
        id: 'temples',
        label: 'Temples',
        image: templeImg
      },
      {
        id: 'mid',
        label: 'Mid-scalp',
        image: midsImg
      },
      {
        id: 'crown',
        label: 'Crown',
        image: crownImg
      },
      {
        id: 'overall',
        label: 'Overall thinning',
        image: diffuseImg
      },
      {
        id: 'patchy',
        label: 'Patchy areas',
        image: patchyImg
      }
    ]
  },
  {
    id: 'q4',
    qNumber: 4,
    label: 'Shedding',
    title: 'Have you noticed increased hair shedding?',
    subtitle: 'Choose the level that best describes your day-to-day experience.',
    hint: 'Select one option',
    type: 'single',
    options: [
      { id: 'none', label: 'No noticeable increase', level: 0 },
      { id: 'mild', label: 'Mild', level: 1 },
      { id: 'moderate', label: 'Moderate', level: 2 },
      { id: 'heavy', label: 'Heavy', level: 3 },
      { id: 'sudden', label: 'Sudden / excessive', level: 4 }
    ]
  },
  {
    id: 'q5',
    qNumber: 5,
    label: 'Family History',
    title: 'Does hair loss run in your family?',
    subtitle: 'Select all that apply.',
    hint: 'Select all that apply',
    type: 'multi',
    options: [
      { id: 'father', label: 'Father', iconName: 'User' },
      { id: 'maternal-gf', label: 'Maternal grandfather', iconName: 'UserCheck' },
      { id: 'other-relatives', label: 'Other relatives', iconName: 'Users' },
      { id: 'multiple', label: 'Multiple family members', iconName: 'GitMerge' },
      { id: 'none', label: 'No known family history', iconName: 'Shield' },
      { id: 'unsure', label: 'Not sure', iconName: 'HelpCircle' }
    ]
  },
  {
    id: 'q6',
    qNumber: 6,
    label: 'Recent Events',
    title: 'Have you recently experienced any of these?',
    subtitle: 'Select all that apply.',
    hint: 'Select all that apply',
    type: 'multi',
    options: [
      { id: 'stress', label: 'Significant stress', iconName: 'HeartPulse' },
      { id: 'illness', label: 'Fever or major illness', iconName: 'Thermometer' },
      { id: 'weightloss', label: 'Major weight loss', iconName: 'Scale' },
      { id: 'diet', label: 'Dietary changes', iconName: 'Utensils' },
      { id: 'surgery', label: 'Surgery', iconName: 'Scissors' },
      { id: 'medication', label: 'New medication', iconName: 'Pill' },
      { id: 'none6', label: 'None of these', iconName: 'CheckCircle' },
      { id: 'unsure6', label: 'Not sure', iconName: 'HelpCircle' }
    ]
  },
  {
    id: 'q7',
    qNumber: 7,
    label: 'Scalp Symptoms',
    title: 'Do you have any scalp symptoms?',
    subtitle: 'Select all that apply.',
    hint: 'Select all that apply',
    type: 'multi',
    options: [
      { id: 'dandruff', label: 'Dandruff / flaking', image: dandruffImg, iconName: 'Snowflake' },
      { id: 'itching', label: 'Itching', image: itchingImg, iconName: 'Zap' },
      { id: 'redness', label: 'Redness', image: rednessImg, iconName: 'Circle' },
      { id: 'burning', label: 'Burning', image: burningImg, iconName: 'Flame' },
      { id: 'pain', label: 'Scalp pain / tenderness', image: painImg, iconName: 'AlertCircle' },
      { id: 'oiliness', label: 'Excess oiliness', image: oilinessImg, iconName: 'Droplets' },
      { id: 'none7', label: 'No symptoms', iconName: 'CheckCircle' }
    ]
  },
  {
    id: 'q8',
    qNumber: 8,
    label: 'Previous Treatments',
    title: 'Have you used any treatments for your hair loss?',
    subtitle: 'Select all that apply.',
    hint: 'Select all that apply',
    type: 'multi',
    options: [
      { id: 'minoxidil', label: 'Minoxidil', iconName: 'Droplet' },
      { id: 'finasteride', label: 'Finasteride', iconName: 'ShieldAlert' },
      { id: 'other-med', label: 'Other medication', iconName: 'Stethoscope' },
      { id: 'supplements', label: 'Hair supplements', iconName: 'Sparkles' },
      { id: 'prp', label: 'PRP', iconName: 'Syringe' },
      { id: 'transplant', label: 'Hair transplant', iconName: 'Scissors' },
      { id: 'other-treat', label: 'Other treatment', iconName: 'Activity' },
      { id: 'none8', label: 'No previous treatment', iconName: 'CheckCircle' }
    ]
  }
];
