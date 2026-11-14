/**
 * VoxCAD — Universal Orchestrator
 * Connects 3D Viewport, Speech Recognition, Intent Parsing & UI Controls
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

    // Cache Elements
    this.dom = {
      container: document.getElementById('viewportContainer'),
      canvas: document.getElementById('threeCanvas'),
      btnToggleSidePanel: document.getElementById('btnToggleSidePanel'),
      btnCloseDrawer: document.getElementById('btnCloseDrawer'),
      sideDrawer: document.getElementById('sideDrawer'),
      btnMic: document.getElementById('btnMic'),
      commandForm: document.getElementById('commandForm'),
      commandInput: document.getElementById('commandInput'),
      aiMessage: document.getElementById('aiMessage'),
      micStateLabel: document.getElementById('micStateLabel'),
      notificationBanner: document.getElementById('notificationBanner'),
      notificationText: document.getElementById('notificationText'),
      btnCloseNotification: document.getElementById('btnCloseNotification'),
      statFaces: document.getElementById('statFaces'),
      statBounds: document.getElementById('statBounds'),
      selectionChip: document.getElementById('selectionChip'),
      selectedEntityLabel: document.getElementById('selectedEntityLabel'),
      btnDismissSelection: document.getElementById('btnDismissSelection'),
      btnQuickExportSTL: document.getElementById('btnQuickExportSTL'),
      btnCopyCode: document.getElementById('btnCopyCode'),
      featureTreeList: document.getElementById('featureTreeList'),
      emptyTreeState: document.getElementById('emptyTreeState'),
      btnClearAll: document.getElementById('btnClearAll'),
      btnToggleWireframe: document.getElementById('btnToggleWireframe'),
      btnToggleGrid: document.getElementById('btnToggleGrid'),
      btnResetCamera: document.getElementById('btnResetCamera')
    };

    this.init();
  }

  async init() {
    // 1. Subsystems
    this.cadEngine = new CADEngine(this.dom.container, this.dom.canvas);
    this.featureTree = new FeatureTree(this.cadEngine);
    this.intentParser = new IntentParser();
    this.voiceEngine = new VoiceEngine();

    // 2. Wire Callbacks
    this.setupSubsystems();

    // 3. UI Listeners
    this.setupUI();

    // 4. Start with a Futuristic Stealth Jet Drone
    await this.featureTree.addOperation({
      type: 'CREATE_STEALTH_DRONE',
      scale: 1.0,
      description: 'Futuristic Stealth Drone Fuselage & Stabilizers'
    });
    this.updateMessage('Created Futuristic Stealth Drone. Speak or type: "Twisted tower", "Cut hole", or "Make it brass"!');
  }

  setupSubsystems() {
    // Selection Callback
    this.cadEngine.onSelectionChanged = (faceInfo) => {
      if (faceInfo) {
        this.dom.selectedEntityLabel.textContent = `${faceInfo.name} Selected`;
        this.dom.selectionChip.classList.remove('hidden');
      } else {
        this.dom.selectionChip.classList.add('hidden');
      }
    };

    // Stats Callback
    this.cadEngine.onGeometryUpdated = (stats) => {
      this.dom.statFaces.textContent = stats.faces.toLocaleString();
      this.dom.statBounds.textContent = stats.bounds;
    };

    // Voice Engine Callbacks
    this.voiceEngine.onTranscriptUpdate = (text, isFinal) => {
      if (text) {
        this.dom.commandInput.value = text;
        this.updateMessage(`Hearing: "${text}"...`);
      }
    };

    this.voiceEngine.onCommandFinalized = (finalText) => {
      this.executeCommand(finalText);
    };

    this.voiceEngine.onStatusChange = (status) => {
      if (status === 'listening') {
        this.dom.btnMic.classList.add('listening');
        this.dom.micStateLabel.textContent = 'Listening... Speak your vision now';
        this.dom.micStateLabel.previousElementSibling.style.background = '#f43f5e';
      } else {
        this.dom.btnMic.classList.remove('listening');
        this.dom.micStateLabel.textContent = 'Microphone Ready (Click or Spacebar)';
        this.dom.micStateLabel.previousElementSibling.style.background = '#10b981';
      }
    };

    this.voiceEngine.onError = (errMsg) => {
      this.showNotification(errMsg);
    };

    this.featureTree.onTreeUpdated = (features) => {
      this.renderFeatureTree(features);
    };
  }

  setupUI() {
    // Drawer Toggle
    this.dom.sideDrawer.classList.add('collapsed'); // Default collapsed for clean view
    this.dom.btnToggleSidePanel.addEventListener('click', () => {
      this.dom.sideDrawer.classList.toggle('collapsed');
    });
    this.dom.btnCloseDrawer.addEventListener('click', () => {
      this.dom.sideDrawer.classList.add('collapsed');
    });

    // Mic Button
    this.dom.btnMic.addEventListener('click', () => {
      this.voiceEngine.toggleListening();
    });

    // Form Submit
    this.dom.commandForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = this.dom.commandInput.value.trim();
      if (text) {
        this.executeCommand(text);
        this.dom.commandInput.value = '';
      }
    });

    // Inspiration Chips
    document.querySelectorAll('.pill-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const cmd = chip.getAttribute('data-cmd');
        this.executeCommand(cmd);
      });
    });

    // Material Cards
    document.querySelectorAll('.mat-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.mat-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const mat = card.getAttribute('data-mat');
        this.cadEngine.setMaterial(mat);
        this.updateMessage(`Appearance set to ${mat}.`);
      });
    });

    // View Presets
    document.querySelectorAll('.glass-pill-group .pill-btn[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.glass-pill-group .pill-btn[data-view]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.cadEngine.setCameraView(btn.getAttribute('data-view'));
      });
    });

    // Viewport Actions
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

    // Export STL
    this.dom.btnQuickExportSTL.addEventListener('click', () => {
      this.cadEngine.exportSTL('voxcad_design.stl');
      this.showNotification('Exported 3D printable STL file!');
    });

    // Copy Python Code
    this.dom.btnCopyCode.addEventListener('click', () => {
      const code = this.featureTree.generatePythonCADCode();
      navigator.clipboard.writeText(code).then(() => {
        this.showNotification('Copied build123d / SolidWorks Python CAD code to clipboard!');
      });
    });

    // Selection Dismiss
    this.dom.btnDismissSelection.addEventListener('click', () => {
      this.cadEngine.clearSelection();
    });

    // Notification Banner Close
    this.dom.btnCloseNotification.addEventListener('click', () => {
      this.dom.notificationBanner.classList.add('hidden');
    });

    // Clear All
    this.dom.btnClearAll.addEventListener('click', () => {
      if (confirm('Clear canvas and reset?')) {
        this.featureTree.clear();
        this.updateMessage('Canvas reset.');
      }
    });

    // Keyboard Shortcuts
    let spaceDown = false;
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;

      if (e.code === 'Space' && !spaceDown) {
        spaceDown = true;
        e.preventDefault();
        this.voiceEngine.startListening();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        this.featureTree.undo();
        this.updateMessage('Undid last feature.');
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space' && spaceDown) {
        spaceDown = false;
        e.preventDefault();
        this.voiceEngine.stopListening();
      }
    });
  }

  async executeCommand(rawText) {
    if (!rawText) return;

    const selectedFace = this.cadEngine.selectedFace;
    const intent = this.intentParser.parse(rawText, selectedFace, this.featureTree.features);

    if (!intent) return;

    switch (intent.type) {
      case 'AMBIGUITY':
        this.updateMessage(intent.question);
        this.voiceEngine.speak(intent.question);
        break;

      case 'CREATE_STEALTH_DRONE':
      case 'CREATE_TWISTED_TOWER':
      case 'CREATE_REACTOR_CORE':
      case 'CREATE_CYBER_HELMET':
      case 'CREATE_ROBOTIC_CLAW':
      case 'CREATE_GEAR':
      case 'CREATE_BOX':
      case 'CREATE_CYLINDER':
      case 'CREATE_SPHERE':
      case 'CUT_HOLE':
      case 'EXTRUDE_FACE':
        await this.featureTree.addOperation({
          ...intent,
          description: intent.message
        });
        this.updateMessage(intent.message);
        this.voiceEngine.speak(intent.message);
        this.cadEngine.clearSelection();
        break;

      case 'CAMERA_VIEW':
        if (intent.view === 'reset') {
          this.cadEngine.resetCamera();
        } else {
          this.cadEngine.setCameraView(intent.view);
          document.querySelectorAll('.glass-pill-group .pill-btn[data-view]').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-view') === intent.view);
          });
        }
        this.updateMessage(intent.message);
        break;

      case 'TOGGLE_WIREFRAME':
        const wire = this.cadEngine.toggleWireframe();
        this.dom.btnToggleWireframe.classList.toggle('active', wire);
        this.updateMessage(wire ? 'Wireframe enabled' : 'Solid shaded mode');
        break;

      case 'TOGGLE_GRID':
        const grid = this.cadEngine.toggleGrid();
        this.dom.btnToggleGrid.classList.toggle('active', grid);
        this.updateMessage(grid ? 'Grid enabled' : 'Grid hidden');
        break;

      case 'UNDO':
        const undone = await this.featureTree.undo();
        this.updateMessage(undone ? 'Undid last feature.' : 'Nothing to undo.');
        this.voiceEngine.speak(undone ? 'Undid last feature' : 'Nothing to undo');
        break;

      case 'REDO':
        const redone = await this.featureTree.redo();
        this.updateMessage(redone ? 'Redid feature.' : 'Nothing to redo.');
        break;

      case 'CLEAR_ALL':
        await this.featureTree.clear();
        this.updateMessage('Canvas reset to empty.');
        this.voiceEngine.speak('Canvas cleared');
        break;

      case 'SET_MATERIAL':
        this.cadEngine.setMaterial(intent.material);
        document.querySelectorAll('.mat-card').forEach(c => {
          c.classList.toggle('active', c.getAttribute('data-mat') === intent.material);
        });
        this.updateMessage(intent.message);
        this.voiceEngine.speak(intent.message);
        break;

      default:
        this.updateMessage(`Processed: "${rawText}"`);
        break;
    }
  }

  updateMessage(msg) {
    this.dom.aiMessage.textContent = msg;
  }

  showNotification(text) {
    this.dom.notificationText.textContent = text;
    this.dom.notificationBanner.classList.remove('hidden');
    setTimeout(() => {
      this.dom.notificationBanner.classList.add('hidden');
    }, 6000);
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
        <div class="feature-node-info">
          <span class="feature-node-title">#${index + 1} ${feat.type.replace('CREATE_', '').replace('_', ' ')}</span>
          <span class="feature-node-desc">${feat.description || 'Feature'}</span>
        </div>
        <button class="feature-delete-btn" title="Delete" data-id="${feat.id}">×</button>
      `;

      node.querySelector('.feature-delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.featureTree.removeOperation(feat.id);
      });

      list.appendChild(node);
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new VoxCADApp();
});
