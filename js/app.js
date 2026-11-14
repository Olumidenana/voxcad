/**
 * VoxCAD — Conversational & Parametric 3D Studio Orchestrator
 * Advanced Multi-Object Scene Graph with Transform Gizmo, Library Vault & True Lingua Franca
 */

import { CADEngine } from './cad-engine.js';
import { VoiceEngine } from './voice-engine.js';
import { IntentParser } from './intent-parser.js';
import { FeatureTree } from './feature-tree.js';
import { GeminiSynthesizer } from './gemini-synthesizer.js';
import { LibraryManager } from './library-manager.js';
import * as THREE from 'three';

class VoxCADApp {
  constructor() {
    this.cadEngine = null;
    this.voiceEngine = null;
    this.intentParser = null;
    this.featureTree = null;
    this.geminiSynthesizer = null;
    this.libraryManager = null;

    this.isAwaitingFollowup = false;
    this.stagedImage = null;

    this.dom = {
      container: document.getElementById('viewportContainer'),
      canvas: document.getElementById('threeCanvas'),
      btnToggleSidePanel: document.getElementById('btnToggleSidePanel'),
      btnCloseDrawer: document.getElementById('btnCloseDrawer'),
      sideDrawer: document.getElementById('sideDrawer'),
      tabBtnScene: document.getElementById('tabBtnScene'),
      tabBtnLibrary: document.getElementById('tabBtnLibrary'),
      drawerSceneView: document.getElementById('drawerSceneView'),
      drawerLibraryView: document.getElementById('drawerLibraryView'),
      sceneCountBadge: document.getElementById('sceneCountBadge'),
      sceneEntityList: document.getElementById('sceneEntityList'),
      emptyTreeState: document.getElementById('emptyTreeState'),
      libraryList: document.getElementById('libraryList'),
      emptyLibraryState: document.getElementById('emptyLibraryState'),
      btnSaveToLibrary: document.getElementById('btnSaveToLibrary'),
      btnToggleInspector: document.getElementById('btnToggleInspector'),
      btnCloseInspector: document.getElementById('btnCloseInspector'),
      metricInspector: document.getElementById('metricInspector'),
      metricObjectTitle: document.getElementById('metricObjectTitle'),
      metricLengthVal: document.getElementById('metricLengthVal'),
      metricWidthVal: document.getElementById('metricWidthVal'),
      metricHeightVal: document.getElementById('metricHeightVal'),
      metricFacesVal: document.getElementById('metricFacesVal'),
      sliderPosX: document.getElementById('sliderPosX'),
      posXNum: document.getElementById('posXNum'),
      sliderPosZ: document.getElementById('sliderPosZ'),
      posZNum: document.getElementById('posZNum'),
      sliderScaleX: document.getElementById('sliderScaleX'),
      scaleXNum: document.getElementById('scaleXNum'),
      sliderScaleY: document.getElementById('sliderScaleY'),
      scaleYNum: document.getElementById('scaleYNum'),
      sliderScaleZ: document.getElementById('sliderScaleZ'),
      scaleZNum: document.getElementById('scaleZNum'),
      sliderRotation: document.getElementById('sliderRotation'),
      rotationNum: document.getElementById('rotationNum'),
      btnResetTweaks: document.getElementById('btnResetTweaks'),
      btnGizmoTranslate: document.getElementById('btnGizmoTranslate'),
      btnGizmoRotate: document.getElementById('btnGizmoRotate'),
      btnGizmoScale: document.getElementById('btnGizmoScale'),
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
      btnClearAll: document.getElementById('btnClearAll'),
      btnToggleTurntable: document.getElementById('btnToggleTurntable'),
      btnToggleWireframe: document.getElementById('btnToggleWireframe'),
      btnToggleGrid: document.getElementById('btnToggleGrid'),
      btnToggleInterior: document.getElementById('btnToggleInterior'),
      interiorModeLabel: document.getElementById('interiorModeLabel'),
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
      aiTestStatus: document.getElementById('aiTestStatus'),
      btnUploadImage: document.getElementById('btnUploadImage'),
      imageFileInput: document.getElementById('imageFileInput'),
      imageStageChip: document.getElementById('imageStageChip'),
      imageStageThumb: document.getElementById('imageStageThumb'),
      imageStageName: document.getElementById('imageStageName'),
      btnRemoveImage: document.getElementById('btnRemoveImage')
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
      this.libraryManager = new LibraryManager();

      this.setupSubsystems();
      this.setupUI();

      // Ensure modal is strictly hidden on boot
      if (this.dom.aiModal) {
        this.dom.aiModal.style.display = 'none';
        this.dom.aiModal.classList.add('hidden');
      }

      // Initial Library render
      this.renderLibrary(this.libraryManager.getLibrary());

      // Start 100% BLANK
      this.cadEngine.clearAllEntities();
      this.showStandbyState(true);
      this.updateMessage('Canvas ready. Speak, upload an image, or type any 3D concept.');
    } catch (err) {
      console.error('VoxCAD failed to initialize:', err);
      this.showNotification(`Error: ${err.message}`);
    }
  }

  setupSubsystems() {
    // Multi-Object Scene Updates
    this.cadEngine.onSceneUpdated = (entities, selected) => {
      if (this.dom.sceneCountBadge) {
        this.dom.sceneCountBadge.textContent = entities.length;
      }
      this.renderSceneOutliner(entities, selected);
      this.showStandbyState(entities.length === 0);
      if (selected) {
        this.updateInspectorForEntity(selected);
      } else {
        this.clearInspector();
      }
    };

    // Selection changes (from canvas clicks or list)
    this.cadEngine.onSelectionChanged = (selected) => {
      if (selected) {
        this.updateInspectorForEntity(selected);
      } else {
        this.clearInspector();
      }
      this.renderSceneOutliner(this.cadEngine.entities, selected);
    };

    // Live update when dragging 3D Gizmo
    this.cadEngine.onEntityTransformed = (entity) => {
      if (entity) {
        this.updateInspectorForEntity(entity);
      }
    };

    this.libraryManager.onLibraryChanged = (items) => {
      this.renderLibrary(items);
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
  }

  updateInspectorForEntity(entity) {
    if (!entity) return;
    this.dom.metricObjectTitle.textContent = entity.name || 'Selected Object';
    this.dom.metricLengthVal.textContent = `${entity.metrics?.length || 0} mm`;
    this.dom.metricWidthVal.textContent = `${entity.metrics?.width || 0} mm`;
    this.dom.metricHeightVal.textContent = `${entity.metrics?.height || 0} mm`;
    this.dom.metricFacesVal.textContent = (entity.metrics?.faces || 0).toLocaleString();

    // Position Sliders
    const px = Math.round(entity.mesh.position.x);
    const pz = Math.round(entity.mesh.position.z);
    this.dom.sliderPosX.value = px;
    this.dom.posXNum.textContent = `${px} mm`;
    this.dom.sliderPosZ.value = pz;
    this.dom.posZNum.textContent = `${pz} mm`;

    // Scale Sliders
    const sx = entity.mesh.scale.x;
    const sy = entity.mesh.scale.y;
    const sz = entity.mesh.scale.z;
    this.dom.sliderScaleX.value = sx;
    this.dom.scaleXNum.textContent = `${sx.toFixed(2)}×`;
    this.dom.sliderScaleY.value = sy;
    this.dom.scaleYNum.textContent = `${sy.toFixed(2)}×`;
    this.dom.sliderScaleZ.value = sz;
    this.dom.scaleZNum.textContent = `${sz.toFixed(2)}×`;

    // Rotation
    const rotDeg = Math.round(THREE.MathUtils.radToDeg(entity.mesh.rotation.y)) % 360;
    const normalizedDeg = rotDeg >= 0 ? rotDeg : rotDeg + 360;
    this.dom.sliderRotation.value = normalizedDeg;
    this.dom.rotationNum.textContent = `${normalizedDeg}°`;
  }

  clearInspector() {
    this.dom.metricObjectTitle.textContent = 'Design Inspector';
    this.dom.metricLengthVal.textContent = '0 mm';
    this.dom.metricWidthVal.textContent = '0 mm';
    this.dom.metricHeightVal.textContent = '0 mm';
    this.dom.metricFacesVal.textContent = '0';
    this.dom.posXNum.textContent = '0 mm';
    this.dom.posZNum.textContent = '0 mm';
    this.dom.scaleXNum.textContent = '1.0×';
    this.dom.scaleYNum.textContent = '1.0×';
    this.dom.scaleZNum.textContent = '1.0×';
    this.dom.rotationNum.textContent = '0°';
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

  stageImageFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      this.showNotification('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const fullData = e.target.result;
      const base64Data = fullData.split(',')[1];
      this.stagedImage = {
        name: file.name,
        mimeType: file.type,
        data: base64Data
      };

      if (this.dom.imageStageThumb) {
        this.dom.imageStageThumb.src = fullData;
      }
      if (this.dom.imageStageName) {
        this.dom.imageStageName.textContent = file.name;
      }
      if (this.dom.imageStageChip) {
        this.dom.imageStageChip.style.display = 'flex';
        this.dom.imageStageChip.classList.remove('hidden');
      }
      if (this.dom.btnUploadImage) {
        this.dom.btnUploadImage.classList.add('has-file');
      }

      this.updateMessage(`Image "${file.name}" staged. Click send or say: "Replicate in 3D with full interior and exterior".`);
      this.dom.commandInput.placeholder = 'Click send or speak: "Replicate in 3D with interior"...';
      this.dom.commandInput.focus();
    };
    reader.readAsDataURL(file);
  }

  clearStagedImage() {
    this.stagedImage = null;
    if (this.dom.imageFileInput) this.dom.imageFileInput.value = '';
    if (this.dom.imageStageChip) {
      this.dom.imageStageChip.style.display = 'none';
      this.dom.imageStageChip.classList.add('hidden');
    }
    if (this.dom.btnUploadImage) {
      this.dom.btnUploadImage.classList.remove('has-file');
    }
    this.dom.commandInput.placeholder = "Speak, upload image, or type: 'Mercedes car', 'A tire'...";
  }

  setupUI() {
    // Drawer Toggles & Tabs
    this.dom.sideDrawer.classList.add('collapsed');
    this.dom.btnToggleSidePanel.addEventListener('click', () => {
      this.dom.sideDrawer.classList.toggle('collapsed');
    });
    this.dom.btnCloseDrawer.addEventListener('click', () => {
      this.dom.sideDrawer.classList.add('collapsed');
    });

    if (this.dom.tabBtnScene && this.dom.tabBtnLibrary) {
      this.dom.tabBtnScene.addEventListener('click', () => {
        this.dom.tabBtnScene.classList.add('active');
        this.dom.tabBtnLibrary.classList.remove('active');
        this.dom.drawerSceneView.style.display = 'block';
        this.dom.drawerLibraryView.style.display = 'none';
      });

      this.dom.tabBtnLibrary.addEventListener('click', () => {
        this.dom.tabBtnLibrary.classList.add('active');
        this.dom.tabBtnScene.classList.remove('active');
        this.dom.drawerLibraryView.style.display = 'block';
        this.dom.drawerSceneView.style.display = 'none';
        this.renderLibrary(this.libraryManager.getLibrary());
      });
    }

    // Save Selected Object to Library Vault
    if (this.dom.btnSaveToLibrary) {
      this.dom.btnSaveToLibrary.addEventListener('click', () => {
        if (!this.cadEngine.selectedEntity) {
          this.showNotification('Please select an object in the scene to save it.');
          return;
        }
        const ent = this.cadEngine.selectedEntity;
        const thumbnail = this.cadEngine.captureThumbnail();
        this.libraryManager.saveModel({
          name: ent.name,
          summary: ent.summary,
          type: ent.type,
          code: ent.code,
          metrics: ent.metrics,
          thumbnail
        });
        this.showNotification(`✨ Saved "${ent.name}" to your 3D Vault!`);
      });
    }

    // 3D Transform Gizmo Mode Buttons
    const setupGizmoBtn = (btn, mode) => {
      if (btn) {
        btn.addEventListener('click', () => {
          [this.dom.btnGizmoTranslate, this.dom.btnGizmoRotate, this.dom.btnGizmoScale].forEach(b => {
            if (b) b.classList.remove('active');
          });
          btn.classList.add('active');
          this.cadEngine.setGizmoMode(mode);
          this.updateMessage(`Gizmo tool: ${mode.toUpperCase()} in 3D viewport`);
        });
      }
    };
    setupGizmoBtn(this.dom.btnGizmoTranslate, 'translate');
    setupGizmoBtn(this.dom.btnGizmoRotate, 'rotate');
    setupGizmoBtn(this.dom.btnGizmoScale, 'scale');

    // Inspector Toggle
    this.dom.btnToggleInspector.addEventListener('click', () => {
      const isCollapsed = this.dom.metricInspector.classList.toggle('collapsed');
      this.dom.btnToggleInspector.classList.toggle('active', !isCollapsed);
    });
    this.dom.btnCloseInspector.addEventListener('click', () => {
      this.dom.metricInspector.classList.add('collapsed');
      this.dom.btnToggleInspector.classList.remove('active');
    });

    // Real-Time Manual Precision Sliders (Position, Scale, Rotation)
    const onSliderChange = () => {
      if (!this.cadEngine.selectedEntity) return;
      const ent = this.cadEngine.selectedEntity;

      const px = parseFloat(this.dom.sliderPosX.value);
      const pz = parseFloat(this.dom.sliderPosZ.value);
      const sx = parseFloat(this.dom.sliderScaleX.value);
      const sy = parseFloat(this.dom.sliderScaleY.value);
      const sz = parseFloat(this.dom.sliderScaleZ.value);
      const rot = parseInt(this.dom.sliderRotation.value);

      this.dom.posXNum.textContent = `${px} mm`;
      this.dom.posZNum.textContent = `${pz} mm`;
      this.dom.scaleXNum.textContent = `${sx.toFixed(2)}×`;
      this.dom.scaleYNum.textContent = `${sy.toFixed(2)}×`;
      this.dom.scaleZNum.textContent = `${sz.toFixed(2)}×`;
      this.dom.rotationNum.textContent = `${rot}°`;

      ent.mesh.position.x = px;
      ent.mesh.position.z = pz;
      ent.mesh.scale.set(sx, sy, sz);
      ent.mesh.rotation.y = THREE.MathUtils.degToRad(rot);

      this.cadEngine.updateSelectionHelper();
      this.cadEngine.updateEntityMetrics(ent);
      this.dom.metricLengthVal.textContent = `${ent.metrics.length} mm`;
      this.dom.metricWidthVal.textContent = `${ent.metrics.width} mm`;
      this.dom.metricHeightVal.textContent = `${ent.metrics.height} mm`;
    };

    this.dom.sliderPosX.addEventListener('input', onSliderChange);
    this.dom.sliderPosZ.addEventListener('input', onSliderChange);
    this.dom.sliderScaleX.addEventListener('input', onSliderChange);
    this.dom.sliderScaleY.addEventListener('input', onSliderChange);
    this.dom.sliderScaleZ.addEventListener('input', onSliderChange);
    this.dom.sliderRotation.addEventListener('input', onSliderChange);

    this.dom.btnResetTweaks.addEventListener('click', () => {
      if (this.cadEngine.selectedEntity) {
        this.dom.sliderScaleX.value = 1.0;
        this.dom.sliderScaleY.value = 1.0;
        this.dom.sliderScaleZ.value = 1.0;
        this.dom.sliderRotation.value = 0;
        onSliderChange();
      }
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
          this.dom.aiModal.style.display = 'flex';
          this.dom.aiModal.classList.remove('hidden');
        }
      });
    }

    if (this.dom.btnCloseAiModal) {
      this.dom.btnCloseAiModal.addEventListener('click', () => {
        if (this.dom.aiModal) {
          this.dom.aiModal.style.display = 'none';
          this.dom.aiModal.classList.add('hidden');
        }
      });
    }

    if (this.dom.aiModal) {
      this.dom.aiModal.addEventListener('click', (e) => {
        if (e.target === this.dom.aiModal) {
          this.dom.aiModal.style.display = 'none';
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
            if (this.dom.aiModal) {
              this.dom.aiModal.style.display = 'none';
              this.dom.aiModal.classList.add('hidden');
            }
            this.showNotification('✨ Gemini 3D Engine active! Speak, upload images, or type any concept.');
          }, 1000);
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
          if (this.dom.aiModal) {
            this.dom.aiModal.style.display = 'none';
            this.dom.aiModal.classList.add('hidden');
          }
        }, 800);
      });
    }

    // Image Upload & Drag-and-Drop
    if (this.dom.btnUploadImage && this.dom.imageFileInput) {
      this.dom.btnUploadImage.addEventListener('click', () => {
        this.dom.imageFileInput.click();
      });

      this.dom.imageFileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) this.stageImageFile(file);
      });
    }

    if (this.dom.btnRemoveImage) {
      this.dom.btnRemoveImage.addEventListener('click', () => {
        this.clearStagedImage();
      });
    }

    // Canvas Drag and Drop
    window.addEventListener('dragover', (e) => {
      e.preventDefault();
      document.body.classList.add('drag-over');
    });

    window.addEventListener('dragleave', (e) => {
      if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        document.body.classList.remove('drag-over');
      }
    });

    window.addEventListener('drop', (e) => {
      e.preventDefault();
      document.body.classList.remove('drag-over');
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith('image/')) {
        this.stageImageFile(file);
      }
    });

    // Interior / Cutaway Toggle
    if (this.dom.btnToggleInterior) {
      this.dom.btnToggleInterior.addEventListener('click', () => {
        const mode = this.cadEngine.cycleInteriorMode();
        const modeConfigs = {
          'solid': { text: 'Solid', color: '#38bdf8', desc: 'Standard solid rendering' },
          'xray': { text: 'X-Ray Shell', color: '#f59e0b', desc: 'Outer body transparent (internal mechanics visible)' },
          'cutaway': { text: 'Cutaway Half', color: '#f43f5e', desc: 'Cross-section slice through internal chambers' }
        };
        const conf = modeConfigs[mode] || modeConfigs['solid'];
        if (this.dom.interiorModeLabel) {
          this.dom.interiorModeLabel.textContent = conf.text;
          this.dom.interiorModeLabel.style.color = conf.color;
        }
        this.updateMessage(`Interior view: ${conf.text} (${conf.desc})`);
      });
    }

    this.dom.commandForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = this.dom.commandInput.value.trim();
      if (text || this.stagedImage) {
        this.executeCommand(text || 'Replicate this image into 3D');
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
      this.cadEngine.resetCameraToScene();
    });

    this.dom.btnQuickExportSTL.addEventListener('click', () => {
      this.cadEngine.exportSTL('voxcad_design.stl');
      this.showNotification('Exported 3D printable STL file!');
    });

    this.dom.btnCloseNotification.addEventListener('click', () => {
      this.dom.notificationBanner.classList.add('hidden');
    });

    this.dom.btnClearAll.addEventListener('click', () => {
      this.cadEngine.clearAllEntities();
      this.clearStagedImage();
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

      if (e.key === 'Escape' && this.dom.aiModal) {
        this.dom.aiModal.style.display = 'none';
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
    if (!rawText && !this.stagedImage) return;
    const lower = (rawText || '').toLowerCase().trim();

    if (this.isAwaitingFollowup && (lower.includes('no') || lower.includes('good') || lower.includes('fine') || lower.includes('perfect') || lower.includes('done') || lower.includes('stop'))) {
      this.isAwaitingFollowup = false;
      this.voiceEngine.stopListening();
      const exitMsg = "Understood. Design ready. Standing by.";
      this.updateMessage(exitMsg);
      this.voiceEngine.speak(exitMsg);
      return;
    }

    const intent = this.intentParser.parse(rawText, null, []);

    // Direct UI, View, Material, or History commands
    if (intent && intent.type === 'CAMERA_VIEW') {
      if (intent.view === 'reset') {
        this.cadEngine.resetCameraToScene();
      } else {
        this.cadEngine.setCameraView(intent.view);
        document.querySelectorAll('.glass-pill-group .pill-btn[data-view]').forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-view') === intent.view);
        });
      }
      this.updateMessage(intent.message);
      return;
    }

    if (intent && intent.type === 'TOGGLE_WIREFRAME') {
      const wire = this.cadEngine.toggleWireframe();
      this.dom.btnToggleWireframe.classList.toggle('active', wire);
      this.updateMessage(wire ? 'Wireframe mode' : 'Solid shaded mode');
      return;
    }

    if (intent && intent.type === 'TOGGLE_GRID') {
      const active = this.cadEngine.toggleGrid();
      this.dom.btnToggleGrid.classList.toggle('active', active);
      this.updateMessage(active ? 'Grid floor visible' : 'Grid floor hidden');
      return;
    }

    if (intent && intent.type === 'TOGGLE_AUTOROTATE') {
      const rot = this.cadEngine.toggleAutoRotate();
      this.dom.btnToggleTurntable.classList.toggle('active', rot);
      this.updateMessage(rot ? 'Showcase rotation enabled' : 'Rotation paused');
      return;
    }

    if (intent && intent.type === 'SET_MATERIAL') {
      this.cadEngine.setMaterial(intent.material);
      document.querySelectorAll('.mat-card').forEach(c => {
        c.classList.toggle('active', c.getAttribute('data-mat') === intent.material);
      });
      const matMsg = `Appearance updated to ${intent.material}.`;
      this.updateMessage(matMsg);
      this.voiceEngine.speak(matMsg);
      return;
    }

    if (intent && intent.type === 'CLEAR_ALL') {
      this.cadEngine.clearAllEntities();
      this.clearStagedImage();
      this.showStandbyState(true);
      this.updateMessage('Canvas reset to blank.');
      this.voiceEngine.speak('Canvas cleared');
      return;
    }

    if (intent && intent.type === 'AMBIGUITY') {
      this.updateMessage(intent.question);
      this.voiceEngine.speak(intent.question);
      return;
    }

    // -------------------------------------------------------------
    // GENERATIVE 3D SYNTHESIS: Lingua Franca (Text & Multimodal Image)
    // -------------------------------------------------------------
    if (this.geminiSynthesizer.hasApiKey()) {
      const isImageReplication = !!this.stagedImage;
      const actionLabel = isImageReplication 
        ? `✨ Gemini Vision is analyzing "${this.stagedImage.name}" for interior & exterior 3D replication...`
        : `✨ Gemini is sculpting 3D geometry for "${rawText}"...`;

      this.updateMessage(actionLabel);

      try {
        const result = await this.geminiSynthesizer.synthesizeConcept(rawText, this.stagedImage);
        
        // Clear staged image chip on success
        if (this.stagedImage) {
          this.clearStagedImage();
        }

        // Add as an independent entity in the multi-object scene (auto-positioned side-by-side!)
        this.cadEngine.addEntity(result.title, result.group, {
          summary: result.summary,
          type: 'GENAI_DYNAMIC_MODEL'
        });

        this.showStandbyState(false);

        const voiceText = `Created ${result.title}. Positioned cleanly on plane. Use 3D Gizmo to move or rotate, or Interior button to inspect inside. Would you like any adjustments?`;
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

    // Offline Procedural Engine (Smart Multi-Object Placement)
    if (intent && (intent.type.startsWith('CREATE_') || intent.type.startsWith('CUT_') || intent.type.startsWith('EXTRUDE_'))) {
      const mesh = this.featureTree.buildMeshForFeature(intent);
      const displayTitle = intent.displayTitle || intent.type.replace('CREATE_', '').replace(/_/g, ' ').toLowerCase();

      this.cadEngine.addEntity(displayTitle, mesh, {
        summary: intent.message,
        type: intent.type
      });

      this.showStandbyState(false);

      const voiceText = `Created ${displayTitle}. Positioned on plane. Would you like any adjustments?`;
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

  // Renders the Multi-Object Scene Outliner
  renderSceneOutliner(entities, selectedEntity) {
    const list = this.dom.sceneEntityList;
    if (!list) return;
    list.innerHTML = '';

    if (!entities || entities.length === 0) {
      if (this.dom.emptyTreeState) list.appendChild(this.dom.emptyTreeState);
      return;
    }

    entities.forEach((ent) => {
      const isSelected = selectedEntity && selectedEntity.id === ent.id;
      const card = document.createElement('div');
      card.className = `scene-entity-card ${isSelected ? 'selected' : ''}`;
      card.innerHTML = `
        <div class="scene-entity-info">
          <span class="scene-entity-name">${ent.name}</span>
          <span class="scene-entity-metrics">${ent.metrics.length}×${ent.metrics.width}×${ent.metrics.height}mm · ${ent.metrics.faces.toLocaleString()}f</span>
        </div>
        <div class="scene-entity-actions">
          <button class="entity-action-btn btn-vis" title="${ent.visible ? 'Hide Object' : 'Show Object'}">
            ${ent.visible ? '👁️' : '🙈'}
          </button>
          <button class="entity-action-btn btn-focus" title="Focus Camera">🎯</button>
          <button class="entity-action-btn btn-save" title="Save to Vault">💾</button>
          <button class="entity-action-btn btn-del" title="Delete Object">×</button>
        </div>
      `;

      card.addEventListener('click', () => {
        this.cadEngine.selectEntity(ent);
      });

      card.querySelector('.btn-vis').addEventListener('click', (e) => {
        e.stopPropagation();
        this.cadEngine.setEntityVisibility(ent.id, !ent.visible);
      });

      card.querySelector('.btn-focus').addEventListener('click', (e) => {
        e.stopPropagation();
        this.cadEngine.focusEntity(ent.id);
      });

      card.querySelector('.btn-save').addEventListener('click', (e) => {
        e.stopPropagation();
        this.cadEngine.selectEntity(ent);
        const thumb = this.cadEngine.captureThumbnail();
        this.libraryManager.saveModel({
          name: ent.name,
          summary: ent.summary,
          type: ent.type,
          code: ent.code,
          metrics: ent.metrics,
          thumbnail: thumb
        });
        this.showNotification(`Saved "${ent.name}" to Library Vault!`);
      });

      card.querySelector('.btn-del').addEventListener('click', (e) => {
        e.stopPropagation();
        this.cadEngine.removeEntity(ent.id);
      });

      list.appendChild(card);
    });
  }

  // Renders the Saved 3D Library Vault
  renderLibrary(items) {
    const list = this.dom.libraryList;
    if (!list) return;
    list.innerHTML = '';

    if (!items || items.length === 0) {
      if (this.dom.emptyLibraryState) list.appendChild(this.dom.emptyLibraryState);
      return;
    }

    items.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'library-card';
      const thumbSrc = item.thumbnail || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" fill="%2338bdf8"><rect width="50" height="50" fill="%230f172a"/><text x="15" y="30" fill="%23fff" font-size="16">3D</text></svg>';

      card.innerHTML = `
        <div class="library-card-header">
          <img src="${thumbSrc}" class="library-thumb" alt="${item.name}" />
          <div class="library-meta">
            <span class="library-name">${item.name}</span>
            <span class="library-date">${item.createdAt}</span>
            <span class="library-dims">${item.metrics?.length || 0}×${item.metrics?.width || 0}×${item.metrics?.height || 0}mm</span>
          </div>
        </div>
        <div class="library-actions">
          <button class="btn-add-scene" data-id="${item.id}">+ Add to Scene</button>
          <div style="display: flex; gap: 4px;">
            <button class="entity-action-btn btn-export-item" title="Export STL">⬇️</button>
            <button class="entity-action-btn btn-del" title="Delete from Vault">🗑️</button>
          </div>
        </div>
      `;

      card.querySelector('.btn-add-scene').addEventListener('click', () => {
        this.addLibraryAssetToScene(item);
      });

      card.querySelector('.btn-del').addEventListener('click', () => {
        this.libraryManager.deleteModel(item.id);
      });

      card.querySelector('.btn-export-item').addEventListener('click', () => {
        this.addLibraryAssetToScene(item);
        this.cadEngine.exportSTL(`${item.name.replace(/\s+/g, '_')}.stl`);
      });

      list.appendChild(card);
    });
  }

  addLibraryAssetToScene(asset) {
    let mesh = null;
    if (asset.code) {
      mesh = this.geminiSynthesizer.executeProceduralCode(asset.code);
    } else {
      mesh = this.featureTree.buildMeshForFeature({ type: asset.type, displayTitle: asset.name });
    }

    if (mesh) {
      this.cadEngine.addEntity(asset.name, mesh, {
        summary: asset.summary,
        type: asset.type,
        code: asset.code
      });
      this.updateMessage(`Spawned "${asset.name}" from Vault into scene.`);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new VoxCADApp();
});
