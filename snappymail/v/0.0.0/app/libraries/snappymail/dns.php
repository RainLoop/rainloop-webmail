<?php

namespace SnappyMail;

abstract class DNS
{
	/**
	 * $domain = 'bimigroup.org'
	 * $selector = 'default'
	 * Then a TXT lookup is done on 'default._bimi.bimigroup.org'
	 */
	public static function BIMI(string $domain, string $selector = 'default') : string
	{
		$selector = \trim($selector) ?: 'default';
		$oCache = \RainLoop\Api::Actions()->Cacher();
		$sCacheKey = "dns-bimi-{$domain}-{$selector}";
		$BIMI = $oCache->Get($sCacheKey);
		if ($BIMI) {
			$BIMI = \json_decode($BIMI);
			if ($BIMI[1] < \time()) {
				$BIMI = null;
			} else {
				$BIMI = $BIMI[0];
			}
		}
		if (null === $BIMI) {
			$BIMI = '';
			$values = \dns_get_record("{$selector}._bimi.{$domain}", \DNS_TXT);
			if ($values) {
				foreach ($values as $value) {
					if (\str_starts_with($value['txt'], 'v=BIMI1')) {
						$BIMI = \preg_replace('/^.+l=([^;]+)(;.*)?$/D', '$1', $value['txt']);
						$oCache->Set($sCacheKey, \json_encode([
							$BIMI,
							time() + $value['ttl']
						]));
						break;
					}
				}
			}
			if (!$BIMI) {
				// Don't lookup for 24 hours
				$oCache->Set($sCacheKey, \json_encode([
					$BIMI,
					time() + 86400
				]));
			}
		}
		return $BIMI;
	}

	public static function MX(string $domain) : array
	{
		$mxhosts = array();
		$values = \dns_get_record($domain, \DNS_MX);
		if ($values) {
			foreach ($values as $record) {
				$mxhosts[$record['pri']] = $record['target'];
			}
		}
		if (!$mxhosts) {
			\getmxrr($domain, $mxhosts);
		}
		\ksort($mxhosts);
		return \array_values($mxhosts);
	}

	public static function SRV(string $domain) : array
	{
		$result = array();
		$values = \dns_get_record($domain, \DNS_SRV);
		if ($values) {
			foreach ($values as $record) {
				$result[$record['pri']] = $record;
			}
		}
		\ksort($result);
		return \array_values($result);
	}
}
