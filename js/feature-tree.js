/**
 * VoxCAD — Universal 3D Design Synthesizer & Parametric Feature Tree
 * 100% Native Three.js (Zero external CSG dependencies for bulletproof stability)
 */

import * as THREE from 'three';

export class FeatureTree {
  constructor(cadEngine) {
    this.cadEngine = cadEngine;
    this.features = [];
    this.redoStack = [];
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
    this.evaluateGeometry();

    if (this.onTreeUpdated) this.onTreeUpdated(this.features);
    return feature;
  }

  removeOperation(id) {
    const idx = this.features.findIndex(f => f.id === id);
    if (idx !== -1) {
      this.features.splice(idx, 1);
      this.evaluateGeometry();
      if (this.onTreeUpdated) this.onTreeUpdated(this.features);
    }
  }

  undo() {
    if (this.features.length === 0) return false;
    this.redoStack.push(this.features.pop());
    this.evaluateGeometry();
    if (this.onTreeUpdated) this.onTreeUpdated(this.features);
    return true;
  }

  redo() {
    if (this.redoStack.length === 0) return false;
    this.features.push(this.redoStack.pop());
    this.evaluateGeometry();
    if (this.onTreeUpdated) this.onTreeUpdated(this.features);
    return true;
  }

  clear() {
    this.features = [];
    this.redoStack = [];
    this.evaluateGeometry();
    if (this.onTreeUpdated) this.onTreeUpdated(this.features);
  }

  /**
   * Evaluates all features and creates the active 3D model
   */
  evaluateGeometry() {
    if (this.features.length === 0) {
      this.cadEngine.setActiveMesh(null);
      return;
    }

    const rootGroup = new THREE.Group();
    const mat = this.cadEngine.getMaterial();

    for (let i = 0; i < this.features.length; i++) {
      const feat = this.features[i];

      switch (feat.type) {
        // ==========================================
        // VISIONARY PROCEDURAL CONCEPTS
        // ==========================================
        case 'CREATE_STEALTH_DRONE':
          rootGroup.add(this.buildStealthDrone(feat.scale || 1.0));
          break;

        case 'CREATE_TWISTED_TOWER':
          rootGroup.add(this.buildTwistedTower(feat.floors || 18, feat.height || 140));
          break;

        case 'CREATE_REACTOR_CORE':
          rootGroup.add(this.buildReactorCore(feat.radius || 38));
          break;

        case 'CREATE_CYBER_HELMET':
          rootGroup.add(this.buildCyberHelmet());
          break;

        case 'CREATE_ROBOTIC_CLAW':
          rootGroup.add(this.buildRoboticClaw());
          break;

        case 'CREATE_GEAR':
          rootGroup.add(this.buildGear(feat.teeth || 18, feat.radius || 38));
          break;

        case 'CREATE_HYPERCAR':
          rootGroup.add(this.buildHypercar());
          break;

        case 'CREATE_SATELLITE':
          rootGroup.add(this.buildSatellite());
          break;

        // ==========================================
        // MECHANICAL CAD PRIMITIVES & OPERATIONS
        // ==========================================
        case 'CREATE_BOX': {
          const w = feat.width || 100;
          const d = feat.depth || 80;
          const h = feat.height || 15;
          const geo = new THREE.BoxGeometry(w, h, d);
          geo.translate(0, h / 2, 0);
          rootGroup.add(new THREE.Mesh(geo, mat));
          break;
        }

        case 'CREATE_PLATE_WITH_HOLE':
        case 'CUT_HOLE': {
          // Robust 2D Shape with Bore & Corner Mounting Holes
          const w = feat.width || 100;
          const d = feat.depth || 80;
          const h = feat.height || 15;
          const holeDia = feat.diameter || 24;

          const shape = new THREE.Shape();
          shape.moveTo(-w / 2, -d / 2);
          shape.lineTo(w / 2, -d / 2);
          shape.lineTo(w / 2, d / 2);
          shape.lineTo(-w / 2, d / 2);
          shape.closePath();

          // Center Hole
          const centerHole = new THREE.Path();
          centerHole.absarc(0, 0, holeDia / 2, 0, Math.PI * 2, true);
          shape.holes.push(centerHole);

          // 4 Corner Bolt Holes
          const pad = 12;
          const boltR = 3.5;
          [
            [-w/2 + pad, -d/2 + pad],
            [w/2 - pad, -d/2 + pad],
            [w/2 - pad, d/2 - pad],
            [-w/2 + pad, d/2 - pad]
          ].forEach(([bx, by]) => {
            const boltHole = new THREE.Path();
            boltHole.absarc(bx, by, boltR, 0, Math.PI * 2, true);
            shape.holes.push(boltHole);
          });

          const extGeo = new THREE.ExtrudeGeometry(shape, {
            depth: h,
            bevelEnabled: true,
            bevelSize: 1.5,
            bevelThickness: 1.5
          });
          extGeo.rotateX(Math.PI / 2);
          extGeo.translate(0, h, 0);
          rootGroup.add(new THREE.Mesh(extGeo, mat));
          break;
        }

        case 'CREATE_CYLINDER': {
          const dia = feat.diameter || 32;
          const r = dia / 2;
          const h = feat.height || 45;
          const geo = new THREE.CylinderGeometry(r, r, h, 36);
          geo.translate(0, h / 2, 0);
          rootGroup.add(new THREE.Mesh(geo, mat));
          break;
        }

        case 'CREATE_SPHERE': {
          const r = feat.radius || 25;
          const geo = new THREE.SphereGeometry(r, 32, 24);
          geo.translate(0, r, 0);
          rootGroup.add(new THREE.Mesh(geo, mat));
          break;
        }

        case 'EXTRUDE_FACE': {
          const dist = feat.distance || 20;
          const geo = new THREE.CylinderGeometry(15, 15, dist, 24);
          geo.translate(0, 15 + dist / 2, 0);
          rootGroup.add(new THREE.Mesh(geo, mat));
          break;
        }
      }
    }

    this.cadEngine.setActiveMesh(rootGroup);
  }

  // ==========================================
  // PROCEDURAL GENERATOR IMPLEMENTATIONS
  // ==========================================

  buildStealthDrone(scale = 1.0) {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();

    // Fuselage
    const fuseShape = new THREE.Shape();
    fuseShape.moveTo(0, 75);
    fuseShape.lineTo(20, 20);
    fuseShape.lineTo(26, -42);
    fuseShape.lineTo(-26, -42);
    fuseShape.lineTo(-20, 20);
    fuseShape.closePath();

    const fuseGeo = new THREE.ExtrudeGeometry(fuseShape, { depth: 15, bevelEnabled: true, bevelSize: 4, bevelThickness: 3 });
    fuseGeo.rotateX(-Math.PI / 2);
    fuseGeo.translate(0, 10, 0);
    group.add(new THREE.Mesh(fuseGeo, mat));

    // Swept Delta Wings
    const wingShape = new THREE.Shape();
    wingShape.moveTo(15, 10);
    wingShape.lineTo(95, -35);
    wingShape.lineTo(85, -50);
    wingShape.lineTo(20, -38);
    wingShape.closePath();

    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 3.5, bevelEnabled: true, bevelSize: 1 });
    wingGeo.rotateX(-Math.PI / 2);
    wingGeo.translate(0, 8, 0);

    const rightWing = new THREE.Mesh(wingGeo, mat);
    const leftWing = rightWing.clone();
    leftWing.scale.x = -1;
    group.add(rightWing);
    group.add(leftWing);

    // Canted Twin Stabilizers
    const finGeo = new THREE.BoxGeometry(3, 30, 26);
    finGeo.translate(0, 15, 0);

    const rightFin = new THREE.Mesh(finGeo, mat);
    rightFin.position.set(18, 12, -34);
    rightFin.rotation.z = -0.35;
    group.add(rightFin);

    const leftFin = new THREE.Mesh(finGeo, mat);
    leftFin.position.set(-18, 12, -34);
    leftFin.rotation.z = 0.35;
    group.add(leftFin);

    // Dual Thrusters
    const nozGeo = new THREE.CylinderGeometry(6, 8, 18, 24);
    nozGeo.rotateX(Math.PI / 2);

    const leftNoz = new THREE.Mesh(nozGeo, mat);
    leftNoz.position.set(-11, 10, -48);
    const rightNoz = new THREE.Mesh(nozGeo, mat);
    rightNoz.position.set(11, 10, -48);
    group.add(leftNoz);
    group.add(rightNoz);

    // Cockpit Visor
    const canopyGeo = new THREE.SphereGeometry(11, 16, 12);
    canopyGeo.scale(0.8, 0.6, 2.3);
    canopyGeo.translate(0, 18, 12);
    group.add(new THREE.Mesh(canopyGeo, mat));

    group.scale.set(scale, scale, scale);
    return group;
  }

  buildTwistedTower(floors = 18, totalHeight = 140) {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();
    const floorH = totalHeight / floors;

    for (let i = 0; i < floors; i++) {
      const progress = i / floors;
      const rot = progress * Math.PI * 0.8;
      const w = 46 * (1 - progress * 0.4);

      const slabGeo = new THREE.BoxGeometry(w, floorH * 0.7, w);
      const mesh = new THREE.Mesh(slabGeo, mat);
      mesh.position.y = i * floorH + (floorH / 2);
      mesh.rotation.y = rot;
      group.add(mesh);
    }

    const spineGeo = new THREE.CylinderGeometry(10, 14, totalHeight, 16);
    const spine = new THREE.Mesh(spineGeo, mat);
    spine.position.y = totalHeight / 2;
    group.add(spine);

    const spireGeo = new THREE.ConeGeometry(5, 32, 8);
    const spire = new THREE.Mesh(spireGeo, mat);
    spire.position.y = totalHeight + 16;
    group.add(spire);

    return group;
  }

  buildReactorCore(radius = 38) {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();

    const coreGeo = new THREE.IcosahedronGeometry(radius * 0.45, 3);
    coreGeo.translate(0, radius, 0);
    group.add(new THREE.Mesh(coreGeo, mat));

    // Outer Ring
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.95, 2.5, 16, 64), mat);
    ring1.position.y = radius;
    group.add(ring1);

    // Middle Ring
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.75, 2.2, 16, 48), mat);
    ring2.position.y = radius;
    ring2.rotation.x = Math.PI / 3;
    group.add(ring2);

    // Inner Ring
    const ring3 = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.58, 1.8, 16, 48), mat);
    ring3.position.y = radius;
    ring3.rotation.y = Math.PI / 4;
    group.add(ring3);

    for (let a = 0; a < 4; a++) {
      const angle = (a / 4) * Math.PI * 2;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3.5, radius * 1.6, 16), mat);
      col.position.set(Math.cos(angle) * (radius * 1.1), radius * 0.8, Math.sin(angle) * (radius * 1.1));
      group.add(col);
    }

    const base = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.25, radius * 1.35, 10, 32), mat);
    base.position.y = 5;
    group.add(base);

    return group;
  }

  buildCyberHelmet() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();

    const dome = new THREE.Mesh(new THREE.SphereGeometry(30, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.65), mat);
    dome.scale.set(0.85, 1.0, 1.1);
    dome.position.y = 35;
    group.add(dome);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(34, 14, 18), mat);
    visor.position.set(0, 36, 22);
    group.add(visor);

    const jaw = new THREE.Mesh(new THREE.ConeGeometry(22, 22, 6), mat);
    jaw.rotation.x = Math.PI;
    jaw.position.set(0, 18, 10);
    group.add(jaw);

    const podGeo = new THREE.CylinderGeometry(9, 9, 8, 24);
    podGeo.rotateZ(Math.PI / 2);

    const leftPod = new THREE.Mesh(podGeo, mat);
    leftPod.position.set(-28, 30, 0);
    const rightPod = new THREE.Mesh(podGeo, mat);
    rightPod.position.set(28, 30, 0);
    group.add(leftPod);
    group.add(rightPod);

    return group;
  }

  buildRoboticClaw() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();

    const wrist = new THREE.Mesh(new THREE.CylinderGeometry(18, 20, 25, 24), mat);
    wrist.position.y = 12.5;
    group.add(wrist);

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

    const left = new THREE.Mesh(pincerGeo, mat);
    left.position.set(-8, 0, -4);
    left.rotation.z = 0.2;
    group.add(left);

    const right = new THREE.Mesh(pincerGeo, mat);
    right.scale.x = -1;
    right.position.set(8, 0, -4);
    right.rotation.z = -0.2;
    group.add(right);

    return group;
  }

  buildGear(teeth = 18, radius = 38) {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();
    const shape = new THREE.Shape();
    const toothH = 6;
    const innerR = radius - toothH;

    for (let i = 0; i < teeth; i++) {
      const a0 = (i / teeth) * Math.PI * 2;
      const a1 = ((i + 0.3) / teeth) * Math.PI * 2;
      const a2 = ((i + 0.6) / teeth) * Math.PI * 2;
      const a3 = ((i + 0.9) / teeth) * Math.PI * 2;

      if (i === 0) shape.moveTo(Math.cos(a0) * innerR, Math.sin(a0) * innerR);
      shape.lineTo(Math.cos(a1) * radius, Math.sin(a1) * radius);
      shape.lineTo(Math.cos(a2) * radius, Math.sin(a2) * radius);
      shape.lineTo(Math.cos(a3) * innerR, Math.sin(a3) * innerR);
    }
    shape.closePath();

    const hole = new THREE.Path();
    hole.absarc(0, 0, 11, 0, Math.PI * 2, true);
    shape.holes.push(hole);

    const geo = new THREE.ExtrudeGeometry(shape, { depth: 12, bevelEnabled: true, bevelSize: 1, bevelThickness: 1 });
    geo.rotateX(Math.PI / 2);
    geo.translate(0, 6, 0);

    group.add(new THREE.Mesh(geo, mat));
    return group;
  }

  buildHypercar() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();

    // Aerodynamic Chassis
    const bodyShape = new THREE.Shape();
    bodyShape.moveTo(-28, 0);
    bodyShape.lineTo(28, 0);
    bodyShape.lineTo(25, 90);
    bodyShape.lineTo(16, 110);
    bodyShape.lineTo(-16, 110);
    bodyShape.lineTo(-25, 90);
    bodyShape.closePath();

    const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, { depth: 16, bevelEnabled: true, bevelSize: 3 });
    bodyGeo.rotateX(Math.PI / 2);
    bodyGeo.translate(0, 14, 0);
    group.add(new THREE.Mesh(bodyGeo, mat));

    // Cockpit Glass
    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(18, 16, 12), mat);
    cockpit.scale.set(0.9, 0.5, 1.8);
    cockpit.position.set(0, 22, -10);
    group.add(cockpit);

    // Rear Spoiler
    const wing = new THREE.Mesh(new THREE.BoxGeometry(60, 3, 14), mat);
    wing.position.set(0, 25, 42);
    group.add(wing);

    // 4 Wheels
    [
      [-26, 10, -35], [26, 10, -35],
      [-27, 12, 35], [27, 12, 35]
    ].forEach(([wx, wy, wz]) => {
      const wheelGeo = new THREE.CylinderGeometry(11, 11, 9, 24);
      wheelGeo.rotateZ(Math.PI / 2);
      const wheel = new THREE.Mesh(wheelGeo, mat);
      wheel.position.set(wx, wy, wz);
      group.add(wheel);
    });

    return group;
  }

  buildSatellite() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();

    // Central Bus Body
    const bus = new THREE.Mesh(new THREE.BoxGeometry(26, 34, 26), mat);
    bus.position.y = 35;
    group.add(bus);

    // Large Parabolic High-Gain Dish
    const dish = new THREE.Mesh(new THREE.SphereGeometry(18, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.4), mat);
    dish.position.set(0, 62, 0);
    dish.rotation.x = -Math.PI / 2;
    group.add(dish);

    // Dual Extended Solar Panel Arrays
    [-1, 1].forEach(dir => {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 20, 8), mat);
      arm.rotateZ(Math.PI / 2);
      arm.position.set(dir * 22, 35, 0);
      group.add(arm);

      const panel = new THREE.Mesh(new THREE.BoxGeometry(45, 1.5, 22), mat);
      panel.position.set(dir * 54, 35, 0);
      group.add(panel);
    });

    return group;
  }

  generatePythonCADCode() {
    let code = `# Generated by VoxCAD Universal 3D Design Synthesizer\n`;
    code += `from build123d import *\n\nwith BuildPart() as model:\n`;
    if (this.features.length === 0) return code + `    pass\n`;

    for (let i = 0; i < this.features.length; i++) {
      const f = this.features[i];
      code += `    # Step ${i + 1}: ${f.type}\n`;
      if (f.type === 'CREATE_BOX') {
        code += `    Box(${f.width || 100}, ${f.depth || 80}, ${f.height || 15})\n`;
      } else if (f.type === 'CREATE_PLATE_WITH_HOLE') {
        code += `    with BuildSketch():\n        Rectangle(${f.width || 100}, ${f.depth || 80})\n        Circle(radius=${(f.diameter || 24)/2}, mode=Mode.SUBTRACT)\n    extrude(amount=${f.height || 15})\n`;
      } else {
        code += `    # Procedural design: ${f.type}\n`;
      }
    }
    code += `\nexport_step(model.part, "voxcad_export.step")\n`;
    return code;
  }
}
