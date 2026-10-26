/**
 * @jest-environment node
 */

import { existsSync, statSync } from 'fs';
import { join } from 'path';
import appConfig from '../app.json';

describe('Store Submission Requirements', () => {
  const projectRoot = join(__dirname, '..');

  describe('EAS Configuration', () => {
    test('eas.json has production profiles for both platforms', () => {
      const easConfigPath = join(projectRoot, 'eas.json');
      expect(existsSync(easConfigPath)).toBe(true);

      const easConfig = require(easConfigPath);
      
      expect(easConfig.build.production).toBeDefined();
      expect(easConfig.build.production.ios).toBeDefined();
      expect(easConfig.build.production.android).toBeDefined();
      
      // iOS production config
      expect(easConfig.build.production.ios.distribution).toBe('store');
      expect(easConfig.build.production.ios.autoIncrement).toBe('buildNumber');
      
      // Android production config  
      expect(easConfig.build.production.android.distribution).toBe('store');
      expect(easConfig.build.production.android.autoIncrement).toBe('versionCode');
      expect(easConfig.build.production.android.buildType).toBe('app-bundle');
    });
  });

  describe('App Configuration', () => {
    test('app.json has required production fields', () => {
      const { expo } = appConfig;
      
      expect(expo.name).toBe('Miserere Mei, Deus'); // launcher label; slug stays frozen
      expect(expo.slug).toBe('axiomancer-mobile');
      expect(expo.version).toMatch(/^\d+\.\d+\.\d+$/); // Semantic versioning
      expect(expo.orientation).toBe('portrait');
      
      // iOS configuration
      expect(expo.ios).toBeDefined();
      expect(expo.ios.supportsTablet).toBe(false); // iPhone only (IO1)
      
      // Android configuration
      expect(expo.android).toBeDefined();
      expect(expo.android.package).toBe('com.axiomancer.mobile');
      expect(expo.android.adaptiveIcon).toBeDefined();
      
      // Required for production
      expect(expo.extra?.eas?.projectId).toBeDefined();
      expect(expo.owner).toBe('no.trbl.2.u');
    });

    test('app icons are configured correctly', () => {
      const { expo } = appConfig;
      
      // Main icon
      expect(expo.icon).toBe('./assets/images/icon.png');
      
      // Web favicon
      expect(expo.web?.favicon).toBe('./assets/images/favicon.png');
      
      // Android adaptive icon (sources from the user-supplied
      // resource tree under assets/images/android/res/; EAS
      // regenerates per-density mipmaps from these xxxhdpi layers).
      const { adaptiveIcon } = expo.android;
      expect(adaptiveIcon.backgroundColor).toBe('#0a0a0a');
      expect(adaptiveIcon.foregroundImage).toBe('./assets/images/android/res/mipmap-xxxhdpi/ic_launcher_foreground.png');
      expect(adaptiveIcon.backgroundImage).toBe('./assets/images/android/res/mipmap-xxxhdpi/ic_launcher_background.png');
      expect(adaptiveIcon.monochromeImage).toBe('./assets/images/android/res/mipmap-xxxhdpi/ic_launcher_monochrome.png');
    });

    test('splash screen is configured correctly', () => {
      const { expo } = appConfig;
      const splashPlugin = expo.plugins.find(plugin => 
        Array.isArray(plugin) && plugin[0] === 'expo-splash-screen'
      );
      
      expect(splashPlugin).toBeDefined();
      const [, splashConfig] = splashPlugin;
      
      expect(splashConfig.image).toBe('./assets/images/splash-icon.png');
      expect(splashConfig.imageWidth).toBe(180);
      expect(splashConfig.resizeMode).toBe('contain');
      expect(splashConfig.backgroundColor).toBe('#0a0a0a');
      expect(splashConfig.dark?.backgroundColor).toBe('#0a0a0a');
    });
  });

  describe('Required Assets', () => {
    const assetsDir = join(projectRoot, 'assets', 'images');
    
    test('app icons exist with correct naming', () => {
      const requiredIcons = [
        'icon.png',                                                       // iOS 1024x1024
        'android/res/mipmap-xxxhdpi/ic_launcher_foreground.png',          // Android adaptive foreground (xxxhdpi source)
        'android/res/mipmap-xxxhdpi/ic_launcher_background.png',          // Android adaptive background (xxxhdpi source)
        'android/res/mipmap-xxxhdpi/ic_launcher_monochrome.png',          // Android monochrome (xxxhdpi source)
        'favicon.png',                                                    // Web 192x192
        'splash-icon.png'                                                 // Splash screen logo
      ];

      requiredIcons.forEach(iconFile => {
        const iconPath = join(assetsDir, iconFile);
        expect(existsSync(iconPath)).toBe(true);
        
        // Verify file is not empty
        const stats = statSync(iconPath);
        expect(stats.size).toBeGreaterThan(0);
      });
    });
  });

  describe('Store Assets', () => {
    const storeAssetsDir = join(projectRoot, 'store-assets');

    test('store assets directory structure exists', () => {
      expect(existsSync(storeAssetsDir)).toBe(true);
      expect(existsSync(join(storeAssetsDir, 'ios', 'screenshots'))).toBe(true);
      expect(existsSync(join(storeAssetsDir, 'android', 'screenshots'))).toBe(true);
      expect(existsSync(join(storeAssetsDir, 'metadata'))).toBe(true);
    });

    test('required metadata files exist', () => {
      const metadataDir = join(storeAssetsDir, 'metadata');
      const requiredFiles = [
        'app-description.md',
        'privacy-policy.md'
      ];

      requiredFiles.forEach(file => {
        const filePath = join(metadataDir, file);
        expect(existsSync(filePath)).toBe(true);
        
        // Verify file has content
        const stats = statSync(filePath);
        expect(stats.size).toBeGreaterThan(0);
      });
    });

    test('screenshot README files exist', () => {
      expect(existsSync(join(storeAssetsDir, 'ios', 'screenshots', 'README.md'))).toBe(true);
      expect(existsSync(join(storeAssetsDir, 'android', 'screenshots', 'README.md'))).toBe(true);
    });
  });

  describe('Documentation', () => {
    const docsDir = join(projectRoot, 'docs');
    const setupDir = join(projectRoot, 'setup');

    test('testing and store documentation exists', () => {
      expect(existsSync(join(docsDir, 'testing-guide.md'))).toBe(true);
      expect(existsSync(join(docsDir, 'store-submission-checklist.md'))).toBe(true);
      expect(existsSync(join(setupDir, '03_store_setup.md'))).toBe(true);
    });
  });

  describe('Production Readiness', () => {
    test('no debug artifacts in app.json', () => {
      const { expo } = appConfig;
      const appString = JSON.stringify(expo);
      
      // Check for common debug patterns
      expect(appString).not.toMatch(/localhost/i);
      expect(appString).not.toMatch(/127\.0\.0\.1/);
      expect(appString).not.toMatch(/\.local/i);
      expect(appString).not.toMatch(/debug/i);
      expect(appString).not.toMatch(/development/i);
    });

    test('required plugins are configured', () => {
      const { expo } = appConfig;
      const pluginNames = expo.plugins.map(plugin => 
        Array.isArray(plugin) ? plugin[0] : plugin
      );
      
      expect(pluginNames).toContain('expo-router');
      expect(pluginNames).toContain('expo-splash-screen');
      expect(pluginNames).toContain('expo-navigation-bar');
    });

    test('experiments and features are production-ready', () => {
      const { expo } = appConfig;
      
      // Ensure experimental features are stable for production
      expect(expo.experiments?.typedRoutes).toBe(true);
      expect(expo.newArchEnabled).toBe(true);
      
      // Android edge-to-edge should be enabled for modern experience
      expect(expo.android?.edgeToEdgeEnabled).toBe(true);
    });
  });
});

describe('Store Policy Compliance', () => {
  test('app metadata indicates appropriate content rating', () => {
    const descriptionPath = join(__dirname, '..', 'store-assets', 'metadata', 'app-description.md');
    const description = require('fs').readFileSync(descriptionPath, 'utf8');
    
    // Should mention it's a game
    expect(description.toLowerCase()).toMatch(/game|gaming|rpg|role.playing/);
    
    // Should not contain restricted content indicators
    expect(description.toLowerCase()).not.toMatch(/gambling|casino|adult|mature/);
    
    // Should indicate offline nature
    expect(description.toLowerCase()).toMatch(/offline|local|no.*internet/);
  });

  test('privacy policy reflects local-only architecture', () => {
    const policyPath = join(__dirname, '..', 'store-assets', 'metadata', 'privacy-policy.md');
    const policy = require('fs').readFileSync(policyPath, 'utf8');
    
    // Should clearly state no data collection
    expect(policy.toLowerCase()).toMatch(/no.*collect|does not collect/);
    expect(policy.toLowerCase()).toMatch(/local.*only|locally.*stored/);
    // Should not suggest data is sent to external services
    expect(policy.toLowerCase()).not.toMatch(/server|upload.*to|send.*to/);
  });
});