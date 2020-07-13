<?php

/**
 * ownCloud - RainLoop mail plugin
 *
 * @author RainLoop Team
 *
 * https://github.com/RainLoop/rainloop-webmail/tree/master/build/owncloud
 */

OCP\User::checkAdminUser();

OCP\Util::addScript('rainloop', 'admin');

include_once OC_App::getAppPath('rainloop').'/lib/RainLoopHelper.php';

$oTemplate = new OCP\Template('rainloop', 'admin-local');
$oTemplate->assign('rainloop-admin-panel-link', OC_RainLoop_Helper::getAppUrl().'?admin');
$oTemplate->assign('rainloop-autologin', \OC::$server->getConfig()->getAppValue('rainloop', 'rainloop-autologin', false));
return $oTemplate->fetchPage();
