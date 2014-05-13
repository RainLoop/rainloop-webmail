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
$oTemplate->assign('rainloop-sso-key', OCP\Config::getAppValue('rainloop', 'rainloop-sso-key', ''));
return $oTemplate->fetchPage();
