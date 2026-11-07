package expo.modules.alarmscreen

import android.app.Activity
import android.app.KeyguardManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import android.view.WindowManager
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * The ring screen over the lock screen (Android). Only while an alarm rings: the rest of the
 * app, chats included, never shows on a locked phone. `unlock` asks for the PIN or fingerprint
 * before the friend's chat opens.
 */
class AlarmScreenModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AlarmScreen")

    Function("showOverLockScreen") { on: Boolean ->
      val activity = appContext.currentActivity ?: return@Function
      activity.runOnUiThread { setOverLockScreen(activity, on) }
    }

    // Notify Kit gives a channel's sound the notification usage, so silent mode mutes it; an
    // alarm's melody uses the alarm stream. Android fixes the sound once the channel exists.
    Function("createAlarmChannel") { id: String, name: String, sound: String ->
      val context = appContext.reactContext ?: return@Function false
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return@Function true
      val manager = context.getSystemService(NotificationManager::class.java)
      if (manager.getNotificationChannel(id) == null) {
        val audio = AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_ALARM)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build()
        manager.createNotificationChannel(NotificationChannel(id, name, NotificationManager.IMPORTANCE_HIGH).apply {
          setSound(Uri.parse("android.resource://${context.packageName}/raw/$sound"), audio)
          enableVibration(true)
          vibrationPattern = longArrayOf(0, 300, 500, 300, 500)
          lockscreenVisibility = Notification.VISIBILITY_PUBLIC
          setBypassDnd(true)
        })
      }
      true
    }

    AsyncFunction("unlock") { promise: Promise ->
      val activity = appContext.currentActivity
      val keyguard = activity?.getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
      if (activity == null || keyguard == null || !keyguard.isKeyguardLocked || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
        promise.resolve(true)
        return@AsyncFunction
      }
      activity.runOnUiThread {
        keyguard.requestDismissKeyguard(activity, object : KeyguardManager.KeyguardDismissCallback() {
          override fun onDismissSucceeded() = promise.resolve(true)
          override fun onDismissCancelled() = promise.resolve(false)
          override fun onDismissError() = promise.resolve(false)
        })
      }
    }
  }
}

/** Shows the activity over the lock screen and keeps the display on, or stops both. */
internal fun setOverLockScreen(activity: Activity, on: Boolean) {
  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
    activity.setShowWhenLocked(on)
    activity.setTurnScreenOn(on)
  } else {
    @Suppress("DEPRECATION")
    val flags = WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
    if (on) activity.window.addFlags(flags) else activity.window.clearFlags(flags)
  }
  if (on) {
    activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
  } else {
    activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
  }
}
