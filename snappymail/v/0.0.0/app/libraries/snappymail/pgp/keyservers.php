<?php
/**
 * https://datatracker.ietf.org/doc/html/draft-shaw-openpgp-hkp-00

 * The last IETF draft for HKP also defines a distributed key server network, based on DNS SRV records:
 * to find the key of someone@example.com, one can ask it by requesting example.com's key server.
 *
 * https://datatracker.ietf.org/doc/html/rfc4387
 * https://datatracker.ietf.org/doc/html/rfc7929
 * https://datatracker.ietf.org/doc/html/draft-koch-openpgp-webkey-service-13
 *
 * GET https://keys.openpgp.org/pks/lookup?op=get&options=mr&search=security@snappymail.eu
 * GET https://keys.openpgp.org/vks/v1/by-fingerprint/445D265124E6072671E64D0733F868A7E35E8277
 * GET https://openpgpkey.example.org/.well-known/openpgpkey/example.org/hu/ihyath4noz8dsckzjbuyqnh4kbup6h4i?l=john.doe
 */

namespace SnappyMail\PGP;

abstract class Keyservers
{
	public static $hosts = [
		'https://keys.openpgp.org'
/*
		'https://pgp.mit.edu',
		'https://keyring.debian.org',
		'https://attester.flowcrypt.com',
		'https://zimmermann.mayfirst.org',
		'https://pool.sks-keyservers.net',
		'https://keys.mailvelope.com',
		'https://keyserver.ubuntu.com',
*/
	];

	private static function fetch(string $host, string $op, string $search, bool $fingerprint = false, bool $exact = false) : ?\SnappyMail\HTTP\Response
	{
		$host = \str_replace('hkp://', 'http://', $host);
		$host = \str_replace('hkps://', 'https://', $host);
		$search = \urlencode($search);
		$fingerprint = $fingerprint ? '&fingerprint=on' : '';
		$exact = $exact ? '&exact=on' : '';
		$url = "{$host}/pks/lookup?op={$op}&options=mr{$fingerprint}&search={$search}";
		\SnappyMail\Log::debug('PGP', $url);
		return static::HTTP()->doRequest('GET', $url);
	}

	private static $HTTP;
	private static function HTTP() : \SnappyMail\HTTP\Request
	{
		if (!static::$HTTP) {
			static::$HTTP = \SnappyMail\HTTP\Request::factory(/*'socket' or 'curl'*/);
			static::$HTTP->max_response_kb = 0;
			static::$HTTP->timeout = 15; // timeout in seconds.
		}
		return static::$HTTP;
	}

	/**
	 * Request the public key from the hkp servers
	 * Returns PGP PUBLIC KEY BLOCK
	 */
	public static function get(string $keyId) : string
	{
/*
		// add the 0x prefix if absent
		if ('0x' !== \substr($keyId, 0, 2)) {
			$keyId = '0x' . $keyId;
		}
*/
		foreach (static::$hosts as $host) {
			$oResponse = static::fetch($host, 'get', $keyId);
			if (!$oResponse) {
				\SnappyMail\Log::info('PGP', "No response for key {$keyId} on {$host}");
				continue;
			}
			if (200 !== $oResponse->status) {
				\SnappyMail\Log::debug('PGP', "{$oResponse->status} for key {$keyId} on {$host}");
				continue;
			}

			return $oResponse->body;
		}

		throw new \Exception('Could not obtain public key from the keyservers.');
	}

	/**
	 * Returns all matching keys found on a public keyserver.
	 *
	 * @param string $search  String to search for (usually an email, name, or username).
	 * @param bool $fingerprint  Provide the key fingerprint for each key.
	 * @param bool $exact  Instruct the server to search for an exact match.
	 *
	 * @throws Exception
	 */
	public static function index(string $search, bool $fingerprint = true, bool $exact = false) : array
	{
		$keys = [];
		foreach (static::$hosts as $host) {
			$oResponse = static::fetch($host, 'index', $search, $fingerprint, $exact);
			if (!$oResponse) {
				\SnappyMail\Log::info('PGP', "No response for key {$keyId} on {$host}");
				continue;
			}
			if (200 !== $oResponse->status) {
				\SnappyMail\Log::debug('PGP', "{$oResponse->status} for search `{$search}` on {$host}");
				continue;
			}

			$result = \explode("\n", $oResponse->body);
			$curKey = null;
			foreach ($result as $line) {
				// https://datatracker.ietf.org/doc/html/draft-shaw-openpgp-hkp-00#section-5.2
				$line = \explode(':', $line);
				// pub:<keyid>:<algo>:<keylen>:<creationdate>:<expirationdate>:<flags>
				if ('pub' === $line[0]) {
					if ($curKey) {
						$keys[] = $curKey;
						$curKey = null;
					}
					// Ignore invalid line
					if (7 !== \count($line)) {
						\SnappyMail\Log::info('PGP', "Invalid pub line for search `{$search}` on {$host}");
						continue;
					}
					// Ignore flagged or expired key
					if (!empty($line[6]) || (!empty($line[5]) && $line[5] <= time())) {
						continue;
					}
					$keyids[$line[4]] = $line[1];
					$curKey = [
						'keyid' => $line[1],
						'host' => $host,
						'algo' => \intval($line[2]), // https://datatracker.ietf.org/doc/html/rfc2440#section-9.1
						'keylen' => \intval($line[3]),
						'creationdate' => \strlen($line[4]) ? \intval($line[4]) : null,
						'expirationdate' => \strlen($line[5]) ? \intval($line[5]) : null,
//						'revoked'  => \str_contains($line[6], 'r'),
//						'disabled' => \str_contains($line[6], 'd'),
//						'expired'  => \str_contains($line[6], 'e'),
						'uids' => [],
					];
				}
				// uid:<escaped uid string>:<creationdate>:<expirationdate>:<flags>
				else if ('uid' === $line[0] && $curKey) {
					// Ignore invalid line
					if (5 !== \count($line)) {
						\SnappyMail\Log::info('PGP', "Invalid uid line for search `{$search}` on {$host}");
						continue;
					}
					// Ignore flagged or expired key
					if (!empty($line[4]) || (!empty($line[3]) && $line[3] <= time())) {
						continue;
					}
					$curKey['uids'][] = [
						'uid' => \urldecode($line[1]),
						'creationdate' => \strlen($line[2]) ? \intval($line[2]) : null,
						'expirationdate' => \strlen($line[3]) ? \intval($line[3]) : null,
//						'revoked'  => \str_contains($line[4], 'r'),
//						'disabled' => \str_contains($line[4], 'd'),
//						'expired'  => \str_contains($line[4], 'e'),
					];
				}
			}

			if ($curKey) {
				$keys[] = $curKey;
			}

			return $keys;
		}

		throw new \Exception('Could not obtain public key from the keyservers');
	}

	/**
	 * Sends a PGP public key to a public keyserver.
	 *
	 * @param string $host
	 * @param mixed $key  The PGP public key.
	 *
	 * @throws Exception
	 */
	public static function add(string $host, string $key)
	{
/*
		$key = PublicKey::create($key);

		if (!$this->get($key->id)) {
			$keytext = \urlencode(\trim($key));
			static::HTTP()->doRequest('POST', "{$host}/pks/add", 'keytext=' . $keytext, [
				'Content-Type: application/x-www-form-urlencoded',
				'Content-Length: ' . \strlen($keytext),
				'Connection: close'
			]);
		}
*/
	}

	/** https://wiki.gnupg.org/WKD */
	public static function wkd(string $host, string $keyid)
	{
/*
		"https://{$host}/.well-known/openpgpkey/hu/{$keyid}";
		/** https://wiki.gnupg.org/WKD
			DNS:
				openpgpkey.example.org. 300     IN      CNAME   wkd.keys.openpgp.org.

			https://openpgpkey.example.com/.well-known/openpgpkey/example.com/hu/
			else       https://example.com/.well-known/openpgpkey/hu/

			An example: https://example.com/.well-known/openpgpkey/hu/it5sewh54rxz33fwmr8u6dy4bbz8itz4
			is the direct method URL for "bernhard.reiter@example.com"
		*/
	}

	public static function dns(string $host, string $keyid)
	{
/*
		// Resource Record (RR) TYPE = 61
		\dns_get_record("{$keyid}._openpgpkey.{$host}", DNS_CNAME);
		$tlsa_record = shell_exec('timeout 5 dig +short +dnssec +time=5 TLSA ' . \escapeshellarg("{$keyid}._openpgpkey.{$host}")
			. " 2>&1 | head -n 1");
*/
	}

}
