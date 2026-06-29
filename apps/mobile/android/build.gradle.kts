allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    project.evaluationDependsOn(":app")
}

// Algunos plugins (file_picker, flutter_plugin_android_lifecycle…) fijan
// compileSdk = 34 en su propio módulo, lo que rompe el build cuando una
// dependencia exige API 36. Forzamos compileSdk = 36 en cada subproyecto
// Android EXCEPTO :app (que ya lo fija a 36 y, por evaluationDependsOn de
// arriba, se evalúa antes de tiempo: un afterEvaluate sobre él lanzaría
// "project already evaluated"). Vía reflexión para no acoplarnos a tipos
// internos de AGP que cambian entre versiones.
subprojects {
    if (project.path != ":app") {
        afterEvaluate {
            val androidExt = project.extensions.findByName("android") ?: return@afterEvaluate
            runCatching {
                // API nueva: propiedad `compileSdk` (Int) -> setCompileSdk(Integer)
                val setter = androidExt.javaClass.methods.firstOrNull {
                    it.name == "setCompileSdk" && it.parameterTypes.size == 1
                }
                if (setter != null) {
                    setter.invoke(androidExt, 36)
                } else {
                    // API antigua: compileSdkVersion(int)
                    androidExt.javaClass
                        .getMethod("compileSdkVersion", Int::class.javaPrimitiveType)
                        .invoke(androidExt, 36)
                }
            }
        }
    }
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
