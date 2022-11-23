<?php

class AvatarsPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Avatar',
		AUTHOR   = 'SnappyMail',
		URL      = 'https://snappymail.eu/',
		VERSION  = '1.0',
		RELEASE  = '2022-11-23',
		REQUIRED = '2.22.0',
		CATEGORY = 'Contacts',
		LICENSE  = 'MIT',
		DESCRIPTION = 'Show photo of sender in message and messages list (supports BIMI and Gravatar, Contacts is still TODO)';

	public function Init() : void
	{
		$this->addCss('style.css');
		$this->addJs('avatars.js');
		$this->addJsonHook('Avatar', 'DoAvatar');
		$this->addPartHook('Avatar', 'ServiceAvatar');
	}

	/**
	 * POST method handling
	 */
	public function DoAvatar() : array
	{
		$bBimi = !empty($this->jsonParam('bimi'));
		$sEmail = $this->jsonParam('email');
		$aResult = $this->getAvatar(\urldecode($sEmail), !empty($sEmail));
		if ($aResult) {
			$aResult = [
				'type' => $aResult[0],
				'data' => \base64_encode($aResult[1])
			];
		}
		return $this->jsonResponse(__FUNCTION__, $aResult);
	}

	/**
	 * GET /?Avatar/${bimi}/${from.email}
	 * Not fond of this idea because email address is exposed
	 * Maybe use btoa(from.email) or Crypto.subtle.encrypt({name:'AES-GCM',iv:''}, token, from.email)
	 */
//	public function ServiceAvatar(...$aParts)
	public function ServiceAvatar(string $sServiceName, string $sBimi, string $sEmail)
	{
		$aResult = $this->getAvatar(\urldecode($sEmail), !empty($sEmail));
		if ($aResult) {
			\header('Content-Type: '.$aResult[0]);
			echo $aResult[1];
			return true;
		}
		return false;
	}

	protected function configMapping() : array
	{
		return array(
			\RainLoop\Plugins\Property::NewInstance('bimi')->SetLabel('Use BIMI (https://bimigroup.org/)')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
				->SetDefaultValue(false),
			\RainLoop\Plugins\Property::NewInstance('gravatar')->SetLabel('Use Gravatar')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
				->SetDefaultValue(false)
		);
	}

	private function getAvatar(string $sEmail, bool $bBimi) : ?array
	{
		if (!\strpos($sEmail, '@')) {
			return null;
		}

		$oActions = \RainLoop\Api::Actions();
		$oActions->verifyCacheByKey($sEmail);

		$aResult = null;

		$sAsciiEmail = \MailSo\Base\Utils::IdnToAscii($sEmail, true);
		$sEmailId = \sha1(\strtolower($sAsciiEmail));

		$sFile = \APP_PRIVATE_DATA . 'avatars/' . $sEmailId;
		$aFiles = \glob("{$sFile}.*");
		if ($aFiles) {
			$aResult = [
				\mime_content_type($aFiles[0]),
				\file_get_contents($aFiles[0])
			];
			$oActions->cacheByKey($sEmail);
			return $aResult;
		}

		// TODO: lookup contacts vCard and return PHOTO value
		/*
		if (!$aResult) {
			$oAccount = $oActions->getAccountFromToken();
			if ($oAccount) {
				$oAddressBookProvider = $oActions->AddressBookProvider($oAccount);
				if ($oAddressBookProvider) {
					$oContact = $oAddressBookProvider->GetContactByEmail($sEmail);
					if ($oContact && $oContact->vCard && $oContact->vCard['PHOTO']) {
						$aResult = [
							'text/vcard',
							$oContact->vCard
						];
					}
				}
			}
		}
		*/

		if (!$aResult) {
			$sDomain = \explode('@', $sEmail);
			$sDomain = \array_pop($sDomain);

			$aUrls = [];

			if ($this->Config()->Get('plugin', 'bimi', false)) {
				$BIMI = $bBimi ? \SnappyMail\DNS::BIMI($sDomain) : null;
				if ($BIMI) {
					$aUrls[] = $BIMI;
//					$aResult = ['text/uri-list', $BIMI];
					\SnappyMail\Log::debug('Avatar', "BIMI {$sDomain} for {$sUrl}");
				} else {
					\SnappyMail\Log::notice('Avatar', "BIMI 404 for {$sDomain}");
				}
			}

			if ($this->Config()->Get('plugin', 'gravatar', false)) {
				$aUrls[] = 'http://gravatar.com/avatar/'.\md5(\strtolower($sAsciiEmail)).'?s=80&d=404';
			}

			foreach ($aUrls as $sUrl) {
				if ($aResult = static::getUrl($sUrl)) {
					break;
				}
			}
		}

		if ($aResult) {
			if (!\is_dir(\APP_PRIVATE_DATA . 'avatars')) {
				\mkdir(\APP_PRIVATE_DATA . 'avatars', 0700);
			}
			\file_put_contents(
				$sFile . \SnappyMail\File\MimeType::toExtension($aResult[0]),
				$aResult[1]
			);
		}

		if (!$aResult) {
			$aServices = [
				"services/{$sDomain}",
				'services/' . \preg_replace('/^.+\\.([^.]+\\.[^.]+)$/D', '$1', $sDomain),
				'services/' . \preg_replace('/^(.+\\.)?(paypal\\.[a-z][a-z])$/D', 'paypal.com', $sDomain),
				'empty-contact' // DATA_IMAGE_USER_DOT_PIC
			];
			foreach ($aServices as $service) {
				if (\file_exists(__DIR__ . "/images/{$service}.png")) {
					$aResult = [
						'image/png',
						\file_get_contents(__DIR__ . "/images/{$service}.png")
					];
					break;
				}
			}
		}

		$oActions->cacheByKey($sEmail);

		return $aResult;
	}

	private static function getUrl(string $sUrl) : ?array
	{
		$oHTTP = \SnappyMail\HTTP\Request::factory(/*'socket' or 'curl'*/);
		$oHTTP->proxy = \RainLoop\Api::Config()->Get('labs', 'curl_proxy', '');
		$oHTTP->proxy_auth = \RainLoop\Api::Config()->Get('labs', 'curl_proxy_auth', '');
		$oHTTP->max_response_kb = 0;
		$oHTTP->timeout = 15; // timeout in seconds.
		$oResponse = $oHTTP->doRequest('GET', $sUrl);
		if ($oResponse) {
			if (200 === $oResponse->status && \str_starts_with($oResponse->getHeader('content-type'), 'image/')) {
				return [
					$oResponse->getHeader('content-type'),
					$oResponse->body
				];
			}
			\SnappyMail\Log::notice('Avatar', "error {$oResponse->status} for {$sUrl}");
		} else {
			\SnappyMail\Log::warning('Avatar', "failed for {$sUrl}");
		}
		return null;
	}
}
