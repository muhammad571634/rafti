/**
 * Tall character scenes (3:4, 765x1024), looked up by character id: the chat's ground when it
 * wears their picture, and the Today card. Drawn by the owner in Nano Banana (`art-new/`); the
 * close-up of each one is its avatar in assets/avatars. Characters without one use their wide
 * scene (assets/heroes), framed on their face.
 */
export const PORTRAITS: Record<string, number> = {
  c_alaric: require('./c_alaric.jpg'),
  c_celestine: require('./c_celestine.jpg'),
  c_dorian: require('./c_dorian.jpg'),
  c_erik: require('./c_erik.jpg'),
  c_isolde: require('./c_isolde.jpg'),
  c_leander: require('./c_leander.jpg'),
  c_luca: require('./c_luca.jpg'),
  c_mara: require('./c_mara.jpg'),
  c_odile: require('./c_odile.jpg'),
  c_ronan: require('./c_ronan.jpg'),
  c_teddy: require('./c_teddy.jpg'),
  c_viv: require('./c_viv.jpg'),
};
