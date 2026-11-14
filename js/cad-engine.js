/**
 * VoxCAD — Viewport & Scene Management
 * Advanced Multi-Object Scene Graph with Transform Controls & Auto-Layout
 * 100% Local Vendor Three.js (Zero CDN dependencies)
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';

export class CADEngine {
  constructor(canvasContainer, canvasElement) {
    this.container = canvasContainer;
    this.canvas = canvasElement;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.transformControls = null;
    this.grid = null;
    this.axes = null;

    this.modelGroup = new THREE.Group();
    this.entities = []; // Array of SceneEntity: { id, name, mesh, metrics, summary, visible }
    this.selectedEntity = null;
    this.selectedFace = null;
    this.selectionBoxHelper = null;

    this.isWireframe = false;
    this.showGrid = true;
    this.autoRotate = false;
    this.activeMaterialName = 'titanium';
    this.gizmoMode = 'translate'; // 'translate' | 'rotate' | 'scale' | 'off'

    this.interiorMode = 'solid'; // 'solid' | 'xray' | 'cutaway'
    this.clipPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.onSelectionChanged = null;
    this.onSceneUpdated = null;
    this.onGeometryUpdated = null;
    this.onEntityTransformed = null;

    this.init();
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x06080f);
    this.scene.add(this.modelGroup);

    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 1, 4000);
    this.setCameraView('iso');

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.localClippingEnabled = true;

    // Orbit Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 2500;
    this.controls.minDistance = 10;
    this.controls.target.set(0, 20, 0);

    // Stop auto-rotate as soon as user touches canvas
    this.controls.addEventListener('start', () => {
      this.autoRotate = false;
    });

    // 3D Transform Gizmo (Translate / Rotate / Scale directly in 3D)
    this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
    this.transformControls.size = 0.8;
    this.transformControls.setMode(this.gizmoMode);

    this.transformControls.addEventListener('dragging-changed', (event) => {
      this.controls.enabled = !event.value;
    });

    this.transformControls.addEventListener('change', () => {
      if (this.selectedEntity) {
        this.updateSelectionHelper();
        this.updateEntityMetrics(this.selectedEntity);
        if (this.onEntityTransformed) {
          this.onEntityTransformed(this.selectedEntity);
        }
      }
    });

    this.scene.add(this.transformControls);

    this.setupLighting();
    this.setupGrid();

    window.addEventListener('resize', () => this.onWindowResize());
    this.canvas.addEventListener('pointerdown', (e) => this.onCanvasClick(e));

    this.animate();
  }

  setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.95);
    this.scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(160, 240, 180);
    key.castShadow = true;
    key.shadow.mapSize.width = 2048;
    key.shadow.mapSize.height = 2048;
    this.scene.add(key);

    const rim = new THREE.DirectionalLight(0x38bdf8, 0.7);
    rim.position.set(-180, 100, -160);
    this.scene.add(rim);

    const warmFill = new THREE.DirectionalLight(0xf59e0b, 0.3);
    warmFill.position.set(140, -60, -100);
    this.scene.add(warmFill);
  }

  setupGrid() {
    this.grid = new THREE.GridHelper(500, 50, 0x0284c7, 0x172554);
    this.grid.position.y = 0;
    this.scene.add(this.grid);

    this.axes = new THREE.AxesHelper(40);
    this.axes.position.set(-220, 0.5, -220);
    this.scene.add(this.axes);
  }

  getMaterial(name = this.activeMaterialName) {
    const materials = {
      'titanium': new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.85,
        roughness: 0.22,
        wireframe: this.isWireframe
      }),
      'brass': new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.92,
        roughness: 0.18,
        wireframe: this.isWireframe
      }),
      'aluminum': new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        metalness: 0.8,
        roughness: 0.25,
        wireframe: this.isWireframe
      }),
      'matte-black': new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.25,
        roughness: 0.55,
        wireframe: this.isWireframe
      }),
      'copper': new THREE.MeshStandardMaterial({
        color: 0xfb923c,
        metalness: 0.95,
        roughness: 0.15,
        wireframe: this.isWireframe
      })
    };
    return materials[name] || materials['titanium'];
  }

  setMaterial(name) {
    this.activeMaterialName = name;
    if (this.selectedEntity && this.selectedEntity.mesh) {
      this.selectedEntity.mesh.traverse(child => {
        if (child.isMesh) child.material = this.getMaterial(name);
      });
      this.applyInteriorMode();
    }
  }

  setGizmoMode(mode) {
    this.gizmoMode = mode;
    if (mode === 'off') {
      this.transformControls.detach();
    } else {
      this.transformControls.setMode(mode);
      if (this.selectedEntity && this.selectedEntity.visible) {
        this.transformControls.attach(this.selectedEntity.mesh);
      }
    }
  }

  setCameraView(view) {
    const dist = 200;
    const target = this.controls ? this.controls.target : new THREE.Vector3(0, 20, 0);

    switch (view) {
      case 'iso':
        this.camera.position.set(target.x + dist * 0.85, target.y + dist * 0.75, target.z + dist * 0.85);
        break;
      case 'top':
        this.camera.position.set(target.x, target.y + dist * 1.3, target.z + 0.001);
        break;
      case 'front':
        this.camera.position.set(target.x, target.y + 20, target.z + dist * 1.2);
        break;
      case 'right':
        this.camera.position.set(target.x + dist * 1.2, target.y + 20, target.z);
        break;
    }
    this.camera.lookAt(target);
    if (this.controls) this.controls.update();
  }

  toggleWireframe() {
    this.isWireframe = !this.isWireframe;
    this.modelGroup.traverse(child => {
      if (child.isMesh && child.material) child.material.wireframe = this.isWireframe;
    });
    return this.isWireframe;
  }

  toggleGrid() {
    this.showGrid = !this.showGrid;
    if (this.grid) this.grid.visible = this.showGrid;
    if (this.axes) this.axes.visible = this.showGrid;
    return this.showGrid;
  }

  toggleAutoRotate() {
    this.autoRotate = !this.autoRotate;
    return this.autoRotate;
  }

  cycleInteriorMode() {
    const modes = ['solid', 'xray', 'cutaway'];
    const nextIdx = (modes.indexOf(this.interiorMode) + 1) % modes.length;
    this.interiorMode = modes[nextIdx];
    this.applyInteriorMode();
    return this.interiorMode;
  }

  applyInteriorMode() {
    this.modelGroup.traverse(child => {
      if (child.isMesh && child.material) {
        const isExterior = child.userData.isExterior !== false && (child.userData.isExterior || !child.userData.isInterior);

        if (this.interiorMode === 'solid') {
          child.material.clippingPlanes = null;
          child.material.clipShadows = false;
          child.material.transparent = false;
          child.material.opacity = 1.0;
          child.material.depthWrite = true;
        } else if (this.interiorMode === 'xray') {
          child.material.clippingPlanes = null;
          if (isExterior) {
            child.material.transparent = true;
            child.material.opacity = 0.22;
            child.material.depthWrite = false;
          } else {
            child.material.transparent = false;
            child.material.opacity = 1.0;
            child.material.depthWrite = true;
          }
        } else if (this.interiorMode === 'cutaway') {
          child.material.clippingPlanes = [this.clipPlane];
          child.material.clipShadows = true;
          child.material.transparent = false;
          child.material.opacity = 1.0;
          child.material.depthWrite = true;
        }
        child.material.needsUpdate = true;
      }
    });
  }

  // --------------------------------------------------------------------------
  // Multi-Object Scene Management with Smart Spatial Auto-Placement
  // --------------------------------------------------------------------------

  addEntity(name, mesh, meta = {}) {
    const id = meta.id || 'entity_' + Date.now();

    // Prepare mesh visuals & wire edges
    mesh.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.userData.entityId = id;
        if (!child.material || child.material.name === 'default') {
          child.material = this.getMaterial(this.activeMaterialName);
        }

        const edges = new THREE.EdgesGeometry(child.geometry, 28);
        const line = new THREE.LineSegments(
          edges,
          new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 1, transparent: true, opacity: 0.35 })
        );
        child.add(line);
      }
    });

    mesh.userData.id = id;
    mesh.userData.name = name;

    // Calculate bounds of this new mesh
    mesh.updateMatrixWorld(true);
    const newBox = new THREE.Box3().setFromObject(mesh);
    const newSize = newBox.getSize(new THREE.Vector3());
    const validWidth = (isFinite(newSize.x) && newSize.x > 5) ? newSize.x : 70;
    const validDepth = (isFinite(newSize.z) && newSize.z > 5) ? newSize.z : 70;

    // SMART AUTO-LAYOUT: If objects already exist, offset this object cleanly on the plane!
    // Never stack on the same spot!
    if (this.entities.length > 0) {
      let maxX = -Infinity;
      let refZ = 0;
      this.entities.forEach(ent => {
        if (ent.visible) {
          ent.mesh.updateMatrixWorld(true);
          const b = new THREE.Box3().setFromObject(ent.mesh);
          if (b.max.x > maxX) {
            maxX = b.max.x;
            refZ = ent.mesh.position.z;
          }
        }
      });
      const spacingGap = 35; // 35mm comfortable spacing
      let targetX = maxX + (validWidth / 2) + spacingGap;
      let targetZ = refZ;

      if (targetX > 220) {
        targetX = 0;
        targetZ += validDepth + spacingGap;
      }

      mesh.position.x = targetX;
      mesh.position.z = targetZ;
      mesh.updateMatrixWorld(true);
    }

    const entity = {
      id,
      name,
      mesh,
      summary: meta.summary || 'Custom 3D Model',
      type: meta.type || 'GENAI_DYNAMIC_MODEL',
      code: meta.code || null,
      visible: true,
      metrics: {
        length: Math.round(newSize.x),
        width: Math.round(newSize.z),
        height: Math.round(newSize.y),
        faces: this.calculateMeshFaces(mesh)
      }
    };

    this.entities.push(entity);
    this.modelGroup.add(mesh);

    this.selectEntity(entity);
    this.resetCameraToScene();

    if (this.onSceneUpdated) {
      this.onSceneUpdated(this.entities, this.selectedEntity);
    }
    return entity;
  }

  selectEntity(entityOrId) {
    let entity = null;
    if (typeof entityOrId === 'string') {
      entity = this.entities.find(e => e.id === entityOrId) || null;
    } else {
      entity = entityOrId;
    }

    this.selectedEntity = entity;

    if (entity && entity.visible) {
      if (this.gizmoMode !== 'off') {
        this.transformControls.attach(entity.mesh);
      }
      this.updateSelectionHelper();
    } else {
      this.transformControls.detach();
      this.removeSelectionHelper();
    }

    if (this.onSelectionChanged) {
      this.onSelectionChanged(entity);
    }
  }

  removeEntity(id) {
    const idx = this.entities.findIndex(e => e.id === id);
    if (idx !== -1) {
      const ent = this.entities[idx];
      if (this.selectedEntity && this.selectedEntity.id === id) {
        this.selectEntity(null);
      }
      this.modelGroup.remove(ent.mesh);
      this.entities.splice(idx, 1);

      if (this.onSceneUpdated) {
        this.onSceneUpdated(this.entities, this.selectedEntity);
      }
    }
  }

  setEntityVisibility(id, visible) {
    const ent = this.entities.find(e => e.id === id);
    if (ent) {
      ent.visible = visible;
      ent.mesh.visible = visible;
      if (!visible && this.selectedEntity && this.selectedEntity.id === id) {
        this.transformControls.detach();
        this.removeSelectionHelper();
      } else if (visible && this.selectedEntity && this.selectedEntity.id === id) {
        if (this.gizmoMode !== 'off') this.transformControls.attach(ent.mesh);
        this.updateSelectionHelper();
      }
      if (this.onSceneUpdated) {
        this.onSceneUpdated(this.entities, this.selectedEntity);
      }
    }
  }

  focusEntity(id) {
    const ent = this.entities.find(e => e.id === id);
    if (ent && ent.visible) {
      this.selectEntity(ent);
      const box = new THREE.Box3().setFromObject(ent.mesh);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z, 50);

      this.controls.target.copy(center);
      this.camera.position.set(center.x + maxDim * 1.4, center.y + maxDim * 1.1, center.z + maxDim * 1.4);
      this.controls.update();
    }
  }

  clearAllEntities() {
    this.selectEntity(null);
    while (this.modelGroup.children.length > 0) {
      this.modelGroup.remove(this.modelGroup.children[0]);
    }
    this.entities = [];
    if (this.onSceneUpdated) {
      this.onSceneUpdated(this.entities, null);
    }
  }

  // -------------------------------------------------------------
  // Blender-Equivalent Spatial Manipulations
  // -------------------------------------------------------------

  moveEntity(direction, distance = 35) {
    if (!this.selectedEntity) return;
    const mesh = this.selectedEntity.mesh;
    switch (direction) {
      case 'right':
        mesh.position.x += distance;
        break;
      case 'left':
        mesh.position.x -= distance;
        break;
      case 'up':
        mesh.position.y += distance;
        break;
      case 'down':
        mesh.position.y = Math.max(0, mesh.position.y - distance);
        break;
      case 'forward':
        mesh.position.z += distance;
        break;
      case 'back':
        mesh.position.z -= distance;
        break;
    }
    mesh.updateMatrixWorld(true);
    this.updateSelectionHelper();
    this.updateEntityMetrics(this.selectedEntity);
    if (this.onEntityTransformed) this.onEntityTransformed(this.selectedEntity);
  }

  rotateEntity(degrees = 45, axis = 'y') {
    if (!this.selectedEntity) return;
    const mesh = this.selectedEntity.mesh;
    mesh.rotation[axis] += THREE.MathUtils.degToRad(degrees);
    mesh.updateMatrixWorld(true);
    this.updateSelectionHelper();
    if (this.onEntityTransformed) this.onEntityTransformed(this.selectedEntity);
  }

  scaleEntity(factor = 1.5) {
    if (!this.selectedEntity) return;
    const mesh = this.selectedEntity.mesh;
    mesh.scale.multiplyScalar(factor);
    mesh.updateMatrixWorld(true);
    this.updateSelectionHelper();
    this.updateEntityMetrics(this.selectedEntity);
    if (this.onEntityTransformed) this.onEntityTransformed(this.selectedEntity);
  }

  duplicateEntity(id = null) {
    const target = id ? this.entities.find(e => e.id === id) : this.selectedEntity;
    if (!target) return null;

    const clonedMesh = target.mesh.clone(true);
    clonedMesh.traverse(child => {
      if (child.isMesh && child.material) {
        child.material = child.material.clone();
      }
    });

    const newName = `${target.name} (Copy)`;
    const newEnt = this.addEntity(newName, clonedMesh, {
      summary: target.summary,
      type: target.type,
      code: target.code
    });
    return newEnt;
  }

  getNextEntity() {
    if (this.entities.length === 0) return null;
    if (!this.selectedEntity) return this.entities[0];
    const idx = this.entities.findIndex(e => e.id === this.selectedEntity.id);
    return this.entities[(idx + 1) % this.entities.length];
  }

  updateSelectionHelper() {
    this.removeSelectionHelper();
    if (!this.selectedEntity || !this.selectedEntity.mesh) return;

    this.selectionBoxHelper = new THREE.BoxHelper(this.selectedEntity.mesh, 0x00f2fe);
    this.selectionBoxHelper.material.transparent = true;
    this.selectionBoxHelper.material.opacity = 0.7;
    this.scene.add(this.selectionBoxHelper);
  }

  removeSelectionHelper() {
    if (this.selectionBoxHelper) {
      this.scene.remove(this.selectionBoxHelper);
      this.selectionBoxHelper = null;
    }
  }

  updateEntityMetrics(entity) {
    if (!entity || !entity.mesh) return;
    const box = new THREE.Box3().setFromObject(entity.mesh);
    const size = box.getSize(new THREE.Vector3());
    entity.metrics.length = Math.round(size.x);
    entity.metrics.width = Math.round(size.z);
    entity.metrics.height = Math.round(size.y);
  }

  calculateMeshFaces(mesh) {
    let faces = 0;
    mesh.traverse(child => {
      if (child.isMesh && child.geometry) {
        faces += child.geometry.index ? child.geometry.index.count / 3 : child.geometry.attributes.position.count / 3;
      }
    });
    return Math.round(faces);
  }

  resetCameraToScene() {
    if (this.entities.length === 0) {
      this.setCameraView('iso');
      return;
    }

    const box = new THREE.Box3().setFromObject(this.modelGroup);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 70);

    this.controls.target.copy(center);
    this.camera.position.set(center.x + maxDim * 1.5, center.y + maxDim * 1.2, center.z + maxDim * 1.5);
    this.controls.update();
  }

  onCanvasClick(event) {
    if (event.button !== 0) return;
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    if (this.entities.length === 0) return;

    const visibleMeshes = [];
    this.entities.forEach(ent => {
      if (ent.visible) {
        ent.mesh.traverse(c => { if (c.isMesh) visibleMeshes.push(c); });
      }
    });

    const intersects = this.raycaster.intersectObjects(visibleMeshes, false);
    if (intersects.length > 0) {
      const hit = intersects[0];
      const entityId = hit.object.userData.entityId;
      if (entityId) {
        const ent = this.entities.find(e => e.id === entityId);
        if (ent) this.selectEntity(ent);
      }
    }
  }

  captureThumbnail() {
    this.renderer.render(this.scene, this.camera);
    return this.canvas.toDataURL('image/jpeg', 0.85);
  }

  exportSTL(filename = 'voxcad_design.stl') {
    if (this.entities.length === 0) return alert('No 3D models in scene to export.');
    const exporter = new STLExporter();
    const result = exporter.parse(this.modelGroup, { binary: true });
    this.downloadFile(result, filename, 'application/octet-stream');
  }

  downloadFile(data, filename, type) {
    const blob = new Blob([data], { type });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  onWindowResize() {
    if (!this.container || !this.renderer) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    if (this.autoRotate && this.entities.length > 0) {
      this.modelGroup.rotation.y += 0.005;
    }

    if (this.selectionBoxHelper) {
      this.selectionBoxHelper.update();
    }

    if (this.controls) this.controls.update();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
