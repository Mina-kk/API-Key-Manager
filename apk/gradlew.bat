@rem Gradle wrapper for API Key Manager Android project
@echo off
set DIR=%~dp0
set APP_HOME=%DIR%
set WRAPPER_JAR=%APP_HOME%\gradle\wrapper\gradle-wrapper.jar

if not exist "%WRAPPER_JAR%" (
    echo Gradle wrapper not found. Download it or use Android Studio.
    echo See: https://services.gradle.org/distributions/gradle-8.2-bin.zip
    pause
    exit /b 1
)

"%JAVA_HOME%/bin/java.exe" -jar "%WRAPPER_JAR%" %*
