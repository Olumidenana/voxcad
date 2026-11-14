/**
 * VoxCAD — Conversational AI 3D Studio Orchestrator
 * Full Conversational Loop: Synthesize -> Explain & Prompt -> Follow-up -> Auto-Timeout
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

    // Conversational State
    this.isAwaitingFollowup = false;

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
      btnToggleTurntable: document.getElementById('btnToggleTurntable'),
      btnToggleWireframe: document.getElementById('btnToggleWireframe'),
      btnToggleGrid: document.getElementById('btnToggleGrid'),
      btnResetCamera: document.getElementById('btnResetCamera'),
      standbyOverlay: document.getElementById('standbyOverlay'),
      btnTestMic: document.getElementById('btnTestMic')
    };

    this.init();
  }

  async init() {
    try {
      this.cadEngine = new CADEngine(this.dom.container, this.dom.canvas);
      this.featureTree = new FeatureTree(this.cadEngine);
      this.intentParser = new IntentParser();
      this.voiceEngine = new VoiceEngine();

      this.setupSubsystems();
      this.setupUI();

      // Start with 100% BLANK canvas
      this.featureTree.clear();
      this.showStandbyState(true);
      this.updateMessage('Awaiting your vision. Tap the mic or type: "Create a stealth drone", "Hypercar", or "Twisted tower"...');
    } catch (err) {
      console.error('VoxCAD failed to initialize:', err);
      this.showNotification(`Error: ${err.message}`);
    }
  }

  setupSubsystems() {
    this.cadEngine.onSelectionChanged = (faceInfo) => {
      if (faceInfo) {
        this.dom.selectedEntityLabel.textContent = `${faceInfo.name} Selected`;
        this.dom.selectionChip.classList.remove('hidden');
      } else {
        this.dom.selectionChip.classList.add('hidden');
      }
    };

    this.cadEngine.onGeometryUpdated = (stats) => {
      this.dom.statFaces.textContent = stats.faces.toLocaleString();
      this.dom.statBounds.textContent = stats.bounds;
      this.showStandbyState(stats.faces === 0);
    };

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
        if (this.isAwaitingFollowup) {
          this.dom.micStateLabel.textContent = 'Listening for your changes... (8s auto-timeout)';
        } else {
          this.dom.micStateLabel.textContent = 'Listening... Speak your vision now';
        }
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
    this.dom.sideDrawer.classList.add('collapsed');
    this.dom.btnToggleSidePanel.addEventListener('click', () => {
      this.dom.sideDrawer.classList.toggle('collapsed');
    });
    this.dom.btnCloseDrawer.addEventListener('click', () => {
      this.dom.sideDrawer.classList.add('collapsed');
    });

    this.dom.btnMic.addEventListener('click', () => {
      this.isAwaitingFollowup = false;
      this.voiceEngine.toggleListening();
    });

    if (this.dom.btnTestMic) {
      this.dom.btnTestMic.addEventListener('click', () => {
        this.voiceEngine.startListening();
        this.showNotification('Microphone activated. Say something to test!');
      });
    }

    this.dom.commandForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = this.dom.commandInput.value.trim();
      if (text) {
        this.executeCommand(text);
        this.dom.commandInput.value = '';
      }
    });

    document.querySelectorAll('.pill-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const cmd = chip.getAttribute('data-cmd');
        this.executeCommand(cmd);
      });
    });

    document.querySelectorAll('.mat-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.mat-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const mat = card.getAttribute('data-mat');
        this.cadEngine.setMaterial(mat);
        this.updateMessage(`Appearance set to ${mat}.`);
      });
    });

    document.querySelectorAll('.glass-pill-group .pill-btn[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.glass-pill-group .pill-btn[data-view]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.cadEngine.setCameraView(btn.getAttribute('data-view'));
      });
    });

    this.dom.btnToggleTurntable.addEventListener('click', () => {
      const active = this.cadEngine.toggleAutoRotate();
      this.dom.btnToggleTurntable.classList.toggle('active', active);
      this.updateMessage(active ? 'Showcase rotation enabled' : 'Rotation paused');
    });

    this.dom.btnToggleWireframe.addEventListener('click', () => {
      const active = this.cadEngine.toggleWireframe();
      this.dom.btnToggleWireframe.classList.toggle('active', active);
      this.updateMessage(active ? 'Wireframe mode' : 'Solid shaded mode');
    });

    this.dom.btnToggleGrid.addEventListener('click', () => {
      const active = this.cadEngine.toggleGrid();
      this.dom.btnToggleGrid.classList.toggle('active', active);
      this.updateMessage(active ? 'Grid floor visible' : 'Grid floor hidden');
    });

    this.dom.btnResetCamera.addEventListener('click', () => {
      this.cadEngine.resetCamera();
    });

    this.dom.btnQuickExportSTL.addEventListener('click', () => {
      this.cadEngine.exportSTL('voxcad_design.stl');
      this.showNotification('Exported 3D printable STL file!');
    });

    this.dom.btnCopyCode.addEventListener('click', () => {
      const code = this.featureTree.generatePythonCADCode();
      navigator.clipboard.writeText(code).then(() => {
        this.showNotification('Copied build123d / SolidWorks Python CAD code to clipboard!');
      });
    });

    this.dom.btnDismissSelection.addEventListener('click', () => {
      this.cadEngine.clearSelection();
    });

    this.dom.btnCloseNotification.addEventListener('click', () => {
      this.dom.notificationBanner.classList.add('hidden');
    });

    this.dom.btnClearAll.addEventListener('click', () => {
      this.featureTree.clear();
      this.showStandbyState(true);
      this.updateMessage('Canvas reset to blank.');
    });

    let spaceDown = false;
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;

      if (e.code === 'Space' && !spaceDown) {
        spaceDown = true;
        e.preventDefault();
        this.isAwaitingFollowup = false;
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

  showStandbyState(show) {
    if (this.dom.standbyOverlay) {
      if (show) {
        this.dom.standbyOverlay.classList.remove('hidden');
      } else {
        this.dom.standbyOverlay.classList.add('hidden');
      }
    }
  }

  /**
   * Main Conversational Command Processor:
   * 1. Synthesizes geometry
   * 2. Explains what has been created
   * 3. Inquires: "Would you like to make any changes?"
   * 4. Listens for 8 seconds, automatically timing out if user stays silent
   */
  async executeCommand(rawText) {
    if (!rawText) return;

    const lower = rawText.toLowerCase().trim();

    // Check if user is saying "No / looks good / that's all" during follow-up
    if (this.isAwaitingFollowup && (lower.includes('no') || lower.includes('good') || lower.includes('fine') || lower.includes('perfect') || lower.includes('done') || lower.includes('stop'))) {
      this.isAwaitingFollowup = false;
      this.voiceEngine.stopListening();
      const exitMsg = "Understood. Your design is ready. Standing by.";
      this.updateMessage(exitMsg);
      this.voiceEngine.speak(exitMsg);
      return;
    }

    const selectedFace = this.cadEngine.selectedFace;
    const intent = this.intentParser.parse(rawText, selectedFace, this.featureTree.features);

    if (!intent) return;

    switch (intent.type) {
      case 'AMBIGUITY':
        this.updateMessage(intent.question);
        this.voiceEngine.speak(intent.question);
        break;

      case 'CREATE_HYPERCAR':
      case 'CREATE_SATELLITE':
      case 'CREATE_STEALTH_DRONE':
      case 'CREATE_TWISTED_TOWER':
      case 'CREATE_REACTOR_CORE':
      case 'CREATE_CYBER_HELMET':
      case 'CREATE_ROBOTIC_CLAW':
      case 'CREATE_GEAR':
      case 'CREATE_PLATE_WITH_HOLE':
      case 'CREATE_BOX':
      case 'CREATE_CYLINDER':
      case 'CREATE_SPHERE':
      case 'CUT_HOLE':
      case 'EXTRUDE_FACE':
        await this.featureTree.addOperation({
          ...intent,
          description: intent.message
        });

        this.showStandbyState(false);
        this.cadEngine.clearSelection();

        // Conversational Explanation & Inquiry
        const inquirySpeech = `${intent.message} Would you like to make any changes, adjust dimensions, or change the material?`;
        this.updateMessage(inquirySpeech);

        this.isAwaitingFollowup = true;
        this.voiceEngine.speak(inquirySpeech, () => {
          // As soon as AI speech finishes, listen for 8 seconds
          this.voiceEngine.startFollowupListening(() => {
            // Inactivity timeout reached
            this.isAwaitingFollowup = false;
            this.updateMessage('Standing by. Press Spacebar or tap the mic whenever you are ready.');
            this.voiceEngine.speak('Standing by.');
          });
        });
        break;

      case 'SET_MATERIAL':
        this.cadEngine.setMaterial(intent.material);
        document.querySelectorAll('.mat-card').forEach(c => {
          c.classList.toggle('active', c.getAttribute('data-mat') === intent.material);
        });
        const matMsg = `Appearance updated to ${intent.material}. Would you like any other changes?`;
        this.updateMessage(matMsg);

        this.isAwaitingFollowup = true;
        this.voiceEngine.speak(matMsg, () => {
          this.voiceEngine.startFollowupListening(() => {
            this.isAwaitingFollowup = false;
            this.updateMessage('Standing by.');
          });
        });
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
        this.updateMessage(wire ? 'Wireframe mode' : 'Solid shaded mode');
        break;

      case 'TOGGLE_GRID':
        const grid = this.cadEngine.toggleGrid();
        this.dom.btnToggleGrid.classList.toggle('active', grid);
        this.updateMessage(grid ? 'Grid floor visible' : 'Grid floor hidden');
        break;

      case 'TOGGLE_AUTOROTATE':
        const rot = this.cadEngine.toggleAutoRotate();
        this.dom.btnToggleTurntable.classList.toggle('active', rot);
        this.updateMessage(rot ? 'Showcase rotation enabled' : 'Rotation paused');
        break;

      case 'UNDO':
        const undone = this.featureTree.undo();
        this.updateMessage(undone ? 'Undid last feature.' : 'Nothing to undo.');
        this.voiceEngine.speak(undone ? 'Undid last feature' : 'Nothing to undo');
        break;

      case 'REDO':
        const redone = this.featureTree.redo();
        this.updateMessage(redone ? 'Redid feature.' : 'Nothing to redo.');
        break;

      case 'CLEAR_ALL':
        this.featureTree.clear();
        this.showStandbyState(true);
        this.updateMessage('Canvas cleared. Ready for your next design.');
        this.voiceEngine.speak('Canvas cleared');
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
    }, 7000);
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
