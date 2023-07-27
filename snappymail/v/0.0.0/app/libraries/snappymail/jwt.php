<?php

namespace SnappyMail;

use MailSo\Base\Utils;

abstract class JWT
{
	private static function jsonEncode($data)
	{
		return Utils::UrlSafeBase64Encode(\json_encode($payload, JSON_THROW_ON_ERROR));
	}

	private static function jsonDecode($data)
	{
		$data = Utils::UrlSafeBase64Decode($data);
		return \json_decode($data, false, 8, JSON_BIGINT_AS_STRING | JSON_THROW_ON_ERROR);
	}

	/**
	 * Decodes a JWT string into a PHP object.
	 *
	 * @param string        $jwt            The JWT
	 * @param string|array  $key            The key, or map of keys.
	 *                                      If the algorithm used is asymmetric, this is the public key
	 * @param int           $timestamp      Allow the current timestamp to be specified. default time()
	 * @param int           $leeway         When checking nbf (Not Before) Claim, iat (Issued At) Claim or expiration times, we want to provide some extra leeway time to account for clock skew.
	 */
	public static function decode(string $jwt, $key, int $timestamp = null, int $leeway = 0) : object
	{
		$timestamp = $timestamp ?: \time();

		if (empty($key)) {
			throw new \InvalidArgumentException('Key may not be empty');
		}

		$jwt = \explode('.', $jwt);
		if (\count($jwt) != 3) {
			throw new \UnexpectedValueException('Wrong number of segments');
		}
		try {
			;
			$header = static::jsonDecode($jwt[0]);
		} catch (\Throwable $e) {
			throw new \UnexpectedValueException("Invalid header encoding ({$e->getMessage()})");
		}
		try {
			$payload = static::jsonDecode($jwt[1]);
		} catch (\Throwable $e) {
			throw new \UnexpectedValueException("Invalid claims encoding ({$e->getMessage()})");
		}
		$sig = Utils::UrlSafeBase64Decode($jwt[2]);

		if (empty($header->alg)) {
			throw new \UnexpectedValueException('Empty algorithm');
		}
		if (\is_array($key) || $key instanceof \ArrayAccess) {
			if (!isset($header->kid)) {
				throw new \UnexpectedValueException('"kid" empty, unable to lookup correct key');
			}
			if (!isset($key[$header->kid])) {
				throw new \DomainException('No valid key found');
			}
			$key = $key[$header->kid];
		}

		// Check the signature
		if (!static::verify("{$jwt[0]}.{$jwt[1]}", $sig, $key, $header->alg)) {
			throw new \Exception('Signature verification failed');
		}

		// Check if the nbf if it is defined. This is the time that the
		// token can actually be used. If it's not yet that time, abort.
		if (isset($payload->nbf) && $payload->nbf > ($timestamp + $leeway)) {
			throw new \Exception('Cannot handle token prior to ' . \date(\DateTime::ISO8601, $payload->nbf));
		}

		// Check that this token has been created before 'now'. This prevents
		// using tokens that have been created for later use (and haven't
		// correctly used the nbf claim).
		if (isset($payload->iat) && $payload->iat > ($timestamp + $leeway)) {
			throw new \Exception('Cannot handle token prior to ' . \date(\DateTime::ISO8601, $payload->iat));
		}

		// Check if this token has expired.
		if (isset($payload->exp) && ($timestamp - $leeway) >= $payload->exp) {
			throw new \Exception('Expired token');
		}

		return $payload;
	}

	/**
	 * Converts and signs a PHP object or array into a JWT string.
	 *
	 * @param object|array  $payload    PHP object or array
	 * @param string        $key        The private/secret key.
	 * @param string        $alg        The signing algorithm.
	 *                                  Supported algorithms are 'HS256', 'HS384', 'HS512' and 'RS256'
	 * @param mixed         $keyId
	 * @param array         $head       An array with header elements to attach
	 *
	 * @return string A signed JWT
	 */
	public static function encode($payload, string $key, string $alg = 'HS256', $keyId = null, array $header = array()) : string
	{
		$header = \array_merge($header, array('typ' => 'JWT', 'alg' => $alg));
		if ($keyId) {
			$header['kid'] = $keyId;
		}
		$segments = array(
			static::jsonEncode($header),
			static::jsonEncode($payload)
		);
		$segments[] = Utils::UrlSafeBase64Encode(static::sign(\implode('.', $segments), $key, $alg));
		return \implode('.', $segments);
	}

	/**
	 * Sign a string with a given key and algorithm.
	 *
	 * @param string            $msg    The message to sign
	 * @param string|resource   $key    The secret key
	 * @param string            $alg    The signing algorithm.
	 *                                  Supported algorithms are 'HS256', 'HS384', 'HS512' and 'RS256'
	 *
	 * @return string An encrypted message
	 */
	public static function sign(string $msg, $key, string $alg = 'HS256', string $passphrase = '') : string
	{
		switch ($alg)
		{
			case 'RS256':
			case 'RS384':
			case 'RS512':
				$free_key = !\is_resource($key);
				if ($free_key) {
					$key = \openssl_pkey_get_private($key, $passphrase);
					if (!$key) {
						throw new \InvalidArgumentException('Invalid key, reason: ' . \openssl_error_string());
					}
				}
				try {
					$details = \openssl_pkey_get_details($key);
					if (!isset($details['key']) || OPENSSL_KEYTYPE_RSA !== $details['type']) {
						throw new \InvalidArgumentException('Key is not compatible with RSA signatures');
					}
					$signature = '';
					if (!\openssl_sign($msg, $signature, $key, 'SHA'.\substr($alg,2))) {
						throw new \DomainException('OpenSSL unable to sign data: ' . \openssl_error_string());
					}
				} finally {
					if ($free_key) {
						\openssl_pkey_free($key);
					}
				}
				return $signature;

			case 'HS256':
			case 'HS512':
			case 'HS384':
				$algo = 'SHA' . \substr($alg, 2);
				if (\in_array($algo, \hash_algos())) {
					return \hash_hmac($algo, $msg, $key, true);
				}

			default:
				throw new \InvalidArgumentException("Algorithm '{$alg}' not supported");
		}
	}

	/**
	 * Verify a signature with the message, key and method. Not all methods
	 * are symmetric, so we must have a separate verify and sign method.
	 *
	 * @param string            $msg        The original message (header and body)
	 * @param string            $signature  The original signature
	 * @param string|resource   $key        For HS*, a string key works. for RS*, must be a resource of an openssl public key
	 * @param string            $alg        The algorithm
	 *
	 * @return bool
	 */
	private static function verify(string $msg, string $signature, $key, string $alg) : bool
	{
		switch ($alg)
		{
			case 'RS256':
			case 'RS384':
			case 'RS512':
				$free_key = !\is_resource($key);
				if ($free_key) {
					$key = \openssl_pkey_get_public($key);
					if (!$key) {
						throw new \InvalidArgumentException('Invalid key, reason: ' . openssl_error_string());
					}
				}
				try {
					$details = \openssl_pkey_get_details($key);
					if (!isset($details['key']) || OPENSSL_KEYTYPE_RSA !== $details['type']) {
						throw new \InvalidArgumentException('Key is not compatible with RSA signatures');
					}
					$success = \openssl_verify($msg, $signature, $key, 'SHA'.\substr($alg,2));
					if (-1 == $success) {
						throw new \DomainException('OpenSSL unable to verify data: ' . \openssl_error_string());
					}
				} finally {
					if ($free_key) {
						\openssl_pkey_free($key);
					}
				}
				return $success;

			case 'HS256':
			case 'HS512':
			case 'HS384':
				$algo = 'SHA' . \substr($alg, 2);
				if (\in_array($algo, \hash_algos())) {
					return \hash_equals($signature, \hash_hmac($algo, $msg, $key, true));
				}

			// Ecdsa
//			case 'ES256':
//			case 'ES384':
//			case 'ES512':
			default:
				throw new \InvalidArgumentException("Algorithm '{$alg}' not supported");
		}
	}

}
