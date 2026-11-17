# Build the debug APK

Needs JDK 21+ and the Android SDK (platform 36, build-tools). On Windows, from PowerShell:

```powershell
npm install
npm run build
npx cap sync android
Set-Content android\local.properties 'sdk.dir=C:/Users/<you>/AppData/Local/Android/Sdk' -Encoding ascii   # once; the file is git-ignored
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-22'
cd android; .\gradlew.bat assembleDebug
copy app\build\outputs\apk\debug\app-debug.apk ..\output\moth-light-debug.apk
```

- App id `com.mothlight.game`, name Moth Light, portrait only, immersive, screen kept on, padded by the camera cutout (`MainActivity.java`).
- Back button (`js/native.js`): closes menus, skips the trailer, pauses a run; on the menu or game-over screen it exits after two presses.
- Launcher icons come from `node tools/make-icons.mjs`.
- The debug APK is signed with the local debug key (`~/.android/debug.keystore`). A release build needs its own keystore, which must never be committed.
