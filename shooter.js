/**
 * ============================================================================
 * PROJECT KIHON: NEO-TOKYO ODYSSEY
 * Module 04: Sector 0 // Kana Blaster Space Defense
 * - 60FPS Parallax Starfield & Cyber-Intercepter Canvas Engine
 * - Instant Syllable Lock-on & Directed Laser Turret Blaster
 * - Lookalike Ambush (シ/ツ/ソ/ン) & SRS Nemesis Spawning
 * - Particle Explosions, Screen Shake, and Audio-Visual Reinforcement
 * ============================================================================
 */

(function () {
  'use strict';

  // ==========================================================================
  // 1. ARCADE SYNTHESIZER SFX (WEB AUDIO API)
  // ==========================================================================

  const ShooterAudio = {
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

    // High-energy laser blast sound
    playLaser: function () {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      } catch (e) {
        console.warn('[ShooterAudio] Laser sound error:', e);
      }
    },

    // Plasma explosion boom
    playExplosion: function () {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // Sub-bass thump
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.3);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);

        // White noise burst
        const bufferSize = this.ctx.sampleRate * 0.18;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, now);
        filter.frequency.exponentialRampToValueAtTime(200, now + 0.18);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.25, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noise.start(now);
      } catch (e) {
        console.warn('[ShooterAudio] Explosion sound error:', e);
      }
    },

    // Alarm breach buzzer
    playShieldAlarm: function () {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(160, now + 0.1);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      } catch (e) {
        console.warn('[ShooterAudio] Shield alarm error:', e);
      }
    }
  };


  // ==========================================================================
  // 2. KANA BLASTER ENGINE (STATE & DATA POOLS)
  // ==========================================================================

  const KanaBlaster = {
    canvas: null,
    ctx: null,
    isRunning: false,
    animationId: null,

    // Dimensions
    width: 850,
    height: 440,

    // Gameplay Attributes
    difficulty: 'aka', // 'aka' | 'lookalikes' | 'full'
    hullHP: 100,
    score: 0,
    combo: 1.0,
    consecutiveHits: 0,

    // Entities
    ship: { x: 425, y: 395, width: 44, height: 38 },
    meteors: [],
    particles: [],
    lasers: [],
    floatingTexts: [],
    stars: [],

    // Timing & Spawning
    lastSpawnTime: 0,
    spawnInterval: 2200, // ms between enemy waves
    screenShake: 0,
    lastBreachNotice: '',
    lastBreachTimer: 0,

    /**
     * Initialize Canvas and Listeners
     */
    init: function () {
      this.canvas = document.getElementById('shooter-canvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');

      this.width = this.canvas.width;
      this.height = this.canvas.height;
      this.ship.x = this.width / 2;
      this.ship.y = this.height - 42;

      this.initStarfield();
      this.setupInputListener();
      this.updateHUD();

      // Draw initial idle screen
      this.render();
    },

    /**
     * Parallax Starfield Background (3 Depth Layers)
     */
    initStarfield: function () {
      this.stars = [];
      const starCount = 85;
      for (let i = 0; i < starCount; i++) {
        this.stars.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          radius: Math.random() * 1.6 + 0.5,
          speed: Math.random() * 1.5 + 0.4,
          alpha: Math.random() * 0.7 + 0.3,
          twinkleSpeed: Math.random() * 0.04 + 0.01
        });
      }
    },

    /**
     * Input Listener for Realtime Instant Syllable Typing
     */
    setupInputListener: function () {
      const input = document.getElementById('laser-input');
      if (!input) return;

      input.addEventListener('input', (e) => {
        ShooterAudio.init();
        if (!this.isRunning) return;

        const typed = e.target.value.trim().toLowerCase();
        if (!typed) return;

        this.checkTargetMatch(typed, input);
      });

      // Prevent Form Submit on Enter
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
        }
      });
    },

    /**
     * Instant Lock-on: Matches lowest meteor on screen
     */
    checkTargetMatch: function (typedRomaji, inputEl) {
      if (!this.meteors.length) return;

      // Find all meteors matching typed romaji
      const candidates = this.meteors.filter(m => {
        return m.romaji.toLowerCase() === typedRomaji;
      });

      if (candidates.length > 0) {
        // Target the lowest candidate (closest to hull breach line)
        candidates.sort((a, b) => b.y - a.y);
        const target = candidates[0];

        // Fire Laser!
        this.destroyMeteor(target);

        // Clear input immediately for rapid successive typing
        inputEl.value = '';
      }
    },

    /**
     * Destroy Meteor, Trigger Laser Beam, Particle Burst, Audio & XP
     */
    destroyMeteor: function (target) {
      // 1. Spawn Laser Beam
      this.lasers.push({
        startX: this.ship.x,
        startY: this.ship.y - 12,
        targetX: target.x,
        targetY: target.y,
        alpha: 1.0,
        color: '#06b6d4'
      });

      // 2. Play Laser Audio
      ShooterAudio.playLaser();

      // 3. Spawn Particle Explosion
      this.spawnExplosion(target.x, target.y, target.color);

      // 4. Pronounce the destroyed character via native TTS
      if (window.PlayerState) {
        window.PlayerState.playAudio(target.char);
      }

      // 5. Calculate Score & Combo
      this.consecutiveHits++;
      this.combo = Math.min(3.0, 1.0 + Math.floor(this.consecutiveHits / 3) * 0.25);
      const basePoints = 100;
      const earnedScore = Math.round(basePoints * this.combo);
      this.score += earnedScore;

      // 6. Spawn Floating Score Text
      this.floatingTexts.push({
        text: `+${earnedScore} [${target.char}]`,
        x: target.x,
        y: target.y - 10,
        alpha: 1.0,
        vy: -1.2,
        color: '#38bdf8'
      });

      // 7. Award Player XP
      if (window.PlayerState) {
        window.PlayerState.addXP(20);
      }

      // 8. Remove Meteor from Active Array
      this.meteors = this.meteors.filter(m => m !== target);

      // 9. Update UI HUD
      this.updateHUD();
    },

    /**
     * Spawn 28-35 Particle Shards
     */
    spawnExplosion: function (x, y, baseColor) {
      ShooterAudio.playExplosion();
      const count = 30;
      const palette = ['#06b6d4', '#38bdf8', '#f59e0b', '#ec4899', '#ffffff'];

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4.5 + 1.2;
        this.particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: Math.random() * 3.5 + 1.5,
          alpha: 1.0,
          decay: Math.random() * 0.025 + 0.015,
          color: palette[Math.floor(Math.random() * palette.length)]
        });
      }
    },

    // ========================================================================
    // 3. DIFFICULTY & ENEMY WAVE SPAWNER
    // ========================================================================

    setDifficulty: function (diff) {
      this.difficulty = diff;

      // Update Difficulty Buttons Styling
      const diffs = ['aka', 'lookalikes', 'full'];
      diffs.forEach(d => {
        const btn = document.getElementById(d === 'lookalikes' ? 'diff-lookalike' : `diff-${d}`);
        if (btn) {
          if (d === diff) {
            btn.className = "px-2.5 py-1 rounded text-xs font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/50 font-bold shadow-[0_0_8px_rgba(6,182,212,0.3)]";
          } else {
            btn.className = "px-2.5 py-1 rounded text-xs font-mono bg-transparent text-slate-400 hover:text-cyan-300 transition-all";
          }
        }
      });

      // Adjust speed & spawn rate
      if (diff === 'aka') {
        this.spawnInterval = 2400;
      } else if (diff === 'lookalikes') {
        this.spawnInterval = 1800; // Fast intense lookalike practice
      } else {
        this.spawnInterval = 1900;
      }
    },

    /**
     * Spawn an enemy meteor based on selected difficulty & SRS nemesis
     */
    spawnEnemyMeteor: function () {
      if (!window.KIHON_DATA) return;

      let candidatePool = [];

      if (this.difficulty === 'aka') {
        // Beginner A-Ka Row (Hiragana & Katakana)
        const hList = window.KIHON_DATA.hiragana || [];
        const kList = window.KIHON_DATA.katakana || [];
        candidatePool = [
          ...hList.filter(item => ['あ', 'い', 'う', 'え', 'お', 'か', 'き'].includes(item.char)),
          ...kList.filter(item => ['ア', 'イ', 'ウ', 'エ', 'オ', 'カ'].includes(item.char))
        ];
      } else if (this.difficulty === 'lookalikes') {
        // Intense Lookalike Ambush: シ (shi), ツ (tsu), ソ (so), ン (n)
        const kList = window.KIHON_DATA.katakana || [];
        candidatePool = kList.filter(item => ['シ', 'ツ', 'ソ', 'ン'].includes(item.char));
      } else {
        // Full Sector 0: Hiragana + Katakana + Radicals + SRS Nemesis Prioritization
        const allKana = [
          ...(window.KIHON_DATA.hiragana || []),
          ...(window.KIHON_DATA.katakana || []),
          ...(window.KIHON_DATA.radicals || [])
        ];

        // SRS Nemesis check: Prioritize unmastered characters
        const unmastered = allKana.filter(item => !window.PlayerState.isMastered(item.char));
        if (unmastered.length > 0 && Math.random() < 0.65) {
          candidatePool = unmastered;
        } else {
          candidatePool = allKana;
        }
      }

      if (!candidatePool.length) {
        candidatePool = window.KIHON_DATA.hiragana || [];
      }

      const randomItem = candidatePool[Math.floor(Math.random() * candidatePool.length)];

      // Position: random X with margin, Y above screen
      const margin = 55;
      const x = Math.random() * (this.width - margin * 2) + margin;
      const y = -35;

      // Color coding per script type
      let borderColor = '#06b6d4';
      if (['シ', 'ツ', 'ソ', 'ン'].includes(randomItem.char)) {
        borderColor = '#ec4899'; // Hot pink alert for lookalikes!
      } else if (randomItem.meaning) {
        borderColor = '#f59e0b'; // Amber for radicals
      }

      // Speed variance
      let baseSpeed = 1.1;
      if (this.difficulty === 'lookalikes') baseSpeed = 1.35;
      else if (this.difficulty === 'full') baseSpeed = 1.25;

      const speed = baseSpeed + Math.random() * 0.4;

      this.meteors.push({
        char: randomItem.char,
        romaji: randomItem.romaji,
        x: x,
        y: y,
        speed: speed,
        radius: 26,
        color: borderColor,
        rotation: 0,
        rotSpeed: (Math.random() - 0.5) * 0.03
      });
    },

    // ========================================================================
    // 4. MAIN GAME ENGINE LOOP (60FPS)
    // ========================================================================

    start: function () {
      ShooterAudio.init();

      this.hullHP = 100;
      this.score = 0;
      this.combo = 1.0;
      this.consecutiveHits = 0;
      this.meteors = [];
      this.particles = [];
      this.lasers = [];
      this.floatingTexts = [];
      this.lastSpawnTime = performance.now();
      this.isRunning = true;

      const btn = document.getElementById('btn-launch-shooter');
      if (btn) {
        btn.innerText = 'RESTART SORTIE ↺';
        btn.className = "cyber-btn px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-emerald-500 hover:from-cyan-500 hover:to-emerald-400 text-slate-950 font-orbitron font-black text-xs tracking-wider rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.5)]";
      }

      // Auto-focus targeting input for instant keyboard readiness
      const input = document.getElementById('laser-input');
      if (input) {
        input.value = '';
        input.focus();
      }

      this.updateHUD();

      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }

      const loop = (timestamp) => {
        if (!this.isRunning) return;
        this.update(timestamp);
        this.render();
        this.animationId = requestAnimationFrame(loop);
      };

      this.animationId = requestAnimationFrame(loop);
    },

    stop: function () {
      this.isRunning = false;
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    },

    /**
     * Update Frame Physics & States
     */
    update: function (timestamp) {
      // 1. Spawner
      if (timestamp - this.lastSpawnTime > this.spawnInterval) {
        this.spawnEnemyMeteor();
        this.lastSpawnTime = timestamp;
      }

      // 2. Screen Shake decay
      if (this.screenShake > 0) {
        this.screenShake *= 0.88;
        if (this.screenShake < 0.3) this.screenShake = 0;
      }

      // 3. Stars scroll
      this.stars.forEach(s => {
        s.y += s.speed;
        if (s.y > this.height) {
          s.y = 0;
          s.x = Math.random() * this.width;
        }
        s.alpha += s.twinkleSpeed;
        if (s.alpha > 1 || s.alpha < 0.2) s.twinkleSpeed = -s.twinkleSpeed;
      });

      // 4. Meteors descend & Hull Breach check
      const shieldLineY = this.height - 48;
      for (let i = this.meteors.length - 1; i >= 0; i--) {
        const m = this.meteors[i];
        m.y += m.speed;
        m.rotation += m.rotSpeed;

        if (m.y >= shieldLineY) {
          // SHIELD BREACH!
          this.triggerHullBreach(m);
          this.meteors.splice(i, 1);
        }
      }

      // 5. Lasers decay
      for (let i = this.lasers.length - 1; i >= 0; i--) {
        const laser = this.lasers[i];
        laser.alpha -= 0.12;
        if (laser.alpha <= 0) {
          this.lasers.splice(i, 1);
        }
      }

      // 6. Particles update
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        if (p.alpha <= 0) {
          this.particles.splice(i, 1);
        }
      }

      // 7. Floating Texts update
      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const ft = this.floatingTexts[i];
        ft.y += ft.vy;
        ft.alpha -= 0.02;
        if (ft.alpha <= 0) {
          this.floatingTexts.splice(i, 1);
        }
      }
    },

    /**
     * Trigger Hull Breach when meteor hits bottom shield
     */
    triggerHullBreach: function (meteor) {
      ShooterAudio.playShieldAlarm();
      this.screenShake = 16;
      this.hullHP = Math.max(0, this.hullHP - 20);
      this.consecutiveHits = 0;
      this.combo = 1.0;

      // Flash breach notice so player learns what slipped through
      this.lastBreachNotice = `SHIELD BREACH! [${meteor.char} = "${meteor.romaji}"] -20% HULL!`;
      this.lastBreachTimer = 110;

      // Speak breached character to reinforce auditory memory
      if (window.PlayerState) {
        window.PlayerState.playAudio(meteor.char);
      }

      this.updateHUD();

      // Check Game Over
      if (this.hullHP <= 0) {
        this.gameOver();
      }
    },

    gameOver: function () {
      this.isRunning = false;
      const btn = document.getElementById('btn-launch-shooter');
      if (btn) {
        btn.innerText = 'MISSION FAILED // RETRY 🚀';
        btn.className = "cyber-btn px-6 py-2.5 bg-gradient-to-r from-red-600 to-amber-500 text-slate-950 font-orbitron font-black text-xs tracking-wider rounded-lg shadow-[0_0_20px_rgba(239,68,68,0.5)]";
      }
    },

    // ========================================================================
    // 5. RENDERING PIPELINE
    // ========================================================================

    render: function () {
      if (!this.ctx) return;
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;

      ctx.save();

      // Screen Shake offset
      if (this.screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * this.screenShake;
        const shakeY = (Math.random() - 0.5) * this.screenShake;
        ctx.translate(shakeX, shakeY);
      }

      // Background Void
      ctx.fillStyle = '#01040f';
      ctx.fillRect(0, 0, w, h);

      // Starfield
      this.stars.forEach(s => {
        ctx.fillStyle = `rgba(226, 232, 240, ${s.alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Bottom Defense Grid Shield Line
      ctx.strokeStyle = this.hullHP > 30 ? 'rgba(6, 182, 212, 0.4)' : 'rgba(239, 68, 68, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(0, h - 48);
      ctx.lineTo(w, h - 48);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Laser Beams
      this.lasers.forEach(laser => {
        ctx.save();
        ctx.strokeStyle = `rgba(6, 182, 212, ${laser.alpha})`;
        ctx.lineWidth = 4;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.moveTo(laser.startX, laser.startY);
        ctx.lineTo(laser.targetX, laser.targetY);
        ctx.stroke();

        // Inner white high-intensity beam
        ctx.strokeStyle = `rgba(255, 255, 255, ${laser.alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      });

      // Draw Descending Meteors
      this.meteors.forEach(m => {
        this.drawMeteor(ctx, m);
      });

      // Draw Particles
      this.particles.forEach(p => {
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw Floating Texts
      this.floatingTexts.forEach(ft => {
        ctx.save();
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.font = 'bold 13px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 10;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      // Draw Player Starfighter
      this.drawStarfighter(ctx, this.ship.x, this.ship.y);

      // Draw Breach Banner Alert
      if (this.lastBreachTimer > 0) {
        this.lastBreachTimer--;
        ctx.save();
        ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
        ctx.font = 'bold 14px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 12;
        ctx.fillText(this.lastBreachNotice, w / 2, 45);
        ctx.restore();
      }

      // Game Over Overlay
      if (!this.isRunning && this.hullHP <= 0) {
        ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#ef4444';
        ctx.font = '900 28px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 20;
        ctx.fillText('CRITICAL FAILURE // HULL BREACHED', w / 2, h / 2 - 20);

        ctx.fillStyle = '#e2e8f0';
        ctx.font = '14px Orbitron, sans-serif';
        ctx.shadowBlur = 0;
        ctx.fillText(`FINAL DEFENSE SCORE: ${this.score}`, w / 2, h / 2 + 15);
        ctx.fillText('PRESS "LAUNCH SORTIE" TO RE-ENGAGE AIRSPACE', w / 2, h / 2 + 42);
      }

      ctx.restore();
    },

    /**
     * Draw Enemy Glyphs with Cyber Radar Reticle
     */
    drawMeteor: function (ctx, m) {
      ctx.save();
      ctx.translate(m.x, m.y);

      // Rotating Radar Ring
      ctx.save();
      ctx.rotate(m.rotation);
      ctx.strokeStyle = m.color;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = m.color;
      ctx.shadowBlur = 12;

      // Hexagonal outer shield
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const hx = Math.cos(a) * m.radius;
        const hy = Math.sin(a) * m.radius;
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();

      // Corner target brackets
      ctx.beginPath();
      ctx.arc(0, 0, m.radius + 4, 0, Math.PI * 0.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, m.radius + 4, Math.PI, Math.PI * 1.4);
      ctx.stroke();
      ctx.restore();

      // Inner Core Glow
      ctx.fillStyle = 'rgba(9, 17, 36, 0.9)';
      ctx.beginPath();
      ctx.arc(0, 0, m.radius - 2, 0, Math.PI * 2);
      ctx.fill();

      // Japanese Character Glyph
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px "Noto Sans JP", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = m.color;
      ctx.shadowBlur = 15;
      ctx.fillText(m.char, 0, 1);

      ctx.restore();
    },

    /**
     * Draw Player Starfighter with Twin Plasma Thrusters
     */
    drawStarfighter: function (ctx, x, y) {
      ctx.save();
      ctx.translate(x, y);

      // Plasma Thruster Plume (Animated)
      const plumeHeight = Math.random() * 12 + 10;
      ctx.fillStyle = 'rgba(6, 182, 212, 0.8)';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 15;

      // Left Thruster
      ctx.beginPath();
      ctx.moveTo(-10, 14);
      ctx.lineTo(-6, 14 + plumeHeight);
      ctx.lineTo(-2, 14);
      ctx.fill();

      // Right Thruster
      ctx.beginPath();
      ctx.moveTo(2, 14);
      ctx.lineTo(6, 14 + plumeHeight);
      ctx.lineTo(10, 14);
      ctx.fill();

      // Starfighter Chassis
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.moveTo(0, -18);      // Nose
      ctx.lineTo(18, 12);      // Right wingtip
      ctx.lineTo(10, 14);      // Right engine
      ctx.lineTo(0, 8);        // Center keel
      ctx.lineTo(-10, 14);     // Left engine
      ctx.lineTo(-18, 12);     // Left wingtip
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cockpit Canopy Glow
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(4, 0);
      ctx.lineTo(0, 4);
      ctx.lineTo(-4, 0);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    },

    // ========================================================================
    // 6. HUD SYNCHRONIZATION
    // ========================================================================

    updateHUD: function () {
      const hullBar = document.getElementById('hull-bar');
      const hullText = document.getElementById('hull-text');
      const scoreEl = document.getElementById('shooter-score');
      const comboEl = document.getElementById('shooter-combo');

      if (hullBar) {
        hullBar.style.width = `${this.hullHP}%`;
        if (this.hullHP > 50) {
          hullBar.className = "h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full shadow-[0_0_10px_#10b981]";
        } else if (this.hullHP > 20) {
          hullBar.className = "h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full shadow-[0_0_10px_#f59e0b]";
        } else {
          hullBar.className = "h-full bg-gradient-to-r from-red-600 to-red-500 rounded-full shadow-[0_0_10px_#ef4444]";
        }
      }

      if (hullText) {
        hullText.innerText = `${this.hullHP}%`;
        hullText.className = this.hullHP > 50 ? 'text-emerald-400 font-bold' : (this.hullHP > 20 ? 'text-amber-400 font-bold' : 'text-red-400 font-bold animate-pulse');
      }

      if (scoreEl) {
        scoreEl.innerText = this.score.toString().padStart(5, '0');
      }

      if (comboEl) {
        comboEl.innerText = `x${this.combo.toFixed(1)}`;
      }
    }
  };


  // ==========================================================================
  // 7. GLOBAL WINDOW ATTACHMENTS
  // ==========================================================================

  window.ShooterGame = KanaBlaster;

  window.startShooterGame = function () {
    KanaBlaster.start();
  };

  window.selectShooterDifficulty = function (diff) {
    KanaBlaster.setDifficulty(diff);
  };

  function initShooter() {
    KanaBlaster.init();
    KanaBlaster.setDifficulty('aka');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShooter);
  } else {
    initShooter();
  }

  console.log('[Project Kihon] shooter.js initialized successfully.');

})();
