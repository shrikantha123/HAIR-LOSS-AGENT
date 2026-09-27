import { QuizState, AssessmentResult } from '../types/quiz';
import { EXACT_QUIZ_QUESTIONS } from '../data/quizQuestions';

export function computeAssessment(state: QuizState): AssessmentResult {
  const { answers } = state;

  const q1 = (answers['q1'] || [])[0] || 'unsure';
  const q2 = (answers['q2'] || [])[0] || 'gradual';
  const q3 = answers['q3'] || [];
  const q4 = (answers['q4'] || [])[0] || 'moderate';
  const q5 = answers['q5'] || [];
  const q6 = answers['q6'] || [];
  const q7 = answers['q7'] || [];
  const q8 = answers['q8'] || [];

  // Probabilities calculation
  let androPoints = 0;
  let teloPoints = 0;
  let scalpPoints = 0;
  let otherPoints = 0;

  // Onset & Pattern
  if (q1 === '>2yr' || q1 === '1-2yr') androPoints += 4;
  else if (q1 === '<3mo' || q1 === '3-6mo') teloPoints += 4;

  if (q2 === 'gradual') androPoints += 5;
  else if (q2 === 'sudden') teloPoints += 6;
  else if (q2 === 'fluctuating') { teloPoints += 3; scalpPoints += 3; }
  else if (q2 === 'stable') androPoints += 2;

  // Location
  if (q3.includes('front') || q3.includes('temples') || q3.includes('crown')) androPoints += 5;
  if (q3.includes('overall')) teloPoints += 5;
  if (q3.includes('patchy')) otherPoints += 7;
  if (q3.includes('mid')) { androPoints += 3; teloPoints += 2; }

  // Shedding
  if (q4 === 'sudden' || q4 === 'heavy') teloPoints += 5;
  else if (q4 === 'moderate') { androPoints += 2; teloPoints += 2; }
  else if (q4 === 'mild' || q4 === 'none') androPoints += 3;

  // Family history
  if (q5.includes('father') || q5.includes('maternal-gf') || q5.includes('multiple')) androPoints += 6;
  else if (q5.includes('none')) teloPoints += 3;

  // Recent triggers
  const activeTriggers = q6.filter(t => !['none6', 'unsure6'].includes(t));
  if (activeTriggers.length > 0) {
    teloPoints += activeTriggers.length * 3;
  }

  // Scalp symptoms
  const activeSymptoms = q7.filter(s => s !== 'none7');
  if (activeSymptoms.length > 0) {
    scalpPoints += activeSymptoms.length * 3;
  }

  const sumPoints = Math.max(1, androPoints + teloPoints + scalpPoints + otherPoints);
  let pAndro = Math.round((androPoints / sumPoints) * 100);
  let pTelo = Math.round((teloPoints / sumPoints) * 100);
  let pScalp = Math.round((scalpPoints / sumPoints) * 100);
  let pOther = Math.max(5, 100 - (pAndro + pTelo + pScalp));

  // Normalize
  const total = pAndro + pTelo + pScalp + pOther;
  pAndro = Math.round((pAndro / total) * 100);
  pTelo = Math.round((pTelo / total) * 100);
  pScalp = Math.round((pScalp / total) * 100);
  pOther = 100 - (pAndro + pTelo + pScalp);

  // Condition name
  let conditionName = 'Androgenetic Alopecia (Pattern Hair Loss)';
  let patternType = 'Norwood-Ludwig Classification';
  if (q3.includes('patchy') && pOther > 25) {
    conditionName = 'Alopecia Areata Suspect (Patchy Focal Loss)';
    patternType = 'Circumscribed Patchy Pattern';
  } else if (pTelo > pAndro && (q4 === 'heavy' || q4 === 'sudden' || activeTriggers.length > 0)) {
    conditionName = 'Acute Telogen Effluvium (Reactive Shedding)';
    patternType = 'Diffuse Telogen Shift';
  } else if (pScalp >= 35) {
    conditionName = 'Seborrheic Dermatitis with Secondary Hair Shedding';
    patternType = 'Inflammatory Scalp Pattern';
  } else if (q3.includes('front') && q3.includes('crown')) {
    conditionName = 'Combined Frontotemporal & Vertex Pattern Loss';
    patternType = 'Norwood Scale Stage III-Vertex';
  } else if (q3.includes('mid') && !q3.includes('temples')) {
    conditionName = 'Female Pattern Hair Loss / Midline Thinning';
    patternType = 'Ludwig Scale Grade I-II';
  }

  // Calculate score out of 10
  let score = 7.5;
  if (q4 === 'heavy') score -= 1.0;
  if (q4 === 'sudden') score -= 1.5;
  if (q3.length >= 3) score -= 1.2;
  if (activeSymptoms.length >= 2) score -= 0.8;
  if (activeTriggers.length >= 2) score -= 0.6;
  const follicularScore = Math.max(3.5, Math.min(9.2, Number(score.toFixed(1))));

  // Affected zones labels
  const zoneNames: Record<string, string> = {
    front: 'Frontal Hairline',
    temples: 'Bitemporal Peaks',
    mid: 'Mid-Scalp Parting',
    crown: 'Crown Vertex Whorl',
    overall: 'Diffuse Whole Scalp',
    patchy: 'Circumscribed Focal Patches'
  };
  const affectedZones = q3.map(z => zoneNames[z] || z);

  // Recommendations
  const recommendations: string[] = [];
  if (pAndro >= 40) {
    recommendations.push('Dermatological assessment for topical DHT modulation (such as Minoxidil 5% or topical Finasteride).');
    recommendations.push('High-magnification digital trichoscopy to measure follicular miniaturization ratio.');
  }
  if (pTelo >= 30) {
    recommendations.push('Comprehensive blood evaluation: Serum Ferritin, Vitamin D3, Complete Blood Count, and TSH.');
    recommendations.push('Nutritional stabilization with bioavailable protein, amino acids, and adequate cellular hydration.');
  }
  if (activeSymptoms.length > 0) {
    recommendations.push('Anti-inflammatory scalp therapy with Ketoconazole 2% or Zinc Pyrithione to soothe the follicular barrier.');
    recommendations.push('Avoid unbuffered heavy oils on inflamed scalp to prevent Malassezia proliferation.');
  }
  if (recommendations.length < 3) {
    recommendations.push('Standardized photographic follow-up every 90 days to monitor progression.');
  }

  const resultId = `ANR-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  const dateStr = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

  return {
    id: resultId,
    date: dateStr,
    follicularScore,
    conditionName,
    patternType,
    affectedZones: affectedZones.length > 0 ? affectedZones : ['Non-localized'],
    sheddingIntensity: q4.charAt(0).toUpperCase() + q4.slice(1),
    familyHistorySummary: q5.join(', ') || 'None reported',
    recentTriggersSummary: activeTriggers.length > 0 ? activeTriggers.join(', ') : 'No recent acute triggers reported',
    scalpHealthSummary: activeSymptoms.length > 0 ? activeSymptoms.join(', ') : 'Healthy, asymptomatic scalp',
    treatmentHistorySummary: q8.length > 0 ? q8.join(', ') : 'No prior medical treatments',
    recommendations,
    probabilities: {
      androgenetic: pAndro,
      telogen: pTelo,
      scalpFactor: pScalp,
      tractionOrOther: pOther
    }
  };
}

export function exportHtmlReport(result: AssessmentResult, state: QuizState): string {
  const qListHtml = EXACT_QUIZ_QUESTIONS.map(q => {
    const userAnswers = state.answers[q.id] || [];
    const answerLabels = userAnswers.map(ansId => {
      const opt = q.options.find(o => o.id === ansId);
      return opt ? opt.label : ansId;
    }).join(', ');

    return `
      <div style="margin-bottom: 10px; padding: 10px 14px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
        <div style="font-size: 11px; text-transform: uppercase; color: #16a34a; font-weight: 700; letter-spacing: 0.05em;">Question ${q.qNumber} &bull; ${q.label}</div>
        <div style="font-size: 13.5px; font-weight: 600; color: #0f172a; margin: 3px 0 4px;">${q.title}</div>
        <div style="font-size: 13px; color: #15803d; font-weight: 600;">&bull; ${answerLabels || 'Not answered'}</div>
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Anarva Clinic &bull; Clinical Hair Loss Assessment Report (${result.id})</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Outfit', sans-serif;
      color: #0f172a;
      background: #ffffff;
      padding: 30px;
      max-width: 800px;
      margin: 0 auto;
      line-height: 1.5;
    }
    .header {
      border-bottom: 2px solid #16a34a;
      padding-bottom: 16px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .kpi-card {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      padding: 14px;
    }
    .kpi-num {
      font-size: 26px;
      font-weight: 800;
      color: #15803d;
    }
    .kpi-lbl {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 700;
      color: #166534;
      margin-top: 4px;
    }
    .section-title {
      font-size: 15px;
      font-weight: 700;
      color: #166534;
      margin: 20px 0 10px;
      border-left: 3px solid #16a34a;
      padding-left: 8px;
    }
    .prob-track {
      height: 8px;
      background: #e2e8f0;
      border-radius: 999px;
      overflow: hidden;
      margin-bottom: 10px;
    }
    .prob-fill {
      height: 100%;
      background: #16a34a;
    }
    .print-btn {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #16a34a;
      color: #fff;
      border: none;
      padding: 10px 18px;
      border-radius: 8px;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
    }
    @media print { .print-btn { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>

  <div class="header">
    <div>
      <div style="font-size: 12px; font-weight: 700; color: #16a34a; letter-spacing: 0.1em; text-transform: uppercase;">ANARVA CLINIC &bull; HAIR LOSS ASSESSMENT</div>
      <h1 style="font-size: 24px; font-weight: 800; margin: 4px 0 0; color: #0b1215;">Clinical Trichology Evaluation Report</h1>
    </div>
    <div style="text-align: right; font-size: 12px; color: #64748b;">
      <div><strong>Report ID:</strong> ${result.id}</div>
      <div><strong>Date:</strong> ${result.date}</div>
    </div>
  </div>

  <div class="kpi-row">
    <div class="kpi-card">
      <div class="kpi-num">${result.follicularScore} <span style="font-size: 15px; color: #16a34a;">/ 10</span></div>
      <div class="kpi-lbl">Follicular Health Score</div>
    </div>
    <div class="kpi-card">
      <div style="font-size: 15px; font-weight: 700; color: #15803d; line-height: 1.3;">${result.conditionName}</div>
      <div class="kpi-lbl">Primary Clinical Assessment</div>
    </div>
    <div class="kpi-card">
      <div style="font-size: 13.5px; font-weight: 600; color: #15803d;">${result.affectedZones.join(', ')}</div>
      <div class="kpi-lbl">Affected Scalp Zones</div>
    </div>
  </div>

  <div class="section-title">Diagnostic Pattern Probability Distribution</div>
  <div style="margin-bottom: 8px; font-size: 13px; font-weight: 600; display: flex; justify-content: space-between;">
    <span>Androgenetic Alopecia (Pattern Miniaturization)</span>
    <span>${result.probabilities.androgenetic}%</span>
  </div>
  <div class="prob-track"><div class="prob-fill" style="width: ${result.probabilities.androgenetic}%; background: #16a34a;"></div></div>

  <div style="margin-bottom: 8px; font-size: 13px; font-weight: 600; display: flex; justify-content: space-between;">
    <span>Telogen Effluvium (Acute Stress / Metabolic Shed)</span>
    <span>${result.probabilities.telogen}%</span>
  </div>
  <div class="prob-track"><div class="prob-fill" style="width: ${result.probabilities.telogen}%; background: #0284c7;"></div></div>

  <div style="margin-bottom: 8px; font-size: 13px; font-weight: 600; display: flex; justify-content: space-between;">
    <span>Scalp Microbiome &amp; Inflammatory Factor</span>
    <span>${result.probabilities.scalpFactor}%</span>
  </div>
  <div class="prob-track"><div class="prob-fill" style="width: ${result.probabilities.scalpFactor}%; background: #d97706;"></div></div>

  <div class="section-title">Immediate Clinical Recommendations</div>
  <ul style="padding-left: 20px; font-size: 13.5px; color: #334155;">
    ${result.recommendations.map(r => `<li style="margin-bottom: 6px;">${r}</li>`).join('')}
  </ul>

  <div class="section-title">Recorded Questionnaire Responses</div>
  ${qListHtml}

  <div style="margin-top: 30px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
    <strong>Medical Disclaimer:</strong> This clinical report is generated from an educational AI-assisted hair loss evaluation by Anarva Clinic.
  </div>
</body>
</html>`;
}
