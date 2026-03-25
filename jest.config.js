module.exports = {
  preset: 'jest-expo',
  testEnvironment: '@shopify/react-native-skia/jestEnv.js',
  setupFilesAfterEnv: [
    '@shopify/react-native-skia/jestSetup.js',
    '<rootDir>/jest.setup.ts',
  ],
  modulePathIgnorePatterns: ['<rootDir>/.worktrees/'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  testPathIgnorePatterns: ['<rootDir>/.worktrees/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(?:.pnpm/)?((jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|expo-router|@react-navigation/.*|react-native-svg|@shopify/react-native-skia))',
  ],
  watchPathIgnorePatterns: ['<rootDir>/.worktrees/'],
};
