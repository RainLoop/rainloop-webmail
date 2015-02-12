<?php

/**
 * ownCloud - RainLoop mail plugin
 *
 * @author RainLoop Team
 * @copyright 2015 RainLoop Team
 *
 * https://github.com/RainLoop/rainloop-webmail/tree/master/build/owncloud
 */

OCP\User::checkLoggedIn();
OCP\App::checkAppEnabled('rainloop');
OCP\App::setActiveNavigationEntry('rainloop_index');

include_once OC_App::getAppPath('rainloop').'/lib/RainLoopHelper.php';

$sUrl = OC_RainLoop_Helper::normalizeUrl(OC_RainLoop_Helper::getAppUrl());

$oTemplate = new OCP\Template('rainloop', 'index', 'user');
$oTemplate->assign('rainloop-iframe-url', OC_RainLoop_Helper::normalizeUrl($sUrl).'?OwnCloudAuth');

$oTemplate->printpage();
