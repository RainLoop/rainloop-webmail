<?php
/**
 * This class encrypts any data into JSON format.
 * Decrypted Objects are returned as Array.
 */

namespace SnappyMail;

abstract class Crypt
{
	protected static $cipher = '';

	public static function listCiphers() : array
	{
		$list = array();
		if (\function_exists('openssl_get_cipher_methods')) {
			$list = \openssl_get_cipher_methods();
			$list = \array_diff($list, \array_map('strtoupper',$list));
			$list = \array_filter($list, function($v){
				// DES/ECB/bf/rc insecure, GCM/CCM not supported
				return !\preg_match('/(^(des|bf|rc))|-(ecb|gcm|ccm)/i', $v);
			});
			\natcasesort($list);
		}
		return $list;
	}

	public static function setCipher(string $cipher) : bool
	{
		if ($cipher) {
			$ciphers = static::listCiphers();
			if (\in_array($cipher, $ciphers)) {
				static::$cipher = $cipher;
				return true;
			}
		}
		return false;
	}

	/**
	 * When $key is empty, it will use a fingerprint of the user agent.
	 */
	private static function Passphrase(?string $key) : string
	{
		return \sha1(
			($key ?: \preg_replace('/[^a-z]+/i', '', \explode(')', $_SERVER['HTTP_USER_AGENT'])[0])) . APP_SALT,
			true
		);
	}

	public static function Decrypt(array $data, string $key = null) /* : mixed */
	{
		if (3 === \count($data) && isset($data[0], $data[1], $data[2]) && \strlen($data[0])) {
			try {
				$fn = "{$data[0]}Decrypt";
				if (\method_exists(__CLASS__, $fn)) {
					$result = static::{$fn}($data[2], $data[1], $key);
					if (\is_string($result)) {
						return static::jsonDecode($result);
					}
				}
			} catch (\Throwable $e) {
				\trigger_error(__CLASS__ . "::{$fn}(): " . $e->getMessage());
			}
//			\trigger_error(__CLASS__ . '::Decrypt() invalid $data or $key');
		} else {
//			\trigger_error(__CLASS__ . '::Decrypt() invalid $data');
		}
	}

	public static function DecryptFromJSON(string $data, string $key = null) /* : mixed */
	{
		$data = static::jsonDecode($data);
		if (!\is_array($data)) {
//			\trigger_error(__CLASS__ . '::DecryptFromJSON() invalid $data');
			return null;
		}
		return static::Decrypt(\array_map('base64_decode', $data), $key);
	}

	public static function DecryptUrlSafe(string $data, string $key = null) /* : mixed */
	{
		$data = \explode('.', $data);
		if (!\is_array($data)) {
//			\trigger_error(__CLASS__ . '::DecryptUrlSafe() invalid $data');
			return null;
		}
		return static::Decrypt(\array_map('MailSo\\Base\\Utils::UrlSafeBase64Decode', $data), $key);
	}

	public static function Encrypt($data, string $key = null) : array
	{
		$data = \json_encode($data);

		try {
			$nonce = \random_bytes(\SODIUM_CRYPTO_AEAD_XCHACHA20POLY1305_IETF_NPUBBYTES);
			return ['sodium', $nonce, static::SodiumEncrypt($data, $nonce, $key)];
		} catch (\Throwable $e) {
		}

		try {
			$iv = \random_bytes(\openssl_cipher_iv_length(static::$cipher));
			return ['openssl', $iv, static::OpenSSLEncrypt($data, $iv, $key)];
		} catch (\Throwable $e) {
		}

		$salt = \random_bytes(16);
		return ['xxtea', $salt, static::XxteaEncrypt($data, $salt, $key)];
/*
		if (static::{"{$result[0]}Decrypt"}($result[2], $result[1], $key) !== $data) {
			throw new \Exception('Encrypt/Decrypt mismatch');
		}
*/
	}

	public static function EncryptToJSON($data, string $key = null) : string
	{
		return \json_encode(\array_map('base64_encode', static::Encrypt($data, $key)));
	}

	public static function EncryptUrlSafe($data, string $key = null) : string
	{
		return \implode('.', \array_map('MailSo\\Base\\Utils::UrlSafeBase64Encode', static::Encrypt($data, $key)));
	}

	public static function SodiumDecrypt(string $data, string $nonce, string $key = null) /* : string|false */
	{
		if (!\is_callable('sodium_crypto_aead_xchacha20poly1305_ietf_decrypt')) {
			throw new \Exception('sodium_crypto_aead_xchacha20poly1305_ietf_decrypt not callable');
		}
		return \sodium_crypto_aead_xchacha20poly1305_ietf_decrypt(
			$data,
			APP_SALT,
			$nonce,
			\str_pad('', \SODIUM_CRYPTO_AEAD_XCHACHA20POLY1305_IETF_KEYBYTES, static::Passphrase($key))
		);
	}

	public static function SodiumEncrypt(string $data, string $nonce, string $key = null) : string
	{
		if (!\is_callable('sodium_crypto_aead_xchacha20poly1305_ietf_encrypt')) {
			throw new \Exception('sodium_crypto_aead_xchacha20poly1305_ietf_encrypt not callable');
		}
		return \sodium_crypto_aead_xchacha20poly1305_ietf_encrypt(
			$data,
			APP_SALT,
			$nonce,
			\str_pad('', \SODIUM_CRYPTO_AEAD_XCHACHA20POLY1305_IETF_KEYBYTES, static::Passphrase($key))
		);
	}

	public static function OpenSSLDecrypt(string $data, string $iv, string $key = null) /* : string|false */
	{
		if (!$data || !$iv) {
			throw new \InvalidArgumentException('$data or $iv is empty string');
		}
		if (!static::$cipher || !\is_callable('openssl_decrypt')) {
			throw new \Exception('openssl_decrypt not callable');
		}
		return \openssl_decrypt(
			$data,
			static::$cipher,
			static::Passphrase($key),
			OPENSSL_RAW_DATA,
			$iv
		);
	}

	public static function OpenSSLEncrypt(string $data, string $iv, string $key = null) : ?string
	{
		if (!$data || !$iv) {
			throw new \InvalidArgumentException('$data or $iv is empty string');
		}
		if (!static::$cipher || !\is_callable('openssl_encrypt')) {
			throw new \Exception('openssl_encrypt not callable');
		}
		return \openssl_encrypt(
			$data,
			static::$cipher,
			static::Passphrase($key),
			OPENSSL_RAW_DATA,
			$iv
		);
	}

	public static function XxteaDecrypt(string $data, string $salt, string $key = null) /* : mixed */
	{
		if (!$data || !$salt) {
			throw new \InvalidArgumentException('$data or $salt is empty string');
		}
		$key = $salt . static::Passphrase($key);
		return \is_callable('xxtea_decrypt')
			? \xxtea_decrypt($data, $key)
			: \MailSo\Base\Xxtea::decrypt($data, $key);
	}

	public static function XxteaEncrypt(string $data, string $salt, string $key = null) : ?string
	{
		if (!$data || !$salt) {
			throw new \InvalidArgumentException('$data or $salt is empty string');
		}
		$key = $salt . static::Passphrase($key);
		return \is_callable('xxtea_encrypt')
			? \xxtea_encrypt($data, $key)
			: \MailSo\Base\Xxtea::encrypt($data, $key);
	}

	private static function jsonDecode(string $data) /*: mixed*/
	{
		return \json_decode($data, true, 512, JSON_THROW_ON_ERROR);
	}

}

\SnappyMail\Crypt::setCipher(\RainLoop\Api::Config()->Get('security', 'encrypt_cipher', 'aes-256-cbc-hmac-sha1'))
	|| \SnappyMail\Crypt::setCipher('aes-256-cbc-hmac-sha1')
	|| \SnappyMail\Crypt::setCipher('aes-256-xts');
