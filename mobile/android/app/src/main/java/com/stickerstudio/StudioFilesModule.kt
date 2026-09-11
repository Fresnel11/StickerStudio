package com.stickerstudio

import android.app.Activity
import android.content.Intent
import android.util.Base64
import com.facebook.react.bridge.*

/** Android document picker: no storage permission or silent overwrite. */
class StudioFilesModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  private var pending: Promise? = null
  private var bytes: ByteArray? = null
  private val requestCode = 4821
  init {
    context.addActivityEventListener(object : BaseActivityEventListener() {
      override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != this@StudioFilesModule.requestCode) return
        val promise = pending ?: return
        val content = bytes
        pending = null
        bytes = null
        val uri = data?.data
        if (resultCode != Activity.RESULT_OK || uri == null || content == null) {
          promise.reject("CANCELLED", "Enregistrement annulé.")
          return
        }
        Thread {
          try {
            val stream = context.contentResolver.openOutputStream(uri, "w") ?: error("Fichier inaccessible")
            stream.use { it.write(content) }
            promise.resolve(true)
          } catch (error: Exception) { promise.reject("SAVE_FAILED", "Impossible d’enregistrer ce fichier.", error) }
        }.start()
      }
    })
  }
  override fun getName() = "StudioFiles"
  @ReactMethod
  fun save(name: String, mime: String, encoded: String, promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null || pending != null) {
      promise.reject("BUSY", "Terminez l’enregistrement en cours puis réessayez.")
      return
    }
    try {
      require(mime == "image/webp" || mime == "application/zip")
      require(encoded.length <= 12 * 1024 * 1024)
      val content = Base64.decode(encoded, Base64.NO_WRAP)
      require(content.size >= 12)
      if (mime == "image/webp") {
        require(String(content, 0, 4, Charsets.US_ASCII) == "RIFF" && String(content, 8, 4, Charsets.US_ASCII) == "WEBP")
      } else { require(content[0] == 80.toByte() && content[1] == 75.toByte()) }
      val safeName = name.replace(Regex("[^\\p{L}\\p{N}._ -]"), "-").take(100)
      val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
        addCategory(Intent.CATEGORY_OPENABLE)
        type = mime
        putExtra(Intent.EXTRA_TITLE, safeName)
      }
      pending = promise
      bytes = content
      activity.startActivityForResult(intent, requestCode)
    } catch (error: Exception) {
      pending = null
      bytes = null
      promise.reject("SAVE_FAILED", "Impossible de préparer ce fichier.", error)
    }
  }
}
