/**
 * ============================================================================
 * PROJECT KIHON: NEO-TOKYO ODYSSEY
 * Bootcamp & Holo-Deck Module:
 * - Navigation & JWA 5-Sector Roadmap Renderer
 * - 3D Holo-Flashcard SRS Engine & Lookalike Diagnostic
 * - Laser Etcher Canvas: 4-Quadrant Genkō Yōshi Grid, Polarity Vector Detection,
 *   Realtime Guide Tracing, and Web Audio Synthesizer Feedback
 * ============================================================================
 */

(function () {
  'use strict';

  // ==========================================================================
  // 1. WEB AUDIO API SYNTHESIS ENGINE (ZERO EXTERNAL ASSETS)
  // ==========================================================================

  const AudioFX = {
    ctx: null,

    init: function () {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContextClass();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    },

    // Crisp high-frequency laser sweep
    laserChime: function () {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(1040, now + 0.15);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.15);
      } catch (e) {
        console.warn('[AudioFX] Chime error:', e);
      }
    },

    // Triumphant chord when character is fully completed
    completionFanfare: function () {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

        freqs.forEach((f, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const startTime = now + idx * 0.08;

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, startTime);

          gain.gain.setValueAtTime(0.2, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(startTime);
          osc.stop(startTime + 0.35);
        });
      } catch (e) {
        console.warn('[AudioFX] Fanfare error:', e);
      }
    },

    // Low-pitch dissonance warning for reversed stroke / error
    polarityReversedBuzz: function () {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.25);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.25);
      } catch (e) {
        console.warn('[AudioFX] Polarity buzz error:', e);
      }
    }
  };


  // ==========================================================================
  // 2. NAVIGATION & JWA ROADMAP MATRIX RENDERER
  // ==========================================================================

  /**
   * Switch active top-level application view
   */
  window.switchTab = function (tabId) {
    const tabs = ['roadmap', 'bootcamp', 'forge', 'shooter', 'kaiwa'];
    tabs.forEach(t => {
      const btn = document.getElementById(`tab-${t}`);
      const view = document.getElementById(`view-${t}`);
      if (btn) {
        if (t === tabId) {
          btn.classList.add('active-tab');
        } else {
          btn.classList.remove('active-tab');
        }
      }
      if (view) {
        if (t === tabId) {
          view.classList.remove('hidden');
        } else {
          view.classList.add('hidden');
        }
      }
    });

    // Special lifecycle triggers per view
    if (tabId === 'bootcamp') {
      setTimeout(() => LaserEtcher.redraw(), 50);
    } else if (tabId === 'shooter') {
      if (window.ShooterGame && typeof window.ShooterGame.resize === 'function') {
        window.ShooterGame.resize();
      }
    } else if (tabId === 'roadmap') {
      renderRoadmap();
    }
  };

  /**
   * Render the 5 JWA Progression Sectors dynamically from ROADMAP_SECTORS
   */
  function renderRoadmap() {
    const grid = document.getElementById('roadmap-grid');
    if (!grid || !window.ROADMAP_SECTORS || !window.PlayerState) return;

    grid.innerHTML = '';

    const playerXp = window.PlayerState.xp || 0;

    window.ROADMAP_SECTORS.forEach((sec, idx) => {
      const isUnlocked = playerXp >= (sec.unlockXP || 0);
      const isCurrent = isUnlocked && (idx === window.ROADMAP_SECTORS.length - 1 || playerXp < (window.ROADMAP_SECTORS[idx + 1].unlockXP || Infinity));

      // Calculate progress percentage
      let pct = 0;
      if (sec.unlockXP === 0) {
        // Sector 0 progress based on mastered kana/radicals
        const masteredCount = window.PlayerState.masteredIds ? window.PlayerState.masteredIds.size : 0;
        pct = Math.min(100, Math.round((masteredCount / 30) * 100));
      } else {
        const prevXP = window.ROADMAP_SECTORS[idx - 1] ? window.ROADMAP_SECTORS[idx - 1].unlockXP : 0;
        if (playerXp >= sec.unlockXP) {
          pct = 100;
        } else if (playerXp <= prevXP) {
          pct = 0;
        } else {
          pct = Math.round(((playerXp - prevXP) / (sec.unlockXP - prevXP)) * 100);
        }
      }

      // Card Element
      const card = document.createElement('div');
      const isWide = idx === 4; // Apex card takes 2 cols on lg
      card.className = `sector-card ${isCurrent ? 'active-sector border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.25)]' : ''} p-5 rounded-xl relative overflow-hidden flex flex-col justify-between ${isWide ? 'md:col-span-2 lg:col-span-2 bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-900 border-indigo-500/40' : ''}`;

      // Badge
      let badgeHtml = '';
      if (isCurrent) {
        badgeHtml = `<div class="absolute top-0 right-0 px-3 py-1 bg-cyan-500/20 text-cyan-300 font-mono text-[11px] rounded-bl-lg border-b border-l border-cyan-500/40 font-bold flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>ACTIVE SECTOR</div>`;
      } else if (isUnlocked) {
        badgeHtml = `<div class="absolute top-0 right-0 px-3 py-1 bg-emerald-500/20 text-emerald-300 font-mono text-[11px] rounded-bl-lg border-b border-l border-emerald-500/40 font-bold">CLEARED ✓</div>`;
      } else {
        badgeHtml = `<div class="absolute top-0 right-0 px-3 py-1 bg-slate-800 text-slate-400 font-mono text-[11px] rounded-bl-lg border-b border-l border-slate-700">LOCK: ${sec.unlockXP} XP</div>`;
      }

      // Sector Action Button Target
      let actionLabel = 'LAUNCH MODULE →';
      let actionFn = "switchTab('bootcamp')";
      if (idx === 0) { actionLabel = 'ENTER HOLO-DECK →'; actionFn = "switchTab('bootcamp')"; }
      else if (idx === 1) { actionLabel = 'ENTER KIHON OUTPOST (N5) →'; actionFn = "switchTab('kaiwa')"; }
      else if (idx === 2) { actionLabel = 'LAUNCH KANA SORTIE (N4) →'; actionFn = "switchTab('shooter')"; }
      else if (idx === 3) { actionLabel = 'ENTER ZAIBATSU SPIRE (N3) →'; actionFn = "switchTab('kaiwa')"; }
      else if (idx === 4) { actionLabel = 'ENTER MEXT RADICAL FORGE →'; actionFn = "switchTab('forge')"; }

      card.innerHTML = `
        ${badgeHtml}
        <div>
          <div class="text-cyan-400 font-mono text-xs tracking-wider mb-1">
            SECTOR ${sec.sectorNumber} // ${sec.timeframe.toUpperCase()}
          </div>
          <h3 class="text-xl font-orbitron font-bold text-white mb-1.5 flex items-center gap-2">
            ${sec.title}
          </h3>
          <div class="text-[11px] font-mono text-amber-400/90 mb-2 flex items-center gap-1">
            <span>GUARDIAN BOSS:</span>
            <span class="text-amber-300 font-bold">${sec.boss}</span>
          </div>
          <p class="text-slate-300 text-xs leading-relaxed mb-4 font-rajdhani">
            ${sec.summary}
          </p>
          
          <div class="space-y-1.5 mb-4">
            <div class="flex justify-between text-xs font-mono">
              <span class="text-slate-400">${sec.targetLevel} Mastery</span>
              <span class="${isUnlocked ? 'text-cyan-400 font-bold' : 'text-slate-500'}">${pct}%</span>
            </div>
            <div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div class="h-full ${isUnlocked ? 'bg-gradient-to-r from-cyan-500 to-emerald-400' : 'bg-slate-700'} rounded-full transition-all duration-500" style="width: ${pct}%"></div>
            </div>
          </div>

          <div class="flex flex-wrap gap-1.5 mb-4 font-mono text-[11px]">
            ${sec.kanjiCount ? `<span class="px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700">${sec.kanjiCount} Kanji</span>` : ''}
            <span class="px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700">${sec.vocabCount} Vocab</span>
            <span class="px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">${sec.radicalsCount || 30} Radicals</span>
          </div>
        </div>

        <div>
          ${isUnlocked
            ? `<button onclick="${actionFn}" class="w-full py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 hover:text-cyan-100 border border-cyan-500/40 rounded-lg text-xs font-orbitron tracking-wider transition-all shadow-[0_0_10px_rgba(6,182,212,0.15)] flex items-center justify-center gap-1">
                <span>${actionLabel}</span>
               </button>`
            : `<button disabled class="w-full py-2 bg-slate-900/60 text-slate-500 border border-slate-800 rounded-lg text-xs font-orbitron tracking-wider cursor-not-allowed flex items-center justify-center gap-1">
                <span>🔒 LOCKED (REQUIRES ${sec.unlockXP} XP)</span>
               </button>`
          }
        </div>
      `;

      grid.appendChild(card);
    });
  }


  // ==========================================================================
  // 3. HOLO-DECK FLASHCARD & LOOKALIKE QUIZ ENGINE
  // ==========================================================================

  let currentCategory = 'hiragana';
  let currentList = [];
  let currentIndex = 0;
  let currentChar = null;

  /**
   * Set category and populate character strip
   */
  window.setCategory = function (category) {
    currentCategory = category;

    // Update Category Button Styling
    const catKeys = ['hiragana', 'katakana', 'radicals', 'lookalike'];
    catKeys.forEach(k => {
      const btn = document.getElementById(`cat-${k}`);
      if (btn) {
        if (k === category) {
          btn.className = "category-btn active px-3.5 py-1.5 rounded-lg text-xs font-orbitron tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 shadow-[0_0_10px_rgba(6,182,212,0.3)] transition-all";
        } else {
          btn.className = "category-btn px-3.5 py-1.5 rounded-lg text-xs font-orbitron tracking-wider bg-slate-900/80 text-slate-400 border border-slate-700 hover:text-cyan-300 hover:border-cyan-500/40 transition-all";
        }
      }
    });

    // Populate Current Category List from KIHON_DATA
    if (!window.KIHON_DATA) return;

    if (category === 'hiragana') {
      currentList = window.KIHON_DATA.hiragana || [];
    } else if (category === 'katakana') {
      currentList = window.KIHON_DATA.katakana || [];
    } else if (category === 'radicals') {
      currentList = window.KIHON_DATA.radicals || [];
    } else if (category === 'lookalike' || category === 'quiz') {
      // Focus on lookalikes: シ, ツ, ソ, ン plus tricky kana
      const katakanaItems = window.KIHON_DATA.katakana || [];
      const hiraganaItems = window.KIHON_DATA.hiragana || [];
      currentList = [
        ...katakanaItems.filter(item => ['シ', 'ツ', 'ソ', 'ン'].includes(item.char)),
        ...hiraganaItems.filter(item => ['あ', 'お', 'さ', 'き', 'し', 'つ'].includes(item.char))
      ];
    }

    renderCharSelector();
    loadCharacter(0);
  };

  /**
   * Render horizontal character chips in #char-selector
   */
  function renderCharSelector() {
    const strip = document.getElementById('char-selector');
    if (!strip || !currentList.length) return;

    strip.innerHTML = '';

    currentList.forEach((item, idx) => {
      const btn = document.createElement('button');
      const isMastered = window.PlayerState && window.PlayerState.isMastered(item.char);
      const isSelected = idx === currentIndex;

      // Base chip classes
      btn.className = `char-pill px-3.5 py-2 rounded-lg font-jp text-lg font-bold flex-shrink-0 transition-all flex items-center gap-1.5 relative ${
        isSelected
          ? 'bg-cyan-950 border-2 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.5)] scale-105'
          : 'bg-slate-900/80 border border-slate-700 text-slate-300 hover:border-cyan-500/50 hover:text-cyan-200'
      } ${isMastered ? 'ring-1 ring-emerald-400 border-emerald-500/80' : ''}`;

      btn.innerHTML = `
        <span>${item.char}</span>
        <span class="text-[10px] font-mono text-slate-400 font-normal">${item.romaji}</span>
        ${isMastered ? `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]"></span>` : ''}
      `;

      btn.onclick = () => loadCharacter(idx);
      strip.appendChild(btn);
    });
  }

  /**
   * Load active character into Flashcard and Laser Etcher
   */
  window.loadCharacter = function (index) {
    if (!currentList.length) return;
    if (index < 0) index = currentList.length - 1;
    if (index >= currentList.length) index = 0;

    currentIndex = index;
    currentChar = currentList[index];

    // Reset card flip to front face
    const flashcard = document.getElementById('flashcard');
    if (flashcard) {
      flashcard.classList.remove('flipped');
    }

    // Populate Card Front Face
    const glyphEl = document.getElementById('card-glyph');
    const badgeEl = document.getElementById('card-type-badge');
    if (glyphEl) {
      glyphEl.textContent = currentChar.char;
      glyphEl.className = "text-8xl lg:text-9xl font-jp font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-100 to-cyan-400 drop-shadow-[0_0_25px_rgba(6,182,212,0.8)] transition-transform duration-300 group-hover:scale-105";
    }
    if (badgeEl) {
      let badgeText = currentCategory.toUpperCase();
      if (currentCategory === 'lookalike') badgeText = 'LOOKALIKE RADAR';
      badgeEl.textContent = `${badgeText} // ${currentChar.romaji.toUpperCase()}`;
    }

    // Populate Card Back Face
    const romajiEl = document.getElementById('card-romaji');
    const mnemonicEl = document.getElementById('card-mnemonic');
    const systemEl = document.getElementById('card-system');

    if (romajiEl) romajiEl.textContent = currentChar.romaji;
    if (mnemonicEl) mnemonicEl.textContent = currentChar.mnemonic;
    if (systemEl) systemEl.textContent = currentChar.system;

    // Highlight termination type
    const tomeBadge = document.getElementById('badge-tome');
    const haneBadge = document.getElementById('badge-hane');
    const haraiBadge = document.getElementById('badge-harai');

    [tomeBadge, haneBadge, haraiBadge].forEach(b => {
      if (b) b.className = "px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-500";
    });

    const term = (currentChar.termination || '').toLowerCase();
    if (term.includes('tome') && tomeBadge) {
      tomeBadge.className = "px-2 py-0.5 rounded bg-cyan-950/90 border border-cyan-400 text-cyan-300 font-bold shadow-[0_0_8px_rgba(6,182,212,0.4)]";
    } else if (term.includes('hane') && haneBadge) {
      haneBadge.className = "px-2 py-0.5 rounded bg-amber-950/90 border border-amber-400 text-amber-300 font-bold shadow-[0_0_8px_rgba(245,158,11,0.4)]";
    } else if (term.includes('harai') && haraiBadge) {
      haraiBadge.className = "px-2 py-0.5 rounded bg-emerald-950/90 border border-emerald-400 text-emerald-300 font-bold shadow-[0_0_8px_rgba(16,185,129,0.4)]";
    }

    // Re-render character selector active highlight
    renderCharSelector();

    // Scroll active chip into view smoothly
    const strip = document.getElementById('char-selector');
    if (strip && strip.children[currentIndex]) {
      strip.children[currentIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    // Reset Laser Etcher Canvas for new character
    LaserEtcher.loadCharacter(currentChar);
  };

  /**
   * Flip flashcard and speak pronunciation
   */
  window.flipCard = function () {
    const flashcard = document.getElementById('flashcard');
    if (!flashcard) return;

    flashcard.classList.toggle('flipped');
    AudioFX.init();

    // Pronounce character using PlayerState
    if (currentChar && window.PlayerState) {
      window.PlayerState.playAudio(currentChar.char);
    }
  };

  /**
   * Native audio button trigger
   */
  window.playKanaAudio = function (event) {
    if (event) event.stopPropagation();
    AudioFX.init();
    if (currentChar && window.PlayerState) {
      window.PlayerState.playAudio(currentChar.char);
    }
  };

  /**
   * Spaced Repetition (SRS) Rating Handler
   * - 'retry': +5 XP, re-queues character
   * - 'good': +15 XP, advances
   * - 'mastered': +30 XP, marks mastered, updates HUD, advances
   */
  window.rateSRS = function (rating) {
    if (!currentChar || !window.PlayerState) return;

    AudioFX.init();

    if (rating === 'retry') {
      window.PlayerState.addXP(5);
      AudioFX.laserChime();
      // Rotate card back to front face and leave in queue
      const flashcard = document.getElementById('flashcard');
      if (flashcard) flashcard.classList.remove('flipped');
      updateStatusNotice(`[RETRY QUEUED] Reviewing ${currentChar.char} (${currentChar.romaji}). +5 XP`);
    } else if (rating === 'good') {
      window.PlayerState.addXP(15);
      AudioFX.laserChime();
      updateStatusNotice(`[GOOD RETENTION] Mastered recall for ${currentChar.char}. +15 XP`);
      setTimeout(() => loadCharacter(currentIndex + 1), 200);
    } else if (rating === 'mastered') {
      window.PlayerState.addXP(30);
      window.PlayerState.markMastered(currentChar.char);
      AudioFX.completionFanfare();
      updateStatusNotice(`[MASTERED LOCK-IN] ${currentChar.char} added to Core Arsenal! +30 XP`);
      renderCharSelector();
      setTimeout(() => loadCharacter(currentIndex + 1), 300);
    }
  };

  function updateStatusNotice(msg) {
    const status = document.getElementById('stroke-status');
    if (status) {
      status.innerText = msg;
    }
  }


  // ==========================================================================
  // 4. LASER ETCHER CANVAS ENGINE
  // - 4-Quadrant Genkō Yōshi Grid
  // - Normalized Hitsujun Stroke Detection
  // - Polarity Reversal & Direction Vector Validation
  // - Realtime Glowing Laser Tracing
  // ==========================================================================

  const LaserEtcher = {
    canvas: null,
    ctx: null,
    currentChar: null,
    currentStrokeIndex: 0,
    completedStrokes: [],
    userPoints: [],
    isDrawing: false,
    ghostMode: true,
    animationId: null,

    init: function () {
      this.canvas = document.getElementById('stroke-canvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');

      // Setup Pointer Event Listeners for smooth stylus, touch, and mouse support
      this.canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
      this.canvas.addEventListener('pointermove', this.onPointerMove.bind(this));
      this.canvas.addEventListener('pointerup', this.onPointerUp.bind(this));
      this.canvas.addEventListener('pointercancel', this.onPointerUp.bind(this));
      this.canvas.addEventListener('pointerleave', this.onPointerUp.bind(this));

      this.redraw();
    },

    loadCharacter: function (charObj) {
      this.currentChar = charObj;
      this.currentStrokeIndex = 0;
      this.completedStrokes = [];
      this.userPoints = [];
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
      this.redraw();
      this.updateStatus();
    },

    updateStatus: function (customMsg) {
      const statusEl = document.getElementById('stroke-status');
      if (!statusEl) return;

      if (customMsg) {
        statusEl.innerText = customMsg;
        return;
      }

      if (!this.currentChar || !this.currentChar.strokes) {
        statusEl.innerText = 'Ready: Standby for Glyph Selection';
        return;
      }

      const total = this.currentChar.strokes.length;
      if (this.currentStrokeIndex >= total) {
        statusEl.innerHTML = `<span class="text-emerald-400 font-bold">✨ ALL ${total} STROKES VERIFIED! +25 XP AWARDED!</span>`;
      } else {
        statusEl.innerText = `Ready: Trace Vector Stroke ${this.currentStrokeIndex + 1}/${total}`;
      }
    },

    // ------------------------------------------------------------------------
    // POINTER DRAWING EVENT HANDLERS
    // ------------------------------------------------------------------------
    onPointerDown: function (e) {
      AudioFX.init();
      if (!this.currentChar || !this.currentChar.strokes) return;
      if (this.currentStrokeIndex >= this.currentChar.strokes.length) return;

      e.preventDefault();
      this.isDrawing = true;
      this.userPoints = [];

      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
      this.userPoints.push({ x, y });

      this.redraw();
    },

    onPointerMove: function (e) {
      if (!this.isDrawing) return;
      e.preventDefault();

      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

      this.userPoints.push({ x, y });

      // Draw real-time cyan laser trail
      this.redraw();
      this.drawLiveUserStroke();
    },

    onPointerUp: function (e) {
      if (!this.isDrawing) return;
      this.isDrawing = false;

      if (this.userPoints.length > 2) {
        this.verifyUserStroke();
      } else {
        this.userPoints = [];
        this.redraw();
      }
    },

    // ------------------------------------------------------------------------
    // POLARITY & ACCURACY VALIDATION ENGINE
    // ------------------------------------------------------------------------
    verifyUserStroke: function () {
      if (!this.currentChar || !this.currentChar.strokes) return;
      const targetStroke = this.currentChar.strokes[this.currentStrokeIndex];
      if (!targetStroke || targetStroke.length < 2) return;

      const w = this.canvas.width;
      const h = this.canvas.height;

      // Expected Start and End in canvas pixels
      const expectedStart = { x: targetStroke[0][0] * w, y: targetStroke[0][1] * h };
      const expectedEnd = {
        x: targetStroke[targetStroke.length - 1][0] * w,
        y: targetStroke[targetStroke.length - 1][1] * h
      };

      const userStart = this.userPoints[0];
      const userEnd = this.userPoints[this.userPoints.length - 1];

      // Distances
      const distStart = Math.hypot(userStart.x - expectedStart.x, userStart.y - expectedStart.y);
      const distEnd = Math.hypot(userEnd.x - expectedEnd.x, userEnd.y - expectedEnd.y);
      const distStartToExpectedEnd = Math.hypot(userStart.x - expectedEnd.x, userStart.y - expectedEnd.y);
      const distEndToExpectedStart = Math.hypot(userEnd.x - expectedStart.x, userEnd.y - expectedStart.y);

      // Vectors & Dot Product
      const vExp = { x: expectedEnd.x - expectedStart.x, y: expectedEnd.y - expectedStart.y };
      const vUser = { x: userEnd.x - userStart.x, y: userEnd.y - userStart.y };

      const lenExp = Math.hypot(vExp.x, vExp.y);
      const lenUser = Math.hypot(vUser.x, vUser.y);

      let dotProduct = 1;
      if (lenExp > 15 && lenUser > 15) {
        dotProduct = (vExp.x * vUser.x + vExp.y * vUser.y) / (lenExp * lenUser);
      }

      // POLARITY REVERSED CHECK:
      // If dot product is strongly negative OR user started near the end and ended near the start
      const isReversed = dotProduct < -0.25 || (distStartToExpectedEnd < 65 && distEndToExpectedStart < 65);

      if (isReversed) {
        AudioFX.polarityReversedBuzz();
        this.flashCanvasBorder('red');
        this.updateStatus('⚡ POLARITY REVERSED! Follow Top-to-Bottom / Left-to-Right Hitsujun flow!');
        this.userPoints = [];
        this.redraw();
        return;
      }

      // ACCURACY TOLERANCE:
      // Start node tolerance: 70px. End node tolerance: 75px. Dot product >= 0.2
      const isStartValid = distStart < 70;
      const isEndValid = distEnd < 75 || lenExp < 25; // small loop/dot relaxation
      const isDirectionValid = dotProduct >= 0.15;

      if (isStartValid && isEndValid && isDirectionValid) {
        // SUCCESS: Lock in stroke!
        AudioFX.laserChime();
        this.completedStrokes.push(targetStroke);
        this.currentStrokeIndex++;
        this.userPoints = [];

        const totalStrokes = this.currentChar.strokes.length;

        if (this.currentStrokeIndex >= totalStrokes) {
          // Entire Character Completed!
          AudioFX.completionFanfare();
          this.flashCanvasBorder('emerald');
          if (window.PlayerState) {
            window.PlayerState.addXP(25);
            window.PlayerState.markMastered(this.currentChar.char);
            renderCharSelector();
          }
          this.updateStatus();
        } else {
          this.updateStatus(`Stroke ${this.currentStrokeIndex}/${totalStrokes} Verified! Proceed to Stroke ${this.currentStrokeIndex + 1}`);
        }

        this.redraw();
      } else {
        // Inaccurate stroke
        this.flashCanvasBorder('amber');
        this.updateStatus('Vector deviation. Start at the pulsing amber node (1, 2...)');
        this.userPoints = [];
        this.redraw();
      }
    },

    flashCanvasBorder: function (color) {
      if (!this.canvas) return;
      const origBorder = this.canvas.style.borderColor;
      const origShadow = this.canvas.style.boxShadow;

      if (color === 'red') {
        this.canvas.style.borderColor = '#ef4444';
        this.canvas.style.boxShadow = '0 0 25px rgba(239, 68, 68, 0.8) inset, 0 0 20px #ef4444';
      } else if (color === 'emerald') {
        this.canvas.style.borderColor = '#10b981';
        this.canvas.style.boxShadow = '0 0 25px rgba(16, 185, 129, 0.8) inset, 0 0 20px #10b981';
      } else {
        this.canvas.style.borderColor = '#f59e0b';
        this.canvas.style.boxShadow = '0 0 20px rgba(245, 158, 11, 0.6) inset';
      }

      setTimeout(() => {
        this.canvas.style.borderColor = origBorder;
        this.canvas.style.boxShadow = origShadow;
      }, 400);
    },

    // ------------------------------------------------------------------------
    // CANVAS RENDERING PIPELINE
    // ------------------------------------------------------------------------
    redraw: function () {
      if (!this.ctx || !this.canvas) return;
      const w = this.canvas.width;
      const h = this.canvas.height;

      this.ctx.clearRect(0, 0, w, h);

      // 1. Draw 4-Quadrant Genkō Yōshi Grid
      this.drawGenkoYoshiGrid(w, h);

      if (!this.currentChar || !this.currentChar.strokes) return;

      // 2. Draw Ghost Strokes (faint translucent cyan guide) if ghostMode enabled
      if (this.ghostMode) {
        this.drawGhostStrokes(w, h);
      }

      // 3. Draw Locked/Completed Strokes in Glowing Emerald (#10b981)
      this.drawCompletedStrokes(w, h);

      // 4. Draw Active Stroke Starting Anchor Node (Pulsing Amber Circle with Stroke Number)
      if (this.currentStrokeIndex < this.currentChar.strokes.length) {
        this.drawActiveAnchorNode(w, h);
      }
    },

    drawGenkoYoshiGrid: function (w, h) {
      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
      this.ctx.lineWidth = 1.2;
      this.ctx.setLineDash([5, 5]);

      // Horizontal Center Dashed Line
      this.ctx.beginPath();
      this.ctx.moveTo(20, h / 2);
      this.ctx.lineTo(w - 20, h / 2);
      this.ctx.stroke();

      // Vertical Center Dashed Line
      this.ctx.beginPath();
      this.ctx.moveTo(w / 2, 20);
      this.ctx.lineTo(w / 2, h - 20);
      this.ctx.stroke();

      // Outer Inset Framing Box
      this.ctx.setLineDash([]);
      this.ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
      this.ctx.strokeRect(18, 18, w - 36, h - 36);

      this.ctx.restore();
    },

    drawGhostStrokes: function (w, h) {
      const strokes = this.currentChar.strokes;
      this.ctx.save();
      this.ctx.lineWidth = 8;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';

      strokes.forEach((stroke, idx) => {
        if (idx < this.currentStrokeIndex) return; // Skip already completed

        this.ctx.strokeStyle = (idx === this.currentStrokeIndex)
          ? 'rgba(6, 182, 212, 0.35)'
          : 'rgba(6, 182, 212, 0.12)';

        this.ctx.beginPath();
        stroke.forEach((pt, pIdx) => {
          const px = pt[0] * w;
          const py = pt[1] * h;
          if (pIdx === 0) this.ctx.moveTo(px, py);
          else this.ctx.lineTo(px, py);
        });
        this.ctx.stroke();
      });

      this.ctx.restore();
    },

    drawCompletedStrokes: function (w, h) {
      if (!this.completedStrokes.length) return;

      this.ctx.save();
      this.ctx.lineWidth = 9;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.strokeStyle = '#10b981';
      this.ctx.shadowColor = '#10b981';
      this.ctx.shadowBlur = 12;

      this.completedStrokes.forEach(stroke => {
        this.ctx.beginPath();
        stroke.forEach((pt, idx) => {
          const px = pt[0] * w;
          const py = pt[1] * h;
          if (idx === 0) this.ctx.moveTo(px, py);
          else this.ctx.lineTo(px, py);
        });
        this.ctx.stroke();
      });

      this.ctx.restore();
    },

    drawActiveAnchorNode: function (w, h) {
      const activeStroke = this.currentChar.strokes[this.currentStrokeIndex];
      if (!activeStroke || !activeStroke.length) return;

      const startPt = activeStroke[0];
      const endPt = activeStroke[activeStroke.length - 1];

      const sx = startPt[0] * w;
      const sy = startPt[1] * h;
      const ex = endPt[0] * w;
      const ey = endPt[1] * h;

      this.ctx.save();

      // Outer Pulsing Glow Ring
      this.ctx.beginPath();
      this.ctx.arc(sx, sy, 16, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
      this.ctx.shadowColor = '#f59e0b';
      this.ctx.shadowBlur = 14;
      this.ctx.fill();

      // Solid Amber Center Node
      this.ctx.beginPath();
      this.ctx.arc(sx, sy, 11, 0, Math.PI * 2);
      this.ctx.fillStyle = '#f59e0b';
      this.ctx.fill();

      // Stroke Number (1-indexed)
      this.ctx.fillStyle = '#020617';
      this.ctx.font = 'bold 11px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText((this.currentStrokeIndex + 1).toString(), sx, sy + 0.5);

      // Directional Indicator Arrow
      const angle = Math.atan2(ey - sy, ex - sx);
      const arrowDist = 24;
      const ax = sx + Math.cos(angle) * arrowDist;
      const ay = sy + Math.sin(angle) * arrowDist;

      this.ctx.strokeStyle = '#f59e0b';
      this.ctx.fillStyle = '#f59e0b';
      this.ctx.lineWidth = 2.5;

      // Small directional arrow head
      this.ctx.beginPath();
      this.ctx.moveTo(sx + Math.cos(angle) * 14, sy + Math.sin(angle) * 14);
      this.ctx.lineTo(ax, ay);
      this.ctx.stroke();

      const headlen = 7;
      this.ctx.beginPath();
      this.ctx.moveTo(ax, ay);
      this.ctx.lineTo(ax - headlen * Math.cos(angle - Math.PI / 6), ay - headlen * Math.sin(angle - Math.PI / 6));
      this.ctx.lineTo(ax - headlen * Math.cos(angle + Math.PI / 6), ay - headlen * Math.sin(angle + Math.PI / 6));
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.restore();
    },

    drawLiveUserStroke: function () {
      if (this.userPoints.length < 2) return;

      this.ctx.save();
      this.ctx.lineWidth = 8;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.strokeStyle = '#06b6d4';
      this.ctx.shadowColor = '#06b6d4';
      this.ctx.shadowBlur = 12;

      this.ctx.beginPath();
      this.userPoints.forEach((pt, idx) => {
        if (idx === 0) this.ctx.moveTo(pt.x, pt.y);
        else this.ctx.lineTo(pt.x, pt.y);
      });
      this.ctx.stroke();

      this.ctx.restore();
    },

    // ------------------------------------------------------------------------
    // SMOOTH GUIDE STROKE ANIMATION (PULSE LASER GUIDE)
    // ------------------------------------------------------------------------
    animateGuideStrokes: function () {
      if (!this.currentChar || !this.currentChar.strokes) return;
      if (this.animationId) cancelAnimationFrame(this.animationId);

      const w = this.canvas.width;
      const h = this.canvas.height;
      const strokes = this.currentChar.strokes;

      let strokeIdx = 0;
      let progress = 0; // 0 to 1
      const self = this;

      function step() {
        self.redraw();

        const currentStroke = strokes[strokeIdx];
        if (!currentStroke) {
          self.redraw();
          return;
        }

        // Calculate position along multi-segment stroke
        const totalSegments = currentStroke.length - 1;
        const segmentFloat = progress * totalSegments;
        const segIdx = Math.min(Math.floor(segmentFloat), totalSegments - 1);
        const segProgress = segmentFloat - segIdx;

        const p1 = currentStroke[segIdx];
        const p2 = currentStroke[segIdx + 1];

        const cx = (p1[0] + (p2[0] - p1[0]) * segProgress) * w;
        const cy = (p1[1] + (p2[1] - p1[1]) * segProgress) * h;

        // Draw animated laser tracer dot
        self.ctx.save();
        self.ctx.beginPath();
        self.ctx.arc(cx, cy, 7, 0, Math.PI * 2);
        self.ctx.fillStyle = '#38bdf8';
        self.ctx.shadowColor = '#06b6d4';
        self.ctx.shadowBlur = 20;
        self.ctx.fill();

        // Laser beam aura
        self.ctx.beginPath();
        self.ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        self.ctx.fillStyle = 'rgba(6, 182, 212, 0.3)';
        self.ctx.fill();
        self.ctx.restore();

        progress += 0.035;
        if (progress >= 1) {
          progress = 0;
          strokeIdx++;
        }

        if (strokeIdx < strokes.length) {
          self.animationId = requestAnimationFrame(step);
        } else {
          self.redraw();
          self.animationId = null;
        }
      }

      AudioFX.laserChime();
      this.animationId = requestAnimationFrame(step);
    },

    toggleGhostGuide: function () {
      this.ghostMode = !this.ghostMode;
      this.redraw();
      this.updateStatus(this.ghostMode ? 'Ghost Guide Enabled (Translucent Guide Active)' : 'Ghost Guide Disabled (Stealth Memory Mode)');
    },

    clearEtcher: function () {
      this.currentStrokeIndex = 0;
      this.completedStrokes = [];
      this.userPoints = [];
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
      this.redraw();
      this.updateStatus();
    }
  };


  // ==========================================================================
  // 5. GLOBAL ATTACHMENTS & AUTO-BOOTSTRAP
  // ==========================================================================

  window.animateGuideStrokes = function () {
    LaserEtcher.animateGuideStrokes();
  };

  window.toggleGhostGuide = function () {
    LaserEtcher.toggleGhostGuide();
  };

  window.clearEtcher = function () {
    LaserEtcher.clearEtcher();
  };

  window.initRoadmap = renderRoadmap;

  // Auto initialize on DOM ready
  function initBootcamp() {
    LaserEtcher.init();
    renderRoadmap();
    setCategory('hiragana');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBootcamp);
  } else {
    initBootcamp();
  }

  console.log('[Project Kihon] bootcamp.js initialized successfully.');

})();
