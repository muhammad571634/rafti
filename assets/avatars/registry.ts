/**
 * Seed character avatars, looked up by character id or group story member mark (`<story>:<member>`).
 * The Cast 2.0 and group story heads are square paintings from `docs/nano-banana-cast-2.md` and
 * `docs/nano-banana-group-stories.md`; user-created characters keep their own `avatarUri`.
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
  'g_dorm214:mia': require('./g_dorm214_mia_avatar.jpg'),
  'g_dorm214:zara': require('./g_dorm214_zara_avatar.jpg'),
  'g_dorm214:lina': require('./g_dorm214_lina_avatar.jpg'),
  'g_cafe:rio': require('./g_cafe_rio_avatar.jpg'),
  'g_cafe:eli': require('./g_cafe_eli_avatar.jpg'),
  'g_cafe:max': require('./g_cafe_max_avatar.jpg'),
  'g_ring:oscar': require('./g_ring_oscar_avatar.jpg'),
  'g_ring:bea': require('./g_ring_bea_avatar.jpg'),
  'g_ring:remy': require('./g_ring_remy_avatar.jpg'),
  'g_haunted:nico': require('./g_haunted_nico_avatar.jpg'),
  'g_haunted:pia': require('./g_haunted_pia_avatar.jpg'),
  'g_villa:sienna': require('./g_villa_sienna_avatar.jpg'),
  'g_villa:jax': require('./g_villa_jax_avatar.jpg'),
  'g_villa:coco': require('./g_villa_coco_avatar.jpg'),
  'g_santa:tessa': require('./g_santa_tessa_avatar.jpg'),
  'g_santa:omar': require('./g_santa_omar_avatar.jpg'),
  'g_santa:gus': require('./g_santa_gus_avatar.jpg'),
};
