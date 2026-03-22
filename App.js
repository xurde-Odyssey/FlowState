import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/context/ThemeContext';
import { UserProvider } from './src/context/UserContext';
import { TimeProvider } from './src/context/TimeContext';
import { storage } from './src/utils/storage';
import { syncHabitsToWidget } from './src/utils/widgetSync';
import { NotificationService } from './src/utils/NotificationService';

export default function App() {
    const [isStorageReady, setIsStorageReady] = useState(false);

    useEffect(() => {
        const bootstrapStorage = async () => {
            await storage.ensureDataMigrated();

            const settings = await storage.getSettings();
            const reminder = settings?.reminderSettings || {};
            if (reminder.autoLaunchEnabled) {
                const granted = await NotificationService.requestPermissions();
                if (granted) {
                    await NotificationService.syncAutoLaunchReminder({
                        enabled: true,
                        hour: reminder.autoLaunchHour ?? 9,
                        minute: reminder.autoLaunchMinute ?? 0,
                    });
                }
            }

            setIsStorageReady(true);
        };
        bootstrapStorage();
    }, []);

    useEffect(() => {
        const syncWidgetSnapshot = async () => {
            const today = new Date().toISOString().split('T')[0];
            const [habits, projects] = await Promise.all([
                storage.getHabits(),
                storage.getProjects(),
            ]);
            await syncHabitsToWidget({ habits, projects, dateStr: today });
        };

        const handleCompleteHabitUrl = async (url) => {
            if (!url || !url.startsWith('habittracker://')) {return;}
            const normalized = url.replace('habittracker://', '');
            const [route, query = ''] = normalized.split('?');
            const queryPairs = query.split('&').map((part) => part.split('='));
            const getParam = (key) => {
                const raw = queryPairs.find(([k]) => k === key)?.[1];
                return raw ? decodeURIComponent(raw) : '';
            };

            if (route === 'complete-habit') {
                const habitId = getParam('habitId');
                if (!habitId) {return;}
                await storage.setHabitCompletion(habitId, true);
                await syncWidgetSnapshot();
                return;
            }

            if (route === 'add-habit') {
                await storage.addHabit({ name: 'New Habit', frequency: 'Daily', priority: 'Medium', category: 'Personal' });
                await syncWidgetSnapshot();
                return;
            }

            if (route === 'complete-item') {
                const itemType = getParam('type');
                const itemId = getParam('id');
                if (!itemId) {return;}

                if (itemType === 'project') {
                    await storage.deleteProject(itemId);
                } else {
                    await storage.setHabitCompletion(itemId, true);
                }
                await syncWidgetSnapshot();
            }
        };

        Linking.getInitialURL().then((url) => {
            handleCompleteHabitUrl(url);
        });

        const sub = Linking.addEventListener('url', ({ url }) => {
            handleCompleteHabitUrl(url);
        });

        return () => sub.remove();
    }, []);

    if (!isStorageReady) {
        return null;
    }

    return (
        <ThemeProvider>
            <UserProvider>
                <TimeProvider>
                    <AppNavigator />
                </TimeProvider>
            </UserProvider>
        </ThemeProvider>
    );
}
