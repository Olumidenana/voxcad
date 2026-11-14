/**
 * VoxCAD — Advanced Conversational Voice Engine
 * Handles Speech Recognition, Device Permissions, Acoustic Cues & Conversational Loop
 */

export class VoiceEngine {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.isSupported = false;
    this.ttsEnabled = true;

    // Conversational Timeout Timer (stops listening after inactivity)
    this.silenceTimer = null;
    this.silenceTimeoutMs = 8000; // 8 seconds wait for followup

    // Web Audio Context for Chimes
    this.audioCtx = null;

    // Callbacks
    this.onTranscriptUpdate = null;
    this.onCommandFinalized = null;
    this.onStatusChange = null;
    this.onError = null;
    this.onInactivityTimeout = null;

    // Utterance tracking to prevent Chrome dropping interim speech
    this.lastRecognizedText = '';
    this.hasFinalizedCurrentUtterance = false;

    // CAD Lexicon Phonetic Map
    this.phoneticMap = [
      { pattern: /\b(counter\s*four|counter\s*for)\b/gi, replacement: "counterbore" },
      { pattern: /\b(filet|phillet)\b/gi, replacement: "fillet" },
      { pattern: /\b(shamfer|shampfer|champfer)\b/gi, replacement: "chamfer" },
      { pattern: /\b(whole|hold)\b/gi, replacement: "hole" },
      { pattern: /\b(extrud|x-trude|ex-trude)\b/gi, replacement: "extrude" },
      { pattern: /\b(cylinder|cilinder)\b/gi, replacement: "cylinder" },
      { pattern: /\b(millimeters?|mils?)\b/gi, replacement: "mm" },
      { pattern: /\b(centimeters?)\b/gi, replacement: "cm" },
      { pattern: /\b(stealt|stelt)\b/gi, replacement: "stealth" },
      { pattern: /\b(dron|droan)\b/gi, replacement: "drone" },
      { pattern: /\b(towr|towar)\b/gi, replacement: "tower" },
      { pattern: /\b(reactor|core)\b/gi, replacement: "reactor core" },
      { pattern: /\b(hypercar|supercar)\b/gi, replacement: "hypercar" },
      { pattern: /\b(satellite|probe)\b/gi, replacement: "satellite" }
    ];

    this.initSpeechRecognition();
  }

  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      this.isSupported = true;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false; // Capture discrete sentences cleanly
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isListening = true;
        this.lastRecognizedText = '';
        this.hasFinalizedCurrentUtterance = false;
        this.clearSilenceTimer();
        this.playAcousticCue(659.25, 0.08); // E5 Chime
        if (this.onStatusChange) this.onStatusChange('listening');
      };

      this.recognition.onresult = (event) => {
        this.clearSilenceTimer(); // Reset inactivity while user is speaking

        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            final += item[0].transcript;
          } else {
            interim += item[0].transcript;
          }
        }

        const raw = (final || interim).trim();
        const conditioned = this.applyCADLexicon(raw);

        if (conditioned) {
          this.lastRecognizedText = conditioned;
        }

        if (this.onTranscriptUpdate) {
          this.onTranscriptUpdate(conditioned, !!final);
        }

        if (final && this.onCommandFinalized) {
          this.hasFinalizedCurrentUtterance = true;
          this.lastRecognizedText = '';
          this.onCommandFinalized(conditioned);
        }
      };

      this.recognition.onerror = (event) => {
        console.warn('Speech error:', event.error);
        this.clearSilenceTimer();

        if (event.error === 'not-allowed') {
          const msg = 'Microphone permission was denied. Please click the lock or camera icon in your browser address bar to allow microphone access.';
          if (this.onError) this.onError(msg);
          this.speak('Microphone access is blocked. Please allow microphone permissions in your browser.');
        } else if (event.error === 'network') {
          const msg = 'Speech recognition network error. Please check your internet connection or use typing below.';
          if (this.onError) this.onError(msg);
        } else if (event.error === 'no-speech') {
          // Handled smoothly by silence handler
        } else {
          if (this.onError) this.onError(`Voice status: ${event.error}`);
        }

        this.isListening = false;
        if (this.onStatusChange) this.onStatusChange('idle');
      };

      this.recognition.onend = () => {
        // Fallback: If user spoke a phrase and stopped talking, but Chrome didn't mark isFinal
        if (!this.hasFinalizedCurrentUtterance && this.lastRecognizedText && this.onCommandFinalized) {
          this.hasFinalizedCurrentUtterance = true;
          const textToDispatch = this.lastRecognizedText;
          this.lastRecognizedText = '';
          this.onCommandFinalized(textToDispatch);
        }

        this.isListening = false;
        if (this.onStatusChange) this.onStatusChange('idle');
      };
    } else {
      console.warn('SpeechRecognition API not available in this browser.');
    }
  }

  applyCADLexicon(text) {
    if (!text) return '';
    let result = text;
    for (const rule of this.phoneticMap) {
      result = result.replace(rule.pattern, rule.replacement);
    }
    return result;
  }

  startListening() {
    if (!this.isSupported) {
      if (this.onError) {
        this.onError('Speech Recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge, or type in the bar below.');
      }
      return;
    }

    if (this.isListening) return;

    this.lastRecognizedText = '';
    this.hasFinalizedCurrentUtterance = false;

    try {
      this.recognition.start();
    } catch (e) {
      console.warn('Recognition start exception:', e);
      try {
        this.recognition.stop();
        setTimeout(() => {
          this.lastRecognizedText = '';
          this.hasFinalizedCurrentUtterance = false;
          this.recognition.start();
        }, 150);
      } catch (err) {}
    }
  }

  stopListening() {
    this.clearSilenceTimer();
    if (!this.isListening) return;

    this.isListening = false;
    this.playAcousticCue(392.00, 0.08); // G4 low chime
    try {
      this.recognition.stop();
    } catch (e) {}

    if (this.onStatusChange) this.onStatusChange('idle');
  }

  toggleListening() {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  /**
   * Starts conversational followup timer: listens for user response,
   * but automatically shuts off if no response is detected within 8 seconds.
   */
  startFollowupListening(onTimeoutCallback) {
    this.clearSilenceTimer();
    this.startListening();

    this.silenceTimer = setTimeout(() => {
      if (this.isListening) {
        this.stopListening();
        if (onTimeoutCallback) onTimeoutCallback();
      }
    }, this.silenceTimeoutMs);
  }

  clearSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  playAcousticCue(freq, duration) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioCtx) this.audioCtx = new AudioCtx();
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {}
  }

  /**
   * Speaks out responses and fires a callback when speech finishes
   */
  speak(text, onFinished = null) {
    if (!this.ttsEnabled || !window.speechSynthesis) {
      if (onFinished) onFinished();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
    if (voice) utterance.voice = voice;

    utterance.onend = () => {
      if (onFinished) onFinished();
    };

    utterance.onerror = () => {
      if (onFinished) onFinished();
    };

    window.speechSynthesis.speak(utterance);
  }
}
