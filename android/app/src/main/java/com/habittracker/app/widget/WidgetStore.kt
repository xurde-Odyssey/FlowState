package com.habittracker.app.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context

object WidgetStore {
  private const val PREFS_NAME = "habit_widget_prefs"
  private const val KEY_MOMENTUM_JSON = "momentum_json"

  fun saveMomentumJson(context: Context, json: String) {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .putString(KEY_MOMENTUM_JSON, json)
      .apply()

    refreshWidgets(context)
  }

  fun getMomentumJson(context: Context): String {
    return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .getString(KEY_MOMENTUM_JSON, "{}") ?: "{}"
  }

  fun refreshWidgets(context: Context) {
    val manager = AppWidgetManager.getInstance(context)
    val component = ComponentName(context, HabitWidgetProvider::class.java)
    val appWidgetIds = manager.getAppWidgetIds(component)

    appWidgetIds.forEach { widgetId ->
      HabitWidgetProvider.renderWidget(context, manager, widgetId)
    }
  }
}
