<?php

use OCA\SnappyMail\Settings\PersonalSettings;

$app = new \OCA\SnappyMail\AppInfo\Application();
$controller = $app->getContainer()->query(PersonalSettings::class);
return $controller->getForm()->render();

