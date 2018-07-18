<?php
function getSaveLocation() {
    if (isset(getenv(["WAET_SAVES_LOCATION"]))) {
        return getenv(["WAET_SAVES_LOCATION"]);
    } else {
        return "../saves/";
    }
}
function getTestLocation() {
    if (isset(getenv(["WAET_TEST_LOCATION"]))) {
        return getenv(["WAET_TEST_LOCATION"]);
    } else {
        return "../tests/";
    }
}
?>