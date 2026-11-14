/**
 * VoxCAD — Main Application Orchestrator
 * Glues together CAD Engine, Voice Recognition, Intent Parsing & UI
 */

import { CADEngine } from './cad-engine.js';
import { VoiceEngine } from './voice-engine.js';
import { IntentParser } from './intent-parser.js';
import { FeatureTree } from './feature-tree.js';

class VoxCADApp {
  constructor() {
    this.cadEngine = null;
    this.voiceEngine = null;
    this.intentParser = null;
    this.featureTree = null;

    // Cache DOM Elements
    this.dom = {
      container: document.getElementById('viewportContainer'),
      canvas: document.getElementById('threeCanvas'),
      btnMic: document.getElementById('btnMicTrigger'),
      micStatusText: document.getElementById('micStatusText'),
      waveformBars: document.querySelectorAll('#waveformBar .bar'),
      transcriptBox: document.getElementById('transcriptText'),
      aiFeedbackMsg: document.getElementById('aiFeedbackMessage'),
      promptForm: document.getElementById('promptForm'),
      manualInput: document.getElementById('manualPromptInput'),
      featureTreeList: document.getElementById('featureTreeList'),
      emptyTreeState: document.getElementById('emptyTreeState'),
      selectionStatus: document.getElementById('selectedEntityLabel'),
      selectionToast: document.getElementById('selectionToast'),
      toastFaceTitle: document.getElementById('toastFaceTitle'),
      toastFaceSubtitle: document.getElementById('toastFaceSubtitle'),
      btnDismissToast: document.getElementById('btnDismissToast'),
      statFaces: document.getElementById('statFaces'),
      statBounds: document.getElementById('statBounds'),
      cursorCoords: document.getElementById('cursorCoords'),
      exportDropdownBtn: document.getElementById('exportDropdownBtn'),
      exportDropdown: document.querySelector('.dropdown'),
      btnExportSTL: document.getElementById('btnExportSTL'),
      btnExportOBJ: document.getElementById('btnExportOBJ'),
      btnExportPythonCAD: document.getElementById('btnExportPythonCAD'),
      btnClearAll: document.getElementById('btnClearAll'),
      btnToggleWireframe: document.getElementById('btnToggleWireframe'),
      btnToggleGrid: document.getElementById('btnToggleGrid'),
      btnResetCamera: document.getElementById('btnResetCamera'),
      ttsToggle: document.getElementById('ttsToggle')
    };

    this.init();
  }

  init() {
    // 1. Initialize Subsystems
    this.cadEngine = new CADEngine(this.dom.container, this.dom.canvas);
    this.featureTree = new FeatureTree(this.cadEngine);
    this.intentParser = new IntentParser();
    this.voiceEngine = new VoiceEngine();

    // 2. Wire Subsystem Callbacks
    this.setupSubsystemCallbacks();

    // 3. Setup UI & Keyboard Events
    this.setupUIEventListeners();

    // 4. Load a default starting part (e.g. 100x80x15mm Base Plate)
    this.createInitialScene();
  }

  async createInitialScene() {
    await this.featureTree.addOperation({
      type: 'CREATE_BOX',
      width: 100,
      depth: 80,
      height: 15,
      description: 'Base Plate (100 × 80 × 15 mm)'
    });
    this.updateAIFeedback('Created initial 100×80×15mm plate. Click any face to point and speak, or try: "Cut 25mm hole".');
  }

  setupSubsystemCallbacks() {
    // A. CAD Engine Selection Callback (Point & Speak)
    this.cadEngine.onSelectionChanged = (faceInfo) => {
      if (faceInfo) {
        this.dom.selectionStatus.textContent = faceInfo.name;
        this.dom.selectionStatus.previousElementSibling.className = 'indicator dot-active';
        
        // Show selection toast
        this.dom.toastFaceTitle.textContent = `${faceInfo.name} Selected`;
        this.dom.toastFaceSubtitle.textContent = `Say "Extrude 20mm" or "Cut 15mm hole"`;
        this.dom.selectionToast.classList.remove('hidden');
      } else {
        this.dom.selectionStatus.textContent = 'No Selection (Click face to bind)';
        this.dom.selectionStatus.previousElementSibling.className = 'indicator dot-idle';
        this.dom.selectionToast.classList.add('hidden');
      }
    };

    // B. CAD Viewport Statistics Callback
    this.cadEngine.onGeometryUpdated = (stats) => {
      this.dom.statFaces.textContent = stats.faces.toLocaleString();
      this.dom.statBounds.textContent = stats.bounds;
    };

    // C. Voice Engine Transcript Updates
    this.voiceEngine.onTranscriptUpdate = (text, isFinal) => {
      if (text) {
        this.dom.transcriptBox.innerHTML = `<span>${text}</span>`;
      } else {
        this.dom.transcriptBox.innerHTML = `<span class="placeholder">Listening for commands...</span>`;
      }
    };

    // D. Voice Engine Command Finalized
    this.voiceEngine.onCommandFinalized = (transcript) => {
      this.executeSpokenCommand(transcript);
    };

    // E. Voice Engine Status Change
    this.voiceEngine.onStatusChange = (status) => {
      if (status === 'listening') {
        this.dom.btnMic.classList.add('listening');
        this.dom.micStatusText.textContent = 'Listening... Speak your design command';
      } else {
        this.dom.btnMic.classList.remove('listening');
        this.dom.micStatusText.textContent = 'Click Mic or Hold Spacebar to Speak';
      }
    };

    // F. Audio Level Waveform
    this.voiceEngine.onAudioLevel = (level) => {
      const bars = this.dom.waveformBars;
      bars.forEach((bar, index) => {
        const heightMultiplier = Math.sin((index / bars.length) * Math.PI) * 1.5;
        const h = Math.max(4, Math.min(22, level * 50 * heightMultiplier));
        bar.style.height = `${h}px`;
      });
    };

    // G. Feature Tree Updated UI Callback
    this.featureTree.onTreeUpdated = (features) => {
      this.renderFeatureTree(features);
    };
  }

  setupUIEventListeners() {
    // Mic Button Click
    this.dom.btnMic.addEventListener('click', () => {
      this.voiceEngine.toggleListening();
    });

    // Dismiss Selection Toast
    this.dom.btnDismissToast.addEventListener('click', () => {
      this.cadEngine.clearSelection();
    });

    // Manual Text Prompt Submit
    this.dom.promptForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = this.dom.manualInput.value.trim();
      if (text) {
        this.executeSpokenCommand(text);
        this.dom.manualInput.value = '';
      }
    });

    // Quick Command Prompt Chips
    document.querySelectorAll('.quick-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const cmd = chip.getAttribute('data-cmd');
        this.executeSpokenCommand(cmd);
      });
    });

    // Material Swatches
    document.querySelectorAll('.swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        const mat = swatch.getAttribute('data-mat');
        this.cadEngine.setMaterial(mat);
        this.updateAIFeedback(`Appearance changed to ${mat}.`);
      });
    });

    // Viewport Orientation Buttons (ISO, TOP, FRONT, RIGHT)
    document.querySelectorAll('.view-pill-group .pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.view-pill-group .pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const view = btn.getAttribute('data-view');
        this.cadEngine.setCameraView(view);
      });
    });

    // Toggle Wireframe & Grid
    this.dom.btnToggleWireframe.addEventListener('click', () => {
      const active = this.cadEngine.toggleWireframe();
      this.dom.btnToggleWireframe.classList.toggle('active', active);
    });

    this.dom.btnToggleGrid.addEventListener('click', () => {
      const active = this.cadEngine.toggleGrid();
      this.dom.btnToggleGrid.classList.toggle('active', active);
    });

    this.dom.btnResetCamera.addEventListener('click', () => {
      this.cadEngine.resetCamera();
    });

    // Clear All Operations
    this.dom.btnClearAll.addEventListener('click', () => {
      if (confirm('Clear all features and reset to empty scene?')) {
        this.featureTree.clear();
        this.updateAIFeedback('Scene cleared.');
      }
    });

    // Export Dropdown
    this.dom.exportDropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dom.exportDropdown.classList.toggle('open');
    });

    window.addEventListener('click', () => {
      this.dom.exportDropdown.classList.remove('open');
    });

    this.dom.btnExportSTL.addEventListener('click', () => {
      this.cadEngine.exportSTL('voxcad_model.stl');
      this.updateAIFeedback('Exported physical 3D STL file.');
    });

    this.dom.btnExportOBJ.addEventListener('click', () => {
      this.cadEngine.exportOBJ('voxcad_model.obj');
      this.updateAIFeedback('Exported OBJ mesh file.');
    });

    this.dom.btnExportPythonCAD.addEventListener('click', () => {
      const pyCode = this.featureTree.generatePythonCADCode();
      navigator.clipboard.writeText(pyCode).then(() => {
        alert('Copied SolidWorks/build123d Python script to clipboard!\n\nYou can run this in any Python CAD environment.');
      });
      this.updateAIFeedback('Copied build123d Python CAD script.');
    });

    // TTS Voice Audio Toggle
    this.dom.ttsToggle.addEventListener('change', (e) => {
      this.voiceEngine.setTTSEnabled(e.target.checked);
    });

    // Keyboard Shortcuts (Space for Push-to-Talk, Ctrl+Z for Undo)
    let spaceKeyDown = false;
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;

      if (e.code === 'Space' && !spaceKeyDown) {
        spaceKeyDown = true;
        e.preventDefault();
        this.voiceEngine.startListening();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        this.featureTree.undo();
        this.updateAIFeedback('Undid last feature.');
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space' && spaceKeyDown) {
        spaceKeyDown = false;
        e.preventDefault();
        this.voiceEngine.stopListening();
      }
    });
  }

  /**
   * Translates spoken command into CAD action & executes it
   */
  async executeSpokenCommand(transcript) {
    if (!transcript) return;

    this.dom.transcriptBox.innerHTML = `<strong>"${transcript}"</strong>`;

    const selectedFace = this.cadEngine.selectedFace;
    const intent = this.intentParser.parse(transcript, selectedFace, this.featureTree.features);

    if (!intent) return;

    switch (intent.type) {
      case 'AMBIGUITY':
        this.updateAIFeedback(intent.question, true);
        this.voiceEngine.speak(intent.question);
        break;

      case 'CREATE_BOX':
      case 'CREATE_CYLINDER':
      case 'CREATE_SPHERE':
      case 'CUT_HOLE':
      case 'EXTRUDE_FACE':
      case 'CHAMFER':
      case 'FILLET':
        await this.featureTree.addOperation({
          ...intent,
          description: intent.message
        });
        this.updateAIFeedback(intent.message);
        this.voiceEngine.speak(intent.message);
        this.cadEngine.clearSelection();
        break;

      case 'CAMERA_VIEW':
        if (intent.view === 'reset') {
          this.cadEngine.resetCamera();
        } else {
          this.cadEngine.setCameraView(intent.view);
          document.querySelectorAll('.view-pill-group .pill-btn').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-view') === intent.view);
          });
        }
        this.updateAIFeedback(intent.message);
        break;

      case 'TOGGLE_WIREFRAME':
        const wire = this.cadEngine.toggleWireframe();
        this.dom.btnToggleWireframe.classList.toggle('active', wire);
        this.updateAIFeedback(wire ? 'Wireframe enabled' : 'Solid shaded mode');
        break;

      case 'TOGGLE_GRID':
        const grid = this.cadEngine.toggleGrid();
        this.dom.btnToggleGrid.classList.toggle('active', grid);
        this.updateAIFeedback(grid ? 'Grid enabled' : 'Grid hidden');
        break;

      case 'UNDO':
        const undone = await this.featureTree.undo();
        this.updateAIFeedback(undone ? 'Undid last feature.' : 'No features to undo.');
        this.voiceEngine.speak(undone ? 'Undid last feature' : 'Nothing to undo');
        break;

      case 'REDO':
        const redone = await this.featureTree.redo();
        this.updateAIFeedback(redone ? 'Redid feature.' : 'No features to redo.');
        break;

      case 'CLEAR_ALL':
        await this.featureTree.clear();
        this.updateAIFeedback('Scene cleared.');
        this.voiceEngine.speak('Scene cleared');
        break;

      case 'SET_MATERIAL':
        this.cadEngine.setMaterial(intent.material);
        document.querySelectorAll('.swatch').forEach(s => {
          s.classList.toggle('active', s.getAttribute('data-mat') === intent.material);
        });
        this.updateAIFeedback(intent.message);
        this.voiceEngine.speak(intent.message);
        break;

      case 'UNKNOWN':
      default:
        this.updateAIFeedback(intent.message);
        break;
    }
  }

  updateAIFeedback(msg, isQuestion = false) {
    this.dom.aiFeedbackMsg.textContent = msg;
    if (isQuestion) {
      this.dom.aiFeedbackMsg.style.color = '#38bdf8';
    } else {
      this.dom.aiFeedbackMsg.style.color = '#94a3b8';
    }
  }

  renderFeatureTree(features) {
    const list = this.dom.featureTreeList;
    list.innerHTML = '';

    if (!features || features.length === 0) {
      list.appendChild(this.dom.emptyTreeState);
      return;
    }

    features.forEach((feat, index) => {
      const node = document.createElement('div');
      node.className = 'feature-node';
      node.innerHTML = `
        <div class="feature-node-header">
          <span class="feature-type">
            <span class="feature-index">#${index + 1}</span>
            <span>${feat.type.replace('_', ' ')}</span>
          </span>
          <button class="feature-delete-btn" title="Delete this feature" data-id="${feat.id}">×</button>
        </div>
        <div class="feature-details">${feat.description || 'Feature Operation'}</div>
      `;

      node.querySelector('.feature-delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.featureTree.removeOperation(feat.id);
      });

      list.appendChild(node);
    });
  }
}

// Bootstrap Application on DOM Ready
window.addEventListener('DOMContentLoaded', () => {
  new VoxCADApp();
});
