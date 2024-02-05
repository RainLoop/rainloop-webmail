<?php
/**
 * https://datatracker.ietf.org/doc/draft-bucksch-autoconfig/
 */

namespace RainLoop\Providers\Domain;

abstract class Autoconfig
{
	public static function discover(string $emailaddress)
	{
		$domain = \explode('@', $emailaddress, 2)[1];
		// First try
		$autoconfig = static::resolve($domain, $emailaddress);
		// Else try MX
		if (!$autoconfig) {
			// regular expression is too large
			$suffixes = static::publicsuffixes();
			$hostnames = [];
			foreach (\SnappyMail\DNS::MX($domain) as $hostname) {
				// Extract only the second-level domain from the MX hostname
				$mxbasedomain = \explode('.', $hostname);
				$i = -2;
				while (\in_array(\implode('.', \array_slice($mxbasedomain, $i)), $suffixes)) {
					--$i;
				}
				$mxbasedomain = \implode('.', \array_slice($mxbasedomain, $i));
				if ($mxbasedomain) {
					$mxfulldomain = $mxbasedomain;
					if (\substr_count($hostname, '.') > \substr_count($mxbasedomain, '.')) {
						// Remove the first component from the MX hostname
						$mxfulldomain = \explode('.', $hostname, 2)[1];
					}
					$hostnames[$mxfulldomain] = $mxbasedomain;
				}
			}
			foreach ($hostnames as $mxfulldomain => $mxbasedomain) {
				if ($domain != $mxfulldomain) {
					$autoconfig = static::resolve($mxfulldomain, $emailaddress);
					if (!$autoconfig && $mxfulldomain != $mxbasedomain && $domain != $mxbasedomain) {
						$autoconfig = static::resolve($mxbasedomain, $emailaddress);
					}
					if ($autoconfig) {
						break;
					}
				}
			}
		}
		return $autoconfig;
	}

	private static function resolve(string $domain, string $emailaddress)
	{
		$emailaddress = \urlencode($emailaddress);
		foreach ([
			// 4.1. Mail provider
			"https://autoconfig.{$domain}/.well-known/mail-v1.xml?emailaddress={$emailaddress}",
			"https://{$domain}/.well-known/autoconfig/mail/config-v1.1.xml",
			"http://autoconfig.{$domain}/mail/config-v1.1.xml",
			// 4.2. Central database
			"https://autoconfig.thunderbird.net/v1.1/{$domain}"
		] as $url) {
			$data = \file_get_contents($url);
			if ($data && \str_contains($data, '<clientConfig')) {
				$data = \json_decode(
					\json_encode(
						\simplexml_load_string($data, 'SimpleXMLElement', \LIBXML_NOCDATA)
					), true);
				if (!empty($data['emailProvider'])) {
					$data = $data['emailProvider'];
					unset($data['documentation']);
					$data['incomingServer'] = \array_filter(
						isset($data['incomingServer'][0]) ? $data['incomingServer'] : [$data['incomingServer']],
						fn($data) => 'imap' === $data['@attributes']['type']
					);
					$data['outgoingServer'] = \array_filter(
						isset($data['outgoingServer'][0]) ? $data['outgoingServer'] : [$data['outgoingServer']],
						fn($data) => 'smtp' === $data['@attributes']['type']
					);
					return $data;
				}
			}
		}
	}

	private static function publicsuffixes() : array
	{
		$oCache = \RainLoop\Api::Actions()->Cacher();
		$list = $oCache->Get('public_suffix_list') ?: null;
		if ($list) {
			$list = \json_decode($list, true);
			if ($list[1] < \time()) {
				$list = null;
			} else {
				$list = $list[0];
			}
		}
		if (null === $list) {
			$list = [];
			$data = \file_get_contents('https://publicsuffix.org/list/public_suffix_list.dat');
			if ($data) {
				$list = \array_filter(
					\explode("\n", $data),
					fn($text) => \strlen($text) && '/' !== $text[0] && '*' !== $text[0] && \substr_count($text, '.')
				);
			}
			// Don't lookup for 24 hours
			$oCache->Set('public_suffix_list', \json_encode([$list, time() + 86400]));
		}
		return $list ?: [];
	}

}
