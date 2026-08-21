---
name: Android build environment
description: Environment constraint affecting local Capacitor Android release builds
---

The workspace can run Gradle and download the Gradle distribution, but does not currently expose an Android SDK with the required platform and build tools to Gradle.

**Why:** The release build stopped at SDK discovery (`SDK location not found`) after the web build and Capacitor sync completed successfully.

**How to apply:** Before promising a new APK, verify `ANDROID_HOME` or `android/local.properties` points to an SDK containing the configured compile SDK and build tools. Do not relabel an older APK as a new release.