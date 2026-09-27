/**
 * Scalp Live Camera Capture Controller
 * Guides user through Front -> Crown -> Side views with real-time feedback & auto-capture.
 */

import { evaluatePhoto } from './validation.js';
import { detectFace } from './mediapipe-loader.js';

export class LiveCaptureController {
  constructor(options = {}) {
    this.videoElement = options.videoElement;
    this.overlayCanvas = options.overlayCanvas;
    this.chips = options.chips || {}; // { lighting, position, view }
    this.instructionEl = options.instructionEl;
    this.progressDots = options.progressDots;
    this.flashEl = options.flashEl;
    this.reviewContainer = options.reviewContainer;
    this.onSubmit = options.onSubmit || (() => {});
    this.onBack = options.onBack || (() => {});

    this.views = ['front', 'crown', 'side'];
    this.currentViewIndex = 0;
    this.capturedImages = {
      front: null,
      crown: null,
      side: null
    };

    this.stream = null;
    this.isRunning = false;
    this.lastFrameTime = 0;
    this.fpsInterval = 1000 / 10; // ~10 fps throttle

    this.passHoldStartTime = null;
    this.requiredHoldTimeMs = 900; // Hold steady for ~900ms before auto capture
    this.deviceOrientation = { alpha: 0, beta: 0, gamma: 0 };

    this.audioCtx = null;
    this.initOrientationListener();
  }

  initOrientationListener() {
    this.onOrientation = (e) => {
      this.deviceOrientation = {
        alpha: e.alpha || 0,
        beta: e.beta || 0,
        gamma: e.gamma || 0
      };
    };
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', this.onOrientation, true);
    }
  }

  async startCamera() {
    try {
      const constraints = {
        video: {
          facingMode: this.getCurrentView() === 'crown' ? 'environment' : 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (this.videoElement) {
        this.videoElement.srcObject = this.stream;
        await this.videoElement.play();
      }

      this.isRunning = true;
      this.updateUIForCurrentStep();
      this.loop();
    } catch (err) {
      console.error('Failed to access camera:', err);
      if (this.instructionEl) {
        this.instructionEl.innerHTML = `<span style="color:#e74c3c;">Camera permission denied or camera unavailable. Please allow camera access or switch to Upload Mode.</span>`;
      }
    }
  }

  getCurrentView() {
    return this.views[this.currentViewIndex] || 'done';
  }

  stopCamera() {
    this.isRunning = false;
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }

  destroy() {
    this.stopCamera();
    if (window.DeviceOrientationEvent) {
      window.removeEventListener('deviceorientation', this.onOrientation, true);
    }
  }

  playShutterSound() {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = this.audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  triggerHaptic() {
    if (navigator.vibrate) {
      try {
        navigator.vibrate([40, 20, 50]);
      } catch (e) {
        // Ignore
      }
    }
  }

  triggerFlash() {
    if (this.flashEl) {
      this.flashEl.style.opacity = '0.9';
      setTimeout(() => {
        this.flashEl.style.opacity = '0';
      }, 180);
    }
  }

  async loop() {
    if (!this.isRunning) return;

    const now = performance.now();
    const elapsed = now - this.lastFrameTime;

    if (elapsed > this.fpsInterval) {
      this.lastFrameTime = now - (elapsed % this.fpsInterval);
      await this.processFrame();
    }

    if (this.isRunning) {
      requestAnimationFrame(() => this.loop());
    }
  }

  async processFrame() {
    if (!this.videoElement || this.videoElement.readyState < 2) return;

    const vw = this.videoElement.videoWidth;
    const vh = this.videoElement.videoHeight;
    if (!vw || !vh) return;

    // Create offscreen canvas for pixel evaluation
    if (!this.offscreenCanvas) {
      this.offscreenCanvas = document.createElement('canvas');
    }
    const canvas = this.offscreenCanvas;
    // Process at 480px width for fast computation
    const targetW = 480;
    const targetH = Math.round((vh / vw) * targetW);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(this.videoElement, 0, 0, targetW, targetH);
    const imageData = ctx.getImageData(0, 0, targetW, targetH);

    const currentView = this.getCurrentView();
    if (currentView === 'done') return;

    // Detect face mesh landmarks (skip for crown to speed up unless needed)
    let faceData = null;
    if (currentView !== 'crown') {
      faceData = await detectFace(canvas);
    }

    // Call unified validation function
    const evalResult = evaluatePhoto(
      imageData,
      currentView,
      faceData ? faceData.box : null,
      this.deviceOrientation,
      faceData
    );

    // Update real-time status chips
    this.updateStatusChips(evalResult, currentView, faceData);

    // Check auto-capture condition
    if (evalResult.accepted) {
      if (!this.passHoldStartTime) {
        this.passHoldStartTime = performance.now();
      } else {
        const holdDuration = performance.now() - this.passHoldStartTime;
        this.updateHoldProgress(holdDuration / this.requiredHoldTimeMs);

        if (holdDuration >= this.requiredHoldTimeMs) {
          // Auto-capture!
          this.captureCurrentView(canvas);
        }
      }
    } else {
      this.passHoldStartTime = null;
      this.updateHoldProgress(0);
    }
  }

  updateStatusChips(evalResult, currentView, faceData) {
    const { lighting, blur, framing, viewMatch } = evalResult.checks;

    // Lighting Chip: pass if tier is good or usable
    const lightingPass = lighting.tier !== 'reject';
    let lightingText = lighting.tier === 'good' ? 'Good' : (lighting.tier === 'usable' ? 'Usable' : (lighting.mean < 40 ? 'Too Dark' : 'Too Bright'));
    this.setChipStyle('lighting', lightingPass, lightingText);

    // Position / Framing Chip:
    const positionPass = framing.tier !== 'reject';
    let positionText = framing.guidance || (framing.tier === 'good' ? 'Good' : 'Adjust');
    this.setChipStyle('position', positionPass, positionText);

    // Correct View Chip:
    const viewPass = viewMatch.match;
    let viewText = 'Matching';
    if (!viewPass) {
      viewText = viewMatch.detectedView ? `${capitalize(viewMatch.detectedView)} Detected` : 'Mismatched';
    } else {
      viewText = `${capitalize(currentView)} View`;
    }
    this.setChipStyle('view', viewPass, viewText);
  }

  setChipStyle(chipKey, isPass, subtitle) {
    const chip = this.chips[chipKey];
    if (!chip) return;

    // Exact required colors: green #2ecc71 + white text, red #e74c3c + white text
    if (isPass) {
      chip.style.backgroundColor = '#2ecc71';
      chip.style.color = '#ffffff';
    } else {
      chip.style.backgroundColor = '#e74c3c';
      chip.style.color = '#ffffff';
    }

    const subEl = chip.querySelector('.chip-status') || chip.children[1];
    if (subEl) {
      subEl.textContent = subtitle;
    }
  }

  updateHoldProgress(ratio) {
    const clamped = Math.min(1, Math.max(0, ratio));
    const guideOval = document.getElementById('framing-guide-oval');
    if (guideOval) {
      if (clamped > 0) {
        guideOval.style.borderColor = '#2ecc71';
        guideOval.style.boxShadow = `0 0 ${Math.round(clamped * 20)}px rgba(46, 204, 113, 0.7)`;
      } else {
        guideOval.style.borderColor = 'rgba(255, 255, 255, 0.75)';
        guideOval.style.boxShadow = 'none';
      }
    }
  }

  captureCurrentView(sourceCanvas) {
    const currentView = this.getCurrentView();
    // High-res snapshot from current video frame
    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = this.videoElement.videoWidth || sourceCanvas.width;
    captureCanvas.height = this.videoElement.videoHeight || sourceCanvas.height;
    const ctx = captureCanvas.getContext('2d');
    ctx.drawImage(this.videoElement, 0, 0);

    const dataUrl = captureCanvas.toDataURL('image/jpeg', 0.92);
    this.capturedImages[currentView] = dataUrl;

    // Feedback
    this.playShutterSound();
    this.triggerHaptic();
    this.triggerFlash();

    // Advance state machine: front -> crown -> side -> done
    this.passHoldStartTime = null;
    this.updateHoldProgress(0);
    this.currentViewIndex++;

    if (this.currentViewIndex >= this.views.length) {
      this.onDoneCapturing();
    } else {
      this.updateUIForCurrentStep();
    }
  }

  manualCapture() {
    if (!this.videoElement) return;
    const canvas = document.createElement('canvas');
    canvas.width = this.videoElement.videoWidth || 640;
    canvas.height = this.videoElement.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(this.videoElement, 0, 0);
    this.captureCurrentView(canvas);
  }

  retakeView(viewKey) {
    const idx = this.views.indexOf(viewKey);
    if (idx !== -1) {
      this.currentViewIndex = idx;
      this.capturedImages[viewKey] = null;
      if (this.reviewContainer) {
        this.reviewContainer.style.display = 'none';
      }
      const liveContainer = document.getElementById('live-feed-section');
      if (liveContainer) liveContainer.style.display = 'flex';
      this.isRunning = true;
      this.updateUIForCurrentStep();
      this.loop();
    }
  }

  updateUIForCurrentStep() {
    const view = this.getCurrentView();
    const stepNum = this.currentViewIndex + 1;

    let instruction = '';
    if (view === 'front') {
      instruction = `<strong>Step 1 of 3: Front View</strong> — Look directly into the camera with forehead & hairline clearly framed.`;
    } else if (view === 'crown') {
      instruction = `<strong>Step 2 of 3: Crown View</strong> — Tilt phone downward and position over the top/crown of your head.`;
    } else if (view === 'side') {
      instruction = `<strong>Step 3 of 3: Side View (Temple)</strong> — Turn your head 45° to 90° to capture temple and temporal hairline.`;
    }

    if (this.instructionEl) {
      this.instructionEl.innerHTML = instruction;
    }

    // Update progress dots (done / active / pending)
    if (this.progressDots && this.progressDots.length) {
      this.progressDots.forEach((dot, i) => {
        dot.classList.remove('dot-done', 'dot-active', 'dot-pending');
        if (i < this.currentViewIndex) {
          dot.classList.add('dot-done');
        } else if (i === this.currentViewIndex) {
          dot.classList.add('dot-active');
        } else {
          dot.classList.add('dot-pending');
        }
      });
    }
  }

  onDoneCapturing() {
    this.stopCamera();
    const liveSection = document.getElementById('live-feed-section');
    if (liveSection) liveSection.style.display = 'none';

    if (this.reviewContainer) {
      this.reviewContainer.style.display = 'block';
      this.renderReviewThumbnails();
    }
  }

  renderReviewThumbnails() {
    if (!this.reviewContainer) return;
    const views = ['front', 'crown', 'side'];

    const html = `
      <div class="review-wrapper">
        <h3 class="review-title">All 3 Scalp Views Captured</h3>
        <p class="review-subtitle">Review your photos before proceeding to clinical analysis. You can retake any view if needed.</p>
        <div class="review-grid">
          ${views.map((v) => `
            <div class="review-card">
              <div class="review-img-wrap">
                <img src="${this.capturedImages[v]}" alt="${v} view" class="review-img" />
                <span class="review-badge">Passed</span>
              </div>
              <div class="review-card-footer">
                <span class="review-label">${capitalize(v)} View</span>
                <button type="button" class="btn-retake" data-view="${v}">Retake</button>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="review-actions">
          <button type="button" id="btn-submit-capture" class="btn-primary-capture">
            Confirm & Proceed to Hair Analysis
          </button>
        </div>
      </div>
    `;

    this.reviewContainer.innerHTML = html;

    // Attach retake listeners
    this.reviewContainer.querySelectorAll('.btn-retake').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const viewToRetake = e.currentTarget.getAttribute('data-view');
        this.retakeView(viewToRetake);
      });
    });

    const submitBtn = this.reviewContainer.querySelector('#btn-submit-capture');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        this.onSubmit(this.capturedImages);
      });
    }
  }
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
