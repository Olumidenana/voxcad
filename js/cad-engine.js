/**
 * VoxCAD — CAD Viewport & Geometry Engine
 * Powered by Three.js & Constructive Solid Geometry (CSG)
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';

export class CADEngine {
  constructor(canvasContainer, canvasElement) {
    this.container = canvasContainer;
    this.canvas = canvasElement;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.grid = null;
    this.axes = null;

    // Active Model Group & Selected Face Helper
    this.modelGroup = new THREE.Group();
    this.activeMesh = null;
    this.highlightHelper = null;
    this.selectedFace = null; // { normal, point, faceIndex }

    // Display Modes
    this.isWireframe = false;
    this.showGrid = true;
    this.activeMaterialName = 'titanium';

    // Raycaster for "Point & Speak"
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Callbacks
    this.onSelectionChanged = null;
    this.onGeometryUpdated = null;

    this.init();
  }

  init() {
    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07090e);
    this.scene.add(this.modelGroup);

    // 2. Camera
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 1, 2000);
    this.setCameraView('iso');

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 4. Orbit Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 1500;
    this.controls.minDistance = 10;
    this.controls.target.set(0, 15, 0);

    // 5. Studio Lighting
    this.setupLighting();

    // 6. Metric Grid Floor (200mm x 200mm, with 10mm and 1mm lines)
    this.setupGrid();

    // 7. Event Listeners
    window.addEventListener('resize', () => this.onWindowResize());
    this.canvas.addEventListener('pointerdown', (e) => this.onCanvasClick(e));

    // 8. Animation Loop
    this.animate();
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    // Main Key Light
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(120, 200, 150);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 10;
    keyLight.shadow.camera.far = 800;
    const d = 150;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    this.scene.add(keyLight);

    // Fill Light
    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.4);
    fillLight.position.set(-150, 100, -100);
    this.scene.add(fillLight);

    // Soft Rim Light
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight.position.set(0, -150, -150);
    this.scene.add(rimLight);
  }

  setupGrid() {
    // 200mm grid with 20 divisions (10mm main squares)
    this.grid = new THREE.GridHelper(300, 30, 0x0284c7, 0x1e293b);
    this.grid.position.y = 0;
    this.scene.add(this.grid);

    // Axes Helper (X=Red, Y=Green, Z=Blue)
    this.axes = new THREE.AxesHelper(30);
    this.axes.position.set(-140, 0.2, -140);
    this.scene.add(this.axes);
  }

  getMaterial(name = this.activeMaterialName) {
    const materials = {
      'titanium': new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.85,
        roughness: 0.25,
        wireframe: this.isWireframe
      }),
      'brass': new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.9,
        roughness: 0.2,
        wireframe: this.isWireframe
      }),
      'aluminum': new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        metalness: 0.75,
        roughness: 0.3,
        wireframe: this.isWireframe
      }),
      'matte-black': new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.2,
        roughness: 0.6,
        wireframe: this.isWireframe
      }),
      'copper': new THREE.MeshStandardMaterial({
        color: 0xf97316,
        metalness: 0.95,
        roughness: 0.15,
        wireframe: this.isWireframe
      })
    };
    return materials[name] || materials['titanium'];
  }

  setMaterial(name) {
    this.activeMaterialName = name;
    if (this.activeMesh) {
      this.activeMesh.material = this.getMaterial(name);
    }
  }

  setCameraView(viewName) {
    const dist = 180;
    const target = this.controls ? this.controls.target : new THREE.Vector3(0, 15, 0);

    switch (viewName) {
      case 'iso':
        this.camera.position.set(dist * 0.8, dist * 0.7, dist * 0.8);
        break;
      case 'top':
        this.camera.position.set(target.x, target.y + dist * 1.2, target.z + 0.001);
        break;
      case 'front':
        this.camera.position.set(target.x, target.y, target.z + dist);
        break;
      case 'right':
        this.camera.position.set(target.x + dist, target.y, target.z);
        break;
    }
    this.camera.lookAt(target);
    if (this.controls) this.controls.update();
  }

  toggleWireframe() {
    this.isWireframe = !this.isWireframe;
    if (this.activeMesh) {
      this.activeMesh.material.wireframe = this.isWireframe;
    }
    return this.isWireframe;
  }

  toggleGrid() {
    this.showGrid = !this.showGrid;
    if (this.grid) this.grid.visible = this.showGrid;
    if (this.axes) this.axes.visible = this.showGrid;
    return this.showGrid;
  }

  resetCamera() {
    if (this.activeMesh) {
      const box = new THREE.Box3().setFromObject(this.activeMesh);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z, 40);

      this.controls.target.copy(center);
      this.camera.position.set(center.x + maxDim * 1.5, center.y + maxDim * 1.2, center.z + maxDim * 1.5);
      this.controls.update();
    } else {
      this.setCameraView('iso');
    }
  }

  /**
   * Raycaster for "Point & Speak" - click face detection
   */
  onCanvasClick(event) {
    if (event.button !== 0) return; // Only primary click

    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    if (!this.activeMesh) return;

    const intersects = this.raycaster.intersectObject(this.activeMesh);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
      const worldNormal = hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();

      // Identify face cardinal orientation
      let faceDesc = "Selected Face";
      if (Math.abs(worldNormal.y - 1) < 0.1) faceDesc = "Top Face (+Y)";
      else if (Math.abs(worldNormal.y + 1) < 0.1) faceDesc = "Bottom Face (-Y)";
      else if (Math.abs(worldNormal.z - 1) < 0.1) faceDesc = "Front Face (+Z)";
      else if (Math.abs(worldNormal.z + 1) < 0.1) faceDesc = "Back Face (-Z)";
      else if (Math.abs(worldNormal.x - 1) < 0.1) faceDesc = "Right Face (+X)";
      else if (Math.abs(worldNormal.x + 1) < 0.1) faceDesc = "Left Face (-X)";

      this.selectedFace = {
        name: faceDesc,
        normal: worldNormal,
        point: hit.point,
        faceIndex: hit.faceIndex
      };

      this.highlightFace(hit.point, worldNormal);

      if (this.onSelectionChanged) {
        this.onSelectionChanged(this.selectedFace);
      }
    } else {
      this.clearSelection();
    }
  }

  highlightFace(point, normal) {
    if (this.highlightHelper) {
      this.scene.remove(this.highlightHelper);
      this.highlightHelper = null;
    }

    // Create a luminous marker ring and normal arrow at the pick point
    const helperGroup = new THREE.Group();

    // Normal Arrow
    const arrow = new THREE.ArrowHelper(normal, point, 18, 0x00f2fe, 5, 3);
    helperGroup.add(arrow);

    // Indicator Disc
    const discGeo = new THREE.RingGeometry(1, 4, 32);
    const discMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.copy(point.clone().add(normal.clone().multiplyScalar(0.2)));
    disc.lookAt(point.clone().add(normal));
    helperGroup.add(disc);

    this.highlightHelper = helperGroup;
    this.scene.add(this.highlightHelper);
  }

  clearSelection() {
    this.selectedFace = null;
    if (this.highlightHelper) {
      this.scene.remove(this.highlightHelper);
      this.highlightHelper = null;
    }
    if (this.onSelectionChanged) {
      this.onSelectionChanged(null);
    }
  }

  /**
   * Set active 3D Mesh & compute viewport stats
   */
  setActiveMesh(mesh) {
    // Remove old mesh
    if (this.activeMesh) {
      this.modelGroup.remove(this.activeMesh);
      if (this.activeMesh.geometry) this.activeMesh.geometry.dispose();
      this.activeMesh = null;
    }

    if (mesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.material = this.getMaterial(this.activeMaterialName);

      // Add edge highlight wireframe overlay
      const edges = new THREE.EdgesGeometry(mesh.geometry, 25);
      const edgeLine = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 1, transparent: true, opacity: 0.35 })
      );
      mesh.add(edgeLine);

      this.activeMesh = mesh;
      this.modelGroup.add(this.activeMesh);

      // Notify stats
      if (this.onGeometryUpdated) {
        const box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());
        const faceCount = mesh.geometry.index 
          ? mesh.geometry.index.count / 3 
          : mesh.geometry.attributes.position.count / 3;

        this.onGeometryUpdated({
          faces: Math.round(faceCount),
          bounds: `${Math.round(size.x)} × ${Math.round(size.y)} × ${Math.round(size.z)} mm`
        });
      }
    } else {
      if (this.onGeometryUpdated) {
        this.onGeometryUpdated({ faces: 0, bounds: '0 × 0 × 0' });
      }
    }

    this.clearSelection();
  }

  /**
   * Export to 3D Printable STL
   */
  exportSTL(filename = 'voxcad_model.stl') {
    if (!this.activeMesh) return alert('No active 3D model to export.');
    const exporter = new STLExporter();
    const result = exporter.parse(this.activeMesh, { binary: true });
    this.downloadFile(result, filename, 'application/octet-stream');
  }

  /**
   * Export to OBJ Mesh
   */
  exportOBJ(filename = 'voxcad_model.obj') {
    if (!this.activeMesh) return alert('No active 3D model to export.');
    const exporter = new OBJExporter();
    const result = exporter.parse(this.activeMesh);
    this.downloadFile(result, filename, 'text/plain');
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
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    if (this.controls) this.controls.update();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
