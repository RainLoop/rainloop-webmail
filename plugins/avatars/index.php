<?php

class AvatarsPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Avatar',
		AUTHOR   = 'SnappyMail',
		URL      = 'https://snappymail.eu/',
		VERSION  = '1.0',
		RELEASE  = '2022-11-11',
		REQUIRED = '2.21.0',
		CATEGORY = 'Contacts',
		LICENSE  = 'MIT',
		DESCRIPTION = '';

	public function Init() : void
	{
		$this->addCss('style.css');
		$this->addJs('avatars.js');
		$this->addJsonHook('Avatar', 'DoAvatar');
		$this->addPartHook('Avatar', 'ServiceAvatar');
	}

	public function DoAvatar() : array
	{
		$bBimi = !empty($this->jsonParam('bimi'));
		$sEmail = $this->jsonParam('email');
		$aResult = static::getAvatar(\urldecode($sEmail), !empty($sEmail));
		if ($aResult) {
			$aResult = [
				'type' => $aResult[0],
				'data' => \base64_encode($aResult[1])
			];
		}
		return $this->jsonResponse(__FUNCTION__, $aResult);
	}

//	public function ServiceAvatar(...$aParts)
	public function ServiceAvatar(string $sServiceName, string $sBimi, string $sEmail)
	{
		$aResult = static::getAvatar(\urldecode($sEmail), !empty($sEmail));
		if ($aResult) {
			\header('Content-Type: '.$aResult[0]);
			echo $aResult[1];
			return true;
		}
		return false;
	}

	private static function getAvatar(string $sEmail, bool $bBimi) : ?array
	{
		if (!\strpos($sEmail, '@')) {
			return null;
		}

//		$this->verifyCacheByKey($sEmail);

		// DATA_IMAGE_USER_DOT_PIC
		$sDomain = \explode('@', $sEmail);
		$sDomain = \array_pop($sDomain);

		$BIMI = $bBimi ? \SnappyMail\DNS::BIMI($sDomain) : null;
		// TODO: process $BIMI value

		// TODO: lookup contacts vCard

		// TODO: make this optional
		$aResult = static::Gravatar($sEmail);

		if (!$aResult && \file_exists(__DIR__ . '/images/services/'.$sDomain.'.png')) {
			$aResult = [
				'image/png',
				\file_get_contents(__DIR__ . '/images/services/'.$sDomain.'.png')
			];
		}
		if (!$aResult) {
			$aResult = [
				'image/png',
				\file_get_contents(__DIR__.'/images/empty-contact.png')
			];
		}

//		$this->cacheByKey($sEmail);

		return $aResult;
	}

	private static function Gravatar(string $sEmail) : ?array
	{
		$sEmail = \MailSo\Base\Utils::IdnToAscii($sEmail, true);
		$sGravatarUrl = 'http://gravatar.com/avatar/'.\md5(\strtolower($sEmail)).'?s=80&d=404';
		$oHTTP = \SnappyMail\HTTP\Request::factory(/*'socket' or 'curl'*/);
		$oHTTP->proxy = \RainLoop\Api::Config()->Get('labs', 'curl_proxy', '');
		$oHTTP->proxy_auth = \RainLoop\Api::Config()->Get('labs', 'curl_proxy_auth', '');
		$oHTTP->max_response_kb = 0;
		$oHTTP->timeout = 15; // timeout in seconds.
		$oResponse = $oHTTP->doRequest('GET', $sGravatarUrl);
		if ($oResponse) {
			if (200 === $oResponse->status && \str_starts_with($oResponse->getHeader('content-type'), 'image/')) {
				return [
					$oResponse->getHeader('content-type'),
					$oResponse->body
				];
			}
			\SnappyMail\Log::notice('Gravatar', "error {$oResponse->status} for {$sGravatarUrl}");
		} else {
			\SnappyMail\Log::warning('Gravatar', "failed for {$sGravatarUrl}");
		}
		return null;
	}

}
