/**
 * VoxCAD — Universal Generative 3D Synthesizer & Parametric Feature Tree
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

      // Check if it is a Dynamic AI Generated 3D Model
      if (feat.type === 'GENAI_DYNAMIC_MODEL' && feat.group) {
        meshOrGroup = feat.group.clone();
      } else {
        switch (feat.type) {
          // 1. ANATOMY & BIOLOGY
          case 'CREATE_FACE':
            meshOrGroup = this.buildHumanFace();
            break;
          case 'CREATE_EYE':
            meshOrGroup = this.buildHumanEye();
            break;
          case 'CREATE_DNA':
            meshOrGroup = this.buildDNAHelix();
            break;

          // 2. FINE ART & SCULPTURE
          case 'CREATE_ART_SCULPTURE':
            meshOrGroup = this.buildModernArtSculpture();
            break;
          case 'CREATE_GEMSTONE':
            meshOrGroup = this.buildFacetedGemstone();
            break;
          case 'CREATE_CROWN':
            meshOrGroup = this.buildRoyalCrown();
            break;
          case 'CREATE_GUITAR':
            meshOrGroup = this.buildGuitar();
            break;
          case 'CREATE_SWORD':
            meshOrGroup = this.buildSword();
            break;

          // 3. ARCHITECTURE & NATURE
          case 'CREATE_CASTLE':
          case 'CREATE_TOWER':
            meshOrGroup = this.buildCastleTower();
            break;
          case 'CREATE_TREE':
            meshOrGroup = this.buildTree();
            break;

          // 4. VEHICLES & AUTOMOTIVE
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

          // 5. EVERYDAY & INDUSTRIAL
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

          // 6. SCI-FI & AEROSPACE
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

          // 7. MECHANICAL CAD PRIMITIVES
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
            meshOrGroup = this.buildUniversalHarmonicManifold(feat.prompt || 'Sculptural Form');
            break;
        }
      }

      if (meshOrGroup) {
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

    // Compute metrics
    const box = new THREE.Box3().setFromObject(rootGroup);
    const size = box.getSize(new THREE.Vector3());
    const lastFeat = this.features[this.features.length - 1];

    this.activeMetrics = {
      title: (lastFeat.displayTitle || lastFeat.type || 'Object').replace('CREATE_', '').replace(/_/g, ' '),
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
  // PROCEDURAL BASE MODELS
  // ==========================================

  buildHumanFace() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();

    const head = new THREE.Mesh(new THREE.SphereGeometry(26, 24, 20), mat);
    head.scale.set(0.9, 1.25, 1.0); head.position.set(0, 48, 0); group.add(head);

    const brow = new THREE.Mesh(new THREE.BoxGeometry(28, 6, 8), mat);
    brow.position.set(0, 52, 22); group.add(brow);

    const nose = new THREE.Mesh(new THREE.ConeGeometry(5.5, 20, 4), mat);
    nose.rotation.x = Math.PI / 2 + 0.15; nose.position.set(0, 42, 25); group.add(nose);

    [-1, 1].forEach(dir => {
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(6, 12, 12), mat);
      cheek.scale.set(1.4, 0.8, 1.0); cheek.position.set(dir * 14, 40, 18); group.add(cheek);

      const eyeLid = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 8, 0, Math.PI), mat);
      eyeLid.rotation.x = -Math.PI / 4; eyeLid.position.set(dir * 9, 49, 23); group.add(eyeLid);
    });

    const lipTop = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 12, 12), mat);
    lipTop.rotateZ(Math.PI / 2); lipTop.position.set(0, 31, 22); group.add(lipTop);

    const chin = new THREE.Mesh(new THREE.BoxGeometry(12, 10, 12), mat);
    chin.position.set(0, 18, 18); group.add(chin);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(11, 14, 25, 20), mat);
    neck.position.set(0, 10, 0); group.add(neck);

    const plinth = new THREE.Mesh(new THREE.BoxGeometry(40, 6, 40), mat);
    plinth.position.set(0, 3, 0); group.add(plinth);

    return group;
  }

  buildHumanEye() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();
    const eyeRadius = 32;

    const eyeball = new THREE.Mesh(new THREE.SphereGeometry(eyeRadius, 36, 24), mat);
    eyeball.position.set(0, eyeRadius + 5, 0); group.add(eyeball);

    const cornea = new THREE.Mesh(new THREE.SphereGeometry(eyeRadius * 0.55, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.45), mat);
    cornea.position.set(0, eyeRadius + 5, eyeRadius * 0.72); cornea.rotation.x = Math.PI / 2; group.add(cornea);

    const iris = new THREE.Mesh(new THREE.TorusGeometry(eyeRadius * 0.38, 2.5, 16, 48), mat);
    iris.position.set(0, eyeRadius + 5, eyeRadius * 0.92); group.add(iris);

    const pupil = new THREE.Mesh(new THREE.CylinderGeometry(eyeRadius * 0.16, eyeRadius * 0.16, 2, 24), mat);
    pupil.rotateX(Math.PI / 2); pupil.position.set(0, eyeRadius + 5, eyeRadius * 0.94); group.add(pupil);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(26, 28, 5, 32), mat);
    base.position.set(0, 2.5, 0); group.add(base);

    return group;
  }

  buildDNAHelix() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();
    const turns = 3.5, height = 120, radius = 22, pairs = 32;

    for (let i = 0; i < pairs; i++) {
      const frac = i / pairs, angle = frac * Math.PI * 2 * turns, y = frac * height + 10;
      const x1 = Math.cos(angle) * radius, z1 = Math.sin(angle) * radius;
      const x2 = Math.cos(angle + Math.PI) * radius, z2 = Math.sin(angle + Math.PI) * radius;

      const s1 = new THREE.Mesh(new THREE.SphereGeometry(3.5, 12, 10), mat);
      s1.position.set(x1, y, z1); group.add(s1);

      const s2 = new THREE.Mesh(new THREE.SphereGeometry(3.5, 12, 10), mat);
      s2.position.set(x2, y, z2); group.add(s2);

      const rung = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, radius * 2, 8), mat);
      rung.position.set(0, y, 0); rung.rotation.z = Math.PI / 2; rung.rotation.y = -angle;
      group.add(rung);
    }
    return group;
  }

  buildModernArtSculpture() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();
    const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(28, 7.5, 128, 32, 2, 5), mat);
    knot.position.set(0, 52, 0); group.add(knot);

    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(26, 30, 16, 24), mat);
    plinth.position.set(0, 8, 0); group.add(plinth);
    return group;
  }

  buildFacetedGemstone() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();
    const gem = new THREE.Mesh(new THREE.IcosahedronGeometry(28, 1), mat);
    gem.scale.set(1.1, 0.9, 1.1); gem.position.set(0, 35, 0); group.add(gem);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(22, 3, 16, 36), mat);
    ring.rotation.x = Math.PI / 2; ring.position.set(0, 20, 0); group.add(ring);
    return group;
  }

  buildRoyalCrown() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();
    const crownR = 30;

    const band = new THREE.Mesh(new THREE.CylinderGeometry(crownR, crownR, 8, 32, 1, true), mat);
    band.position.set(0, 12, 0); group.add(band);

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const x = Math.cos(angle) * crownR, z = Math.sin(angle) * crownR;
      const peak = new THREE.Mesh(new THREE.ConeGeometry(4.5, 20, 6), mat);
      peak.position.set(x, 26, z); group.add(peak);

      const gem = new THREE.Mesh(new THREE.SphereGeometry(3, 10, 8), mat);
      gem.position.set(x, 38, z); group.add(gem);
    }
    return group;
  }

  buildGuitar() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();

    const lowerBout = new THREE.Mesh(new THREE.CylinderGeometry(30, 30, 8, 32), mat);
    lowerBout.rotateX(Math.PI / 2); lowerBout.position.set(0, 30, 0); group.add(lowerBout);

    const upperBout = new THREE.Mesh(new THREE.CylinderGeometry(22, 22, 8, 32), mat);
    upperBout.rotateX(Math.PI / 2); upperBout.position.set(0, 60, 0); group.add(upperBout);

    const neck = new THREE.Mesh(new THREE.BoxGeometry(6, 65, 4), mat);
    neck.position.set(0, 100, 0); group.add(neck);

    const headstock = new THREE.Mesh(new THREE.BoxGeometry(10, 20, 4), mat);
    headstock.position.set(0, 138, 0); group.add(headstock);

    return group;
  }

  buildSword() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();

    const blade = new THREE.Mesh(new THREE.BoxGeometry(8, 95, 2.5), mat);
    blade.position.set(0, 68, 0); group.add(blade);

    const tip = new THREE.Mesh(new THREE.ConeGeometry(5.5, 18, 4), mat);
    tip.position.set(0, 124, 0); group.add(tip);

    const guard = new THREE.Mesh(new THREE.BoxGeometry(38, 5, 6), mat);
    guard.position.set(0, 20, 0); group.add(guard);

    const grip = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 18, 12), mat);
    grip.position.set(0, 9, 0); group.add(grip);

    const pommel = new THREE.Mesh(new THREE.SphereGeometry(5, 12, 10), mat);
    pommel.position.set(0, -1, 0); group.add(pommel);

    return group;
  }

  buildCastleTower() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(24, 28, 90, 24), mat);
    tower.position.set(0, 45, 0); group.add(tower);

    const battlement = new THREE.Mesh(new THREE.CylinderGeometry(28, 26, 12, 24), mat);
    battlement.position.set(0, 92, 0); group.add(battlement);

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(7, 8, 4), mat);
      tooth.position.set(Math.cos(angle) * 27, 101, Math.sin(angle) * 27);
      tooth.rotation.y = -angle; group.add(tooth);
    }
    return group;
  }

  buildTree() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(5, 9, 45, 12), mat);
    trunk.position.set(0, 22.5, 0); group.add(trunk);

    [[32, 28, 42], [26, 24, 62], [18, 18, 78]].forEach(([r, h, y]) => {
      const foliage = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), mat);
      foliage.position.set(0, y, 0); group.add(foliage);
    });
    return group;
  }

  buildMercedesCar() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();

    const chassisShape = new THREE.Shape();
    chassisShape.moveTo(-32, -80); chassisShape.lineTo(32, -80); chassisShape.lineTo(32, 75);
    chassisShape.lineTo(26, 85); chassisShape.lineTo(-26, 85); chassisShape.lineTo(-32, 75); chassisShape.closePath();

    const chassisGeo = new THREE.ExtrudeGeometry(chassisShape, { depth: 14, bevelEnabled: true, bevelSize: 2 });
    chassisGeo.rotateX(Math.PI / 2); chassisGeo.translate(0, 14, 0);
    group.add(new THREE.Mesh(chassisGeo, mat));

    const cabinShape = new THREE.Shape();
    cabinShape.moveTo(-25, -45); cabinShape.lineTo(25, -45); cabinShape.lineTo(24, 25); cabinShape.lineTo(-24, 25); cabinShape.closePath();
    const cabinGeo = new THREE.ExtrudeGeometry(cabinShape, { depth: 15, bevelEnabled: true, bevelSize: 3 });
    cabinGeo.rotateX(Math.PI / 2); cabinGeo.translate(0, 24, -10);
    group.add(new THREE.Mesh(cabinGeo, mat));

    const grille = new THREE.Mesh(new THREE.BoxGeometry(24, 8, 3), mat);
    grille.position.set(0, 16, 85); group.add(grille);

    const starRing = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.6, 8, 24), mat);
    starRing.position.set(0, 23, 83); group.add(starRing);

    [[-32, 10, -50], [32, 10, -50], [-32, 10, 50], [32, 10, 50]].forEach(([wx, wy, wz]) => {
      const tireGeo = new THREE.CylinderGeometry(11, 11, 8, 24);
      tireGeo.rotateZ(Math.PI / 2);
      const tire = new THREE.Mesh(tireGeo, mat);
      tire.position.set(wx, wy, wz); group.add(tire);
    });
    return group;
  }

  buildAutomotiveTire(radius = 35) {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();

    const treadGeo = new THREE.TorusGeometry(radius, 12, 24, 48);
    treadGeo.rotateX(Math.PI / 2); treadGeo.translate(0, radius + 12, 0);
    group.add(new THREE.Mesh(treadGeo, mat));

    const rimGeo = new THREE.CylinderGeometry(radius * 0.75, radius * 0.75, 18, 32);
    rimGeo.translate(0, radius + 12, 0); group.add(new THREE.Mesh(rimGeo, mat));

    const axleGeo = new THREE.CylinderGeometry(radius * 0.25, radius * 0.25, 22, 24);
    axleGeo.translate(0, radius + 12, 0); group.add(new THREE.Mesh(axleGeo, mat));

    return group;
  }

  buildCircularDisc(diameter = 60, thickness = 8) {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();
    const rad = diameter / 2;

    const shape = new THREE.Shape();
    shape.absarc(0, 0, rad, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, rad * 0.35, 0, Math.PI * 2, true);
    shape.holes.push(hole);

    const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: true, bevelSize: 1.5 });
    geo.rotateX(Math.PI / 2); geo.translate(0, thickness, 0);
    group.add(new THREE.Mesh(geo, mat));
    return group;
  }

  buildCoffeeMug() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(20, 18, 50, 32), mat);
    body.position.y = 25; group.add(body);

    const handle = new THREE.Mesh(new THREE.TorusGeometry(14, 3, 16, 32, Math.PI * 1.1), mat);
    handle.position.set(20, 25, 0); handle.rotation.z = -Math.PI / 2; group.add(handle);
    return group;
  }

  buildChair() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(40, 5, 40), mat);
    seat.position.y = 35; group.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(40, 45, 5), mat);
    back.position.set(0, 58, -18); group.add(back);

    [[-16, 17, -16], [16, 17, -16], [-16, 17, 16], [16, 17, 16]].forEach(([lx, ly, lz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(2, 1.5, 35, 12), mat);
      leg.position.set(lx, ly, lz); group.add(leg);
    });
    return group;
  }

  buildTable() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();
    const top = new THREE.Mesh(new THREE.BoxGeometry(90, 6, 50), mat);
    top.position.y = 52; group.add(top);

    [[-38, 25, -20], [38, 25, -20], [-38, 25, 20], [38, 25, 20]].forEach(([tx, ty, tz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 1.5, 50, 16), mat);
      leg.position.set(tx, ty, tz); group.add(leg);
    });
    return group;
  }

  buildSmartphone() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();
    const body = new THREE.Mesh(new THREE.BoxGeometry(36, 75, 5), mat);
    body.position.y = 38; group.add(body);

    const cam = new THREE.Mesh(new THREE.BoxGeometry(14, 14, 2), mat);
    cam.position.set(9, 65, -3); group.add(cam);
    return group;
  }

  buildBolt() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();
    const head = new THREE.Mesh(new THREE.CylinderGeometry(18, 18, 12, 6), mat);
    head.position.y = 54; group.add(head);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 48, 24), mat);
    shaft.position.y = 24; group.add(shaft);
    return group;
  }

  buildMountingPlate(w = 100, d = 80, h = 15, holeDia = 24) {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, -d / 2); shape.lineTo(w / 2, -d / 2); shape.lineTo(w / 2, d / 2); shape.lineTo(-w / 2, d / 2); shape.closePath();

    const centerHole = new THREE.Path();
    centerHole.absarc(0, 0, holeDia / 2, 0, Math.PI * 2, true);
    shape.holes.push(centerHole);

    const extGeo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: true, bevelSize: 1.5 });
    extGeo.rotateX(Math.PI / 2); extGeo.translate(0, h, 0);
    group.add(new THREE.Mesh(extGeo, mat));
    return group;
  }

  buildStealthDrone() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();
    const fuseShape = new THREE.Shape();
    fuseShape.moveTo(0, 75); fuseShape.lineTo(20, 20); fuseShape.lineTo(26, -42); fuseShape.lineTo(-26, -42); fuseShape.lineTo(-20, 20); fuseShape.closePath();
    const fuseGeo = new THREE.ExtrudeGeometry(fuseShape, { depth: 15, bevelEnabled: true, bevelSize: 4 });
    fuseGeo.rotateX(-Math.PI / 2); fuseGeo.translate(0, 10, 0); group.add(new THREE.Mesh(fuseGeo, mat));

    const wingShape = new THREE.Shape();
    wingShape.moveTo(15, 10); wingShape.lineTo(95, -35); wingShape.lineTo(85, -50); wingShape.lineTo(20, -38); wingShape.closePath();
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 3.5, bevelEnabled: true, bevelSize: 1 });
    wingGeo.rotateX(-Math.PI / 2); wingGeo.translate(0, 8, 0);

    const rw = new THREE.Mesh(wingGeo, mat);
    const lw = rw.clone(); lw.scale.x = -1;
    group.add(rw); group.add(lw);
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
    return group;
  }

  buildReactorCore() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();
    const r = 38;
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(r * 0.45, 3), mat);
    core.position.y = r; group.add(core);

    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(r * 0.95, 2.5, 16, 64), mat);
    ring1.position.y = r; group.add(ring1);
    return group;
  }

  buildCyberHelmet() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(30, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.65), mat);
    dome.scale.set(0.85, 1.0, 1.1); dome.position.y = 35; group.add(dome);
    return group;
  }

  buildRoboticClaw() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();
    const wrist = new THREE.Mesh(new THREE.CylinderGeometry(18, 20, 25, 24), mat);
    wrist.position.y = 12.5; group.add(wrist);
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
    geo.rotateX(Math.PI / 2); geo.translate(0, 6, 0);
    group.add(new THREE.Mesh(geo, mat));
    return group;
  }

  buildHypercar() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();
    const bShape = new THREE.Shape();
    bShape.moveTo(-28, 0); bShape.lineTo(28, 0); bShape.lineTo(25, 90); bShape.lineTo(16, 110); bShape.lineTo(-16, 110); bShape.lineTo(-25, 90); bShape.closePath();
    const bGeo = new THREE.ExtrudeGeometry(bShape, { depth: 16, bevelEnabled: true, bevelSize: 3 });
    bGeo.rotateX(Math.PI / 2); bGeo.translate(0, 14, 0);
    group.add(new THREE.Mesh(bGeo, mat));
    return group;
  }

  buildSatellite() {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();
    const bus = new THREE.Mesh(new THREE.BoxGeometry(26, 34, 26), mat);
    bus.position.y = 35; group.add(bus);
    return group;
  }

  buildUniversalHarmonicManifold(promptText = '') {
    const group = new THREE.Group();
    const mat = this.cadEngine.getMaterial();

    let hash = 0;
    for (let c = 0; c < promptText.length; c++) {
      hash = (hash << 5) - hash + promptText.charCodeAt(c);
      hash |= 0;
    }
    const seed = Math.abs(hash);
    const p1 = (seed % 5) + 2;
    const q1 = ((seed >> 3) % 4) + 3;

    const knotGeo = new THREE.TorusKnotGeometry(26, 6.5, 100, 24, p1, q1);
    const mesh = new THREE.Mesh(knotGeo, mat);
    mesh.position.set(0, 42, 0);
    group.add(mesh);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(24, 28, 8, 24), mat);
    base.position.set(0, 4, 0);
    group.add(base);

    return group;
  }

  generatePythonCADCode() {
    let code = `# Generated by VoxCAD Universal 3D Design Synthesizer\n`;
    code += `from build123d import *\n\nwith BuildPart() as model:\n`;
    if (this.features.length === 0) return code + `    pass\n`;

    for (let i = 0; i < this.features.length; i++) {
      const f = this.features[i];
      code += `    # Step ${i + 1}: ${f.type}\n`;
    }
    code += `\nexport_step(model.part, "voxcad_export.step")\n`;
    return code;
  }
}
