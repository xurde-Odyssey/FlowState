import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LottieView from '../../components/LottieCompat';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useUser } from '../../context/UserContext';
import { useTime } from '../../context/TimeContext';
import { useTodayData } from './today/hooks/useTodayData';
import { useSidebarDrawer } from './today/hooks/useSidebarDrawer';
import TodayHeaderSection from './today/components/TodayHeaderSection';
import TodoListSection from './today/components/TodoListSection';
import ProjectsSection from './today/components/ProjectsSection';
import HabitsSection from './today/components/HabitsSection';
import TodayModals from './today/components/TodayModals';
import SidebarDrawer from './today/components/SidebarDrawer';

export default function TodayScreen() {
    const { theme } = useTheme();
    const { userData, isUserLoading, userError } = useUser();
    const { playSuccessChime } = useTime();
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const scrollRef = React.useRef(null);

    const {
        habits,
        today,
        projects,
        todoItems,
        loadingHabits,
        loadingProjects,
        loadingTodos,
        habitsError,
        projectsError,
        todoError,
        quote,
        loadingQuote,
        quoteError,
        weekDays,
        completedCount,
        isCompleted,

        isHabitModalVisible,
        isSavingHabit,
        newHabitName,
        setNewHabitName,
        editingHabitId,
        habitFrequency,
        setHabitFrequency,
        habitPriority,
        setHabitPriority,
        habitCategory,
        setHabitCategory,
        habitFrequencyOptions,
        habitPriorityOptions,
        habitCategoryOptions,

        isProjectModalVisible,
        isSavingProject,
        editingProjectId,
        newProjectName,
        setNewProjectName,
        newProjectDuration,
        setNewProjectDuration,

        showConfetti,
        setShowConfetti,
        undoSnackbar,
        undoLastDeletion,
        dismissUndoSnackbar,

        openCreateHabitModal,
        closeHabitModal,
        openEditModal,
        toggleHabit,
        handleAddOrUpdateHabit,
        handleDeleteHabit,
        addHabitFromTemplate,

        loadHabits,
        loadProjects,
        loadTodos,
        fetchQuote,
        openCreateProjectModal,
        closeProjectModal,
        openEditProjectModal,
        handleAddOrUpdateProject,
        handleCompleteProject,
        handleDeleteProject,
        calculateDaysLeft,
        getDaysLeftColor,
        addTodoItem,
        toggleTodoItem,
        updateTodoItem,
        deleteTodoItem,
    } = useTodayData({ playSuccessChime });

    const {
        isSidebarVisible,
        openSidebar,
        closeSidebar,
        navigateToSection,
        displayX,
        dynamicBackdropOpacity,
    } = useSidebarDrawer({ navigation, theme });

    useFocusEffect(
        React.useCallback(() => {
            requestAnimationFrame(() => {
                scrollRef.current?.scrollTo({ y: 0, animated: true });
            });
        }, [])
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={{ flex: 1 }}>
                <ScrollView
                    ref={scrollRef}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    <TodayHeaderSection
                        styles={styles}
                        theme={theme}
                        userData={userData}
                        today={today}
                        quote={quote}
                        loadingQuote={loadingQuote}
                        quoteError={quoteError}
                        weekDays={weekDays}
                        onOpenSidebar={openSidebar}
                        onOpenSettings={() => navigation.navigate('Settings')}
                        onRetryQuote={fetchQuote}
                        onOpenDecisionWheel={() => navigation.navigate('DecisionWheel')}
                        onOpenNews={() => navigation.navigate('News')}
                        onOpenShareMarket={() => navigation.navigate('Market')}
                    />

                    <TodoListSection
                        styles={styles}
                        theme={theme}
                        todoItems={todoItems}
                        loadingTodos={loadingTodos}
                        todoError={todoError}
                        onRetryLoadTodos={loadTodos}
                        onAddTodo={addTodoItem}
                        onToggleTodo={toggleTodoItem}
                        onUpdateTodo={updateTodoItem}
                        onDeleteTodo={deleteTodoItem}
                    />

                    <ProjectsSection
                        styles={styles}
                        theme={theme}
                        projects={projects}
                        loadingProjects={loadingProjects}
                        projectsError={projectsError}
                        onRetryLoadProjects={loadProjects}
                        onOpenProjectModal={openCreateProjectModal}
                        onEditProject={openEditProjectModal}
                        onCompleteProject={handleCompleteProject}
                        onDeleteProject={handleDeleteProject}
                        calculateDaysLeft={calculateDaysLeft}
                        getDaysLeftColor={getDaysLeftColor}
                    />

                    <HabitsSection
                        styles={styles}
                        theme={theme}
                        habits={habits}
                        loadingHabits={loadingHabits}
                        habitsError={habitsError}
                        onRetryLoadHabits={loadHabits}
                        completedCount={completedCount}
                        isCompleted={isCompleted}
                        onToggleHabit={toggleHabit}
                        onEditHabit={openEditModal}
                        onDeleteHabit={handleDeleteHabit}
                        onOpenHabitModal={openCreateHabitModal}
                        onAddHabitTemplate={addHabitFromTemplate}
                    />

                    <View style={{ height: 40 }} />
                </ScrollView>
            </View>

            <TouchableOpacity
                style={[
                    styles.floatingAddButton,
                    {
                        backgroundColor: theme.primary,
                        shadowColor: theme.shadow,
                        bottom: insets.bottom + 96,
                    },
                ]}
                onPress={openCreateHabitModal}
                activeOpacity={0.85}
            >
                <Ionicons name="add" size={28} color="#FFFFFF" />
            </TouchableOpacity>

            <TodayModals
                styles={styles}
                theme={theme}
                isHabitModalVisible={isHabitModalVisible}
                isSavingHabit={isSavingHabit}
                closeHabitModal={closeHabitModal}
                editingHabitId={editingHabitId}
                newHabitName={newHabitName}
                setNewHabitName={setNewHabitName}
                habitFrequency={habitFrequency}
                setHabitFrequency={setHabitFrequency}
                habitPriority={habitPriority}
                setHabitPriority={setHabitPriority}
                habitCategory={habitCategory}
                setHabitCategory={setHabitCategory}
                habitFrequencyOptions={habitFrequencyOptions}
                habitPriorityOptions={habitPriorityOptions}
                habitCategoryOptions={habitCategoryOptions}
                handleAddOrUpdateHabit={handleAddOrUpdateHabit}
                isProjectModalVisible={isProjectModalVisible}
                isSavingProject={isSavingProject}
                closeProjectModal={closeProjectModal}
                editingProjectId={editingProjectId}
                newProjectName={newProjectName}
                setNewProjectName={setNewProjectName}
                newProjectDuration={newProjectDuration}
                setNewProjectDuration={setNewProjectDuration}
                handleAddOrUpdateProject={handleAddOrUpdateProject}
            />

            {undoSnackbar.visible ? (
                <View
                    style={[
                        styles.undoSnackbar,
                        {
                            backgroundColor: theme.card,
                            borderColor: theme.border,
                            bottom: insets.bottom + 20,
                            shadowColor: theme.shadow,
                        },
                    ]}
                >
                    <View style={styles.undoSnackbarTextWrap}>
                        <Text style={[styles.undoSnackbarText, { color: theme.text }]} numberOfLines={1}>
                            {undoSnackbar.message}
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={undoLastDeletion}
                        style={[styles.undoActionButton, { backgroundColor: theme.primary + '22', borderColor: theme.primary + '55' }]}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.undoActionText, { color: theme.primary }]}>Undo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={dismissUndoSnackbar} style={styles.undoCloseButton} activeOpacity={0.75}>
                        <Ionicons name="close" size={16} color={theme.subText} />
                    </TouchableOpacity>
                </View>
            ) : null}

            <SidebarDrawer
                styles={styles}
                theme={theme}
                userData={userData}
                isUserLoading={isUserLoading}
                userError={userError}
                isSidebarVisible={isSidebarVisible}
                dynamicBackdropOpacity={dynamicBackdropOpacity}
                displayX={displayX}
                closeSidebar={closeSidebar}
                navigateToSection={navigateToSection}
            />

            {showConfetti && (
                <View style={[StyleSheet.absoluteFill, { zIndex: 999 }]} pointerEvents="none">
                    <LottieView
                        source={{ uri: 'https://lottie.host/7e0cebd5-728f-4ed3-9a4f-561494df9f87/1O4d3Vb9mQ.json' }}
                        autoPlay
                        loop={false}
                        onAnimationFinish={() => setShowConfetti(false)}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                    />
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    topAnchorContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 12,
        marginBottom: 24,
    },
    menuButton: {
        width: 50,
        height: 50,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.25)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
    },
    menuGlyph: {
        width: 24,
        height: 18,
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    menuBar: {
        height: 2.4,
        borderRadius: 999,
        width: 20,
    },
    menuBarMiddle: {
        width: 16,
    },
    menuBarShort: {
        width: 11,
    },
    todayAnchor: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingVertical: 10,
        paddingLeft: 10,
        paddingRight: 18,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 2,
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    todayProfileText: {
        marginRight: 10,
        alignItems: 'flex-end',
    },
    avatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    dayLabel: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        opacity: 0.6,
    },
    dateLabel: {
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    addButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    floatingAddButton: {
        position: 'absolute',
        right: 22,
        width: 58,
        height: 58,
        borderRadius: 29,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.28,
        shadowRadius: 14,
        elevation: 10,
        zIndex: 50,
    },
    undoSnackbar: {
        position: 'absolute',
        left: 16,
        right: 16,
        borderWidth: 1,
        borderRadius: 14,
        minHeight: 52,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
        elevation: 8,
        zIndex: 70,
    },
    undoSnackbarTextWrap: {
        flex: 1,
        marginRight: 8,
    },
    undoSnackbarText: {
        fontSize: 13,
        fontWeight: '600',
    },
    undoActionButton: {
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginRight: 8,
    },
    undoActionText: {
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    undoCloseButton: {
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    greetingContainer: {
        marginBottom: 18,
    },
    greetingEyebrow: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.9,
        opacity: 0.9,
    },
    greetingName: {
        fontSize: 34,
        lineHeight: 38,
        fontWeight: '800',
        letterSpacing: -1.1,
        marginTop: 2,
    },
    greetingSupport: {
        fontSize: 15,
        marginTop: 6,
        fontWeight: '500',
        opacity: 0.78,
    },
    quoteContainer: {
        marginBottom: 12,
    },
    quoteCard: {
        padding: 18,
        borderRadius: 22,
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.12,
        shadowRadius: 25,
        elevation: 5,
    },
    quoteIconContainer: {
        marginBottom: 12,
    },
    quoteText: {
        fontSize: 15,
        fontStyle: 'italic',
        lineHeight: 24,
        fontWeight: '500',
        marginBottom: 12,
    },
    quoteAuthor: {
        fontSize: 13,
        fontWeight: '700',
        alignSelf: 'flex-end',
        opacity: 0.8,
    },
    headerOverviewCard: {
        marginHorizontal: 24,
        marginBottom: 30,
        borderRadius: 30,
        borderWidth: 1,
        padding: 18,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.1,
        shadowRadius: 24,
        elevation: 5,
    },
    quickAccessContainer: {
        marginBottom: 12,
    },
    quickAccessRow: {
        flexDirection: 'row',
        gap: 10,
    },
    quickAccessButton: {
        flex: 1,
        minHeight: 74,
        borderRadius: 18,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
    },
    quickAccessIconWrap: {
        width: 30,
        height: 30,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    quickAccessLabel: {
        fontSize: 11,
        fontWeight: '700',
        textAlign: 'center',
        lineHeight: 14,
    },
    calendarStrip: {
        marginBottom: 0,
    },
    weekContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 20,
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.12,
        shadowRadius: 25,
        elevation: 5,
    },
    dayItem: {
        alignItems: 'center',
    },
    dayName: {
        fontSize: 10,
        fontWeight: '700',
        marginBottom: 10,
        letterSpacing: 0.5,
    },
    dateCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dateNumber: {
        fontSize: 14,
        fontWeight: '700',
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        marginBottom: 2,
    },
    section: {
        paddingHorizontal: 24,
        marginBottom: 32,
    },
    todoComposer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 22,
        paddingLeft: 16,
        paddingRight: 10,
        paddingVertical: 10,
        marginBottom: 14,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.07,
        shadowRadius: 18,
        elevation: 3,
    },
    todoInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        paddingVertical: 4,
        paddingRight: 12,
    },
    todoAddButton: {
        width: 38,
        height: 38,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    todoCountBadge: {
        fontSize: 11,
        fontWeight: '800',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    todoEmptyCard: {
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 18,
        paddingVertical: 20,
        alignItems: 'center',
    },
    todoEmptyTitle: {
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 4,
    },
    todoEmptyText: {
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'center',
        lineHeight: 19,
    },
    todoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 14,
        marginBottom: 12,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 2,
    },
    todoCheckButton: {
        width: 26,
        height: 26,
        borderRadius: 10,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    todoTitle: {
        flex: 1,
        fontSize: 15,
        fontWeight: '700',
        lineHeight: 21,
    },
    todoDeleteButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    todoEditButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 4,
    },
    todoEditInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: '700',
        lineHeight: 21,
        paddingVertical: 0,
        marginRight: 8,
    },
    todoEditActions: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
    },
    todoMiniAction: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 6,
    },
    widgetsSection: {
        paddingHorizontal: 24,
        marginBottom: 26,
    },
    widgetsTitle: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.4,
        marginBottom: 12,
    },
    widgetsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    widgetCard: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 14,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 2,
    },
    widgetTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    widgetIcon: {
        width: 28,
        height: 28,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    widgetAction: {
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    widgetLabel: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 4,
    },
    widgetValue: {
        fontSize: 23,
        lineHeight: 28,
        fontWeight: '800',
        letterSpacing: -0.6,
    },
    widgetMeta: {
        marginTop: 2,
        fontSize: 11,
        fontWeight: '600',
    },
    widgetSubAction: {
        marginTop: 10,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    widgetSubActionText: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    lifeWidgetCard: {
        borderWidth: 1,
        borderRadius: 22,
        paddingHorizontal: 14,
        paddingVertical: 14,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 2,
    },
    lifeWidgetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    lifeWidgetTitle: {
        fontSize: 16,
        fontWeight: '800',
    },
    lifeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
    },
    lifeBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    lifeMetricRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    lifeMetricItem: {
        flex: 1,
    },
    lifeMetricLabel: {
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 2,
    },
    lifeMetricValue: {
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    lifeProgressTrack: {
        height: 9,
        borderRadius: 999,
        overflow: 'hidden',
        marginBottom: 10,
    },
    lifeProgressFill: {
        height: '100%',
        borderRadius: 999,
        minWidth: 6,
    },
    lifeMapRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
    },
    lifeMapSegment: {
        width: '4.4%',
        height: 8,
        borderRadius: 3,
    },
    lifeEmptyHint: {
        marginTop: 10,
        fontSize: 12,
        fontWeight: '600',
        lineHeight: 18,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    sectionHeaderTextWrap: {
        flex: 1,
        paddingRight: 12,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    sectionDescription: {
        marginTop: 4,
        fontSize: 12,
        fontWeight: '600',
        lineHeight: 17,
    },
    addSectionButton: {
        width: 32,
        height: 32,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    projectCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderRadius: 26,
        marginBottom: 16,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 4,
    },
    projectInfo: {
        flex: 1,
        marginRight: 16,
    },
    projectName: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    projectDeadlineLabel: {
        fontSize: 12,
        fontWeight: '500',
        opacity: 0.6,
    },
    daysLeftBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    daysLeftText: {
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    emptyProjectCard: {
        padding: 32,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.5,
    },
    emptyStateContainer: {
        padding: 14,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'flex-start',
        marginTop: 0,
        marginBottom: 4,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: '800',
        marginTop: 0,
        marginBottom: 4,
    },
    emptyStateSubtext: {
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 6,
        paddingHorizontal: 8,
    },
    emptyStateButton: {
        marginTop: 4,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
    },
    emptyStateButtonText: {
        color: 'white',
        fontWeight: '800',
        fontSize: 13,
    },
    quickHabitRow: {
        width: '100%',
        marginTop: 8,
        gap: 8,
    },
    quickHabitButton: {
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 9,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    quickHabitText: {
        fontSize: 13,
        fontWeight: '700',
    },
    sectionStateCard: {
        borderWidth: 1,
        borderRadius: 20,
        padding: 18,
        marginBottom: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionStateText: {
        marginTop: 10,
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
    },
    inlineActionButton: {
        marginTop: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
    },
    inlineActionText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '700',
    },
    habitsSection: {
        paddingHorizontal: 24,
        marginBottom: 32,
    },
    habitsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    progressBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    progressText: {
        fontSize: 12,
        fontWeight: '700',
    },
    habitCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        borderRadius: 26,
        marginBottom: 14,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 15,
        elevation: 3,
    },
    checkCircle: {
        width: 28,
        height: 28,
        borderRadius: 11,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    habitInfo: {
        flex: 1,
    },
    habitName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    completedHabitName: {
        opacity: 0.5,
        textDecorationLine: 'line-through',
    },
    streakInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    streakText: {
        fontSize: 11,
        fontWeight: '600',
        marginLeft: 4,
        opacity: 0.6,
    },
    swipeActionsWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
        marginRight: 2,
    },
    swipeActionButton: {
        width: 72,
        height: '92%',
        borderRadius: 18,
        marginLeft: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    swipeActionLabel: {
        color: 'white',
        fontSize: 10,
        fontWeight: '700',
        marginTop: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.2,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '700',
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 12,
        textTransform: 'uppercase',
        opacity: 0.6,
    },
    input: {
        borderRadius: 16,
        padding: 16,
        fontSize: 16,
        marginBottom: 24,
        fontWeight: '500',
    },
    timePickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    optionGroup: {
        marginBottom: 16,
    },
    optionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    optionChip: {
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    optionChipText: {
        fontSize: 12,
        fontWeight: '700',
    },
    habitMetaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 4,
    },
    habitMetaChip: {
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    habitMetaText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    timeInput: {
        width: 80,
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    createButton: {
        borderRadius: 16,
        padding: 18,
        alignItems: 'center',
    },
    createButtonDisabled: {
        opacity: 0.5,
    },
    createButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
    inlineBusyRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    inlineBusyLabel: {
        marginLeft: 8,
    },
    sidebarOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sidebarBackdrop: {
        flex: 1,
    },
    sidebarContainer: {
        width: '85%',
        height: '100%',
        padding: 24,
        paddingTop: 60,
        borderTopRightRadius: 32,
        borderBottomRightRadius: 32,
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        shadowColor: "#000",
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        zIndex: 20,
    },
    sidebarHeader: {
        marginBottom: 18,
    },
    sidebarHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 42,
    },
    sidebarAvatar: {
        width: 62,
        height: 62,
        borderRadius: 31,
        backgroundColor: '#D1FAE5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 1.5,
        overflow: 'hidden',
    },
    sidebarIdentity: {
        flex: 1,
    },
    sidebarName: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    sidebarSubtext: {
        marginTop: 2,
        fontSize: 12,
        fontWeight: '600',
    },
    closeSidebarButton: {
        position: 'absolute',
        top: 4,
        right: 0,
        padding: 8,
    },
    sidebarDivider: {
        height: 1,
        marginBottom: 24,
        opacity: 0.1,
    },
    sidebarItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 16,
        marginBottom: 8,
    },
    sidebarItemText: {
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 16,
    },
    sidebarScroll: {
        flex: 1,
    },
    sidebarScrollContent: {
        paddingBottom: 40,
    },
    quoteErrorWrap: {
        alignItems: 'flex-start',
    },
    quoteErrorText: {
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 20,
    },
    sidebarInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    sidebarInfoText: {
        marginLeft: 6,
        fontSize: 11,
        fontWeight: '600',
    },
});
