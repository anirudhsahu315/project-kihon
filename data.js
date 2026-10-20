/**
 * ============================================================================
 * PROJECT KIHON: NEO-TOKYO ODYSSEY
 * Single Source of Truth (SSOT) Game & Curriculum Database
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
          this.lastLoginDate = parsed.lastLoginDate || new Date().toISOString().split('T')[0];

          // Daily streak calculator
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
          this.streak = 1; // streak reset
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
        if (typeof window.showNotification === 'function') {
          window.showNotification(`PROMOTION GRANTED: ${newRank}!`, 'success');
        }
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
        this.addXP(25); // Mastery bonus
        this.save();
        this.updateHUD();
      }
    },

    isMastered: function (id) {
      return this.masteredIds.has(id);
    },

    /**
     * Record a forged compound kanji
     */
    addForgedKanji: function (kanji) {
      if (!kanji) return false;
      const isNew = !this.forgedKanji.has(kanji);
      if (isNew) {
        this.forgedKanji.add(kanji);
        this.addXP(50); // Forge fusion bonus
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

      if (rankEl) {
        rankEl.textContent = currentRank;
      }
      if (xpEl) {
        xpEl.textContent = this.xp.toLocaleString();
      }
      if (mobileXpEl) {
        mobileXpEl.textContent = this.xp.toLocaleString();
      }
      if (masteredEl) {
        masteredEl.textContent = `${this.masteredIds.size}/30`;
      }
      if (streakEl) {
        streakEl.textContent = this.streak.toString();
      }
      if (forgeCountEl) {
        forgeCountEl.textContent = `${this.forgedKanji.size} / ${window.FORGE_RECIPES ? window.FORGE_RECIPES.length : 8} FORGED`;
      }
    },

    /**
     * Native Japanese Speech Synthesis Audio Trigger
     * Rate: 0.85 for clear educational speech cadence
     */
    playAudio: function (text) {
      if (!text) return;
      if (!('speechSynthesis' in window)) {
        console.warn('[Audio] SpeechSynthesis API not supported in this browser environment.');
        return;
      }

      window.speechSynthesis.cancel(); // Stop overlapping audio

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.85;
      utterance.pitch = 1.0;

      // Select Japanese voice if available
      const voices = window.speechSynthesis.getVoices();
      const jaVoice = voices.find(v => v.lang.startsWith('ja') || v.lang.includes('JP'));
      if (jaVoice) {
        utterance.voice = jaVoice;
      }

      window.speechSynthesis.speak(utterance);
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
  // 3. KIHON DATABASE: KANA, RADICALS & NORMALIZED STROKE ORDER VECTORS
  // Strokes are arrays of [x, y] coordinates normalized between 0.1 and 0.9.
  // Traditional Hitsujun rules: Top->Bottom, Left->Right, Horizontal->Vertical.
  // ==========================================================================

  const KIHON_DATA = {
    
    // ------------------------------------------------------------------------
    // HIRAGANA (10 Essential Kana)
    // ------------------------------------------------------------------------
    hiragana: [
      {
        id: 'h-a',
        char: 'あ',
        romaji: 'a',
        mnemonic: 'An Apple with an Antenna curving down through it, forming the big stylized letter "A".',
        system: 'PRIMARY ION DRIVE STABILIZER // BUS 01',
        termination: 'Harai (Sweep)',
        strokes: [
          // Stroke 1: Top horizontal bar (left to right)
          [[0.25, 0.35], [0.75, 0.35]],
          // Stroke 2: Vertical crossing line down
          [[0.50, 0.18], [0.48, 0.82]],
          // Stroke 3: Swirling ribbon loop sweeping around
          [[0.65, 0.45], [0.35, 0.70], [0.25, 0.55], [0.55, 0.48], [0.75, 0.65], [0.65, 0.82]]
        ]
      },
      {
        id: 'h-i',
        char: 'い',
        romaji: 'i',
        mnemonic: 'Two vibrant neon Ion needles pointing down side-by-side, with the left needle hooking up.',
        system: 'DUAL ION INJECTION NEEDLES',
        termination: 'Hane (Flick)',
        strokes: [
          // Stroke 1: Left downward line with hook upward
          [[0.32, 0.25], [0.30, 0.65], [0.38, 0.72]],
          // Stroke 2: Right shorter downward stop
          [[0.68, 0.35], [0.70, 0.60]]
        ]
      },
      {
        id: 'h-u',
        char: 'う',
        romaji: 'u',
        mnemonic: 'A heavy metal cyber U-bolt with a radar dot above it.',
        system: 'GRAVITATIONAL U-VALVE REGULATOR',
        termination: 'Tome (Stop)',
        strokes: [
          // Stroke 1: Top accent line
          [[0.48, 0.22], [0.58, 0.28]],
          // Stroke 2: Curved crescent sweeping down
          [[0.38, 0.40], [0.65, 0.45], [0.55, 0.75], [0.40, 0.82]]
        ]
      },
      {
        id: 'h-e',
        char: 'え',
        romaji: 'e',
        mnemonic: 'An Energetic android doing cyber-aerobics, swooshing across the deck.',
        system: 'ENERGY CONVERSION COIL',
        termination: 'Tome (Stop)',
        strokes: [
          // Stroke 1: Top accent dot
          [[0.46, 0.22], [0.54, 0.28]],
          // Stroke 2: Z-zigzag then wave to the right
          [[0.35, 0.45], [0.65, 0.45], [0.40, 0.68], [0.65, 0.68], [0.75, 0.78]]
        ]
      },
      {
        id: 'h-o',
        char: 'お',
        romaji: 'o',
        mnemonic: 'An Orbital circular ring with an asteroid dot orbiting overhead.',
        system: 'ORBITAL MASS ACCELERATOR',
        termination: 'Harai (Sweep)',
        strokes: [
          // Stroke 1: Horizontal bar
          [[0.25, 0.35], [0.65, 0.35]],
          // Stroke 2: Vertical into circular orbital loop
          [[0.45, 0.20], [0.45, 0.75], [0.30, 0.75], [0.40, 0.55], [0.70, 0.60], [0.65, 0.80]],
          // Stroke 3: Top-right asteroid dot
          [[0.72, 0.30], [0.78, 0.38]]
        ]
      },
      {
        id: 'h-ka',
        char: 'か',
        romaji: 'ka',
        mnemonic: 'A sharp Kinetic blade slashing open a crate, with a laser spark flying out.',
        system: 'KINETIC LASER HARPOON',
        termination: 'Hane (Flick)',
        strokes: [
          // Stroke 1: Main hook arm
          [[0.30, 0.35], [0.55, 0.35], [0.50, 0.75], [0.42, 0.72]],
          // Stroke 2: Downward curved counter-slash
          [[0.42, 0.25], [0.32, 0.75]],
          // Stroke 3: Upper-right laser spark dot
          [[0.68, 0.32], [0.75, 0.40]]
        ]
      },
      {
        id: 'h-ki',
        char: 'き',
        romaji: 'ki',
        mnemonic: 'A glowing Key card with two data rails and a locking diagonal spine.',
        system: 'CIPHER ENCRYPTION KEY BUS',
        termination: 'Harai (Sweep)',
        strokes: [
          // Stroke 1: Upper horizontal rail
          [[0.32, 0.32], [0.68, 0.32]],
          // Stroke 2: Lower horizontal rail
          [[0.30, 0.46], [0.70, 0.46]],
          // Stroke 3: Center diagonal spine cutting down
          [[0.58, 0.20], [0.42, 0.70]],
          // Stroke 4: Bottom detached arc
          [[0.35, 0.70], [0.55, 0.80]]
        ]
      },
      {
        id: 'h-sa',
        char: 'さ',
        romaji: 'sa',
        mnemonic: 'A tactical Satellite dish scanning the cosmos with a curved parabolic arc.',
        system: 'LONG-RANGE SATELLITE ARRAY',
        termination: 'Harai (Sweep)',
        strokes: [
          // Stroke 1: Horizontal transmitter bar
          [[0.30, 0.35], [0.70, 0.35]],
          // Stroke 2: Diagonal antenna arm
          [[0.58, 0.20], [0.42, 0.65]],
          // Stroke 3: Bottom curved reflector
          [[0.35, 0.65], [0.55, 0.78]]
        ]
      },
      {
        id: 'h-shi',
        char: 'し',
        romaji: 'shi',
        mnemonic: 'A single deep-sea Fishing hook snagging a submarine in the Tokyo bay trench.',
        system: 'DEEP-SUBMERGENCE GRAPPLING HOOK',
        termination: 'Harai (Sweep)',
        strokes: [
          // Stroke 1: Single sweep down and curve up
          [[0.45, 0.22], [0.45, 0.70], [0.55, 0.80], [0.70, 0.70]]
        ]
      },
      {
        id: 'h-tsu',
        char: 'つ',
        romaji: 'tsu',
        mnemonic: 'A gigantic Tsunami tidal wave cresting over the Neo-Tokyo seawall.',
        system: 'HYDRO-DYNAMIC TSUNAMI CANNON',
        termination: 'Harai (Sweep)',
        strokes: [
          // Stroke 1: Horizontal start then great curved tidal wave
          [[0.30, 0.35], [0.70, 0.35], [0.65, 0.65], [0.40, 0.78]]
        ]
      }
    ],

    // ------------------------------------------------------------------------
    // KATAKANA (10 Kana featuring Core + Crucial Lookalikes シ, ツ, ソ, ン)
    // ------------------------------------------------------------------------
    katakana: [
      {
        id: 'k-a',
        char: 'ア',
        romaji: 'a',
        mnemonic: 'A futuristic Axe blade chopping straight through an armored conduit.',
        system: 'ARMOR-PIERCING TACTICAL CUTTER',
        termination: 'Harai (Sweep)',
        strokes: [
          // Stroke 1: Top horizontal and left fold
          [[0.30, 0.30], [0.70, 0.30], [0.50, 0.50]],
          // Stroke 2: Long curved downward blade
          [[0.60, 0.35], [0.40, 0.80]]
        ]
      },
      {
        id: 'k-i',
        char: 'イ',
        romaji: 'i',
        mnemonic: 'An Iron easel standing rigid in the flight command hangar.',
        system: 'INTERNAL FLIGHT BRACE',
        termination: 'Tome (Stop)',
        strokes: [
          // Stroke 1: Diagonal leg
          [[0.45, 0.25], [0.30, 0.65]],
          // Stroke 2: Vertical strut
          [[0.45, 0.45], [0.45, 0.85]]
        ]
      },
      {
        id: 'k-u',
        char: 'ウ',
        romaji: 'u',
        mnemonic: 'An Ultra antenna on top of an armored combat helmet.',
        system: 'ULTRA-BAND COMM HELMET',
        termination: 'Tome (Stop)',
        strokes: [
          // Stroke 1: Top vertical antenna spike
          [[0.50, 0.20], [0.50, 0.32]],
          // Stroke 2: Left helmet rim
          [[0.32, 0.40], [0.32, 0.55]],
          // Stroke 3: Top visor and curved sweep
          [[0.32, 0.42], [0.68, 0.42], [0.50, 0.82]]
        ]
      },
      {
        id: 'k-e',
        char: 'エ',
        romaji: 'e',
        mnemonic: 'An Elevator girder or I-beam supporting the skyscraper deck.',
        system: 'EXO-STRUCTURAL I-BEAM',
        termination: 'Tome (Stop)',
        strokes: [
          // Stroke 1: Top horizontal rail
          [[0.30, 0.30], [0.70, 0.30]],
          // Stroke 2: Center vertical shaft
          [[0.50, 0.30], [0.50, 0.70]],
          // Stroke 3: Bottom wide base rail
          [[0.22, 0.70], [0.78, 0.70]]
        ]
      },
      {
        id: 'k-o',
        char: 'オ',
        romaji: 'o',
        mnemonic: 'An Opera singer in an exo-suit with an outstretched hand.',
        system: 'OMNI-DIRECTIONAL ACOUSTIC EMITTER',
        termination: 'Harai (Sweep)',
        strokes: [
          // Stroke 1: Horizontal rail
          [[0.25, 0.35], [0.75, 0.35]],
          // Stroke 2: Vertical line with hook
          [[0.50, 0.20], [0.50, 0.80], [0.42, 0.75]],
          // Stroke 3: Diagonal left brace
          [[0.50, 0.40], [0.28, 0.75]]
        ]
      },
      {
        id: 'k-ka',
        char: 'カ',
        romaji: 'ka',
        mnemonic: 'A Katana sword striking diagonally across a reinforced steel shield.',
        system: 'KATANA PLASMATIC EDGE',
        termination: 'Harai (Sweep)',
        strokes: [
          // Stroke 1: Horizontal and down hook
          [[0.30, 0.35], [0.68, 0.35], [0.62, 0.75], [0.52, 0.72]],
          // Stroke 2: Long diagonal slash cutting down-left
          [[0.50, 0.22], [0.30, 0.80]]
        ]
      },

      // CRITICAL LOOKALIKE PAIR 1: シ (Shi - UPWARD) vs ツ (Tsu - DOWNWARD)
      {
        id: 'k-shi',
        char: 'シ',
        romaji: 'shi',
        mnemonic: 'CRITICAL LOOKALIKE: "SHI has eyes looking UP!" Two horizontal eyelashes on the left, then the third stroke swooshes UPWARDS from the bottom floor towards the sky!',
        system: 'SHIELD VECTOR EMITTER (UP-SWEEP)',
        termination: 'Harai (Sweep)',
        strokes: [
          // Stroke 1: Top horizontal-ish dot
          [[0.35, 0.32], [0.45, 0.36]],
          // Stroke 2: Lower horizontal-ish dot
          [[0.30, 0.52], [0.40, 0.56]],
          // Stroke 3: Sweeps UPWARD from bottom-left to top-right
          [[0.25, 0.78], [0.50, 0.55], [0.75, 0.28]]
        ]
      },
      {
        id: 'k-tsu',
        char: 'ツ',
        romaji: 'tsu',
        mnemonic: 'CRITICAL LOOKALIKE: "TSU has water falling DOWN!" Two vertical raindrops standing up, then the long third stroke plunges DOWNWARDS from the top right like a crashing meteor!',
        system: 'TSUNAMI IMPACT DRILL (DOWN-SWEEP)',
        termination: 'Harai (Sweep)',
        strokes: [
          // Stroke 1: Left downward dot
          [[0.34, 0.24], [0.38, 0.38]],
          // Stroke 2: Middle downward dot
          [[0.54, 0.28], [0.58, 0.42]],
          // Stroke 3: Plunges DOWNWARD from top-right to bottom-left
          [[0.75, 0.24], [0.55, 0.58], [0.32, 0.82]]
        ]
      },

      // CRITICAL LOOKALIKE PAIR 2: ソ (So - DOWNWARD) vs ン (N - UPWARD)
      {
        id: 'k-so',
        char: 'ソ',
        romaji: 'so',
        mnemonic: 'CRITICAL LOOKALIKE: "SO needles down." One vertical dart, then the second slash drives firmly DOWNWARDS from top right.',
        system: 'SOLAR RADIATION DART (DOWN-SLASH)',
        termination: 'Harai (Sweep)',
        strokes: [
          // Stroke 1: Top vertical-ish dart
          [[0.38, 0.28], [0.45, 0.42]],
          // Stroke 2: Drives DOWNWARDS from top-right to bottom-left
          [[0.72, 0.26], [0.34, 0.80]]
        ]
      },
      {
        id: 'k-n',
        char: 'ン',
        romaji: 'n',
        mnemonic: 'CRITICAL LOOKALIKE: "N shoots up to the stars!" One low horizontal spark, then the long stroke rockets UPWARDS from the bottom-left like a missile launch.',
        system: 'NEO-THRUSTER BOOST (UP-SLASH)',
        termination: 'Harai (Sweep)',
        strokes: [
          // Stroke 1: Low horizontal dot
          [[0.32, 0.50], [0.44, 0.54]],
          // Stroke 2: Rockets UPWARDS from bottom-left to top-right
          [[0.28, 0.78], [0.50, 0.55], [0.74, 0.30]]
        ]
      }
    ],

    // ------------------------------------------------------------------------
    // RADICALS (10 Foundational Semantic Kanji Building Blocks)
    // ------------------------------------------------------------------------
    radicals: [
      {
        id: 'r-ichi',
        char: '一',
        romaji: 'ichi',
        meaning: 'One / Ground Line',
        mnemonic: 'The singular foundation line of the cosmos; the horizon plane of Neo-Tokyo.',
        system: 'HORIZON CALIBRATION GYRO',
        termination: 'Tome (Stop)',
        strokes: [
          // Stroke 1: Single crisp horizontal bar
          [[0.20, 0.50], [0.80, 0.50]]
        ]
      },
      {
        id: 'r-hito',
        char: '人',
        romaji: 'hito / nin',
        meaning: 'Person / Cyber-Crew',
        mnemonic: 'A human crewmember walking forward on two legs with determination.',
        system: 'CREW LIFE-SUPPORT LIFE-SIGN MATRIX',
        termination: 'Harai (Sweep)',
        strokes: [
          // Stroke 1: Left downward sweep
          [[0.50, 0.20], [0.28, 0.80]],
          // Stroke 2: Right leaning supportive leg
          [[0.48, 0.45], [0.72, 0.80]]
        ]
      },
      {
        id: 'r-kuchi',
        char: '口',
        romaji: 'kuchi / kou',
        meaning: 'Mouth / Air Intake Port',
        mnemonic: 'A square communication aperture or main atmospheric air intake valve.',
        system: 'ATMOSPHERIC INTAKE PORT',
        termination: 'Tome (Stop)',
        strokes: [
          // Stroke 1: Left vertical edge
          [[0.30, 0.30], [0.30, 0.72]],
          // Stroke 2: Top edge across and down right
          [[0.30, 0.30], [0.70, 0.30], [0.70, 0.72]],
          // Stroke 3: Bottom closing seal
          [[0.30, 0.72], [0.70, 0.72]]
        ]
      },
      {
        id: 'r-ki',
        char: '木',
        romaji: 'ki / moku',
        meaning: 'Tree / Bio-Timber',
        mnemonic: 'A strong organic tree with horizontal branches, deep roots, and a tall trunk.',
        system: 'HYDROPONIC BIO-TIMBER CELL',
        termination: 'Hane (Flick)',
        strokes: [
          // Stroke 1: Horizontal branch
          [[0.22, 0.40], [0.78, 0.40]],
          // Stroke 2: Center trunk with hook
          [[0.50, 0.20], [0.50, 0.82], [0.42, 0.78]],
          // Stroke 3: Left diagonal root sweep
          [[0.50, 0.40], [0.28, 0.78]],
          // Stroke 4: Right diagonal root stop
          [[0.50, 0.40], [0.72, 0.78]]
        ]
      },
      {
        id: 'r-mizu',
        char: '水',
        romaji: 'mizu / sui',
        meaning: 'Water / Coolant',
        mnemonic: 'A central stream of coolant flowing fast with splashes on both sides.',
        system: 'CRYO-COOLANT HYDRAULIC RESERVOIR',
        termination: 'Hane (Flick)',
        strokes: [
          // Stroke 1: Central vertical hook
          [[0.50, 0.18], [0.50, 0.82], [0.40, 0.78]],
          // Stroke 2: Left sweeping wave
          [[0.25, 0.45], [0.45, 0.40], [0.32, 0.65]],
          // Stroke 3: Right top splash
          [[0.72, 0.32], [0.55, 0.48]],
          // Stroke 4: Right downward sweep
          [[0.55, 0.48], [0.78, 0.80]]
        ]
      },
      {
        id: 'r-hi',
        char: '火',
        romaji: 'hi / ka',
        meaning: 'Fire / Thermal Core',
        mnemonic: 'A roaring thermal flame with embers sparking on either flank of the combustion core.',
        system: 'THERMONUCLEAR COMBUSTION CORE',
        termination: 'Harai (Sweep)',
        strokes: [
          // Stroke 1: Left spark dot
          [[0.32, 0.42], [0.38, 0.52]],
          // Stroke 2: Right ember dot
          [[0.68, 0.38], [0.62, 0.48]],
          // Stroke 3: Central leftward fire sweep
          [[0.50, 0.20], [0.32, 0.80]],
          // Stroke 4: Central rightward fire flare
          [[0.48, 0.45], [0.75, 0.80]]
        ]
      },
      {
        id: 'r-hi-sun',
        char: '日',
        romaji: 'hi / nichi',
        meaning: 'Sun / Solar Ray',
        mnemonic: 'A high-yield solar collector cell with a central photovoltaic sensor bar.',
        system: 'PHOTOVOLTAIC SOLAR ARRAY',
        termination: 'Tome (Stop)',
        strokes: [
          // Stroke 1: Left vertical casing
          [[0.30, 0.22], [0.30, 0.78]],
          // Stroke 2: Top casing and right vertical descent
          [[0.30, 0.22], [0.70, 0.22], [0.70, 0.78]],
          // Stroke 3: Middle sensor beam
          [[0.30, 0.50], [0.70, 0.50]],
          // Stroke 4: Bottom seal
          [[0.30, 0.78], [0.70, 0.78]]
        ]
      },
      {
        id: 'r-tsuki',
        char: '月',
        romaji: 'tsuki / getsu',
        meaning: 'Moon / Satellite',
        mnemonic: 'A glowing lunar crescent with two internal satellite telemetry beams.',
        system: 'LUNAR GRAVITATIONAL RADAR',
        termination: 'Hane (Flick)',
        strokes: [
          // Stroke 1: Left curved boundary
          [[0.32, 0.20], [0.30, 0.82]],
          // Stroke 2: Top and long right flank with hook
          [[0.32, 0.20], [0.68, 0.20], [0.68, 0.82], [0.58, 0.78]],
          // Stroke 3: Upper internal bridge
          [[0.32, 0.42], [0.68, 0.42]],
          // Stroke 4: Lower internal bridge
          [[0.32, 0.60], [0.68, 0.60]]
        ]
      },
      {
        id: 'r-kane',
        char: '金',
        romaji: 'kane / kin',
        meaning: 'Gold / Metal',
        mnemonic: 'A mountain sheltering golden alloy nuggets under hardened metallic armor plates.',
        system: 'TITANIUM-GOLD HULL REINFORCEMENT',
        termination: 'Tome (Stop)',
        strokes: [
          // Stroke 1: Roof left sweep
          [[0.50, 0.18], [0.28, 0.42]],
          // Stroke 2: Roof right sweep
          [[0.50, 0.18], [0.72, 0.42]],
          // Stroke 3: First horizontal bar
          [[0.35, 0.46], [0.65, 0.46]],
          // Stroke 4: Center vertical spine
          [[0.50, 0.46], [0.50, 0.78]],
          // Stroke 5: Left interior nugget
          [[0.40, 0.56], [0.35, 0.64]],
          // Stroke 6: Right interior nugget
          [[0.60, 0.56], [0.65, 0.64]],
          // Stroke 7: Middle horizontal
          [[0.30, 0.68], [0.70, 0.68]],
          // Stroke 8: Bottom wide foundation bar
          [[0.22, 0.82], [0.78, 0.82]]
        ]
      },
      {
        id: 'r-kokoro',
        char: '心',
        romaji: 'kokoro / shin',
        meaning: 'Heart / Neural Core',
        mnemonic: 'The neural heart chamber with four biological valve pulses firing in synchrony.',
        system: 'NEURAL BIO-FEEDBACK CORE',
        termination: 'Hane (Flick)',
        strokes: [
          // Stroke 1: Left ventricle dot
          [[0.30, 0.45], [0.26, 0.62]],
          // Stroke 2: Main curved basin hook
          [[0.38, 0.40], [0.46, 0.75], [0.68, 0.75], [0.74, 0.55]],
          // Stroke 3: Central pulse dot
          [[0.48, 0.48], [0.52, 0.56]],
          // Stroke 4: Upper-right auricle dot
          [[0.74, 0.38], [0.80, 0.46]]
        ]
      }
    ]
  };


  // ==========================================================================
  // 4. RADICAL FORGE RECIPES (COMPOUND KANJI ARSENAL)
  // At least 8 high-leverage JWA combinations with deep lore & subsystem specs
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
    },
    {
      id: 'forge-mori',
      ingredients: ['林', '木'],
      result: '森',
      romaji: 'Mori / Shin',
      meaning: 'Dense Forest / Bio-Shield Dome',
      onyomi: 'SHIN',
      kunyomi: 'mori',
      system: 'INTERSTELLAR BIO-DOME SHIELD // SYS-SHIN',
      lore: 'Three trees intertwine to form a thick protective forest canopy, capable of absorbing physical asteroid impacts.',
      xp: 75
    }
  ];


  // ==========================================================================
  // 5. GLOBAL EXPORT & INITIALIZATION
  // ==========================================================================

  // Attach to window object for access across bootcamp.js, forge.js, shooter.js, kaiwa.js
  window.PlayerState = PlayerState;
  window.ROADMAP_SECTORS = ROADMAP_SECTORS;
  window.KIHON_DATA = KIHON_DATA;
  window.FORGE_RECIPES = FORGE_RECIPES;

  // Initialize player state immediately and on DOMContentLoaded
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

  console.log('[Project Kihon] data.js loaded successfully. Telemetry and JWA Database active.');

})();
