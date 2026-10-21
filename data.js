/**
 * ============================================================================
 * PROJECT KIHON: NEO-TOKYO ODYSSEY
 * Single Source of Truth (SSOT) Game & Curriculum Database
 * Complete 46-Character Syllabary (Hiragana & Katakana) + 30 Radicals
 * Based on the JWA (Japan With Adi) Japanese Learning Flightpath
 * ============================================================================
 */

(function () {
  'use strict';

  // ==========================================================================
  // 1. PLAYER STATE & TELEMETRY ENGINE (WITH LOCALSTORAGE PERSISTENCE)
  // ==========================================================================

  const STORAGE_KEY = 'project_kihon_player_telemetry_v1';

  const PlayerState = {
    xp: 0,
    streak: 1,
    masteredIds: new Set(),
    forgedKanji: new Set(),
    unlockedLevels: new Set(['hiragana-1', 'katakana-1', 'radicals-1']),
    quizScores: {},
    lastLoginDate: new Date().toISOString().split('T')[0],

    // Rank Threshold Mapping (XP Based)
    RANK_TIERS: [
      { minXp: 2000, title: 'MEXT SCHOLAR (N3/N2)', badgeColor: 'text-emerald-400' },
      { minXp: 1200, title: 'COMMANDER (JLPT N4)', badgeColor: 'text-purple-400' },
      { minXp: 600,  title: 'PILOT (JLPT N5)',     badgeColor: 'text-amber-400' },
      { minXp: 250,  title: 'ENSIGN (Kana Master)', badgeColor: 'text-sky-400' },
      { minXp: 0,    title: 'CADET (Pre-N5)',      badgeColor: 'text-cyan-400' }
    ],

    /**
     * Initialize state from localStorage or defaults
     */
    init: function () {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          this.xp = typeof parsed.xp === 'number' ? parsed.xp : 0;
          this.streak = typeof parsed.streak === 'number' ? parsed.streak : 1;
          this.masteredIds = new Set(Array.isArray(parsed.masteredIds) ? parsed.masteredIds : []);
          this.forgedKanji = new Set(Array.isArray(parsed.forgedKanji) ? parsed.forgedKanji : []);
          this.unlockedLevels = new Set(Array.isArray(parsed.unlockedLevels) ? parsed.unlockedLevels : ['hiragana-1', 'katakana-1', 'radicals-1']);
          this.quizScores = (parsed.quizScores && typeof parsed.quizScores === 'object') ? parsed.quizScores : {};
          this.lastLoginDate = parsed.lastLoginDate || new Date().toISOString().split('T')[0];

          this.checkDailyStreak();
        } else {
          this.save();
        }
      } catch (err) {
        console.warn('[PlayerState] Failed to load localStorage telemetry, using defaults.', err);
      }

      this.updateHUD();
      return this;
    },

    /**
     * Check and update consecutive daily logins
     */
    checkDailyStreak: function () {
      const today = new Date().toISOString().split('T')[0];
      if (this.lastLoginDate !== today) {
        const last = new Date(this.lastLoginDate);
        const curr = new Date(today);
        const diffDays = Math.round((curr - last) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          this.streak += 1;
        } else if (diffDays > 1) {
          this.streak = 1;
        }
        this.lastLoginDate = today;
        this.save();
      }
    },

    /**
     * Save current state to localStorage
     */
    save: function () {
      try {
        const payload = {
          xp: this.xp,
          streak: this.streak,
          masteredIds: Array.from(this.masteredIds),
          forgedKanji: Array.from(this.forgedKanji),
          unlockedLevels: Array.from(this.unlockedLevels || []),
          quizScores: this.quizScores || {},
          lastLoginDate: this.lastLoginDate
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch (err) {
        console.error('[PlayerState] Could not save state to localStorage:', err);
      }
    },

    /**
     * Add XP, check rank thresholds, and sync HUD
     */
    addXP: function (amount) {
      if (typeof amount !== 'number' || isNaN(amount)) return;
      const prevRank = this.getRankTitle();
      this.xp += Math.max(0, Math.floor(amount));
      const newRank = this.getRankTitle();

      this.save();
      this.updateHUD();

      if (prevRank !== newRank) {
        console.log(`[PlayerState] PROMOTION! New Rank: ${newRank}`);
      }

      return this.xp;
    },

    /**
     * Determine player's rank title based on current XP
     */
    getRankTitle: function (customXp) {
      const xpVal = typeof customXp === 'number' ? customXp : this.xp;
      for (const tier of this.RANK_TIERS) {
        if (xpVal >= tier.minXp) {
          return tier.title;
        }
      }
      return 'CADET (Pre-N5)';
    },

    /**
     * Mark a character / radical as mastered in SRS
     */
    markMastered: function (id) {
      if (!id) return;
      if (!this.masteredIds.has(id)) {
        this.masteredIds.add(id);
        this.addXP(25);
        this.save();
        this.updateHUD();
      }
    },

    isMastered: function (id) {
      return this.masteredIds.has(id);
    },

    /**
     * Count mastered Hiragana characters (out of 46)
     */
    getHiraganaMasteredCount: function () {
      if (!window.KIHON_DATA || !window.KIHON_DATA.hiragana) return 0;
      return window.KIHON_DATA.hiragana.filter(item => this.isMastered(item.char) || this.isMastered(item.id)).length;
    },

    /**
     * Count mastered Katakana characters (out of 46)
     */
    getKatakanaMasteredCount: function () {
      if (!window.KIHON_DATA || !window.KIHON_DATA.katakana) return 0;
      return window.KIHON_DATA.katakana.filter(item => this.isMastered(item.char) || this.isMastered(item.id)).length;
    },

    /**
     * Check if Hiragana stage is completely finished (all 46 characters mastered)
     */
    isHiraganaComplete: function () {
      const total = (window.KIHON_DATA && window.KIHON_DATA.hiragana) ? window.KIHON_DATA.hiragana.length : 46;
      return this.getHiraganaMasteredCount() >= total;
    },

    /**
     * Check if Katakana stage is completely finished (all 46 characters mastered)
     */
    isKatakanaComplete: function () {
      const total = (window.KIHON_DATA && window.KIHON_DATA.katakana) ? window.KIHON_DATA.katakana.length : 46;
      return this.isHiraganaComplete() && (this.getKatakanaMasteredCount() >= total);
    },

    /**
     * Stage 2 (Radical Forge & N5 Syntax) unlocks only after Katakana is complete
     */
    isStage2Unlocked: function () {
      return this.isKatakanaComplete();
    },

    /**
     * Check if Level 3 (Stroke Practice) is unlocked for the active script
     */
    isLevel3Unlocked: function (script) {
      const s = script || (window.getCurrentCategory ? window.getCurrentCategory() : 'hiragana');
      if (!this.unlockedLevels) {
        this.unlockedLevels = new Set(['hiragana-1', 'katakana-1', 'radicals-1']);
      }
      return this.unlockedLevels.has(`${s}-3`) || this.unlockedLevels.has('all-3') || (this.quizScores && (this.quizScores[s] || 0) >= 33);
    },

    /**
     * Record completion of Level 2 46-Character Quiz
     * 70% threshold (33/46) unlocks Level 3 (Stroke Practice)
     * Awards bonus XP
     */
    recordQuizCompletion: function (script, score, total) {
      const s = script || (window.getCurrentCategory ? window.getCurrentCategory() : 'hiragana');
      if (!this.quizScores) this.quizScores = {};
      const prevBest = this.quizScores[s] || 0;
      if (score > prevBest) {
        this.quizScores[s] = score;
      }

      const tot = typeof total === 'number' && total > 0 ? total : 46;
      const pct = Math.round((score / tot) * 100);
      const passed = pct >= 70; // 70% threshold (e.g. 33/46)

      if (passed) {
        if (!this.unlockedLevels) {
          this.unlockedLevels = new Set(['hiragana-1', 'katakana-1', 'radicals-1']);
        }
        this.unlockedLevels.add(`${s}-3`);
      }

      // Base bonus: +150 XP for passing, +100 XP for perfect 46/46 score
      let bonusXP = passed ? 150 : 50;
      if (score === tot) {
        bonusXP += 100;
      }

      this.addXP(bonusXP);
      this.save();
      this.updateHUD();

      return { passed, pct, bonusXP };
    },

    /**
     * Record a forged compound kanji
     */
    addForgedKanji: function (kanji) {
      if (!kanji) return false;
      const isNew = !this.forgedKanji.has(kanji);
      if (isNew) {
        this.forgedKanji.add(kanji);
        this.addXP(50);
        this.save();
        this.updateHUD();
      }
      return isNew;
    },

    /**
     * Update all DOM telemetry readouts
     */
    updateHUD: function () {
      const rankEl = document.getElementById('hud-rank');
      const xpEl = document.getElementById('hud-xp');
      const mobileXpEl = document.getElementById('mobile-xp');
      const masteredEl = document.getElementById('hud-mastered');
      const streakEl = document.getElementById('hud-streak');
      const forgeCountEl = document.getElementById('forge-count');

      const currentRank = this.getRankTitle();

      if (rankEl) rankEl.textContent = currentRank;
      if (xpEl) xpEl.textContent = this.xp.toLocaleString();
      if (mobileXpEl) mobileXpEl.textContent = this.xp.toLocaleString();
      if (masteredEl) masteredEl.textContent = `${this.masteredIds.size}/30`;
      if (streakEl) streakEl.textContent = this.streak.toString();
      if (forgeCountEl) {
        forgeCountEl.textContent = `${this.forgedKanji.size} / ${window.FORGE_RECIPES ? window.FORGE_RECIPES.length : 8} FORGED`;
      }

      // Update Stage 1 Progress Readout in Holo-Deck view
      const hCount = this.getHiraganaMasteredCount();
      const kCount = this.getKatakanaMasteredCount();
      const hTotal = (window.KIHON_DATA && window.KIHON_DATA.hiragana) ? window.KIHON_DATA.hiragana.length : 46;
      const kTotal = (window.KIHON_DATA && window.KIHON_DATA.katakana) ? window.KIHON_DATA.katakana.length : 46;

      const pBar = document.getElementById('stage1-progress-bar');
      const pCount = document.getElementById('stage1-progress-count');
      const pTitle = document.getElementById('stage-progress-title');
      const pSub = document.getElementById('stage-progress-subtitle');
      const pBadge = document.getElementById('stage-unlock-badge');

      const currentCategory = window.getCurrentCategory ? window.getCurrentCategory() : 'hiragana';
      if (currentCategory === 'hiragana') {
        const pct = Math.round((hCount / hTotal) * 100);
        if (pBar) pBar.style.width = `${pct}%`;
        if (pCount) pCount.textContent = `${hCount} / ${hTotal}`;
        if (pTitle) pTitle.textContent = `STAGE 1: HIRAGANA FOUNDATION (${pct}%)`;
        if (pBadge) {
          if (hCount >= hTotal) {
            pBadge.textContent = 'Completed ✓';
            pBadge.className = 'px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
          } else {
            pBadge.textContent = 'In Progress';
            pBadge.className = 'px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/15 text-blue-400 border border-blue-500/30';
          }
        }
        if (pSub) {
          pSub.textContent = hCount >= hTotal
            ? 'Hiragana complete! Katakana is now unlocked.'
            : 'Complete all 46 Hiragana characters sequentially to unlock Katakana.';
        }
      } else if (currentCategory === 'katakana') {
        const pct = Math.round((kCount / kTotal) * 100);
        if (pBar) pBar.style.width = `${pct}%`;
        if (pCount) pCount.textContent = `${kCount} / ${kTotal}`;
        if (pTitle) pTitle.textContent = `STAGE 1: KATAKANA EXPANSION (${pct}%)`;
        if (pBadge) {
          if (kCount >= kTotal) {
            pBadge.textContent = 'Completed ✓';
            pBadge.className = 'px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
          } else {
            pBadge.textContent = 'In Progress';
            pBadge.className = 'px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/15 text-purple-400 border border-purple-500/30';
          }
        }
        if (pSub) {
          pSub.textContent = kCount >= kTotal
            ? 'Katakana complete! Stage 2 (Radicals & N5 Syntax) is now unlocked.'
            : 'Complete all 46 Katakana characters sequentially to unlock Stage 2.';
        }
      }

      // Update Category Switcher Lock Labels
      const katakanaBtn = document.getElementById('cat-katakana');
      const radicalsBtn = document.getElementById('cat-radicals');
      if (katakanaBtn) {
        if (!this.isHiraganaComplete()) {
          katakanaBtn.title = `Locked: Complete Hiragana first (${hCount}/46)`;
          katakanaBtn.innerHTML = `🔒 Katakana (片仮名) <span class="text-[10px] text-zinc-500 font-mono">[${hCount}/46]</span>`;
        } else {
          katakanaBtn.title = 'Katakana Unlocked';
          katakanaBtn.innerHTML = `Katakana (片仮名) <span class="text-[10px] text-zinc-400 font-mono">[${kCount}/46]</span>`;
        }
      }
      if (radicalsBtn) {
        if (!this.isKatakanaComplete()) {
          radicalsBtn.title = `Locked: Complete Katakana first (${kCount}/46)`;
          radicalsBtn.innerHTML = `🔒 30 Radicals (Stage 2)`;
        } else {
          radicalsBtn.title = 'Stage 2 Unlocked';
          radicalsBtn.innerHTML = `30 Radicals (部首)`;
        }
      }

      // Update Level 3 Mode button label/lock
      const lvl3Label = document.getElementById('level3-btn-label');
      const lvl3Btn = document.getElementById('mode-btn-etcher');
      const activeCat = window.getCurrentCategory ? window.getCurrentCategory() : 'hiragana';
      const isLvl3Unlocked = this.isLevel3Unlocked(activeCat);
      if (lvl3Label) {
        lvl3Label.textContent = isLvl3Unlocked ? 'Level 3: Stroke Etcher' : '🔒 Level 3: Stroke Etcher';
      }
      if (lvl3Btn) {
        lvl3Btn.title = isLvl3Unlocked ? 'Level 3 Unlocked' : 'Locked: Pass Level 2 Quiz first (≥70%)';
      }
    },

    /**
     * Native Japanese Speech Synthesis Audio Trigger
     * Rate: 0.85 for clear educational speech cadence
     */
    playAudio: function (text) {
      if (!text) return;
      if (!('speechSynthesis' in window)) {
        console.warn('[Audio] SpeechSynthesis API not supported in this browser.');
        return;
      }

      try {
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        utterance.rate = 0.85;
        utterance.pitch = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const jaVoice = voices.find(v => v.lang && (v.lang.startsWith('ja') || v.lang.includes('JP')));
        if (jaVoice) {
          utterance.voice = jaVoice;
        }

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('[PlayerState.playAudio] TTS execution error:', err);
      }
    }
  };


  // ==========================================================================
  // 2. ROADMAP SECTORS (JWA PHILOSOPHY & FLIGHTPATH)
  // ==========================================================================

  const ROADMAP_SECTORS = [
    {
      id: 'sector-0',
      sectorNumber: '00',
      title: 'Orbital Dock // The Radical Seed',
      timeframe: 'Weeks 1 – 3',
      targetLevel: 'Pre-N5 Foundation',
      kanjiCount: 0,
      vocabCount: 150,
      radicalsCount: 30,
      grammarFocus: 'Kana Stroke Order (Hitsujun), Dual Syllabaries, Core 30 Semantic Radicals',
      boss: 'Rosetta Sentinel',
      bossDescription: 'A colossal holographic gatekeeper analyzing stroke velocity, hook terminations, and radical deconstruction.',
      status: 'ACTIVE',
      unlockXP: 0,
      summary: 'Before touching dense kanji dictionaries, internalize the building blocks: 46 Hiragana, 46 Katakana, and the 30 indispensable Kanji Radicals that demystify 80% of Japanese compound semantics.'
    },
    {
      id: 'sector-1',
      sectorNumber: '01',
      title: 'Kihon Outpost // The Iron Core',
      timeframe: 'Months 1 – 3',
      targetLevel: 'JLPT N5',
      kanjiCount: 100,
      vocabCount: 800,
      radicalsCount: 60,
      grammarFocus: 'SOV Particle Thrusters (は, が, を, に, で), Te-form introductions, Desu/Masu verb conjugations',
      boss: 'Customs Inspector Kaito',
      bossDescription: 'A veteran neo-dock officer demanding fluent Day-1 Jikoshoukai (self-introduction) and flawless particle syntax.',
      status: 'LOCKED',
      unlockXP: 600,
      summary: 'Build an unshakeable grammatical chassis. Master the 100 base Kanji, 800 core words, and strict Subject-Object-Verb magnetic clamping via functional particles.'
    },
    {
      id: 'sector-2',
      sectorNumber: '02',
      title: 'Neo-Shibuya // Acceleration Vector',
      timeframe: 'Months 4 – 7',
      targetLevel: 'JLPT N4',
      kanjiCount: 300,
      vocabCount: 1500,
      radicalsCount: 100,
      grammarFocus: 'Te-form chains, ~tara/~ba conditionals, potential & passive verbs, native vlog listening',
      boss: 'Rogue AI Network',
      bossDescription: 'A self-evolving neural network transmitting high-frequency colloquial Japanese across Tokyo airspace.',
      status: 'LOCKED',
      unlockXP: 1200,
      summary: 'Cross from robotic survival Japanese into fluid everyday comprehension. Expand to 300 Kanji and 1,500 vocabulary words while mastering complex sentence conditionality.'
    },
    {
      id: 'sector-3',
      sectorNumber: '03',
      title: 'Zaibatsu Spire // Stratospheric Shift',
      timeframe: 'Months 8 – 12',
      targetLevel: 'JLPT N3 Bridge',
      kanjiCount: 650,
      vocabCount: 3750,
      radicalsCount: 150,
      grammarFocus: 'Keigo Mastery (Sonkeigo & Kenjougo), Transitive/Intransitive pairs, NHK Easy news decoding',
      boss: 'The Boardroom Gauntlet',
      bossDescription: 'Elite corporate intelligences testing strict situational etiquette, indirect refusal nuance, and live news briefs.',
      status: 'LOCKED',
      unlockXP: 1600,
      summary: 'Break through the infamous intermediate plateau. 650 Kanji, 3,750 vocabulary items, and high-stakes honorific speech for corporate and professional immersion.'
    },
    {
      id: 'sector-4',
      sectorNumber: '04',
      title: 'MEXT Citadel // Orbital Apex',
      timeframe: 'Months 13 – 18+',
      targetLevel: 'JLPT N2 & MEXT Ready',
      kanjiCount: 1000,
      vocabCount: 6000,
      radicalsCount: 214,
      grammarFocus: 'Statement of Purpose (SOP), Research proposals, technical interview defense, advanced editorials',
      boss: 'The Grand Panel',
      bossDescription: 'The Japanese Ministry & University selection committee grilling candidates on research hypotheses and academic rhetoric.',
      status: 'LOCKED',
      unlockXP: 2000,
      summary: 'Professional fluency and MEXT Scholarship readiness. Read editorial essays, formulate formal research proposals, and pass rigorous university and tech-firm technical interviews in Japanese.'
    }
  ];


  // ==========================================================================
  // 3. COMPLETE 46-CHARACTER DATASETS (HIRAGANA & KATAKANA) + 30 RADICALS
  // ==========================================================================

  const KIHON_DATA = {
    
    // ------------------------------------------------------------------------
    // HIRAGANA (ALL 46 STANDARD CHARACTERS IN SEQUENTIAL GOJŪON ORDER)
    // ------------------------------------------------------------------------
    hiragana: [
      // A-row
      { id: 'h-a', char: 'あ', romaji: 'a', mnemonic: 'An Apple with an Antenna curving down through it, forming the stylized letter "A".', system: 'PRIMARY ION DRIVE STABILIZER', termination: 'Harai (Sweep)', strokes: [[[0.25, 0.35], [0.75, 0.35]], [[0.50, 0.18], [0.48, 0.82]], [[0.65, 0.45], [0.35, 0.70], [0.25, 0.55], [0.55, 0.48], [0.75, 0.65], [0.65, 0.82]]] },
      { id: 'h-i', char: 'い', romaji: 'i', mnemonic: 'Two vertical Ion needles pointing down side-by-side (the left hooks up).', system: 'DUAL ION INJECTION NEEDLES', termination: 'Hane (Hook)', strokes: [[[0.32, 0.25], [0.30, 0.65], [0.38, 0.72]], [[0.68, 0.35], [0.70, 0.60]]] },
      { id: 'h-u', char: 'う', romaji: 'u', mnemonic: 'A bent posture with an overhead antenna, like someone hit yelling "Ugh!".', system: 'GRAVITATIONAL U-VALVE REGULATOR', termination: 'Tome (Stop)', strokes: [[[0.48, 0.22], [0.58, 0.28]], [[0.38, 0.40], [0.65, 0.45], [0.55, 0.75], [0.40, 0.82]]] },
      { id: 'h-e', char: 'え', romaji: 'e', mnemonic: 'An Energetic runner swooshing forward in a fast Z-zigzag dash.', system: 'ENERGY CONVERSION COIL', termination: 'Tome (Stop)', strokes: [[[0.46, 0.22], [0.54, 0.28]], [[0.35, 0.45], [0.65, 0.45], [0.40, 0.68], [0.65, 0.68], [0.75, 0.78]]] },
      { id: 'h-o', char: 'お', romaji: 'o', mnemonic: 'An Orbital circular ring with a small asteroid moon orbiting overhead.', system: 'ORBITAL MASS ACCELERATOR', termination: 'Harai (Sweep)', strokes: [[[0.25, 0.35], [0.65, 0.35]], [[0.45, 0.20], [0.45, 0.75], [0.30, 0.75], [0.40, 0.55], [0.70, 0.60], [0.65, 0.80]], [[0.72, 0.30], [0.78, 0.38]]] },

      // Ka-row
      { id: 'h-ka', char: 'か', romaji: 'ka', mnemonic: 'A sharp Kinetic blade slashing open a crate with a laser spark flying off.', system: 'KINETIC LASER HARPOON', termination: 'Hane (Hook)', strokes: [[[0.30, 0.35], [0.55, 0.35], [0.50, 0.75], [0.42, 0.72]], [[0.42, 0.25], [0.32, 0.75]], [[0.68, 0.32], [0.75, 0.40]]] },
      { id: 'h-ki', char: 'き', romaji: 'ki', mnemonic: 'A high-security Key card with two data rails and a locking diagonal spine.', system: 'CIPHER ENCRYPTION KEY BUS', termination: 'Harai (Sweep)', strokes: [[[0.32, 0.32], [0.68, 0.32]], [[0.30, 0.46], [0.70, 0.46]], [[0.58, 0.20], [0.42, 0.70]], [[0.35, 0.70], [0.55, 0.80]]] },
      { id: 'h-ku', char: 'く', romaji: 'ku', mnemonic: 'A sharp mechanical bird beak crying "Cuckoo!".', system: 'VECTOR ACCELERATION NOZZLE', termination: 'Tome (Stop)', strokes: [[[0.65, 0.25], [0.32, 0.50], [0.65, 0.75]]] },
      { id: 'h-ke', char: 'け', romaji: 'ke', mnemonic: 'A metal Keg of cyber coolant with a vertical valve pipe alongside it.', system: 'COOLANT KEG DISPENSER', termination: 'Harai (Sweep)', strokes: [[[0.30, 0.22], [0.30, 0.78], [0.38, 0.72]], [[0.45, 0.38], [0.75, 0.38]], [[0.65, 0.22], [0.65, 0.78]]] },
      { id: 'h-ko', char: 'こ', romaji: 'ko', mnemonic: 'Two parallel laser Co-ordinates marking flight boundaries.', system: 'DUAL HORIZON SENSOR RAILS', termination: 'Tome (Stop)', strokes: [[[0.30, 0.32], [0.70, 0.32], [0.60, 0.40]], [[0.30, 0.68], [0.70, 0.68]]] },

      // Sa-row
      { id: 'h-sa', char: 'さ', romaji: 'sa', mnemonic: 'A Satellite dish transmitter with a parabolic antenna arc.', system: 'LONG-RANGE SATELLITE ARRAY', termination: 'Harai (Sweep)', strokes: [[[0.30, 0.35], [0.70, 0.35]], [[0.58, 0.20], [0.42, 0.65]], [[0.35, 0.65], [0.55, 0.78]]] },
      { id: 'h-shi', char: 'し', romaji: 'shi', mnemonic: 'A single deep-sea fishing hook diving deep into the Sea.', system: 'DEEP-SUBMERGENCE GRAPPLING HOOK', termination: 'Harai (Sweep)', strokes: [[[0.45, 0.22], [0.45, 0.70], [0.55, 0.80], [0.70, 0.70]]] },
      { id: 'h-su', char: 'す', romaji: 'su', mnemonic: 'A Swimmer doing a spiral flip or a straw in a bowl of Soup.', system: 'SPIRAL CENTRIFUGE ROTOR', termination: 'Harai (Sweep)', strokes: [[[0.25, 0.35], [0.75, 0.35]], [[0.50, 0.20], [0.50, 0.50], [0.38, 0.55], [0.55, 0.60], [0.45, 0.82]]] },
      { id: 'h-se', char: 'せ', romaji: 'se', mnemonic: 'A Sentinel sitting on a step saying "Set yourself down".', system: 'SECTOR CLEARANCE SWITCH', termination: 'Tome (Stop)', strokes: [[[0.25, 0.45], [0.75, 0.45]], [[0.65, 0.25], [0.65, 0.70]], [[0.40, 0.28], [0.40, 0.72], [0.72, 0.72]]] },
      { id: 'h-so', char: 'そ', romaji: 'so', mnemonic: 'A Sewing thread zigzagging neatly through cyber fabric.', system: 'SONIC FREQUENCY OSCILLATOR', termination: 'Tome (Stop)', strokes: [[[0.35, 0.30], [0.65, 0.30], [0.35, 0.52], [0.65, 0.52], [0.40, 0.78]]] },

      // Ta-row
      { id: 'h-ta', char: 'た', romaji: 'ta', mnemonic: 'Spells out the letters "t" and "a" in a tactical badge.', system: 'TACTICAL RADAR BEACON', termination: 'Tome (Stop)', strokes: [[[0.25, 0.40], [0.55, 0.40]], [[0.40, 0.25], [0.35, 0.75]], [[0.58, 0.42], [0.75, 0.42]], [[0.55, 0.65], [0.75, 0.65]]] },
      { id: 'h-chi', char: 'ち', romaji: 'chi', mnemonic: 'A Cheerleader with arms swinging or a face with a curved Chin.', system: 'CHIRP TRANSMISSION ANTENNA', termination: 'Harai (Sweep)', strokes: [[[0.30, 0.32], [0.70, 0.32]], [[0.52, 0.18], [0.45, 0.50], [0.68, 0.55], [0.50, 0.82]]] },
      { id: 'h-tsu', char: 'つ', romaji: 'tsu', mnemonic: 'A colossal Tsunami tidal wave cresting over the Neo-Tokyo seawall.', system: 'HYDRO-DYNAMIC TSUNAMI CANNON', termination: 'Harai (Sweep)', strokes: [[[0.30, 0.35], [0.70, 0.35], [0.65, 0.65], [0.40, 0.78]]] },
      { id: 'h-te', char: 'て', romaji: 'te', mnemonic: 'A dog’s Tail or a table Tennis racket swinging down.', system: 'TELEMETRY ANTENNA VANE', termination: 'Tome (Stop)', strokes: [[[0.30, 0.35], [0.70, 0.35], [0.35, 0.75]]] },
      { id: 'h-to', char: 'と', romaji: 'to', mnemonic: 'A Tornado or thorn touching a giant robot Toe.', system: 'TORPEDO LOCKING RETICLE', termination: 'Tome (Stop)', strokes: [[[0.40, 0.22], [0.48, 0.50]], [[0.60, 0.35], [0.35, 0.65], [0.65, 0.78]]] },

      // Na-row
      { id: 'h-na', char: 'な', romaji: 'na', mnemonic: 'A Nun praying before a glowing cyber cross.', system: 'NAVIGATION GUIDANCE COMPASS', termination: 'Tome (Stop)', strokes: [[[0.25, 0.38], [0.50, 0.38]], [[0.38, 0.22], [0.35, 0.65]], [[0.62, 0.28], [0.68, 0.35]], [[0.58, 0.48], [0.58, 0.72], [0.50, 0.70]]] },
      { id: 'h-ni', char: 'に', romaji: 'ni', mnemonic: 'A Needle and thread with two horizontal data bars.', system: 'NITROGEN FUEL INJECTOR', termination: 'Tome (Stop)', strokes: [[[0.30, 0.22], [0.30, 0.78], [0.38, 0.72]], [[0.50, 0.40], [0.75, 0.40]], [[0.48, 0.65], [0.78, 0.65]]] },
      { id: 'h-nu', char: 'ぬ', romaji: 'nu', mnemonic: 'Two chopsticks twirling delicious hot Noodles into a loop.', system: 'NUCLEAR CORE VENT', termination: 'Tome (Stop)', strokes: [[[0.40, 0.25], [0.32, 0.75]], [[0.32, 0.38], [0.68, 0.38], [0.40, 0.75], [0.68, 0.72], [0.72, 0.82]]] },
      { id: 'h-ne', char: 'ね', romaji: 'ne', mnemonic: 'A cyber Cat (Neko) with a curly tail at the back.', system: 'NEURAL LINK COMM MATRIX', termination: 'Tome (Stop)', strokes: [[[0.32, 0.22], [0.32, 0.78]], [[0.25, 0.40], [0.65, 0.40], [0.35, 0.68], [0.65, 0.68], [0.72, 0.78]]] },
      { id: 'h-no', char: 'の', romaji: 'no', mnemonic: 'A clean circular "NO entry" loop.', system: 'NODAL ZERO-POINT BEACON', termination: 'Harai (Sweep)', strokes: [[[0.55, 0.28], [0.35, 0.65], [0.65, 0.75], [0.75, 0.45], [0.45, 0.35]]] },

      // Ha-row
      { id: 'h-ha', char: 'は', romaji: 'ha', mnemonic: 'A soldier standing upright laughing "Ha-ha!" with a loop.', system: 'HALL-EFFECT SHIELD GENERATOR', termination: 'Tome (Stop)', strokes: [[[0.30, 0.22], [0.30, 0.78], [0.38, 0.72]], [[0.45, 0.38], [0.75, 0.38]], [[0.65, 0.25], [0.65, 0.75], [0.50, 0.72], [0.72, 0.68]]] },
      { id: 'h-hi', char: 'ひ', romaji: 'hi', mnemonic: 'A big smiling mouth laughing "Hee-hee!".', system: 'HIGH-FREQUENCY LASER ARRAY', termination: 'Tome (Stop)', strokes: [[[0.30, 0.32], [0.45, 0.32], [0.32, 0.68], [0.50, 0.78], [0.68, 0.68], [0.55, 0.32], [0.70, 0.32]]] },
      { id: 'h-fu', char: 'ふ', romaji: 'fu', mnemonic: 'Mount Fuji with snow flurries blowing around its peaks.', system: 'FUSION PLASMA INJECTOR', termination: 'Harai (Sweep)', strokes: [[[0.50, 0.22], [0.50, 0.30]], [[0.48, 0.42], [0.55, 0.65], [0.42, 0.75]], [[0.32, 0.50], [0.30, 0.60]], [[0.68, 0.50], [0.70, 0.60]]] },
      { id: 'h-he', char: 'へ', romaji: 'he', mnemonic: 'A pointy roof pointing up to Heaven (or Mt. Hiei).', system: 'HELIUM RAM-SCOOP VANE', termination: 'Harai (Sweep)', strokes: [[[0.28, 0.65], [0.48, 0.35], [0.75, 0.65]]] },
      { id: 'h-ho', char: 'ほ', romaji: 'ho', mnemonic: 'A guard with a Helmet and sword saying "Halt! Who goes there?".', system: 'HOLO-PROJECTOR RELAY', termination: 'Tome (Stop)', strokes: [[[0.28, 0.22], [0.28, 0.78], [0.36, 0.72]], [[0.45, 0.30], [0.75, 0.30]], [[0.45, 0.48], [0.75, 0.48]], [[0.65, 0.30], [0.65, 0.75], [0.50, 0.72], [0.72, 0.68]]] },

      // Ma-row
      { id: 'h-ma', char: 'ま', romaji: 'ma', mnemonic: 'Two crossbars on a ship Mast with a loop at the bottom.', system: 'MAGNETIC RAIL CONDUIT', termination: 'Tome (Stop)', strokes: [[[0.30, 0.35], [0.70, 0.35]], [[0.32, 0.50], [0.68, 0.50]], [[0.52, 0.20], [0.52, 0.75], [0.38, 0.72], [0.65, 0.68]]] },
      { id: 'h-mi', char: 'み', romaji: 'mi', mnemonic: 'Musical note "Do-Re-Mi" resembling the lucky number 21.', system: 'MICRO-WARP DISTORTION DRIVE', termination: 'Harai (Sweep)', strokes: [[[0.32, 0.32], [0.55, 0.32], [0.38, 0.60], [0.62, 0.60]], [[0.55, 0.20], [0.45, 0.78]]] },
      { id: 'h-mu', char: 'む', romaji: 'mu', mnemonic: 'A Cow with horns and tail saying "Moo!".', system: 'MULTI-SPECTRUM SCANNER', termination: 'Tome (Stop)', strokes: [[[0.25, 0.38], [0.65, 0.38]], [[0.45, 0.20], [0.45, 0.65], [0.32, 0.68], [0.55, 0.68], [0.70, 0.55]], [[0.68, 0.28], [0.75, 0.35]]] },
      { id: 'h-me', char: 'め', romaji: 'me', mnemonic: 'A noodle bowl without the loop—looks like an Eye (Me in Japanese).', system: 'MEDIUM-RANGE TARGET OPTICS', termination: 'Harai (Sweep)', strokes: [[[0.42, 0.25], [0.32, 0.75]], [[0.30, 0.40], [0.65, 0.38], [0.40, 0.75], [0.72, 0.70]]] },
      { id: 'h-mo', char: 'も', romaji: 'mo', mnemonic: 'A fishing hook catching More and More worms.', system: 'MOLECULAR SIEVE FILTER', termination: 'Tome (Stop)', strokes: [[[0.48, 0.20], [0.48, 0.70], [0.60, 0.78], [0.72, 0.68]], [[0.32, 0.42], [0.68, 0.42]], [[0.30, 0.55], [0.70, 0.55]]] },

      // Ya-row
      { id: 'h-ya', char: 'や', romaji: 'ya', mnemonic: 'A Yak with long horns climbing a steep hill.', system: 'Y-AXIS THRUSTER GIMBAL', termination: 'Harai (Sweep)', strokes: [[[0.30, 0.45], [0.60, 0.40], [0.55, 0.75]], [[0.45, 0.25], [0.50, 0.35]], [[0.70, 0.22], [0.65, 0.78]]] },
      { id: 'h-yu', char: 'ゆ', romaji: 'yu', mnemonic: 'A Unique submarine gliding gracefully underwater.', system: 'YAW GYROSCOPIC STABILIZER', termination: 'Harai (Sweep)', strokes: [[[0.40, 0.25], [0.40, 0.65], [0.60, 0.65], [0.60, 0.45]], [[0.60, 0.20], [0.32, 0.78]]] },
      { id: 'h-yo', char: 'よ', romaji: 'yo', mnemonic: 'A Yo-yo dangling ready to spring back up.', system: 'YOTTA-WATT POWER CELL', termination: 'Tome (Stop)', strokes: [[[0.30, 0.35], [0.55, 0.35]], [[0.52, 0.20], [0.52, 0.75], [0.38, 0.72], [0.65, 0.68]]] },

      // Ra-row
      { id: 'h-ra', char: 'ら', romaji: 'ra', mnemonic: 'A Rabbit sitting on its hind legs with its ear pointed up.', system: 'RADIATION SHIELD BAFFLE', termination: 'Tome (Stop)', strokes: [[[0.45, 0.22], [0.55, 0.25]], [[0.42, 0.38], [0.65, 0.45], [0.55, 0.75], [0.35, 0.78]]] },
      { id: 'h-ri', char: 'り', romaji: 'ri', mnemonic: 'Two Reeds standing in a river stream (the right is longer).', system: 'RESONANCE FREQUENCY FILTER', termination: 'Harai (Sweep)', strokes: [[[0.35, 0.30], [0.35, 0.60]], [[0.65, 0.20], [0.65, 0.78]]] },
      { id: 'h-ru', char: 'る', romaji: 'ru', mnemonic: 'A Road winding along holding a secret Ruby loop at the end.', system: 'RUBIDIUM ION CLOCK', termination: 'Tome (Stop)', strokes: [[[0.35, 0.30], [0.65, 0.30], [0.38, 0.55], [0.65, 0.55], [0.50, 0.78], [0.58, 0.82]]] },
      { id: 'h-re', char: 'れ', romaji: 're', mnemonic: 'A Reindeer standing tall with antlers kicking back.', system: 'REACTION CONTROL SYSTEM', termination: 'Harai (Sweep)', strokes: [[[0.32, 0.22], [0.32, 0.78]], [[0.25, 0.40], [0.65, 0.40], [0.38, 0.68], [0.62, 0.68], [0.75, 0.58]]] },
      { id: 'h-ro', char: 'ろ', romaji: 'ro', mnemonic: 'A Road winding along where the ruby was Robbed (no loop).', system: 'ROTATIONAL MOMENTUM WHEEL', termination: 'Tome (Stop)', strokes: [[[0.35, 0.30], [0.65, 0.30], [0.38, 0.55], [0.65, 0.55], [0.40, 0.78]]] },

      // Wa-row & N
      { id: 'h-wa', char: 'わ', romaji: 'wa', mnemonic: 'A White swan with a broad open neck.', system: 'WARP BUBBLE COIL', termination: 'Tome (Stop)', strokes: [[[0.32, 0.22], [0.32, 0.78]], [[0.25, 0.40], [0.65, 0.40], [0.38, 0.68], [0.68, 0.70]]] },
      { id: 'h-wo', char: 'を', romaji: 'wo', mnemonic: 'An Olympic jumper soaring "Woah!" over a hurdle.', system: 'OBJECT TARGETING SENSOR', termination: 'Tome (Stop)', strokes: [[[0.30, 0.32], [0.68, 0.32]], [[0.48, 0.20], [0.38, 0.58], [0.68, 0.58]], [[0.42, 0.58], [0.42, 0.78], [0.72, 0.72]]] },
      { id: 'h-n', char: 'ん', romaji: 'n', mnemonic: 'A handwritten lowercase "n" swooping up to the sky.', system: 'NULL-SPACE COMPENSATOR', termination: 'Harai (Sweep)', strokes: [[[0.35, 0.22], [0.40, 0.75], [0.55, 0.45], [0.72, 0.70]]] }
    ],

    // ------------------------------------------------------------------------
    // KATAKANA (ALL 46 STANDARD CHARACTERS IN SEQUENTIAL GOJŪON ORDER)
    // ------------------------------------------------------------------------
    katakana: [
      // A-row
      { id: 'k-a', char: 'ア', romaji: 'a', mnemonic: 'An Axe blade chopping through armor.', system: 'TACTICAL ARMOR CUTTER', termination: 'Harai (Sweep)', strokes: [[[0.30, 0.30], [0.70, 0.30], [0.50, 0.50]], [[0.60, 0.35], [0.40, 0.80]]] },
      { id: 'k-i', char: 'イ', romaji: 'i', mnemonic: 'An Iron easel standing rigid on the deck.', system: 'INTERNAL FLIGHT BRACE', termination: 'Tome (Stop)', strokes: [[[0.45, 0.25], [0.30, 0.65]], [[0.45, 0.45], [0.45, 0.85]]] },
      { id: 'k-u', char: 'ウ', romaji: 'u', mnemonic: 'An Ultra antenna on top of a flight helmet.', system: 'ULTRA-BAND COMM HELMET', termination: 'Tome (Stop)', strokes: [[[0.50, 0.20], [0.50, 0.32]], [[0.32, 0.40], [0.32, 0.55]], [[0.32, 0.42], [0.68, 0.42], [0.50, 0.82]]] },
      { id: 'k-e', char: 'エ', romaji: 'e', mnemonic: 'An Engineering I-beam girder supporting the hull.', system: 'EXO-STRUCTURAL I-BEAM', termination: 'Tome (Stop)', strokes: [[[0.30, 0.30], [0.70, 0.30]], [[0.50, 0.30], [0.50, 0.70]], [[0.22, 0.70], [0.78, 0.70]]] },
      { id: 'k-o', char: 'オ', romaji: 'o', mnemonic: 'An Opera singer in an exo-suit with outstretched arm.', system: 'OMNI-DIRECTIONAL ACOUSTIC EMITTER', termination: 'Harai (Sweep)', strokes: [[[0.25, 0.35], [0.75, 0.35]], [[0.50, 0.20], [0.50, 0.80], [0.42, 0.75]], [[0.50, 0.40], [0.28, 0.75]]] },

      // Ka-row
      { id: 'k-ka', char: 'カ', romaji: 'ka', mnemonic: 'A sharp Katana striking across a metal shield.', system: 'KATANA PLASMATIC EDGE', termination: 'Harai (Sweep)', strokes: [[[0.30, 0.35], [0.68, 0.35], [0.62, 0.75], [0.52, 0.72]], [[0.50, 0.22], [0.30, 0.80]]] },
      { id: 'k-ki', char: 'キ', romaji: 'ki', mnemonic: 'A Key with two horizontal data bars and diagonal spine.', system: 'KEY LOCK CYLINDER', termination: 'Harai (Sweep)', strokes: [[[0.30, 0.35], [0.70, 0.35]], [[0.28, 0.50], [0.72, 0.50]], [[0.55, 0.20], [0.40, 0.80]]] },
      { id: 'k-ku', char: 'ク', romaji: 'ku', mnemonic: 'A Cook\'s cleaver cutting down or a cuckoo beak.', system: 'KINETIC CUTTING BLADE', termination: 'Harai (Sweep)', strokes: [[[0.48, 0.22], [0.35, 0.45]], [[0.35, 0.45], [0.68, 0.45], [0.42, 0.80]]] },
      { id: 'k-ke', char: 'ケ', romaji: 'ke', mnemonic: 'A Kendo armor breastplate with cross-braces.', system: 'KENDO ARMOR STRUT', termination: 'Harai (Sweep)', strokes: [[[0.42, 0.22], [0.30, 0.48]], [[0.30, 0.45], [0.72, 0.45]], [[0.55, 0.25], [0.40, 0.80]]] },
      { id: 'k-ko', char: 'コ', romaji: 'ko', mnemonic: 'A sharp 90-degree Corner of a cargo container.', system: 'CORNER BULKHEAD BRACE', termination: 'Tome (Stop)', strokes: [[[0.30, 0.35], [0.70, 0.35], [0.70, 0.70]], [[0.30, 0.70], [0.70, 0.70]]] },

      // Sa-row
      { id: 'k-sa', char: 'サ', romaji: 'sa', mnemonic: 'Three tactical Sensor prongs standing guard.', system: 'SENSOR TRIPOD MAST', termination: 'Harai (Sweep)', strokes: [[[0.25, 0.40], [0.75, 0.40]], [[0.40, 0.25], [0.38, 0.72]], [[0.62, 0.25], [0.58, 0.72]]] },
      { id: 'k-shi', char: 'シ', romaji: 'shi', mnemonic: 'LOOKALIKE: "SHI eyes look UP!" Two low dots, long stroke swooshes UPWARDS.', system: 'SHIELD VECTOR EMITTER (UP-SWEEP)', termination: 'Harai (Sweep)', strokes: [[[0.35, 0.32], [0.45, 0.36]], [[0.30, 0.52], [0.40, 0.56]], [[0.25, 0.78], [0.50, 0.55], [0.75, 0.28]]] },
      { id: 'k-su', char: 'ス', romaji: 'su', mnemonic: 'A downhill Skier speeding forward with ski poles.', system: 'SUB-LIGHT PROPULSION CONDUIT', termination: 'Harai (Sweep)', strokes: [[[0.32, 0.35], [0.68, 0.35], [0.48, 0.78]], [[0.48, 0.52], [0.68, 0.78]]] },
      { id: 'k-se', char: 'セ', romaji: 'se', mnemonic: 'A Sector gate with a security latch.', system: 'SECTOR FIREWALL GATE', termination: 'Tome (Stop)', strokes: [[[0.30, 0.35], [0.68, 0.35], [0.65, 0.55], [0.40, 0.55]], [[0.50, 0.25], [0.50, 0.78], [0.65, 0.78]]] },
      { id: 'k-so', char: 'ソ', romaji: 'so', mnemonic: 'LOOKALIKE: "SO needle points DOWN!" Dart plunge downward from top right.', system: 'SOLAR RADIATION DART (DOWN-SLASH)', termination: 'Harai (Sweep)', strokes: [[[0.38, 0.28], [0.45, 0.42]], [[0.72, 0.26], [0.34, 0.80]]] },

      // Ta-row
      { id: 'k-ta', char: 'タ', romaji: 'ta', mnemonic: 'A Target crosshair with an internal firing beacon.', system: 'TARGETING MATRIX RETICLE', termination: 'Harai (Sweep)', strokes: [[[0.42, 0.22], [0.32, 0.45]], [[0.32, 0.42], [0.70, 0.42], [0.45, 0.80]], [[0.38, 0.55], [0.60, 0.62]]] },
      { id: 'k-chi', char: 'チ', romaji: 'chi', mnemonic: 'A Cheerleader cheering with a baton or Chirp radar.', system: 'CHIRP SIGNAL BEACON', termination: 'Harai (Sweep)', strokes: [[[0.65, 0.25], [0.35, 0.35]], [[0.28, 0.50], [0.72, 0.50]], [[0.50, 0.35], [0.40, 0.80]]] },
      { id: 'k-tsu', char: 'ツ', romaji: 'tsu', mnemonic: 'LOOKALIKE: "TSU raindrops fall DOWN!" Plunges downward from top-right.', system: 'TSUNAMI IMPACT DRILL (DOWN-SWEEP)', termination: 'Harai (Sweep)', strokes: [[[0.34, 0.24], [0.38, 0.38]], [[0.54, 0.28], [0.58, 0.42]], [[0.75, 0.24], [0.55, 0.58], [0.32, 0.82]]] },
      { id: 'k-te', char: 'テ', romaji: 'te', mnemonic: 'A Television antenna receiving dual frequencies.', system: 'TELEMETRY TRANSCEIVER', termination: 'Harai (Sweep)', strokes: [[[0.35, 0.32], [0.65, 0.32]], [[0.28, 0.48], [0.72, 0.48]], [[0.50, 0.48], [0.35, 0.80]]] },
      { id: 'k-to', char: 'ト', romaji: 'to', mnemonic: 'A Totem pole with a strong right branch.', system: 'TORQUE MULTIPLIER SHAFT', termination: 'Tome (Stop)', strokes: [[[0.45, 0.22], [0.45, 0.82]], [[0.45, 0.45], [0.70, 0.60]]] },

      // Na-row
      { id: 'k-na', char: 'ナ', romaji: 'na', mnemonic: 'A Ninja throwing crossbar with a sweeping blade.', system: 'NINJA BLADE CANOPY', termination: 'Harai (Sweep)', strokes: [[[0.25, 0.35], [0.75, 0.35]], [[0.50, 0.25], [0.35, 0.80]]] },
      { id: 'k-ni', char: 'ニ', romaji: 'ni', mnemonic: 'Two horizontal data rails (the number 2).', system: 'NITRATE LEVEL SENSOR', termination: 'Tome (Stop)', strokes: [[[0.32, 0.38], [0.68, 0.38]], [[0.25, 0.65], [0.75, 0.65]]] },
      { id: 'k-nu', char: 'ヌ', romaji: 'nu', mnemonic: 'Two chopsticks crossing like New scissors.', system: 'NUTATION DAMPENER', termination: 'Harai (Sweep)', strokes: [[[0.30, 0.35], [0.68, 0.35], [0.40, 0.78]], [[0.42, 0.52], [0.68, 0.78]]] },
      { id: 'k-ne', char: 'ネ', romaji: 'ne', mnemonic: 'A Nexus connector with terminal pins.', system: 'NEXUS DISTRIBUTION HUB', termination: 'Tome (Stop)', strokes: [[[0.50, 0.20], [0.50, 0.32]], [[0.48, 0.35], [0.35, 0.55]], [[0.35, 0.52], [0.68, 0.52], [0.45, 0.82]], [[0.52, 0.55], [0.70, 0.78]]] },
      { id: 'k-no', char: 'ノ', romaji: 'no', mnemonic: 'A single simple slash: "No strokes, just one".', system: 'NODE INCLINATION SENSOR', termination: 'Harai (Sweep)', strokes: [[[0.65, 0.25], [0.35, 0.78]]] },

      // Ha-row
      { id: 'k-ha', char: 'ハ', romaji: 'ha', mnemonic: 'Two laughing slash marks: "Ha-ha!".', system: 'HALL-EFFECT POLARIZER', termination: 'Harai (Sweep)', strokes: [[[0.42, 0.30], [0.30, 0.75]], [[0.58, 0.30], [0.70, 0.75]]] },
      { id: 'k-hi', char: 'ヒ', romaji: 'hi', mnemonic: 'A Hero’s shield with a flat level footing.', system: 'HIGH-G ACCELERATION COUCH', termination: 'Tome (Stop)', strokes: [[[0.38, 0.30], [0.65, 0.30]], [[0.38, 0.30], [0.38, 0.70], [0.72, 0.70]]] },
      { id: 'k-fu', char: 'フ', romaji: 'fu', mnemonic: 'A single Flag flapping forward in the wind.', system: 'FUSION INTAKE BAFFLE', termination: 'Harai (Sweep)', strokes: [[[0.30, 0.32], [0.70, 0.32], [0.45, 0.78]]] },
      { id: 'k-he', char: 'ヘ', romaji: 'he', mnemonic: 'A pointy mountain ridge leading to Heaven.', system: 'HEAT RADIATOR FIN', termination: 'Harai (Sweep)', strokes: [[[0.28, 0.65], [0.48, 0.35], [0.75, 0.65]]] },
      { id: 'k-ho', char: 'ホ', romaji: 'ho', mnemonic: 'A Holy cross with glowing laser spark wings.', system: 'HORIZONTAL GYROSCOPE', termination: 'Harai (Sweep)', strokes: [[[0.28, 0.35], [0.72, 0.35]], [[0.50, 0.20], [0.50, 0.80], [0.42, 0.75]], [[0.38, 0.50], [0.30, 0.68]], [[0.62, 0.50], [0.70, 0.68]]] },

      // Ma-row
      { id: 'k-ma', char: 'マ', romaji: 'ma', mnemonic: 'A Martini glass rim or Mask corner.', system: 'MAGNETIC PINCH CONFINEMENT', termination: 'Tome (Stop)', strokes: [[[0.32, 0.35], [0.68, 0.35], [0.45, 0.60]], [[0.45, 0.55], [0.65, 0.78]]] },
      { id: 'k-mi', char: 'ミ', romaji: 'mi', mnemonic: 'Three horizontal Missile tracking lines.', system: 'MISSILE TRAJECTORY COMPUTER', termination: 'Harai (Sweep)', strokes: [[[0.35, 0.32], [0.65, 0.35]], [[0.32, 0.50], [0.68, 0.53]], [[0.30, 0.68], [0.70, 0.72]]] },
      { id: 'k-mu', char: 'ム', romaji: 'mu', mnemonic: 'A triangle shaped Moose snout or Moon rover nose.', system: 'MUTUAL INDUCTANCE CHOKE', termination: 'Tome (Stop)', strokes: [[[0.48, 0.25], [0.32, 0.68], [0.72, 0.68]], [[0.62, 0.50], [0.55, 0.68]]] },
      { id: 'k-me', char: 'メ', romaji: 'me', mnemonic: 'An X-shaped laser aiming sight (Metal cross).', system: 'MESON BEAM FOCUS', termination: 'Harai (Sweep)', strokes: [[[0.65, 0.28], [0.35, 0.75]], [[0.40, 0.40], [0.68, 0.70]]] },
      { id: 'k-mo', char: 'モ', romaji: 'mo', mnemonic: 'A Monitor screen with dual rails and an upturned base.', system: 'MOMENTUM WHEEL ENCODER', termination: 'Tome (Stop)', strokes: [[[0.30, 0.35], [0.70, 0.35]], [[0.28, 0.50], [0.72, 0.50]], [[0.48, 0.22], [0.48, 0.70], [0.68, 0.70]]] },

      // Ya-row
      { id: 'k-ya', char: 'ヤ', romaji: 'ya', mnemonic: 'A high-tech Yacht sailing past a harbor.', system: 'Y-AXIS VECTOR NOZZLE', termination: 'Harai (Sweep)', strokes: [[[0.30, 0.40], [0.68, 0.35], [0.55, 0.75]], [[0.42, 0.25], [0.45, 0.38]], [[0.68, 0.25], [0.65, 0.78]]] },
      { id: 'k-yu', char: 'ユ', romaji: 'yu', mnemonic: 'A distinct U-turn sign turned sideways.', system: 'UTILITY POWER BUS', termination: 'Tome (Stop)', strokes: [[[0.35, 0.35], [0.68, 0.35], [0.68, 0.70]], [[0.35, 0.70], [0.78, 0.70]]] },
      { id: 'k-yo', char: 'ヨ', romaji: 'yo', mnemonic: 'A cyber Yoga rack or Yolk crate with three shelves.', system: 'YOKE STEERING ACTUATOR', termination: 'Tome (Stop)', strokes: [[[0.35, 0.30], [0.70, 0.30], [0.70, 0.75], [0.35, 0.75]], [[0.35, 0.52], [0.68, 0.52]]] },

      // Ra-row
      { id: 'k-ra', char: 'ラ', romaji: 'ra', mnemonic: 'A Radio antenna with a right support bracket.', system: 'RADAR ALTIMETER DISH', termination: 'Harai (Sweep)', strokes: [[[0.35, 0.32], [0.65, 0.32]], [[0.42, 0.48], [0.68, 0.48], [0.50, 0.80]]] },
      { id: 'k-ri', char: 'リ', romaji: 'ri', mnemonic: 'Two river Ribbons running parallel.', system: 'RING LASER GYRO', termination: 'Harai (Sweep)', strokes: [[[0.38, 0.30], [0.38, 0.60]], [[0.62, 0.20], [0.62, 0.80]]] },
      { id: 'k-ru', char: 'ル', romaji: 'ru', mnemonic: 'Two legs running along Route 66.', system: 'RUDDER DEFLECTION SERVO', termination: 'Harai (Sweep)', strokes: [[[0.45, 0.25], [0.32, 0.78]], [[0.58, 0.25], [0.58, 0.75], [0.72, 0.70]]] },
      { id: 'k-re', char: 'レ', romaji: 're', mnemonic: 'A Red laser ray bouncing off a crystal prism.', system: 'RELAY COUPLER SWITCH', termination: 'Harai (Sweep)', strokes: [[[0.40, 0.22], [0.40, 0.75], [0.70, 0.65]]] },
      { id: 'k-ro', char: 'ロ', romaji: 'ro', mnemonic: 'A closed Robot head / square box.', system: 'ROBOTIC PAYLOAD CRADLE', termination: 'Tome (Stop)', strokes: [[[0.30, 0.30], [0.30, 0.72]], [[0.30, 0.30], [0.70, 0.30], [0.70, 0.72]], [[0.30, 0.72], [0.70, 0.72]]] },

      // Wa-row & N
      { id: 'k-wa', char: 'ワ', romaji: 'wa', mnemonic: 'A Wide sensor dish outline.', system: 'WAVEGUIDE TRANSMISSION TUBE', termination: 'Harai (Sweep)', strokes: [[[0.32, 0.35], [0.32, 0.55]], [[0.32, 0.35], [0.68, 0.35], [0.50, 0.78]]] },
      { id: 'k-wo', char: 'ヲ', romaji: 'wo', mnemonic: 'A Warrior wielding two curved batons.', system: 'WIDE-FIELD OPTICAL SENSOR', termination: 'Harai (Sweep)', strokes: [[[0.32, 0.32], [0.68, 0.32]], [[0.30, 0.50], [0.65, 0.50]], [[0.52, 0.32], [0.40, 0.78]]] },
      { id: 'k-n', char: 'ン', romaji: 'n', mnemonic: 'LOOKALIKE: "N rockets UP to the stars!" Lower dot, long slash rockets UPWARDS.', system: 'NEO-THRUSTER BOOST (UP-SLASH)', termination: 'Harai (Sweep)', strokes: [[[0.32, 0.50], [0.44, 0.54]], [[0.28, 0.78], [0.50, 0.55], [0.74, 0.30]]] }
    ],

    // ------------------------------------------------------------------------
    // RADICALS (30 Foundational Semantic Kanji Building Blocks)
    // ------------------------------------------------------------------------
    radicals: [
      { id: 'r-ichi', char: '一', romaji: 'ichi', meaning: 'One / Ground Line', mnemonic: 'The singular foundation line of the cosmos; horizon plane.', system: 'HORIZON CALIBRATION GYRO', termination: 'Tome (Stop)', strokes: [[[0.20, 0.50], [0.80, 0.50]]] },
      { id: 'r-hito', char: '人', romaji: 'hito / nin', meaning: 'Person / Crew', mnemonic: 'A human crewmember walking forward on two legs.', system: 'CREW LIFE-SIGN MATRIX', termination: 'Harai (Sweep)', strokes: [[[0.50, 0.20], [0.28, 0.80]], [[0.48, 0.45], [0.72, 0.80]]] },
      { id: 'r-kuchi', char: '口', romaji: 'kuchi / kou', meaning: 'Mouth / Port', mnemonic: 'A square communication aperture or intake valve.', system: 'ATMOSPHERIC INTAKE PORT', termination: 'Tome (Stop)', strokes: [[[0.30, 0.30], [0.30, 0.72]], [[0.30, 0.30], [0.70, 0.30], [0.70, 0.72]], [[0.30, 0.72], [0.70, 0.72]]] },
      { id: 'r-ki', char: '木', romaji: 'ki / moku', meaning: 'Tree / Timber', mnemonic: 'A strong organic tree with horizontal branches and deep roots.', system: 'HYDROPONIC BIO-TIMBER CELL', termination: 'Hane (Hook)', strokes: [[[0.22, 0.40], [0.78, 0.40]], [[0.50, 0.20], [0.50, 0.82], [0.42, 0.78]], [[0.50, 0.40], [0.28, 0.78]], [[0.50, 0.40], [0.72, 0.78]]] },
      { id: 'r-mizu', char: '水', romaji: 'mizu / sui', meaning: 'Water / Coolant', mnemonic: 'A central stream of coolant flowing fast with splashes.', system: 'CRYO-COOLANT RESERVOIR', termination: 'Hane (Hook)', strokes: [[[0.50, 0.18], [0.50, 0.82], [0.40, 0.78]], [[0.25, 0.45], [0.45, 0.40], [0.32, 0.65]], [[0.72, 0.32], [0.55, 0.48]], [[0.55, 0.48], [0.78, 0.80]]] },
      { id: 'r-hi', char: '火', romaji: 'hi / ka', meaning: 'Fire / Thermal', mnemonic: 'A roaring thermal flame with sparks on either flank.', system: 'THERMONUCLEAR COMBUSTION CORE', termination: 'Harai (Sweep)', strokes: [[[0.32, 0.42], [0.38, 0.52]], [[0.68, 0.38], [0.62, 0.48]], [[0.50, 0.20], [0.32, 0.80]], [[0.48, 0.45], [0.75, 0.80]]] },
      { id: 'r-hi-sun', char: '日', romaji: 'hi / nichi', meaning: 'Sun / Day', mnemonic: 'A solar collector cell with a central photovoltaic sensor bar.', system: 'PHOTOVOLTAIC SOLAR ARRAY', termination: 'Tome (Stop)', strokes: [[[0.30, 0.22], [0.30, 0.78]], [[0.30, 0.22], [0.70, 0.22], [0.70, 0.78]], [[0.30, 0.50], [0.70, 0.50]], [[0.30, 0.78], [0.70, 0.78]]] },
      { id: 'r-tsuki', char: '月', romaji: 'tsuki / getsu', meaning: 'Moon / Month', mnemonic: 'A glowing lunar crescent with two internal satellite beams.', system: 'LUNAR GRAVITATIONAL RADAR', termination: 'Hane (Hook)', strokes: [[[0.32, 0.20], [0.30, 0.82]], [[0.32, 0.20], [0.68, 0.20], [0.68, 0.82], [0.58, 0.78]], [[0.32, 0.42], [0.68, 0.42]], [[0.32, 0.60], [0.68, 0.60]]] },
      { id: 'r-kane', char: '金', romaji: 'kane / kin', meaning: 'Gold / Metal', mnemonic: 'A mountain sheltering golden alloy nuggets under armor plates.', system: 'TITANIUM-GOLD HULL REINFORCEMENT', termination: 'Tome (Stop)', strokes: [[[0.50, 0.18], [0.28, 0.42]], [[0.50, 0.18], [0.72, 0.42]], [[0.35, 0.46], [0.65, 0.46]], [[0.50, 0.46], [0.50, 0.78]], [[0.40, 0.56], [0.35, 0.64]], [[0.60, 0.56], [0.65, 0.64]], [[0.30, 0.68], [0.70, 0.68]], [[0.22, 0.82], [0.78, 0.82]]] },
      { id: 'r-kokoro', char: '心', romaji: 'kokoro / shin', meaning: 'Heart / Neural Core', mnemonic: 'The neural heart chamber with four biological valve pulses.', system: 'NEURAL BIO-FEEDBACK CORE', termination: 'Hane (Hook)', strokes: [[[0.30, 0.45], [0.26, 0.62]], [[0.38, 0.40], [0.46, 0.75], [0.68, 0.75], [0.74, 0.55]], [[0.48, 0.48], [0.52, 0.56]], [[0.74, 0.38], [0.80, 0.46]]] }
    ]
  };


  // ==========================================================================
  // 4. RADICAL FORGE RECIPES (COMPOUND KANJI ARSENAL)
  // ==========================================================================

  const FORGE_RECIPES = [
    {
      id: 'forge-yasumu',
      ingredients: ['人', '木'],
      result: '休',
      romaji: 'Yasumu',
      meaning: 'Rest / Hull Repair Drone',
      onyomi: 'KYUU',
      kunyomi: 'yasu(mu)',
      system: 'AUTONOMOUS REPAIR DRONE // SYS-KYUU',
      lore: 'A Person (人) leaning against a Tree (木) to recover energy. Deploys autonomous repair drones to replenish shield capacitors and mend hull micro-fractures.',
      xp: 50
    },
    {
      id: 'forge-hayashi',
      ingredients: ['木', '木'],
      result: '林',
      romaji: 'Hayashi',
      meaning: 'Woods / Bio-Oxygen Scrubber',
      onyomi: 'RIN',
      kunyomi: 'hayashi',
      system: 'PHOTOSYNTHETIC OXYGEN SCRUBBER // SYS-RIN',
      lore: 'Two Trees (木 + 木) form an impenetrable cybernetic forest. Filters toxic cockpit air and guarantees breathable atmosphere across deep space voyages.',
      xp: 50
    },
    {
      id: 'forge-akarui',
      ingredients: ['日', '月'],
      result: '明',
      romaji: 'Akarui / Mei',
      meaning: 'Bright / Nova Flare Array',
      onyomi: 'MEI, MYOU',
      kunyomi: 'aka(rui)',
      system: 'NOVA FLARE BEAM CANNON // SYS-MEI',
      lore: 'The Sun (日) and Moon (月) united into cosmic radiance. Blinds incoming hostiles with an intense burst of solar-lunar high-intensity illumination.',
      xp: 50
    },
    {
      id: 'forge-honoo',
      ingredients: ['火', '火'],
      result: '炎',
      romaji: 'Honoo / En',
      meaning: 'Flame / Dual Plasma Afterburner',
      onyomi: 'EN',
      kunyomi: 'honoo',
      system: 'DUAL THERMAL AFTERBURNER // SYS-EN',
      lore: 'Stacking Fire upon Fire (火 + 火) generates an unstoppable thermal reaction, pushing the ship past sub-space velocity limits.',
      xp: 50
    },
    {
      id: 'forge-jinkou',
      ingredients: ['人', '口'],
      result: '人口',
      romaji: 'Jinkou',
      meaning: 'Population / Colony Sensor Grid',
      onyomi: 'JINKOU',
      kunyomi: 'hito kuchi',
      system: 'COLONY LIFE-SIGN SENSOR ARRAY // SYS-KOU',
      lore: 'Person (人) plus Mouth (口) represents human census counting. Scans planetary sectors to pinpoint surviving human colonies and distress beacons.',
      xp: 50
    },
    {
      id: 'forge-moku',
      ingredients: ['水', '木'],
      result: '沐',
      romaji: 'Moku',
      meaning: 'Cleanse / Cryo-Coolant Flush',
      onyomi: 'MOKU',
      kunyomi: 'susu(gu)',
      system: 'HYDRAULIC CRYO-FLUSH CONDUIT // SYS-MOKU',
      lore: 'Water (水) washing over Timber (木) purifies organic conduits. Instantly purges overheated weapons systems and clears radiation debris.',
      xp: 50
    },
    {
      id: 'forge-ren',
      ingredients: ['金', '火'],
      result: '錬',
      romaji: 'Ren',
      meaning: 'Tempered Metal / Railgun Forging Core',
      onyomi: 'REN',
      kunyomi: 'ne(ru)',
      system: 'MAGNETIC RAILGUN FORGE // SYS-REN',
      lore: 'Applying intense Fire (火) to Gold and Metal (金) tempers unyielding alloy armor plates and manufactures hyper-velocity railgun ammunition.',
      xp: 50
    },
    {
      id: 'forge-higashi',
      ingredients: ['日', '木'],
      result: '東',
      romaji: 'Higashi / Tou',
      meaning: 'East / Neo-Tokyo Warp Drive',
      onyomi: 'TOU',
      kunyomi: 'higashi',
      system: 'NEO-TOKYO ORIENT WARP ENGINE // SYS-TOU',
      lore: 'The Sun (日) rising behind a Tree (木) indicates East—the coordinates of Neo-Tokyo. Spools up the primary hyper-spatial warp core.',
      xp: 60
    }
  ];


  // ==========================================================================
  // 5. GLOBAL EXPORT & INITIALIZATION
  // ==========================================================================

  window.PlayerState = PlayerState;
  window.ROADMAP_SECTORS = ROADMAP_SECTORS;
  window.KIHON_DATA = KIHON_DATA;
  window.FORGE_RECIPES = FORGE_RECIPES;

  PlayerState.init();
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        PlayerState.init();
      });
    } else {
      PlayerState.updateHUD();
    }
  }

  console.log('[Project Kihon] data.js loaded: All 46 Hiragana & 46 Katakana characters registered.');

})();
