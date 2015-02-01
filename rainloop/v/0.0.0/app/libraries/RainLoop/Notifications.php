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
	const AccountNotAllowed = 110;

	const AccountTwoFactorAuthRequired = 120;
	const AccountTwoFactorAuthError = 121;

	const CouldNotSaveNewPassword = 130;
	const CurrentPasswordIncorrect = 131;
	const NewPasswordShort = 132;
	const NewPasswordWeak = 133;
	const NewPasswordForbidden = 134;

	const ContactsSyncError = 140;

	const CantGetMessageList = 201;
	const CantGetMessage = 202;
	const CantDeleteMessage = 203;
	const CantMoveMessage = 204;
	const CantCopyMessage = 205;

	const CantSaveMessage = 301;
	const CantSendMessage = 302;
	const InvalidRecipients = 303;

	const CantSaveFilters = 351;
	const CantGetFilters = 352;
	const FiltersAreNotCorrect = 355;

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
	const DemoAccountError = 751;

	const AccountAlreadyExists = 801;
	const AccountDoesNotExist = 802;

	const MailServerError = 901;
	const ClientViewError = 902;
	const InvalidInputArgument = 903;
	const UnknownNotification = 998;
	const UnknownError = 999;

	/**
	 * @staticvar array $aMap
	 *
	 * @param int $iCode
	 * @param \Exception|null $oPrevious
	 *
	 * @return string
	 */
	static public function GetNotificationsMessage($iCode, $oPrevious = null)
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
			self::DomainNotAllowed => 'DomainNotAllowed',
			self::AccountNotAllowed => 'AccountNotAllowed',
			self::AccountTwoFactorAuthRequired => 'AccountTwoFactorAuthRequired',
			self::AccountTwoFactorAuthError => 'AccountTwoFactorAuthError',

			self::CouldNotSaveNewPassword => 'CouldNotSaveNewPassword',
			self::CurrentPasswordIncorrect => 'CurrentPasswordIncorrect',
			self::NewPasswordShort => 'NewPasswordShort',
			self::NewPasswordWeak => 'NewPasswordWeak',
			self::NewPasswordForbidden => 'NewPasswordForbidden',

			self::ContactsSyncError => 'ContactsSyncError',

			self::CantGetMessageList => 'CantGetMessageList',
			self::CantGetMessage => 'CantGetMessage',
			self::CantDeleteMessage => 'CantDeleteMessage',
			self::CantMoveMessage => 'CantMoveMessage',
			self::CantSaveMessage => 'CantSaveMessage',
			self::CantSendMessage => 'CantSendMessage',
			self::InvalidRecipients => 'InvalidRecipients',
			self::CantSaveFilters => 'CantSaveFilters',
			self::CantGetFilters => 'CantGetFilters',
			self::FiltersAreNotCorrect => 'FiltersAreNotCorrect',

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
			self::LicensingServerIsUnavailable => 'LicensingServerIsUnavailable',
			self::LicensingExpired => 'LicensingExpired',
			self::LicensingBanned => 'LicensingBanned',
			self::DemoSendMessageError => 'DemoSendMessageError',
			self::DemoAccountError => 'DemoAccountError',
			self::AccountAlreadyExists => 'AccountAlreadyExists',
			self::AccountDoesNotExist => 'AccountDoesNotExist',
			self::MailServerError => 'MailServerError',
			self::ClientViewError => 'ClientViewError',
			self::InvalidInputArgument => 'InvalidInputArgument',
			self::UnknownNotification => 'UnknownNotification',
			self::UnknownError => 'UnknownError'
		);

		if (self::ClientViewError === $iCode && $oPrevious instanceof \Exception)
		{
			return $oPrevious->getMessage();
		}

		return isset($aMap[$iCode]) ? $aMap[$iCode].'['.$iCode.']' : 'UnknownNotification['.$iCode.']';
	}
}