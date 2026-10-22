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
		VERSION  = '1.22',
		RELEASE  = '2025-03-10',
		REQUIRED = '2.33.0',
		CATEGORY = 'Contacts',
		LICENSE  = 'MIT',
		DESCRIPTION = 'Show graphic of sender in message and messages list (supports Contacts, BIMI, Gravatar, favicon and identicon)';

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
		if ($this->Config()->Get('plugin', 'service', true)
//		 || !$this->Config()->Get('plugin', 'delay', true)
		 || $this->Config()->Get('plugin', 'gravatar', false)
		 || $this->Config()->Get('plugin', 'bimi', false)
		 || $this->Config()->Get('plugin', 'favicon', false)
		) {
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
			if (/*!$this->Config()->Get('plugin', 'delay', true)
			 && */($this->Config()->Get('plugin', 'gravatar', false)
				|| ($this->Config()->Get('plugin', 'bimi', false) && 'pass' == $mFrom['dkimStatus'])
				|| ($this->Config()->Get('plugin', 'favicon', false) && 'pass' == $mFrom['dkimStatus'])
			 )
			) {
				return 'remote';
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
	 * GET /?Avatar/${bimi}/Encoded(${from.email})
	 * Nextcloud Mail uses insecure unencoded 'index.php/apps/mail/api/avatars/url/local%40example.com'
	 */
//	public function ServiceAvatar(...$aParts)
	public function ServiceAvatar(string $sServiceName, string $sBimi, string $sEncodedEmail)
	{
		$maxAge = 86400;
		$sEmail = \MailSo\Base\Utils::UrlSafeBase64Decode($sEncodedEmail);
		$aBimi = \explode('-', $sBimi, 2);
		$sBimiSelector = isset($aBimi[1]) ? $aBimi[1] : 'default';
//		$sEmail && \MailSo\Base\Http::setETag("{$sBimiSelector}-{$sEncodedEmail}");
		if ($sEmail && ($aResult = $this->getAvatar($sEmail, !empty($aBimi[0]), $sBimiSelector))) {
			\header("Cache-Control: max-age={$maxAge}, private");
			\header('Expires: '.\gmdate('D, j M Y H:i:s', $maxAge + \time()).' UTC');
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
			\RainLoop\Plugins\Property::NewInstance('contacts')->SetLabel('Contacts')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
				->SetDescription('Use the PHOTO stored on a matching address book contact')
				->SetDefaultValue(true),
			\RainLoop\Plugins\Property::NewInstance('bimi')->SetLabel('BIMI')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
				->SetDefaultValue(false)
				->SetDescription('https://bimigroup.org/ (DKIM header must be valid)'),
			\RainLoop\Plugins\Property::NewInstance('favicon')->SetLabel('Favicon')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
				->SetDefaultValue(false)
				->SetDescription('Fetch favicon from domain (DKIM header must be valid)'),
			\RainLoop\Plugins\Property::NewInstance('gravatar')->SetLabel('Gravatar')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
				->SetDefaultValue(false)
				->SetDescription('https://wikipedia.org/wiki/Gravatar'),
		]);
		$aResult = array(
			defined('RainLoop\\Enumerations\\PluginPropertyType::SELECT')
				? \RainLoop\Plugins\Property::NewInstance('identicon')->SetLabel('Identicon')
					->SetType(\RainLoop\Enumerations\PluginPropertyType::SELECT)
					->SetDefaultValue([
						['id' => '', 'name' => 'Name characters else silhouette'],
						['id' => 'identicon', 'name' => 'Name characters else squares'],
						['id' => 'jdenticon', 'name' => 'Triangles shape']
					])
					->SetDescription('https://wikipedia.org/wiki/Identicon')
				: \RainLoop\Plugins\Property::NewInstance('identicon')->SetLabel('Identicon')
					->SetType(\RainLoop\Enumerations\PluginPropertyType::SELECTION)
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

	private static function getServicePng(string $sDomain) : ?string
	{
		$aServices = [
			"services/{$sDomain}",
			'services/' . static::serviceDomain($sDomain)
		];
		foreach ($aServices as $service) {
			$file = __DIR__ . "/images/{$service}.png";
			if (\file_exists($file)) {
				return $file;
			}
		}
		return null;
	}

	// Only allow service icon when DKIM is valid. $bBimi is true when DKIM is valid.
	private static function getServiceIcon(string $sEmail) : ?string
	{
		$aParts = \explode('@', $sEmail);
		$file = static::getServicePng(\array_pop($aParts));
		if ($file) {
			return 'data:image/png;base64,' . \base64_encode(\file_get_contents($file));
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

		$sAsciiEmail = \mb_strtolower(\SnappyMail\IDN::emailToAscii($sEmail));
		$sEmailId = \sha1($sAsciiEmail);

		\MailSo\Base\Http::setETag($sEmailId);
		\header('Cache-Control: private');
//		\header('Expires: '.\gmdate('D, j M Y H:i:s', \time() + 86400).' UTC');

		// A photo stored on the contact is authoritative, so it is consulted
		// before the cache and before any network lookup: it beats a guessed
		// avatar and replaces up to five remote round-trips. Deliberately not
		// written to the avatars cache, which has no expiry - a cached copy
		// would shadow later edits to the contact.
		if ($this->Config()->Get('plugin', 'contacts', true)) {
			$aResult = static::getContactPhoto($sAsciiEmail);
			if ($aResult) {
				return $aResult;
			}
		}

		$aResult = static::getCachedImage($sEmail);
		if ($aResult) {
			return $aResult;
		}


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
				$aUrls[] = 'https://gravatar.com/avatar/'.\hash('sha256', \strtolower($sAsciiEmail)).'?s=80&d=404';
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
			$file = static::getServicePng($sDomain);
			if ($file) {
				\MailSo\Base\Http::setLastModified(\filemtime($file));
				$aResult = [
					'image/png',
					\file_get_contents($file)
				];
			}

			if (!$aResult && $this->Config()->Get('plugin', 'favicon', false)) {
				$aResult = static::getFavicon($sDomain);
			}
		}

		return $aResult;
	}

	private static function serviceDomain(string $sDomain) : string
	{
		$sDomain = \preg_replace('/^(.+\\.)?(paypal\\.[a-z][a-z])$/D', 'paypal.com', $sDomain);
		$sDomain = \preg_replace('/^facebookmail.com$/D', 'facebook.com', $sDomain);
		$sDomain = \preg_replace('/^dhlparcel.nl$/D', 'dhl.com', $sDomain);
		$sDomain = \preg_replace('/^amazon.nl$/D', 'amazon.com', $sDomain);
		$sDomain = \preg_replace('/^.+\\.([^.]+\\.[^.]+)$/D', '$1', $sDomain);
		return $sDomain;
	}

	/**
	 * Return the PHOTO of the address book contact owning this address.
	 *
	 * vCard 4.0 stores it as a data: URI, vCard 3.0 as ENCODING=b with a TYPE
	 * parameter, and either version may point at an external URL instead.
	 */
	private static function getContactPhoto(string $sEmail) : ?array
	{
		try {
			$oActions = \RainLoop\Api::Actions();
			$oAccount = $oActions->getAccountFromToken(false);
			if (!$oAccount) {
				return null;
			}
			$oProvider = $oActions->AddressBookProvider($oAccount);
			if (!$oProvider || !$oProvider->IsActive()) {
				return null;
			}
			// Several contacts can share an address - a synced card, a manual
			// entry, an auto-collected one - and only one of them may carry the
			// photo. GetContactByEmail() returns whichever matches first, so
			// fall back to scanning the matches for one that actually has it.
			$oPhoto = null;
			$oContact = $oProvider->GetContactByEmail($sEmail);
			if ($oContact && $oContact->vCard && isset($oContact->vCard->PHOTO)) {
				$oPhoto = $oContact->vCard->PHOTO;
			} else {
				$iCount = 0;
				foreach ($oProvider->GetContacts(0, 20, $sEmail, $iCount) as $oCandidate) {
					if ($oCandidate->vCard && isset($oCandidate->vCard->PHOTO)) {
						$oPhoto = $oCandidate->vCard->PHOTO;
						break;
					}
				}
			}
			if (!$oPhoto) {
				return null;
			}

			$sValue = \trim((string) $oPhoto);
			if (!\strlen($sValue)) {
				return null;
			}

			// vCard 4.0: data:image/jpeg;base64,...
			if (\preg_match('#^data:(image/[a-z0-9.+-]+);base64,(.+)$#si', $sValue, $aMatch)) {
				$sBinary = \base64_decode(\preg_replace('#\s+#', '', $aMatch[2]), true);
				return $sBinary ? [\strtolower($aMatch[1]), $sBinary] : null;
			}

			// vCard 3.0: PHOTO;ENCODING=b;TYPE=JPEG:<base64>
			$sEncoding = \strtolower((string) ($oPhoto['ENCODING'] ?? ''));
			if ('b' === $sEncoding || 'base64' === $sEncoding) {
				$sBinary = \base64_decode(\preg_replace('#\s+#', '', $sValue), true);
				if ($sBinary) {
					$sType = \strtolower((string) ($oPhoto['TYPE'] ?? '')) ?: 'jpeg';
					return [\str_starts_with($sType, 'image/') ? $sType : "image/{$sType}", $sBinary];
				}
				return null;
			}

			// Either version may reference the image instead of embedding it.
			if (\preg_match('#^https?://#i', $sValue)) {
				return static::getUrl($sValue);
			}
		} catch (\Throwable $oException) {
			\SnappyMail\Log::notice('Avatar', 'contact photo lookup failed: ' . $oException->getMessage());
		}
		return null;
	}

	private static function cacheImage(string $sEmail, array $aResult) : void
	{
		if (!\is_dir(\APP_PRIVATE_DATA . 'avatars')) {
			\mkdir(\APP_PRIVATE_DATA . 'avatars', 0700);
		}
		$sEmailId = \mb_strtolower(\SnappyMail\IDN::emailToAscii($sEmail));
		if (\str_contains($sEmail, '@')) {
			$sEmailId = \sha1($sEmailId);
		}
		\file_put_contents(
			\APP_PRIVATE_DATA . 'avatars/' . $sEmailId . \SnappyMail\File\MimeType::toExtension($aResult[0]),
			$aResult[1]
		);
		\MailSo\Base\Http::setLastModified(\time());
	}

	private static function getCachedImage(string $sEmail) : ?array
	{
		$sEmail = \mb_strtolower(\SnappyMail\IDN::emailToAscii($sEmail));
		$aFiles = \glob(\APP_PRIVATE_DATA . "avatars/{$sEmail}.*");
		if (!$aFiles && \str_contains($sEmail, '@')) {
			$sEmailId = \sha1($sEmail);
			$aFiles = \glob(\APP_PRIVATE_DATA . "avatars/{$sEmailId}.*");
			if (!$aFiles) {
				$sDomain = \explode('@', $sEmail);
				$sDomain = \array_pop($sDomain);
				$aFiles = \glob(\APP_PRIVATE_DATA . "avatars/{$sDomain}.*");
			}
		}
		if ($aFiles) {
			return [
				\SnappyMail\File\MimeType::fromFile($aFiles[0]),
				\file_get_contents($aFiles[0])
			];
		}
		return null;
	}

	private static function getFavicon(string $sDomain) : ?array
	{
		$aResult = static::getUrl('https://' . $sDomain . '/favicon.ico')
			?: static::getUrl('https://' . static::serviceDomain($sDomain) . '/favicon.ico')
			?: static::getUrl('https://www.' . static::serviceDomain($sDomain) . '/favicon.ico')
			?: static::getUrl("https://www.google.com/s2/favicons?sz=48&domain_url={$sDomain}")
			?: static::getUrl("https://api.faviconkit.com/{$sDomain}/48")
//			?: static::getUrl("https://api.statvoo.com/favicon/{$sDomain}")
		;
/*
		Also detect the following?

		<link sizes="16x16" rel="shortcut icon" type="image/x-icon" href="/..." />
		<link sizes="16x16" rel="shortcut icon" type="image/png" href="/..." />
		<link sizes="32x32" rel="shortcut icon" type="image/png" href="/..." />
		<link sizes="96x96" rel="shortcut icon" type="image/png" href="/..." />

		<link sizes="36x36" rel="icon" type="image/png" href="/..." />
		<link sizes="48x48" rel="icon" type="image/png" href="/..." />
		<link sizes="72x72" rel="icon" type="image/png" href="/..." />
		<link sizes="96x96" rel="icon" type="image/png" href="/..." />
		<link sizes="144x144" rel="icon" type="image/png" href="/..." />
		<link sizes="192x192" rel="icon" type="image/png" href="/..." />

		<link sizes="57x57" rel="apple-touch-icon" type="image/png" href="/..." />
		<link sizes="60x60" rel="apple-touch-icon" type="image/png" href="/..." />
		<link sizes="72x72" rel="apple-touch-icon" type="image/png" href="/..." />
		<link sizes="76x76" rel="apple-touch-icon" type="image/png" href="/..." />
		<link sizes="114x114" rel="apple-touch-icon" type="image/png" href="/..." />
		<link sizes="120x120" rel="apple-touch-icon" type="image/png" href="/..." />
		<link sizes="144x144" rel="apple-touch-icon" type="image/png" href="/..." />
		<link sizes="152x152" rel="apple-touch-icon" type="image/png" href="/" />
		<link sizes="180x180" rel="apple-touch-icon" type="image/png" href="/..." />
		<link sizes="192x192" rel="apple-touch-icon" type="image/png" href="/..." />
*/
		if ($aResult) {
			static::cacheImage($sDomain, $aResult);
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
