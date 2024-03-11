<?php
/**
 * Internationalized domain names
 */

namespace SnappyMail;

abstract class IDN
{
	public static function anyToAscii(string $string) : string
	{
		if (\preg_match('#[:/]#', $string)) {
			return static::uri($string, true);
		}
		if (\strpos($string, '@')) {
			return static::emailAddress($string, true);
		}
		return \idn_to_ascii($string);
	}

	public static function anyToUtf8(string $string) : string
	{
		if (\preg_match('#[:/]#', $string)) {
			return static::uri($string, false);
		}
		if (\strpos($string, '@')) {
			return static::emailAddress($string, false);
		}
		return \idn_to_utf8($string);
	}

	public static function emailToAscii(string $address) : string
	{
		return static::emailAddress($address, true);
	}

	public static function emailToUtf8(string $address) : string
	{
		return static::emailAddress($address, false);
	}

	public static function uriToAscii(string $address) : string
	{
		return static::uri($address, true);
	}

	public static function uriToUtf8(string $address) : string
	{
		return static::uri($address, false);
	}

	private static function emailAddress(string $address, bool $toAscii) : string
	{
		if (\str_contains($address, '@')) {
			$local = \explode('@', $address);
			$domain = \array_pop($local);
			$local = \implode('@', $local);
			$arr = \explode('.', $domain);
			foreach ($arr as $k => $v) {
				$conv = $toAscii ? \idn_to_ascii($v) : \idn_to_utf8($v);
				if ($conv) $arr[$k] = $conv;
			}
			return $local . '@' . \implode('.', $arr);
		}
		return $toAscii ? \idn_to_ascii($address) : \idn_to_utf8($address);
	}

	private static function uri(string $address, bool $toAscii) : string
	{
		if (\preg_match('#[:\./]#', $address)) {
			$parsed = \parse_url($address);
			if (isset($parsed['host'])) {
				$arr = \explode('.', $parsed['host']);
				foreach ($arr as $k => $v) {
					$conv = $toAscii ? \idn_to_ascii($v) : \idn_to_utf8($v);
					if ($conv) $arr[$k] = $conv;
				}
				$parsed['host'] = \implode('.', $arr);

				$url = '//';
				if (!empty($parsed['scheme']))   { $url = $parsed['scheme'] . (\strtolower($parsed['scheme']) === 'mailto' ? ':' : '://'); }
/*
				if (!empty($parsed['user']) || !empty($parsed['pass'])) {
					$ret_url .= $parts_arr['user'];
					if (!empty($parts_arr['pass'])) {
						$ret_url .= ':' . $parts_arr['pass'];
					}
					$ret_url .= '@';
				}
*/
				if (!empty($parsed['host']))     { $url .= $parsed['host']; }
				if (!empty($parsed['port']))     { $url .= ':'.$parsed['port']; }
				if (!empty($parsed['path']))     { $url .= $parsed['path']; }
				if (!empty($parsed['query']))    { $url .= '?'.$parsed['query']; }
				if (!empty($parsed['fragment'])) { $url .= '#'.$parsed['fragment']; }
				return $url;
			}

			// parse_url seems to have failed, try without it
			$arr = \explode('.', $address);
			foreach ($arr as $k => $v) {
				$conv = $toAscii ? \idn_to_ascii($v) : \idn_to_utf8($v);
				if ($conv) $arr[$k] = $conv;
			}
			return \implode('.', $arr);
		}
		return $toAscii ? \idn_to_ascii($address) : \idn_to_utf8($address);
	}

}
