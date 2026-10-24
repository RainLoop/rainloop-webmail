<?php
/**
 * https://haveibeenpwned.com/API/v3
 * https://haveibeenpwned.com/API/Key
 */

namespace SnappyMail;

class Hibp
{
	public static function password(SensitiveString $password): int
	{
		$pass = \strtoupper(\sha1($password));
		$prefix = \substr($pass, 0, 5);
		$suffix = \substr($pass, 5);
		$response = HTTP\Request::factory()->doRequest('GET', "https://api.pwnedpasswords.com/range/{$prefix}");
		if (200 !== $response->status) {
			throw new HTTP\Exception('Hibp', $response->status);
		}
		foreach (\preg_split('/\\R/', $response->body) as $entry) {
			if ($entry) {
				$entry = \explode(':', $entry);
				if ($entry[0] === $suffix) {
					return (int) $entry[1];
				}
			}
		}
		return 0;
	}

	public static function account(string $api_key, string $email): ?array
	{
		if ($api_key) {
			$email = \rawurlencode(IDN::emailToAscii($email));
			$response = HTTP\Request::factory()->doRequest('GET', "https://haveibeenpwned.com/api/v3/breachedaccount/{$email}", null, [
				'hibp-api-key' => $api_key
			]);
			if (200 !== $response->status) {
				throw new HTTP\Exception('Hibp', $response->status);
			}
			return \json_decode($response->body, true);
		}
		return null;
	}
}
