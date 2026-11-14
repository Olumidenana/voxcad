/**
 * VoxCAD — Voice & Speech Recognition Engine
 * Bulletproof Speech Capture, Acoustic Tones & CAD Lexicon Filter
 */

export class VoiceEngine {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.isSupported = false;
    this.ttsEnabled = true;

    // Web Audio Context for Acoustic Feedback & Waveform
    this.audioCtx = null;
    this.analyser = null;
    this.mediaStream = null;

    // Callbacks
    this.onTranscriptUpdate = null;
    this.onCommandFinalized = null;
    this.onStatusChange = null;
    this.onError = null;

    // CAD Specialized Lexicon Phonetic Map
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
      { pattern: /\b(reactor|core)\b/gi, replacement: "reactor core" }
    ];

    this.initSpeechRecognition();
  }

  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.isSupported = true;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isListening = true;
        this.playAcousticCue(587.33, 0.1); // High D5 chime
        if (this.onStatusChange) this.onStatusChange('listening');
      };

      this.recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
          } else {
            interimTranscript += item[0].transcript;
          }
        }

        const raw = (finalTranscript || interimTranscript).trim();
        const conditioned = this.applyCADLexicon(raw);

        if (this.onTranscriptUpdate) {
          this.onTranscriptUpdate(conditioned, !!finalTranscript);
        }

        if (finalTranscript && this.onCommandFinalized) {
          this.onCommandFinalized(conditioned);
        }
      };

      this.recognition.onerror = (event) => {
        console.warn('Speech Recognition error event:', event.error);
        if (event.error === 'not-allowed') {
          const msg = 'Microphone access is blocked. Please click the lock or camera icon in your address bar and allow microphone permissions.';
          if (this.onError) this.onError(msg);
          this.speak(msg);
        } else if (event.error === 'no-speech') {
          // Normal silence, don't crash
        } else {
          if (this.onError) this.onError(`Voice status: ${event.error}`);
        }
        this.stopListening();
      };

      this.recognition.onend = () => {
        if (this.isListening) {
          // Restart if user intended to keep listening
          try {
            this.recognition.start();
          } catch (e) {
            this.isListening = false;
            if (this.onStatusChange) this.onStatusChange('idle');
          }
        } else {
          if (this.onStatusChange) this.onStatusChange('idle');
        }
      };
    } else {
      console.warn('Web Speech API not natively available in this browser.');
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

  async startListening() {
    if (!this.isSupported) {
      if (this.onError) {
        this.onError('Speech Recognition is not supported by your browser. Use Chrome, Edge, or Brave, or type below.');
      }
      return;
    }

    if (this.isListening) return;

    // Explicitly request mic permission first so user gets browser dialog if needed
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    } catch (err) {
      const msg = 'Please allow microphone access in your browser to use voice commands.';
      if (this.onError) this.onError(msg);
      return;
    }

    try {
      this.isListening = true;
      this.recognition.start();
    } catch (e) {
      console.error('Failed to start recognition:', e);
    }
  }

  stopListening() {
    if (!this.isListening) return;
    this.isListening = false;
    this.playAcousticCue(392.00, 0.1); // Low G4 chime
    try {
      this.recognition.stop();
    } catch (e) {}

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }

    if (this.onStatusChange) this.onStatusChange('idle');
  }

  toggleListening() {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  playAcousticCue(freq, duration) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!this.audioCtx) this.audioCtx = new AudioContext();
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

  speak(text) {
    if (!this.ttsEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
    if (voice) utterance.voice = voice;

    window.speechSynthesis.speak(utterance);
  }
}
