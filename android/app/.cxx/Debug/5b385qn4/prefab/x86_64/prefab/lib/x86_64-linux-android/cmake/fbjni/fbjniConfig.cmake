if(NOT TARGET fbjni::fbjni)
add_library(fbjni::fbjni SHARED IMPORTED)
set_target_properties(fbjni::fbjni PROPERTIES
    IMPORTED_LOCATION "/Users/tharakadushmantha/.gradle/caches/8.14.1/transforms/97d17fce626a14ac6fec1ee0fea1b643/transformed/fbjni-0.6.0/prefab/modules/fbjni/libs/android.x86_64/libfbjni.so"
    INTERFACE_INCLUDE_DIRECTORIES "/Users/tharakadushmantha/.gradle/caches/8.14.1/transforms/97d17fce626a14ac6fec1ee0fea1b643/transformed/fbjni-0.6.0/prefab/modules/fbjni/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

