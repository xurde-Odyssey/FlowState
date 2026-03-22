import { NativeModules, Platform } from 'react-native';

const widgetModule = NativeModules.WidgetSyncModule;

const normalizeHabitPayload = (habit, dateStr) => {
    const completedDates = Array.isArray(habit?.completedDates) ? habit.completedDates : [];
    const isCompleted = completedDates.includes(dateStr);
    return {
        id: String(habit?.id || ''),
        type: 'habit',
        name: String(habit?.name || 'Habit'),
        isCompleted,
        streak: Number.isFinite(Number(habit?.streak)) ? Number(habit.streak) : 0,
    };
};

const normalizeProjectPayload = (project) => ({
    id: String(project?.id || ''),
    type: 'project',
    name: String(project?.name || 'Project'),
    isCompleted: false,
});

export const syncMomentumToWidget = async ({ habits, projects, dateStr }) => {
    if (Platform.OS !== 'android') {return;}
    if (!widgetModule?.updateMomentum && !widgetModule?.updateHabits) {return;}

    const safeDate = dateStr || new Date().toISOString().split('T')[0];
    const habitItems = (Array.isArray(habits) ? habits : []).map((habit) => normalizeHabitPayload(habit, safeDate));
    const projectItems = (Array.isArray(projects) ? projects : []).map(normalizeProjectPayload);

    const completedHabitsCount = habitItems.filter((item) => item.isCompleted).length;
    const totalTracked = habitItems.length + projectItems.length;
    const todayScore = totalTracked > 0
        ? Math.round((completedHabitsCount / totalTracked) * 100)
        : 0;
    const streakDays = habitItems.reduce((max, item) => Math.max(max, item.streak || 0), 0);

    const pendingItems = [
        ...habitItems.filter((item) => !item.isCompleted),
        ...projectItems,
    ].slice(0, 3).map(({ id, type, name }) => ({ id, type, name }));

    const payload = {
        streakDays,
        todayScore,
        pendingItems,
    };

    try {
        if (widgetModule?.updateMomentum) {
            await widgetModule.updateMomentum(JSON.stringify(payload));
            return;
        }
        // Backward compatibility with old native module method.
        await widgetModule.updateHabits(JSON.stringify(payload));
    } catch (error) {
        // Fail silently - widget sync should never break app usage.
    }
};

// Backward compatible export name used by older code paths.
export const syncHabitsToWidget = syncMomentumToWidget;
