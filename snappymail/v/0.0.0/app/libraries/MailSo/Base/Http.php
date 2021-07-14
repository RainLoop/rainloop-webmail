<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Base;

/**
 * @category MailSo
 * @package Base
 */
class Http
{
	/**
	 * @staticvar \MailSo\Base\Http $oInstance;
	 */
	public static function SingletonInstance() : self
	{
		static $oInstance = null;
		if (null === $oInstance)
		{
			$oInstance = new self;
		}

		return $oInstance;
	}

	/**
	 * @param mixed $mDefault = null
	 *
	 * @return mixed
	 */
	public function GetServer(string $sKey, $mDefault = null)
	{
		return isset($_SERVER[$sKey]) ? $_SERVER[$sKey] : $mDefault;
	}

	public function GetMethod() : string
	{
		return $this->GetServer('REQUEST_METHOD', '');
	}

	public function IsPost() : bool
	{
		return ('POST' === $this->GetMethod());
	}

	public function IsGet() : bool
	{
		return ('GET' === $this->GetMethod());
	}

	public function CheckLocalhost(string $sServer) : bool
	{
		return \in_array(\strtolower(\trim($sServer)), array(
			'localhost', '127.0.0.1', '::1', '::1/128', '0:0:0:0:0:0:0:1'
		));
	}

	public function IsLocalhost(string $sValueToCheck = '') : bool
	{
		if (empty($sValueToCheck))
		{
			$sValueToCheck = $this->GetServer('REMOTE_ADDR', '');
		}

		return $this->CheckLocalhost($sValueToCheck);
	}

	public function GetRawBody() : string
	{
		static $sRawBody = null;
		if (null === $sRawBody)
		{
			$sBody = \file_get_contents('php://input');
			$sRawBody = (false !== $sBody) ? $sBody : '';
		}
		return $sRawBody;
	}

	public function GetHeader(string $sHeader) : string
	{
		$sServerKey = 'HTTP_'.\strtoupper(\str_replace('-', '_', $sHeader));
		$sResultHeader = $this->GetServer($sServerKey, '');

		if (0 === \strlen($sResultHeader) &&
			\MailSo\Base\Utils::FunctionExistsAndEnabled('apache_request_headers'))
		{
			$sHeaders = \apache_request_headers();
			if (isset($sHeaders[$sHeader]))
			{
				$sResultHeader = $sHeaders[$sHeader];
			}
		}

		return $sResultHeader;
	}

	public function GetScheme(bool $bCheckProxy = true) : string
	{
		return $this->IsSecure($bCheckProxy) ? 'https' : 'http';
	}

	public function IsSecure(bool $bCheckProxy = true) : bool
	{
		$sHttps = \strtolower($this->GetServer('HTTPS', ''));
		if ('on' === $sHttps || ('' === $sHttps && '443' === (string) $this->GetServer('SERVER_PORT', '')))
		{
			return true;
		}

		if ($bCheckProxy && (
			('https' === \strtolower($this->GetServer('HTTP_X_FORWARDED_PROTO', ''))) ||
			('on' === \strtolower($this->GetServer('HTTP_X_FORWARDED_SSL', '')))
		))
		{
			return true;
		}

		return false;
	}

	public function GetHost(bool $bWithRemoteUserData = false, bool $bWithoutWWW = true, bool $bWithoutPort = false) : string
	{
		$sHost = $this->GetServer('HTTP_HOST', '');
		if (0 === \strlen($sHost))
		{
			$sName = $this->GetServer('SERVER_NAME');
			$iPort = (int) $this->GetServer('SERVER_PORT', 80);

			$sHost = (\in_array($iPort, array(80, 433))) ? $sName : $sName.':'.$iPort;
		}

		if ($bWithoutWWW)
		{
			$sHost = 'www.' === \substr(\strtolower($sHost), 0, 4) ? \substr($sHost, 4) : $sHost;
		}

		if ($bWithRemoteUserData)
		{
			$sUser = \trim($this->GetServer('REMOTE_USER', ''));
			$sHost = (0 < \strlen($sUser) ? $sUser.'@' : '').$sHost;
		}

		if ($bWithoutPort)
		{
			$sHost = \preg_replace('/:[\d]+$/', '', $sHost);
		}

		return $sHost;
	}

	public function GetClientIp(bool $bCheckProxy = false) : string
	{
		$sIp = '';
		if ($bCheckProxy && null !== $this->GetServer('HTTP_CLIENT_IP', null))
		{
			$sIp = $this->GetServer('HTTP_CLIENT_IP', '');
		}
		else if ($bCheckProxy && null !== $this->GetServer('HTTP_X_FORWARDED_FOR', null))
		{
			$sIp = $this->GetServer('HTTP_X_FORWARDED_FOR', '');
		}
		else
		{
			$sIp = $this->GetServer('REMOTE_ADDR', '');
		}

		return $sIp;
	}

	public function SendPostRequest(string $sUrl, array $aPost = array(), string $sCustomUserAgent = 'MailSo Http User Agent (v1)', int &$iCode = 0,
		?\MailSo\Log\Logger $oLogger = null, int $iTimeout = 20, string $sProxy = '', string $sProxyAuth = '') : string
	{
		$aOptions = array(
			CURLOPT_URL => $sUrl,
			CURLOPT_HEADER => false,
			CURLOPT_FAILONERROR => true,
			CURLOPT_SSL_VERIFYPEER => false,
			CURLOPT_RETURNTRANSFER => true,
			CURLOPT_POST => true,
			CURLOPT_POSTFIELDS => \http_build_query($aPost, '', '&'),
			CURLOPT_TIMEOUT => (int) $iTimeout
		);

		if (0 < \strlen($sCustomUserAgent))
		{
			$aOptions[CURLOPT_USERAGENT] = $sCustomUserAgent;
		}

		if (0 < \strlen($sProxy))
		{
			$aOptions[CURLOPT_PROXY] = $sProxy;
			if (0 < \strlen($sProxyAuth))
			{
				$aOptions[CURLOPT_PROXYUSERPWD] = $sProxyAuth;
			}
		}

		$oCurl = \curl_init();
		\curl_setopt_array($oCurl, $aOptions);

		if ($oLogger)
		{
			$oLogger->Write('cURL: Send post request: '.$sUrl);
		}

		$mResult = \curl_exec($oCurl);

		$iCode = (int) \curl_getinfo($oCurl, CURLINFO_HTTP_CODE);
		$sContentType = (string) \curl_getinfo($oCurl, CURLINFO_CONTENT_TYPE);

		if ($oLogger)
		{
			$oLogger->Write('cURL: Post request result: (Status: '.$iCode.', ContentType: '.$sContentType.')');
			if (false === $mResult || 200 !== $iCode)
			{
				$oLogger->Write('cURL: Error: '.\curl_error($oCurl), \MailSo\Log\Enumerations\Type::WARNING);
			}
		}

		if (\is_resource($oCurl))
		{
			\curl_close($oCurl);
		}

		return $mResult;
	}

	static public function DetectAndHackFollowLocationUrl(string $sUrl, array &$aOptions, ?\MailSo\Log\Logger $oLogger = null) : string
	{
		$sNewUrl = null;
		$sUrl = isset($aOptions[CURLOPT_URL]) ? $aOptions[CURLOPT_URL] : $sUrl;

		if (isset($aOptions[CURLOPT_FOLLOWLOCATION]) && $aOptions[CURLOPT_FOLLOWLOCATION] && 0 < \strlen($sUrl) &&
			\ini_get('open_basedir') !== '')
		{
			$aOptions[CURLOPT_FOLLOWLOCATION] = false;

			$iMaxRedirects = isset($aOptions[CURLOPT_MAXREDIRS]) ? $aOptions[CURLOPT_MAXREDIRS] : 5;
			$iRedirectLimit = $iMaxRedirects;

			if ($iRedirectLimit > 0)
			{
				$sNewUrl = $sUrl;

				$oCurl = \curl_init($sUrl);

				$aAddOptions = array(
					CURLOPT_URL => $sUrl,
					CURLOPT_HEADER => true,
					CURLOPT_NOBODY => true,
					CURLOPT_FAILONERROR => false,
					CURLOPT_SSL_VERIFYPEER => false,
					CURLOPT_FOLLOWLOCATION => false,
					CURLOPT_FORBID_REUSE => false,
					CURLOPT_RETURNTRANSFER => true,
					CURLOPT_TIMEOUT => 5
				);

				if (isset($aOptions[CURLOPT_HTTPHEADER]) && \is_array($aOptions[CURLOPT_HTTPHEADER]) && 0 < \count($aOptions[CURLOPT_HTTPHEADER]))
				{
					$aAddOptions[CURLOPT_HTTPHEADER] = $aOptions[CURLOPT_HTTPHEADER];
				}

				\curl_setopt_array($oCurl, $aAddOptions);

				do
				{
					\curl_setopt($oCurl, CURLOPT_URL, $sNewUrl);

					$sHeader = \curl_exec($oCurl);
					if (\curl_errno($oCurl))
					{
						$iCode = 0;
					}
					else
					{
						$iCode = \curl_getinfo($oCurl, CURLINFO_HTTP_CODE);
						if ($iCode === 301 || $iCode === 302)
						{
							$aMatches = array();
							\preg_match('/Location:(.*?)\n/', $sHeader, $aMatches);
							$sNewUrl = \trim(\array_pop($aMatches));

							if ($oLogger)
							{
								$oLogger->Write('cUrl: Location URL: '.$sNewUrl);
							}
						}
						else
						{
							$iCode = 0;
						}
					}

				} while ($iCode && --$iRedirectLimit);

				\curl_close($oCurl);
				if ($iRedirectLimit > 0 && 0 < \strlen($sNewUrl))
				{
					$aOptions[CURLOPT_URL] = $sNewUrl;
				}
			}
		}

		return null === $sNewUrl ? $sUrl : $sNewUrl;
	}

	/**
	 * @param resource $rFile
	 */
	public function SaveUrlToFile(string $sUrl, $rFile, string $sCustomUserAgent = 'MailSo Http User Agent (v1)', string &$sContentType = '', int &$iCode = 0,
		?\MailSo\Log\Logger $oLogger = null, int $iTimeout = 10, string $sProxy = '', string $sProxyAuth = '', array $aHttpHeaders = array(), bool $bFollowLocation = true) : bool
	{
		if (null === $sCustomUserAgent)
		{
			$sCustomUserAgent = 'MailSo Http User Agent (v1)';
		}

		if (!is_resource($rFile))
		{
			if ($oLogger)
			{
				$oLogger->Write('cURL: input resource invalid.', \MailSo\Log\Enumerations\Type::WARNING);
			}

			return false;
		}

		$sUrl = \trim($sUrl);
		if ('//' === substr($sUrl, 0, 2))
		{
			$sUrl = 'http:'.$sUrl;
		}

		$aOptions = array(
			CURLOPT_URL => $sUrl,
			CURLOPT_HEADER => false,
			CURLOPT_FAILONERROR => true,
			CURLOPT_SSL_VERIFYPEER => false,
			CURLOPT_RETURNTRANSFER => true,
			CURLOPT_FOLLOWLOCATION => !!$bFollowLocation,
			CURLOPT_MAXREDIRS => 7,
			CURLOPT_FILE => $rFile,
			CURLOPT_TIMEOUT => (int) $iTimeout
		);

		if (0 < \strlen($sCustomUserAgent))
		{
			$aOptions[CURLOPT_USERAGENT] = $sCustomUserAgent;
		}

		if (0 < \strlen($sProxy))
		{
			$aOptions[CURLOPT_PROXY] = $sProxy;
			if (0 < \strlen($sProxyAuth))
			{
				$aOptions[CURLOPT_PROXYUSERPWD] = $sProxyAuth;
			}
		}

		if (0 < \count($aHttpHeaders))
		{
			$aOptions[CURLOPT_HTTPHEADER] = $aHttpHeaders;
		}

		if ($oLogger)
		{
			$oLogger->Write('cUrl: URL: '.$sUrl);
//			if (isset($aOptions[CURLOPT_HTTPHEADER]) && \is_array($aOptions[CURLOPT_HTTPHEADER]) && 0 < \count($aOptions[CURLOPT_HTTPHEADER]))
//			{
//				$oLogger->Write('cUrl: Headers: '.\print_r($aOptions[CURLOPT_HTTPHEADER], true));
//			}
		}

		static::DetectAndHackFollowLocationUrl($sUrl, $aOptions, $oLogger);

		$oCurl = \curl_init();
		\curl_setopt_array($oCurl, $aOptions);

		$bResult = \curl_exec($oCurl);

		$iCode = (int) \curl_getinfo($oCurl, CURLINFO_HTTP_CODE);
		$sContentType = (string) \curl_getinfo($oCurl, CURLINFO_CONTENT_TYPE);

		if ($oLogger)
		{
			$oLogger->Write('cUrl: Request result: '.($bResult ? 'true' : 'false').' (Status: '.$iCode.', ContentType: '.$sContentType.')');
			if (!$bResult || 200 !== $iCode)
			{
				$oLogger->Write('cUrl: Error: '.\curl_error($oCurl), \MailSo\Log\Enumerations\Type::WARNING);
			}
		}

		if (\is_resource($oCurl))
		{
			\curl_close($oCurl);
		}

		return $bResult;
	}

	public function GetUrlAsString(string $sUrl, string $sCustomUserAgent = 'MailSo Http User Agent (v1)', string &$sContentType = '', int &$iCode = 0,
		?\MailSo\Log\Logger $oLogger = null, int $iTimeout = 10, string $sProxy = '', string $sProxyAuth = '', array $aHttpHeaders = array(), bool $bFollowLocation = true) : string
	{
		$rMemFile = \MailSo\Base\ResourceRegistry::CreateMemoryResource();
		if ($this->SaveUrlToFile($sUrl, $rMemFile, $sCustomUserAgent, $sContentType, $iCode, $oLogger, $iTimeout, $sProxy, $sProxyAuth, $aHttpHeaders, $bFollowLocation) && \is_resource($rMemFile))
		{
			\rewind($rMemFile);
			return \stream_get_contents($rMemFile);
		}

		return false;
	}

	public function ServerNotModifiedCache(int $iExpireTime, bool $bSetCacheHeader = true, string $sEtag = '') : bool
	{
		$bResult = false;
		if (0 < $iExpireTime)
		{
			$iUtcTimeStamp = \time();
			$sIfModifiedSince = $this->GetHeader('If-Modified-Since', '');
			if (0 === \strlen($sIfModifiedSince))
			{
				if ($bSetCacheHeader)
				{
					\header('Cache-Control: public', true);
					\header('Pragma: public', true);
					\header('Last-Modified: '.\gmdate('D, d M Y H:i:s', $iUtcTimeStamp - $iExpireTime).' UTC', true);
					\header('Expires: '.\gmdate('D, j M Y H:i:s', $iUtcTimeStamp + $iExpireTime).' UTC', true);

					if (0 < strlen($sEtag))
					{
						\header('Etag: '.$sEtag, true);
					}
				}
			}
			else
			{
				static::StatusHeader(304);
				$bResult = true;
			}
		}

		return $bResult;
	}

	/**
	 * @staticvar boolean $bCache
	 */
	public function ServerNoCache()
	{
		static $bCache = false;
		if (false === $bCache)
		{
			$bCache = true;
			\header('Expires: Mon, 26 Jul 1997 05:00:00 GMT');
			\header('Last-Modified: '.\gmdate('D, d M Y H:i:s').' GMT');
			\header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
			\header('Cache-Control: post-check=0, pre-check=0', false);
			\header('Pragma: no-cache');
		}
	}

	/**
	 * @staticvar boolean $bCache
	 */
	public function ServerUseCache(string $sEtag, int $iLastModified, int $iExpires)
	{
		static $bCache = false;
		if (false === $bCache)
		{
			$bCache = true;
			\header('Cache-Control: private', true);
			\header('ETag: '.$sEtag, true);
			\header('Last-Modified: '.\gmdate('D, d M Y H:i:s', $iLastModified).' UTC', true);
			\header('Expires: '.\gmdate('D, j M Y H:i:s', $iExpires).' UTC', true);
		}
	}

	public static function StatusHeader(int $iStatus, string $sCustomStatusText = '') : void
	{
		if (99 < $iStatus)
		{
			$aStatus = array(
				200 => 'OK',
				206 => 'Partial Content',
				301 => 'Moved Permanently',
				304 => 'Not Modified',
				400 => 'Bad Request',
				401 => 'Unauthorized',
				403 => 'Forbidden',
				404 => 'Not Found',
				405 => 'Method Not Allowed',
				416 => 'Requested range not satisfiable'
			);

			$sHeaderText = (0 === \strlen($sCustomStatusText) && isset($aStatus[$iStatus]) ? $aStatus[$iStatus] : $sCustomStatusText);

			\http_response_code($iStatus);
			if (isset($_SERVER['SERVER_PROTOCOL'])) {
				\header("{$_SERVER['SERVER_PROTOCOL']} {$iStatus} {$sHeaderText}", true, $iStatus);
			}
			if (\ini_get('cgi.rfc2616_headers') && false !== \strpos(\strtolower(\php_sapi_name()), 'cgi')) {
				\header("Status: {$iStatus} {$sHeaderText}");
			}
		}
	}

	public function GetPath() : string
	{
		$sUrl = \ltrim(\substr($this->GetServer('SCRIPT_NAME', ''), 0, \strrpos($this->GetServer('SCRIPT_NAME', ''), '/')), '/');
		return '' === $sUrl ? '/' : '/'.$sUrl.'/';
	}

	public function GetUrl() : string
	{
		return $_SERVER['REQUEST_URI'] ?? '';
	}

	public function GetFullUrl() : string
	{
		return $this->GetScheme().'://'.$this->GetHost(true, false).$this->GetPath();
	}
}
