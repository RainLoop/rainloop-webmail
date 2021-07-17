<?php

/**
 * Nextcloud - SnappyMail mail plugin
 *
 * @author SnappyMail Team, Nextgen-Networks (@nextgen-networks), Tab Fitts (@tabp0le), Pierre-Alain Bandinelli (@pierre-alain-b)
 *
 * Based initially on https://github.com/SnappyMail/snappymail-webmail/tree/master/build/owncloud
 */

$app = new OCA\SnappyMail\AppInfo\Application();
$app->registerNavigation();
$app->registerPersonalSettings();
$app->getContainer()->query('SnappyMailHelper')->registerHooks();

