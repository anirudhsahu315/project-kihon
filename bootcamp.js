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
    // Stage 2 Sequential Gating: Radical Forge requires Stage 1 (Hiragana + Katakana) completion
    if (tabId === 'forge' && window.PlayerState && !window.PlayerState.isStage2Unlocked()) {
      const kCount = window.PlayerState.getKatakanaMasteredCount();
      const kTotal = (window.KIHON_DATA && window.KIHON_DATA.katakana) ? window.KIHON_DATA.katakana.length : 46;
      showGateToast(`🔒 Stage 2 (Radical Forge) is locked! Complete all 46 Katakana characters first (Current: ${kCount}/${kTotal}).`);
      AudioFX.polarityReversedBuzz();
      // Redirect to bootcamp to focus on completing Stage 1
      tabId = 'bootcamp';
    }

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
      setTimeout(() => {
        if (typeof LaserEtcher !== 'undefined' && LaserEtcher) {
          if (!LaserEtcher.currentChar && currentChar) {
            LaserEtcher.loadCharacter(currentChar);
          } else {
            LaserEtcher.redraw();
          }
        }
      }, 50);
      if (window.PlayerState) window.PlayerState.updateHUD();
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

      // Card-list row element
      const card = document.createElement('div');
      const pillClasses = ['pill-blue', 'pill-amber', 'pill-purple', 'pill-emerald', 'pill-rose'];
      const pillClass = pillClasses[idx % pillClasses.length];
      
      const sectorIcons = [
        // Sector 0: Compass / Seed
        `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a6 6 0 110 12 6 6 0 010-12z"></path><circle cx="12" cy="12" r="2" fill="currentColor"></circle></svg>`,
        // Sector 1: Core / Shield
        `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>`,
        // Sector 2: Lightning Vector
        `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>`,
        // Sector 3: Spire / Bridge
        `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>`,
        // Sector 4: Crown / Apex
        `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>`
      ];
      const iconSvg = sectorIcons[idx % sectorIcons.length];

      card.className = `list-item-row group ${isCurrent ? 'bg-zinc-800/40' : ''}`;
      card.onclick = () => {
        if (isUnlocked) {
          if (idx === 0) switchTab('bootcamp');
          else if (idx === 1) switchTab('kaiwa');
          else if (idx === 2) switchTab('shooter');
          else if (idx === 3) switchTab('kaiwa');
          else if (idx === 4) switchTab('forge');
        }
      };

      // Status Badge
      let statusBadge = '';
      if (isCurrent) {
        statusBadge = `<span class="list-row-badge active-badge flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>Active (${pct}%)</span>`;
      } else if (isUnlocked) {
        statusBadge = `<span class="list-row-badge cleared-badge">Cleared ✓</span>`;
      } else {
        statusBadge = `<span class="list-row-badge locked-badge">Lock: ${sec.unlockXP} XP</span>`;
      }

      card.innerHTML = `
        <div class="flex items-center gap-3.5 min-w-0 flex-1">
          <!-- Circular Pill Badge -->
          <div class="badge-icon-pill ${pillClass}">
            ${iconSvg}
          </div>

          <!-- Title & Subtitle Info -->
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <h4 class="list-row-title group-hover:text-sky-300 transition-colors">
                ${sec.title}
              </h4>
              <span class="text-[11px] font-mono text-zinc-500">
                Sector ${sec.sectorNumber} • ${sec.timeframe}
              </span>
            </div>
            <p class="list-row-subtitle line-clamp-1">
              ${sec.summary}
            </p>
            <div class="flex items-center gap-3 mt-1.5 text-xs text-[#9ca3af]">
              <span>${sec.kanjiCount ? `${sec.kanjiCount} Kanji • ` : ''}${sec.vocabCount} Vocab</span>
              <span class="hidden sm:inline-block text-zinc-600">•</span>
              <span class="hidden sm:inline-block text-zinc-400">Boss: ${sec.boss}</span>
              <div class="w-20 sm:w-28 h-1.5 bg-zinc-800 rounded-full overflow-hidden ml-auto sm:ml-0">
                <div class="h-full ${isUnlocked ? 'bg-sky-400' : 'bg-zinc-700'} rounded-full" style="width: ${pct}%"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Trailing Action / Status -->
        <div class="flex items-center gap-2.5 shrink-0">
          ${statusBadge}
          <svg class="w-4 h-4 text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
        </div>
      `;

      grid.appendChild(card);
    });
  }


  // ==========================================================================
  // 3. HOLO-DECK FLASHCARD & SEQUENTIAL KANA SRS ENGINE
  // ==========================================================================

  let currentCategory = 'hiragana';
  let currentList = [];
  let currentIndex = 0;
  let currentChar = null;
  let currentLearningMode = 'flashcards'; // 'flashcards' | 'quiz' | 'etcher'

  /**
   * Floating Cyber Toast Alert for Gated Progression
   */
  function showGateToast(message) {
    let toast = document.getElementById('kihon-gate-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'kihon-gate-toast';
      toast.className = 'fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] px-4 py-3 rounded-xl bg-[#1e1e24] border border-amber-500/40 text-amber-200 text-xs font-medium shadow-2xl flex items-center justify-between gap-3 transition-all duration-300 transform opacity-0 -translate-y-4 pointer-events-none';
      document.body.appendChild(toast);
    }

    toast.innerHTML = `
      <div class="flex items-center gap-2.5">
        <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
        <span>${message}</span>
      </div>
      <button onclick="this.parentElement.classList.add('opacity-0', '-translate-y-4')" class="text-zinc-400 hover:text-white text-sm font-bold ml-2">✕</button>
    `;

    toast.classList.remove('opacity-0', '-translate-y-4', 'pointer-events-none');
    toast.classList.add('opacity-100', 'translate-y-0');

    updateStatusNotice(message);

    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.add('opacity-0', '-translate-y-4', 'pointer-events-none');
    }, 4500);
  }

  /**
   * Cyberpunk Stage Progression Celebration Modal
   */
  function showCelebrationModal({ title, subtitle, description, actionText, action }) {
    AudioFX.completionFanfare();
    let modal = document.getElementById('kihon-celebration-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'kihon-celebration-modal';
      document.body.appendChild(modal);
    }

    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity duration-300';
    modal.innerHTML = `
      <div class="relative max-w-lg w-full bg-[#18181c] border-2 border-emerald-500/60 rounded-2xl p-6 lg:p-8 shadow-[0_0_50px_rgba(16,185,129,0.3)] text-center space-y-4 transform animate-scale-up">
        <div class="w-16 h-16 mx-auto rounded-full bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center text-3xl">
          🎯
        </div>
        <div>
          <span class="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-mono font-semibold uppercase tracking-wider">
            Achievement Unlocked
          </span>
          <h2 class="text-2xl font-bold text-white mt-2 tracking-tight">${title}</h2>
          <p class="text-emerald-400 font-medium text-sm mt-0.5">${subtitle}</p>
        </div>
        <p class="text-zinc-300 text-sm leading-relaxed">${description}</p>
        <div class="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button id="modal-action-btn" class="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold rounded-xl text-xs tracking-wider shadow-lg transition-all flex items-center justify-center gap-2">
            <span>${actionText}</span>
          </button>
          <button id="modal-close-btn" class="w-full sm:w-auto px-5 py-2.5 bg-[#272730] hover:bg-[#32323e] border border-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs transition-all">
            Review Current Deck
          </button>
        </div>
      </div>
    `;

    const closeBtn = document.getElementById('modal-close-btn');
    if (closeBtn) {
      closeBtn.onclick = () => modal.remove();
    }

    const actionBtn = document.getElementById('modal-action-btn');
    if (actionBtn) {
      actionBtn.onclick = () => {
        modal.remove();
        if (typeof action === 'function') action();
      };
    }
  }

  /**
   * Helper to retrieve currently active learning category
   */
  window.getCurrentCategory = function () {
    return currentCategory;
  };

  /**
   * Set category and populate character strip with sequential lock gating
   */
  window.setCategory = function (category) {
    // 1. Sequential Progression Check: Hiragana Must Complete Before Katakana
    if (category === 'katakana' && window.PlayerState && !window.PlayerState.isHiraganaComplete()) {
      const hCount = window.PlayerState.getHiraganaMasteredCount();
      const hTotal = (window.KIHON_DATA && window.KIHON_DATA.hiragana) ? window.KIHON_DATA.hiragana.length : 46;
      showGateToast(`🔒 Katakana is locked! Master all ${hTotal} Hiragana characters first (Current: ${hCount}/${hTotal}).`);
      AudioFX.polarityReversedBuzz();
      if (window.PlayerState) window.PlayerState.updateHUD();
      return;
    }

    // 2. Sequential Progression Check: Katakana Must Complete Before Stage 2 Radicals
    if (category === 'radicals' && window.PlayerState && !window.PlayerState.isKatakanaComplete()) {
      const kCount = window.PlayerState.getKatakanaMasteredCount();
      const kTotal = (window.KIHON_DATA && window.KIHON_DATA.katakana) ? window.KIHON_DATA.katakana.length : 46;
      showGateToast(`🔒 Stage 2 (30 Radicals) is locked! Master all ${kTotal} Katakana characters first (Current: ${kCount}/${kTotal}).`);
      AudioFX.polarityReversedBuzz();
      if (window.PlayerState) window.PlayerState.updateHUD();
      return;
    }

    currentCategory = category;

    // Update Category Button Styling
    const catKeys = ['hiragana', 'katakana', 'radicals', 'lookalike'];
    catKeys.forEach(k => {
      const btn = document.getElementById(`cat-${k}`);
      if (btn) {
        if (k === category) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
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

    // Sync QuizEngine if currently in Level 2 Quiz mode
    if (typeof QuizEngine !== 'undefined' && currentLearningMode === 'quiz') {
      QuizEngine.startQuiz(category === 'katakana' ? 'katakana' : 'hiragana');
    }

    // Sync HUD status readouts
    if (window.PlayerState) {
      window.PlayerState.updateHUD();
    }
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
      const isMastered = window.PlayerState && (window.PlayerState.isMastered(item.char) || window.PlayerState.isMastered(item.id));
      const isSelected = idx === currentIndex;

      // Base chip classes
      btn.className = `char-pill px-3.5 py-2 rounded-lg font-jp text-lg font-bold flex-shrink-0 transition-all flex items-center gap-1.5 relative ${
        isSelected
          ? 'bg-blue-950/80 border-2 border-blue-400 text-white shadow-[0_0_15px_rgba(56,189,248,0.4)] scale-105'
          : 'bg-[#18181b] border border-[#2d2d35] text-zinc-300 hover:border-blue-500/50 hover:text-white'
      } ${isMastered ? 'ring-1 ring-emerald-400/80 border-emerald-500/60' : ''}`;

      btn.innerHTML = `
        <span>${item.char}</span>
        <span class="text-[10px] font-mono text-zinc-400 font-normal">${item.romaji}</span>
        ${isMastered ? `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]"></span>` : ''}
      `;

      btn.onclick = () => loadCharacter(idx);
      strip.appendChild(btn);
    });
  }

  /**
   * Load active character into Flashcard and Laser Etcher
   * Triggers native audio pronunciation automatically on card load
   */
  window.loadCharacter = function (index) {
    if (!currentList.length) return;
    if (index < 0) index = currentList.length - 1;
    if (index >= currentList.length) index = 0;

    currentIndex = index;
    currentChar = currentList[index];

    // Single Source of Truth hydration: ensure exact char, romaji, and strokes array from KIHON_DATA
    if (currentChar && window.KIHON_DATA) {
      if (!currentChar.strokes || !currentChar.strokes.length) {
        const canonical = (typeof window.KIHON_DATA.getCharacter === 'function')
          ? window.KIHON_DATA.getCharacter(currentChar.char || currentChar.id)
          : [...(window.KIHON_DATA.hiragana || []), ...(window.KIHON_DATA.katakana || [])].find(c => c.char === currentChar.char || c.id === currentChar.id);
        if (canonical && canonical.strokes) {
          currentChar.strokes = canonical.strokes;
          if (!currentChar.romaji && canonical.romaji) currentChar.romaji = canonical.romaji;
          if (!currentChar.termination && canonical.termination) currentChar.termination = canonical.termination;
        }
      }
    }

    // Reset card flip to front face
    const flashcard = document.getElementById('flashcard');
    if (flashcard) {
      flashcard.classList.remove('flipped');
    }

    // Populate Card Front Face
    const glyphEl = document.getElementById('card-glyph');
    const badgeEl = document.getElementById('card-type-badge');
    const idBadgeEl = document.getElementById('card-id-badge');
    const cardCountEl = document.getElementById('card-counter-display');
    const cardFrontRomaji = document.getElementById('card-front-romaji');

    if (glyphEl) {
      glyphEl.textContent = currentChar.char;
      glyphEl.className = "text-8xl lg:text-9xl font-jp font-black text-white transition-transform duration-300 group-hover:scale-105 select-none";
    }

    if (badgeEl) {
      let badgeText = currentCategory.toUpperCase();
      if (currentCategory === 'lookalike') badgeText = 'LOOKALIKE RADAR';
      badgeEl.textContent = `${badgeText} // ${currentChar.romaji.toUpperCase()}`;
    }

    if (idBadgeEl) {
      idBadgeEl.textContent = `CARD ${currentIndex + 1} OF ${currentList.length}`;
    }

    if (cardCountEl) {
      cardCountEl.textContent = `${currentIndex + 1} / ${currentList.length}`;
    }

    if (cardFrontRomaji) {
      cardFrontRomaji.textContent = currentChar.romaji;
    }

    // Populate Card Back Face
    const romajiEl = document.getElementById('card-romaji');
    const mnemonicEl = document.getElementById('card-mnemonic');
    const systemEl = document.getElementById('card-system');

    if (romajiEl) romajiEl.textContent = currentChar.romaji;
    if (mnemonicEl) mnemonicEl.textContent = currentChar.mnemonic;
    if (systemEl) systemEl.textContent = currentChar.system || 'STANDARD VOCAB SYLLABARY';

    // Highlight termination type
    const tomeBadge = document.getElementById('badge-tome');
    const haneBadge = document.getElementById('badge-hane');
    const haraiBadge = document.getElementById('badge-harai');

    [tomeBadge, haneBadge, haraiBadge].forEach(b => {
      if (b) b.className = "px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 font-medium";
    });

    const term = (currentChar.termination || '').toLowerCase();
    if (term.includes('tome') && tomeBadge) {
      tomeBadge.className = "px-2 py-0.5 rounded bg-blue-500/15 border border-blue-500/30 text-blue-300 font-semibold";
    } else if (term.includes('hane') && haneBadge) {
      haneBadge.className = "px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold";
    } else if (term.includes('harai') && haraiBadge) {
      haraiBadge.className = "px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold";
    }

    // Re-render character selector active highlight
    renderCharSelector();

    // Scroll active chip into view smoothly
    const strip = document.getElementById('char-selector');
    if (strip && strip.children[currentIndex]) {
      strip.children[currentIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    // Reset Laser Etcher Canvas for new character
    if (typeof LaserEtcher !== 'undefined' && typeof LaserEtcher.loadCharacter === 'function') {
      LaserEtcher.loadCharacter(currentChar);
    }

    // AUTOMATIC NATIVE AUDIO PRONUNCIATION (ja-JP)
    if (window.PlayerState && currentChar) {
      window.PlayerState.playAudio(currentChar.char);
    }

    // Sync HUD status
    if (window.PlayerState) {
      window.PlayerState.updateHUD();
    }
  };

  /**
   * Flip flashcard and trigger native pronunciation
   */
  window.flipCard = function () {
    const flashcard = document.getElementById('flashcard');
    if (!flashcard) return;

    flashcard.classList.toggle('flipped');
    AudioFX.init();

    // Pronounce character using PlayerState on flip
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
   * Advance to next card in the deck
   */
  window.nextCard = function () {
    AudioFX.init();
    if (!currentList.length) return;
    loadCharacter(currentIndex + 1);
  };

  /**
   * Return to previous card in the deck
   */
  window.prevCard = function () {
    AudioFX.init();
    if (!currentList.length) return;
    loadCharacter(currentIndex - 1);
  };

  /**
   * Spaced Repetition (SRS) Rating Handler
   * - 'retry': +5 XP, re-queues character
   * - 'good': +15 XP, advances to next card
   * - 'mastered': +30 XP, marks mastered, checks stage completion, advances
   */
  window.rateSRS = function (rating) {
    if (!currentChar || !window.PlayerState) return;

    AudioFX.init();

    if (rating === 'retry') {
      window.PlayerState.addXP(5);
      AudioFX.laserChime();
      // Rotate card back to front face
      const flashcard = document.getElementById('flashcard');
      if (flashcard) flashcard.classList.remove('flipped');
      updateStatusNotice(`[RETRY QUEUED] Reviewing ${currentChar.char} (${currentChar.romaji}). +5 XP`);
    } else if (rating === 'good') {
      window.PlayerState.addXP(15);
      AudioFX.laserChime();
      updateStatusNotice(`[GOOD RECALL] Solid retention for ${currentChar.char}. +15 XP`);
      setTimeout(() => nextCard(), 250);
    } else if (rating === 'mastered') {
      const wasHComplete = window.PlayerState.isHiraganaComplete();
      const wasKComplete = window.PlayerState.isKatakanaComplete();

      window.PlayerState.addXP(30);
      window.PlayerState.markMastered(currentChar.char);
      AudioFX.completionFanfare();
      updateStatusNotice(`[MASTERED LOCK-IN] ${currentChar.char} added to Core Arsenal! +30 XP`);
      renderCharSelector();

      // Check for Hiragana Completion (46/46)
      if (!wasHComplete && window.PlayerState.isHiraganaComplete()) {
        showCelebrationModal({
          title: '🎉 HIRAGANA COMPLETE (46/46)!',
          subtitle: 'You have mastered all 46 base Hiragana characters!',
          description: 'Level 1 complete! Level 2: Comprehensive 46-Character Quiz is now ready. Test your recall and audio recognition to earn bonus XP and unlock Level 3!',
          actionText: 'Take Level 2 Quiz ▶',
          action: () => setLearningMode('quiz')
        });
        return;
      }

      // Check for Katakana Completion (46/46)
      if (!wasKComplete && window.PlayerState.isKatakanaComplete()) {
        showCelebrationModal({
          title: '🌟 KATAKANA LEVEL 1 COMPLETE!',
          subtitle: 'All 46 Katakana characters reviewed in Flashcards!',
          description: 'Level 2 Katakana Quiz is now ready! Test all 46 characters to unlock Level 3 Stroke Practice and claim stage bonus XP!',
          actionText: 'Take Katakana Quiz ▶',
          action: () => setLearningMode('quiz')
        });
        return;
      }

      setTimeout(() => nextCard(), 300);
    }
  };

  function updateStatusNotice(msg) {
    const status = document.getElementById('stroke-status');
    if (status) {
      status.innerText = msg;
    }
  }

  // ==========================================================================
  // 3B. LEVEL 2: COMPREHENSIVE 46-CHARACTER QUIZ ENGINE
  // ==========================================================================

  /**
   * Switch active learning mode between Level 1 Flashcards, Level 2 Quiz, and Level 3 Stroke Etcher
   */
  window.setLearningMode = function (mode) {
    const activeScript = (currentCategory === 'katakana') ? 'katakana' : 'hiragana';

    // Level 3 Stroke Etcher lock gating: Requires Level 2 Quiz completion (>= 70%)
    if (mode === 'etcher') {
      if (window.PlayerState && !window.PlayerState.isLevel3Unlocked(activeScript)) {
        const bestScore = (window.PlayerState.quizScores && window.PlayerState.quizScores[activeScript]) || 0;
        showGateToast(`🔒 Level 3 (Stroke Etcher) is locked! Pass the Level 2 Quiz first (Score ≥ 70%, Current: ${bestScore}/46).`);
        AudioFX.polarityReversedBuzz();
        if (window.PlayerState) window.PlayerState.updateHUD();
        return;
      }
    }

    currentLearningMode = mode;

    // Update Mode Button Active Styling
    const modeKeys = ['flashcards', 'quiz', 'etcher'];
    modeKeys.forEach(k => {
      const btn = document.getElementById(`mode-btn-${k}`);
      if (btn) {
        if (k === mode) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      }
    });

    const deckContainer = document.getElementById('deck-study-container');
    const quizContainer = document.getElementById('quiz-engine-container');

    if (mode === 'quiz') {
      if (deckContainer) deckContainer.classList.add('hidden');
      if (quizContainer) quizContainer.classList.remove('hidden');
      QuizEngine.startQuiz(activeScript);
    } else {
      // 'flashcards' or 'etcher'
      if (quizContainer) quizContainer.classList.add('hidden');
      if (deckContainer) deckContainer.classList.remove('hidden');

      // Dynamically resolve active character from Flashcards / Single Source of Truth
      const activeChar = currentChar || (currentList && currentList[currentIndex]) || (window.KIHON_DATA && window.KIHON_DATA[activeScript] && window.KIHON_DATA[activeScript][0]);
      if (activeChar) {
        currentChar = activeChar;
      }

      // Sync active character into Laser Etcher canvas
      if (typeof LaserEtcher !== 'undefined' && typeof LaserEtcher.loadCharacter === 'function') {
        if (!LaserEtcher.currentChar || LaserEtcher.currentChar.char !== (currentChar && currentChar.char)) {
          LaserEtcher.loadCharacter(currentChar);
        } else {
          LaserEtcher.redraw();
          LaserEtcher.updateStatus();
        }
      }

      if (mode === 'etcher') {
        const etcherCanvas = document.getElementById('stroke-canvas');
        if (etcherCanvas) {
          etcherCanvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        updateStatusNotice(`[LEVEL 3 ACTIVE] 4-Quadrant Laser Stroke Order Guide ready for ${currentChar ? currentChar.char + ' (' + currentChar.romaji + ')' : ''}.`);
      }
    }

    if (window.PlayerState) window.PlayerState.updateHUD();
  };

  /**
   * QuizEngine: Comprehensive 46-Question Multiple-Choice & Recall Engine
   * - Tests all 46 characters of active script (Hiragana or Katakana)
   * - 4 options per question with randomized distractors
   * - Visual Kana -> Romaji, Romaji -> Kana, and Auditory Recognition challenges
   * - Native speech synthesis (ja-JP)
   * - Realtime scoring, streaks, accuracy, dual-color progress bar
   * - Mnemonic lore reinforcement on errors
   * - Unlocks Level 3 (Stroke Practice) and awards bonus XP
   */
  const QuizEngine = {
    script: 'hiragana',
    questions: [],
    currentIndex: 0,
    correctCount: 0,
    mistakeCount: 0,
    currentStreak: 0,
    bestStreak: 0,
    isWaitingForNext: false,
    answered: false,

    startQuiz: function (script) {
      this.script = script || (currentCategory === 'katakana' ? 'katakana' : 'hiragana');
      const dataset = (window.KIHON_DATA && window.KIHON_DATA[this.script]) ? window.KIHON_DATA[this.script] : [];

      if (!dataset || dataset.length === 0) {
        console.warn('[QuizEngine] No dataset found for script:', this.script);
        return;
      }

      const quizCard = document.getElementById('quiz-card');
      const summaryCard = document.getElementById('quiz-summary-card');
      if (quizCard) quizCard.classList.remove('hidden');
      if (summaryCard) summaryCard.classList.add('hidden');

      this.questions = this.buildQuestions(dataset);
      this.currentIndex = 0;
      this.correctCount = 0;
      this.mistakeCount = 0;
      this.currentStreak = 0;
      this.bestStreak = 0;
      this.isWaitingForNext = false;
      this.answered = false;

      this.loadQuestion(0);
    },

    buildQuestions: function (dataset) {
      // Shuffle character order to test all 46 in an unpredictable sequence
      const shuffledChars = [...dataset].sort(() => Math.random() - 0.5);

      return shuffledChars.map((item, idx) => {
        const typeRoll = idx % 4;
        let type = 'kana-to-romaji'; // 50% visual Kana -> Romaji
        if (typeRoll === 2) {
          type = 'romaji-to-kana'; // 25% Romaji -> Kana
        } else if (typeRoll === 3) {
          type = 'audio-to-kana'; // 25% Auditory Recognition -> Kana
        }

        const pool = dataset.filter(d => d.char !== item.char);
        const shuffledPool = [...pool].sort(() => Math.random() - 0.5);
        const distractors = shuffledPool.slice(0, 3);

        let correctOption = '';
        let distractorOptions = [];

        if (type === 'kana-to-romaji') {
          correctOption = item.romaji;
          distractorOptions = distractors.map(d => d.romaji);
        } else {
          correctOption = item.char;
          distractorOptions = distractors.map(d => d.char);
        }

        const correctIndex = Math.floor(Math.random() * 4);
        const options = [...distractorOptions];
        options.splice(correctIndex, 0, correctOption);

        return {
          item: item,
          type: type,
          options: options,
          correctOption: correctOption,
          correctIndex: correctIndex
        };
      });
    },

    loadQuestion: function (index) {
      if (index >= this.questions.length) {
        this.finishQuiz();
        return;
      }

      this.currentIndex = index;
      this.answered = false;
      this.isWaitingForNext = false;
      const q = this.questions[index];

      // Update Header & Live Telemetry
      const titleEl = document.getElementById('quiz-title');
      const progressText = document.getElementById('quiz-progress-text');
      const scoreCorrect = document.getElementById('quiz-score-correct');
      const scoreMistakes = document.getElementById('quiz-score-mistakes');
      const streakDisplay = document.getElementById('quiz-streak-display');
      const accuracyText = document.getElementById('quiz-accuracy-text');

      if (titleEl) {
        titleEl.textContent = `LEVEL 2: COMPREHENSIVE ${this.script.toUpperCase()} QUIZ (46 QUESTIONS)`;
      }
      if (progressText) {
        progressText.textContent = `${index + 1} / ${this.questions.length}`;
      }
      if (scoreCorrect) scoreCorrect.textContent = `${this.correctCount}`;
      if (scoreMistakes) scoreMistakes.textContent = `${this.mistakeCount}`;
      if (streakDisplay) streakDisplay.textContent = `${this.currentStreak} Streak`;

      // Update dual-color progress bar
      const totalQ = this.questions.length || 46;
      const barCorrect = document.getElementById('quiz-bar-correct');
      const barWrong = document.getElementById('quiz-bar-wrong');
      if (barCorrect) barCorrect.style.width = `${(this.correctCount / totalQ) * 100}%`;
      if (barWrong) barWrong.style.width = `${(this.mistakeCount / totalQ) * 100}%`;

      const answeredTotal = this.correctCount + this.mistakeCount;
      const accuracy = answeredTotal > 0 ? Math.round((this.correctCount / answeredTotal) * 100) : 100;
      if (accuracyText) accuracyText.textContent = `Accuracy: ${accuracy}%`;

      // Hide Mistake Feedback Box
      const feedbackBox = document.getElementById('quiz-feedback-box');
      if (feedbackBox) feedbackBox.classList.add('hidden');

      // Setup Question Prompt
      const typeBadge = document.getElementById('quiz-type-badge');
      const promptLabel = document.getElementById('quiz-prompt-label');
      const promptDisplay = document.getElementById('quiz-prompt-display');
      const audioIndicator = document.getElementById('quiz-audio-indicator');

      if (q.type === 'kana-to-romaji') {
        if (typeBadge) {
          typeBadge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span> Visual Kana Identification`;
          typeBadge.className = 'px-3 py-1 rounded-full bg-blue-500/15 text-blue-300 font-medium border border-blue-500/30 flex items-center gap-1.5';
        }
        if (promptLabel) promptLabel.textContent = 'Select the matching Romaji pronunciation:';
        if (promptDisplay) {
          promptDisplay.textContent = q.item.char;
          promptDisplay.className = 'text-8xl lg:text-9xl font-jp font-black text-white drop-shadow-[0_0_25px_rgba(56,189,248,0.3)] transition-transform duration-200';
        }
        if (audioIndicator) audioIndicator.classList.add('hidden');
      } else if (q.type === 'romaji-to-kana') {
        if (typeBadge) {
          typeBadge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span> Romaji Recall`;
          typeBadge.className = 'px-3 py-1 rounded-full bg-purple-500/15 text-purple-300 font-medium border border-purple-500/30 flex items-center gap-1.5';
        }
        if (promptLabel) promptLabel.textContent = 'Identify the Kana matching this Romaji:';
        if (promptDisplay) {
          promptDisplay.textContent = q.item.romaji;
          promptDisplay.className = 'text-7xl lg:text-8xl font-mono font-black text-sky-300 drop-shadow-[0_0_25px_rgba(56,189,248,0.3)] tracking-wider';
        }
        if (audioIndicator) audioIndicator.classList.add('hidden');
      } else if (q.type === 'audio-to-kana') {
        if (typeBadge) {
          typeBadge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span> Auditory Recognition`;
          typeBadge.className = 'px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 font-medium border border-amber-500/30 flex items-center gap-1.5';
        }
        if (promptLabel) promptLabel.textContent = 'Listen carefully and select the matching Kana:';
        if (promptDisplay) {
          promptDisplay.textContent = '🔊';
          promptDisplay.className = 'text-7xl lg:text-8xl select-none animate-bounce';
        }
        if (audioIndicator) audioIndicator.classList.remove('hidden');
      }

      // Populate 4 Options in grid
      const optionsGrid = document.getElementById('quiz-options-grid');
      if (optionsGrid) {
        optionsGrid.innerHTML = '';
        q.options.forEach((optText, optIdx) => {
          const btn = document.createElement('button');
          const isJapaneseGlyph = q.type !== 'kana-to-romaji';
          btn.className = `quiz-option-btn p-4 rounded-xl bg-[#141418] hover:bg-[#202028] border border-[#2d2d35] text-white font-bold ${isJapaneseGlyph ? 'font-jp text-2xl' : 'font-mono text-xl'} transition-all flex items-center justify-between group`;
          btn.innerHTML = `
            <span class="w-6 h-6 rounded-lg bg-zinc-800 group-hover:bg-zinc-700 text-xs font-mono font-normal flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
              ${optIdx + 1}
            </span>
            <span class="tracking-wide">${optText}</span>
            <span class="w-6"></span>
          `;
          btn.onclick = () => this.selectOption(optIdx);
          optionsGrid.appendChild(btn);
        });
      }

      // Play audio prompt automatically
      this.playPromptAudio();
    },

    playPromptAudio: function () {
      if (!this.questions.length || this.currentIndex >= this.questions.length) return;
      const q = this.questions[this.currentIndex];
      if (q && q.item && window.PlayerState) {
        window.PlayerState.playAudio(q.item.char);
      }
    },

    selectOption: function (selectedIdx) {
      if (this.answered || this.isWaitingForNext) return;
      if (this.currentIndex >= this.questions.length) return;

      this.answered = true;
      const q = this.questions[this.currentIndex];
      const isCorrect = (selectedIdx === q.correctIndex);

      const optionsGrid = document.getElementById('quiz-options-grid');
      const buttons = optionsGrid ? optionsGrid.children : [];

      if (isCorrect) {
        this.correctCount++;
        this.currentStreak++;
        if (this.currentStreak > this.bestStreak) {
          this.bestStreak = this.currentStreak;
        }

        AudioFX.laserChime();

        if (buttons[selectedIdx]) {
          buttons[selectedIdx].classList.add('correct-choice');
        }

        this.updateTelemetry();

        setTimeout(() => {
          this.loadQuestion(this.currentIndex + 1);
        }, 500);
      } else {
        this.mistakeCount++;
        this.currentStreak = 0;

        AudioFX.polarityReversedBuzz();

        if (buttons[selectedIdx]) {
          buttons[selectedIdx].classList.add('wrong-choice');
        }
        if (buttons[q.correctIndex]) {
          buttons[q.correctIndex].classList.add('correct-choice');
        }

        this.updateTelemetry();

        // Show Mnemonic Feedback
        this.isWaitingForNext = true;
        const feedbackBox = document.getElementById('quiz-feedback-box');
        const feedbackTitle = document.getElementById('quiz-feedback-title');
        const feedbackDesc = document.getElementById('quiz-feedback-desc');

        if (feedbackTitle) {
          feedbackTitle.textContent = `Incorrect • Correct Answer: ${q.correctOption}`;
        }
        if (feedbackDesc) {
          const mnemonicText = q.item.mnemonic || 'Practice this glyph in Level 1 flashcards.';
          feedbackDesc.innerHTML = `
            <div class="text-zinc-200 font-semibold mb-1">
              Symbol: <span class="font-jp text-lg text-white font-bold ml-1">${q.item.char}</span>
              <span class="text-zinc-400 font-mono text-xs ml-2">(${q.item.romaji})</span>
            </div>
            <div><span class="text-amber-400 font-semibold">Mnemonic Lore:</span> ${mnemonicText}</div>
          `;
        }
        if (feedbackBox) {
          feedbackBox.classList.remove('hidden');
        }
      }
    },

    advanceQuestion: function () {
      if (!this.isWaitingForNext) return;
      this.isWaitingForNext = false;
      this.loadQuestion(this.currentIndex + 1);
    },

    updateTelemetry: function () {
      const totalQ = this.questions.length || 46;
      const scoreCorrect = document.getElementById('quiz-score-correct');
      const scoreMistakes = document.getElementById('quiz-score-mistakes');
      const streakDisplay = document.getElementById('quiz-streak-display');
      const accuracyText = document.getElementById('quiz-accuracy-text');
      const barCorrect = document.getElementById('quiz-bar-correct');
      const barWrong = document.getElementById('quiz-bar-wrong');

      if (scoreCorrect) scoreCorrect.textContent = `${this.correctCount}`;
      if (scoreMistakes) scoreMistakes.textContent = `${this.mistakeCount}`;
      if (streakDisplay) streakDisplay.textContent = `${this.currentStreak} Streak`;

      if (barCorrect) barCorrect.style.width = `${(this.correctCount / totalQ) * 100}%`;
      if (barWrong) barWrong.style.width = `${(this.mistakeCount / totalQ) * 100}%`;

      const answeredTotal = this.correctCount + this.mistakeCount;
      const accuracy = answeredTotal > 0 ? Math.round((this.correctCount / answeredTotal) * 100) : 100;
      if (accuracyText) accuracyText.textContent = `Accuracy: ${accuracy}%`;
    },

    finishQuiz: function () {
      const quizCard = document.getElementById('quiz-card');
      const summaryCard = document.getElementById('quiz-summary-card');
      if (quizCard) quizCard.classList.add('hidden');
      if (summaryCard) summaryCard.classList.remove('hidden');

      const totalQ = this.questions.length || 46;
      const score = this.correctCount;
      const mistakes = this.mistakeCount;
      const pct = Math.round((score / totalQ) * 100);

      // Record in PlayerState & persist
      let recordResult = { passed: pct >= 70, pct: pct, bonusXP: 150 };
      if (window.PlayerState && typeof window.PlayerState.recordQuizCompletion === 'function') {
        recordResult = window.PlayerState.recordQuizCompletion(this.script, score, totalQ);
      }

      const sumCorrect = document.getElementById('summary-correct');
      const sumMistakes = document.getElementById('summary-mistakes');
      const sumXP = document.getElementById('summary-xp-bonus');
      const sumLvl3 = document.getElementById('summary-level3-status');
      const resPill = document.getElementById('quiz-results-pill');
      const resTitle = document.getElementById('quiz-results-title');
      const resSub = document.getElementById('quiz-results-subtitle');
      const proceedBtn = document.getElementById('quiz-proceed-lvl3-btn');

      if (sumCorrect) sumCorrect.textContent = `${score}`;
      if (sumMistakes) sumMistakes.textContent = `${mistakes}`;
      if (sumXP) sumXP.textContent = `+${recordResult.bonusXP || 150} XP`;

      if (recordResult.passed) {
        AudioFX.completionFanfare();

        if (resPill) {
          resPill.textContent = 'LEVEL 2 ASSESSMENT PASSED';
          resPill.className = 'px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-mono font-semibold uppercase tracking-wider';
        }
        if (resTitle) {
          resTitle.textContent = `46-CHARACTER ${this.script.toUpperCase()} QUIZ MASTERED!`;
        }
        if (resSub) {
          const rankTier = pct >= 95 ? 'S-RANK PILOT' : pct >= 85 ? 'A-RANK CADET' : 'B-RANK OPERATOR';
          resSub.textContent = `Final Score: ${score} / ${totalQ} (${pct}% Accuracy) • ${rankTier}`;
          resSub.className = 'text-sm text-emerald-400 font-medium mt-1';
        }
        if (sumLvl3) {
          sumLvl3.textContent = 'UNLOCKED ✓';
          sumLvl3.className = 'text-emerald-400 font-bold font-mono';
        }
        if (proceedBtn) {
          proceedBtn.classList.remove('hidden');
        }
      } else {
        AudioFX.polarityReversedBuzz();

        if (resPill) {
          resPill.textContent = 'ASSESSMENT RETRY REQUIRED';
          resPill.className = 'px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 text-xs font-mono font-semibold uppercase tracking-wider';
        }
        if (resTitle) {
          resTitle.textContent = `QUIZ SCORE: ${score} / ${totalQ} (${pct}%)`;
        }
        if (resSub) {
          resSub.textContent = 'Pass threshold: 70% (33/46). Review missed characters and retake!';
          resSub.className = 'text-sm text-amber-400 font-medium mt-1';
        }
        if (sumLvl3) {
          sumLvl3.textContent = 'LOCKED (Score ≥ 70% required)';
          sumLvl3.className = 'text-rose-400 font-bold font-mono';
        }
        if (proceedBtn) {
          proceedBtn.classList.add('hidden');
        }
      }

      if (window.PlayerState) {
        window.PlayerState.updateHUD();
      }
    }
  };

  // ==========================================================================
  // Keyboard Shortcut Navigation for Flashcards & Quiz Mode
  // ==========================================================================
  window.addEventListener('keydown', function (e) {
    if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    const bootcampView = document.getElementById('view-bootcamp');
    if (!bootcampView || bootcampView.classList.contains('hidden')) return;

    // Handle Quiz Mode Hotkeys
    if (currentLearningMode === 'quiz') {
      if (['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        QuizEngine.selectOption(parseInt(e.key, 10) - 1);
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        QuizEngine.playPromptAudio();
      } else if (e.key === ' ' || e.key === 'Enter') {
        if (QuizEngine.isWaitingForNext) {
          e.preventDefault();
          QuizEngine.advanceQuestion();
        }
      }
      return;
    }

    // Handle Flashcard Mode Hotkeys
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      window.nextCard();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      window.prevCard();
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      window.flipCard();
    } else if (e.key === '1') {
      e.preventDefault();
      window.rateSRS('retry');
    } else if (e.key === '2') {
      e.preventDefault();
      window.rateSRS('good');
    } else if (e.key === '3') {
      e.preventDefault();
      window.rateSRS('mastered');
    }
  });


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
      if (this.ctx) {
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
      }

      // Setup Pointer Event Listeners for smooth stylus, touch, and mouse support
      this.canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
      this.canvas.addEventListener('pointermove', this.onPointerMove.bind(this));
      this.canvas.addEventListener('pointerup', this.onPointerUp.bind(this));
      this.canvas.addEventListener('pointercancel', this.onPointerUp.bind(this));
      this.canvas.addEventListener('pointerleave', this.onPointerUp.bind(this));

      // Resolve initial character dynamically from active flashcard or KIHON_DATA SSOT
      const initial = (typeof currentChar !== 'undefined' && currentChar)
        ? currentChar
        : (typeof currentList !== 'undefined' && currentList && currentList.length ? currentList[0] : (window.KIHON_DATA && window.KIHON_DATA.hiragana ? window.KIHON_DATA.hiragana[0] : null));
      if (initial) {
        this.loadCharacter(initial);
      } else {
        this.redraw();
      }
    },

    loadCharacter: function (charObj) {
      if (!charObj) {
        charObj = (typeof currentChar !== 'undefined' && currentChar)
          ? currentChar
          : (window.KIHON_DATA && window.KIHON_DATA.hiragana ? window.KIHON_DATA.hiragana[0] : null);
      }
      if (!charObj) return;

      // If string/id passed, lookup canonical character from KIHON_DATA SSOT
      if (typeof charObj === 'string' && window.KIHON_DATA) {
        const canonical = (typeof window.KIHON_DATA.getCharacter === 'function')
          ? window.KIHON_DATA.getCharacter(charObj)
          : [...(window.KIHON_DATA.hiragana || []), ...(window.KIHON_DATA.katakana || [])].find(c => c.char === charObj || c.id === charObj);
        if (canonical) charObj = canonical;
      }

      // Single source of truth enforcement: ensure exact strokes array from KIHON_DATA
      if ((!charObj.strokes || !charObj.strokes.length) && window.KIHON_DATA) {
        const canonical = (typeof window.KIHON_DATA.getCharacter === 'function')
          ? window.KIHON_DATA.getCharacter(charObj.char || charObj.id)
          : [...(window.KIHON_DATA.hiragana || []), ...(window.KIHON_DATA.katakana || [])].find(c => c.char === charObj.char || c.id === charObj.id);
        if (canonical && canonical.strokes) {
          charObj.strokes = canonical.strokes;
          if (!charObj.romaji && canonical.romaji) charObj.romaji = canonical.romaji;
          if (!charObj.termination && canonical.termination) charObj.termination = canonical.termination;
        }
      }

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
      this.updateTerminationBadges();
    },

    updateStatus: function (customMsg) {
      const statusEl = document.getElementById('stroke-status');
      if (!statusEl) return;

      if (customMsg) {
        statusEl.innerText = customMsg;
        return;
      }

      if (!this.currentChar || !this.currentChar.strokes || !this.currentChar.strokes.length) {
        statusEl.innerText = 'Ready: Standby for Glyph Selection';
        return;
      }

      const total = this.currentChar.strokes.length;
      const charName = `${this.currentChar.char} (${this.currentChar.romaji ? this.currentChar.romaji.toUpperCase() : ''})`;
      if (this.currentStrokeIndex >= total) {
        statusEl.innerHTML = `<span class="text-emerald-400 font-bold">✨ ALL ${total} STROKES VERIFIED FOR ${charName}! +25 XP AWARDED!</span>`;
      } else {
        statusEl.innerHTML = `Ready: Trace Vector Stroke <span class="text-cyan-400 font-bold font-mono">${this.currentStrokeIndex + 1}/${total}</span> for <span class="text-white font-bold">${charName}</span>`;
      }
    },

    updateTerminationBadges: function () {
      if (!this.currentChar) return;
      const tomeBadge = document.getElementById('badge-tome');
      const haneBadge = document.getElementById('badge-hane');
      const haraiBadge = document.getElementById('badge-harai');

      [tomeBadge, haneBadge, haraiBadge].forEach(b => {
        if (b) b.className = "px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 font-medium";
      });

      const term = (this.currentChar.termination || '').toLowerCase();
      if (term.includes('tome') && tomeBadge) {
        tomeBadge.className = "px-2 py-0.5 rounded bg-blue-500/15 border border-blue-500/30 text-blue-300 font-semibold";
      } else if (term.includes('hane') && haneBadge) {
        haneBadge.className = "px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold";
      } else if (term.includes('harai') && haraiBadge) {
        haraiBadge.className = "px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold";
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

      if (this.canvas.classList) {
        this.canvas.classList.add('drawing');
      }

      this.redraw();
      this.drawLiveUserStroke();
    },

    onPointerMove: function (e) {
      if (!this.isDrawing) return;
      e.preventDefault();

      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

      // Smooth sampling filter: avoid duplicate adjacent points
      const lastPt = this.userPoints[this.userPoints.length - 1];
      if (!lastPt || Math.hypot(x - lastPt.x, y - lastPt.y) >= 2.0) {
        this.userPoints.push({ x, y });
      }

      // Draw real-time cyan laser trail with quadratic curves
      this.redraw();
      this.drawLiveUserStroke();
    },

    onPointerUp: function (e) {
      if (!this.isDrawing) return;
      this.isDrawing = false;

      if (this.canvas.classList) {
        this.canvas.classList.remove('drawing');
      }

      if (this.userPoints.length > 2) {
        this.verifyUserStroke();
      } else {
        this.userPoints = [];
        this.redraw();
      }
    },

    // ------------------------------------------------------------------------
    // MULTI-POINT HITSUJUN & FREEHAND CURVE VALIDATION ENGINE
    // - Evaluates full multi-point trajectory (preventing straight-line shortcuts)
    // - Checks polarity vector (top-to-bottom / left-to-right)
    // - Requires complex curve/loop waypoints (e.g. よ, る, つ, あ)
    // ------------------------------------------------------------------------
    verifyUserStroke: function () {
      if (!this.currentChar || !this.currentChar.strokes) return;
      const targetStroke = this.currentChar.strokes[this.currentStrokeIndex];
      if (!targetStroke || targetStroke.length < 2) return;

      const w = this.canvas.width;
      const h = this.canvas.height;

      // Target stroke points mapped to canvas pixel space
      const targetPts = targetStroke.map(pt => ({ x: pt[0] * w, y: pt[1] * h }));
      const expectedStart = targetPts[0];
      const expectedEnd = targetPts[targetPts.length - 1];

      const userStart = this.userPoints[0];
      const userEnd = this.userPoints[this.userPoints.length - 1];

      // Path length along curve vs straight chord displacement
      const userArcLength = this.computePathLength(this.userPoints);
      const userChordDist = Math.hypot(userEnd.x - userStart.x, userEnd.y - userStart.y);
      const targetArcLength = this.computePathLength(targetPts);
      const targetChordDist = Math.hypot(expectedEnd.x - expectedStart.x, expectedEnd.y - expectedStart.y);

      // Ignore accidental tiny taps
      if (userArcLength < 16 && targetArcLength > 30) {
        this.userPoints = [];
        this.redraw();
        return;
      }

      // Distances for start/end anchors and reversed polarity check
      const distStart = Math.hypot(userStart.x - expectedStart.x, userStart.y - expectedStart.y);
      const distEnd = Math.hypot(userEnd.x - expectedEnd.x, userEnd.y - expectedEnd.y);
      const distStartToExpectedEnd = Math.hypot(userStart.x - expectedEnd.x, userStart.y - expectedEnd.y);
      const distEndToExpectedStart = Math.hypot(userEnd.x - expectedStart.x, userEnd.y - expectedStart.y);

      // Overall chord direction vectors
      const vExp = { x: expectedEnd.x - expectedStart.x, y: expectedEnd.y - expectedStart.y };
      const vUser = { x: userEnd.x - userStart.x, y: userEnd.y - userStart.y };
      let dotProduct = 1;
      if (targetChordDist > 15 && userChordDist > 15) {
        dotProduct = (vExp.x * vUser.x + vExp.y * vUser.y) / (targetChordDist * userChordDist);
      }

      // 1. POLARITY REVERSED CHECK:
      // True reversal occurs when the user starts near the expected end and finishes near the expected start,
      // OR draws with opposite vector orientation while starting closer to the expected end.
      const isReversed = (targetChordDist >= 30 && distStartToExpectedEnd < distStart && distEndToExpectedStart < distEnd && distStartToExpectedEnd < 65 && distEndToExpectedStart < 65) ||
                         (targetChordDist > 20 && dotProduct < -0.35 && distStartToExpectedEnd < distStart);

      if (isReversed) {
        AudioFX.polarityReversedBuzz();
        this.flashCanvasBorder('red');
        this.updateStatus('⚡ POLARITY REVERSED! Follow Top-to-Bottom / Left-to-Right Hitsujun flow!');
        this.userPoints = [];
        this.redraw();
        return;
      }

      // 2. START & END ANCHOR NODE TOLERANCES
      const isStartValid = distStart < 68;
      const isEndValid = distEnd < 75 || targetChordDist < 25;

      if (!isStartValid) {
        AudioFX.polarityReversedBuzz();
        this.flashCanvasBorder('amber');
        this.updateStatus(`Vector deviation: Start at the pulsing amber node (${this.currentStrokeIndex + 1})`);
        this.userPoints = [];
        this.redraw();
        return;
      }

      if (!isEndValid) {
        AudioFX.polarityReversedBuzz();
        this.flashCanvasBorder('amber');
        this.updateStatus('End position deviation: Follow the stroke trajectory through to the end node.');
        this.userPoints = [];
        this.redraw();
        return;
      }

      // 3. MULTI-POINT CURVE & SHAPE MATCHING (STRICT ANTI-STRAIGHT-LINE CHEATING)
      const targetSinuosity = targetArcLength / Math.max(targetChordDist, 18);
      const userSinuosity = userArcLength / Math.max(userChordDist, 18);

      let shapeMismatch = false;

      // Check A: Intermediate Waypoint Coverage
      // If target has >= 3 control points (curves, bends, loops), user MUST pass near each intermediate control waypoint
      if (targetPts.length >= 3) {
        for (let i = 1; i < targetPts.length - 1; i++) {
          const waypoint = targetPts[i];
          let minDistanceToWaypoint = Infinity;
          for (let j = 0; j < this.userPoints.length; j++) {
            const d = Math.hypot(this.userPoints[j].x - waypoint.x, this.userPoints[j].y - waypoint.y);
            if (d < minDistanceToWaypoint) {
              minDistanceToWaypoint = d;
            }
          }

          // If user cut straight across and missed this curved waypoint (tolerance: 60px)
          if (minDistanceToWaypoint > 60) {
            shapeMismatch = true;
            break;
          }
        }
      }

      // Check B: Sinuosity / Curvature Ratio Check
      if (!shapeMismatch && targetSinuosity >= 1.25 && userSinuosity < 1.10) {
        shapeMismatch = true;
      }

      // Check C: Sampled Trajectory Comparison (Resampled Polyline Matching)
      if (!shapeMismatch) {
        const sampleCount = 20;
        const targetResampled = this.resamplePath(targetPts, sampleCount);
        const userResampled = this.resamplePath(this.userPoints, sampleCount);

        let totalDev = 0;
        let maxDev = 0;
        for (let s = 0; s < sampleCount; s++) {
          const dev = Math.hypot(userResampled[s].x - targetResampled[s].x, userResampled[s].y - targetResampled[s].y);
          totalDev += dev;
          if (dev > maxDev) maxDev = dev;
        }
        const avgDev = totalDev / sampleCount;

        // If average or maximum deviation along the trajectory is too high
        if (avgDev > 50 || maxDev > 75) {
          shapeMismatch = true;
        }
      }

      // If shape mismatch occurred (e.g. straight line when curve/loop required):
      if (shapeMismatch) {
        AudioFX.polarityReversedBuzz();
        this.flashCanvasBorder('amber');
        this.updateStatus('⚠️ Shape mismatch! Follow the curved path pattern correctly.');
        this.userPoints = [];
        this.redraw();
        return;
      }

      // 4. SUCCESS: STROKE VERIFIED & LOCKED
      AudioFX.laserChime();
      this.completedStrokes.push(targetStroke);
      this.currentStrokeIndex++;
      this.userPoints = [];

      const totalStrokes = this.currentChar.strokes.length;

      if (this.currentStrokeIndex >= totalStrokes) {
        // Entire character fully etched!
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
    },

    computePathLength: function (pts) {
      if (!pts || pts.length < 2) return 0;
      let len = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        len += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
      }
      return len;
    },

    resamplePath: function (points, count) {
      if (!points || points.length === 0) return [];
      if (points.length === 1) {
        return Array(count).fill({ x: points[0].x, y: points[0].y });
      }

      const dists = [0];
      for (let i = 0; i < points.length - 1; i++) {
        const d = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
        dists.push(dists[i] + d);
      }
      const totalLen = dists[dists.length - 1];
      if (totalLen === 0) {
        return Array(count).fill({ x: points[0].x, y: points[0].y });
      }

      const resampled = [];
      const step = totalLen / (count - 1);
      let currSeg = 0;

      for (let i = 0; i < count; i++) {
        const targetDist = i * step;
        while (currSeg < dists.length - 2 && dists[currSeg + 1] < targetDist) {
          currSeg++;
        }
        const segStart = dists[currSeg];
        const segEnd = dists[currSeg + 1];
        const segLen = segEnd - segStart;
        const t = segLen > 0 ? (targetDist - segStart) / segLen : 0;
        const p1 = points[currSeg];
        const p2 = points[currSeg + 1];
        resampled.push({
          x: p1.x + (p2.x - p1.x) * t,
          y: p1.y + (p2.y - p1.y) * t
        });
      }

      return resampled;
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

      if (!this.currentChar || !this.currentChar.strokes || !this.currentChar.strokes.length) return;

      // 2. Draw Ghost Strokes (faint translucent cyan guide) if ghostMode enabled
      if (this.ghostMode) {
        this.drawGhostStrokes(w, h);
      }

      // 3. Draw Locked/Completed Strokes in Glowing Emerald (#10b981)
      this.drawCompletedStrokes(w, h);

      // 4. Draw Sequence Start Nodes ('1', '2', '3'...) dynamically referencing active character
      this.drawStrokeSequenceNodes(w, h);
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

    /**
     * Render smooth quadratic Bézier curves through points with rounded caps
     */
    renderSmoothStroke: function (strokePoints, w, h) {
      if (!strokePoints || strokePoints.length === 0) return;
      const pts = strokePoints.map(p => ({ x: p[0] * w, y: p[1] * h }));

      this.ctx.beginPath();
      if (pts.length === 1) {
        this.ctx.arc(pts[0].x, pts[0].y, 4, 0, Math.PI * 2);
        this.ctx.fill();
        return;
      }
      if (pts.length === 2) {
        this.ctx.moveTo(pts[0].x, pts[0].y);
        this.ctx.lineTo(pts[1].x, pts[1].y);
        this.ctx.stroke();
        return;
      }
      if (pts.length === 3) {
        this.ctx.moveTo(pts[0].x, pts[0].y);
        this.ctx.quadraticCurveTo(pts[1].x, pts[1].y, pts[2].x, pts[2].y);
        this.ctx.stroke();
        return;
      }

      // Smooth multi-segment quadratic curve through midpoints
      this.ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 2; i++) {
        const midX = (pts[i].x + pts[i + 1].x) / 2;
        const midY = (pts[i].y + pts[i + 1].y) / 2;
        this.ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
      }
      this.ctx.quadraticCurveTo(
        pts[pts.length - 2].x,
        pts[pts.length - 2].y,
        pts[pts.length - 1].x,
        pts[pts.length - 1].y
      );
      this.ctx.stroke();
    },

    drawGhostStrokes: function (w, h) {
      if (!this.currentChar || !this.currentChar.strokes) return;
      const strokes = this.currentChar.strokes;

      this.ctx.save();

      // Subtle watermark of active character glyph in center of grid
      if (this.currentChar.char) {
        this.ctx.font = 'bold 150px "Noto Sans JP", sans-serif';
        this.ctx.fillStyle = 'rgba(6, 182, 212, 0.035)';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(this.currentChar.char, w / 2, h / 2 + 8);
      }

      this.ctx.lineWidth = 8.5;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';

      strokes.forEach((stroke, idx) => {
        if (idx < this.currentStrokeIndex) return; // Skip already completed

        this.ctx.strokeStyle = (idx === this.currentStrokeIndex)
          ? 'rgba(6, 182, 212, 0.35)'
          : 'rgba(6, 182, 212, 0.12)';

        this.renderSmoothStroke(stroke, w, h);
      });

      this.ctx.restore();
    },

    drawCompletedStrokes: function (w, h) {
      if (!this.completedStrokes.length) return;

      this.ctx.save();
      this.ctx.lineWidth = 9.5;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.strokeStyle = '#10b981';
      this.ctx.shadowColor = '#10b981';
      this.ctx.shadowBlur = 14;

      this.completedStrokes.forEach(stroke => {
        this.renderSmoothStroke(stroke, w, h);
      });

      this.ctx.restore();
    },

    drawStrokeSequenceNodes: function (w, h) {
      if (!this.currentChar || !this.currentChar.strokes) return;
      const strokes = this.currentChar.strokes;
      const total = strokes.length;

      this.ctx.save();

      // 1. Draw sequence guide nodes ('1', '2', '3'...) for completed & upcoming strokes
      if (this.ghostMode) {
        for (let i = 0; i < total; i++) {
          if (i === this.currentStrokeIndex) continue; // Active stroke drawn below with full glow
          const stroke = strokes[i];
          if (!stroke || !stroke.length) continue;

          const sx = stroke[0][0] * w;
          const sy = stroke[0][1] * h;

          if (i < this.currentStrokeIndex) {
            // Completed stroke: small emerald verified node
            this.ctx.beginPath();
            this.ctx.arc(sx, sy, 7, 0, Math.PI * 2);
            this.ctx.fillStyle = '#10b981';
            this.ctx.shadowColor = '#10b981';
            this.ctx.shadowBlur = 8;
            this.ctx.fill();

            // Subtle checkmark
            this.ctx.strokeStyle = '#020617';
            this.ctx.lineWidth = 1.5;
            this.ctx.beginPath();
            this.ctx.moveTo(sx - 3, sy);
            this.ctx.lineTo(sx - 0.5, sy + 2.5);
            this.ctx.lineTo(sx + 3, sy - 2);
            this.ctx.stroke();
          } else {
            // Upcoming stroke: numbered guide node ('2', '3'...)
            this.ctx.beginPath();
            this.ctx.arc(sx, sy, 10, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            this.ctx.fill();

            this.ctx.strokeStyle = 'rgba(6, 182, 212, 0.55)';
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();

            // Stroke number
            this.ctx.fillStyle = 'rgba(165, 243, 252, 0.9)';
            this.ctx.font = 'bold 10px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText((i + 1).toString(), sx, sy + 0.5);
          }
        }
      }

      // 2. Draw ACTIVE stroke starting node (Pulsing Amber Circle with Stroke Number & Vector Direction Arrow)
      if (this.currentStrokeIndex < total) {
        const activeStroke = strokes[this.currentStrokeIndex];
        if (activeStroke && activeStroke.length) {
          const sx = activeStroke[0][0] * w;
          const sy = activeStroke[0][1] * h;
          const endPt = activeStroke[activeStroke.length - 1];
          const ex = endPt[0] * w;
          const ey = endPt[1] * h;

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

          // Active Stroke Number ('1', '2', '3'...)
          this.ctx.fillStyle = '#020617';
          this.ctx.font = 'bold 11px sans-serif';
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText((this.currentStrokeIndex + 1).toString(), sx, sy + 0.5);

          // Directional Vector Arrow
          const angle = Math.atan2(ey - sy, ex - sx);
          const arrowDist = 24;
          const ax = sx + Math.cos(angle) * arrowDist;
          const ay = sy + Math.sin(angle) * arrowDist;

          this.ctx.strokeStyle = '#f59e0b';
          this.ctx.fillStyle = '#f59e0b';
          this.ctx.lineWidth = 2.5;

          // Arrow line
          this.ctx.beginPath();
          this.ctx.moveTo(sx + Math.cos(angle) * 14, sy + Math.sin(angle) * 14);
          this.ctx.lineTo(ax, ay);
          this.ctx.stroke();

          // Arrow head
          const headlen = 7;
          this.ctx.beginPath();
          this.ctx.moveTo(ax, ay);
          this.ctx.lineTo(ax - headlen * Math.cos(angle - Math.PI / 6), ay - headlen * Math.sin(angle - Math.PI / 6));
          this.ctx.lineTo(ax - headlen * Math.cos(angle + Math.PI / 6), ay - headlen * Math.sin(angle + Math.PI / 6));
          this.ctx.closePath();
          this.ctx.fill();
        }
      }

      this.ctx.restore();
    },

    drawActiveAnchorNode: function (w, h) {
      this.drawStrokeSequenceNodes(w, h);
    },

    drawLiveUserStroke: function () {
      if (!this.userPoints || this.userPoints.length === 0) return;

      this.ctx.save();
      this.ctx.lineWidth = 8.5;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.strokeStyle = '#06b6d4';
      this.ctx.shadowColor = '#06b6d4';
      this.ctx.shadowBlur = 14;

      if (this.userPoints.length === 1) {
        const pt = this.userPoints[0];
        this.ctx.beginPath();
        this.ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        this.ctx.fillStyle = '#06b6d4';
        this.ctx.fill();
      } else if (this.userPoints.length === 2) {
        this.ctx.beginPath();
        this.ctx.moveTo(this.userPoints[0].x, this.userPoints[0].y);
        this.ctx.lineTo(this.userPoints[1].x, this.userPoints[1].y);
        this.ctx.stroke();
      } else {
        // Smooth quadratic Bézier curves through sampled midpoints
        this.ctx.beginPath();
        this.ctx.moveTo(this.userPoints[0].x, this.userPoints[0].y);

        for (let i = 1; i < this.userPoints.length - 1; i++) {
          const midX = (this.userPoints[i].x + this.userPoints[i + 1].x) / 2;
          const midY = (this.userPoints[i].y + this.userPoints[i + 1].y) / 2;
          this.ctx.quadraticCurveTo(this.userPoints[i].x, this.userPoints[i].y, midX, midY);
        }

        const last = this.userPoints[this.userPoints.length - 1];
        this.ctx.lineTo(last.x, last.y);
        this.ctx.stroke();
      }

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
      if (!this.currentChar && typeof currentChar !== 'undefined' && currentChar) {
        this.currentChar = currentChar;
      }
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

  window.LaserEtcher = LaserEtcher;
  window.initRoadmap = renderRoadmap;

  window.playQuizPromptAudio = function () {
    QuizEngine.playPromptAudio();
  };

  window.advanceQuizQuestion = function () {
    QuizEngine.advanceQuestion();
  };

  window.restartQuiz = function () {
    QuizEngine.startQuiz(currentCategory === 'katakana' ? 'katakana' : 'hiragana');
  };

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
