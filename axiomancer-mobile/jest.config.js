/** @type {import('jest').Config} */
module.exports = {
    preset: 'jest-expo',
    setupFilesAfterEnv: ['./jest.setup.ts'],
    transformIgnorePatterns: [
        // `\\.pnpm` keeps the pnpm content-addressed store transformable;
        // without it, regex matches the first `node_modules/` segment
        // against `.pnpm` and silently ignores every transitive ESM file
        // (jest-expo's own preset includes this alternation for the
        // same reason). The remaining alternations are the historical
        // project-specific allowlist.
        // axiomancer-mechanics is sibling source now (mapped below), not a
        // node_modules dep; sibling source is transformed by default.
        'node_modules/(?!(\\.pnpm|' +
            'expo|expo-.*|@expo/.*|@expo-google-fonts/.*|' +
            'react-native|react-native-.*|@react-native/.*|' +
            'react-native-reanimated|' +
            '@react-navigation/.*' +
            ')/)',
    ],
    moduleNameMapper: {
        '^@mechanics$': '<rootDir>/../axiomancer-mechanics/src/index.ts',
        '^@mechanics/(.*)$': '<rootDir>/../axiomancer-mechanics/src/$1',
        '^@/(.*)$': '<rootDir>/$1',
    },
    testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
};
