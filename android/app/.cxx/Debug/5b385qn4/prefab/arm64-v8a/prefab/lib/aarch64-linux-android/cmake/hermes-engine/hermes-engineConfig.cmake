if(NOT TARGET hermes-engine::libhermes)
add_library(hermes-engine::libhermes SHARED IMPORTED)
set_target_properties(hermes-engine::libhermes PROPERTIES
    IMPORTED_LOCATION "/Users/tharakadushmantha/.gradle/caches/8.14.1/transforms/68814a1d81855daa94380a242eb48bca/transformed/hermes-android-0.75.4-debug/prefab/modules/libhermes/libs/android.arm64-v8a/libhermes.so"
    INTERFACE_INCLUDE_DIRECTORIES "/Users/tharakadushmantha/.gradle/caches/8.14.1/transforms/68814a1d81855daa94380a242eb48bca/transformed/hermes-android-0.75.4-debug/prefab/modules/libhermes/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

