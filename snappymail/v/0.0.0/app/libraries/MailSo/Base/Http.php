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
		if (null === $oInstance) {
			$oInstance = new self;
		}

		return $oInstance;
	}

	/**
	 * @param mixed $mDefault = null
	 *
	 * @return mixed
	 */
	public static function GetServer(string $sKey, $mDefault = null)
	{
		return isset($_SERVER[$sKey]) ? $_SERVER[$sKey] : $mDefault;
	}

	public function GetMethod() : string
	{
		return static::GetServer('REQUEST_METHOD', '');
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
		if (empty($sValueToCheck)) {
			$sValueToCheck = static::GetServer('REMOTE_ADDR', '');
		}

		return $this->CheckLocalhost($sValueToCheck);
	}

	public function GetRawBody() : string
	{
		static $sRawBody = null;
		if (null === $sRawBody) {
			$sBody = \file_get_contents('php://input');
			$sRawBody = (false !== $sBody) ? $sBody : '';
		}
		return $sRawBody;
	}

	public static function GetHeader(string $sHeader) : string
	{
		$sServerKey = 'HTTP_'.\strtoupper(\str_replace('-', '_', $sHeader));
		$sResultHeader = static::GetServer($sServerKey, '');
		if (!\strlen($sResultHeader) && \MailSo\Base\Utils::FunctionCallable('apache_request_headers')) {
			$sHeaders = \apache_request_headers();
			if (isset($sHeaders[$sHeader])) {
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
		$sHttps = \strtolower(static::GetServer('HTTPS', ''));
		return ('on' === $sHttps || ('' === $sHttps && '443' === (string) static::GetServer('SERVER_PORT', '')))
		 || ($bCheckProxy && (
			('https' === \strtolower(static::GetServer('HTTP_X_FORWARDED_PROTO', ''))) ||
			('on' === \strtolower(static::GetServer('HTTP_X_FORWARDED_SSL', '')))
		   ));
	}

	public function GetHost(bool $bWithoutWWW = true, bool $bWithoutPort = false) : string
	{
		$sHost = static::GetServer('HTTP_HOST', '');
		if (!\strlen($sHost)) {
			$sName = static::GetServer('SERVER_NAME', '');
			$iPort = (int) static::GetServer('SERVER_PORT', 80);
			$sHost = (\in_array($iPort, array(80, 433))) ? $sName : $sName.':'.$iPort;
		}

		if ($bWithoutWWW && \str_starts_with($sHost, 'www.')) {
			$sHost = \substr($sHost, 4);
		}

		return $bWithoutPort ? \preg_replace('/:\d+$/', '', $sHost) : $sHost;
	}

	public function GetClientIp(bool $bCheckProxy = false) : string
	{
		if ($bCheckProxy && null !== static::GetServer('HTTP_CLIENT_IP', null)) {
			return static::GetServer('HTTP_CLIENT_IP', '');
		}
		if ($bCheckProxy && null !== static::GetServer('HTTP_X_FORWARDED_FOR', null)) {
			return static::GetServer('HTTP_X_FORWARDED_FOR', '');
		}
		return static::GetServer('REMOTE_ADDR', '');
	}

	public static function checkETag(string $ETag) : void
	{
		// $ETag . APP_VERSION
		$sIfNoneMatch = static::GetHeader('If-None-Match');
		if ($sIfNoneMatch && false !== \strpos($sIfNoneMatch, $ETag)) {
			static::StatusHeader(304);
			exit;
		}
		$sIfMatch = static::GetHeader('If-Match');
		if ($sIfMatch && false === \strpos($sIfMatch, $ETag)) {
			static::StatusHeader(412);
			exit;
		}
	}

	public static function setETag(string $ETag) : void
	{
		// $ETag . APP_VERSION
		static::checkETag($ETag);
		\header("ETag: \"{$ETag}\"");
	}

	public static function checkLastModified(int $mtime) : void
	{
		$sIfModifiedSince = static::GetHeader('If-Modified-Since');
		if ($sIfModifiedSince && $mtime <= \strtotime($sIfModifiedSince)) {
			static::StatusHeader(304);
			exit;
		}
		$sIfUnmodifiedSince = static::GetHeader('If-Unmodified-Since');
		if ($sIfUnmodifiedSince && $mtime > \strtotime($sIfUnmodifiedSince)) {
			static::StatusHeader(412);
			exit;
		}
	}

	public static function setLastModified(int $mtime) : void
	{
		static::checkLastModified($mtime);
		\header('Last-Modified: '.\gmdate('D, d M Y H:i:s \G\M\T', $mtime)); # DATE_RFC1123
	}

	private static $bCache = false;

	public function ServerNoCache()
	{
		if (!static::$bCache) {
			static::$bCache = true;
			\header('Expires: Mon, 26 Jul 1997 05:00:00 GMT');
			\header('Last-Modified: '.\gmdate('D, d M Y H:i:s').' GMT');
			\header('Cache-Control: no-store');
			\header('Pragma: no-cache');
		}
	}

	public static function ServerUseCache(string $sEtag = '', int $iLastModified = 0, int $iExpires = 0) : void
	{
		if (!static::$bCache) {
			static::$bCache = true;
			\header('Cache-Control: private');
			$iExpires && \header('Expires: '.\gmdate('D, j M Y H:i:s', \time() + $iExpires).' UTC');
			$sEtag && static::setETag($sEtag);
			$iLastModified && static::setLastModified($iLastModified);
		}
	}

	public static function StatusHeader(int $iStatus, string $sCustomStatusText = '') : void
	{
		if (99 < $iStatus) {
			$aStatus = array(
				200 => 'OK',
				206 => 'Partial Content',
				301 => 'Moved Permanently',
				302 => 'Found',
				304 => 'Not Modified',
				400 => 'Bad Request',
				401 => 'Unauthorized',
				403 => 'Forbidden',
				404 => 'Not Found',
				405 => 'Method Not Allowed',
				412 => 'Precondition Failed',
				416 => 'Requested range not satisfiable',
				500 => 'Internal Server Error'
			);

			$sHeaderText = (!\strlen($sCustomStatusText) && isset($aStatus[$iStatus]) ? $aStatus[$iStatus] : $sCustomStatusText);

			\http_response_code($iStatus);
			if (isset($_SERVER['SERVER_PROTOCOL'])) {
				\header("{$_SERVER['SERVER_PROTOCOL']} {$iStatus} {$sHeaderText}", true, $iStatus);
			}
			if (\ini_get('cgi.rfc2616_headers') && false !== \strpos(\strtolower(\php_sapi_name()), 'cgi')) {
				\header("Status: {$iStatus} {$sHeaderText}");
			}
		}
	}

	public static function Location(string $sUrl, int $iStatus = 302): void
	{
		static::StatusHeader($iStatus);
		\header('Location: ' . $sUrl);
	}

	public function GetPath() : string
	{
		$sUrl = \ltrim(\substr(static::GetServer('SCRIPT_NAME', ''), 0, \strrpos(static::GetServer('SCRIPT_NAME', ''), '/')), '/');
		return '' === $sUrl ? '/' : '/'.$sUrl.'/';
	}

	public function GetUrl() : string
	{
		return $_SERVER['REQUEST_URI'] ?? '';
	}

	public function GetFullUrl() : string
	{
		return $this->GetScheme().'://'.$this->GetHost(false).$this->GetPath();
	}
}
