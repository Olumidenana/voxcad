/**
 * VoxCAD — Conversational & Parametric 3D Studio Orchestrator
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

    this.isAwaitingFollowup = false;

    this.dom = {
      container: document.getElementById('viewportContainer'),
      canvas: document.getElementById('threeCanvas'),
      btnToggleSidePanel: document.getElementById('btnToggleSidePanel'),
      btnCloseDrawer: document.getElementById('btnCloseDrawer'),
      sideDrawer: document.getElementById('sideDrawer'),
      btnToggleInspector: document.getElementById('btnToggleInspector'),
      btnCloseInspector: document.getElementById('btnCloseInspector'),
      metricInspector: document.getElementById('metricInspector'),
      metricObjectTitle: document.getElementById('metricObjectTitle'),
      metricLengthVal: document.getElementById('metricLengthVal'),
      metricWidthVal: document.getElementById('metricWidthVal'),
      metricHeightVal: document.getElementById('metricHeightVal'),
      metricFacesVal: document.getElementById('metricFacesVal'),
      sliderScaleX: document.getElementById('sliderScaleX'),
      scaleXNum: document.getElementById('scaleXNum'),
      sliderScaleY: document.getElementById('sliderScaleY'),
      scaleYNum: document.getElementById('scaleYNum'),
      sliderScaleZ: document.getElementById('sliderScaleZ'),
      scaleZNum: document.getElementById('scaleZNum'),
      sliderRotation: document.getElementById('sliderRotation'),
      rotationNum: document.getElementById('rotationNum'),
      btnResetTweaks: document.getElementById('btnResetTweaks'),
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

      // Start 100% BLANK
      this.featureTree.clear();
      this.showStandbyState(true);
      this.updateMessage('Canvas ready. Speak or type: "Mercedes car", "A tire", "A circle", "A coffee mug"...');
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
      this.dom.metricFacesVal.textContent = stats.faces.toLocaleString();
      this.showStandbyState(stats.faces === 0);
    };

    // Metrics Inspector live update
    this.featureTree.onMetricsUpdated = (metrics) => {
      if (metrics) {
        this.dom.metricObjectTitle.textContent = metrics.title || 'Active Design';
        this.dom.metricLengthVal.textContent = `${metrics.length} mm`;
        this.dom.metricWidthVal.textContent = `${metrics.width} mm`;
        this.dom.metricHeightVal.textContent = `${metrics.height} mm`;

        this.dom.sliderScaleX.value = metrics.scaleX || 1.0;
        this.dom.scaleXNum.textContent = `${(metrics.scaleX || 1.0).toFixed(2)}×`;
        this.dom.sliderScaleY.value = metrics.scaleY || 1.0;
        this.dom.scaleYNum.textContent = `${(metrics.scaleY || 1.0).toFixed(2)}×`;
        this.dom.sliderScaleZ.value = metrics.scaleZ || 1.0;
        this.dom.scaleZNum.textContent = `${(metrics.scaleZ || 1.0).toFixed(2)}×`;
        this.dom.sliderRotation.value = metrics.rotationY || 0;
        this.dom.rotationNum.textContent = `${metrics.rotationY || 0}°`;
      } else {
        this.dom.metricObjectTitle.textContent = 'Design Inspector';
        this.dom.metricLengthVal.textContent = '0 mm';
        this.dom.metricWidthVal.textContent = '0 mm';
        this.dom.metricHeightVal.textContent = '0 mm';
        this.dom.metricFacesVal.textContent = '0';
      }
    };

    this.voiceEngine.onTranscriptUpdate = (text) => {
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
          this.dom.micStateLabel.textContent = 'Listening for adjustments... (8s auto-timeout)';
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
    // Drawer Toggles
    this.dom.sideDrawer.classList.add('collapsed');
    this.dom.btnToggleSidePanel.addEventListener('click', () => {
      this.dom.sideDrawer.classList.toggle('collapsed');
    });
    this.dom.btnCloseDrawer.addEventListener('click', () => {
      this.dom.sideDrawer.classList.add('collapsed');
    });

    // Inspector Toggle
    this.dom.btnToggleInspector.addEventListener('click', () => {
      const isCollapsed = this.dom.metricInspector.classList.toggle('collapsed');
      this.dom.btnToggleInspector.classList.toggle('active', !isCollapsed);
    });
    this.dom.btnCloseInspector.addEventListener('click', () => {
      this.dom.metricInspector.classList.add('collapsed');
      this.dom.btnToggleInspector.classList.remove('active');
    });

    // Real-Time Manual Tweak Sliders
    const onSliderChange = () => {
      const sx = parseFloat(this.dom.sliderScaleX.value);
      const sy = parseFloat(this.dom.sliderScaleY.value);
      const sz = parseFloat(this.dom.sliderScaleZ.value);
      const rot = parseInt(this.dom.sliderRotation.value);

      this.dom.scaleXNum.textContent = `${sx.toFixed(2)}×`;
      this.dom.scaleYNum.textContent = `${sy.toFixed(2)}×`;
      this.dom.scaleZNum.textContent = `${sz.toFixed(2)}×`;
      this.dom.rotationNum.textContent = `${rot}°`;

      this.featureTree.updateActiveFeatureScale(sx, sy, sz);
      this.featureTree.updateActiveFeatureRotation(rot);
    };

    this.dom.sliderScaleX.addEventListener('input', onSliderChange);
    this.dom.sliderScaleY.addEventListener('input', onSliderChange);
    this.dom.sliderScaleZ.addEventListener('input', onSliderChange);
    this.dom.sliderRotation.addEventListener('input', onSliderChange);

    this.dom.btnResetTweaks.addEventListener('click', () => {
      this.dom.sliderScaleX.value = 1.0;
      this.dom.sliderScaleY.value = 1.0;
      this.dom.sliderScaleZ.value = 1.0;
      this.dom.sliderRotation.value = 0;
      onSliderChange();
    });

    // Mic Button
    this.dom.btnMic.addEventListener('click', () => {
      this.isAwaitingFollowup = false;
      this.voiceEngine.toggleListening();
    });

    if (this.dom.btnTestMic) {
      this.dom.btnTestMic.addEventListener('click', () => {
        this.voiceEngine.startListening();
        this.showNotification('Microphone activated. Speak something to test!');
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
      this.dom.btnToggleGrid.classList.toggle('active', grid);
      this.updateMessage(grid ? 'Grid floor visible' : 'Grid floor hidden');
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

  async executeCommand(rawText) {
    if (!rawText) return;
    const lower = rawText.toLowerCase().trim();

    if (this.isAwaitingFollowup && (lower.includes('no') || lower.includes('good') || lower.includes('fine') || lower.includes('perfect') || lower.includes('done') || lower.includes('stop'))) {
      this.isAwaitingFollowup = false;
      this.voiceEngine.stopListening();
      const exitMsg = "Understood. Design ready. Standing by.";
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

      case 'CREATE_MERCEDES_CAR':
      case 'CREATE_CAR':
      case 'CREATE_TIRE':
      case 'CREATE_WHEEL':
      case 'CREATE_CIRCLE':
      case 'CREATE_DISC':
      case 'CREATE_MUG':
      case 'CREATE_CUP':
      case 'CREATE_CHAIR':
      case 'CREATE_TABLE':
      case 'CREATE_SMARTPHONE':
      case 'CREATE_BOLT':
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
        this.featureTree.addOperation({
          ...intent,
          description: intent.message
        });

        this.showStandbyState(false);
        this.cadEngine.clearSelection();

        // Natural, concise voice response (dimensions are on the side panel!)
        const shortName = intent.type.replace('CREATE_', '').replace(/_/g, ' ').toLowerCase();
        const voiceText = `Created ${shortName}. Metrics and manual sliders are ready on the side panel. Would you like any adjustments?`;
        this.updateMessage(intent.message);

        this.isAwaitingFollowup = true;
        this.voiceEngine.speak(voiceText, () => {
          this.voiceEngine.startFollowupListening(() => {
            this.isAwaitingFollowup = false;
            this.updateMessage('Standing by.');
          });
        });
        break;

      case 'SET_MATERIAL':
        this.cadEngine.setMaterial(intent.material);
        document.querySelectorAll('.mat-card').forEach(c => {
          c.classList.toggle('active', c.getAttribute('data-mat') === intent.material);
        });
        const matMsg = `Appearance updated to ${intent.material}.`;
        this.updateMessage(matMsg);
        this.voiceEngine.speak(matMsg);
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
        this.updateMessage('Canvas reset to blank.');
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
          <span class="feature-node-title">#${index + 1} ${feat.type.replace('CREATE_', '').replace(/_/g, ' ')}</span>
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
