import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const DAILY_HABIT_REMINDER_TYPE = 'habit-daily-fixed';
const AUTO_LAUNCH_REMINDER_TYPE = 'auto-launch-reminder';
const DAILY_HABIT_REMINDER_SLOTS = [
    { key: 'morning', hour: 9, minute: 0 },
    { key: 'evening', hour: 18, minute: 0 },
];

const isExpoGoAndroid = Platform.OS === 'android' && Constants.appOwnership === 'expo';
let notificationsAvailable = !isExpoGoAndroid;
let notificationHandlerConfigured = false;

const ensureNotificationHandler = () => {
    if (!notificationsAvailable || notificationHandlerConfigured) {
        return;
    }

    try {
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: false,
            }),
        });
        notificationHandlerConfigured = true;
    } catch (error) {
        notificationsAvailable = false;
    }
};

export const NotificationService = {
    isAvailable() {
        return notificationsAvailable;
    },

    /**
     * Request permissions for notifications
     */
    async requestPermissions() {
        if (!notificationsAvailable) {
            return false;
        }

        try {
            ensureNotificationHandler();
            if (!notificationsAvailable) {
                return false;
            }

            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted') {
                return false;
            }

            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('default', {
                    name: 'default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                });
            }

            return true;
        } catch (error) {
            notificationsAvailable = false;
            return false;
        }
    },

    /**
     * Schedule a daily reminder for a habit
     * @param {string} habitId 
     * @param {string} habitName 
     * @param {string} timeString "HH:mm"
     */
    async scheduleHabitReminder(habitId, habitName, timeString) {
        if (!notificationsAvailable || !timeString) {return null;}

        try {
            const [hours, minutes] = timeString.split(':').map(Number);

            // Cancel existing notification for this habit if any
            await this.cancelNotification(`habit-${habitId}`);

            const identifier = await Notifications.scheduleNotificationAsync({
                content: {
                    title: "Habit Reminder! 🌿",
                    body: `It's time for: ${habitName}`,
                    data: { type: 'habit', habitId },
                    sound: true,
                },
                trigger: {
                    hour: hours,
                    minute: minutes,
                    repeats: true,
                },
            });

            return identifier;
        } catch (error) {
            notificationsAvailable = false;
            return null;
        }
    },

    /**
     * Schedule a one-time notification for focus session completion
     * @param {string} sessionTitle 
     * @param {number} secondsFromNow 
     */
    async scheduleFocusCompletion(sessionTitle, secondsFromNow) {
        if (!notificationsAvailable || secondsFromNow <= 0) {return null;}

        try {
            const identifier = await Notifications.scheduleNotificationAsync({
                content: {
                    title: "Focus Target Reached! 🎯",
                    body: `Great job! You've completed your session: ${sessionTitle}`,
                    data: { type: 'focus' },
                    sound: true,
                },
                trigger: {
                    seconds: secondsFromNow,
                },
            });

            return identifier;
        } catch (error) {
            notificationsAvailable = false;
            return null;
        }
    },

    /**
     * Show an ongoing notification for an active focus session
     * @param {string} sessionTitle 
     */
    async showOngoingFocusNotification(sessionTitle) {
        if (!notificationsAvailable) {return null;}
        try {
            const identifier = await Notifications.scheduleNotificationAsync({
                content: {
                    title: "Focus Session Active ⚡",
                    body: `Focusing on: ${sessionTitle}`,
                    data: { type: 'focus-ongoing' },
                    sticky: true, // Android: prevent dismissal
                    priority: Notifications.AndroidNotificationPriority.HIGH,
                },
                trigger: null, // immediate
            });
            return identifier;
        } catch (error) {
            notificationsAvailable = false;
            return null;
        }
    },

    /**
     * Dismiss the ongoing focus notification
     * @param {string} identifier 
     */
    async dismissFocusNotification(identifier) {
        if (!notificationsAvailable || !identifier) {return;}
        try {
            await Notifications.dismissNotificationAsync(identifier);
            await Notifications.cancelScheduledNotificationAsync(identifier);
        } catch (error) {
            // no-op
        }
    },

    /**
     * Cancel a specific notification
     * @param {string} identifier 
     */
    async cancelNotification(identifier) {
        if (!notificationsAvailable || !identifier) {return;}
        try {
            await Notifications.cancelScheduledNotificationAsync(identifier);
        } catch (error) {
            // no-op
        }
    },

    /**
     * Cancel all scheduled notifications
     */
    async cancelAll() {
        if (!notificationsAvailable) {return;}
        try {
            await Notifications.cancelAllScheduledNotificationsAsync();
        } catch (error) {
            // no-op
        }
    },

    /**
     * Keep fixed daily habit reminders in sync.
     * Schedules reminders at 09:00 and 18:00 when habits exist; removes them when no habits exist.
     */
    async syncFixedDailyHabitReminders(hasHabits) {
        if (!notificationsAvailable) {return;}
        try {
            const scheduled = await Notifications.getAllScheduledNotificationsAsync();
            const existingHabitReminderIds = scheduled
                .filter((item) => item?.content?.data?.type === DAILY_HABIT_REMINDER_TYPE)
                .map((item) => item.identifier)
                .filter(Boolean);

            for (const id of existingHabitReminderIds) {
                await Notifications.cancelScheduledNotificationAsync(id);
            }

            if (!hasHabits) {return;}

            for (const slot of DAILY_HABIT_REMINDER_SLOTS) {
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: 'Habit Reminder',
                        body: slot.key === 'morning'
                            ? 'Start your day strong. Complete your habits.'
                            : '6 PM check-in: finish your habits for today.',
                        data: { type: DAILY_HABIT_REMINDER_TYPE, slot: slot.key },
                        sound: true,
                    },
                    trigger: {
                        hour: slot.hour,
                        minute: slot.minute,
                        repeats: true,
                    },
                });
            }
        } catch (error) {
            notificationsAvailable = false;
        }
    },

    /**
     * Sync a single daily "open the app" reminder.
     * When enabled, it schedules one repeating notification at the given time.
     * When disabled, it removes existing auto-launch reminders.
     */
    async syncAutoLaunchReminder({ enabled, hour = 9, minute = 0 } = {}) {
        if (!notificationsAvailable) {return;}
        try {
            const scheduled = await Notifications.getAllScheduledNotificationsAsync();
            const existingIds = scheduled
                .filter((item) => item?.content?.data?.type === AUTO_LAUNCH_REMINDER_TYPE)
                .map((item) => item.identifier)
                .filter(Boolean);

            for (const id of existingIds) {
                await Notifications.cancelScheduledNotificationAsync(id);
            }

            if (!enabled) {return;}

            const safeHour = Number.isFinite(Number(hour)) ? Math.max(0, Math.min(23, Number(hour))) : 9;
            const safeMinute = Number.isFinite(Number(minute)) ? Math.max(0, Math.min(59, Number(minute))) : 0;

            await Notifications.scheduleNotificationAsync({
                content: {
                    title: 'Flow State Reminder',
                    body: 'It is your check-in time. Open Flow State and continue your streak.',
                    data: {
                        type: AUTO_LAUNCH_REMINDER_TYPE,
                        destination: 'Today',
                    },
                    sound: true,
                },
                trigger: {
                    hour: safeHour,
                    minute: safeMinute,
                    repeats: true,
                },
            });
        } catch (error) {
            notificationsAvailable = false;
        }
    },
};
