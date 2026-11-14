/**
 * VoxCAD — Conversational & Parametric 3D Studio Orchestrator
 */

import { CADEngine } from './cad-engine.js';
import { VoiceEngine } from './voice-engine.js';
import { IntentParser } from './intent-parser.js';
import { FeatureTree } from './feature-tree.js';
import { GeminiSynthesizer } from './gemini-synthesizer.js';

class VoxCADApp {
  constructor() {
    this.cadEngine = null;
    this.voiceEngine = null;
    this.intentParser = null;
    this.featureTree = null;
    this.geminiSynthesizer = null;

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
      selectionChip: document.getElementById('selectionChip'),
      selectedEntityLabel: document.getElementById('selectedEntityLabel'),
      btnDismissSelection: document.getElementById('btnDismissSelection'),
      btnQuickExportSTL: document.getElementById('btnQuickExportSTL'),
      featureTreeList: document.getElementById('featureTreeList'),
      emptyTreeState: document.getElementById('emptyTreeState'),
      btnClearAll: document.getElementById('btnClearAll'),
      btnToggleTurntable: document.getElementById('btnToggleTurntable'),
      btnToggleWireframe: document.getElementById('btnToggleWireframe'),
      btnToggleGrid: document.getElementById('btnToggleGrid'),
      btnResetCamera: document.getElementById('btnResetCamera'),
      standbyOverlay: document.getElementById('standbyOverlay'),
      btnTestMic: document.getElementById('btnTestMic'),
      btnAiKey: document.getElementById('btnAiKey'),
      aiStatusDot: document.getElementById('aiStatusDot'),
      aiBtnLabel: document.getElementById('aiBtnLabel'),
      aiModal: document.getElementById('aiModal'),
      btnCloseAiModal: document.getElementById('btnCloseAiModal'),
      inputApiKey: document.getElementById('inputApiKey'),
      btnSaveApiKey: document.getElementById('btnSaveApiKey'),
      btnClearApiKey: document.getElementById('btnClearApiKey'),
      btnToggleKeyVisibility: document.getElementById('btnToggleKeyVisibility'),
      aiTestStatus: document.getElementById('aiTestStatus')
    };

    this.init();
  }

  async init() {
    try {
      this.cadEngine = new CADEngine(this.dom.container, this.dom.canvas);
      this.featureTree = new FeatureTree(this.cadEngine);
      this.intentParser = new IntentParser();
      this.voiceEngine = new VoiceEngine();
      this.geminiSynthesizer = new GeminiSynthesizer(this.cadEngine);

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
      if (this.dom.metricFacesVal) {
        this.dom.metricFacesVal.textContent = stats.faces.toLocaleString();
      }
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
        if (this.dom.micStateLabel.previousElementSibling) {
          this.dom.micStateLabel.previousElementSibling.style.background = '#f43f5e';
        }
      } else {
        this.dom.btnMic.classList.remove('listening');
        this.dom.micStateLabel.textContent = 'Microphone Ready (Click or Spacebar)';
        if (this.dom.micStateLabel.previousElementSibling) {
          this.dom.micStateLabel.previousElementSibling.style.background = '#10b981';
        }
      }
    };

    this.voiceEngine.onError = (errMsg) => {
      this.showNotification(errMsg);
    };

    this.featureTree.onTreeUpdated = (features) => {
      this.renderFeatureTree(features);
    };
  }

  updateAiKeyStatus() {
    const hasKey = this.geminiSynthesizer.hasApiKey();
    if (this.dom.aiStatusDot) {
      this.dom.aiStatusDot.classList.toggle('active', hasKey);
    }
    if (this.dom.aiBtnLabel) {
      this.dom.aiBtnLabel.textContent = hasKey ? '✨ AI Online' : '✨ AI Key';
    }
  }

  showAiModalStatus(msg, isSuccess) {
    if (!this.dom.aiTestStatus) return;
    this.dom.aiTestStatus.textContent = msg;
    this.dom.aiTestStatus.className = 'test-status';
    if (isSuccess === true) {
      this.dom.aiTestStatus.classList.add('success');
    } else if (isSuccess === false) {
      this.dom.aiTestStatus.classList.add('error');
    }
    this.dom.aiTestStatus.classList.remove('hidden');
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

    // AI Key Modal Interactions
    this.updateAiKeyStatus();

    if (this.dom.btnAiKey) {
      this.dom.btnAiKey.addEventListener('click', () => {
        if (this.dom.inputApiKey) {
          this.dom.inputApiKey.value = this.geminiSynthesizer.apiKey || '';
        }
        if (this.dom.aiTestStatus) {
          this.dom.aiTestStatus.classList.add('hidden');
        }
        if (this.dom.aiModal) {
          this.dom.aiModal.classList.remove('hidden');
        }
      });
    }

    if (this.dom.btnCloseAiModal) {
      this.dom.btnCloseAiModal.addEventListener('click', () => {
        this.dom.aiModal.classList.add('hidden');
      });
    }

    if (this.dom.aiModal) {
      this.dom.aiModal.addEventListener('click', (e) => {
        if (e.target === this.dom.aiModal) {
          this.dom.aiModal.classList.add('hidden');
        }
      });
    }

    if (this.dom.btnToggleKeyVisibility) {
      this.dom.btnToggleKeyVisibility.addEventListener('click', () => {
        const isPwd = this.dom.inputApiKey.type === 'password';
        this.dom.inputApiKey.type = isPwd ? 'text' : 'password';
        this.dom.btnToggleKeyVisibility.textContent = isPwd ? '🙈' : '👁️';
      });
    }

    if (this.dom.btnSaveApiKey) {
      this.dom.btnSaveApiKey.addEventListener('click', async () => {
        const key = (this.dom.inputApiKey.value || '').trim();
        if (!key) {
          this.showAiModalStatus('Please enter your Gemini API key.', false);
          return;
        }

        this.showAiModalStatus('Connecting to Google AI Studio...', null);
        try {
          await this.geminiSynthesizer.testConnection(key);
          this.geminiSynthesizer.setApiKey(key);
          this.updateAiKeyStatus();
          this.showAiModalStatus('✨ Verified! Gemini 3D Engine is online and ready.', true);
          setTimeout(() => {
            this.dom.aiModal.classList.add('hidden');
            this.showNotification('✨ Gemini 3D Engine active! Speak or type any concept to generate.');
          }, 1200);
        } catch (err) {
          this.showAiModalStatus(`Verification failed: ${err.message}`, false);
        }
      });
    }

    if (this.dom.btnClearApiKey) {
      this.dom.btnClearApiKey.addEventListener('click', () => {
        this.geminiSynthesizer.setApiKey('');
        this.dom.inputApiKey.value = '';
        this.updateAiKeyStatus();
        this.showAiModalStatus('Key cleared. Offline procedural modeler active.', false);
        setTimeout(() => {
          this.dom.aiModal.classList.add('hidden');
        }, 800);
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

      if (e.key === 'Escape' && this.dom.aiModal && !this.dom.aiModal.classList.contains('hidden')) {
        this.dom.aiModal.classList.add('hidden');
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

    // Direct UI, View, Material, or History commands
    if (intent.type === 'CAMERA_VIEW') {
      if (intent.view === 'reset') {
        this.cadEngine.resetCamera();
      } else {
        this.cadEngine.setCameraView(intent.view);
        document.querySelectorAll('.glass-pill-group .pill-btn[data-view]').forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-view') === intent.view);
        });
      }
      this.updateMessage(intent.message);
      return;
    }

    if (intent.type === 'TOGGLE_WIREFRAME') {
      const wire = this.cadEngine.toggleWireframe();
      this.dom.btnToggleWireframe.classList.toggle('active', wire);
      this.updateMessage(wire ? 'Wireframe mode' : 'Solid shaded mode');
      return;
    }

    if (intent.type === 'TOGGLE_GRID') {
      const active = this.cadEngine.toggleGrid();
      this.dom.btnToggleGrid.classList.toggle('active', active);
      this.updateMessage(active ? 'Grid floor visible' : 'Grid floor hidden');
      return;
    }

    if (intent.type === 'TOGGLE_AUTOROTATE') {
      const rot = this.cadEngine.toggleAutoRotate();
      this.dom.btnToggleTurntable.classList.toggle('active', rot);
      this.updateMessage(rot ? 'Showcase rotation enabled' : 'Rotation paused');
      return;
    }

    if (intent.type === 'SET_MATERIAL') {
      this.cadEngine.setMaterial(intent.material);
      document.querySelectorAll('.mat-card').forEach(c => {
        c.classList.toggle('active', c.getAttribute('data-mat') === intent.material);
      });
      const matMsg = `Appearance updated to ${intent.material}.`;
      this.updateMessage(matMsg);
      this.voiceEngine.speak(matMsg);
      return;
    }

    if (intent.type === 'UNDO') {
      const undone = this.featureTree.undo();
      this.updateMessage(undone ? 'Undid last feature.' : 'Nothing to undo.');
      this.voiceEngine.speak(undone ? 'Undid last feature' : 'Nothing to undo');
      return;
    }

    if (intent.type === 'REDO') {
      const redone = this.featureTree.redo();
      this.updateMessage(redone ? 'Redid feature.' : 'Nothing to redo.');
      return;
    }

    if (intent.type === 'CLEAR_ALL') {
      this.featureTree.clear();
      this.showStandbyState(true);
      this.updateMessage('Canvas reset to blank.');
      this.voiceEngine.speak('Canvas cleared');
      return;
    }

    if (intent.type === 'AMBIGUITY') {
      this.updateMessage(intent.question);
      this.voiceEngine.speak(intent.question);
      return;
    }

    // -------------------------------------------------------------
    // GENERATIVE 3D SYNTHESIS: Lingua Franca (Model Anything)
    // -------------------------------------------------------------
    // If Gemini API Key is connected, synthesize bespoke 3D geometry dynamically!
    if (this.geminiSynthesizer.hasApiKey()) {
      this.updateMessage(`✨ Gemini is synthesizing 3D geometry for "${rawText}"...`);
      try {
        const result = await this.geminiSynthesizer.synthesizeConcept(rawText);
        this.featureTree.addOperation({
          type: 'GENAI_DYNAMIC_MODEL',
          group: result.group,
          displayTitle: result.title,
          description: result.summary
        });

        this.showStandbyState(false);
        this.cadEngine.clearSelection();

        const voiceText = `Created ${result.title}. Metrics and manual sliders are ready on the side panel. Would you like any adjustments?`;
        this.updateMessage(result.summary || `Synthesized ${result.title}`);

        this.isAwaitingFollowup = true;
        this.voiceEngine.speak(voiceText, () => {
          this.voiceEngine.startFollowupListening(() => {
            this.isAwaitingFollowup = false;
            this.updateMessage('Standing by.');
          });
        });
        return;
      } catch (err) {
        console.warn('Gemini 3D synthesis error, falling back to procedural engine:', err);
        this.showNotification(`AI note: ${err.message}. Using offline 3D modeler.`);
      }
    }

    // Offline Procedural Engine (Handles all anatomy, fine art, automotive, architecture, mechanical, and universal harmonic manifolds)
    if (intent.type.startsWith('CREATE_') || intent.type.startsWith('CUT_') || intent.type.startsWith('EXTRUDE_')) {
      this.featureTree.addOperation({
        ...intent,
        description: intent.message
      });

      this.showStandbyState(false);
      this.cadEngine.clearSelection();

      const displayTitle = intent.displayTitle || intent.type.replace('CREATE_', '').replace(/_/g, ' ').toLowerCase();
      const voiceText = `Created ${displayTitle}. Metrics and manual sliders are ready on the side panel. Would you like any adjustments?`;
      this.updateMessage(intent.message || `Created ${displayTitle}`);

      this.isAwaitingFollowup = true;
      this.voiceEngine.speak(voiceText, () => {
        this.voiceEngine.startFollowupListening(() => {
          this.isAwaitingFollowup = false;
          this.updateMessage('Standing by.');
        });
      });
      return;
    }

    this.updateMessage(`Processed: "${rawText}"`);
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
          <span class="feature-node-title">#${index + 1} ${feat.displayTitle || feat.type.replace('CREATE_', '').replace(/_/g, ' ')}</span>
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
