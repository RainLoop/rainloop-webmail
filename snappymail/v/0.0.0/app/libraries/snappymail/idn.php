<?php
/**
 * Internationalized domain names
 */

namespace SnappyMail;

abstract class IDN
{
	public static function anyToAscii(string $string) : string
	{
		if (\strspn($string, ':/')) {
			return static::uri($string, true);
		}
		if (\str_contains($string, '@')) {
			return static::emailToAscii($string);
		}
		return \idn_to_ascii($string);
	}

	public static function anyToUtf8(string $string) : string
	{
		if (\strspn($string, ':/')) {
			return static::uri($string, false);
		}
		if (\str_contains($string, '@')) {
			return static::emailToUtf8($string);
		}
		return \idn_to_utf8($string);
	}

	/**
	 * Converts IDN domain part to lowercased punycode
	 * Like: 'Smile😀@📧.SnappyMail.eu' to 'Smile😀@xn--du8h.snappymail.eu'
	 * When the '@' is missing, it does nothing
	 */
	public static function emailToAscii(string $address) : string
	{
		return static::emailAddress($address, true);
	}

	/**
	 * Converts IDN domain part to unicode
	 * Like: 'Smile😀@xn--du8h.SnappyMail.eu' to 'Smile😀@📧.SnappyMail.eu'
	 * When the '@' is missing, it does nothing
	 */
	public static function emailToUtf8(string $address) : string
	{
		return static::emailAddress($address, false);
	}

	private static function domain(string $domain, bool $toAscii) : string
	{
//		if ($toAscii && \preg_match('/[^\x20-\x7E]/', $domain)) {
//		if (!$toAscii && \preg_match('/(^|\\.)xn--/i', $domain)) {
		return $toAscii ? \strtolower(\idn_to_ascii($domain)) : \idn_to_utf8($domain);
/*
		$domain = \explode('.', $domain);
		foreach ($domain as $k => $v) {
			$conv = $toAscii ? \idn_to_ascii($v) : \idn_to_utf8($v);
			if ($conv) $domain[$k] = $conv;
		}
		return \implode('.', $domain);
*/
	}

	private static function emailAddress(string $address, bool $toAscii) : string
	{
		if (!\str_contains($address, '@')) {
//			throw new \RuntimeException("Invalid email address: {$address}");
			return $address;
		}
		$local = \explode('@', $address);
		$domain = static::domain(\array_pop($local), $toAscii);
		return \implode('@', $local) . '@' . $domain;
	}

	private static function uri(string $address, bool $toAscii) : string
	{
		$parsed = \parse_url($address);
		if (isset($parsed['host'])) {
			$parsed['host'] = static::domain($parsed['host'], $toAscii);

			$url = empty($parsed['scheme']) ? '//'
				: $parsed['scheme'] . (\strtolower($parsed['scheme']) === 'mailto' ? ':' : '://');
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
		return static::domain($address, $toAscii);
	}

}
