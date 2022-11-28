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
				return !\preg_match('/(^(des|bf|rc))|-(ecb|gcm|ccm|ocb|siv|cts)|wrap/i', $v);
			});
			\natcasesort($list);
		}
		return $list;
	}

	public static function cipherSupported(string $cipher) : bool
	{
		return \in_array($cipher, static::listCiphers());
	}

	public static function setCipher(string $cipher) : bool
	{
		if (static::cipherSupported($cipher)) {
			static::$cipher = $cipher;
			return true;
		}
		Log::error('Crypt', "OpenSSL no support for cipher '{$cipher}'");
		return false;
	}

	/**
	 * When $key is empty, it will use a fingerprint of the user agent.
	 */
	private static function Passphrase(?string $key) : string
	{
		if (!$key) {
			$key = isset($_COOKIE['smctoken'])
				 ? $_COOKIE['smctoken']
				 : \preg_replace('/[^a-z]+/i', '', \explode(')', $_SERVER['HTTP_USER_AGENT'])[0]);
		}
		return \sha1($key . APP_SALT, true);
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

		if (\is_callable('sodium_crypto_aead_xchacha20poly1305_ietf_decrypt')) {
			try {
				$nonce = \random_bytes(\SODIUM_CRYPTO_AEAD_XCHACHA20POLY1305_IETF_NPUBBYTES);
				return ['sodium', $nonce, static::SodiumEncrypt($data, $nonce, $key)];
			} catch (\Throwable $e) {
				Log::error('Crypt', 'Sodium ' . $e->getMessage());
			}
		}

		if (\is_callable('openssl_encrypt')) {
			try {
				$iv = \random_bytes(\openssl_cipher_iv_length(static::$cipher));
				return ['openssl', $iv, static::OpenSSLEncrypt($data, $iv, $key)];
			} catch (\Throwable $e) {
				Log::error('Crypt', 'OpenSSL ' . $e->getMessage());
			}
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
		$result = \sodium_crypto_aead_xchacha20poly1305_ietf_encrypt(
			$data,
			APP_SALT,
			$nonce,
			\str_pad('', \SODIUM_CRYPTO_AEAD_XCHACHA20POLY1305_IETF_KEYBYTES, static::Passphrase($key))
		);
		if (!$result) {
			throw new \Exception('Sodium encryption failed');
		}
		return $result;
	}

	public static function OpenSSLDecrypt(string $data, string $iv, string $key = null) /* : string|false */
	{
		if (!$data || !$iv) {
			throw new \InvalidArgumentException('$data or $iv is empty string');
		}
		if (!\is_callable('openssl_decrypt')) {
			throw new \Exception('openssl_decrypt not callable');
		}
		if (!static::$cipher) {
			throw new \Exception('openssl $cipher not set');
		}
		return \openssl_decrypt(
			$data,
			static::$cipher,
			static::Passphrase($key),
			OPENSSL_RAW_DATA,
			$iv
		);
	}

	public static function OpenSSLEncrypt(string $data, string $iv, string $key = null) : string
	{
		if (!$data || !$iv) {
			throw new \InvalidArgumentException('$data or $iv is empty string');
		}
		if (!\is_callable('openssl_encrypt')) {
			throw new \Exception('openssl_encrypt not callable');
		}
		if (!static::$cipher) {
			throw new \Exception('openssl $cipher not set');
		}
		$result = \openssl_encrypt(
			$data,
			static::$cipher,
			static::Passphrase($key),
			OPENSSL_RAW_DATA,
			$iv
		);
		if (!$result) {
			throw new \Exception('OpenSSL encryption with ' . static::$cipher . ' failed');
		}
		return $result;
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

	public static function XxteaEncrypt(string $data, string $salt, string $key = null) : string
	{
		if (!$data || !$salt) {
			throw new \InvalidArgumentException('$data or $salt is empty string');
		}
		$key = $salt . static::Passphrase($key);
		$result = \is_callable('xxtea_encrypt')
			? \xxtea_encrypt($data, $key)
			: \MailSo\Base\Xxtea::encrypt($data, $key);
		if (!$result) {
			throw new \Exception('Xxtea encryption failed');
		}
		return $result;
	}

	private static function jsonDecode(string $data) /*: mixed*/
	{
		return \json_decode($data, true, 512, JSON_THROW_ON_ERROR);
	}

}

\SnappyMail\Crypt::setCipher(\RainLoop\Api::Config()->Get('security', 'encrypt_cipher', 'aes-256-cbc-hmac-sha1'));
