/**
 * VoxCAD — Design Library & Asset Vault
 * Persistently saves, versions, and manages 3D procedural designs with snapshots
 */

export class LibraryManager {
  constructor() {
    this.storageKey = 'voxcad_library_assets';
    this.onLibraryChanged = null;
  }

  getLibrary() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn('Failed to parse library:', e);
      return [];
    }
  }

  saveModel(asset) {
    const list = this.getLibrary();
    const newEntry = {
      id: asset.id || 'asset_' + Date.now(),
      name: asset.name || 'Untitled 3D Design',
      summary: asset.summary || 'Custom Procedural 3D Model',
      type: asset.type || 'GENAI_DYNAMIC_MODEL',
      code: asset.code || null,
      metrics: asset.metrics || { length: 0, width: 0, height: 0, faces: 0 },
      thumbnail: asset.thumbnail || null,
      createdAt: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    };

    // Prepend to top
    list.unshift(newEntry);
    localStorage.setItem(this.storageKey, JSON.stringify(list));

    if (this.onLibraryChanged) {
      this.onLibraryChanged(list);
    }
    return newEntry;
  }

  deleteModel(id) {
    let list = this.getLibrary();
    list = list.filter(item => item.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(list));

    if (this.onLibraryChanged) {
      this.onLibraryChanged(list);
    }
    return list;
  }

  clearLibrary() {
    localStorage.removeItem(this.storageKey);
    if (this.onLibraryChanged) {
      this.onLibraryChanged([]);
    }
  }
}
