<?php

// Enable SnappyMail Api and include index file
$_ENV['SNAPPYMAIL_INCLUDE_AS_API'] = true;
require '../index.php';

/**
 * Get SSO hash
 */
$aAdditionalOptions = array(
	// One of /snappymail/v/0.0.0/app/localization/*
//	'Language' = 'en-US'
);
$bUseTimeout = true; // 10 seconds
$ssoHash = \RainLoop\Api::CreateUserSsoHash($sEmail, $sPassword, $aAdditionalOptions, $bUseTimeout);

// redirect to webmail sso url
\header('Location: https://yourdomain.com/snappymail/?sso&hash='.$ssoHash);

// Destroy the SSO hash
//\RainLoop\Api::ClearUserSsoHash($ssoHash);
