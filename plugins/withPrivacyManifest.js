const { withDangerousMod, withXcodeProject } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

/**
 * Expo config plugin to add PrivacyInfo.xcprivacy to the iOS project
 * @param {import('@expo/config-plugins').ExportedConfig} config
 * @returns {import('@expo/config-plugins').ExportedConfig}
 */
const withPrivacyManifest = (config) => {
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const iosProjectPath = config.modRequest.platformProjectRoot;
      const projectName = config.modRequest.projectName || 'tuberushv2';

      const sourceFile = path.join(projectRoot, 'support-files', 'ios', 'PrivacyInfo.xcprivacy');
      const targetFile = path.join(iosProjectPath, projectName, 'PrivacyInfo.xcprivacy');

      if (fs.existsSync(sourceFile)) {
        fs.mkdirSync(path.dirname(targetFile), { recursive: true });
        fs.copyFileSync(sourceFile, targetFile);
        console.log('✅ Copied PrivacyInfo.xcprivacy to iOS project');
      } else {
        console.warn('⚠️  PrivacyInfo.xcprivacy not found in support-files/ios/ directory');
      }

      return config;
    },
  ]);

  config = withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    const projectName = config.modRequest.projectName || 'tuberushv2';
    const privacyManifestPath = `${projectName}/PrivacyInfo.xcprivacy`;

    try {
      if (!xcodeProject.hasFile(privacyManifestPath)) {
        const groupKey = xcodeProject.findPBXGroupKey({ name: projectName });
        const { uuid: fileUuid } = xcodeProject.addFile(
          privacyManifestPath,
          groupKey,
          {
            lastKnownFileType: 'text.plist.xml',
            defaultEncoding: 4
          }
        );

        if (fileUuid) {
          xcodeProject.addToPbxBuildFileSection(fileUuid);
          xcodeProject.addToPbxResourcesBuildPhase(fileUuid);
          console.log('✅ Added PrivacyInfo.xcprivacy to Xcode project');
        }
      }
    } catch (error) {
      console.warn('⚠️  Could not add PrivacyInfo.xcprivacy to Xcode project:', error.message);
      console.warn('   The file will be copied but may need to be added manually to Xcode.');
    }

    return config;
  });

  return config;
};

module.exports = withPrivacyManifest;
