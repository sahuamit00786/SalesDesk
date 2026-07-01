@echo off
set JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot
set ANDROID_HOME=C:\Users\sahua\AppData\Local\Android\Sdk
set PATH=%PATH%;C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot\bin;C:\Users\sahua\AppData\Local\Android\Sdk\platform-tools;C:\Users\sahua\Downloads\Connexify\ConnexifyNative\android
cd /d "C:\Users\sahua\Downloads\Connexify\ConnexifyNative"
npx react-native start --reset-cache