import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Switch,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Platform,
    KeyboardAvoidingView,
    useWindowDimensions,
    Image,
    Alert,
    Modal,
    Linking,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useTheme } from '../../context/ThemeContext';
import { useUser } from '../../context/UserContext';
import { storage } from '../../utils/storage';
import { NotificationService } from '../../utils/NotificationService';

const getAgeFromBirthDate = (birthDateValue) => {
    if (!birthDateValue) {return null;}
    const birthDate = new Date(birthDateValue);
    if (Number.isNaN(birthDate.getTime())) {return null;}

    const now = new Date();
    let age = now.getFullYear() - birthDate.getFullYear();
    const monthDelta = now.getMonth() - birthDate.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birthDate.getDate())) {
        age -= 1;
    }
    return Math.max(0, age);
};

const ABOUT_SECTIONS = [
    {
        key: 'mission',
        title: 'What is Flow State?',
        body: 'Flow State is designed to help users build consistency in daily routines and improve life balance.',
    },
    {
        key: 'approach',
        title: 'How it works',
        body: 'The app gives you a simple daily system for tracking habits, reviewing progress, and staying focused through practical actions.',
    },
    {
        key: 'features',
        title: 'Core features',
        bullets: [
            'Daily habit tracking with quick completion',
            'Life timeline and milestone exploration',
            'Learning and progress insights across sessions',
        ],
    },
    {
        key: 'vision',
        title: 'Product vision',
        body: 'Our mission is to make habit building simple, realistic, and sustainable, and continuously improve based on user feedback.',
    },
];

const createReminderDate = (hour = 9, minute = 0) => {
    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    return date;
};

const formatReminderTime = (date) => date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
});

export default function SettingsScreen() {
    const { theme, isDark, toggleTheme } = useTheme();
    const { userData, updateName, updateAvatar, avatarOptions, reloadUser } = useUser();
    const { width } = useWindowDimensions();

    const [nameInput, setNameInput] = useState(userData.name);
    const [isEditing, setIsEditing] = useState(false);
    const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isBackupBusy, setIsBackupBusy] = useState(false);
    const [exportPayload, setExportPayload] = useState('');
    const [importPayload, setImportPayload] = useState('');
    const [exportSelection, setExportSelection] = useState({ start: 0, end: 0 });
    const [expandedAboutSection, setExpandedAboutSection] = useState(ABOUT_SECTIONS[0].key);
    const [profileSaveState, setProfileSaveState] = useState('idle');
    const [themeSaveState, setThemeSaveState] = useState('idle');
    const [autoLaunchReminderEnabled, setAutoLaunchReminderEnabled] = useState(false);
    const [reminderTime, setReminderTime] = useState(createReminderDate());
    const [showReminderTimePicker, setShowReminderTimePicker] = useState(false);
    const [reminderSaveState, setReminderSaveState] = useState('idle');
    const exportInputRef = useRef(null);
    const profileSaveTimerRef = useRef(null);
    const themeSaveTimerRef = useRef(null);
    const reminderSaveTimerRef = useRef(null);

    const isWide = width >= 920;
    const appVersion = Constants.expoConfig?.version || Constants.nativeAppVersion || '1.0.0';

    const initials = useMemo(() => {
        const name = userData.name?.trim() || 'User';
        return name
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() || '')
            .join('');
    }, [userData.name]);

    const ageLabel = useMemo(() => {
        const age = getAgeFromBirthDate(userData.birthDate);
        return age === null ? 'Not set' : `${age}`;
    }, [userData.birthDate]);

    useEffect(() => {
        setNameInput(userData.name || '');
    }, [userData.name]);

    useEffect(() => {
        return () => {
            if (profileSaveTimerRef.current) {
                clearTimeout(profileSaveTimerRef.current);
            }
            if (themeSaveTimerRef.current) {
                clearTimeout(themeSaveTimerRef.current);
            }
            if (reminderSaveTimerRef.current) {
                clearTimeout(reminderSaveTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        let active = true;
        const loadReminderSetting = async () => {
            try {
                const settings = await storage.getSettings();
                const enabled = Boolean(settings?.reminderSettings?.autoLaunchEnabled);
                const hour = settings?.reminderSettings?.autoLaunchHour ?? 9;
                const minute = settings?.reminderSettings?.autoLaunchMinute ?? 0;
                if (active) {
                    setAutoLaunchReminderEnabled(enabled);
                    setReminderTime(createReminderDate(hour, minute));
                }
            } catch {
                if (active) {
                    setAutoLaunchReminderEnabled(false);
                    setReminderTime(createReminderDate());
                }
            }
        };
        loadReminderSetting();
        return () => {
            active = false;
        };
    }, []);

    const queueSavedState = (setter, timerRef) => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        setter('saved');
        timerRef.current = setTimeout(() => {
            setter('idle');
            timerRef.current = null;
        }, 1500);
    };

    const handleSaveName = async () => {
        if (profileSaveState === 'saving') {return;}
        const cleaned = nameInput.trim();
        if (!cleaned) {
            setNameInput(userData.name);
            setIsEditing(false);
            return;
        }
        try {
            setProfileSaveState('saving');
            await updateName(cleaned);
            setNameInput(cleaned);
            setIsEditing(false);
            queueSavedState(setProfileSaveState, profileSaveTimerRef);
        } catch (error) {
            setProfileSaveState('error');
        }
    };

    const handleAvatarSelect = async (avatarId) => {
        if (profileSaveState === 'saving') {return;}
        try {
            setProfileSaveState('saving');
            await updateAvatar(avatarId);
            queueSavedState(setProfileSaveState, profileSaveTimerRef);
        } catch (error) {
            setProfileSaveState('error');
        }
    };

    const handleToggleTheme = async () => {
        if (themeSaveState === 'saving') {return;}
        try {
            setThemeSaveState('saving');
            await toggleTheme();
            queueSavedState(setThemeSaveState, themeSaveTimerRef);
        } catch (error) {
            setThemeSaveState('error');
        }
    };

    const handleToggleAutoLaunchReminder = async (value) => {
        if (reminderSaveState === 'saving') {return;}
        try {
            setReminderSaveState('saving');
            const hour = reminderTime.getHours();
            const minute = reminderTime.getMinutes();

            if (value) {
                const granted = await NotificationService.requestPermissions();
                if (!granted) {
                    setAutoLaunchReminderEnabled(false);
                    setReminderSaveState('error');
                    Alert.alert('Permission needed', 'Please allow notifications to use Auto Launch Reminder.');
                    return;
                }
            }

            setAutoLaunchReminderEnabled(value);
            await storage.updateSettings((settings = {}) => ({
                ...settings,
                reminderSettings: {
                    ...(settings.reminderSettings || {}),
                    autoLaunchEnabled: value,
                    autoLaunchHour: hour,
                    autoLaunchMinute: minute,
                },
            }));

            await NotificationService.syncAutoLaunchReminder({
                enabled: value,
                hour,
                minute,
            });

            queueSavedState(setReminderSaveState, reminderSaveTimerRef);
        } catch (error) {
            setReminderSaveState('error');
        }
    };

    const handleReminderTimeChange = async (_, selectedDate) => {
        if (!selectedDate) {
            if (Platform.OS === 'android') {
                setShowReminderTimePicker(false);
            }
            return;
        }

        const nextTime = createReminderDate(selectedDate.getHours(), selectedDate.getMinutes());
        setReminderTime(nextTime);

        if (Platform.OS === 'android') {
            setShowReminderTimePicker(false);
        }

        try {
            setReminderSaveState('saving');
            await storage.updateSettings((settings = {}) => ({
                ...settings,
                reminderSettings: {
                    ...(settings.reminderSettings || {}),
                    autoLaunchEnabled: Boolean(settings?.reminderSettings?.autoLaunchEnabled),
                    autoLaunchHour: nextTime.getHours(),
                    autoLaunchMinute: nextTime.getMinutes(),
                },
            }));

            await NotificationService.syncAutoLaunchReminder({
                enabled: autoLaunchReminderEnabled,
                hour: nextTime.getHours(),
                minute: nextTime.getMinutes(),
            });

            queueSavedState(setReminderSaveState, reminderSaveTimerRef);
        } catch (error) {
            setReminderSaveState('error');
        }
    };

    const handleOpenExport = async () => {
        try {
            setIsBackupBusy(true);
            const payload = await storage.exportBackup();
            setExportPayload(payload);
            setExportSelection({ start: 0, end: 0 });
            setIsExportModalOpen(true);
        } catch (error) {
            Alert.alert('Export failed', 'Could not generate backup data.');
        } finally {
            setIsBackupBusy(false);
        }
    };

    const handleImport = async () => {
        if (!importPayload.trim()) {
            Alert.alert('Import failed', 'Paste backup JSON first.');
            return;
        }

        try {
            setIsBackupBusy(true);
            await storage.importBackup(importPayload);
            await reloadUser();
            setIsImportModalOpen(false);
            setImportPayload('');
            Alert.alert('Import complete', 'Data restored. Close and reopen the app to refresh all screens.');
        } catch (error) {
            Alert.alert('Import failed', 'Backup format is invalid or unsupported.');
        } finally {
            setIsBackupBusy(false);
        }
    };

    const handlePrepareCopy = () => {
        if (!exportPayload) {return;}
        const end = exportPayload.length;
        setExportSelection({ start: 0, end });
        requestAnimationFrame(() => {
            exportInputRef.current?.focus();
        });
        Alert.alert('Copy ready', 'Backup text selected. Use your keyboard/context menu and tap Copy.');
    };

    const handleOpenDeveloperProfile = async () => {
        const url = 'https://x.com/Xurde5Odyssey';
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
            Linking.openURL(url);
            return;
        }
        Alert.alert('Unable to open link', url);
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: theme.background }]}
        >
            <ScrollView contentContainerStyle={[styles.content, isWide && styles.contentWide]} showsVerticalScrollIndicator={false}>
                <View style={styles.headerArea}>
                    <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
                    <Text style={[styles.subtitle, { color: theme.subText }]}>Daily controls first, advanced tools below</Text>
                </View>

                <View style={[styles.profileHero, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                    <View style={[styles.profileImageWrap, { borderColor: theme.border, backgroundColor: theme.input }]}> 
                        {userData.profileImage ? (
                            <Image source={userData.profileImage} style={styles.avatarImage} />
                        ) : (
                            <Text style={[styles.avatarInitials, { color: theme.text }]}>{initials || 'U'}</Text>
                        )}
                    </View>
                    <View style={styles.profileMetaWrap}>
                        <Text style={[styles.profileName, { color: theme.text }]} numberOfLines={1}>{userData.name || 'User'}</Text>
                        <Text style={[styles.profileMeta, { color: theme.subText }]}>Age {ageLabel}</Text>
                    </View>
                    <View style={[styles.modePill, { backgroundColor: theme.input, borderColor: theme.border }]}> 
                        <Text style={[styles.modePillText, { color: theme.text }]}>{isDark ? 'Dark' : 'Light'}</Text>
                    </View>
                </View>

                <View style={styles.groupHeader}>
                    <Text style={[styles.groupLabel, { color: theme.text }]}>Daily Use</Text>
                    <Text style={[styles.groupHint, { color: theme.subText }]}>Things you may adjust often</Text>
                </View>

                <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Appearance</Text>
                    <View style={[styles.infoRowBox, { backgroundColor: theme.input, borderColor: theme.border }]}> 
                        <View style={styles.settingLeft}>
                            <View style={[styles.settingIcon, { backgroundColor: theme.background }]}> 
                                <Ionicons name={isDark ? 'moon' : 'sunny'} size={18} color={theme.primary} />
                            </View>
                            <View>
                                <Text style={[styles.settingTitle, { color: theme.text }]}>Theme Mode</Text>
                                <Text style={[styles.settingSub, { color: theme.subText }]}>{isDark ? 'Dark mode enabled' : 'Light mode enabled'}</Text>
                            </View>
                        </View>
                        <Switch
                            trackColor={{ false: '#94A3B8', true: theme.primary }}
                            thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : '#F8FAFC'}
                            ios_backgroundColor="#64748B"
                            onValueChange={handleToggleTheme}
                            value={isDark}
                            disabled={themeSaveState === 'saving'}
                        />
                    </View>
                    {themeSaveState !== 'idle' ? (
                        <Text
                            style={[
                                styles.inlineSaveText,
                                {
                                    color: themeSaveState === 'error'
                                        ? theme.danger
                                        : (themeSaveState === 'saved' ? theme.success : theme.subText),
                                },
                            ]}
                        >
                            {themeSaveState === 'saving'
                                ? 'Saving theme...'
                                : (themeSaveState === 'saved' ? 'Theme saved' : 'Could not save theme')}
                        </Text>
                    ) : null}
                </View>

                <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Smart Reminder</Text>
                    <View style={[styles.infoRowBox, { backgroundColor: theme.input, borderColor: theme.border }]}>
                        <View style={styles.settingLeft}>
                            <View style={[styles.settingIcon, { backgroundColor: theme.background }]}>
                                <Ionicons name="alarm-outline" size={18} color={theme.primary} />
                            </View>
                            <View>
                                <Text style={[styles.settingTitle, { color: theme.text }]}>Auto Launch Reminder</Text>
                                <Text style={[styles.settingSub, { color: theme.subText }]}>
                                    Daily reminder at 9:00 AM
                                </Text>
                            </View>
                        </View>
                        <Switch
                            trackColor={{ false: '#94A3B8', true: theme.primary }}
                            thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : '#F8FAFC'}
                            ios_backgroundColor="#64748B"
                            onValueChange={handleToggleAutoLaunchReminder}
                            value={autoLaunchReminderEnabled}
                            disabled={reminderSaveState === 'saving'}
                        />
                    </View>
                    <TouchableOpacity
                        style={[styles.reminderTimeButton, { backgroundColor: theme.input, borderColor: theme.border }]}
                        activeOpacity={0.85}
                        onPress={() => setShowReminderTimePicker((prev) => !prev)}
                    >
                        <View style={styles.settingLeft}>
                            <View style={[styles.settingIcon, { backgroundColor: theme.background }]}>
                                <Ionicons name="time-outline" size={18} color={theme.primary} />
                            </View>
                            <View>
                                <Text style={[styles.settingTitle, { color: theme.text }]}>Reminder Time</Text>
                                <Text style={[styles.settingSub, { color: theme.subText }]}>
                                    {formatReminderTime(reminderTime)}
                                </Text>
                            </View>
                        </View>
                        <Ionicons
                            name={showReminderTimePicker ? 'chevron-up' : 'chevron-down'}
                            size={18}
                            color={theme.subText}
                        />
                    </TouchableOpacity>

                    {showReminderTimePicker ? (
                        <View style={[styles.reminderPickerWrap, { backgroundColor: theme.input, borderColor: theme.border }]}>
                            <DateTimePicker
                                value={reminderTime}
                                mode="time"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={handleReminderTimeChange}
                            />
                            {Platform.OS === 'ios' ? (
                                <TouchableOpacity
                                    style={[styles.reminderPickerDone, { backgroundColor: theme.primary }]}
                                    onPress={() => setShowReminderTimePicker(false)}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.reminderPickerDoneText}>Done</Text>
                                </TouchableOpacity>
                            ) : null}
                        </View>
                    ) : null}
                    {reminderSaveState !== 'idle' ? (
                        <Text
                            style={[
                                styles.inlineSaveText,
                                {
                                    color: reminderSaveState === 'error'
                                        ? theme.danger
                                        : (reminderSaveState === 'saved' ? theme.success : theme.subText),
                                },
                            ]}
                        >
                            {reminderSaveState === 'saving'
                                ? 'Saving reminder...'
                                : (reminderSaveState === 'saved' ? 'Reminder updated' : 'Could not update reminder')}
                        </Text>
                    ) : null}
                </View>

                <View style={styles.groupHeader}>
                    <Text style={[styles.groupLabel, { color: theme.text }]}>Account</Text>
                    <Text style={[styles.groupHint, { color: theme.subText }]}>Identity and personal profile</Text>
                </View>

                <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Profile</Text>

                    <Text style={[styles.fieldLabel, { color: theme.subText }]}>Display Name</Text>
                    {isEditing ? (
                        <View style={styles.editRow}>
                            <TextInput
                                style={[styles.input, { color: theme.text, backgroundColor: theme.input, borderColor: theme.border }]}
                                value={nameInput}
                                onChangeText={setNameInput}
                                autoFocus
                                onBlur={handleSaveName}
                                onSubmitEditing={handleSaveName}
                                returnKeyType="done"
                                editable={profileSaveState !== 'saving'}
                            />
                            <TouchableOpacity
                                onPress={handleSaveName}
                                style={[styles.actionIcon, { backgroundColor: theme.primary + '22' }]}
                                disabled={profileSaveState === 'saving'}
                            >
                                <Ionicons name="checkmark" size={18} color={theme.primary} />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={[styles.infoRowBox, { backgroundColor: theme.input, borderColor: theme.border }]}>
                            <Text style={[styles.infoValue, { color: theme.text }]}>{userData.name || 'User'}</Text>
                            <TouchableOpacity
                                onPress={() => setIsEditing(true)}
                                style={[styles.actionIcon, { backgroundColor: theme.primary + '22' }]}
                                disabled={profileSaveState === 'saving'}
                            >
                                <Ionicons name="pencil" size={16} color={theme.primary} />
                            </TouchableOpacity>
                        </View>
                    )}

                    <TouchableOpacity
                        style={[styles.avatarToggle, { borderColor: theme.border, backgroundColor: theme.input }]}
                        activeOpacity={0.85}
                        onPress={() => setIsAvatarPickerOpen((prev) => !prev)}
                        disabled={profileSaveState === 'saving'}
                    >
                        <Text style={[styles.avatarToggleText, { color: theme.text }]}>Choose Avatar</Text>
                        <Ionicons name={isAvatarPickerOpen ? 'chevron-up' : 'chevron-down'} size={18} color={theme.subText} />
                    </TouchableOpacity>

                    {isAvatarPickerOpen ? (
                        <View style={styles.avatarOptionsGrid}>
                            {avatarOptions.map((avatar) => {
                                const isActive = userData.avatarId === avatar.id;
                                return (
                                    <TouchableOpacity
                                        key={avatar.id}
                                        onPress={() => handleAvatarSelect(avatar.id)}
                                        activeOpacity={0.8}
                                        disabled={profileSaveState === 'saving'}
                                        style={[
                                            styles.avatarOption,
                                            {
                                                borderColor: isActive ? theme.primary : theme.border,
                                                backgroundColor: isActive ? theme.primary + '14' : theme.input,
                                            },
                                        ]}
                                    >
                                        <Image source={avatar.source} style={styles.avatarOptionImage} />
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    ) : null}

                    {profileSaveState !== 'idle' ? (
                        <Text
                            style={[
                                styles.inlineSaveText,
                                {
                                    color: profileSaveState === 'error'
                                        ? theme.danger
                                        : (profileSaveState === 'saved' ? theme.success : theme.subText),
                                },
                            ]}
                        >
                            {profileSaveState === 'saving'
                                ? 'Saving profile...'
                                : (profileSaveState === 'saved' ? 'Profile saved' : 'Could not save profile')}
                        </Text>
                    ) : null}
                </View>

                <View style={styles.groupHeader}>
                    <Text style={[styles.groupLabel, { color: theme.text }]}>Data & Advanced</Text>
                    <Text style={[styles.groupHint, { color: theme.subText }]}>Maintenance, transfer, and recovery tools</Text>
                </View>

                <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Data Backup</Text>
                    <Text style={[styles.settingSub, { color: theme.subText, marginBottom: 12 }]}>Export or import your local session data as JSON.</Text>

                    <View style={styles.backupButtonsRow}>
                        <TouchableOpacity
                            style={[styles.backupButton, { backgroundColor: theme.input, borderColor: theme.border }]}
                            onPress={handleOpenExport}
                            activeOpacity={0.85}
                            disabled={isBackupBusy}
                        >
                            <Ionicons name="download-outline" size={16} color={theme.text} />
                            <Text style={[styles.backupButtonText, { color: theme.text }]}>Export Session</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.backupButton, { backgroundColor: theme.input, borderColor: theme.border }]}
                            onPress={() => setIsImportModalOpen(true)}
                            activeOpacity={0.85}
                            disabled={isBackupBusy}
                        >
                            <Ionicons name="cloud-upload-outline" size={16} color={theme.text} />
                            <Text style={[styles.backupButtonText, { color: theme.text }]}>Import Session</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.groupHeader}>
                    <Text style={[styles.groupLabel, { color: theme.text }]}>About</Text>
                    <Text style={[styles.groupHint, { color: theme.subText }]}>Version, developer, and product context</Text>
                </View>

                <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>About</Text>
                    <TouchableOpacity style={styles.infoList} onPress={handleOpenDeveloperProfile} activeOpacity={0.75}>
                        <Text style={[styles.infoLabel, { color: theme.subText }]}>Developer</Text>
                        <View style={styles.infoLinkWrap}>
                            <Text style={[styles.infoValue, { color: theme.text }]}>Xurde</Text>
                            <Ionicons name="open-outline" size={14} color={theme.subText} style={{ marginLeft: 6 }} />
                        </View>
                    </TouchableOpacity>

                    <View style={[styles.infoDivider, { backgroundColor: theme.border }]} />

                    <View style={styles.infoList}>
                        <Text style={[styles.infoLabel, { color: theme.subText }]}>Version</Text>
                        <Text style={[styles.infoValue, { color: theme.text }]}>{appVersion}</Text>
                    </View>

                    <View style={[styles.infoDivider, { backgroundColor: theme.border }]} />

                    <View style={styles.aboutAccordionWrap}>
                        {ABOUT_SECTIONS.map((section) => {
                            const isExpanded = expandedAboutSection === section.key;
                            return (
                                <View
                                    key={section.key}
                                    style={[
                                        styles.aboutAccordionItem,
                                        {
                                            borderColor: theme.border,
                                            backgroundColor: isExpanded ? theme.input : 'transparent',
                                        },
                                    ]}
                                >
                                    <TouchableOpacity
                                        style={styles.aboutAccordionHeader}
                                        onPress={() => {
                                            setExpandedAboutSection((prev) => (prev === section.key ? '' : section.key));
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.aboutAccordionTitle, { color: theme.text }]}>{section.title}</Text>
                                        <Ionicons
                                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                            size={16}
                                            color={theme.subText}
                                        />
                                    </TouchableOpacity>

                                    {isExpanded ? (
                                        <View style={styles.aboutAccordionBody}>
                                            {section.body ? (
                                                <Text style={[styles.aboutText, { color: theme.subText }]}>{section.body}</Text>
                                            ) : null}
                                            {section.bullets
                                                ? section.bullets.map((bullet) => (
                                                    <Text key={bullet} style={[styles.aboutBullet, { color: theme.subText }]}>
                                                        {'\u2022'} {bullet}
                                                    </Text>
                                                ))
                                                : null}
                                        </View>
                                    ) : null}
                                </View>
                            );
                        })}
                    </View>
                </View>
            </ScrollView>

            <Modal
                visible={isExportModalOpen}
                animationType="slide"
                transparent
                onRequestClose={() => setIsExportModalOpen(false)}
            >
                <View style={styles.backupModalOverlay}>
                    <View style={[styles.backupModalCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                        <View style={styles.backupModalHeader}>
                            <Text style={[styles.backupModalTitle, { color: theme.text }]}>Export Session JSON</Text>
                            <TouchableOpacity onPress={() => setIsExportModalOpen(false)}>
                                <Ionicons name="close" size={20} color={theme.text} />
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            ref={exportInputRef}
                            value={exportPayload}
                            editable
                            onChangeText={() => {}}
                            multiline
                            selectTextOnFocus
                            selection={exportSelection}
                            style={[styles.backupTextArea, { color: theme.text, backgroundColor: theme.input, borderColor: theme.border }]}
                        />
                        <TouchableOpacity
                            style={[styles.modalActionButton, { backgroundColor: theme.primary }]}
                            onPress={handlePrepareCopy}
                        >
                            <Text style={styles.modalActionText}>Copy Backup Text</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={isImportModalOpen}
                animationType="slide"
                transparent
                onRequestClose={() => setIsImportModalOpen(false)}
            >
                <View style={styles.backupModalOverlay}>
                    <View style={[styles.backupModalCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                        <View style={styles.backupModalHeader}>
                            <Text style={[styles.backupModalTitle, { color: theme.text }]}>Import Session JSON</Text>
                            <TouchableOpacity onPress={() => setIsImportModalOpen(false)}>
                                <Ionicons name="close" size={20} color={theme.text} />
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            value={importPayload}
                            onChangeText={setImportPayload}
                            multiline
                            placeholder="Paste exported JSON backup here"
                            placeholderTextColor={theme.subText}
                            style={[styles.backupTextArea, { color: theme.text, backgroundColor: theme.input, borderColor: theme.border }]}
                        />
                        <TouchableOpacity
                            style={[styles.modalActionButton, { backgroundColor: theme.primary }, isBackupBusy && styles.modalActionDisabled]}
                            onPress={handleImport}
                            disabled={isBackupBusy}
                        >
                            <Text style={styles.modalActionText}>{isBackupBusy ? 'Importing...' : 'Restore Backup'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 18,
        paddingTop: 50,
        paddingBottom: 34,
    },
    contentWide: {
        maxWidth: 960,
        width: '100%',
        alignSelf: 'center',
        paddingHorizontal: 26,
    },
    headerArea: {
        marginBottom: 14,
    },
    groupHeader: {
        marginTop: 6,
        marginBottom: 8,
        paddingHorizontal: 2,
    },
    groupLabel: {
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    groupHint: {
        marginTop: 3,
        fontSize: 12,
        fontWeight: '500',
        lineHeight: 17,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: -0.9,
    },
    subtitle: {
        marginTop: 4,
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    profileHero: {
        borderWidth: 1,
        borderRadius: 18,
        padding: 14,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileImageWrap: {
        width: 52,
        height: 52,
        borderRadius: 26,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarInitials: {
        fontSize: 18,
        fontWeight: '800',
    },
    profileMetaWrap: {
        flex: 1,
        marginLeft: 12,
    },
    profileName: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.4,
    },
    profileMeta: {
        marginTop: 2,
        fontSize: 12,
        fontWeight: '600',
    },
    modePill: {
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    modePillText: {
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    sectionCard: {
        borderWidth: 1,
        borderRadius: 18,
        padding: 14,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 10,
    },
    fieldLabel: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.7,
    },
    editRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        marginRight: 8,
    },
    actionIcon: {
        width: 34,
        height: 34,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoRowBox: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    avatarToggle: {
        marginTop: 10,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 11,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    avatarToggleText: {
        fontSize: 14,
        fontWeight: '700',
    },
    avatarOptionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 10,
    },
    avatarOption: {
        width: 46,
        height: 46,
        borderRadius: 23,
        borderWidth: 2,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarOptionImage: {
        width: '100%',
        height: '100%',
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    settingIcon: {
        width: 34,
        height: 34,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    settingTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    settingSub: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 1,
    },
    inlineSaveText: {
        marginTop: 10,
        fontSize: 12,
        fontWeight: '700',
    },
    reminderTimeButton: {
        marginTop: 10,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    reminderPickerWrap: {
        marginTop: 10,
        borderWidth: 1,
        borderRadius: 12,
        paddingTop: 8,
        paddingBottom: 12,
        overflow: 'hidden',
    },
    reminderPickerDone: {
        alignSelf: 'flex-end',
        marginTop: 6,
        marginRight: 12,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    reminderPickerDoneText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800',
    },
    backupButtonsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    backupButton: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    backupButtonText: {
        fontSize: 13,
        fontWeight: '700',
    },
    infoList: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    infoLinkWrap: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    infoValue: {
        fontSize: 15,
        fontWeight: '700',
    },
    infoDivider: {
        height: 1,
        marginVertical: 12,
    },
    aboutAccordionWrap: {
        gap: 8,
    },
    aboutAccordionItem: {
        borderWidth: 1,
        borderRadius: 12,
        overflow: 'hidden',
    },
    aboutAccordionHeader: {
        paddingHorizontal: 12,
        paddingVertical: 11,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    aboutAccordionTitle: {
        fontSize: 14,
        fontWeight: '800',
    },
    aboutAccordionBody: {
        paddingHorizontal: 12,
        paddingBottom: 11,
    },
    aboutText: {
        fontSize: 13,
        lineHeight: 19,
        fontWeight: '500',
        marginBottom: 2,
    },
    aboutBullet: {
        fontSize: 13,
        lineHeight: 19,
        fontWeight: '600',
        marginBottom: 2,
    },
    backupModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        justifyContent: 'flex-end',
    },
    backupModalCard: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 20,
        minHeight: '58%',
    },
    backupModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    backupModalTitle: {
        fontSize: 16,
        fontWeight: '800',
    },
    backupTextArea: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 12,
        padding: 10,
        textAlignVertical: 'top',
        fontSize: 12,
        lineHeight: 18,
        minHeight: 220,
    },
    modalActionButton: {
        marginTop: 12,
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
    },
    modalActionDisabled: {
        opacity: 0.6,
    },
    modalActionText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
    },
});
