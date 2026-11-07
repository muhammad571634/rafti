package expo.modules.alarmscreen

import android.app.Activity
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import expo.modules.core.interfaces.Package
import expo.modules.core.interfaces.ReactActivityLifecycleListener
import java.lang.ref.WeakReference

/**
 * A full-screen alarm starts the app behind the lock screen, where JS is paused and cannot ask
 * for anything. Only an alarm opens the app on a locked phone (a notification tap unlocks
 * first), so the activity shows over the lock screen right away; the JS side turns it off
 * again once nothing rings (`showOverLockScreen(false)`).
 */
class AlarmScreenPackage : Package {
  override fun createReactActivityLifecycleListeners(activityContext: Context): List<ReactActivityLifecycleListener> =
    listOf(object : ReactActivityLifecycleListener {
      private var activity = WeakReference<Activity>(null)

      override fun onCreate(activity: Activity, savedInstanceState: Bundle?) {
        this.activity = WeakReference(activity)
        showIfLocked(activity)
      }

      override fun onNewIntent(intent: Intent): Boolean {
        activity.get()?.let { showIfLocked(it) }
        return false
      }
    })

  private fun showIfLocked(activity: Activity) {
    val keyguard = activity.getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
    if (keyguard?.isKeyguardLocked == true) setOverLockScreen(activity, true)
  }
}
