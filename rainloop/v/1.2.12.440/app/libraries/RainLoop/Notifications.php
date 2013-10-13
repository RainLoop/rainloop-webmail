<?php

namespace RainLoop;

class Notifications
{
	const InvalidToken = 101;
	const AuthError = 102;
	const AccessError = 103;
	const ConnectionError = 104;
	const CaptchaError = 105;
	const SocialFacebookLoginAccessDisable = 106;
	const SocialTwitterLoginAccessDisable = 107;
	const SocialGoogleLoginAccessDisable = 108;
	const DomainNotAllowed = 109;

	const CantGetMessageList = 201;
	const CantGetMessage = 202;
	const CantDeleteMessage = 203;
	const CantMoveMessage = 204;

	const CantSaveMessage = 301;
	const CantSendMessage = 302;
	const InvalidRecipients = 303;

	const CantCreateFolder = 400;
	const CantRenameFolder = 401;
	const CantDeleteFolder = 402;
	const CantSubscribeFolder = 403;
	const CantUnsubscribeFolder = 404;
	const CantDeleteNonEmptyFolder = 405;

	const CantSaveSettings = 501;
	const CantSavePluginSettings = 502;

	const DomainAlreadyExists = 601;
	
	const CantInstallPackage = 701;
	const CantDeletePackage = 702;
	const InvalidPluginPackage = 703;
	const UnsupportedPluginPackage = 704;
	
	const LicensingServerIsUnavailable = 710;
	const LicensingExpired = 711;
	const LicensingBanned = 712;

	const DemoSendMessageError = 750;
	
	const AccountAlreadyExists = 801;
	
	const MailServerError = 901;
	const UnknownError = 999;

	static public function GetNotificationsMessage($iCode)
	{
		static $aMap = array(
			self::InvalidToken => 'InvalidToken',
			self::AuthError => 'AuthError',
			self::AccessError => 'AccessError',
			self::ConnectionError => 'ConnectionError',
			self::CaptchaError => 'CaptchaError',
			self::SocialFacebookLoginAccessDisable => 'SocialFacebookLoginAccessDisable',
			self::SocialTwitterLoginAccessDisable => 'SocialTwitterLoginAccessDisable',
			self::SocialGoogleLoginAccessDisable => 'SocialGoogleLoginAccessDisable',
			self::CantGetMessageList => 'CantGetMessageList',
			self::CantGetMessage => 'CantGetMessage',
			self::CantDeleteMessage => 'CantDeleteMessage',
			self::CantMoveMessage => 'CantMoveMessage',
			self::CantSaveMessage => 'CantSaveMessage',
			self::CantSendMessage => 'CantSendMessage',
			self::InvalidRecipients => 'InvalidRecipients',
			self::CantCreateFolder => 'CantCreateFolder',
			self::CantRenameFolder => 'CantRenameFolder',
			self::CantDeleteFolder => 'CantDeleteFolder',
			self::CantSubscribeFolder => 'CantSubscribeFolder',
			self::CantUnsubscribeFolder => 'CantUnsubscribeFolder',
			self::CantDeleteNonEmptyFolder => 'CantDeleteNonEmptyFolder',
			self::CantSaveSettings => 'CantSaveSettings',
			self::CantSavePluginSettings => 'CantSavePluginSettings',
			self::DomainAlreadyExists => 'DomainAlreadyExists',
			self::CantInstallPackage => 'CantInstallPackage',
			self::CantDeletePackage => 'CantDeletePackage',
			self::InvalidPluginPackage => 'InvalidPluginPackage',
			self::UnsupportedPluginPackage => 'UnsupportedPluginPackage',
			self::AccountAlreadyExists => 'AccountAlreadyExists',
			self::MailServerError => 'MailServerError',
			self::UnknownError => 'UnknownError'
		);

		return isset($aMap[$iCode]) ? $aMap[$iCode].'['.$iCode.']' : 'UnknownNotification['.$iCode.']';
	}
}