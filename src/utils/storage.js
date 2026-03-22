import AsyncStorage from '@react-native-async-storage/async-storage';

const HABITS_KEY = '@habits_data';
const FOCUS_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const SETTINGS_KEY = '@settings_data';
const PROJECTS_KEY = '@projects_data';
const FOCUS_SESSIONS_KEY = '@focus_sessions';
const ONBOARDING_KEY = '@has_completed_onboarding';
const STORAGE_SCHEMA_KEY = '@storage_schema_version';
const CURRENT_STORAGE_SCHEMA_VERSION = 1;
const BACKUP_SCHEMA_VERSION = 1;
const BACKUP_KEYS = [
    HABITS_KEY,
    SETTINGS_KEY,
    PROJECTS_KEY,
    FOCUS_SESSIONS_KEY,
    ONBOARDING_KEY,
    STORAGE_SCHEMA_KEY,
];

const isValidDateString = (value) => {
    if (typeof value !== 'string') {return false;}
    const ms = new Date(value).getTime();
    return Number.isFinite(ms);
};

const toIsoDate = (value, fallback = new Date().toISOString()) => {
    if (typeof value === 'string' && isValidDateString(value)) {
        return new Date(value).toISOString();
    }
    if (value instanceof Date && Number.isFinite(value.getTime())) {
        return value.toISOString();
    }
    return fallback;
};

const normalizeCompletedDates = (completedDates) => {
    if (!Array.isArray(completedDates)) {return [];}
    const unique = new Set();

    completedDates.forEach((dateLike) => {
        if (typeof dateLike !== 'string') {return;}
        const onlyDate = dateLike.split('T')[0];
        if (/^\d{4}-\d{2}-\d{2}$/.test(onlyDate)) {
            unique.add(onlyDate);
        }
    });

    return Array.from(unique).sort();
};

const getDaysBetween = (startDateStr, endDateStr) => {
    const start = new Date(`${startDateStr}T00:00:00`);
    const end = new Date(`${endDateStr}T00:00:00`);
    const diffMs = end.getTime() - start.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

const calculateCurrentHabitStreak = (completedDates, referenceDate = new Date().toISOString().split('T')[0]) => {
    const normalizedDates = normalizeCompletedDates(completedDates);
    if (normalizedDates.length === 0) {return 0;}

    const lastCompletedDate = normalizedDates[normalizedDates.length - 1];
    const gapFromReference = getDaysBetween(lastCompletedDate, referenceDate);

    if (gapFromReference > 1) {
        return 0;
    }

    let streak = 1;
    for (let index = normalizedDates.length - 1; index > 0; index -= 1) {
        const previousDate = normalizedDates[index - 1];
        const currentDate = normalizedDates[index];
        if (getDaysBetween(previousDate, currentDate) === 1) {
            streak += 1;
            continue;
        }
        break;
    }

    return streak;
};

const normalizeHabits = (habits) => {
    if (!Array.isArray(habits)) {return [];}
    return habits.map((habit, index) => ({
        ...habit,
        completedDates: normalizeCompletedDates(habit?.completedDates),
    })).map((habit, index) => ({
        ...habit,
        id: `${habit?.id ?? `habit-${Date.now()}-${index}`}`,
        name: typeof habit?.name === 'string' && habit.name.trim()
            ? habit.name.trim()
            : (typeof habit?.title === 'string' && habit.title.trim() ? habit.title.trim() : 'Habit'),
        streak: calculateCurrentHabitStreak(habit.completedDates),
    }));
};

const normalizeProjects = (projects) => {
    if (!Array.isArray(projects)) {return [];}
    return projects.map((project, index) => ({
        ...project,
        id: `${project?.id ?? `project-${Date.now()}-${index}`}`,
        name: typeof project?.name === 'string' && project.name.trim() ? project.name.trim() : 'Project',
        durationDays: Number.isFinite(Number(project?.durationDays)) ? Math.max(1, Number(project.durationDays)) : 1,
        createdAt: toIsoDate(project?.createdAt),
    }));
};

const normalizeFocusSessions = (sessions) => {
    if (!Array.isArray(sessions)) {return [];}
    return sessions
        .map((session, index) => ({
            ...session,
            id: `${session?.id ?? `focus-${Date.now()}-${index}`}`,
            title: typeof session?.title === 'string' && session.title.trim() ? session.title.trim() : 'Focus Session',
            duration: Number.isFinite(Number(session?.duration)) ? Math.max(0, Number(session.duration)) : 0,
            createdAt: toIsoDate(session?.createdAt),
        }))
        .filter((session) => {
            const createdAtMs = new Date(session.createdAt).getTime();
            return Number.isFinite(createdAtMs);
        });
};

const normalizeTodoItems = (items) => {
    if (!Array.isArray(items)) {return [];}
    return items.map((item, index) => ({
        ...item,
        id: `${item?.id ?? `todo-${Date.now()}-${index}`}`,
        title: typeof item?.title === 'string' && item.title.trim() ? item.title.trim() : 'Todo item',
        completed: Boolean(item?.completed),
        createdAt: toIsoDate(item?.createdAt),
    }));
};

const normalizeSettings = (settings) => {
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
        return {};
    }

    const nextSettings = { ...settings };

    if (nextSettings.user && typeof nextSettings.user === 'object' && !Array.isArray(nextSettings.user)) {
        nextSettings.user = {
            ...nextSettings.user,
            birthDate: isValidDateString(nextSettings.user.birthDate)
                ? new Date(nextSettings.user.birthDate).toISOString()
                : nextSettings.user.birthDate,
        };
    }

    const lifeIndex = nextSettings.lifeIndex;
    if (lifeIndex && typeof lifeIndex === 'object' && !Array.isArray(lifeIndex)) {
        nextSettings.lifeIndex = {
            ...lifeIndex,
            birthDate: isValidDateString(lifeIndex.birthDate)
                ? new Date(lifeIndex.birthDate).toISOString()
                : lifeIndex.birthDate,
            lifeExpectancy: Number.isFinite(Number(lifeIndex.lifeExpectancy))
                ? Math.max(30, Math.min(120, Number(lifeIndex.lifeExpectancy)))
                : lifeIndex.lifeExpectancy,
            events: Array.isArray(lifeIndex.events)
                ? lifeIndex.events.map((event, index) => ({
                    ...event,
                    id: `${event?.id ?? `life-event-${Date.now()}-${index}`}`,
                    title: typeof event?.title === 'string' && event.title.trim() ? event.title.trim() : 'Event',
                    date: toIsoDate(event?.date),
                }))
                : [],
        };
    }

    nextSettings.todoList = normalizeTodoItems(nextSettings.todoList);

    return nextSettings;
};

const safeParse = (value, fallback) => {
    if (value == null) {return fallback;}
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

let settingsWriteQueue = Promise.resolve();

export const storage = {
    /**
     * Run one-time storage migrations for app upgrades.
     */
    async ensureDataMigrated() {
        try {
            const rawVersion = await AsyncStorage.getItem(STORAGE_SCHEMA_KEY);
            const parsedVersion = rawVersion != null ? Number(JSON.parse(rawVersion)) : 0;
            const currentVersion = Number.isFinite(parsedVersion) ? parsedVersion : 0;

            if (currentVersion >= CURRENT_STORAGE_SCHEMA_VERSION) {
                return false;
            }

            await this.migrateData(currentVersion);
            await AsyncStorage.setItem(STORAGE_SCHEMA_KEY, JSON.stringify(CURRENT_STORAGE_SCHEMA_VERSION));
            return true;
        } catch (e) {
            console.error('Error running storage migration', e);
            return false;
        }
    },

    /**
     * Migration pipeline from any older schema to current schema.
     */
    async migrateData(fromVersion = 0) {
        // v0 -> v1: normalize and harden existing persisted data.
        if (fromVersion < 1) {
            const entries = await AsyncStorage.multiGet([
                HABITS_KEY,
                SETTINGS_KEY,
                PROJECTS_KEY,
                FOCUS_SESSIONS_KEY,
                ONBOARDING_KEY,
            ]);
            const map = Object.fromEntries(entries);

            const habits = normalizeHabits(safeParse(map[HABITS_KEY], []));
            const settings = normalizeSettings(safeParse(map[SETTINGS_KEY], {}));
            const projects = normalizeProjects(safeParse(map[PROJECTS_KEY], []));
            const focusSessions = normalizeFocusSessions(safeParse(map[FOCUS_SESSIONS_KEY], []));
            const hasCompletedOnboarding = map[ONBOARDING_KEY] != null
                ? Boolean(safeParse(map[ONBOARDING_KEY], false))
                : false;

            await AsyncStorage.multiSet([
                [HABITS_KEY, JSON.stringify(habits)],
                [SETTINGS_KEY, JSON.stringify(settings)],
                [PROJECTS_KEY, JSON.stringify(projects)],
                [FOCUS_SESSIONS_KEY, JSON.stringify(focusSessions)],
                [ONBOARDING_KEY, JSON.stringify(hasCompletedOnboarding)],
            ]);
        }
    },

    /**
     * Get all habits from storage
     */
    async getHabits() {
        try {
            const jsonValue = await AsyncStorage.getItem(HABITS_KEY);
            return jsonValue != null ? JSON.parse(jsonValue) : [];
        } catch (e) {
            console.error('Error reading habits', e);
            return [];
        }
    },

    /**
     * Save all habits to storage
     */
    async saveHabits(habits) {
        try {
            const jsonValue = JSON.stringify(habits);
            await AsyncStorage.setItem(HABITS_KEY, jsonValue);
        } catch (e) {
            console.error('Error saving habits', e);
        }
    },

    /**
     * Add a new habit
     */
    async addHabit(habit) {
        const habits = await this.getHabits();
        const newHabits = normalizeHabits([...habits, { ...habit, id: Date.now().toString(), streak: 0, completedDates: [] }]);
        await this.saveHabits(newHabits);
        return newHabits;
    },

    /**
     * Toggle habit completion for today
     */
    async toggleHabitCompletion(habitId) {
        const habits = await this.getHabits();
        const today = new Date().toISOString().split('T')[0];

        const updatedHabits = habits.map(habit => {
            if (habit.id === habitId) {
                const completedDates = habit.completedDates || [];
                const isCompleted = completedDates.includes(today);

                let newCompletedDates;

                if (isCompleted) {
                    newCompletedDates = completedDates.filter(date => date !== today);
                } else {
                    newCompletedDates = [...completedDates, today];
                }

                return {
                    ...habit,
                    completedDates: normalizeCompletedDates(newCompletedDates),
                    streak: calculateCurrentHabitStreak(newCompletedDates, today),
                };
            }
            return habit;
        });

        await this.saveHabits(updatedHabits);
        return updatedHabits;
    },

    /**
     * Mark habit completion status for a specific date (idempotent).
     */
    async setHabitCompletion(habitId, isCompleted = true, dateStr = new Date().toISOString().split('T')[0]) {
        const habits = await this.getHabits();
        const updatedHabits = habits.map((habit) => {
            if (habit.id !== habitId) {return habit;}

            const completedDates = Array.isArray(habit.completedDates) ? habit.completedDates : [];
            const hasDate = completedDates.includes(dateStr);
            let nextDates = completedDates;

            if (isCompleted && !hasDate) {
                nextDates = [...completedDates, dateStr];
            } else if (!isCompleted && hasDate) {
                nextDates = completedDates.filter((d) => d !== dateStr);
            }

            return {
                ...habit,
                completedDates: normalizeCompletedDates(nextDates),
                streak: calculateCurrentHabitStreak(nextDates, dateStr),
            };
        });

        await this.saveHabits(updatedHabits);
        return updatedHabits;
    },

    /**
     * Update an existing habit
     */
    async updateHabit(habitId, updates) {
        const habits = await this.getHabits();
        const updatedHabits = habits.map(habit => {
            if (habit.id === habitId) {
                return { ...habit, ...updates };
            }
            return habit;
        });
        await this.saveHabits(updatedHabits);
        return updatedHabits;
    },

    /**
     * Delete a habit
     */
    async deleteHabit(habitId) {
        const habits = await this.getHabits();
        const updatedHabits = habits.filter(habit => habit.id !== habitId);
        await this.saveHabits(updatedHabits);
        return updatedHabits;
    },

    /**
     * Get settings
     */
    async getSettings() {
        try {
            const jsonValue = await AsyncStorage.getItem(SETTINGS_KEY);
            return jsonValue != null ? JSON.parse(jsonValue) : null;
        } catch (e) {
            console.error('Error reading settings', e);
            return null;
        }
    },

    /**
     * Save settings
     */
    async saveSettings(settings) {
        try {
            const normalizedSettings = normalizeSettings(settings);
            const jsonValue = JSON.stringify(normalizedSettings);
            await AsyncStorage.setItem(SETTINGS_KEY, jsonValue);
        } catch (e) {
            console.error('Error saving settings', e);
        }
    },

    /**
     * Safely merge settings updates to avoid read-modify-write races.
     */
    async updateSettings(updater) {
        settingsWriteQueue = settingsWriteQueue.catch(() => null).then(async () => {
            const current = (await this.getSettings()) || {};
            const next = typeof updater === 'function' ? updater(current) : updater;
            await this.saveSettings(next || {});
        });

        return settingsWriteQueue;
    },

    /**
     * Get all projects
     */
    async getProjects() {
        try {
            const jsonValue = await AsyncStorage.getItem(PROJECTS_KEY);
            return jsonValue != null ? JSON.parse(jsonValue) : [];
        } catch (e) {
            console.error('Error reading projects', e);
            return [];
        }
    },

    /**
     * Save all projects
     */
    async saveProjects(projects) {
        try {
            const jsonValue = JSON.stringify(projects);
            await AsyncStorage.setItem(PROJECTS_KEY, jsonValue);
        } catch (e) {
            console.error('Error saving projects', e);
        }
    },

    /**
     * Add a new project
     * project: { name, durationDays }
     */
    async addProject(projectData) {
        const projects = await this.getProjects();
        const newProject = {
            id: Date.now().toString(),
            name: projectData.name,
            durationDays: parseInt(projectData.durationDays, 10),
            createdAt: new Date().toISOString(),
        };
        const newProjects = [newProject, ...projects];
        await this.saveProjects(newProjects);
        return newProjects;
    },

    /**
     * Delete a project
     */
    async deleteProject(projectId) {
        const projects = await this.getProjects();
        const updatedProjects = projects.filter(p => p.id !== projectId);
        await this.saveProjects(updatedProjects);
        return updatedProjects;
    },

    /**
     * Update an existing project
     */
    async updateProject(projectId, updates) {
        const projects = await this.getProjects();
        const updatedProjects = projects.map(project => {
            if (project.id === projectId) {
                return { ...project, ...updates };
            }
            return project;
        });
        await this.saveProjects(updatedProjects);
        return updatedProjects;
    },

    /**
     * Get all focus sessions
     */
    async getFocusSessions() {
        try {
            const jsonValue = await AsyncStorage.getItem(FOCUS_SESSIONS_KEY);
            const sessions = jsonValue != null ? JSON.parse(jsonValue) : [];
            const now = Date.now();
            const validSessions = (Array.isArray(sessions) ? sessions : []).filter((session) => {
                const createdAtMs = new Date(session?.createdAt).getTime();
                return Number.isFinite(createdAtMs) && (now - createdAtMs) <= FOCUS_RETENTION_MS;
            });

            if (validSessions.length !== sessions.length) {
                await this.saveFocusSessions(validSessions);
            }

            return validSessions;
        } catch (e) {
            console.error('Error reading focus sessions', e);
            return [];
        }
    },

    /**
     * Save all focus sessions
     */
    async saveFocusSessions(sessions) {
        try {
            const jsonValue = JSON.stringify(sessions);
            await AsyncStorage.setItem(FOCUS_SESSIONS_KEY, jsonValue);
        } catch (e) {
            console.error('Error saving focus sessions', e);
        }
    },

    /**
     * Add a new focus session
     */
    async addFocusSession(sessionData) {
        const sessions = await this.getFocusSessions();
        const newSession = {
            id: Date.now().toString(),
            title: sessionData.title,
            duration: sessionData.duration, // in milliseconds
            createdAt: new Date().toISOString(),
        };
        const newSessions = [newSession, ...sessions];
        await this.saveFocusSessions(newSessions);
        return newSessions;
    },

    /**
     * Delete a focus session
     */
    async deleteFocusSession(sessionId) {
        const sessions = await this.getFocusSessions();
        const updatedSessions = sessions.filter(s => s.id !== sessionId);
        await this.saveFocusSessions(updatedSessions);
        return updatedSessions;
    },

    /**
     * Get onboarding status
     */
    async getHasCompletedOnboarding() {
        try {
            const jsonValue = await AsyncStorage.getItem(ONBOARDING_KEY);
            return jsonValue != null ? JSON.parse(jsonValue) : false;
        } catch (e) {
            console.error('Error reading onboarding status', e);
            return false;
        }
    },

    /**
     * Save onboarding status
     */
    async saveHasCompletedOnboarding(status) {
        try {
            const jsonValue = JSON.stringify(status);
            await AsyncStorage.setItem(ONBOARDING_KEY, jsonValue);
        } catch (e) {
            console.error('Error saving onboarding status', e);
        }
    },

    /**
     * Get all todo items stored in settings.
     */
    async getTodoItems() {
        try {
            const settings = (await this.getSettings()) || {};
            return normalizeTodoItems(settings.todoList);
        } catch (e) {
            console.error('Error reading todo items', e);
            return [];
        }
    },

    /**
     * Save all todo items stored in settings.
     */
    async saveTodoItems(todoItems) {
        const normalized = normalizeTodoItems(todoItems);
        try {
            await this.updateSettings((settings = {}) => ({
                ...settings,
                todoList: normalized,
            }));
        } catch (e) {
            console.error('Error saving todo items', e);
        }
        return normalized;
    },

    /**
     * Add a todo item.
     */
    async addTodoItem(title) {
        const todoItems = await this.getTodoItems();
        const cleanedTitle = typeof title === 'string' ? title.trim() : '';
        if (!cleanedTitle) {return todoItems;}

        const nextItems = [
            {
                id: Date.now().toString(),
                title: cleanedTitle,
                completed: false,
                createdAt: new Date().toISOString(),
            },
            ...todoItems,
        ];
        return this.saveTodoItems(nextItems);
    },

    /**
     * Toggle a todo item completed state.
     */
    async toggleTodoItem(todoId) {
        const todoItems = await this.getTodoItems();
        const nextItems = todoItems.map((item) => (
            item.id === todoId
                ? { ...item, completed: !item.completed }
                : item
        ));
        return this.saveTodoItems(nextItems);
    },

    /**
     * Update a todo item.
     */
    async updateTodoItem(todoId, updates) {
        const todoItems = await this.getTodoItems();
        const nextItems = todoItems.map((item) => (
            item.id === todoId
                ? {
                    ...item,
                    ...updates,
                    title: typeof updates?.title === 'string' && updates.title.trim() ? updates.title.trim() : item.title,
                }
                : item
        ));
        return this.saveTodoItems(nextItems);
    },

    /**
     * Delete a todo item.
     */
    async deleteTodoItem(todoId) {
        const todoItems = await this.getTodoItems();
        const nextItems = todoItems.filter((item) => item.id !== todoId);
        return this.saveTodoItems(nextItems);
    },

    /**
     * Export app data as a JSON backup payload string.
     */
    async exportBackup() {
        try {
            const entries = await AsyncStorage.multiGet(BACKUP_KEYS);
            const data = {};

            entries.forEach(([key, value]) => {
                if (value != null) {
                    try {
                        data[key] = JSON.parse(value);
                    } catch {
                        data[key] = value;
                    }
                }
            });

            return JSON.stringify(
                {
                    schemaVersion: BACKUP_SCHEMA_VERSION,
                    exportedAt: new Date().toISOString(),
                    data,
                },
                null,
                2
            );
        } catch (e) {
            console.error('Error exporting backup', e);
            throw new Error('Could not export backup');
        }
    },

    /**
     * Import app data from a JSON backup payload string or object.
     */
    async importBackup(payload) {
        try {
            const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
            const data = parsed?.data;
            if (!data || typeof data !== 'object' || Array.isArray(data)) {
                throw new Error('Invalid backup format');
            }

            const writes = BACKUP_KEYS
                .filter((key) => Object.prototype.hasOwnProperty.call(data, key))
                .map((key) => [key, JSON.stringify(data[key])]);

            if (writes.length === 0) {
                throw new Error('No supported keys found in backup');
            }

            await AsyncStorage.multiSet(writes);
            // Always normalize imported data, even when schema version is already current.
            await this.migrateData(0);
            await AsyncStorage.setItem(STORAGE_SCHEMA_KEY, JSON.stringify(CURRENT_STORAGE_SCHEMA_VERSION));
            return true;
        } catch (e) {
            console.error('Error importing backup', e);
            throw new Error('Could not import backup');
        }
    },

};
