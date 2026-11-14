/**
 * VoxCAD — Viewport & Scene Management
 * 100% Local Vendor Three.js (Zero CDN dependencies)
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';

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

    this.modelGroup = new THREE.Group();
    this.activeMesh = null;
    this.selectedFace = null;
    this.highlightHelper = null;

    this.isWireframe = false;
    this.showGrid = true;
    this.autoRotate = false;
    this.activeMaterialName = 'titanium';

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.onSelectionChanged = null;
    this.onGeometryUpdated = null;

    this.init();
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x06080f);
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
    this.controls.maxDistance = 1800;
    this.controls.minDistance = 10;
    this.controls.target.set(0, 20, 0);

    // Stop auto-rotate as soon as user touches the canvas
    this.controls.addEventListener('start', () => {
      this.autoRotate = false;
    });

    this.setupLighting();
    this.setupGrid();

    window.addEventListener('resize', () => this.onWindowResize());
    this.canvas.addEventListener('pointerdown', (e) => this.onCanvasClick(e));

    this.animate();
  }

  setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    this.scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(160, 240, 180);
    key.castShadow = true;
    key.shadow.mapSize.width = 2048;
    key.shadow.mapSize.height = 2048;
    this.scene.add(key);

    const rim = new THREE.DirectionalLight(0x38bdf8, 0.65);
    rim.position.set(-180, 100, -160);
    this.scene.add(rim);

    const warmFill = new THREE.DirectionalLight(0xf59e0b, 0.25);
    warmFill.position.set(140, -60, -100);
    this.scene.add(warmFill);
  }

  setupGrid() {
    this.grid = new THREE.GridHelper(360, 36, 0x0284c7, 0x172554);
    this.grid.position.y = 0;
    this.scene.add(this.grid);

    this.axes = new THREE.AxesHelper(35);
    this.axes.position.set(-160, 0.5, -160);
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
    if (this.activeMesh) {
      this.activeMesh.traverse(child => {
        if (child.isMesh) child.material = this.getMaterial(name);
      });
    }
  }

  setCameraView(view) {
    const dist = 180;
    const target = this.controls ? this.controls.target : new THREE.Vector3(0, 20, 0);

    switch (view) {
      case 'iso':
        this.camera.position.set(dist * 0.85, dist * 0.75, dist * 0.85);
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

  toggleAutoRotate() {
    this.autoRotate = !this.autoRotate;
    return this.autoRotate;
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

      const normMat = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
      const worldNorm = hit.face.normal.clone().applyMatrix3(normMat).normalize();

      let desc = "Selected Surface";
      if (Math.abs(worldNorm.y - 1) < 0.2) desc = "Top Face (+Y)";
      else if (Math.abs(worldNorm.y + 1) < 0.2) desc = "Bottom Face (-Y)";
      else if (Math.abs(worldNorm.z - 1) < 0.2) desc = "Front Face (+Z)";
      else if (Math.abs(worldNorm.z + 1) < 0.2) desc = "Back Face (-Z)";
      else if (Math.abs(worldNorm.x - 1) < 0.2) desc = "Right Face (+X)";
      else if (Math.abs(worldNorm.x + 1) < 0.2) desc = "Left Face (-X)";

      this.selectedFace = {
        name: desc,
        normal: worldNorm,
        point: hit.point,
        faceIndex: hit.faceIndex
      };

      this.highlightFace(hit.point, worldNorm);
      if (this.onSelectionChanged) this.onSelectionChanged(this.selectedFace);
    } else {
      this.clearSelection();
    }
  }

  highlightFace(pt, norm) {
    if (this.highlightHelper) {
      this.scene.remove(this.highlightHelper);
      this.highlightHelper = null;
    }

    const helper = new THREE.Group();
    const arrow = new THREE.ArrowHelper(norm, pt, 24, 0x00f2fe, 6, 4);
    helper.add(arrow);

    const disc = new THREE.Mesh(
      new THREE.RingGeometry(1.5, 5.5, 32),
      new THREE.MeshBasicMaterial({ color: 0x00f2fe, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
    );
    disc.position.copy(pt.clone().add(norm.clone().multiplyScalar(0.25)));
    disc.lookAt(pt.clone().add(norm));
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

          const edges = new THREE.EdgesGeometry(child.geometry, 28);
          const line = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 1, transparent: true, opacity: 0.4 })
          );
          child.add(line);
        }
      });

      this.activeMesh = meshOrGroup;
      this.modelGroup.add(this.activeMesh);

      // Frame camera nicely
      this.resetCamera();

      // Enable subtle initial turntable showcase rotation
      this.autoRotate = true;

      // Calculate stats
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

    if (this.autoRotate && this.activeMesh) {
      this.modelGroup.rotation.y += 0.006;
    }

    if (this.controls) this.controls.update();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
