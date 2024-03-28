<?php
/**
 * https://datatracker.ietf.org/doc/draft-bucksch-autoconfig/
 */

namespace RainLoop\Providers\Domain;

abstract class Autoconfig
{
	public static function discover(string $emailaddress) : ?array
	{
//		$emailaddress = \SnappyMail\IDN::emailToAscii($emailaddress);
		$domain = \MailSo\Base\Utils::getEmailAddressDomain($emailaddress);
//		$domain = \SnappyMail\IDN::toAscii($domain);
		$domain = \strtolower(\idn_to_ascii($domain));
		return
			// First try autoconfig
			static::resolve($domain, $emailaddress)
			// Else try MX, but it is mostly useless
//			?: static::mx($domain, $emailaddress)
			// Else try Microsoft autodiscover
			?: static::autodiscover($domain)
			// Else try DNS SRV
			?: static::srv($domain);
	}

	private static function resolve(string $domain, string $emailaddress) : ?array
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
					$data['canonical'] = $url;
					return $data;
				}
			}
		}
		return null;
	}

	private static function publicsuffixes() : array
	{
		$oCache = \RainLoop\Api::Actions()->Cacher();
		$list = $oCache->Get('public_suffix_list');
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

	private static function mx(string $domain, string $emailaddress) : ?array
	{
		$suffixes = static::publicsuffixes();
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
					return $autoconfig;
				}
			}
		}
	}

	/**
	 * https://datatracker.ietf.org/doc/html/rfc6186
	 * https://datatracker.ietf.org/doc/html/rfc8314
	 */
	private static function srv(string $domain) : ?array
	{
		$srv = \SnappyMail\DNS::SRV('_submissions._tcp.'.$domain);
		if (empty($srv[0]['target'])) {
			$srv = \SnappyMail\DNS::SRV('_submission._tcp.'.$domain);
		}
		if (!empty($srv[0]['target'])) {
			$result = [
				'incomingServer' => [],
				'outgoingServer' => [
					'hostname' => $srv[0]['target'],
					'port' => $srv[0]['port'],
					'socketType' => (587 == $srv[0]['port']) ? 'STARTTLS' : (465 == $srv[0]['port'] ? 'SSL' : ''),
					'authentication' => 'password-cleartext',
					'username' => '%EMAILADDRESS%'
				]
			];
			$srv = \SnappyMail\DNS::SRV('_imaps._tcp.'.$domain);
			if (empty($srv[0]['target'])) {
				$srv = \SnappyMail\DNS::SRV('_imap._tcp.'.$domain);
			}
			if (!empty($srv[0]['target'])) {
				$result['incomingServer'][] = [
					'hostname' => $srv[0]['target'],
					'port' => $srv[0]['port'],
					'socketType' => 993 == $srv[0]['port'] ? 'SSL' : '',
					'authentication' => 'password-cleartext',
					'username' => '%EMAILADDRESS%'
				];
				return $result;
			}
		}
		return null;
	}

	/**
	 * This is Microsoft
	 */
	private static function autodiscover(string $domain) : ?array
	{
		foreach ([
			"https://{$domain}",
			"https://autodiscover.{$domain}",
			"http://autodiscover.{$domain}"
		] as $host) {
			$result = static::autodiscover_resolve($host, $domain);
			if ($result) {
				return $result;
			}
		}
		foreach (\SnappyMail\DNS::SRV("_autodiscover._tcp.{$domain}") as $record) {
			if (443 == $record['port']) {
				$result = static::autodiscover_resolve("https://{$record['target']}", $domain);
			} else if (80 == $record['port']) {
				$result = static::autodiscover_resolve("http://{$record['target']}", $domain);
			} else {
				$result = static::autodiscover_resolve("https://{$record['target']}:{$record['port']}", $domain);
			}
			if ($result) {
				return $result;
			}
		}
		return null;
	}

	private static function autodiscover_resolve(string $host, string $domain) : ?array
	{
		$email = "autodiscover@{$domain}";
		$context = \stream_context_create(['http' => [
			'method'  => 'POST',
			'header'  => 'Content-Type: application/xml',
			'content' => '<?xml version="1.0" encoding="utf-8" ?>
		<Autodiscover xmlns="http://schemas.microsoft.com/exchange/autodiscover/outlook/requestschema/2006">
			<Request>
				<AcceptableResponseSchema>http://schemas.microsoft.com/exchange/autodiscover/outlook/responseschema/2006a</AcceptableResponseSchema>
				<EMailAddress>'.$email.'</EMailAddress>
			</Request>
		</Autodiscover>'
		]]);
		$url = "{$host}/autodiscover/autodiscover.xml";
		$xml = \file_get_contents($url, false, $context);
		if ($xml) {
			$data = \json_decode(
				\json_encode(
					\simplexml_load_string($xml, 'SimpleXMLElement', \LIBXML_NOCDATA)
				), true);
			if (!empty($data['Response']['Account']['Protocol']) && 'email' === $data['Response']['Account']['AccountType']) {
				$result = [
					'incomingServer' => [],
					'outgoingServer' => []
				];
				foreach ($data['Response']['Account']['Protocol'] as $entry) {
					if ('IMAP' === $entry['Type']) {
						$result['incomingServer'][] = [
							'hostname' => $entry['Server'],
							'port' => $entry['Port'],
							'socketType' => ('on' === $entry['SSL']) ? (993 == $entry['Port'] ? 'SSL' : 'STARTTLS') : '',
							'authentication' => 'password-cleartext',
							'username' => ($entry['LoginName'] === $email) ? '%EMAILADDRESS%' : ''
						];
					} else if ('SMTP' === $entry['Type']) {
						$result['outgoingServer'][] = [
							'hostname' => $entry['Server'],
							'port' => $entry['Port'],
							'socketType' => (587 == $entry['Port']) ? 'STARTTLS' : ('on' === $entry['SSL'] ? 'SSL' : ''),
							'authentication' => 'password-cleartext',
							'username' => ($entry['LoginName'] === $email) ? '%EMAILADDRESS%' : ''
						];
					}
				}
				$result['canonical'] = $url;
				return $result;
			}
		}
		return null;
	}

}
