/**
 * VoxCAD — Universal Procedural & Parametric Geometry Library
 * Generates any requested physical or concept object with exact metric bounds.
 */

import * as THREE from 'three';

export class FeatureTree {
  constructor(cadEngine) {
    this.cadEngine = cadEngine;
    this.features = [];
    this.redoStack = [];
    this.activeMetrics = null;
    this.onTreeUpdated = null;
    this.onMetricsUpdated = null;
  }

  addOperation(op) {
    const feature = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toLocaleTimeString(),
      scaleX: 1.0,
      scaleY: 1.0,
      scaleZ: 1.0,
      rotationY: 0,
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
    this.activeMetrics = null;
    this.evaluateGeometry();
    if (this.onTreeUpdated) this.onTreeUpdated(this.features);
    if (this.onMetricsUpdated) this.onMetricsUpdated(null);
  }

  updateActiveFeatureScale(scaleX, scaleY, scaleZ) {
    if (this.features.length === 0) return;
    const last = this.features[this.features.length - 1];
    last.scaleX = scaleX;
    last.scaleY = scaleY;
    last.scaleZ = scaleZ;
    this.evaluateGeometry();
  }

  updateActiveFeatureRotation(deg) {
    if (this.features.length === 0) return;
    const last = this.features[this.features.length - 1];
    last.rotationY = deg;
    this.evaluateGeometry();
  }

  /**
   * Main Evaluator: Generates 3D meshes based on feature list
   */
  evaluateGeometry() {
    if (this.features.length === 0) {
      this.cadEngine.setActiveMesh(null);
      if (this.onMetricsUpdated) this.onMetricsUpdated(null);
      return;
    }

    const rootGroup = new THREE.Group();
    const mat = this.cadEngine.getMaterial();

    for (let i = 0; i < this.features.length; i++) {
      const feat = this.features[i];
      let meshOrGroup = null;

      switch (feat.type) {
        // Cars & Vehicles
        case 'CREATE_MERCEDES_CAR':
        case 'CREATE_CAR':
          meshOrGroup = this.buildMercedesCar();
          break;

        case 'CREATE_TIRE':
        case 'CREATE_WHEEL':
          meshOrGroup = this.buildAutomotiveTire(feat.radius || 35);
          break;

        case 'CREATE_HYPERCAR':
          meshOrGroup = this.buildHypercar();
          break;

        // Everyday & Industrial Objects
        case 'CREATE_CIRCLE':
        case 'CREATE_DISC':
          meshOrGroup = this.buildCircularDisc(feat.diameter || 60, feat.thickness || 8);
          break;

        case 'CREATE_MUG':
        case 'CREATE_CUP':
          meshOrGroup = this.buildCoffeeMug();
          break;

        case 'CREATE_CHAIR':
          meshOrGroup = this.buildChair();
          break;

        case 'CREATE_TABLE':
          meshOrGroup = this.buildTable();
          break;

        case 'CREATE_SMARTPHONE':
          meshOrGroup = this.buildSmartphone();
          break;

        case 'CREATE_BOLT':
          meshOrGroup = this.buildBolt();
          break;

        // Visionary Concepts
        case 'CREATE_STEALTH_DRONE':
          meshOrGroup = this.buildStealthDrone();
          break;

        case 'CREATE_TWISTED_TOWER':
          meshOrGroup = this.buildTwistedTower();
          break;

        case 'CREATE_REACTOR_CORE':
          meshOrGroup = this.buildReactorCore();
          break;

        case 'CREATE_CYBER_HELMET':
          meshOrGroup = this.buildCyberHelmet();
          break;

        case 'CREATE_ROBOTIC_CLAW':
          meshOrGroup = this.buildRoboticClaw();
          break;

        case 'CREATE_GEAR':
          meshOrGroup = this.buildGear(feat.teeth || 18, feat.radius || 38);
          break;

        case 'CREATE_SATELLITE':
          meshOrGroup = this.buildSatellite();
          break;

        // Mechanical Primitives
        case 'CREATE_PLATE_WITH_HOLE':
        case 'CUT_HOLE':
          meshOrGroup = this.buildMountingPlate(feat.width || 100, feat.depth || 80, feat.height || 15, feat.diameter || 24);
          break;

        case 'CREATE_BOX': {
          const w = feat.width || 100, d = feat.depth || 80, h = feat.height || 15;
          const geo = new THREE.BoxGeometry(w, h, d);
          geo.translate(0, h / 2, 0);
          meshOrGroup = new THREE.Mesh(geo, mat);
          break;
        }

        case 'CREATE_CYLINDER': {
          const r = (feat.diameter || 32) / 2, h = feat.height || 45;
          const geo = new THREE.CylinderGeometry(r, r, h, 36);
          geo.translate(0, h / 2, 0);
          meshOrGroup = new THREE.Mesh(geo, mat);
          break;
        }

        case 'CREATE_SPHERE': {
          const r = feat.radius || 25;
          const geo = new THREE.SphereGeometry(r, 32, 24);
          geo.translate(0, r, 0);
          meshOrGroup = new THREE.Mesh(geo, mat);
          break;
        }

        default:
          meshOrGroup = this.buildMercedesCar();
          break;
      }

      if (meshOrGroup) {
        // Apply manual scaling and rotation parameters
        if (feat.scaleX !== undefined) {
          meshOrGroup.scale.set(feat.scaleX || 1, feat.scaleY || 1, feat.scaleZ || 1);
        }
        if (feat.rotationY !== undefined) {
          meshOrGroup.rotation.y = THREE.MathUtils.degToRad(feat.rotationY || 0);
        }
        rootGroup.add(meshOrGroup);
      }
    }

    this.cadEngine.setActiveMesh(rootGroup);

    // Compute and dispatch exact Metric details to the UI
    const box = new THREE.Box3().setFromObject(rootGroup);
    const size = box.getSize(new THREE.Vector3());
    const lastFeat = this.features[this.features.length - 1];

    this.activeMetrics = {
      title: (lastFeat.type || 'Object').replace('CREATE_', '').replace(/_/g, ' '),
      length: Math.round(size.x),
      width: Math.round(size.z),
      height: Math.round(size.y),
      scaleX: lastFeat.scaleX || 1.0,
      scaleY: lastFeat.scaleY || 1.0,
      scaleZ: lastFeat.scaleZ || 1.0,
      rotationY: lastFeat.rotationY || 0
    };

    if (this.onMetricsUpdated) {
      this.onMetricsUpdated(this.activeMetrics);
    }
  }

  // ==========================================
  // PROCEDURAL MODELS (CARS, TIRES, SHAPES)
  // ==========================================

  /**
   * Mercedes-Benz Executive Luxury Sedan
   */
  buildMercedesCar() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();

    // 1. Lower Chassis
    const chassisShape = new THREE.Shape();
    chassisShape.moveTo(-32, -80);
    chassisShape.lineTo(32, -80);
    chassisShape.lineTo(32, 75);
    chassisShape.lineTo(26, 85);
    chassisShape.lineTo(-26, 85);
    chassisShape.lineTo(-32, 75);
    chassisShape.closePath();

    const chassisGeo = new THREE.ExtrudeGeometry(chassisShape, { depth: 14, bevelEnabled: true, bevelSize: 2 });
    chassisGeo.rotateX(Math.PI / 2);
    chassisGeo.translate(0, 14, 0);
    group.add(new THREE.Mesh(chassisGeo, mat));

    // 2. Cabin & Roof (Executive Greenhouse)
    const cabinShape = new THREE.Shape();
    cabinShape.moveTo(-25, -45);
    cabinShape.lineTo(25, -45);
    cabinShape.lineTo(24, 25);
    cabinShape.lineTo(-24, 25);
    cabinShape.closePath();

    const cabinGeo = new THREE.ExtrudeGeometry(cabinShape, { depth: 15, bevelEnabled: true, bevelSize: 3 });
    cabinGeo.rotateX(Math.PI / 2);
    cabinGeo.translate(0, 24, -10);
    group.add(new THREE.Mesh(cabinGeo, mat));

    // 3. Hood Star Emblem & Radiator Grille
    const grille = new THREE.Mesh(new THREE.BoxGeometry(24, 8, 3), mat);
    grille.position.set(0, 16, 85);
    group.add(grille);

    const starRing = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.6, 8, 24), mat);
    starRing.position.set(0, 23, 83);
    group.add(starRing);

    // 4. Alloy Wheels & Tires (4 Wheel Set with Rims)
    [
      [-32, 10, -50], [32, 10, -50],
      [-32, 10, 50], [32, 10, 50]
    ].forEach(([wx, wy, wz]) => {
      // Outer Tire Rubber
      const tireGeo = new THREE.CylinderGeometry(11, 11, 8, 24);
      tireGeo.rotateZ(Math.PI / 2);
      const tire = new THREE.Mesh(tireGeo, mat);
      tire.position.set(wx, wy, wz);
      group.add(tire);

      // Inner Hub Rim
      const rimGeo = new THREE.CylinderGeometry(6, 6, 8.5, 16);
      rimGeo.rotateZ(Math.PI / 2);
      const rim = new THREE.Mesh(rimGeo, mat);
      rim.position.set(wx, wy, wz);
      group.add(rim);
    });

    return group;
  }

  /**
   * Automotive Tire (Tiek / Wheel)
   */
  buildAutomotiveTire(radius = 35) {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();

    // 1. Toroidal Outer Rubber Tread
    const treadGeo = new THREE.TorusGeometry(radius, 12, 24, 48);
    treadGeo.rotateX(Math.PI / 2);
    treadGeo.translate(0, radius + 12, 0);
    group.add(new THREE.Mesh(treadGeo, mat));

    // 2. Central Alloy Wheel Rim
    const rimGeo = new THREE.CylinderGeometry(radius * 0.75, radius * 0.75, 18, 32);
    rimGeo.translate(0, radius + 12, 0);
    group.add(new THREE.Mesh(rimGeo, mat));

    // 3. Center Axle Bore
    const axleGeo = new THREE.CylinderGeometry(radius * 0.25, radius * 0.25, 22, 24);
    axleGeo.translate(0, radius + 12, 0);
    group.add(new THREE.Mesh(axleGeo, mat));

    // 4. Five Wheel Lug Nuts
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const lug = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 4, 6), mat);
      lug.position.set(Math.cos(angle) * (radius * 0.42), radius + 21, Math.sin(angle) * (radius * 0.42));
      group.add(lug);
    }

    return group;
  }

  /**
   * Precision Circular Disc (Circle / Ring)
   */
  buildCircularDisc(diameter = 60, thickness = 8) {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();
    const rad = diameter / 2;

    const shape = new THREE.Shape();
    shape.absarc(0, 0, rad, 0, Math.PI * 2, false);

    // Center hole for mounting
    const hole = new THREE.Path();
    hole.absarc(0, 0, rad * 0.35, 0, Math.PI * 2, true);
    shape.holes.push(hole);

    const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: true, bevelSize: 1.5, bevelThickness: 1.5 });
    geo.rotateX(Math.PI / 2);
    geo.translate(0, thickness, 0);
    group.add(new THREE.Mesh(geo, mat));

    return group;
  }

  /**
   * Hollow Coffee Mug with Handle
   */
  buildCoffeeMug() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();

    // Outer Mug Body
    const body = new THREE.Mesh(new THREE.CylinderGeometry(20, 18, 50, 32), mat);
    body.position.y = 25;
    group.add(body);

    // Handle
    const handle = new THREE.Mesh(new THREE.TorusGeometry(14, 3, 16, 32, Math.PI * 1.1), mat);
    handle.position.set(20, 25, 0);
    handle.rotation.z = -Math.PI / 2;
    group.add(handle);

    return group;
  }

  /**
   * Modern Ergonomic Chair
   */
  buildChair() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();

    // Seat Cushion
    const seat = new THREE.Mesh(new THREE.BoxGeometry(40, 5, 40), mat);
    seat.position.y = 35;
    group.add(seat);

    // Backrest
    const back = new THREE.Mesh(new THREE.BoxGeometry(40, 45, 5), mat);
    back.position.set(0, 58, -18);
    group.add(back);

    // 4 Legs
    [[-16, 17, -16], [16, 17, -16], [-16, 17, 16], [16, 17, 16]].forEach(([lx, ly, lz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(2, 1.5, 35, 12), mat);
      leg.position.set(lx, ly, lz);
      group.add(leg);
    });

    return group;
  }

  /**
   * Modern Desk / Table
   */
  buildTable() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();

    // Tabletop
    const top = new THREE.Mesh(new THREE.BoxGeometry(90, 6, 50), mat);
    top.position.y = 52;
    group.add(top);

    // 4 Tapered Legs
    [[-38, 25, -20], [38, 25, -20], [-38, 25, 20], [38, 25, 20]].forEach(([tx, ty, tz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 1.5, 50, 16), mat);
      leg.position.set(tx, ty, tz);
      group.add(leg);
    });

    return group;
  }

  /**
   * Smartphone / Tablet
   */
  buildSmartphone() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();

    // Beveled Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(36, 75, 5), mat);
    body.position.y = 38;
    group.add(body);

    // Camera Island
    const cam = new THREE.Mesh(new THREE.BoxGeometry(14, 14, 2), mat);
    cam.position.set(9, 65, -3);
    group.add(cam);

    return group;
  }

  /**
   * Industrial Hex Bolt
   */
  buildBolt() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();

    // Hex Head
    const head = new THREE.Mesh(new THREE.CylinderGeometry(18, 18, 12, 6), mat);
    head.position.y = 54;
    group.add(head);

    // Threaded Shaft
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 48, 24), mat);
    shaft.position.y = 24;
    group.add(shaft);

    return group;
  }

  /**
   * Mounting Plate with Center Bore & 4 Corner Holes
   */
  buildMountingPlate(w = 100, d = 80, h = 15, holeDia = 24) {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();

    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, -d / 2);
    shape.lineTo(w / 2, -d / 2);
    shape.lineTo(w / 2, d / 2);
    shape.lineTo(-w / 2, d / 2);
    shape.closePath();

    const centerHole = new THREE.Path();
    centerHole.absarc(0, 0, holeDia / 2, 0, Math.PI * 2, true);
    shape.holes.push(centerHole);

    const pad = 12, boltR = 3.5;
    [[-w/2 + pad, -d/2 + pad], [w/2 - pad, -d/2 + pad], [w/2 - pad, d/2 - pad], [-w/2 + pad, d/2 - pad]].forEach(([bx, by]) => {
      const boltHole = new THREE.Path();
      boltHole.absarc(bx, by, boltR, 0, Math.PI * 2, true);
      shape.holes.push(boltHole);
    });

    const extGeo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: true, bevelSize: 1.5, bevelThickness: 1.5 });
    extGeo.rotateX(Math.PI / 2);
    extGeo.translate(0, h, 0);
    group.add(new THREE.Mesh(extGeo, mat));

    return group;
  }

  buildStealthDrone() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();

    const fuseShape = new THREE.Shape();
    fuseShape.moveTo(0, 75);
    fuseShape.lineTo(20, 20);
    fuseShape.lineTo(26, -42);
    fuseShape.lineTo(-26, -42);
    fuseShape.lineTo(-20, 20);
    fuseShape.closePath();

    const fuseGeo = new THREE.ExtrudeGeometry(fuseShape, { depth: 15, bevelEnabled: true, bevelSize: 4 });
    fuseGeo.rotateX(-Math.PI / 2);
    fuseGeo.translate(0, 10, 0);
    group.add(new THREE.Mesh(fuseGeo, mat));

    const wingShape = new THREE.Shape();
    wingShape.moveTo(15, 10);
    wingShape.lineTo(95, -35);
    wingShape.lineTo(85, -50);
    wingShape.lineTo(20, -38);
    wingShape.closePath();

    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 3.5, bevelEnabled: true, bevelSize: 1 });
    wingGeo.rotateX(-Math.PI / 2);
    wingGeo.translate(0, 8, 0);

    const rw = new THREE.Mesh(wingGeo, mat);
    const lw = rw.clone();
    lw.scale.x = -1;
    group.add(rw);
    group.add(lw);

    const finGeo = new THREE.BoxGeometry(3, 30, 26);
    finGeo.translate(0, 15, 0);
    const rf = new THREE.Mesh(finGeo, mat);
    rf.position.set(18, 12, -34);
    rf.rotation.z = -0.35;
    const lf = new THREE.Mesh(finGeo, mat);
    lf.position.set(-18, 12, -34);
    lf.rotation.z = 0.35;
    group.add(rf);
    group.add(lf);

    return group;
  }

  buildTwistedTower() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();
    const floors = 18, totalH = 140, floorH = totalH / floors;

    for (let i = 0; i < floors; i++) {
      const p = i / floors;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(46 * (1 - p * 0.4), floorH * 0.7, 46 * (1 - p * 0.4)), mat);
      mesh.position.y = i * floorH + (floorH / 2);
      mesh.rotation.y = p * Math.PI * 0.8;
      group.add(mesh);
    }
    const spine = new THREE.Mesh(new THREE.CylinderGeometry(10, 14, totalH, 16), mat);
    spine.position.y = totalH / 2;
    group.add(spine);

    return group;
  }

  buildReactorCore() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();
    const r = 38;

    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(r * 0.45, 3), mat);
    core.position.y = r;
    group.add(core);

    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(r * 0.95, 2.5, 16, 64), mat);
    ring1.position.y = r;
    group.add(ring1);

    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(r * 0.75, 2.2, 16, 48), mat);
    ring2.position.y = r;
    ring2.rotation.x = Math.PI / 3;
    group.add(ring2);

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

    return group;
  }

  buildRoboticClaw() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();
    const wrist = new THREE.Mesh(new THREE.CylinderGeometry(18, 20, 25, 24), mat);
    wrist.position.y = 12.5;
    group.add(wrist);

    const pShape = new THREE.Shape();
    pShape.moveTo(0, 0); pShape.lineTo(12, 10); pShape.lineTo(10, 45); pShape.lineTo(2, 60); pShape.lineTo(-4, 52); pShape.lineTo(0, 30); pShape.closePath();
    const pGeo = new THREE.ExtrudeGeometry(pShape, { depth: 8, bevelEnabled: true });
    pGeo.translate(0, 22, 0);

    const left = new THREE.Mesh(pGeo, mat);
    left.position.set(-8, 0, -4); left.rotation.z = 0.2;
    const right = new THREE.Mesh(pGeo, mat);
    right.scale.x = -1; right.position.set(8, 0, -4); right.rotation.z = -0.2;
    group.add(left); group.add(right);

    return group;
  }

  buildGear(teeth = 18, radius = 38) {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();
    const shape = new THREE.Shape();
    const innerR = radius - 6;

    for (let i = 0; i < teeth; i++) {
      const a0 = (i / teeth) * Math.PI * 2, a1 = ((i + 0.3) / teeth) * Math.PI * 2, a2 = ((i + 0.6) / teeth) * Math.PI * 2, a3 = ((i + 0.9) / teeth) * Math.PI * 2;
      if (i === 0) shape.moveTo(Math.cos(a0) * innerR, Math.sin(a0) * innerR);
      shape.lineTo(Math.cos(a1) * radius, Math.sin(a1) * radius);
      shape.lineTo(Math.cos(a2) * radius, Math.sin(a2) * radius);
      shape.lineTo(Math.cos(a3) * innerR, Math.sin(a3) * innerR);
    }
    shape.closePath();

    const hole = new THREE.Path();
    hole.absarc(0, 0, 11, 0, Math.PI * 2, true);
    shape.holes.push(hole);

    const geo = new THREE.ExtrudeGeometry(shape, { depth: 12, bevelEnabled: true });
    geo.rotateX(Math.PI / 2);
    geo.translate(0, 6, 0);
    group.add(new THREE.Mesh(geo, mat));

    return group;
  }

  buildHypercar() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();

    const bShape = new THREE.Shape();
    bShape.moveTo(-28, 0); bShape.lineTo(28, 0); bShape.lineTo(25, 90); bShape.lineTo(16, 110); bShape.lineTo(-16, 110); bShape.lineTo(-25, 90); bShape.closePath();
    const bGeo = new THREE.ExtrudeGeometry(bShape, { depth: 16, bevelEnabled: true, bevelSize: 3 });
    bGeo.rotateX(Math.PI / 2);
    bGeo.translate(0, 14, 0);
    group.add(new THREE.Mesh(bGeo, mat));

    const cp = new THREE.Mesh(new THREE.SphereGeometry(18, 16, 12), mat);
    cp.scale.set(0.9, 0.5, 1.8);
    cp.position.set(0, 22, -10);
    group.add(cp);

    return group;
  }

  buildSatellite() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();
    const bus = new THREE.Mesh(new THREE.BoxGeometry(26, 34, 26), mat);
    bus.position.y = 35;
    group.add(bus);

    const dish = new THREE.Mesh(new THREE.SphereGeometry(18, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.4), mat);
    dish.position.set(0, 62, 0);
    dish.rotation.x = -Math.PI / 2;
    group.add(dish);

    [-1, 1].forEach(dir => {
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
      code += `    # Dimensions: Scale (${f.scaleX || 1}, ${f.scaleY || 1}, ${f.scaleZ || 1})\n`;
    }
    code += `\nexport_step(model.part, "voxcad_export.step")\n`;
    return code;
  }
}
