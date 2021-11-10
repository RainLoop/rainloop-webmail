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
			$aCiphers = static::listCiphers();
			if (\in_array($cipher, $aCiphers)) {
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

	public static function DecryptUrlSafe($sData, string $key = null) /* : mixed */
	{
		return \json_decode(
			\zlib_decode(
				static::XxteaDecrypt(
					\MailSo\Base\Utils::UrlSafeBase64Decode($sData),
					static::Passphrase($key)
				)
			),
			true
		);
	}

	public static function EncryptUrlSafe($mData, string $key = null) : string
	{
		return \MailSo\Base\Utils::UrlSafeBase64Encode(
			static::XxteaEncrypt(
				\zlib_encode(
					\json_encode($mData),
					ZLIB_ENCODING_RAW,
					9
				),
				static::Passphrase($key)
			)
		);
	}

	public static function Decrypt(array $data, string $key = null) /* : mixed */
	{
		if (3 === \count($data) && isset($data[0], $data[1], $data[2])) {
			$fn = "{$data[0]}Decrypt";
			if (\method_exists(__CLASS__, $fn)) {
				return \SnappyMail\Crypt::{$fn}($data[2], $data[1], $key);
			}
		}
	}

	public static function DecryptFromJSON(string $data, string $key = null) /* : mixed */
	{
		$aData = \json_decode($data, true);
		return \is_array($aData) ? static::Decrypt(\array_map('base64_decode', $aData), $key) : null;
	}

	public static function Encrypt($data, string $key = null) : array
	{
		if (\is_callable('sodium_crypto_aead_xchacha20poly1305_ietf_encrypt')) {
			$nonce = \random_bytes(24);
			return ['sodium', $nonce, static::SodiumEncrypt($data, $nonce)];
		}

		if (static::$cipher && \is_callable('openssl_encrypt')) {
			$iv = \random_bytes(\openssl_cipher_iv_length(static::$cipher));
			return ['openssl', $iv, static::OpenSSLEncrypt($data, $iv)];
		}

		$salt = \random_bytes(16);
		return ['xxtea', $salt, static::XxteaEncrypt($data, $salt)];
	}

	public static function EncryptToJSON($data, string $key = null) : string
	{
		return \json_encode(\array_map('base64_encode', static::Encrypt($data, $key)));
	}

	public static function SodiumDecrypt(string $data, string $nonce, string $key = null) /* : mixed */
	{
		if (!\is_callable('sodium_crypto_aead_xchacha20poly1305_ietf_decrypt')) {
			return null;
		}
		return \json_decode(\zlib_decode(\sodium_crypto_aead_xchacha20poly1305_ietf_decrypt(
			$data,
			APP_SALT,
			$nonce,
			\str_pad('', \SODIUM_CRYPTO_AEAD_XCHACHA20POLY1305_IETF_KEYBYTES, static::Passphrase($key))
		)));
	}

	public static function SodiumEncrypt($data, string $nonce, string $key = null) : ?string
	{
		if (!\is_callable('sodium_crypto_aead_xchacha20poly1305_ietf_encrypt')) {
			return null;
		}
		return \sodium_crypto_aead_xchacha20poly1305_ietf_encrypt(
			\zlib_encode(\json_encode($data), ZLIB_ENCODING_RAW, 9),
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
		return \json_decode(\zlib_decode(\openssl_decrypt(
			$data,
			static::$cipher,
			static::Passphrase($key),
			OPENSSL_RAW_DATA,
			$iv
		)), true);
	}

	public static function OpenSSLEncrypt($data, string $iv, string $key = null) : ?string
	{
		if (!$data || !$iv || !static::$cipher || !\is_callable('openssl_encrypt')) {
			return null;
		}
		return \openssl_encrypt(
			\zlib_encode(\json_encode($data), ZLIB_ENCODING_RAW, 9),
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
		return \json_decode(\zlib_decode(\is_callable('xxtea_decrypt')
			? \xxtea_decrypt($data, $key)
			: \MailSo\Base\Xxtea::decrypt($data, $key)
		), true);
	}

	public static function XxteaEncrypt($data, string $salt, string $key = null) : ?string
	{
		if (!$data || !$salt) {
			return null;
		}
		$data = \zlib_encode(\json_encode($data), ZLIB_ENCODING_RAW, 9);
		$key = $salt . static::Passphrase($key);
		return \is_callable('xxtea_encrypt')
			? \xxtea_encrypt($data, $key)
			: \MailSo\Base\Xxtea::encrypt($data, $key);
	}

}

\SnappyMail\Crypt::setCipher(\RainLoop\API::Config()->Get('security', 'encrypt_cipher', 'aes-256-cbc-hmac-sha1'))
	|| \SnappyMail\Crypt::setCipher('aes-256-cbc-hmac-sha1')
	|| \SnappyMail\Crypt::setCipher('aes-256-xts');
