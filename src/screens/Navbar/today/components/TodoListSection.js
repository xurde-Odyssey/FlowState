import React, { useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function TodoListSection({
    styles,
    theme,
    todoItems,
    loadingTodos,
    todoError,
    onRetryLoadTodos,
    onAddTodo,
    onToggleTodo,
    onUpdateTodo,
    onDeleteTodo,
}) {
    const [draft, setDraft] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editingDraft, setEditingDraft] = useState('');

    const triggerTapFeedback = () => {
        Haptics.selectionAsync().catch(() => null);
    };

    const handleAdd = async () => {
        const saved = await onAddTodo(draft);
        if (saved) {
            setDraft('');
        }
    };

    const startEditing = (item) => {
        setEditingId(item.id);
        setEditingDraft(item.title);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditingDraft('');
    };

    const saveEditing = async () => {
        const saved = await onUpdateTodo(editingId, editingDraft);
        if (saved) {
            cancelEditing();
        }
    };

    const confirmDelete = (item) => {
        Alert.alert(
            'Delete Todo',
            `Are you sure you want to delete "${item.title}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        onDeleteTodo(item.id);
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderTextWrap}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Todo List</Text>
                    <Text style={[styles.sectionDescription, { color: theme.subText }]}>Quick one-time items for today</Text>
                </View>
                <Text style={[styles.todoCountBadge, { color: theme.primary, backgroundColor: theme.primary + '16' }]}>
                    {todoItems.filter((item) => !item.completed).length} open
                </Text>
            </View>

            <View style={[styles.todoComposer, { backgroundColor: theme.glassBackground, borderColor: theme.glassBorder, shadowColor: theme.shadow }]}>
                <TextInput
                    style={[styles.todoInput, { color: theme.text }]}
                    placeholder="Add a quick todo..."
                    placeholderTextColor={theme.subText}
                    value={draft}
                    onChangeText={setDraft}
                    returnKeyType="done"
                    onSubmitEditing={handleAdd}
                />
                <TouchableOpacity
                    onPress={() => {
                        triggerTapFeedback();
                        handleAdd();
                    }}
                    activeOpacity={0.85}
                    style={[styles.todoAddButton, { backgroundColor: theme.primary }]}
                    disabled={!draft.trim()}
                >
                    <Ionicons name="add" size={18} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            {loadingTodos ? (
                <View style={[styles.sectionStateCard, { borderColor: theme.border, backgroundColor: theme.glassBackground }]}>
                    <ActivityIndicator color={theme.primary} />
                    <Text style={[styles.sectionStateText, { color: theme.subText }]}>Loading todo list...</Text>
                </View>
            ) : null}

            {todoError ? (
                <View style={[styles.sectionStateCard, { borderColor: theme.danger + '66', backgroundColor: theme.glassBackground }]}>
                    <Text style={[styles.sectionStateText, { color: theme.danger }]}>{todoError}</Text>
                    <TouchableOpacity
                        style={[styles.inlineActionButton, { backgroundColor: theme.primary }]}
                        onPress={() => {
                            triggerTapFeedback();
                            onRetryLoadTodos();
                        }}
                    >
                        <Text style={styles.inlineActionText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : null}

            {!loadingTodos && !todoError && todoItems.length === 0 ? (
                <View style={[styles.todoEmptyCard, { backgroundColor: theme.glassBackground, borderColor: theme.glassBorder }]}>
                    <Text style={[styles.todoEmptyTitle, { color: theme.text }]}>Nothing pending</Text>
                    <Text style={[styles.todoEmptyText, { color: theme.subText }]}>Capture the small things you do not want to forget today.</Text>
                </View>
            ) : null}

            {!loadingTodos && !todoError && todoItems.map((item) => (
                <View
                    key={item.id}
                    style={[
                        styles.todoCard,
                        {
                            backgroundColor: theme.glassBackground,
                            borderColor: item.completed ? theme.success + '55' : theme.glassBorder,
                            shadowColor: theme.shadow,
                        },
                    ]}
                >
                    <TouchableOpacity
                        style={[
                            styles.todoCheckButton,
                            {
                                borderColor: item.completed ? theme.success : theme.border,
                                backgroundColor: item.completed ? theme.success : 'transparent',
                            },
                        ]}
                        activeOpacity={0.85}
                        onPress={() => {
                            triggerTapFeedback();
                            onToggleTodo(item.id);
                        }}
                    >
                        {item.completed ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                    </TouchableOpacity>

                    {editingId === item.id ? (
                        <>
                            <TextInput
                                style={[styles.todoEditInput, { color: theme.text }]}
                                value={editingDraft}
                                onChangeText={setEditingDraft}
                                autoFocus
                                returnKeyType="done"
                                onSubmitEditing={saveEditing}
                            />
                            <View style={styles.todoEditActions}>
                                <TouchableOpacity
                                    style={[styles.todoMiniAction, { backgroundColor: theme.primary + '18' }]}
                                    activeOpacity={0.8}
                                    onPress={() => {
                                        triggerTapFeedback();
                                        saveEditing();
                                    }}
                                    disabled={!editingDraft.trim()}
                                >
                                    <Ionicons name="checkmark" size={18} color={theme.primary} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.todoMiniAction, { backgroundColor: theme.input, borderColor: theme.border, borderWidth: 1 }]}
                                    activeOpacity={0.8}
                                    onPress={() => {
                                        triggerTapFeedback();
                                        cancelEditing();
                                    }}
                                >
                                    <Ionicons name="close" size={16} color={theme.subText} />
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        <>
                            <Text
                                style={[
                                    styles.todoTitle,
                                    {
                                        color: item.completed ? theme.subText : theme.text,
                                        textDecorationLine: item.completed ? 'line-through' : 'none',
                                    },
                                ]}
                            >
                                {item.title}
                            </Text>

                            <TouchableOpacity
                                style={styles.todoEditButton}
                                activeOpacity={0.8}
                                onPress={() => {
                                    triggerTapFeedback();
                                    startEditing(item);
                                }}
                            >
                                <Ionicons name="create-outline" size={18} color={theme.subText} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.todoDeleteButton}
                                activeOpacity={0.8}
                                onPress={() => {
                                    triggerTapFeedback();
                                    confirmDelete(item);
                                }}
                            >
                                <Ionicons name="trash-outline" size={18} color={theme.subText} />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            ))}
        </View>
    );
}
