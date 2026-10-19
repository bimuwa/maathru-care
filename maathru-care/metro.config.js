const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const { spawnSync } = require("node:child_process");

const config = getDefaultConfig(__dirname);

// Metro's recursive fallback watcher is very slow on Windows in large
// node_modules trees. Prefer Watchman when it is installed; keep Expo's
// standard watcher selection on machines that do not have it.
const watchmanCheck = spawnSync("watchman", ["version"], {
  stdio: "ignore",
  timeout: 2000,
});
if (watchmanCheck.status === 0) {
  config.resolver.useWatchman = true;
} else if (process.platform === "win32") {
  console.warn(
    "Watchman is not installed. Metro will use its slower Windows watcher; install Watchman with `choco install watchman` to avoid startup timeouts."
  );
}

module.exports = withNativeWind(config, {
  input: "./src/global.css",
  // Avoid patching Metro's internal file map API; write generated CSS modules
  // to disk so Metro can discover them through its normal file system path.
  forceWriteFileSystem: true,
});
