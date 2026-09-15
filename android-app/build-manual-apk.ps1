$ErrorActionPreference = "Stop"
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

$root = "C:\Users\ashah\Desktop\restuant store\fanoos"
$src = "$root\android-app\app\src\main"
$sdk = "$env:LOCALAPPDATA\Android\Sdk"
$bt = "$sdk\build-tools\34.0.0"
$androidJar = "$sdk\platforms\android-34\android.jar"
$out = "$root\android-app\manual-build"
$obj = "$out\obj"
$gen = "$out\gen"
$classes = "$out\classes"
$resZip = "$out\res.zip"

if (Test-Path $out) { Remove-Item $out -Recurse -Force }
New-Item -ItemType Directory -Force -Path $obj, $gen, $classes | Out-Null

Write-Host "Compiling resources..."
& "$bt\aapt2.exe" compile --dir "$src\res" -o $resZip
if ($LASTEXITCODE -ne 0) { throw "aapt2 compile failed" }

Write-Host "Linking APK..."
& "$bt\aapt2.exe" link `
  -o "$out\unsigned.apk" `
  -I $androidJar `
  --manifest "$src\AndroidManifest.xml" `
  --java $gen `
  --auto-add-overlay `
  --min-sdk-version 24 `
  --target-sdk-version 34 `
  --version-code 6 `
  --version-name "1.5" `
  --replace-version `
  $resZip
if ($LASTEXITCODE -ne 0) { throw "aapt2 link failed" }

$javaFiles = @(
  (Get-ChildItem $gen -Recurse -Filter *.java | ForEach-Object { $_.FullName }),
  "$src\java\app\fanoos\pos\MainActivity.java"
)

Write-Host "Compiling Java..."
& javac --release 11 -encoding UTF-8 -cp $androidJar -d $classes @javaFiles
if ($LASTEXITCODE -ne 0) { throw "javac failed" }

$classFiles = Get-ChildItem $classes -Recurse -Filter *.class | ForEach-Object { $_.FullName }
Write-Host "Dexing..."
& "$bt\d8.bat" --lib $androidJar --min-api 24 --output $out @classFiles
if ($LASTEXITCODE -ne 0) { throw "d8 failed" }

Write-Host "Adding classes.dex..."
Push-Location $out
try {
  & "$bt\aapt.exe" add unsigned.apk classes.dex
  if ($LASTEXITCODE -ne 0) { throw "aapt add failed" }
} finally {
  Pop-Location
}

Write-Host "Aligning..."
& "$bt\zipalign.exe" -f -p 4 "$out\unsigned.apk" "$out\aligned.apk"
if ($LASTEXITCODE -ne 0) { throw "zipalign failed" }

$keystore = "$out\debug.keystore"
Write-Host "Creating debug keystore..."
& keytool -genkeypair -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 `
  -keystore $keystore -storepass android -keypass android `
  -dname "CN=Android Debug,O=Android,C=US" -noprompt
if ($LASTEXITCODE -ne 0) { throw "keytool failed" }

Write-Host "Signing..."
& "$bt\apksigner.bat" sign --ks $keystore --ks-pass pass:android --key-pass pass:android `
  --ks-key-alias androiddebugkey --out "$out\fanoos.apk" "$out\aligned.apk"
if ($LASTEXITCODE -ne 0) { throw "apksigner failed" }

& "$bt\apksigner.bat" verify --verbose "$out\fanoos.apk"
Copy-Item "$out\fanoos.apk" "$root\public\fanoos.apk" -Force
Get-Item "$root\public\fanoos.apk" | Format-List FullName, Length
Write-Host "APK ready"
