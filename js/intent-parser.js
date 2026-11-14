/**
 * VoxCAD — Universal Semantic Intent Parser
 * Understands Anatomy, Fine Art, Vehicles, Mechanical CAD, and Universal Concepts
 */

export class IntentParser {
  constructor() {
    this.wordToNum = {
      'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
      'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
      'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13,
      'fourteen': 14, 'fifteen': 15, 'sixteen': 16, 'seventeen': 17,
      'eighteen': 18, 'nineteen': 19, 'twenty': 20, 'thirty': 30,
      'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70,
      'eighty': 80, 'ninety': 90, 'hundred': 100
    };
  }

  parse(text, selectedFace = null, featureHistory = []) {
    if (!text || typeof text !== 'string') return null;

    const raw = text.toLowerCase().trim();
    const s = this.normalizeText(raw);

    // 1. Navigation & Viewports
    if (/^(iso|isometric)$/i.test(s) || s.includes('isometric')) {
      return { type: 'CAMERA_VIEW', view: 'iso', message: 'Switched to isometric view.' };
    }
    if (/^(top|top view)$/i.test(s) || s.includes('top view')) {
      return { type: 'CAMERA_VIEW', view: 'top', message: 'Switched to top view.' };
    }
    if (/^(front|front view)$/i.test(s) || s.includes('front view')) {
      return { type: 'CAMERA_VIEW', view: 'front', message: 'Switched to front view.' };
    }
    if (/^(right|right view)$/i.test(s) || s.includes('right view')) {
      return { type: 'CAMERA_VIEW', view: 'right', message: 'Switched to right view.' };
    }
    if (s.includes('reset') || s.includes('center') || s.includes('fit')) {
      return { type: 'CAMERA_VIEW', view: 'reset', message: 'Centered view on model.' };
    }
    if (s.includes('wireframe') || s.includes('lines')) {
      return { type: 'TOGGLE_WIREFRAME', message: 'Toggled wireframe mode.' };
    }
    if (s.includes('grid')) {
      return { type: 'TOGGLE_GRID', message: 'Toggled grid floor.' };
    }
    if (s.includes('rotate') || s.includes('spin') || s.includes('turntable')) {
      return { type: 'TOGGLE_AUTOROTATE', message: 'Toggled showcase rotation.' };
    }

    // 2. History & Editing
    if (s.includes('undo') || s.includes('step back') || s.includes('revert')) {
      return { type: 'UNDO', message: 'Reverted previous feature.' };
    }
    if (s.includes('redo')) {
      return { type: 'REDO', message: 'Redid feature.' };
    }
    if (s.includes('clear') || s.includes('delete all') || s.includes('reset canvas') || s.includes('blank')) {
      return { type: 'CLEAR_ALL', message: 'Canvas reset to blank.' };
    }

    // 3. Materials
    if (s.includes('brass') || s.includes('gold')) {
      return { type: 'SET_MATERIAL', material: 'brass', message: 'Appearance set to Machined Brass.' };
    }
    if (s.includes('copper') || s.includes('bronze')) {
      return { type: 'SET_MATERIAL', material: 'copper', message: 'Appearance set to Polished Copper.' };
    }
    if (s.includes('aluminum') || s.includes('blue') || s.includes('anodized')) {
      return { type: 'SET_MATERIAL', material: 'aluminum', message: 'Appearance set to Cyan Anodized Aluminum.' };
    }
    if (s.includes('black') || s.includes('matte black') || s.includes('stealth')) {
      return { type: 'SET_MATERIAL', material: 'matte-black', message: 'Appearance set to Stealth Black Polymer.' };
    }
    if (s.includes('titanium') || s.includes('silver') || s.includes('steel')) {
      return { type: 'SET_MATERIAL', material: 'titanium', message: 'Appearance set to Titanium Alloy.' };
    }

    // 4. ANATOMY & BIOLOGY
    // Human Face / Head
    if (s.includes('face') || s.includes('head') || s.includes('bust') || s.includes('portrait') || s.includes('human face')) {
      return {
        type: 'CREATE_FACE',
        displayTitle: 'Human Face Bust',
        message: 'Synthesized 3D Sculptural Human Face Bust with brow, nose, cheekbones, and plinth.'
      };
    }

    // Human Eye
    if (s.includes('eye') || s.includes('eyeball') || s.includes('pupil') || s.includes('iris') || s.includes('cornea')) {
      return {
        type: 'CREATE_EYE',
        displayTitle: 'Anatomical Human Eye',
        message: 'Synthesized Anatomical Human Eye with sclera, corneal lens, and iris aperture.'
      };
    }

    // DNA Double Helix
    if (s.includes('dna') || s.includes('helix') || s.includes('chromosome') || s.includes('gene')) {
      return {
        type: 'CREATE_DNA',
        displayTitle: 'DNA Double Helix',
        message: 'Synthesized DNA Double Helix with spiraling nucleotide strands and base pair rungs.'
      };
    }

    // 5. FINE ART & SCULPTURE
    // Modern Art / Sculpture
    if (s.includes('art') || s.includes('sculpture') || s.includes('abstract') || s.includes('statue') || s.includes('monument')) {
      return {
        type: 'CREATE_ART_SCULPTURE',
        displayTitle: 'Modern Art Sculpture',
        message: 'Synthesized Flowing Modern Art Torus Knot Sculpture on gallery pedestal.'
      };
    }

    // Gemstone / Diamond
    if (s.includes('diamond') || s.includes('gem') || s.includes('crystal') || s.includes('ruby') || s.includes('emerald') || s.includes('sapphire')) {
      return {
        type: 'CREATE_GEMSTONE',
        displayTitle: 'Brilliant-Cut Diamond',
        message: 'Synthesized Brilliant-Cut Faceted Gemstone on display ring.'
      };
    }

    // Crown
    if (s.includes('crown') || s.includes('tiara') || s.includes('coronet') || s.includes('king') || s.includes('queen')) {
      return {
        type: 'CREATE_CROWN',
        displayTitle: 'Royal Crown',
        message: 'Synthesized Royal Crown with 6 jewel-studded spire peaks.'
      };
    }

    // Guitar / Musical Instrument
    if (s.includes('guitar') || s.includes('violin') || s.includes('instrument') || s.includes('music')) {
      return {
        type: 'CREATE_GUITAR',
        displayTitle: 'Acoustic Guitar',
        message: 'Synthesized Acoustic Guitar with body bouts, sound hole, neck, and headstock.'
      };
    }

    // Sword / Blade
    if (s.includes('sword') || s.includes('blade') || s.includes('dagger') || s.includes('weapon')) {
      return {
        type: 'CREATE_SWORD',
        displayTitle: 'Medieval Sword',
        message: 'Synthesized Medieval Sword with double-edged blade, crossguard, and pommel.'
      };
    }

    // Castle / Tower
    if (s.includes('castle') || s.includes('fortress') || s.includes('keep') || s.includes('fort')) {
      return {
        type: 'CREATE_CASTLE',
        displayTitle: 'Fortress Castle Tower',
        message: 'Synthesized Medieval Castle Tower with battlement crenellations.'
      };
    }

    // Tree / Nature
    if (s.includes('tree') || s.includes('forest') || s.includes('pine') || s.includes('oak') || s.includes('plant')) {
      return {
        type: 'CREATE_TREE',
        displayTitle: 'Botanical Tree',
        message: 'Synthesized Botanical Tree with trunk and tiered foliage canopy.'
      };
    }

    // 6. VEHICLES & AUTOMOTIVE
    // Mercedes / Luxury Sedan
    if (s.includes('mercedes') || s.includes('merced') || s.includes('benz') || s.includes('sedan') || (s.includes('car') && !s.includes('hypercar'))) {
      return {
        type: 'CREATE_MERCEDES_CAR',
        displayTitle: 'Mercedes-Benz Sedan',
        message: 'Synthesized Mercedes-Benz Luxury Sedan with hood star emblem and alloy wheels.'
      };
    }

    // Tire / Wheel
    if (s.includes('tire') || s.includes('tiek') || s.includes('tyre') || s.includes('wheel') || s.includes('rim')) {
      const r = this.extractRadius(s) || this.extractFirstNumber(s) || 35;
      return {
        type: 'CREATE_TIRE',
        radius: r,
        displayTitle: 'Automotive Tire',
        message: `Synthesized Automotive Wheel & Tire with alloy rim and lug nuts.`
      };
    }

    // Hypercar
    if (s.includes('hypercar') || s.includes('supercar') || s.includes('race car')) {
      return {
        type: 'CREATE_HYPERCAR',
        displayTitle: 'Hypercar Chassis',
        message: 'Synthesized Aerodynamic Hypercar Chassis with rear wing.'
      };
    }

    // 7. EVERYDAY & INDUSTRIAL
    // Circle / Disc
    if (s.includes('circle') || s.includes('cirlce') || s.includes('disc') || s.includes('disk') || s.includes('ring')) {
      const d = this.extractDiameter(s) || this.extractFirstNumber(s) || 60;
      return {
        type: 'CREATE_CIRCLE',
        diameter: d,
        thickness: 8,
        displayTitle: 'Circular Disc',
        message: `Synthesized Circular Disc (Ø${d}mm) with center mount.`
      };
    }

    // Coffee Mug / Cup
    if (s.includes('mug') || s.includes('cup') || s.includes('coffee')) {
      return {
        type: 'CREATE_MUG',
        displayTitle: 'Coffee Mug',
        message: 'Synthesized Ceramic Coffee Mug with looped ergonomic handle.'
      };
    }

    // Chair
    if (s.includes('chair') || s.includes('seat')) {
      return {
        type: 'CREATE_CHAIR',
        displayTitle: 'Ergonomic Chair',
        message: 'Synthesized Modern Ergonomic Chair with backrest and 4 legs.'
      };
    }

    // Table / Desk
    if (s.includes('table') || s.includes('desk')) {
      return {
        type: 'CREATE_TABLE',
        displayTitle: 'Executive Desk',
        message: 'Synthesized Executive Desk with chamfered slab and tapered legs.'
      };
    }

    // Smartphone
    if (s.includes('phone') || s.includes('mobile') || s.includes('smartphone') || s.includes('tablet')) {
      return {
        type: 'CREATE_SMARTPHONE',
        displayTitle: 'Smartphone',
        message: 'Synthesized Slim Smartphone with camera module island.'
      };
    }

    // Industrial Bolt
    if (s.includes('bolt') || s.includes('screw') || s.includes('fastener')) {
      return {
        type: 'CREATE_BOLT',
        displayTitle: 'Industrial Hex Bolt',
        message: 'Synthesized Industrial Hex Head Bolt with threaded shank.'
      };
    }

    // 8. SCI-FI & AEROSPACE
    // Stealth Drone
    if (s.includes('drone') || s.includes('jet') || s.includes('stealth') || s.includes('aircraft') || s.includes('plane') || s.includes('fighter')) {
      return {
        type: 'CREATE_STEALTH_DRONE',
        displayTitle: 'Stealth Drone',
        message: 'Synthesized Futuristic Stealth Jet Drone with canted stabilizers.'
      };
    }

    // Twisted Tower
    if (s.includes('tower') || s.includes('skyscraper') || s.includes('twisted') || s.includes('spiral')) {
      return {
        type: 'CREATE_TWISTED_TOWER',
        displayTitle: 'Twisted Tower',
        message: 'Synthesized 18-Story Twisted Helical Architectural Tower.'
      };
    }

    // Reactor Core
    if (s.includes('reactor') || s.includes('core') || s.includes('gyroscope') || s.includes('gimbal') || s.includes('portal')) {
      return {
        type: 'CREATE_REACTOR_CORE',
        displayTitle: 'Reactor Core',
        message: 'Synthesized Sci-Fi Reactor Core with gimbal rings.'
      };
    }

    // Cyber Helmet
    if (s.includes('helmet') || s.includes('cyber')) {
      return {
        type: 'CREATE_CYBER_HELMET',
        displayTitle: 'Cyber Helmet',
        message: 'Synthesized Cybernetic Combat Helmet with visor shield.'
      };
    }

    // Robotic Claw
    if (s.includes('claw') || s.includes('gripper') || s.includes('pincer') || s.includes('robot arm')) {
      return {
        type: 'CREATE_ROBOTIC_CLAW',
        displayTitle: 'Robotic Claw',
        message: 'Synthesized Robotic Gripper Claw with dual pincers.'
      };
    }

    // Spur Gear
    if (s.includes('gear') || s.includes('sprocket') || s.includes('cog') || s.includes('pinion')) {
      const teeth = this.extractFirstNumber(s) || 18;
      return {
        type: 'CREATE_GEAR',
        teeth: teeth,
        radius: 38,
        displayTitle: 'Spur Gear',
        message: `Synthesized ${teeth}-Tooth Spur Gear with shaft keyway.`
      };
    }

    // Satellite
    if (s.includes('satellite') || s.includes('probe') || s.includes('spacecraft')) {
      return {
        type: 'CREATE_SATELLITE',
        displayTitle: 'Orbital Satellite',
        message: 'Synthesized Deep-Space Orbital Satellite with solar arrays.'
      };
    }

    // 9. MECHANICAL CAD PRIMITIVES
    // Mounting Plate with Hole
    if (s.includes('hole') || s.includes('bore') || s.includes('pocket') || s.includes('mounting plate')) {
      const dia = this.extractDiameter(s) || 24;
      return {
        type: 'CREATE_PLATE_WITH_HOLE',
        width: 100, depth: 80, height: 15, diameter: dia,
        displayTitle: 'Mounting Plate',
        message: `Synthesized Machined Mounting Plate with Ø${dia}mm center bore.`
      };
    }

    // Solid Box
    if (s.includes('box') || s.includes('cube') || s.includes('plate') || s.includes('block')) {
      const dims = this.extractThreeDimensions(s);
      if (dims) {
        return {
          type: 'CREATE_BOX',
          width: dims.w, depth: dims.d, height: dims.h,
          displayTitle: 'Solid Box',
          message: `Created solid box ${dims.w} × ${dims.d} × ${dims.h} mm.`
        };
      }
      return {
        type: 'CREATE_BOX',
        width: 100, depth: 80, height: 15,
        displayTitle: 'Solid Plate',
        message: `Created solid plate 100 × 80 × 15 mm.`
      };
    }

    // Cylinder
    if (s.includes('cylinder') || s.includes('rod') || s.includes('pin')) {
      const dia = this.extractDiameter(s) || this.extractFirstNumber(s) || 32;
      const h = this.extractHeight(s) || this.extractSecondNumber(s) || 45;
      return {
        type: 'CREATE_CYLINDER',
        diameter: dia, height: h,
        displayTitle: 'Cylinder',
        message: `Created cylinder Ø${dia}mm × ${h}mm height.`
      };
    }

    // Sphere
    if (s.includes('sphere') || s.includes('ball') || s.includes('dome')) {
      const rad = this.extractRadius(s) || this.extractSingleDimension(s) || 25;
      return {
        type: 'CREATE_SPHERE',
        radius: rad,
        displayTitle: 'Sphere',
        message: `Created sphere radius ${rad}mm.`
      };
    }

    // Extrude
    if (s.includes('extrude') || s.includes('pull') || s.includes('push')) {
      const dist = this.extractSingleDimension(s) || 20;
      return {
        type: 'EXTRUDE_FACE',
        distance: dist,
        displayTitle: 'Extrusion',
        message: `Extruded feature by ${dist}mm.`
      };
    }

    // 10. TRUE LINGUA FRANCA: Universal Harmonic 3D Manifold for ANY word!
    // Never fails or rejects any concept: transforms abstract words into artistic mathematical forms!
    return {
      type: 'CREATE_UNIVERSAL_MANIFOLD',
      prompt: text,
      displayTitle: text.charAt(0).toUpperCase() + text.slice(1),
      message: `Synthesized bespoke 3D sculptural form for "${text}".`
    };
  }

  normalizeText(str) {
    let s = str;
    for (const [word, num] of Object.entries(this.wordToNum)) {
      const reg = new RegExp(`\\b${word}\\b`, 'g');
      s = s.replace(reg, num);
    }
    s = s.replace(/\s*(by|x|\*)\s*/g, ' x ');
    return s;
  }

  extractThreeDimensions(text) {
    const match = text.match(/(\d+(?:\.\d+)?)\s*(?:mm)?\s*x\s*(\d+(?:\.\d+)?)\s*(?:mm)?\s*x\s*(\d+(?:\.\d+)?)/i);
    if (match) return { w: parseFloat(match[1]), d: parseFloat(match[2]), h: parseFloat(match[3]) };
    const numbers = text.match(/\b\d+(?:\.\d+)?\b/g);
    if (numbers && numbers.length >= 3) {
      return { w: parseFloat(numbers[0]), d: parseFloat(numbers[1]), h: parseFloat(numbers[2]) };
    }
    return null;
  }

  extractDiameter(text) {
    const match = text.match(/(?:diameter|dia|diam|hole(?: of)?)\s*(\d+(?:\.\d+)?)/i);
    return match ? parseFloat(match[1]) : null;
  }

  extractRadius(text) {
    const match = text.match(/(?:radius|rad)\s*(\d+(?:\.\d+)?)/i);
    return match ? parseFloat(match[1]) : null;
  }

  extractHeight(text) {
    const match = text.match(/(?:height|tall|length)\s*(?:of\s*)?(\d+(?:\.\d+)?)/i);
    return match ? parseFloat(match[1]) : null;
  }

  extractSingleDimension(text) {
    const match = text.match(/\b(\d+(?:\.\d+)?)\s*(?:mm|cm)?\b/);
    return match ? parseFloat(match[1]) : null;
  }

  extractFirstNumber(text) {
    const numbers = text.match(/\b\d+(?:\.\d+)?\b/g);
    return numbers && numbers.length > 0 ? parseFloat(numbers[0]) : null;
  }

  extractSecondNumber(text) {
    const numbers = text.match(/\b\d+(?:\.\d+)?\b/g);
    return numbers && numbers.length > 1 ? parseFloat(numbers[1]) : null;
  }
}
