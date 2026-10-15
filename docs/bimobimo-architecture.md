# How BIMOBIMO works under the hood, and what Sigmazam takes (2026-10-16)

Static look at the BIMOBIMO Android APK (`com.beemo.ai.flutter_beemo`, `base.apk` in
`C:\Users\joray\rea-work\apk\`, decoded to `rea-work\decoded\`). Method: Apktool for the manifest,
a plain string dump of the Dart AOT library (`lib/arm64-v8a/libapp.so`, 78.9k strings) and of the
Rust library. REA MCP did not connect in that session; JADX is still not set up (not needed:
the app logic is Dart, not Java). Structure and logic only: no BIMOBIMO code, art or text is
copied (rule in `AGENTS.md`). Raw dumps stay in `rea-work`, outside every repo.

**Limit.** The APK is only the client. Their server code, prompts, model choice and memory logic
live on their servers and are not in the APK; we do not try to reach them (no calls to their
private API, no traffic interception). What follows is what the client reveals: SDKs, endpoints,
file layout and event names.

## 1. Client

| Part | What they use |
| --- | --- |
| Framework | Flutter (Dart AOT), state with GetX (`get`, `get_storage`), HTTP with `dio` |
| Local data | `sqflite` (message cache), `shared_preferences`, `flutter_cache_manager` |
| Realtime chat | Server-Sent Events: `service/ws/sse_service.dart`, `chat_handler.dart`, `moment_notification_handler.dart`. Not WebSocket |
| Calls | Tencent RTC (`tencent_rtc_sdk`, `libliteavsdk.so`, TRTC rooms) for live voice/video calls; `ffmpeg_kit` for audio/video work |
| Effects | Tencent beauty/AR SDK (`liblight-sdk.so`, `tencent_effect_flutter`) for the photo booth camera; PAG + Lottie animations; `liquid_glass_plus` shaders |
| Native helper | Rust via `flutter_rust_bridge` 2.12 (`librust_lib_beemoai.so`, tokio); `service/http/crypto_io.dart` suggests signed or encrypted requests |
| Push | Firebase Cloud Messaging; local notifications; `alarm` plugin (morning/night calls ring like an alarm) |
| Money | Google Play Billing 8 / StoreKit (`in_app_purchase`), AdMob rewarded ads |
| Growth | AppsFlyer, Singular, TikTok events, Facebook app events, Firebase Analytics + Crashlytics + Remote Config (A/B) |
| Login | Google, LINE, email code; Tencent captcha; device id reported to the server |
| Other | Home-screen widgets (Android Glance, `home_widget`), in-app review, `no_screenshot`, rich text editor (`flutter_quill`) for diary/board |

## 2. Server (seen from the client)

Hosts: `api.*` (REST), `imapi.*` (chat/IM), `notify.*` (push), `event2.*` (analytics),
`cos-res-acc.*` (Tencent Cloud object storage CDN). Two brand domains (`beemoai.com`,
`bimoglobal.com`) plus a China app domain, each with `test-`/`pre-` stages. About 210 API paths,
two generations: older `/api/...` and newer `/bimo/v2/...`.

| Area | Paths (examples) | What it tells us |
| --- | --- | --- |
| Chat | `chat-im/message/send`, `chat-im/typing`, `chat-im/status/latest`, `chat-im/messages/search`, `chat-im/bimoji`, `chat/videomail` | Send is a plain POST with `client_message_id`; replies are async jobs (`reply_task_status`, `pending_user_message`) pushed back over SSE. Typing is server-driven |
| Relationship | `chat-intimate/increase`, `intimate-status`, `list-intimate-level`, `upgrade-tip-intimate-level` | Intimacy is counted on the server |
| Memory | `memory/memory`; events `memory_charpreference`, `memory_mypreference`, `memory_myexperience`, `memory_sharedmemory`; flag `advanced_memory_enabled` | Four memory kinds: the character's likes, the user's likes, the user's life events, shared moments. "Advanced memory" is a paid switch |
| Reply settings | `chat_settings_chat_model`, `chatversion`, `character_reply_type_frequency_profile`, `chat_voice_frequency` | The user picks a chat model version and how often replies come as voice |
| Calls | `voicecall/create`, `voicecall/record`, `phoneCallVideo/status`, `daily_phonecall/settings`, `finance/purchase/call`, `session-remaining-duration` | Two kinds: scheduled morning/night calls played from pre-made TTS audio (`phonecall_tts`, audio URLs), and live calls in an RTC room, sold by the minute |
| Bedtime | `bedtime_companion/session/start`, `stream_lines`, `alarm`, `close` | Bedtime talk is streamed line by line from the server |
| Moments | `moment/generation/prepare`, `generation/status`, `template/list`, `weekly-free-video/*`, `moment/comment/*`, `persona` | AI-made photos and videos of the character from templates, one free video a week, comment threads where the character answers |
| Dates | `date/theme/list`, `theme/owned`, `theme/public`, `date_round`, `date_chat`, `finish`, `photo` | Date themes are content; users can own and publish themes |
| Photo booth | `lifecut/tmpl/list`, `tmpl/frame/list`, `lifecut` | Same as our photo booth + frames |
| Character wiki | `character/bikipedia/entries`, `edit_requests`, `relations`, `emotions`, `voice_models`, `report`, `like` | Users write lore about characters; edits go through review |
| Voice community | `voice-community/create-voice-content`, `discover-voice-content-feed`, `calc-voice-content-ranking`, `character-synthesize-voice` | Users publish voice clips made with a character's voice; ranked feed |
| Gifts and events | `activity/present/creation`, `wrapup`, `festival/*`, `activity/countdown`, `invite/code` | Seasonal events where the user makes a gift (upload, wrap, letter, song) |
| Home feed | `heartbeat-nook/feed`, `notification/homepage`, `house/renders/*` (first meet, level up, diary, date, secret note, moment, wish time cards) | One timeline of relationship cards |
| Money | `finance/v2/products`, `v2/orders`, `v2/account/status`, `bill/list`, `reward/stage/sign`, `activity/reward_ad/v2/ticket` → `finish` | Currency "acorns" with expiring balances (`next_expiring_balances`); ad rewards are server tickets |
| Ops | `interact/announcement/popup/list`, `system/deviceInfo`, `app/is-reminder-review` | Remote popups, device reporting, review prompt timing |

Client code layout (518 Dart files): `pages/message` 70, `home` 55, `moment` 31, `bikipedia` 28,
`new_user_onboarding` 23, `house`, `datingv2`, `calendar` 19 each, `lifefour` 16, `store` 15,
`secret_note`, `prepare_present` 12, `festival` 11.

## 3. Sigmazam today

- Expo SDK 57, React Native, expo-router, zustand store persisted in AsyncStorage
  (`src/store/use-app-store.ts`, key `rafti.store`).
- **No server yet: the AI is a mock.** Replies, diary, secret notes, calls and initiative come from
  `src/mock/*` and timers in the store. Real prompt pieces are ready in `src/ai/*` (character rules,
  reply language, crisis guard, memory guard, content and group prompts).
- Economy rules in `src/economy/*` (shells, plans, memory limit, early access) with tests.
- Local notifications and alarms (`src/notifications`, `src/lib/alarms.ts`).
- The server design is in `docs/backend-plan.md`: Node + Hono API and worker, Supabase (Postgres +
  pgvector, Auth, Storage, Realtime), LLM router, TTS/STT adapters, LiveKit for live calls,
  RevenueCat, AdMob server-side verification, Expo push.

BIMOBIMO's client confirms that plan: POST the message with a client id, the server answers in a
background job, the app gets it over a realtime channel (their SSE = our Supabase Realtime), push
when the app is closed, RTC rooms for live calls (their TRTC = our LiveKit), server-side ad tickets.

## 4. What they have and we do not

| Feature | Sigmazam | Worth it now? |
| --- | --- | --- |
| Real AI backend | mock | **Yes, the biggest gap.** Everything else waits on it (backend-plan B1) |
| Scheduled morning/night calls from pre-made TTS | alarms + mock call | **Yes, early.** Cheap (one TTS clip, no live room), strong daily habit; reuses Alarms and the call screen |
| Four memory kinds + paid "advanced memory" | memories with a `type` column planned | **Yes**, small: tag facts by kind, show them in tabs on Memories |
| Reply settings: voice reply frequency, reply style | voice replies on/off | Yes, small. Skip the model picker (backend-plan 13.6: the user never sees models) |
| Chat search, chat stickers (memes) | no | Later, small |
| Moments: AI photos/videos of the character, one free a week | Live scenes groundwork (`feat/live-scenes`) | Later: costly per item; start with photos |
| Home feed of relationship cards | Us timeline | Have most of it |
| Home-screen widget | no | Later; needs a native widget target |
| Live video calls | no | No: cost and safety |
| Character wiki, voice community (UGC) | no | No for now: needs moderation and review tools |
| Seasonal events and gift making | no | Later, around holidays |
| Expiring currency, remote config popups, A/B tests | free shells already expire at midnight (`docs/backend-schema-gaps.md` §2); no remote config | Remote config and A/B tests yes, with the backend |

## 5. Next steps

1. Backend B1 (`docs/backend-plan.md` §6): one message path, real model, shells on the server.
2. Scheduled character calls with pre-made TTS, on top of B1.
3. Memory kinds on the Memories screen.
4. Then Moments (photos first) from the Live scenes groundwork.

To look deeper at the Dart code (function names, request bodies) the next tool is a Dart AOT
analyser such as Blutter; it was not needed for this map.
