<?php
function getSaveLocation() {
    if (isset($_ENV["WAET_SAVES_LOCATION"])) {
        return $_ENV["WAET_SAVES_LOCATION"];
    } else {
        return "../saves/";
    }
}
function getTestLocation() {
    if (isset($_ENV["WAET_TEST_LOCATION"])) {
        return $_ENV["WAET_TEST_LOCATION"];
    } else {
        return "../tests/";
    }
}
?>