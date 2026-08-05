/**
 * Shared build-version stamp.
 * Emits `version.json` into the build output and injects the same id into the
 * client bundle as `__APP_BUILD_ID__`, so the running app can detect that a
 * newer build has been deployed and refresh itself.
 */
export const BUILD_ID = String(Date.now());

export function versionPlugin() {
  return {
    name: "app-version-stamp",
    apply: "build",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ version: BUILD_ID }),
      });
    },
  };
}
