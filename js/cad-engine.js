/**
 * VoxCAD — Viewport & Universal 3D Design Synthesizer
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

    // Active Model & Selection
    this.modelGroup = new THREE.Group();
    this.activeMesh = null;
    this.highlightHelper = null;
    this.selectedFace = null;

    // Display Options
    this.isWireframe = false;
    this.showGrid = true;
    this.activeMaterialName = 'titanium';

    // Raycaster for Point & Speak
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Callbacks
    this.onSelectionChanged = null;
    this.onGeometryUpdated = null;

    this.init();
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05070c);
    this.scene.add(this.modelGroup);

    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 1, 3000);
    this.setCameraView('iso');

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 2000;
    this.controls.minDistance = 5;
    this.controls.target.set(0, 15, 0);

    this.setupLighting();
    this.setupGrid();

    window.addEventListener('resize', () => this.onWindowResize());
    this.canvas.addEventListener('pointerdown', (e) => this.onCanvasClick(e));

    this.animate();
  }

  setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.3);
    keyLight.position.set(150, 220, 180);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    this.scene.add(keyLight);

    const cyanRim = new THREE.DirectionalLight(0x38bdf8, 0.6);
    cyanRim.position.set(-180, 120, -150);
    this.scene.add(cyanRim);

    const bottomGlow = new THREE.DirectionalLight(0x0284c7, 0.3);
    bottomGlow.position.set(0, -100, 0);
    this.scene.add(bottomGlow);
  }

  setupGrid() {
    this.grid = new THREE.GridHelper(400, 40, 0x0284c7, 0x1e293b);
    this.grid.position.y = 0;
    this.scene.add(this.grid);

    this.axes = new THREE.AxesHelper(35);
    this.axes.position.set(-180, 0.5, -180);
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
    if (this.activeMesh) {
      this.activeMesh.traverse(child => {
        if (child.isMesh) child.material = this.getMaterial(name);
      });
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
        this.camera.position.set(target.x, target.y + dist * 1.3, target.z + 0.001);
        break;
      case 'front':
        this.camera.position.set(target.x, target.y + 15, target.z + dist * 1.2);
        break;
      case 'right':
        this.camera.position.set(target.x + dist * 1.2, target.y + 15, target.z);
        break;
    }
    this.camera.lookAt(target);
    if (this.controls) this.controls.update();
  }

  toggleWireframe() {
    this.isWireframe = !this.isWireframe;
    if (this.activeMesh) {
      this.activeMesh.traverse(child => {
        if (child.isMesh && child.material) child.material.wireframe = this.isWireframe;
      });
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
      const maxDim = Math.max(size.x, size.y, size.z, 50);

      this.controls.target.copy(center);
      this.camera.position.set(center.x + maxDim * 1.5, center.y + maxDim * 1.2, center.z + maxDim * 1.5);
      this.controls.update();
    } else {
      this.setCameraView('iso');
    }
  }

  onCanvasClick(event) {
    if (event.button !== 0) return;
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    if (!this.activeMesh) return;

    const intersects = this.raycaster.intersectObjects(this.modelGroup.children, true);
    if (intersects.length > 0) {
      const hit = intersects[0];
      if (!hit.face) return;

      const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
      const worldNormal = hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();

      let desc = "Selected Surface";
      if (Math.abs(worldNormal.y - 1) < 0.2) desc = "Top Face (+Y)";
      else if (Math.abs(worldNormal.y + 1) < 0.2) desc = "Bottom Face (-Y)";
      else if (Math.abs(worldNormal.z - 1) < 0.2) desc = "Front Face (+Z)";
      else if (Math.abs(worldNormal.z + 1) < 0.2) desc = "Back Face (-Z)";
      else if (Math.abs(worldNormal.x - 1) < 0.2) desc = "Right Face (+X)";
      else if (Math.abs(worldNormal.x + 1) < 0.2) desc = "Left Face (-X)";

      this.selectedFace = {
        name: desc,
        normal: worldNormal,
        point: hit.point,
        faceIndex: hit.faceIndex
      };

      this.highlightFace(hit.point, worldNormal);

      if (this.onSelectionChanged) this.onSelectionChanged(this.selectedFace);
    } else {
      this.clearSelection();
    }
  }

  highlightFace(point, normal) {
    if (this.highlightHelper) {
      this.scene.remove(this.highlightHelper);
      this.highlightHelper = null;
    }

    const helper = new THREE.Group();
    const arrow = new THREE.ArrowHelper(normal, point, 22, 0x00f2fe, 6, 4);
    helper.add(arrow);

    const disc = new THREE.Mesh(
      new THREE.RingGeometry(1, 5, 32),
      new THREE.MeshBasicMaterial({ color: 0x00f2fe, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    disc.position.copy(point.clone().add(normal.clone().multiplyScalar(0.2)));
    disc.lookAt(point.clone().add(normal));
    helper.add(disc);

    this.highlightHelper = helper;
    this.scene.add(this.highlightHelper);
  }

  clearSelection() {
    this.selectedFace = null;
    if (this.highlightHelper) {
      this.scene.remove(this.highlightHelper);
      this.highlightHelper = null;
    }
    if (this.onSelectionChanged) this.onSelectionChanged(null);
  }

  setActiveMesh(meshOrGroup) {
    if (this.activeMesh) {
      this.modelGroup.remove(this.activeMesh);
      this.activeMesh = null;
    }

    if (meshOrGroup) {
      meshOrGroup.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.material = this.getMaterial(this.activeMaterialName);

          // Add subtle architectural edge lines
          const edges = new THREE.EdgesGeometry(child.geometry, 25);
          const line = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 1, transparent: true, opacity: 0.4 })
          );
          child.add(line);
        }
      });

      this.activeMesh = meshOrGroup;
      this.modelGroup.add(this.activeMesh);

      // Compute stats
      const box = new THREE.Box3().setFromObject(meshOrGroup);
      const size = box.getSize(new THREE.Vector3());
      let totalFaces = 0;
      meshOrGroup.traverse(child => {
        if (child.isMesh && child.geometry) {
          totalFaces += child.geometry.index ? child.geometry.index.count / 3 : child.geometry.attributes.position.count / 3;
        }
      });

      if (this.onGeometryUpdated) {
        this.onGeometryUpdated({
          faces: Math.round(totalFaces),
          bounds: `${Math.round(size.x)} × ${Math.round(size.y)} × ${Math.round(size.z)} mm`
        });
      }
    } else {
      if (this.onGeometryUpdated) {
        this.onGeometryUpdated({ faces: 0, bounds: '0 × 0 × 0 mm' });
      }
    }

    this.clearSelection();
  }

  exportSTL(filename = 'voxcad_design.stl') {
    if (!this.activeMesh) return alert('No 3D model in canvas to export.');
    const exporter = new STLExporter();
    const result = exporter.parse(this.modelGroup, { binary: true });
    this.downloadFile(result, filename, 'application/octet-stream');
  }

  exportOBJ(filename = 'voxcad_design.obj') {
    if (!this.activeMesh) return alert('No 3D model in canvas to export.');
    const exporter = new OBJExporter();
    const result = exporter.parse(this.modelGroup);
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
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    if (this.controls) this.controls.update();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
