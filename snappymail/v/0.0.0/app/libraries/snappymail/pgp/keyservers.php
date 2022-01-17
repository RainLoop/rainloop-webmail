<?php
/**
 * https://datatracker.ietf.org/doc/html/draft-shaw-openpgp-hkp-00

 * The last IETF draft for HKP also defines a distributed key server network, based on DNS SRV records:
 * to find the key of someone@example.com, one can ask it by requesting example.com's key server.
 *
 * https://datatracker.ietf.org/doc/html/rfc4387
 * https://datatracker.ietf.org/doc/html/rfc7929
 */

namespace SnappyMail\PGP;

abstract class Keyservers
{
	public static $keyservers = [
/*
		'hkp://keys.gnupg.net',
		'hkps://keyserver.ubuntu.com',
		keys.openpgp.org
		pgp.mit.edu
		keyring.debian.org
		keyserver.ubuntu.com
		attester.flowcrypt.com
		zimmermann.mayfirst.org
*/
		'https://keys.fedoraproject.org'
	];

	private static function fetch(string $host, string $op, string $search, bool $fingerprint = false, bool $exact = false) : ?Response
	{
		$search = \urlencode($search);
		$fingerprint = $fingerprint ? '&fingerprint=on' : '';
		$exact = $exact ? '&exact=on' : '';
		return static::HTTP()->doRequest('GET', "{$host}/pks/lookup?op={$op}&options=mr{$fingerprint}&search={$search}");
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
		// add the 0x prefix if absent
		if ('0x' !== \substr($keyId, 0, 2)) {
			$keyId = '0x' . $keyId;
		}

		foreach ($this->keyservers as $host) {
			$oResponse = static::fetch($host, 'get', $keyId);
			if (!$oResponse) {
				\SnappyMail\Log::info('PGP', "No response for key {$keyId} on {$host}");
				continue;
			}
			if (200 !== $oResponse->status) {
				\SnappyMail\Log::info('PGP', "{$oResponse->status} for key {$keyId} on {$host}");
				continue;
			}

			return $oResponse->body;
		}

		throw new \Exception('Could not obtain public key from the keyserver.');
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
		foreach ($this->keyservers as $host) {
			$oResponse = static::fetch($host, 'index', $search, $fingerprint, $exact);
			if (!$oResponse) {
				\SnappyMail\Log::info('PGP', "No response for key {$keyId} on {$host}");
				continue;
			}
			if (200 !== $oResponse->status) {
				\SnappyMail\Log::info('PGP', "{$oResponse->status} for search `{$search}` on {$host}");
				continue;
			}

			$result = \explode("\n", $oResponse->body);
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
}
