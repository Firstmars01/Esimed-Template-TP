import GUI from 'lil-gui';

export class UI {
  constructor() {
    this.gui = new GUI();
  }

  addSkyboxUI(files, params, onChange) {
    const folder = this.gui.addFolder('Skybox');

    folder.add(params, 'texture', files)
      .name('Texture')
      .onChange(value => {
        params.texture = value;
        onChange(value);
      });

    folder.open();
  }

  addGroundUI(textures, params, onChange) {
    const folder = this.gui.addFolder('Ground');

    // Choix de la texture
    folder.add(params, 'texture', textures)
      .name('Texture')
      .onChange(value => {
        params.texture = value;
        onChange(params.texture, params.repeats);
      });

    // Répétitions
    folder.add(params, 'repeats', 1, 1000).step(1)
      .name('Repeats')
      .onChange(value => {
        params.repeats = value;
        onChange(params.texture, params.repeats);
      });

    folder.open();
  }

  addSunUI(params, onChange) {
    const folder = this.gui.addFolder('Sun');

    folder.add(params, 'intensity', 0, 5).step(0.1)
      .name('Intensity')
      .onChange(value => {
        params.intensity = value;
        onChange(params);
      });

    folder.add(params, 'x', -100, 100).step(1)
      .name('X Position')
      .onChange(value => {
        params.x = value;
        onChange(params);
      });

    folder.add(params, 'z', -100, 100).step(1)
      .name('Z Position')
      .onChange(value => {
        params.z = value;
        onChange(params);
      });

    folder.open();
  }

}
