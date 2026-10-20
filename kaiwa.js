/**
 * ============================================================================
 * PROJECT KIHON: NEO-TOKYO ODYSSEY
 * Module 05: Kaiwa Comms & SOV Particle Thruster Terminal
 * - Part 1: SOV Particle Thruster Puzzle & Grammatical Clamp Engine
 * - Part 2: Progressive JWA Boss Scenarios (Jikoshoukai to N3 Keigo)
 * - Part 3: Live Speech Recognition (webkitSpeechRecognition) & Fallback
 * - Part 4: Real-time Oscilloscope Waveform Visualizer Canvas
 * ============================================================================
 */

(function () {
  'use strict';

  // ==========================================================================
  // 1. COMM SYNTHESIZER SFX ENGINE (WEB AUDIO API)
  // ==========================================================================

  const KaiwaAudio = {
    ctx: null,

    init: function () {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        const AudioClass = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioClass();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    },

    // Radio squelch / comm link open beep
    playCommOpen: function () {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(1320, now + 0.05);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      } catch (e) {
        console.warn('[KaiwaAudio] Comm open error:', e);
      }
    },

    // Sub-space thruster ignition rumble
    playThrusterIgnite: function () {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(65, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.4);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);

        // High frequency chime on top
        const chime = this.ctx.createOscillator();
        const cGain = this.ctx.createGain();
        chime.type = 'sine';
        chime.frequency.setValueAtTime(659.25, now + 0.1);
        chime.frequency.exponentialRampToValueAtTime(1046.50, now + 0.35);

        cGain.gain.setValueAtTime(0.18, now + 0.1);
        cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        chime.connect(cGain);
        cGain.connect(this.ctx.destination);
        chime.start(now + 0.1);
        chime.stop(now + 0.35);
      } catch (e) {
        console.warn('[KaiwaAudio] Thruster sound error:', e);
      }
    },

    // Transmission verification chime
    playVerifySuccess: function () {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const notes = [587.33, 880, 1174.66]; // D5, A5, D6
        notes.forEach((f, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const t = now + idx * 0.08;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, t);

          gain.gain.setValueAtTime(0.2, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t);
          osc.stop(t + 0.3);
        });
      } catch (e) {
        console.warn('[KaiwaAudio] Verify success error:', e);
      }
    }
  };


  // ==========================================================================
  // 2. PART 1: SOV PARTICLE THRUSTER PUZZLE (GRAMMAR ENGINE)
  // ==========================================================================

  const THRUSTER_PUZZLES = [
    {
      id: 'puzzle-1',
      title: 'Vector Navigation [N5]',
      prompt: 'Command ship to set course for Tokyo Station coordinates:',
      template: [
        { text: 'わたし', isSlot: false },
        { id: 's1', isSlot: true, correct: ['は'] },
        { text: 'とうきょう', isSlot: false },
        { id: 's2', isSlot: true, correct: ['へ', 'に'] },
        { text: 'いきます', isSlot: false }
      ],
      romaji: 'Watashi [ wa ] Toukyou [ e / ni ] ikimasu.',
      meaning: '"Speaking of me, I am going towards Tokyo."',
      explanation: '「は (wa)」establishes the Topic Beacon ("As for me..."), while「へ (e)」or「に (ni)」clamps the destination vector.'
    },
    {
      id: 'puzzle-2',
      title: 'Coolant Supply Request [N5]',
      prompt: 'Request survival water coolant at the orbital station:',
      template: [
        { text: 'みず', isSlot: false },
        { id: 's1', isSlot: true, correct: ['を'] },
        { text: 'ください', isSlot: false }
      ],
      romaji: 'Mizu [ o ] kudasai.',
      meaning: '"Please give me water."',
      explanation: '「を (o/wo)」acts as the Direct Object Target Clamp, specifying what direct physical item is being requested.'
    },
    {
      id: 'puzzle-3',
      title: 'Transport Vessel Mode [N5/N4]',
      prompt: 'Specify the means of propulsion to reach Neo-Shinjuku:',
      template: [
        { text: '宇宙船 (うちゅうせん)', isSlot: false },
        { id: 's1', isSlot: true, correct: ['で'] },
        { text: 'しんじゅく', isSlot: false },
        { id: 's2', isSlot: true, correct: ['に', 'へ'] },
        { text: 'いきます', isSlot: false }
      ],
      romaji: 'Uchuusen [ de ] Shinjuku [ ni / e ] ikimasu.',
      meaning: '"I am going to Shinjuku by spaceship."',
      explanation: '「で (de)」marks the Tool / Means of transport (by spaceship), and「に (ni)」anchors the final destination.'
    },
    {
      id: 'puzzle-4',
      title: 'Combat Engagement Debrief [N4]',
      prompt: 'Report neutralising enemy drone with railgun laser:',
      template: [
        { text: 'レーザー', isSlot: false },
        { id: 's1', isSlot: true, correct: ['で'] },
        { text: 'てき', isSlot: false },
        { id: 's2', isSlot: true, correct: ['を'] },
        { text: 'たおしました', isSlot: false }
      ],
      romaji: 'Reezaa [ de ] teki [ wo ] taoshimashita.',
      meaning: '"I defeated the enemy using the laser."',
      explanation: '「で」specifies the weapon tool used, and「を」clamps the defeated enemy drone as the direct object.'
    }
  ];

  let currentPuzzleIndex = 0;
  let activeSlotSelections = {}; // { s1: 'は', s2: 'へ' }

  /**
   * Render the SOV Thruster Console into the left column of #view-kaiwa
   */
  function renderThrusterConsole() {
    const leftCol = document.querySelector('#view-kaiwa .lg\\:col-span-5');
    if (!leftCol) return;

    const puzzle = THRUSTER_PUZZLES[currentPuzzleIndex];

    leftCol.innerHTML = `
      <div class="cyber-panel p-5 rounded-xl border-cyan-500/30 space-y-4">
        
        <div class="flex items-center justify-between pb-2 border-b border-slate-800">
          <div>
            <div class="text-[10px] font-mono text-cyan-400">PART 1 // SOV GRAMMAR ENGINE</div>
            <h3 class="font-orbitron font-bold text-sm text-white tracking-wider">
              ${puzzle.title}
            </h3>
          </div>
          <span class="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono text-[10px] border border-cyan-500/30">
            PUZZLE ${currentPuzzleIndex + 1}/${THRUSTER_PUZZLES.length}
          </span>
        </div>

        <p class="text-xs text-slate-300 font-rajdhani">
          ${puzzle.prompt}
        </p>

        <!-- Interactive Sentence Assembly Rail -->
        <div class="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-wrap items-center gap-2 justify-center font-jp text-base font-bold">
          ${puzzle.template.map(token => {
            if (!token.isSlot) {
              return `<span class="text-slate-200 px-1.5 py-1">${token.text}</span>`;
            } else {
              const val = activeSlotSelections[token.id] || '?';
              const isFilled = activeSlotSelections[token.id];
              return `
                <button 
                  id="thruster-slot-${token.id}" 
                  onclick="clearThrusterSlot('${token.id}')"
                  class="px-3 py-1 rounded-lg border-2 ${isFilled ? 'border-cyan-400 bg-cyan-950/80 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.4)]' : 'border-dashed border-amber-500/60 text-amber-400 bg-amber-950/20'} font-mono text-sm tracking-wider cursor-pointer transition-all"
                  title="Click to clear"
                >
                  ${val}
                </button>
              `;
            }
          }).join('')}
        </div>

        <!-- Available Particle Clamps Bank -->
        <div>
          <div class="text-[10px] font-mono text-slate-400 mb-1.5 flex justify-between">
            <span>AVAILABLE PARTICLE CLAMPS:</span>
            <span class="text-cyan-400">CLICK TO SLOT</span>
          </div>
          <div class="flex flex-wrap gap-2 justify-center">
            ${['は', 'が', 'を', 'に', 'で', 'へ'].map(p => `
              <button 
                onclick="slotParticleIntoThruster('${p}')"
                class="px-3.5 py-1.5 rounded-lg bg-slate-900 border border-cyan-500/40 hover:border-cyan-400 hover:bg-cyan-950/60 text-cyan-300 font-jp text-base font-bold transition-all shadow-[0_0_8px_rgba(6,182,212,0.15)] active:scale-95"
              >
                ${p}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Ignition Action Trigger -->
        <div class="pt-2">
          <button 
            id="btn-ignite-thruster" 
            onclick="igniteThrusters()"
            class="cyber-btn w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 via-cyan-500 to-emerald-500 hover:from-cyan-500 hover:to-emerald-400 text-slate-950 font-orbitron font-bold text-xs tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.35)]"
          >
            ⚡ IGNITE SOV THRUSTERS
          </button>
        </div>

        <!-- Feedback & Grammatical Explanation Box -->
        <div id="thruster-feedback" class="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-300 min-h-[50px] flex items-center justify-center text-center">
          Slot the correct magnetic particles above, then ignite the thrusters.
        </div>

        <!-- Particle Telemetry Cheat Sheet Mini-Reference -->
        <div class="border-t border-slate-800 pt-3 grid grid-cols-2 gap-2 text-[11px] font-mono">
          <div class="p-2 rounded bg-slate-900/50 border border-slate-800">
            <span class="text-cyan-400 font-bold">は (wa):</span> Topic beacon
          </div>
          <div class="p-2 rounded bg-slate-900/50 border border-slate-800">
            <span class="text-emerald-400 font-bold">が (ga):</span> Subject clamp
          </div>
          <div class="p-2 rounded bg-slate-900/50 border border-slate-800">
            <span class="text-amber-400 font-bold">を (wo):</span> Direct object
          </div>
          <div class="p-2 rounded bg-slate-900/50 border border-slate-800">
            <span class="text-purple-400 font-bold">に / へ:</span> Target vector
          </div>
        </div>

      </div>
    `;
  }

  /**
   * Slot particle into first available empty slot
   */
  window.slotParticleIntoThruster = function (particle) {
    KaiwaAudio.playCommOpen();
    const puzzle = THRUSTER_PUZZLES[currentPuzzleIndex];
    const slotTokens = puzzle.template.filter(t => t.isSlot);

    // Find first empty slot
    let targetSlot = slotTokens.find(s => !activeSlotSelections[s.id]);
    if (!targetSlot) {
      // If all full, overwrite first slot
      targetSlot = slotTokens[0];
    }

    if (targetSlot) {
      activeSlotSelections[targetSlot.id] = particle;
      renderThrusterConsole();
    }
  };

  window.clearThrusterSlot = function (slotId) {
    delete activeSlotSelections[slotId];
    renderThrusterConsole();
  };

  /**
   * Validate and Ignite SOV Thrusters
   */
  window.igniteThrusters = function () {
    const puzzle = THRUSTER_PUZZLES[currentPuzzleIndex];
    const slotTokens = puzzle.template.filter(t => t.isSlot);

    // Check all slots filled
    const allFilled = slotTokens.every(s => activeSlotSelections[s.id]);
    if (!allFilled) {
      const fb = document.getElementById('thruster-feedback');
      if (fb) {
        fb.innerHTML = `<span class="text-amber-400 font-bold">⚠ All [ ? ] slots must be locked with particles before ignition.</span>`;
      }
      return;
    }

    // Check correctness
    const isCorrect = slotTokens.every(s => {
      const chosen = activeSlotSelections[s.id];
      return s.correct.includes(chosen);
    });

    const fb = document.getElementById('thruster-feedback');

    if (isCorrect) {
      KaiwaAudio.playThrusterIgnite();

      if (window.PlayerState) {
        window.PlayerState.addXP(30);
      }

      if (fb) {
        fb.innerHTML = `
          <div class="space-y-1 text-left w-full">
            <div class="text-emerald-400 font-bold flex items-center justify-between">
              <span>THRUSTERS IGNITED! (+30 XP)</span>
              <span>SYNTAX VERIFIED ✓</span>
            </div>
            <div class="text-[11px] font-rajdhani text-slate-200">
              ${puzzle.explanation}
            </div>
            <div class="pt-1 flex justify-end">
              <button onclick="advanceThrusterPuzzle()" class="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded text-[10px] font-orbitron">
                NEXT SOV PUZZLE →
              </button>
            </div>
          </div>
        `;
      }
    } else {
      KaiwaAudio.playCommOpen();
      if (fb) {
        fb.innerHTML = `
          <div class="text-red-400 font-bold text-center w-full">
            <span>⚡ POLARITY MISMATCH: Particle clamp rejected.</span>
            <div class="text-[11px] text-slate-400 mt-1">
              Hint: In SOV Japanese, the topic takes 「は」, objects receive 「を」, and destinations take 「へ/に」.
            </div>
          </div>
        `;
      }
    }
  };

  window.advanceThrusterPuzzle = function () {
    activeSlotSelections = {};
    currentPuzzleIndex = (currentPuzzleIndex + 1) % THRUSTER_PUZZLES.length;
    renderThrusterConsole();
  };


  // ==========================================================================
  // 3. PART 2: LIVE MICROPHONE KAIWA SHADOWING (WEB SPEECH API)
  // ==========================================================================

  const SCENARIOS = {
    akihabara: {
      id: 'akihabara',
      title: '01. Jikoshoukai & Survival [Pre-N5 / N5]',
      speaker: 'COMM OFFICER REN',
      japanese: 'はじめまして、わたしは訓練兵です。よろしくお願いします。',
      romaji: 'Hajimemashite, watashi wa kunren-hei desu. Yoroshiku onegaishimasu.',
      english: '"Nice to meet you, I am a Cadet. Please treat me favorably."',
      targetText: 'はじめましてわたしは訓練兵ですよろしくおねがいします'
    },
    shinjuku: {
      id: 'shinjuku',
      title: '02. Sector 1 Outpost Survival Request [N5]',
      speaker: 'DOCK CHIEF KAITO',
      japanese: 'すみません、みずをください。',
      romaji: 'Sumimasen, mizu o kudasai.',
      english: '"Excuse me, please give me water."',
      targetText: 'すみませんみずをください'
    },
    shibuya: {
      id: 'shibuya',
      title: '03. Neo-Shibuya N4 Conditional Flight [N4]',
      speaker: 'PILOT AI AURA',
      japanese: 'じかんがあったら、にほんへいきたいです。',
      romaji: 'Jikan ga attara, nihon e ikitai desu.',
      english: '"If I have time, I want to go to Japan."',
      targetText: 'じかんがあったらにほんへいきたいです'
    },
    kyoto: {
      id: 'kyoto',
      title: '04. Zaibatsu Spire N3 Keigo Interview [N3]',
      speaker: 'EXECUTIVE DIRECTOR KOBAYASHI',
      japanese: 'おいそがしいところありがとうございます。',
      romaji: 'O-isogashii tokoro arigatou gozaimasu.',
      english: '"Thank you very much for your time despite your busy schedule."',
      targetText: 'おいそがしいところありがとうございます'
    }
  };

  let activeScenarioKey = 'akihabara';
  let recognitionInstance = null;
  let isRecording = false;

  /**
   * Switch Active Kaiwa Mission Scenario
   */
  window.changeKaiwaMission = function (missionKey) {
    if (!SCENARIOS[missionKey]) return;
    activeScenarioKey = missionKey;
    renderKaiwaDialogue();
    stopMicRecording();
  };

  /**
   * Render Dialogue Transmission Box
   */
  function renderKaiwaDialogue() {
    const box = document.getElementById('kaiwa-dialogue-box');
    const sc = SCENARIOS[activeScenarioKey];
    if (!box || !sc) return;

    box.innerHTML = `
      <div class="space-y-3">
        
        <div class="flex items-center justify-between pb-1.5 border-b border-slate-800">
          <div class="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>${sc.speaker} // NATIVE TRANSMISSION:</span>
          </div>
          <span class="text-[10px] font-mono text-slate-400">${sc.title}</span>
        </div>

        <!-- Target Japanese Sentence -->
        <div class="text-xl lg:text-2xl font-jp font-bold text-white tracking-wide leading-relaxed">
          ${sc.japanese}
        </div>

        <!-- Romaji Phonetics -->
        <div class="text-xs font-mono text-emerald-400 tracking-wider">
          ${sc.romaji}
        </div>

        <!-- English Translation -->
        <div class="text-xs text-slate-300 italic font-rajdhani">
          ${sc.english}
        </div>

        <!-- Transcription & Speech Recognition Live Result Readout -->
        <div id="kaiwa-live-transcript" class="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400 min-h-[38px] flex items-center justify-between">
          <span>[Awaiting voice transmission... Click "START VOICE SHADOWING" or type below]</span>
          <span id="kaiwa-accuracy-badge" class="hidden px-2 py-0.5 rounded text-[10px] font-mono font-bold"></span>
        </div>

        <!-- Fallback Typing Simulation Mode Input -->
        <div class="flex items-center gap-2 pt-1">
          <input 
            type="text" 
            id="kaiwa-sim-input" 
            placeholder="Type or simulate speech here (e.g. ${sc.japanese.slice(0, 8)}...)" 
            class="flex-1 px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs font-jp text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
          <button 
            onclick="simulateKaiwaTransmission()"
            class="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-mono border border-slate-700 transition-all whitespace-nowrap"
          >
            TRANSMIT TEXT
          </button>
        </div>

      </div>
    `;

    // Reset status readout
    const status = document.getElementById('kaiwa-status');
    if (status) {
      status.innerText = 'READY FOR SHADOWING TRANSMISSION';
      status.className = 'text-emerald-400 font-bold';
    }
  }

  /**
   * Listen to Native Commander audio stream
   */
  window.playKaiwaDialogue = function () {
    const sc = SCENARIOS[activeScenarioKey];
    if (!sc) return;

    KaiwaAudio.playCommOpen();

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(sc.japanese);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.85;

      const voices = window.speechSynthesis.getVoices();
      const jaVoice = voices.find(v => v.lang.startsWith('ja') || v.lang.includes('JP'));
      if (jaVoice) utterance.voice = jaVoice;

      window.speechSynthesis.speak(utterance);
    }

    // Trigger waveform animation
    WaveformVisualizer.pulseWaveform(2500);
  };

  /**
   * Toggle Voice Shadowing Microphone
   */
  window.toggleKaiwaShadowing = function () {
    if (isRecording) {
      stopMicRecording();
    } else {
      startMicRecording();
    }
  };

  function startMicRecording() {
    KaiwaAudio.playCommOpen();

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      alert('Web Speech API is not supported in this browser. Please use the "TRANSMIT TEXT" simulation bar below!');
      return;
    }

    try {
      recognitionInstance = new SpeechRecognitionClass();
      recognitionInstance.lang = 'ja-JP';
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = true;

      const micBtn = document.getElementById('kaiwa-mic-btn');
      const status = document.getElementById('kaiwa-status');

      recognitionInstance.onstart = function () {
        isRecording = true;
        WaveformVisualizer.startActiveWave();

        if (micBtn) {
          micBtn.className = "cyber-btn py-3 px-4 rounded-lg bg-red-950 text-red-300 border border-red-500 font-orbitron font-bold text-xs flex items-center justify-center gap-2 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]";
          micBtn.innerHTML = `<span>■ STOP TRANSMISSION</span>`;
        }
        if (status) {
          status.innerText = '🔴 MICROPHONE ACTIVE // SPEAK JAPANESE NOW...';
          status.className = 'text-red-400 font-bold animate-pulse';
        }
      };

      recognitionInstance.onresult = function (event) {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }

        const transcriptEl = document.getElementById('kaiwa-live-transcript');
        if (transcriptEl) {
          transcriptEl.innerHTML = `<span class="text-cyan-300 font-bold font-jp">${transcript}</span>`;
        }

        if (event.results[0].isFinal) {
          evaluateSpokenAccuracy(transcript);
        }
      };

      recognitionInstance.onerror = function (event) {
        console.warn('[Kaiwa] SpeechRecognition error:', event.error);
        stopMicRecording();
        const status = document.getElementById('kaiwa-status');
        if (status) {
          status.innerText = `COMM ERROR: ${event.error.toUpperCase()} • Use text transmission simulation`;
          status.className = 'text-amber-400 font-bold';
        }
      };

      recognitionInstance.onend = function () {
        stopMicRecording();
      };

      recognitionInstance.start();

    } catch (err) {
      console.error('[Kaiwa] Could not start speech recognition:', err);
      stopMicRecording();
    }
  }

  function stopMicRecording() {
    isRecording = false;
    WaveformVisualizer.stopActiveWave();

    if (recognitionInstance) {
      try { recognitionInstance.stop(); } catch (e) {}
      recognitionInstance = null;
    }

    const micBtn = document.getElementById('kaiwa-mic-btn');
    if (micBtn) {
      micBtn.className = "cyber-btn py-3 px-4 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/50 text-xs font-orbitron font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)]";
      micBtn.innerHTML = `
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clip-rule="evenodd"></path></svg>
        <span>START VOICE SHADOWING</span>
      `;
    }
  }

  /**
   * Fallback Simulation Mode
   */
  window.simulateKaiwaTransmission = function () {
    const input = document.getElementById('kaiwa-sim-input');
    const sc = SCENARIOS[activeScenarioKey];
    if (!input || !sc) return;

    let text = input.value.trim();
    if (!text) {
      // If empty, auto-populate with native target for testing
      text = sc.japanese;
      input.value = text;
    }

    const transcriptEl = document.getElementById('kaiwa-live-transcript');
    if (transcriptEl) {
      transcriptEl.innerHTML = `<span class="text-cyan-300 font-bold font-jp">${text}</span>`;
    }

    WaveformVisualizer.pulseWaveform(1200);
    evaluateSpokenAccuracy(text);
  };

  /**
   * Compare spoken transcript against target Japanese sentence
   */
  function evaluateSpokenAccuracy(spokenText) {
    const sc = SCENARIOS[activeScenarioKey];
    if (!sc) return;

    // Normalize (strip punctuation, spaces, uppercase)
    const cleanSpoken = spokenText.replace(/[、。！？\s.,!?]/g, '').toLowerCase();
    const cleanTarget = sc.targetText.replace(/[、。！？\s.,!?]/g, '').toLowerCase();

    // Approximate similarity (Levenshtein distance calculation)
    const similarity = calculateLevenshteinSimilarity(cleanSpoken, cleanTarget);
    const accuracyPercent = Math.round(similarity * 100);

    const status = document.getElementById('kaiwa-status');
    const badge = document.getElementById('kaiwa-accuracy-badge');

    if (accuracyPercent >= 75) {
      // SUCCESS!
      KaiwaAudio.playVerifySuccess();

      if (window.PlayerState) {
        window.PlayerState.addXP(40);
      }

      if (status) {
        status.innerText = `TRANSMISSION LOCKED: ${accuracyPercent}% NATIVE MATCH! (+40 XP)`;
        status.className = 'text-emerald-400 font-bold drop-shadow-[0_0_8px_#10b981]';
      }

      if (badge) {
        badge.className = "px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/50 block";
        badge.innerText = `${accuracyPercent}% NATIVE MATCH`;
      }
    } else {
      // PARTIAL / RETRY
      if (status) {
        status.innerText = `FIDELITY ${accuracyPercent}%: Retry shadowing to achieve native intonation!`;
        status.className = 'text-amber-400 font-bold';
      }

      if (badge) {
        badge.className = "px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-500/50 block";
        badge.innerText = `${accuracyPercent}% MATCH`;
      }
    }
  }

  function calculateLevenshteinSimilarity(s1, s2) {
    if (!s1 || !s2) return 0;
    if (s1 === s2) return 1.0;

    const len1 = s1.length;
    const len2 = s2.length;
    const matrix = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    const distance = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);
    return Math.max(0, 1.0 - distance / maxLen);
  }


  // ==========================================================================
  // 4. REAL-TIME OSCILLOSCOPE WAVEFORM VISUALIZER CANVAS
  // ==========================================================================

  const WaveformVisualizer = {
    canvas: null,
    ctx: null,
    isActive: false,
    animId: null,
    phase: 0,

    init: function () {
      // Find or dynamically inject the waveform canvas inside the status row
      const statusRow = document.getElementById('kaiwa-status')?.parentElement;
      if (!statusRow) return;

      let canvasEl = document.getElementById('kaiwa-waveform-canvas');
      if (!canvasEl) {
        canvasEl = document.createElement('canvas');
        canvasEl.id = 'kaiwa-waveform-canvas';
        canvasEl.width = 240;
        canvasEl.height = 36;
        canvasEl.className = "rounded border border-cyan-500/30 bg-slate-950/80 my-auto";
        statusRow.appendChild(canvasEl);
      }

      this.canvas = canvasEl;
      this.ctx = canvasEl.getContext('2d');
      this.drawIdle();
    },

    drawIdle: function () {
      if (!this.ctx || !this.canvas) return;
      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;

      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
    },

    startActiveWave: function () {
      this.isActive = true;
      const self = this;

      function renderLoop() {
        if (!self.isActive) return;
        self.drawWave();
        self.animId = requestAnimationFrame(renderLoop);
      }

      if (this.animId) cancelAnimationFrame(this.animId);
      this.animId = requestAnimationFrame(renderLoop);
    },

    stopActiveWave: function () {
      this.isActive = false;
      if (this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }
      this.drawIdle();
    },

    pulseWaveform: function (durationMs) {
      this.startActiveWave();
      setTimeout(() => this.stopActiveWave(), durationMs);
    },

    drawWave: function () {
      if (!this.ctx || !this.canvas) return;
      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;

      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.strokeStyle = '#10b981';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2;

      ctx.beginPath();
      this.phase += 0.15;

      for (let x = 0; x < w; x++) {
        const freq1 = 0.05;
        const freq2 = 0.08;
        const amp = 10 * Math.sin(x * 0.02 + this.phase);
        const y = h / 2 + Math.sin(x * freq1 + this.phase) * amp + Math.cos(x * freq2 - this.phase) * (amp * 0.5);

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.stroke();
      ctx.restore();
    }
  };


  // ==========================================================================
  // 5. INITIALIZATION & BOOTSTRAP
  // ==========================================================================

  function initKaiwaModule() {
    renderThrusterConsole();
    renderKaiwaDialogue();
    WaveformVisualizer.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initKaiwaModule);
  } else {
    initKaiwaModule();
  }

  console.log('[Project Kihon] kaiwa.js initialized successfully.');

})();
