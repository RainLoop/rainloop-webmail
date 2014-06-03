<?php

/**
 * ownCloud - RainLoop mail plugin
 *
 * @author RainLoop Team
 * @copyright 2014 RainLoop Team
 *
 * https://github.com/RainLoop/rainloop-webmail/tree/master/build/owncloud
 */

OCP\User::checkLoggedIn();
OCP\App::checkAppEnabled('rainloop');
OCP\App::setActiveNavigationEntry('rainloop_index');

$sUser = OCP\User::getUser();

$sEmail = OCP\Config::getUserValue($sUser, 'rainloop', 'rainloop-email', '');
$sLogin = OCP\Config::getUserValue($sUser, 'rainloop', 'rainloop-login', '');
$sPassword = OCP\Config::getUserValue($sUser, 'rainloop', 'rainloop-password', '');

$_ENV['RAINLOOP_INCLUDE_AS_API'] = true;
include OC_App::getAppPath('rainloop').'/app/index.php';

include_once OC_App::getAppPath('rainloop').'/lib/RainLoopHelper.php';

$sPassword = OC_RainLoop_Helper::decodePassword($sPassword, md5($sEmail.$sLogin));
$sSsoHash = \RainLoop\Api::GetUserSsoHash($sEmail, $sPassword, $sLogin);

$sUrl = OCP\Util::linkTo('apps/rainloop/app', 'index.php');
$sResultUrl = empty($sSsoHash) ? $sUrl.'?sso' : $sUrl.'?sso&hash='.$sSsoHash;

$oTemplate = new OCP\Template('rainloop', 'iframe', 'user');
$oTemplate->assign('rainloop-url', $sResultUrl);

$oTemplate->printpage();
