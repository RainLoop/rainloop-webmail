<?php
/**
 * You may store your own custom domain icons in `data/_data_/_default_/avatars/`
 * Like: `data/_data_/_default_/avatars/snappymail.eu.svg`
 */

class AvatarsPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Avatars',
		AUTHOR   = 'SnappyMail',
		URL      = 'https://snappymail.eu/',
		VERSION  = '1.15',
		RELEASE  = '2024-01-22',
		REQUIRED = '2.25.0',
		CATEGORY = 'Contacts',
		LICENSE  = 'MIT',
		DESCRIPTION = 'Show graphic of sender in message and messages list (supports BIMI, Gravatar and identicon, Contacts is still TODO)';

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
			$this->addHook('json.after-message', 'JsonMessage');
			$this->addHook('json.after-messagelist', 'JsonMessageList');
		}
		// https://www.ietf.org/archive/id/draft-brand-indicators-for-message-identification-04.html#bimi-selector
		if ($this->Config()->Get('plugin', 'bimi', false)) {
			$this->addHook('imap.message-headers', 'ImapMessageHeaders');
		}
	}

	public function ImapMessageHeaders(array &$aHeaders)
	{
		// \MailSo\Mime\Enumerations\Header::BIMI_SELECTOR
		$aHeaders[] = 'BIMI-Selector';
	}

	public function JsonMessage(array &$aResponse)
	{
		if ($icon = $this->JsonAvatar($aResponse['Result'])) {
			$aResponse['Result']['avatar'] = $icon;
		}
	}

	public function JsonMessageList(array &$aResponse)
	{
		if (!empty($aResponse['Result']['@Collection'])) {
			foreach ($aResponse['Result']['@Collection'] as &$message) {
				if ($icon = $this->JsonAvatar($message)) {
					$message['avatar'] = $icon;
				}
			}
		}
	}

	private function JsonAvatar($message) : ?string
	{
		$mFrom = empty($message['from'][0]) ? null : $message['from'][0];
		if ($mFrom instanceof \MailSo\Mime\Email) {
			$mFrom = $mFrom->jsonSerialize();
		}
		if (\is_array($mFrom)) {
			if (!$this->Config()->Get('plugin', 'delay', true)
			 && ($this->Config()->Get('plugin', 'gravatar', false)
				|| ($this->Config()->Get('plugin', 'bimi', false) && 'pass' == $mFrom['dkimStatus'])
			 )
			) try {
				// Base64Url
				return \SnappyMail\Crypt::EncryptUrlSafe($mFrom['email']);
			} catch (\Throwable $e) {
				\SnappyMail\Log::error('Crypt', $e->getMessage());
			}
			if ('pass' == $mFrom['dkimStatus'] && $this->Config()->Get('plugin', 'service', true)) {
				// 'data:image/png;base64,[a-zA-Z0-9+/=]'
				return static::getServiceIcon($mFrom['email']);
			}
		}
		return null;
	}

	/**
	 * POST method handling
	 */
	public function DoAvatar() : array
	{
		$bBimi = !empty($this->jsonParam('bimi'));
		$sBimiSelector = $this->jsonParam('bimiSelector') ?: '';
		$sEmail = $this->jsonParam('email');
		$aResult = $this->getAvatar($sEmail, $bBimi, $sBimiSelector);
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
		$aBimi = \explode('-', $sBimi, 2);
		$sBimiSelector = isset($aBimi[1]) ? $aBimi[1] : 'default';
		if ($sEmail && ($aResult = $this->getAvatar($sEmail, !empty($aBimi[0]), $sBimiSelector))) {
			\header('Content-Type: '.$aResult[0]);
			echo $aResult[1];
		} else {
			\MailSo\Base\Http::StatusHeader(404);
		}
		exit;
	}

	protected function configMapping() : array
	{
		$group = new \RainLoop\Plugins\PropertyCollection('Lookup');
		$group->exchangeArray([
			\RainLoop\Plugins\Property::NewInstance('delay')->SetLabel('Delay lookup')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
				->SetAllowedInJs(true)
				->SetDefaultValue(true),
			\RainLoop\Plugins\Property::NewInstance('bimi')->SetLabel('BIMI')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
//				->SetAllowedInJs(true)
				->SetDefaultValue(false)
				->SetDescription('https://bimigroup.org/ (DKIM header must be valid)'),
			\RainLoop\Plugins\Property::NewInstance('gravatar')->SetLabel('Gravatar')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
//				->SetAllowedInJs(true)
				->SetDefaultValue(false)
				->SetDescription('https://wikipedia.org/wiki/Gravatar'),
		]);
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
				->SetAllowedInJs(true)
				->SetDefaultValue(true)
				->SetDescription('DKIM header must be valid and icon is found in avatars/images/services directory'),
			$group
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
			'services/' . static::serviceDomain($sDomain)
		];
		foreach ($aServices as $service) {
			$file = __DIR__ . "/images/{$service}.png";
			if (\file_exists($file)) {
				return 'data:image/png;base64,' . \base64_encode(\file_get_contents($file));
			}
		}

		$aResult = static::getCachedImage($sEmail);
		if ($aResult) {
			return 'data:'.$aResult[0].';base64,' . \base64_encode($aResult[1]);
		}

		return null;
	}

	private function getAvatar(string $sEmail, bool $bBimi, string $sBimiSelector = '') : ?array
	{
		if (!\strpos($sEmail, '@')) {
			return null;
		}

		$sAsciiEmail = \mb_strtolower(\MailSo\Base\Utils::IdnToAscii($sEmail, true));
		$sEmailId = \sha1($sAsciiEmail);

		\MailSo\Base\Http::setETag($sEmailId);
		\header('Cache-Control: private');
//		\header('Expires: '.\gmdate('D, j M Y H:i:s', \time() + 86400).' UTC');

		$aResult = static::getCachedImage($sEmail);
		if ($aResult) {
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
				$BIMI = $bBimi ? \SnappyMail\DNS::BIMI($sDomain, $sBimiSelector) : null;
				if ($BIMI) {
					$aUrls[] = $BIMI;
//					$aResult = ['text/uri-list', $BIMI];
					\SnappyMail\Log::debug('Avatar', "BIMI {$sDomain}: {$BIMI}");
				} else {
					\SnappyMail\Log::notice('Avatar', "BIMI 404 for {$sDomain}");
				}
			}

			if ($this->Config()->Get('plugin', 'gravatar', false)) {
				$aUrls[] = 'https://gravatar.com/avatar/'.\md5(\strtolower($sAsciiEmail)).'?s=80&d=404';
			}

			foreach ($aUrls as $sUrl) {
				if ($aResult = static::getUrl($sUrl)) {
					break;
				}
			}
		}

		if ($aResult) {
			static::cacheImage($sEmail, $aResult);
		}

		// Only allow service icon when DKIM is valid. $bBimi is true when DKIM is valid.
		if ($bBimi && !$aResult) {
			$aServices = [
				"services/{$sDomain}",
				'services/' . static::serviceDomain($sDomain)
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
/*
			if (!$aResult) {
				$aResult = static::getFavicon($sEmail, $sDomain);
			}
*/
		}

		return $aResult;
	}

	private static function serviceDomain(string $sDomain) : string
	{
		$sDomain = \preg_replace('/^(.+\\.)?(paypal\\.[a-z][a-z])$/D', 'paypal.com', $sDomain);
		$sDomain = \preg_replace('/^facebookmail.com$/D', 'facebook.com', $sDomain);
		$sDomain = \preg_replace('/^dhlparcel.nl$/D', 'dhl.com', $sDomain);
		$sDomain = \preg_replace('/^.+\\.([^.]+\\.[^.]+)$/D', '$1', $sDomain);
		return $sDomain;
	}

	private static function cacheImage(string $sEmail, array $aResult) : void
	{
		$sEmailId = \sha1(\mb_strtolower(\MailSo\Base\Utils::IdnToAscii($sEmail, true)));
		if (!\is_dir(\APP_PRIVATE_DATA . 'avatars')) {
			\mkdir(\APP_PRIVATE_DATA . 'avatars', 0700);
		}
		\file_put_contents(
			\APP_PRIVATE_DATA . 'avatars/' . $sEmailId . \SnappyMail\File\MimeType::toExtension($aResult[0]),
			$aResult[1]
		);
		\MailSo\Base\Http::setLastModified(\time());
	}

	private static function getCachedImage(string $sEmail) : ?array
	{
		$sEmail = \mb_strtolower(\MailSo\Base\Utils::IdnToAscii($sEmail, true));
		$aFiles = \glob(\APP_PRIVATE_DATA . "avatars/{$sEmail}.*");
		if ($aFiles) {
			\MailSo\Base\Http::setLastModified(\filemtime($aFiles[0]));
			return [
				\SnappyMail\File\MimeType::fromFile($aFiles[0]),
				\file_get_contents($aFiles[0])
			];
		}
		$sEmailId = \sha1($sEmail);
		$aFiles = \glob(\APP_PRIVATE_DATA . "avatars/{$sEmailId}.*");
		if ($aFiles) {
			\MailSo\Base\Http::setLastModified(\filemtime($aFiles[0]));
			return [
				\mime_content_type($aFiles[0]),
				\file_get_contents($aFiles[0])
			];
		}
		return null;
	}

	private static function getFavicon(string $sEmail, string $sDomain) : ?array
	{
		$aResult = static::getUrl('https://' . $sDomain . '/favicon.ico')
			?: static::getUrl('https://' . static::serviceDomain($sDomain) . '/favicon.ico')
			?: static::getUrl('https://www.' . static::serviceDomain($sDomain) . '/favicon.ico');
		// Also detect <link rel="shortcut icon" href="...">
		if ($aResult) {
			static::cacheImage($sEmail, $aResult);
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
		try {
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
		} catch (\Throwable $e) {
			\SnappyMail\Log::notice('Avatar', "error {$e->getMessage()}");
		}
		return null;
	}
}
