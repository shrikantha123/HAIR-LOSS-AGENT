/**
 * Scalp Photo Upload Validation Controller
 * Validates uploaded images against the shared validation rules.
 */

import { evaluatePhoto } from './validation.js';
import { detectFace } from './mediapipe-loader.js';

export class UploadValidatorController {
  constructor(options = {}) {
    this.container = options.container;
    this.submitBtn = options.submitBtn;
    this.onSubmit = options.onSubmit || (() => {});

    this.slots = {
      front: { file: null, dataUrl: null, status: 'empty', reason: null, tier: null },
      crown: { file: null, dataUrl: null, status: 'empty', reason: null, tier: null },
      side: { file: null, dataUrl: null, status: 'empty', reason: null, tier: null }
    };
  }

  /**
   * Validates a single image file for a given expected view.
   */
  async processImageFile(file, expectedView) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target.result;
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          // Scale to reasonable dimensions for validation
          const maxDim = 800;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }

          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(img, 0, 0, w, h);
          const imageData = ctx.getImageData(0, 0, w, h);

          // Detect face mesh
          let faceData = null;
          if (expectedView !== 'crown') {
            faceData = await detectFace(canvas);
          }

          // Evaluate using unified validation rules
          const evalResult = evaluatePhoto(
            imageData,
            expectedView,
            faceData ? faceData.box : null,
            null, // orientation not applicable for static uploaded file
            faceData
          );

          resolve({
            dataUrl,
            evalResult
          });
        };
        img.onerror = () => {
          resolve({
            dataUrl: null,
            evalResult: {
              accepted: false,
              reason: 'Could not decode image file. Please choose a valid JPG/PNG image.',
              checks: {}
            }
          });
        };
        img.src = dataUrl;
      };
      reader.onerror = () => {
        resolve({
          dataUrl: null,
          evalResult: {
            accepted: false,
            reason: 'Failed to read file from disk.',
            checks: {}
          }
        });
      };
      reader.readAsDataURL(file);
    });
  }

  async handleFileSelected(file, viewKey, cardElement) {
    if (!file) return;

    // Show validating spinner state on card
    this.updateCardUI(cardElement, viewKey, 'validating', 'Analyzing photo quality...');

    const { dataUrl, evalResult } = await this.processImageFile(file, viewKey);
    this.applyEvalResult(viewKey, cardElement, file, dataUrl, evalResult);
  }

  async handleDataUrlSelected(dataUrl, viewKey, cardElement) {
    if (!dataUrl) return;
    this.updateCardUI(cardElement, viewKey, 'validating', 'Analyzing photo quality...');

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      const maxDim = 800;
      let w = img.width || 480;
      let h = img.height || 480;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);

      let faceData = null;
      if (viewKey !== 'crown') {
        try {
          faceData = await detectFace(canvas);
        } catch {
          // ignore
        }
      }

      const evalResult = evaluatePhoto(
        imageData,
        viewKey,
        faceData ? faceData.box : null,
        null,
        faceData
      );

      this.applyEvalResult(viewKey, cardElement, null, dataUrl, evalResult);
    };
    img.src = dataUrl;
  }

  applyEvalResult(viewKey, cardElement, file, dataUrl, evalResult) {
    if (!evalResult.accepted) {
      this.slots[viewKey] = {
        file,
        dataUrl,
        status: 'rejected',
        reason: evalResult.reason || 'Photo quality does not meet analysis requirements.',
        tier: 'reject',
        checks: evalResult.checks
      };
      this.updateCardUI(cardElement, viewKey, 'rejected', this.slots[viewKey].reason, dataUrl, evalResult);
    } else {
      const bestTier = evalResult.tiers && evalResult.tiers.lighting === 'usable' ? 'usable' : 'good';
      this.slots[viewKey] = {
        file,
        dataUrl,
        status: 'accepted',
        reason: null,
        tier: bestTier,
        checks: evalResult.checks
      };
      this.updateCardUI(cardElement, viewKey, 'accepted', bestTier === 'good' ? 'Good Quality' : 'Usable Quality', dataUrl, evalResult);
    }

    this.checkCompletion();
  }

  updateCardUI(cardEl, viewKey, state, message, previewUrl = null, evalResult = null) {
    if (!cardEl) return;

    const previewImg = cardEl.querySelector('.preview-image');
    const placeholder = cardEl.querySelector('.preview-placeholder');
    const badgeEl = cardEl.querySelector('.status-badge');
    const actionBtn = cardEl.querySelector('.btn-choose-photo');

    if (previewUrl && previewImg && placeholder) {
      previewImg.src = previewUrl;
      previewImg.style.display = 'block';
      placeholder.style.display = 'none';
    }

    if (badgeEl) {
      badgeEl.className = 'status-badge';
      if (state === 'validating') {
        badgeEl.classList.add('badge-validating');
        badgeEl.innerHTML = `<span class="spinner-icon"></span><span>Analyzing lighting, focus & angle...</span>`;
      } else if (state === 'accepted') {
        const isGood = message.includes('Good');
        badgeEl.classList.add(isGood ? 'badge-good' : 'badge-usable');
        badgeEl.innerHTML = `
          <svg class="badge-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
          <span>${message} · All Checks Passed</span>
        `;
      } else if (state === 'rejected') {
        badgeEl.classList.add('badge-rejected');
        badgeEl.innerHTML = `
          <svg class="badge-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>${message}</span>
        `;
      } else {
        badgeEl.classList.add('badge-pending');
        badgeEl.innerHTML = `<span>Pending</span>`;
      }
    }

    // Render metrics pill strip if checks exist
    let metricsContainer = cardEl.querySelector('.metrics-strip');
    if (evalResult && evalResult.checks) {
      if (!metricsContainer) {
        metricsContainer = document.createElement('div');
        metricsContainer.className = 'metrics-strip';
        cardEl.querySelector('.card-body').insertBefore(metricsContainer, actionBtn);
      }
      const ch = evalResult.checks;
      metricsContainer.innerHTML = `
        <div style="display: flex; flex-wrap: wrap; gap: 4px; margin: 6px 0; font-size: 10px; font-weight: 600;">
          <span style="padding: 2px 6px; border-radius: 6px; background: ${ch.lighting.tier === 'good' ? '#ecfdf5; color: #065f46' : ch.lighting.tier === 'usable' ? '#fefce8; color: #854d0e' : '#fef2f2; color: #991b1b'}; border: 1px solid #e2e8f0;">
            💡 Lum: ${ch.lighting.mean}/255
          </span>
          <span style="padding: 2px 6px; border-radius: 6px; background: ${ch.blur.tier === 'good' ? '#ecfdf5; color: #065f46' : ch.blur.tier === 'usable' ? '#fefce8; color: #854d0e' : '#fef2f2; color: #991b1b'}; border: 1px solid #e2e8f0;">
            🔍 Focus: ${ch.blur.tier === 'reject' ? 'Blurry' : 'Sharp'} (${ch.blur.variance})
          </span>
          <span style="padding: 2px 6px; border-radius: 6px; background: ${ch.framing.tier !== 'reject' ? '#ecfdf5; color: #065f46' : '#fef2f2; color: #991b1b'}; border: 1px solid #e2e8f0;">
            📐 Frame: ${ch.framing.widthPct}%
          </span>
          <span style="padding: 2px 6px; border-radius: 6px; background: ${ch.viewMatch.match ? '#ecfdf5; color: #065f46' : '#fef2f2; color: #991b1b'}; border: 1px solid #e2e8f0;">
            🧭 Angle: ${ch.viewMatch.match ? 'Verified' : 'Mismatch'}
          </span>
        </div>
      `;
    }

    if (actionBtn) {
      if (state === 'rejected') {
        actionBtn.textContent = 'Try Again';
        actionBtn.classList.add('btn-retry');
      } else if (state === 'accepted') {
        actionBtn.textContent = 'Change Photo';
        actionBtn.classList.remove('btn-retry');
      } else {
        actionBtn.textContent = 'Choose Photo';
        actionBtn.classList.remove('btn-retry');
      }
    }
  }

  isAllAccepted() {
    return (
      this.slots.front.status === 'accepted' &&
      this.slots.crown.status === 'accepted' &&
      this.slots.side.status === 'accepted'
    );
  }

  checkCompletion() {
    if (!this.submitBtn) return;
    const ready = this.isAllAccepted();
    this.submitBtn.disabled = !ready;
    if (ready) {
      this.submitBtn.classList.add('btn-ready');
    } else {
      this.submitBtn.classList.remove('btn-ready');
    }
  }

  getBundle() {
    return {
      front: this.slots.front.dataUrl,
      crown: this.slots.crown.dataUrl,
      side: this.slots.side.dataUrl,
      tiers: {
        front: this.slots.front.tier,
        crown: this.slots.crown.tier,
        side: this.slots.side.tier
      }
    };
  }
}
