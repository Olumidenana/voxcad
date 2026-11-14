/**
 * VoxCAD — Voice & Speech Engine
 * Precision Lexicon Conditioning & Acoustic Feedback
 */

export class VoiceEngine {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.isSupported = false;
    this.ttsEnabled = true;

    // Audio Analysis for Visualizer
    this.audioContext = null;
    this.analyser = null;
    this.microphoneStream = null;
    this.animFrameId = null;

    // Callbacks
    this.onTranscriptUpdate = null;
    this.onCommandFinalized = null;
    this.onStatusChange = null;
    this.onAudioLevel = null;

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
      { pattern: /\b(radius|radial)\b/gi, replacement: "radius" },
      { pattern: /\b(diameter|die-ameter)\b/gi, replacement: "diameter" },
      { pattern: /\b(bevel|bevell)\b/gi, replacement: "bevel" },
      { pattern: /\b(draft\s*angle)\b/gi, replacement: "draft angle" }
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
        if (this.onStatusChange) this.onStatusChange('listening');
        this.startAudioVisualization();
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

        const rawText = (finalTranscript || interimTranscript).trim();
        const conditionedText = this.applyCADLexiconConditioning(rawText);

        if (this.onTranscriptUpdate) {
          this.onTranscriptUpdate(conditionedText, !!finalTranscript);
        }

        if (finalTranscript && this.onCommandFinalized) {
          this.onCommandFinalized(conditionedText);
        }
      };

      this.recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          this.speak('Microphone access was denied. Please allow microphone permissions in your browser.');
        }
        this.stopListening();
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (this.onStatusChange) this.onStatusChange('idle');
        this.stopAudioVisualization();
      };
    } else {
      console.warn('Web Speech API is not supported in this browser. Fallback to manual typing.');
    }
  }

  /**
   * Applies Domain Lexicon Conditioning: ensures terms like "counterbore", "fillet",
   * and exact numbers/units don't get misrecognized as casual conversation words.
   */
  applyCADLexiconConditioning(text) {
    if (!text) return '';
    let result = text;
    for (const rule of this.phoneticMap) {
      result = result.replace(rule.pattern, rule.replacement);
    }
    return result;
  }

  startListening() {
    if (!this.isSupported) {
      alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Brave, or type in the manual prompt.');
      return;
    }
    if (this.isListening) return;

    try {
      this.recognition.start();
    } catch (e) {
      console.error('Error starting speech recognition:', e);
    }
  }

  stopListening() {
    if (!this.isListening) return;
    try {
      this.recognition.stop();
    } catch (e) {
      console.error('Error stopping speech recognition:', e);
    }
    this.isListening = false;
    if (this.onStatusChange) this.onStatusChange('idle');
    this.stopAudioVisualization();
  }

  toggleListening() {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  /**
   * Real-time microphone audio visualizer
   */
  async startAudioVisualization() {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = this.audioContext.createMediaStreamSource(this.microphoneStream);

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLoop = () => {
        if (!this.isListening) return;
        this.analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength; // 0 to 255

        if (this.onAudioLevel) {
          this.onAudioLevel(average / 255);
        }

        this.animFrameId = requestAnimationFrame(updateLoop);
      };

      updateLoop();
    } catch (err) {
      console.warn('Could not initialize audio visualizer stream:', err);
    }
  }

  stopAudioVisualization() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(track => track.stop());
      this.microphoneStream = null;
    }
    if (this.onAudioLevel) {
      this.onAudioLevel(0);
    }
  }

  /**
   * Spoken Assistant Feedback (Text-to-Speech)
   */
  speak(text) {
    if (!this.ttsEnabled || !window.speechSynthesis) return;

    window.speechSynthesis.cancel(); // Stop any pending utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    
    // Pick clean English voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
    if (preferredVoice) utterance.voice = preferredVoice;

    window.speechSynthesis.speak(utterance);
  }

  setTTSEnabled(enabled) {
    this.ttsEnabled = enabled;
  }
}
