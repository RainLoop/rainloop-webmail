<?php

class AvatarsPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Avatars',
		AUTHOR   = 'SnappyMail',
		URL      = 'https://snappymail.eu/',
		VERSION  = '1.3',
		RELEASE  = '2022-11-29',
		REQUIRED = '2.22.4',
		CATEGORY = 'Contacts',
		LICENSE  = 'MIT',
		DESCRIPTION = 'Show photo of sender in message and messages list (supports BIMI, Gravatar and identicon, Contacts is still TODO)';

	public function Init() : void
	{
		$this->addCss('style.css');
		$this->addJs('avatars.js');
		$this->addJsonHook('Avatar', 'DoAvatar');
		$this->addPartHook('Avatar', 'ServiceAvatar');
		$identicon = $this->Config()->Get('plugin', 'identicon', '');
		if ($identicon && \is_file(__DIR__ . "/{$identicon}.js")) {
			$this->addJs("{$identicon}.js");
		}
		// https://github.com/the-djmaze/snappymail/issues/714
		if ($this->Config()->Get('plugin', 'service', true) || !$this->Config()->Get('plugin', 'delay', true)) {
			$this->addHook('filter.json-response', 'FilterJsonResponse');
		}
	}

	public function FilterJsonResponse(string $sAction, array &$aResponseItem)
	{
		if ('MessageList' === $sAction && !empty($aResponseItem['Result']['@Collection'])) {
			foreach ($aResponseItem['Result']['@Collection'] as $id => $message) {
				if (!empty($message['From'])) {
					$aResponseItem['Result']['@Collection'][$id]['Avatar'] = $this->encryptFrom($message['From'][0]);
				}
			}
		} else if ('Message' === $sAction && !empty($aResponseItem['Result']['From'])) {
			$aResponseItem['Result']['Avatar'] = $this->encryptFrom($aResponseItem['Result']['From'][0]);
		}
	}

	private function encryptFrom($mFrom)
	{
		if ($mFrom instanceof \MailSo\Mime\Email) {
			$mFrom = $mFrom->jsonSerialize();
		}
		if (!\is_array($mFrom)) {
			return null;
		}
		if ('pass' == $mFrom['DkimStatus'] && $this->Config()->Get('plugin', 'service', true) && ($sIcon = static::getServiceIcon($mFrom['Email']))) {
			return $sIcon;
		}
		return $this->Config()->Get('plugin', 'delay', true)
			? null
			: \SnappyMail\Crypt::EncryptUrlSafe($mFrom['Email']);
	}

	/**
	 * POST method handling
	 */
	public function DoAvatar() : array
	{
		$bBimi = !empty($this->jsonParam('bimi'));
		$sEmail = $this->jsonParam('email');
		$aResult = $this->getAvatar($sEmail, !empty($bBimi));
		if ($aResult) {
			$aResult = [
				'type' => $aResult[0],
				'data' => \base64_encode($aResult[1])
			];
		}
		return $this->jsonResponse(__FUNCTION__, $aResult);
	}

	/**
	 * GET /?Avatar/${bimi}/Encrypted(${from.email})
	 * Nextcloud Mail uses insecure unencrypted 'index.php/apps/mail/api/avatars/url/local%40example.com'
	 */
//	public function ServiceAvatar(...$aParts)
	public function ServiceAvatar(string $sServiceName, string $sBimi, string $sEmail)
	{
		$sEmail = \SnappyMail\Crypt::DecryptUrlSafe($sEmail);
		if ($sEmail && ($aResult = $this->getAvatar($sEmail, !empty($sBimi)))) {
			\header('Content-Type: '.$aResult[0]);
			echo $aResult[1];
		} else {
			\MailSo\Base\Http::StatusHeader(404);
		}
		exit;
	}

	protected function configMapping() : array
	{
		$aResult = array(
			defined('RainLoop\\Enumerations\\PluginPropertyType::SELECT')
				? \RainLoop\Plugins\Property::NewInstance('identicon')->SetLabel('Identicon')
					->SetType(\RainLoop\Enumerations\PluginPropertyType::SELECT)
//					->SetAllowedInJs(true)
					->SetDefaultValue([
						['id' => '', 'name' => 'Name characters else silhouette'],
						['id' => 'identicon', 'name' => 'Name characters else squares'],
						['id' => 'jdenticon', 'name' => 'Triangles shape']
					])
					->SetDescription('https://wikipedia.org/wiki/Identicon')
				: \RainLoop\Plugins\Property::NewInstance('identicon')->SetLabel('Identicon')
					->SetType(\RainLoop\Enumerations\PluginPropertyType::SELECTION)
//					->SetAllowedInJs(true)
					->SetDefaultValue(['','identicon','jdenticon'])
					->SetDescription('empty = default, identicon = squares, jdenticon = Triangles shape')
				,
			\RainLoop\Plugins\Property::NewInstance('service')->SetLabel('Preload valid domain icons')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
				->SetDefaultValue(true),
			\RainLoop\Plugins\Property::NewInstance('bimi')->SetLabel('Lookup BIMI')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
				->SetDefaultValue(false)
				->SetDescription('https://bimigroup.org/'),
			\RainLoop\Plugins\Property::NewInstance('gravatar')->SetLabel('Lookup Gravatar')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
				->SetDefaultValue(false)
				->SetDescription('https://wikipedia.org/wiki/Gravatar'),
			\RainLoop\Plugins\Property::NewInstance('delay')->SetLabel('Delay lookup loading')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
				->SetDefaultValue(true),
		);
/*
		if (\class_exists('OC') && isset(\OC::$server)) {
			$aResult[] = \RainLoop\Plugins\Property::NewInstance('nextcloud')->SetLabel('Lookup Nextcloud Contacts')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
//				->SetAllowedInJs(true)
				->SetDefaultValue(false);
		}
*/
		return $aResult;
	}

	// Only allow service icon when DKIM is valid. $bBimi is true when DKIM is valid.
	private static function getServiceIcon(string $sEmail) : ?string
	{
		$sDomain = \explode('@', $sEmail);
		$sDomain = \array_pop($sDomain);
		$aServices = [
			"services/{$sDomain}",
			'services/' . \preg_replace('/^.+\\.([^.]+\\.[^.]+)$/D', '$1', $sDomain),
			'services/' . \preg_replace('/^(.+\\.)?(paypal\\.[a-z][a-z])$/D', 'paypal.com', $sDomain)
		];
		foreach ($aServices as $service) {
			$file = __DIR__ . "/images/{$service}.png";
			if (\file_exists($file)) {
				return 'data:image/png;base64,' . \base64_encode(\file_get_contents($file));
			}
		}
		return null;
	}

	private function getAvatar(string $sEmail, bool $bBimi) : ?array
	{
		if (!\strpos($sEmail, '@')) {
			return null;
		}

		$sAsciiEmail = \mb_strtolower(\MailSo\Base\Utils::IdnToAscii($sEmail, true));
		$sEmailId = \sha1($sAsciiEmail);

		\MailSo\Base\Http::setETag($sEmailId);
		\header('Cache-Control: private');
//		\header('Expires: '.\gmdate('D, j M Y H:i:s', \time() + 86400).' UTC');

		$aResult = null;

		$sFile = \APP_PRIVATE_DATA . 'avatars/' . $sEmailId;
		$aFiles = \glob("{$sFile}.*");
		if ($aFiles) {
			\MailSo\Base\Http::setLastModified(\filemtime($aFiles[0]));
			$aResult = [
				\mime_content_type($aFiles[0]),
				\file_get_contents($aFiles[0])
			];
			return $aResult;
		}

		// TODO: lookup contacts vCard and return PHOTO value
		/*
		if (!$aResult) {
			$oActions = \RainLoop\Api::Actions();
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
					\SnappyMail\Log::debug('Avatar', "BIMI {$sDomain}: {$BIMI}");
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
			\MailSo\Base\Http::setLastModified(\time());
		}

		// Only allow service icon when DKIM is valid. $bBimi is true when DKIM is valid.
		if ($bBimi && !$aResult) {
			$aServices = [
				"services/{$sDomain}",
				'services/' . \preg_replace('/^.+\\.([^.]+\\.[^.]+)$/D', '$1', $sDomain),
				'services/' . \preg_replace('/^(.+\\.)?(paypal\\.[a-z][a-z])$/D', 'paypal.com', $sDomain)
			];
			foreach ($aServices as $service) {
				$file = __DIR__ . "/images/{$service}.png";
				if (\file_exists($file)) {
					\MailSo\Base\Http::setLastModified(\filemtime($file));
					$aResult = [
						'image/png',
						\file_get_contents($file)
					];
					break;
				}
			}
		}

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
