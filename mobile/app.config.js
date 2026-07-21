export default {
  expo: {
    name: 'DashLab',
    slug: 'dashlab',
    owner: process.env.EXPO_OWNER,
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'dark',
    android: {
      package: 'app.dashlab.mobile',
      permissions: ['INTERNET'],
      adaptiveIcon: { backgroundColor: '#0b1119' },
    },
    plugins: ['expo-secure-store'],
    extra: { eas: { projectId: process.env.EXPO_PROJECT_ID } },
  },
};
