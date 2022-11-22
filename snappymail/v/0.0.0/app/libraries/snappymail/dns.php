<?php

namespace SnappyMail;

abstract class DNS
{
	/**
	 * $domain = 'bimigroup.org'
	 * Then a TXT lookup is done on 'default._bimi.bimigroup.org'
	 */
	public static function BIMI(string $domain) : string
	{
		$oCache = \RainLoop\Api::Actions()->Cacher();
		$BIMI = $oCache->Get("dns-bimi-{$domain}") ?: null;
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
			$values = \dns_get_record("default._bimi.{$domain}", \DNS_TXT);
			if ($values) {
				foreach ($values as $value) {
					if (\str_starts_with($value['txt'], 'v=BIMI1')) {
						$BIMI = \preg_replace('/^.+l=([^;]+)(;.*)?$/D', '$1', $value['txt']);
						$oCache->Set("dns-bimi-{$domain}", \json_encode([
							$BIMI,
							time() + $value['ttl']
						]));
						break;
					}
				}
			}
			if (!$BIMI) {
				// Don't lookup for 24 hours
				$oCache->Set("dns-bimi-{$domain}", \json_encode([
					$BIMI,
					time() + 86400
				]));
			}
		}
		return $BIMI;
	}
}
