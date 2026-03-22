import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { storage } from '../utils/storage';
import CustomHeader from '../components/CustomHeader';
import { getFloatingTabBarStyle, TAB_BAR_ITEM_STYLE } from './tabBarStyles';

import TodayScreen from '../screens/Navbar/TodayScreen';
import StatsScreen from '../screens/Navbar/StatsScreen';
import LearningScreen from '../screens/Navbar/LearningScreen';
import ExploreScreen from '../screens/Navbar/ExploreScreen';
import FocusScreen from '../screens/Navbar/FocusScreen';
import SettingsScreen from '../screens/Navbar/SettingsScreen';
import NewsScreen from '../screens/Sidebar/NewsScreen';
import MarketScreen from '../screens/Sidebar/MarketScreen';
import TrendsScreen from '../screens/Sidebar/TrendsScreen';
import CryptoScreen from '../screens/Sidebar/CryptoScreen';

import TechScreen from '../screens/Sidebar/TechScreen';
import DecisionWheelScreen from '../screens/Sidebar/DecisionWheelScreen';
import OnboardingScreen from '../screens/OnboardingScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const TAB_META = {
    Today: { activeIcon: 'home', inactiveIcon: 'home-outline' },
    Stats: { activeIcon: 'stats-chart', inactiveIcon: 'stats-chart-outline' },
    Learning: { activeIcon: 'book', inactiveIcon: 'book-outline' },
    Explore: { activeIcon: 'compass', inactiveIcon: 'compass-outline' },
    Focus: { activeIcon: 'timer', inactiveIcon: 'timer-outline' },
};
const linking = {
    prefixes: ['habittracker://'],
    config: {
        screens: {
            DecisionWheel: 'decision-wheel',
        },
    },
};

function TabNavigator() {
    const { theme } = useTheme();

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                animationEnabled: true,
                tabBarIcon: ({ focused }) => {
                    const meta = TAB_META[route.name] || TAB_META.Today;
                    const iconName = focused ? meta.activeIcon : meta.inactiveIcon;
                    const iconColor = focused ? theme.primary : theme.inactiveTint;

                    return (
                        <View style={styles.iconSlot}>
                            <View
                                style={[
                                    styles.iconWrap,
                                    {
                                        width: focused ? 36 : 32,
                                        height: focused ? 36 : 32,
                                        borderRadius: focused ? 18 : 16,
                                        backgroundColor: focused ? theme.primary + '1C' : 'transparent',
                                        borderColor: focused ? theme.primary + '30' : 'transparent',
                                    },
                                ]}
                            >
                                <Ionicons
                                    name={iconName}
                                    size={focused ? 20 : 19}
                                    color={iconColor}
                                    style={{ opacity: focused ? 1 : 0.78 }}
                                />
                            </View>
                        </View>
                    );
                },
                tabBarActiveTintColor: theme.primary,
                tabBarInactiveTintColor: theme.inactiveTint,
                tabBarShowLabel: false,
                tabBarHideOnKeyboard: true,
                tabBarStyle: getFloatingTabBarStyle(theme),
                tabBarItemStyle: TAB_BAR_ITEM_STYLE,
            })}
        >
            <Tab.Screen name="Today" component={TodayScreen} />
            <Tab.Screen name="Stats" component={StatsScreen} />
            <Tab.Screen name="Learning" component={LearningScreen} />
            <Tab.Screen name="Explore" component={ExploreScreen} />
            <Tab.Screen name="Focus" component={FocusScreen} />
        </Tab.Navigator>
    );
}
export default function AppNavigator() {
    const [isAppReady, setIsAppReady] = React.useState(false);
    const [initialRoute, setInitialRoute] = React.useState('Onboarding');

    React.useEffect(() => {
        async function checkOnboarding() {
            try {
                const hasCompleted = await storage.getHasCompletedOnboarding();
                if (hasCompleted) {
                    setInitialRoute('MainTabs');
                }
            } catch (error) {
                console.error('Failed to check onboarding status', error);
            } finally {
                setIsAppReady(true);
            }
        }
        checkOnboarding();
    }, []);

    if (!isAppReady) {
        return null; // or a loading splash screen
    }

    return (
        <NavigationContainer linking={linking}>
            <Stack.Navigator
                initialRouteName={initialRoute}
                screenOptions={{
                    headerShown: false,
                }}
            >
                <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                <Stack.Screen name="MainTabs" component={TabNavigator} />

                {/* Sidebar Screens with Custom Header */}
                <Stack.Screen
                    name="News"
                    component={NewsScreen}
                    options={{
                        headerShown: true,
                        header: (props) => <CustomHeader {...props} />,
                        title: 'Global News'
                    }}
                />
                <Stack.Screen
                    name="Market"
                    component={MarketScreen}
                    options={{
                        headerShown: true,
                        header: (props) => <CustomHeader {...props} />,
                        title: 'Market Watch'
                    }}
                />
                <Stack.Screen
                    name="Trends"
                    component={TrendsScreen}
                    options={{
                        headerShown: true,
                        header: (props) => <CustomHeader {...props} />,
                        title: 'Trending'
                    }}
                />
                <Stack.Screen
                    name="Crypto"
                    component={CryptoScreen}
                    options={{
                        headerShown: true,
                        header: (props) => <CustomHeader {...props} />,
                        title: 'Crypto News'
                    }}
                />
                <Stack.Screen
                    name="Settings"
                    component={SettingsScreen}
                    options={{
                        headerShown: true,
                        header: (props) => <CustomHeader {...props} />,
                        title: 'Settings'
                    }}
                />
                <Stack.Screen
                    name="Tech"
                    component={TechScreen}
                    options={{
                        headerShown: true,
                        header: (props) => <CustomHeader {...props} />,
                        title: 'Tech Stuff'
                    }}
                />
                <Stack.Screen
                    name="DecisionWheel"
                    component={DecisionWheelScreen}
                    options={{
                        headerShown: true,
                        header: (props) => <CustomHeader {...props} />,
                        title: 'Decision Wheel'
                    }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    iconSlot: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconWrap: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
