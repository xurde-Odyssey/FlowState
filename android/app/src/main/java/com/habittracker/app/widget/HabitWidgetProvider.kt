package com.habittracker.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import com.habittracker.app.MainActivity
import com.habittracker.app.R
import org.json.JSONArray
import org.json.JSONObject

class HabitWidgetProvider : AppWidgetProvider() {

  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    appWidgetIds.forEach { appWidgetId ->
      renderWidget(context, appWidgetManager, appWidgetId)
    }
  }

  companion object {
    private data class PendingItem(val id: String, val type: String, val name: String)
    private data class MomentumData(
      val streakDays: Int,
      val todayScore: Int,
      val pendingItems: List<PendingItem>
    )

    fun renderWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
      val views = RemoteViews(context.packageName, R.layout.habit_widget)
      val data = readMomentum(context)
      val safeScore = data.todayScore.coerceIn(0, 100)
      val scoreColor = when {
        safeScore >= 80 -> 0xFF16A34A.toInt()
        safeScore >= 40 -> 0xFFF59E0B.toInt()
        else -> 0xFFDC2626.toInt()
      }

      views.setTextViewText(R.id.widget_streak, "Streak: ${data.streakDays} days")
      views.setTextViewText(R.id.widget_score_value, "$safeScore%")
      views.setInt(R.id.widget_score_ring, "setColorFilter", scoreColor)
      views.setProgressBar(R.id.widget_score_progress, 100, safeScore, false)

      bindPendingRow(views, R.id.pending_1, data.pendingItems.getOrNull(0))
      bindPendingRow(views, R.id.pending_2, data.pendingItems.getOrNull(1))
      bindPendingRow(views, R.id.pending_3, data.pendingItems.getOrNull(2))

      val isEmpty = data.pendingItems.isEmpty()
      views.setViewVisibility(R.id.widget_empty, if (isEmpty) View.VISIBLE else View.GONE)

      val openHome = deepLinkIntent(context, "habittracker://")
      views.setOnClickPendingIntent(R.id.widget_header, openHome)

      val addHabitIntent = deepLinkIntent(context, "habittracker://add-habit")
      views.setOnClickPendingIntent(R.id.action_add_habit, addHabitIntent)

      val topPending = data.pendingItems.firstOrNull()
      if (topPending != null) {
        val markDoneUri = "habittracker://complete-item?type=${Uri.encode(topPending.type)}&id=${Uri.encode(topPending.id)}"
        views.setOnClickPendingIntent(R.id.action_mark_done, deepLinkIntent(context, markDoneUri))
        views.setTextViewText(R.id.action_mark_done, "Mark Done")
      } else {
        views.setOnClickPendingIntent(R.id.action_mark_done, openHome)
        views.setTextViewText(R.id.action_mark_done, "No Pending")
      }

      val spinIntent = deepLinkIntent(context, "habittracker://decision-wheel")
      views.setOnClickPendingIntent(R.id.action_spin, spinIntent)

      appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    private fun bindPendingRow(views: RemoteViews, viewId: Int, item: PendingItem?) {
      if (item == null) {
        views.setViewVisibility(viewId, View.GONE)
        return
      }
      val prefix = if (item.type == "project") "Project" else "Habit"
      views.setViewVisibility(viewId, View.VISIBLE)
      views.setTextViewText(viewId, "• $prefix: ${item.name}")
    }

    private fun deepLinkIntent(context: Context, uriString: String): PendingIntent {
      val deepLink = Uri.parse(uriString)
      val intent = Intent(Intent.ACTION_VIEW, deepLink).apply {
        setClass(context, MainActivity::class.java)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      }
      val requestCode = uriString.hashCode() and 0x7fffffff
      return PendingIntent.getActivity(
        context,
        requestCode,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    }

    private fun readMomentum(context: Context): MomentumData {
      return try {
        val root = JSONObject(WidgetStore.getMomentumJson(context))
        val streakDays = root.optInt("streakDays", 0)
        val todayScore = root.optInt("todayScore", 0)
        val pending = root.optJSONArray("pendingItems") ?: JSONArray()
        val pendingItems = buildList {
          for (index in 0 until pending.length()) {
            val item = pending.optJSONObject(index) ?: continue
            val id = item.optString("id", "")
            val type = item.optString("type", "habit")
            val name = item.optString("name", "Task")
            if (id.isBlank() || name.isBlank()) {continue}
            add(PendingItem(id = id, type = type, name = name))
          }
        }
        MomentumData(streakDays = streakDays, todayScore = todayScore, pendingItems = pendingItems)
      } catch (_: Exception) {
        MomentumData(streakDays = 0, todayScore = 0, pendingItems = emptyList())
      }
    }
  }
}
