<?php

/**
 * ownCloud - RainLoop mail plugin
 *
 * @author RainLoop Team
 * @copyright 2014 RainLoop Team
 *
 * https://github.com/RainLoop/rainloop-webmail/tree/master/build/owncloud
 */

OCP\User::checkAdminUser();

OCP\Util::addScript('rainloop', 'admin');

$oTemplate = new OCP\Template('rainloop', 'admin');
$oTemplate->assign('rainloop-url', OCP\Config::getAppValue('rainloop', 'rainloop-url', ''));
$oTemplate->assign('rainloop-path', OCP\Config::getAppValue('rainloop', 'rainloop-path', ''));
return $oTemplate->fetchPage();
