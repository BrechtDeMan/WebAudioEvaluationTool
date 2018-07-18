<?php
function getSaveLocation() {
    if (getenv("WAET_SAVES_LOCATION") !== false) {
        return getenv("WAET_SAVES_LOCATION");
    } else {
        return "../saves/";
    }
}
function getTestLocation() {
    if (getenv("WAET_TEST_LOCATION") !== false) {
        return getenv("WAET_TEST_LOCATION");
    } else {
        return "../tests/";
    }
}
?>