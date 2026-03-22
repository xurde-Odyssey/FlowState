import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Image,
    Easing,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useTheme } from '../../context/ThemeContext';
import LottieView from '../../components/LottieCompat';

const STORAGE_KEY = '@decision_wheel_options_v1';
const BASE_ROTATION = 5 * 360;
const SPIN_DURATION_MS = 4200;
const SOFT_PRIMARY_COLORS = ['#E50027', '#3C6AD9', '#F1B70A', '#05A52A'];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const randomColor = () => {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 75%, 56%)`;
};

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createOption = (label, color = randomColor()) => ({
    id: createId(),
    label: String(label || '').trim() || 'Option',
    color,
});

const applyPaletteColors = (items) =>
    items.map((item, index) => ({
        ...item,
        color: SOFT_PRIMARY_COLORS[index % SOFT_PRIMARY_COLORS.length],
    }));

const normalizeSavedOptions = (payload) => {
    if (!Array.isArray(payload)) {
        return [];
    }

    const normalized = payload
        .map((item) => {
            if (typeof item === 'string') {
                return createOption(item);
            }
            return createOption(item?.label, item?.color || randomColor());
        })
        .filter((item) => Boolean(item.label));

    return applyPaletteColors(normalized);
};

const optionsToText = (options) => options.map((option) => option.label).join('\n');

const textToOptions = (text, previous) => {
    const existingByLabel = new Map(
        previous.map((option) => [option.label.trim().toLowerCase(), option])
    );
    const unique = new Set();

    return text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => {
            const key = line.toLowerCase();
            if (unique.has(key)) {
                return false;
            }
            unique.add(key);
            return true;
        })
        .map((line) => {
            const existing = existingByLabel.get(line.toLowerCase());
            return existing ? { ...existing, label: line } : createOption(line);
        });
};

const shuffleArray = (items) => {
    const next = [...items];
    for (let index = next.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        const temp = next[index];
        next[index] = next[swapIndex];
        next[swapIndex] = temp;
    }
    return next;
};

const polarToCartesian = (cx, cy, r, angleDeg) => {
    const angleRad = (Math.PI / 180) * angleDeg;
    return {
        x: cx + r * Math.cos(angleRad),
        y: cy + r * Math.sin(angleRad),
    };
};

const buildArcPath = (cx, cy, outerR, innerR, startAngle, endAngle) => {
    const startOuter = polarToCartesian(cx, cy, outerR, startAngle);
    const endOuter = polarToCartesian(cx, cy, outerR, endAngle);
    const startInner = polarToCartesian(cx, cy, innerR, endAngle);
    const endInner = polarToCartesian(cx, cy, innerR, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

    return [
        `M ${startOuter.x} ${startOuter.y}`,
        `A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${endOuter.x} ${endOuter.y}`,
        `L ${startInner.x} ${startInner.y}`,
        `A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${endInner.x} ${endInner.y}`,
        'Z',
    ].join(' ');
};

export default function DecisionWheelScreen() {
    const { theme } = useTheme();
    const { width, height } = useWindowDimensions();

    const wheelSize = clamp(Math.floor(Math.min(width, height) * 0.7), 240, 360);
    const radius = wheelSize / 2;
    const innerRadius = 11;
    const labelRadius = Math.max(82, Math.floor(radius * 0.66));
    const entriesBoxHeight = clamp(Math.floor(height * 0.13), 78, 104);

    const [isLoading, setIsLoading] = useState(true);
    const [options, setOptions] = useState([]);
    const [entriesText, setEntriesText] = useState('');

    const [isSpinning, setIsSpinning] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [winnerModalVisible, setWinnerModalVisible] = useState(false);
    const [winnerLabel, setWinnerLabel] = useState('');
    const [winnerOptionId, setWinnerOptionId] = useState(null);

    const spinValue = useRef(new Animated.Value(0)).current;
    const totalRotationRef = useRef(0);
    const soundRef = useRef(null);
    const spinSoundRef = useRef(null);
    const scrollRef = useRef(null);

    const segmentAngle = useMemo(() => (options.length > 0 ? 360 / options.length : 360), [options.length]);
    const wheelRotate = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '1deg'],
    });

    useEffect(() => {
        const loadState = async () => {
            try {
                const raw = await AsyncStorage.getItem(STORAGE_KEY);
                const parsed = raw ? JSON.parse(raw) : null;
                const normalized = normalizeSavedOptions(parsed?.options);
                setOptions(normalized);
                setEntriesText(optionsToText(normalized));
            } catch (error) {
                setOptions([]);
                setEntriesText('');
            } finally {
                setIsLoading(false);
            }
        };

        loadState();
    }, []);

    useEffect(() => {
        if (isLoading) {
            return;
        }
        AsyncStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                options,
            })
        ).catch(() => null);
    }, [isLoading, options]);

    useEffect(() => {
        const setupSound = async () => {
            try {
                const { sound } = await Audio.Sound.createAsync(require('../../Alarm/crowd cheer.mp3'));
                const { sound: spinSound } = await Audio.Sound.createAsync(require('../../Alarm/wheel spin.mp3'), {
                    isLooping: true,
                    volume: 0.35,
                });
                soundRef.current = sound;
                spinSoundRef.current = spinSound;
            } catch (error) {
                soundRef.current = null;
                spinSoundRef.current = null;
            }
        };

        setupSound();

        return () => {
            if (soundRef.current) {
                soundRef.current.unloadAsync().catch(() => null);
                soundRef.current = null;
            }
            if (spinSoundRef.current) {
                spinSoundRef.current.unloadAsync().catch(() => null);
                spinSoundRef.current = null;
            }
        };
    }, []);

    const playResultSound = async () => {
        if (!soundRef.current) {
            return;
        }
        try {
            await soundRef.current.stopAsync();
            await soundRef.current.setPositionAsync(0);
            await soundRef.current.setIsLoopingAsync(true);
            await soundRef.current.playAsync();
        } catch (error) {
            // non-blocking
        }
    };

    const stopResultSound = async () => {
        if (!soundRef.current) {
            return;
        }
        try {
            await soundRef.current.stopAsync();
            await soundRef.current.setPositionAsync(0);
            await soundRef.current.setIsLoopingAsync(false);
        } catch (error) {
            // non-blocking
        }
    };

    const startSpinSound = async () => {
        if (!spinSoundRef.current) {
            return;
        }
        try {
            await spinSoundRef.current.stopAsync();
            await spinSoundRef.current.setPositionAsync(0);
            await spinSoundRef.current.playAsync();
        } catch (error) {
            // non-blocking
        }
    };

    const stopSpinSound = async () => {
        if (!spinSoundRef.current) {
            return;
        }
        try {
            await spinSoundRef.current.stopAsync();
            await spinSoundRef.current.setPositionAsync(0);
        } catch (error) {
            // non-blocking
        }
    };

    const onChangeEntries = (text) => {
        setEntriesText(text);
        setOptions((previous) => applyPaletteColors(textToOptions(text, previous)));
    };

    const handleShuffle = () => {
        if (isSpinning || options.length < 2) {
            return;
        }
        setOptions((previous) => {
            const shuffled = applyPaletteColors(shuffleArray(previous));
            setEntriesText(optionsToText(shuffled));
            return shuffled;
        });
    };

    const handleClearEntries = () => {
        if (isSpinning) {
            return;
        }
        setEntriesText('');
        setOptions([]);
    };

    const closeWinnerModal = () => {
        stopResultSound();
        setWinnerModalVisible(false);
        setWinnerOptionId(null);
        setWinnerLabel('');
    };

    const removeWinnerOption = () => {
        if (!winnerOptionId) {
            closeWinnerModal();
            return;
        }
        setOptions((previous) => {
            const next = applyPaletteColors(previous.filter((option) => option.id !== winnerOptionId));
            setEntriesText(optionsToText(next));
            return next;
        });
        closeWinnerModal();
    };

    const spinWheel = () => {
        if (isSpinning) {
            return;
        }
        if (options.length < 2) {
            Alert.alert('Need more options', 'Add at least 2 options to spin the wheel.');
            return;
        }

        const winnerIndex = Math.floor(Math.random() * options.length);
        // Pointer is on the right side (0deg). Align selected segment center to 0deg.
        const desiredNormalized = (90 - ((winnerIndex + 0.5) * segmentAngle) + 360) % 360;
        const currentNormalized = ((totalRotationRef.current % 360) + 360) % 360;
        const deltaNormalized = (desiredNormalized - currentNormalized + 360) % 360;
        const totalDelta = BASE_ROTATION + deltaNormalized;
        const nextRotation = totalRotationRef.current + totalDelta;

        setIsSpinning(true);
        startSpinSound();

        Animated.timing(spinValue, {
            toValue: nextRotation,
            duration: SPIN_DURATION_MS,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start(async ({ finished }) => {
            if (!finished) {
                await stopSpinSound();
                setIsSpinning(false);
                return;
            }

            totalRotationRef.current = nextRotation;
            const winner = options[winnerIndex];
            const winnerText = winner?.label || 'No result';
            setShowConfetti(true);
            await stopSpinSound();
            await playResultSound();
            setWinnerLabel(winnerText);
            setWinnerOptionId(winner?.id || null);
            setWinnerModalVisible(true);
            setIsSpinning(false);
        });
    };

    if (isLoading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
                <Text style={[styles.loadingText, { color: theme.subText }]}>Loading Decision Wheel...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 86 : 24}
        >
            <ScrollView
                ref={scrollRef}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={[styles.topRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.topLabel, { color: theme.text }]}>Tap to spin</Text>
                    <View style={[styles.topPill, { backgroundColor: theme.input, borderColor: theme.border }]}>
                        <Text style={[styles.topPillText, { color: theme.subText }]}>Pointer decides winner</Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={[
                        styles.wheelCard,
                        {
                            width: wheelSize,
                            height: wheelSize,
                            borderRadius: wheelSize / 2,
                        },
                    ]}
                    onPress={spinWheel}
                    disabled={isSpinning}
                    activeOpacity={0.9}
                >
                    <Image
                        source={require('../../../assets/wheel-pointer.png')}
                        style={styles.pointerImage}
                        resizeMode="contain"
                    />
                    <Animated.View style={[styles.wheelInner, { transform: [{ rotate: wheelRotate }] }]}>
                        <Svg width={wheelSize} height={wheelSize}>
                            <G>
                                {options.length === 0 ? (
                                    <>
                                        <Circle
                                            cx={radius}
                                            cy={radius}
                                            r={radius - 3}
                                            fill="#F7EFD8"
                                            stroke={theme.card}
                                            strokeWidth={2}
                                        />
                                        <Circle
                                            cx={radius}
                                            cy={radius}
                                            r={innerRadius}
                                            fill={theme.background}
                                        />
                                    </>
                                ) : (
                                    options.map((option, index) => {
                                        const startAngle = index * segmentAngle - 90;
                                        const endAngle = (index + 1) * segmentAngle - 90;
                                        const midAngle = startAngle + segmentAngle / 2;
                                        const path = buildArcPath(radius, radius, radius - 3, innerRadius, startAngle, endAngle);
                                        const labelPos = polarToCartesian(radius, radius, labelRadius, midAngle);
                                        const maxLen = options.length > 8 ? 8 : 12;
                                        const label = option.label.length > maxLen ? `${option.label.slice(0, maxLen)}...` : option.label;

                                        return (
                                            <G key={option.id}>
                                                <Path d={path} fill={option.color} stroke={theme.card} strokeWidth={2} />
                                                <SvgText
                                                    x={labelPos.x}
                                                    y={labelPos.y}
                                                    fill="#FFFFFF"
                                                    fontSize={options.length > 8 ? '10' : '12'}
                                                    fontWeight="700"
                                                    textAnchor="middle"
                                                    alignmentBaseline="middle"
                                                >
                                                    {label}
                                                </SvgText>
                                            </G>
                                        );
                                    })
                                )}
                            </G>
                        </Svg>
                    </Animated.View>
                    <View style={styles.centerHubDot} />
                </TouchableOpacity>

                <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.entriesHeaderRow}>
                        <Text style={[styles.entriesLabel, { color: theme.text }]}>Entries</Text>
                        <View style={[styles.entriesCountPill, { backgroundColor: theme.primary }]}>
                            <Text style={styles.entriesCountText}>{options.length}</Text>
                        </View>
                    </View>
                    <View style={styles.controlRow}>
                        <TouchableOpacity style={[styles.controlButton, { backgroundColor: '#4a68d4' }]} onPress={handleShuffle} disabled={isSpinning}>
                            <Ionicons name="shuffle" size={14} color="#FFFFFF" />
                            <Text style={styles.controlButtonText}>Shuffle</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.controlButton, styles.clearButton]}
                            onPress={handleClearEntries}
                            disabled={isSpinning}
                        >
                            <Ionicons name="trash-outline" size={14} color="#FFFFFF" />
                            <Text style={styles.controlButtonText}>Clear text box</Text>
                        </TouchableOpacity>
                    </View>

                    <TextInput
                        style={[
                            styles.textArea,
                            { color: theme.text, borderColor: '#d9a355', backgroundColor: theme.input, minHeight: entriesBoxHeight },
                        ]}
                        multiline
                        value={entriesText}
                        onChangeText={onChangeEntries}
                        editable={!isSpinning}
                        placeholder={'Add\nwhat\nto\ndecide'}
                        placeholderTextColor={theme.subText}
                        textAlignVertical="top"
                        onFocus={() => {
                            setTimeout(() => {
                                if (scrollRef.current) {
                                    scrollRef.current.scrollToEnd({ animated: true });
                                }
                            }, 120);
                        }}
                    />

                </View>
            </ScrollView>

            {showConfetti ? (
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
            ) : null}

            <Modal
                visible={winnerModalVisible}
                transparent
                animationType="fade"
                onRequestClose={closeWinnerModal}
            >
                <View style={styles.winnerOverlay}>
                    <View style={styles.winnerCard}>
                        <View style={styles.winnerHeader}>
                            <Text style={styles.winnerHeaderText}>We have a winner!</Text>
                        </View>
                        <View style={styles.winnerBody}>
                            <Text style={styles.winnerValue} numberOfLines={2}>
                                {winnerLabel}
                            </Text>
                            <View style={styles.winnerActions}>
                                <TouchableOpacity onPress={closeWinnerModal} style={styles.closeAction}>
                                    <Text style={styles.closeActionText}>Close</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={removeWinnerOption} style={styles.removeAction}>
                                    <Text style={styles.removeActionText}>Remove</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        fontSize: 14,
        fontWeight: '700',
    },
    container: {
        flex: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    scrollContent: {
        paddingBottom: 16,
    },
    topRow: {
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 9,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    topLabel: {
        fontSize: 18,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    topPill: {
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    topPillText: {
        fontSize: 11,
        fontWeight: '700',
    },
    wheelCard: {
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        overflow: 'visible',
    },
    wheelInner: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    pointerImage: {
        position: 'absolute',
        right: -50,
        top: '50%',
        marginTop: -30,
        width: 78,
        height: 60,
        zIndex: 6,
        transform: [{ rotate: '90deg' }],
    },
    centerHubDot: {
        position: 'absolute',
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#111111',
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
        top: '50%',
        alignSelf: 'center',
        marginTop: -6,
    },
    panel: {
        borderWidth: 1.5,
        borderRadius: 14,
        padding: 8,
        marginBottom: 4,
    },
    entriesHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    entriesLabel: {
        fontSize: 14,
        fontWeight: '800',
    },
    entriesCountPill: {
        minWidth: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    entriesCountText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '900',
    },
    controlRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 6,
    },
    controlButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 999,
        gap: 4,
    },
    controlButtonText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '800',
    },
    clearButton: {
        backgroundColor: '#cc3b3b',
    },
    textArea: {
        borderWidth: 2,
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 6,
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '700',
    },
    winnerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
    },
    winnerCard: {
        width: '100%',
        maxWidth: 285,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#f3f4f6',
    },
    winnerHeader: {
        backgroundColor: '#cb2c31',
        paddingVertical: 8,
        paddingHorizontal: 10,
    },
    winnerHeaderText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '900',
    },
    winnerBody: {
        paddingHorizontal: 10,
        paddingTop: 10,
        paddingBottom: 8,
    },
    winnerValue: {
        textAlign: 'center',
        color: '#3f3f3f',
        fontSize: 26,
        lineHeight: 31,
        fontWeight: '500',
        marginBottom: 8,
    },
    winnerActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 6,
    },
    closeAction: {
        borderWidth: 1,
        borderColor: '#d0d4da',
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    closeActionText: {
        color: '#2f2f2f',
        fontSize: 14,
        fontWeight: '700',
    },
    removeAction: {
        backgroundColor: '#637ad8',
        borderRadius: 6,
        paddingHorizontal: 11,
        paddingVertical: 6,
    },
    removeActionText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
    },
});
