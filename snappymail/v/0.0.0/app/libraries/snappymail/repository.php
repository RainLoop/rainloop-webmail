<?php

namespace SnappyMail;

abstract class Repository
{
	// snappyMailRepo
	const BASE_URL = 'https://snappymail.eu/repository/v2/';

	public static function get(string $path, string $proxy, string $proxy_auth) : string
	{
		$oHTTP = HTTP\Request::factory(/*'socket' or 'curl'*/);
		$oHTTP->proxy = $proxy;
		$oHTTP->proxy_auth = $proxy_auth;
		$oHTTP->max_response_kb = 0;
		$oHTTP->timeout = 15; // timeout in seconds.
		$oResponse = $oHTTP->doRequest('GET', static::BASE_URL . $path);
		if (!$oResponse) {
			throw new \Exception('No HTTP response from repository');
		}
		if (200 !== $oResponse->status) {
			throw new \Exception(static::body2plain($oResponse->body), $oResponse->status);
		}
		return $oResponse->body;
	}

//	$aRep = \json_decode($sRep);

	public static function download(string $path, string $proxy, string $proxy_auth) : string
	{
		$sTmp = APP_PRIVATE_DATA . \md5(\microtime(true).$path) . \preg_replace('/^.*?(\\.[a-z\\.]+)$/Di', '$1', $path);
		$pDest = \fopen($sTmp, 'w+b');
		if (!$pDest) {
			throw new \Exception('Cannot create temp file: '.$sTmp);
		}
		$oHTTP = HTTP\Request::factory(/*'socket' or 'curl'*/);
		$oHTTP->proxy = $proxy;
		$oHTTP->proxy_auth = $proxy_auth;
		$oHTTP->max_response_kb = 0;
		$oHTTP->timeout = 15; // timeout in seconds.
		$oHTTP->streamBodyTo($pDest);
		\set_time_limit(120);
		$oResponse = $oHTTP->doRequest('GET', static::BASE_URL . $path);
		\fclose($pDest);
		if (!$oResponse) {
			\unlink($sTmp);
			throw new \Exception('No HTTP response from repository');
		}
		if (200 !== $oResponse->status) {
			$body = \file_get_contents($sTmp);
			\unlink($sTmp);
			throw new \Exception(static::body2plain($body), $oResponse->status);
		}
		return $sTmp;
	}

	private static function body2plain(string $body) : string
	{
		return \trim(\strip_tags(
			\preg_match('@<body[^>]*>(.*)</body@si', $body, $match) ? $match[1] : $body
		));
	}

}
