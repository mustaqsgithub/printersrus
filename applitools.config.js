module.exports = {
  testConcurrency: 5,
  appName: "PrintersRUs",
  batchName: "PrintersRUs Visual Tests",
  browser: [
    // Desktop
    { width: 1280, height: 800, name: "chrome" },
    { width: 1280, height: 800, name: "firefox" },
    { width: 1280, height: 800, name: "safari" },
    { width: 1280, height: 800, name: "edgechromium" },
    // Mobile
    { deviceName: "iPhone 13 Mini", screenOrientation: "portrait" },
    { deviceName: "Pixel 5", screenOrientation: "portrait" },
    { deviceName: "iPad", screenOrientation: "landscape" },
  ],
};
