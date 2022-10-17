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
			'localhost', '127.0.0.1', '::1'
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
			\MailSo\Base\Utils::FunctionCallable('apache_request_headers'))
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
			$sHost = (\strlen($sUser) ? $sUser.'@' : '').$sHost;
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
					\header('Cache-Control: public');
					\header('Pragma: public');
					\header('Last-Modified: '.\gmdate('D, d M Y H:i:s', $iUtcTimeStamp - $iExpireTime).' UTC');
					\header('Expires: '.\gmdate('D, j M Y H:i:s', $iUtcTimeStamp + $iExpireTime).' UTC');

					if (\strlen($sEtag))
					{
						\header('Etag: '.$sEtag);
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
			\header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0');
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
			\header('Cache-Control: private');
			\header('ETag: '.$sEtag);
			\header('Last-Modified: '.\gmdate('D, d M Y H:i:s', $iLastModified).' UTC');
			\header('Expires: '.\gmdate('D, j M Y H:i:s', $iExpires).' UTC');
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
				416 => 'Requested range not satisfiable',
				500 => 'Internal Server Error'
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
