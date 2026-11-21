/**
 * Seed character avatars, looked up by character id. The Cast 2.0 heads are square paintings
 * from `docs/nano-banana-cast-2.md`; user-created characters keep their own `avatarUri`.
 * Characters without art fall back to a pastel monogram.
 */
export const AVATARS: Record<string, number> = {
  c_milo: require('./c_milo_avatar.jpg'),
  c_jace: require('./c_jace_avatar.jpg'),
  c_sam: require('./c_sam_avatar.jpg'),
  c_roman: require('./c_roman_avatar.jpg'),
  c_ethan: require('./c_ethan_avatar.jpg'),
  c_clara: require('./c_clara_avatar.jpg'),
  c_caleb: require('./c_caleb_avatar.jpg'),
  c_asher: require('./c_asher_avatar.jpg'),
  c_mia: require('./c_mia_avatar.jpg'),
  c_lena: require('./c_lena_avatar.jpg'),
  c_victor: require('./c_victor_avatar.jpg'),
  c_yuna: require('./c_yuna_avatar.jpg'),
};
