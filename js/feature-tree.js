/**
 * VoxCAD — Universal Parametric Evaluator & Procedural Design Synthesizer
 * Generates both classic mechanical CAD and complex futuristic concept geometry.
 */

import * as THREE from 'three';
import { SUBTRACTION, ADDITION, Brush, Evaluator } from 'three-bvh-csg';

export class FeatureTree {
  constructor(cadEngine) {
    this.cadEngine = cadEngine;
    this.features = [];
    this.redoStack = [];
    this.evaluator = new Evaluator();
    this.evaluator.useGroups = false;

    this.onTreeUpdated = null;
  }

  async addOperation(op) {
    const feature = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toLocaleTimeString(),
      ...op
    };

    this.features.push(feature);
    this.redoStack = [];
    await this.evaluateGeometry();

    if (this.onTreeUpdated) this.onTreeUpdated(this.features);
    return feature;
  }

  async removeOperation(id) {
    const idx = this.features.findIndex(f => f.id === id);
    if (idx !== -1) {
      this.features.splice(idx, 1);
      await this.evaluateGeometry();
      if (this.onTreeUpdated) this.onTreeUpdated(this.features);
    }
  }

  async undo() {
    if (this.features.length === 0) return false;
    this.redoStack.push(this.features.pop());
    await this.evaluateGeometry();
    if (this.onTreeUpdated) this.onTreeUpdated(this.features);
    return true;
  }

  async redo() {
    if (this.redoStack.length === 0) return false;
    this.features.push(this.redoStack.pop());
    await this.evaluateGeometry();
    if (this.onTreeUpdated) this.onTreeUpdated(this.features);
    return true;
  }

  async clear() {
    this.features = [];
    this.redoStack = [];
    await this.evaluateGeometry();
    if (this.onTreeUpdated) this.onTreeUpdated(this.features);
  }

  /**
   * Main Evaluator: Evaluates CSG solids and procedural concept models
   */
  async evaluateGeometry() {
    if (this.features.length === 0) {
      this.cadEngine.setActiveMesh(null);
      return;
    }

    const rootGroup = new THREE.Group();
    let activeBrush = null;

    for (let i = 0; i < this.features.length; i++) {
      const feat = this.features[i];

      switch (feat.type) {
        // ==========================================
        // 1. VISIONARY PROCEDURAL CONCEPT DESIGNS
        // ==========================================
        case 'CREATE_STEALTH_DRONE': {
          const drone = this.buildStealthDrone(feat.scale || 1.0);
          rootGroup.add(drone);
          break;
        }

        case 'CREATE_TWISTED_TOWER': {
          const tower = this.buildTwistedTower(feat.floors || 16, feat.height || 120);
          rootGroup.add(tower);
          break;
        }

        case 'CREATE_REACTOR_CORE': {
          const core = this.buildReactorCore(feat.radius || 40);
          rootGroup.add(core);
          break;
        }

        case 'CREATE_CYBER_HELMET': {
          const helmet = this.buildCyberHelmet();
          rootGroup.add(helmet);
          break;
        }

        case 'CREATE_ROBOTIC_CLAW': {
          const claw = this.buildRoboticClaw();
          rootGroup.add(claw);
          break;
        }

        case 'CREATE_GEAR': {
          const gear = this.buildGear(feat.teeth || 16, feat.radius || 35);
          rootGroup.add(gear);
          break;
        }

        // ==========================================
        // 2. CLASSIC PARAMETRIC CAD SOLIDS
        // ==========================================
        case 'CREATE_BOX': {
          const w = feat.width || 100;
          const d = feat.depth || 80;
          const h = feat.height || 15;
          const geo = new THREE.BoxGeometry(w, h, d);
          geo.translate(0, h / 2, 0);

          const brush = new Brush(geo);
          brush.updateMatrixWorld();
          activeBrush = brush;
          break;
        }

        case 'CREATE_CYLINDER': {
          const dia = feat.diameter || 30;
          const rad = dia / 2;
          const h = feat.height || 40;
          const geo = new THREE.CylinderGeometry(rad, rad, h, 36);

          if (feat.onSelectedFace && feat.face) {
            const p = feat.face.point;
            const norm = feat.face.normal;
            geo.translate(p.x + norm.x * (h / 2), p.y + norm.y * (h / 2), p.z + norm.z * (h / 2));
          } else {
            geo.translate(0, h / 2, 0);
          }

          const cylinderBrush = new Brush(geo);
          cylinderBrush.updateMatrixWorld();

          if (activeBrush) {
            activeBrush = this.evaluator.evaluate(activeBrush, cylinderBrush, ADDITION);
          } else {
            activeBrush = cylinderBrush;
          }
          break;
        }

        case 'CREATE_SPHERE': {
          const rad = feat.radius || 25;
          const geo = new THREE.SphereGeometry(rad, 32, 24);
          geo.translate(0, rad, 0);

          const sphereBrush = new Brush(geo);
          sphereBrush.updateMatrixWorld();

          if (activeBrush) {
            activeBrush = this.evaluator.evaluate(activeBrush, sphereBrush, ADDITION);
          } else {
            activeBrush = sphereBrush;
          }
          break;
        }

        case 'CUT_HOLE': {
          if (!activeBrush) break;
          const dia = feat.diameter || 25;
          const rad = dia / 2;

          activeBrush.geometry.computeBoundingBox();
          const bbox = activeBrush.geometry.boundingBox;
          const totalHeight = (bbox.max.y - bbox.min.y) * 2 || 100;
          const centerY = (bbox.max.y + bbox.min.y) / 2;

          const holeGeo = new THREE.CylinderGeometry(rad, rad, totalHeight, 36);
          holeGeo.translate(0, centerY, 0);

          const cutterBrush = new Brush(holeGeo);
          cutterBrush.updateMatrixWorld();

          activeBrush = this.evaluator.evaluate(activeBrush, cutterBrush, SUBTRACTION);
          break;
        }

        case 'EXTRUDE_FACE': {
          if (!activeBrush || !feat.face) break;
          const dist = feat.distance || 20;
          const norm = feat.face.normal;
          const pt = feat.face.point;

          const extGeo = new THREE.BoxGeometry(40, 40, dist);
          extGeo.translate(pt.x + norm.x * (dist / 2), pt.y + norm.y * (dist / 2), pt.z + norm.z * (dist / 2));

          const extBrush = new Brush(extGeo);
          extBrush.updateMatrixWorld();

          activeBrush = this.evaluator.evaluate(activeBrush, extBrush, ADDITION);
          break;
        }
      }
    }

    if (activeBrush) {
      activeBrush.geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(activeBrush.geometry, this.cadEngine.getMaterial());
      rootGroup.add(mesh);
    }

    this.cadEngine.setActiveMesh(rootGroup);
  }

  // ==========================================
  // PROCEDURAL 3D GENERATOR IMPLEMENTATIONS
  // ==========================================

  /**
   * 1. Futuristic Stealth Jet / Drone
   */
  buildStealthDrone(scale = 1.0) {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();

    // Central Faceted Fuselage
    const fuseShape = new THREE.Shape();
    fuseShape.moveTo(0, 70);       // Nose
    fuseShape.lineTo(18, 20);
    fuseShape.lineTo(24, -40);     // Rear body
    fuseShape.lineTo(-24, -40);
    fuseShape.lineTo(-18, 20);
    fuseShape.closePath();

    const fuseGeo = new THREE.ExtrudeGeometry(fuseShape, {
      depth: 14,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 4,
      bevelThickness: 3
    });
    fuseGeo.rotateX(-Math.PI / 2);
    fuseGeo.translate(0, 10, 0);
    group.add(new THREE.Mesh(fuseGeo, mat));

    // Swept Delta Wings
    const wingShape = new THREE.Shape();
    wingShape.moveTo(12, 10);
    wingShape.lineTo(85, -30);     // Wing tip
    wingShape.lineTo(75, -45);
    wingShape.lineTo(16, -35);
    wingShape.closePath();

    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 3, bevelEnabled: true, bevelSize: 1, bevelThickness: 1 });
    wingGeo.rotateX(-Math.PI / 2);
    wingGeo.translate(0, 8, 0);

    const rightWing = new THREE.Mesh(wingGeo, mat);
    const leftWing = rightWing.clone();
    leftWing.scale.x = -1;
    group.add(rightWing);
    group.add(leftWing);

    // Canted Twin Stabilizers
    const finGeo = new THREE.BoxGeometry(3, 28, 24);
    finGeo.translate(0, 14, 0);

    const rightFin = new THREE.Mesh(finGeo, mat);
    rightFin.position.set(16, 12, -32);
    rightFin.rotation.z = -0.35; // 20 deg outward cant
    group.add(rightFin);

    const leftFin = new THREE.Mesh(finGeo, mat);
    leftFin.position.set(-16, 12, -32);
    leftFin.rotation.z = 0.35;
    group.add(leftFin);

    // Dual Thruster Nozzles
    const nozzleGeo = new THREE.CylinderGeometry(6, 7.5, 16, 24);
    nozzleGeo.rotateX(Math.PI / 2);

    const leftNozzle = new THREE.Mesh(nozzleGeo, mat);
    leftNozzle.position.set(-10, 10, -46);
    group.add(leftNozzle);

    const rightNozzle = new THREE.Mesh(nozzleGeo, mat);
    rightNozzle.position.set(10, 10, -46);
    group.add(rightNozzle);

    // Cockpit Canopy Shield
    const canopyGeo = new THREE.SphereGeometry(10, 16, 12);
    canopyGeo.scale(0.8, 0.6, 2.2);
    canopyGeo.translate(0, 17, 10);
    group.add(new THREE.Mesh(canopyGeo, mat));

    group.scale.set(scale, scale, scale);
    return group;
  }

  /**
   * 2. Twisted Helical Skyscraper / Architecture
   */
  buildTwistedTower(floors = 18, totalHeight = 140) {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();
    const floorHeight = totalHeight / floors;

    for (let i = 0; i < floors; i++) {
      const progress = i / floors;
      const rotation = progress * Math.PI * 0.75; // 135 deg total twist
      const width = 45 * (1 - progress * 0.35); // Slight taper

      const slabGeo = new THREE.BoxGeometry(width, floorHeight * 0.7, width);
      const mesh = new THREE.Mesh(slabGeo, mat);
      mesh.position.y = i * floorHeight + (floorHeight / 2);
      mesh.rotation.y = rotation;
      group.add(mesh);
    }

    // Central structural spine
    const spineGeo = new THREE.CylinderGeometry(10, 14, totalHeight, 16);
    const spine = new THREE.Mesh(spineGeo, mat);
    spine.position.y = totalHeight / 2;
    group.add(spine);

    // Crown spire
    const spireGeo = new THREE.ConeGeometry(5, 30, 8);
    const spire = new THREE.Mesh(spireGeo, mat);
    spire.position.y = totalHeight + 15;
    group.add(spire);

    return group;
  }

  /**
   * 3. Sci-Fi Reactor Core with Concentric Gimbal Rings
   */
  buildReactorCore(radius = 35) {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();

    // Central Glowing Plasma Core
    const coreGeo = new THREE.IcosahedronGeometry(radius * 0.45, 3);
    coreGeo.translate(0, radius, 0);
    group.add(new THREE.Mesh(coreGeo, mat));

    // Outer Ring 1 (Yaw)
    const ring1Geo = new THREE.TorusGeometry(radius * 0.95, 2.5, 16, 64);
    const ring1 = new THREE.Mesh(ring1Geo, mat);
    ring1.position.y = radius;
    group.add(ring1);

    // Middle Ring 2 (Pitch)
    const ring2Geo = new THREE.TorusGeometry(radius * 0.75, 2.2, 16, 48);
    const ring2 = new THREE.Mesh(ring2Geo, mat);
    ring2.position.y = radius;
    ring2.rotation.x = Math.PI / 3;
    group.add(ring2);

    // Inner Ring 3 (Roll)
    const ring3Geo = new THREE.TorusGeometry(radius * 0.58, 1.8, 16, 48);
    const ring3 = new THREE.Mesh(ring3Geo, mat);
    ring3.position.y = radius;
    ring3.rotation.y = Math.PI / 4;
    group.add(ring3);

    // 4 Magnetic Stabilizer Columns
    for (let a = 0; a < 4; a++) {
      const angle = (a / 4) * Math.PI * 2;
      const colGeo = new THREE.CylinderGeometry(2.5, 3.5, radius * 1.6, 16);
      const col = new THREE.Mesh(colGeo, mat);
      col.position.set(Math.cos(angle) * (radius * 1.1), radius * 0.8, Math.sin(angle) * (radius * 1.1));
      group.add(col);
    }

    // Heavy Base Platform
    const baseGeo = new THREE.CylinderGeometry(radius * 1.25, radius * 1.35, 10, 32);
    baseGeo.translate(0, 5, 0);
    group.add(new THREE.Mesh(baseGeo, mat));

    return group;
  }

  /**
   * 4. Cybernetic Helmet
   */
  buildCyberHelmet() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();

    // Main Head Dome
    const domeGeo = new THREE.SphereGeometry(30, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.65);
    domeGeo.scale(0.85, 1.0, 1.1);
    domeGeo.translate(0, 35, 0);
    group.add(new THREE.Mesh(domeGeo, mat));

    // Visor Shield Face Plate
    const visorGeo = new THREE.BoxGeometry(34, 14, 18);
    visorGeo.translate(0, 36, 22);
    group.add(new THREE.Mesh(visorGeo, mat));

    // Jaw / Chin Guard
    const jawGeo = new THREE.ConeGeometry(22, 22, 6);
    jawGeo.rotateX(Math.PI);
    jawGeo.translate(0, 18, 10);
    group.add(new THREE.Mesh(jawGeo, mat));

    // Dual Cylindrical Rebreather Ear Pods
    const podGeo = new THREE.CylinderGeometry(9, 9, 8, 24);
    podGeo.rotateZ(Math.PI / 2);

    const leftPod = new THREE.Mesh(podGeo, mat);
    leftPod.position.set(-28, 30, 0);
    group.add(leftPod);

    const rightPod = new THREE.Mesh(podGeo, mat);
    rightPod.position.set(28, 30, 0);
    group.add(rightPod);

    return group;
  }

  /**
   * 5. Articulated Robotic Gripper / Claw
   */
  buildRoboticClaw() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();

    // Wrist Knuckle
    const wristGeo = new THREE.CylinderGeometry(18, 20, 25, 24);
    wristGeo.translate(0, 12.5, 0);
    group.add(new THREE.Mesh(wristGeo, mat));

    // Dual Opposing Articulated Pincers
    const pincerShape = new THREE.Shape();
    pincerShape.moveTo(0, 0);
    pincerShape.lineTo(12, 10);
    pincerShape.lineTo(10, 45);
    pincerShape.lineTo(2, 60);
    pincerShape.lineTo(-4, 52);
    pincerShape.lineTo(0, 30);
    pincerShape.closePath();

    const pincerGeo = new THREE.ExtrudeGeometry(pincerShape, { depth: 8, bevelEnabled: true, bevelSize: 1 });
    pincerGeo.translate(0, 22, 0);

    const leftPincer = new THREE.Mesh(pincerGeo, mat);
    leftPincer.position.set(-8, 0, -4);
    leftPincer.rotation.z = 0.2;
    group.add(leftPincer);

    const rightPincer = new THREE.Mesh(pincerGeo, mat);
    rightPincer.scale.x = -1;
    rightPincer.position.set(8, 0, -4);
    rightPincer.rotation.z = -0.2;
    group.add(rightPincer);

    return group;
  }

  /**
   * 6. Precision Spur Gear
   */
  buildGear(teeth = 18, radius = 35) {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();
    const shape = new THREE.Shape();
    const toothHeight = 6;
    const innerRadius = radius - toothHeight;

    for (let i = 0; i < teeth; i++) {
      const a0 = (i / teeth) * Math.PI * 2;
      const a1 = ((i + 0.3) / teeth) * Math.PI * 2;
      const a2 = ((i + 0.6) / teeth) * Math.PI * 2;
      const a3 = ((i + 0.9) / teeth) * Math.PI * 2;

      if (i === 0) shape.moveTo(Math.cos(a0) * innerRadius, Math.sin(a0) * innerRadius);
      shape.lineTo(Math.cos(a1) * radius, Math.sin(a1) * radius);
      shape.lineTo(Math.cos(a2) * radius, Math.sin(a2) * radius);
      shape.lineTo(Math.cos(a3) * innerRadius, Math.sin(a3) * innerRadius);
    }
    shape.closePath();

    // Central Shaft Hole
    const hole = new THREE.Path();
    hole.absarc(0, 0, 10, 0, Math.PI * 2, true);
    shape.holes.push(hole);

    const gearGeo = new THREE.ExtrudeGeometry(shape, { depth: 12, bevelEnabled: true, bevelSize: 1, bevelThickness: 1 });
    gearGeo.rotateX(Math.PI / 2);
    gearGeo.translate(0, 6, 0);

    group.add(new THREE.Mesh(gearGeo, mat));
    return group;
  }

  generatePythonCADCode() {
    let code = `# Generated by VoxCAD Universal Design Synthesizer\n`;
    code += `from build123d import *\n\nwith BuildPart() as model:\n`;
    if (this.features.length === 0) return code + `    pass\n`;

    for (let i = 0; i < this.features.length; i++) {
      const f = this.features[i];
      code += `    # Step ${i + 1}: ${f.type}\n`;
      if (f.type === 'CREATE_BOX') {
        code += `    Box(${f.width || 100}, ${f.depth || 80}, ${f.height || 15})\n`;
      } else if (f.type === 'CREATE_CYLINDER') {
        code += `    Cylinder(radius=${(f.diameter || 30) / 2}, height=${f.height || 40})\n`;
      } else if (f.type === 'CUT_HOLE') {
        code += `    Hole(radius=${(f.diameter || 25) / 2})\n`;
      } else {
        code += `    # Procedural ${f.type} generated\n`;
      }
    }
    code += `\nexport_step(model.part, "voxcad_export.step")\n`;
    return code;
  }
}
