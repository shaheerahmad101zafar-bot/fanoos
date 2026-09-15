$ErrorActionPreference = "Stop"
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

$sdk = "$env:LOCALAPPDATA\Android\Sdk"
$toolsZip = "$env:TEMP\cmdline-tools.zip"
$gradleZip = "$env:TEMP\gradle-8.7-bin.zip"
$gradleHome = "$env:LOCALAPPDATA\gradle-8.7-dist"
$sdkmanager = "$sdk\cmdline-tools\latest\bin\sdkmanager.bat"

New-Item -ItemType Directory -Force -Path $sdk | Out-Null

if (-not (Test-Path $sdkmanager)) {
  Write-Host "Downloading Android command-line tools..."
  curl.exe -L --retry 3 -o $toolsZip "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
  $extract = "$env:TEMP\cmdline-tools-extract"
  if (Test-Path $extract) { Remove-Item $extract -Recurse -Force }
  Expand-Archive $toolsZip $extract
  New-Item -ItemType Directory -Force -Path "$sdk\cmdline-tools\latest" | Out-Null
  $inner = Get-ChildItem $extract | Select-Object -First 1
  Copy-Item "$($inner.FullName)\*" "$sdk\cmdline-tools\latest" -Recurse -Force
}

if (-not (Test-Path "$gradleHome\gradle-8.7\bin\gradle.bat")) {
  Write-Host "Downloading Gradle 8.7..."
  curl.exe -L --retry 3 -o $gradleZip "https://services.gradle.org/distributions/gradle-8.7-bin.zip"
  New-Item -ItemType Directory -Force -Path $gradleHome | Out-Null
  Expand-Archive $gradleZip $gradleHome
}

Write-Host "Installing Android SDK packages..."
$licenses = cmd /c "echo y& echo y& echo y& echo y& echo y& echo y& echo y& echo y& echo y& echo y"
$licenses | & $sdkmanager --sdk_root=$sdk --licenses
& $sdkmanager --sdk_root=$sdk "platforms;android-34" "build-tools;34.0.0" "platform-tools"

$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk
Set-Location "C:\Users\ashah\Desktop\restuant store\fanoos\android-app"
Write-Host "Building Fanoos APK..."
& "$gradleHome\gradle-8.7\bin\gradle.bat" assembleRelease --no-daemon
if ($LASTEXITCODE -ne 0) { throw "Gradle assembleRelease failed" }

$apk = "C:\Users\ashah\Desktop\restuant store\fanoos\android-app\app\build\outputs\apk\release\app-release.apk"
Copy-Item $apk "C:\Users\ashah\Desktop\restuant store\fanoos\public\fanoos.apk" -Force
Write-Host "APK copied to public/fanoos.apk"
Get-Item "C:\Users\ashah\Desktop\restuant store\fanoos\public\fanoos.apk" | Format-List FullName, Length
