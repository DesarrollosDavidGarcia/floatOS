import java.util.Properties

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
    // Firebase (FCM): procesa google-services.json.
    id("com.google.gms.google-services")
}

// Key de Google Maps leída desde local.properties (gitignored): nunca se versiona.
val localProperties = Properties()
val localPropertiesFile = rootProject.file("local.properties")
if (localPropertiesFile.exists()) {
    localPropertiesFile.inputStream().use { localProperties.load(it) }
}
val mapsApiKey: String = localProperties.getProperty("MAPS_API_KEY") ?: ""

// Firma de release desde key.properties (gitignored; fuera de git). Si el
// archivo no existe (dev / CI sin secretos) se cae a la firma de debug para que
// `flutter run --release` siga funcionando, pero un artefacto PUBLICABLE exige
// key.properties + keystore reales (ver android/README para el alta).
val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
val hayFirmaRelease = keystorePropertiesFile.exists()
if (hayFirmaRelease) {
    keystorePropertiesFile.inputStream().use { keystoreProperties.load(it) }
}

android {
    namespace = "mx.flotaos.flotaos_conductor"
    // Forzado a 36: plugins como file_picker / flutter_plugin_android_lifecycle
    // exigen compilar contra Android API 36 (el default de Flutter aún es 34).
    compileSdk = 36
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        // Requerido por flutter_local_notifications (usa java.time vía desugaring).
        isCoreLibraryDesugaringEnabled = true
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "mx.flotaos.flotaos_conductor"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName

        // Inyecta la key en AndroidManifest.xml como ${MAPS_API_KEY}.
        manifestPlaceholders["MAPS_API_KEY"] = mapsApiKey
    }

    signingConfigs {
        if (hayFirmaRelease) {
            create("release") {
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
                storeFile = keystoreProperties.getProperty("storeFile")?.let { file(it) }
                storePassword = keystoreProperties.getProperty("storePassword")
            }
        }
    }

    buildTypes {
        release {
            // Firma real si hay key.properties; si no, debug (solo para pruebas
            // locales, NO publicable). Habilitar Play App Signing en la consola.
            signingConfig = if (hayFirmaRelease) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug")
            }
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}

dependencies {
    // Desugaring de java.time para flutter_local_notifications.
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")
}
