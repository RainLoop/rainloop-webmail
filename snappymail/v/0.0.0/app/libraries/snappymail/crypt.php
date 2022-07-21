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
					return \json_decode($result, true);
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
		$data = \json_decode($data, true);
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
		if (\is_callable('sodium_crypto_aead_xchacha20poly1305_ietf_encrypt')) {
			$nonce = \random_bytes(\SODIUM_CRYPTO_AEAD_XCHACHA20POLY1305_IETF_NPUBBYTES);
			$result = ['sodium', $nonce, static::SodiumEncrypt($data, $nonce, $key)];
		} else if (static::$cipher && \is_callable('openssl_encrypt')) {
			$iv = \random_bytes(\openssl_cipher_iv_length(static::$cipher));
			$result = ['openssl', $iv, static::OpenSSLEncrypt($data, $iv, $key)];
		} else {
			$salt = \random_bytes(16);
			$result = ['xxtea', $salt, static::XxteaEncrypt($data, $salt, $key)];
		}
/*
		if (static::{"{$result[0]}Decrypt"}($result[2], $result[1], $key) !== $data) {
			throw new \Exception('Encrypt/Decrypt mismatch');
		}
*/
		return $result;
	}

	public static function EncryptToJSON($data, string $key = null) : string
	{
		return \json_encode(\array_map('base64_encode', static::Encrypt($data, $key)));
	}

	public static function EncryptUrlSafe($data, string $key = null) : string
	{
		return \implode('.', \array_map('MailSo\\Base\\Utils::UrlSafeBase64Encode', static::Encrypt($data, $key)));
	}

	public static function SodiumDecrypt(string $data, string $nonce, string $key = null) /* : mixed */
	{
		if (!\is_callable('sodium_crypto_aead_xchacha20poly1305_ietf_decrypt')) {
			return null;
		}
		return \sodium_crypto_aead_xchacha20poly1305_ietf_decrypt(
			$data,
			APP_SALT,
			$nonce,
			\str_pad('', \SODIUM_CRYPTO_AEAD_XCHACHA20POLY1305_IETF_KEYBYTES, static::Passphrase($key))
		);
	}

	public static function SodiumEncrypt(string $data, string $nonce, string $key = null) : ?string
	{
		if (!\is_callable('sodium_crypto_aead_xchacha20poly1305_ietf_encrypt')) {
			return null;
		}
		return \sodium_crypto_aead_xchacha20poly1305_ietf_encrypt(
			$data,
			APP_SALT,
			$nonce,
			\str_pad('', \SODIUM_CRYPTO_AEAD_XCHACHA20POLY1305_IETF_KEYBYTES, static::Passphrase($key))
		);
	}

	public static function OpenSSLDecrypt(string $data, string $iv, string $key = null) /* : mixed */
	{
		if (!$data || !$iv || !static::$cipher || !\is_callable('openssl_decrypt')) {
			return null;
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
		if (!$data || !$iv || !static::$cipher || !\is_callable('openssl_encrypt')) {
			return null;
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
			return null;
		}
		$key = $salt . static::Passphrase($key);
		return \is_callable('xxtea_decrypt')
			? \xxtea_decrypt($data, $key)
			: \MailSo\Base\Xxtea::decrypt($data, $key);
	}

	public static function XxteaEncrypt(string $data, string $salt, string $key = null) : ?string
	{
		if (!$data || !$salt) {
			return null;
		}
		$key = $salt . static::Passphrase($key);
		return \is_callable('xxtea_encrypt')
			? \xxtea_encrypt($data, $key)
			: \MailSo\Base\Xxtea::encrypt($data, $key);
	}

}

\SnappyMail\Crypt::setCipher(\RainLoop\Api::Config()->Get('security', 'encrypt_cipher', 'aes-256-cbc-hmac-sha1'))
	|| \SnappyMail\Crypt::setCipher('aes-256-cbc-hmac-sha1')
	|| \SnappyMail\Crypt::setCipher('aes-256-xts');
