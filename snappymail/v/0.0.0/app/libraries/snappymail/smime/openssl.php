<?php

namespace SnappyMail\SMime;

use SnappyMail\File\Temporary;

class OpenSSL
{
	private array $headers = [];
	private int $flags = 0;
	private int $cipher_algo = \OPENSSL_CIPHER_AES_128_CBC;
	private ?string $untrusted_certificates_filename = null;
	private $certificate; // OpenSSLCertificate|array|string
	private $private_key; // OpenSSLAsymmetricKey|OpenSSLCertificate|array|string

	public static function isSupported() : bool
	{
		return \defined('PKCS7_DETACHED');
	}

	public function setPrivateKey($private_key = null,
		#[\SensitiveParameter]
		?string $passphrase = null
	) : void
	{
		$this->private_key = \openssl_pkey_get_private($private_key, $passphrase);
	}

	public function decrypt(string $data, $certificate = null, $private_key = null) : ?string
	{
		$input = new Temporary('smimein-');
		$output = new Temporary('smimeout-');
		return ($input->putContents($data) && \openssl_pkcs7_decrypt(
			$input->filename(),
			$output->filename(),
			$certificate ?: $this->certificate, // \openssl_pkey_get_public();
			$private_key ?: $this->private_key  // \openssl_pkey_get_private($private_key, ?string $passphrase = null);
		)) ? $output->getContents() : null;
	}

	public function encrypt(/*string|Temporary*/$input, array $certificates) : ?string
	{
		if (\is_string($input)) {
			$input = new Temporary('smimein-');
			if (!$input->putContents($data)) {
				return null;
			}
		}
		$output = new Temporary('smimeout-');
		$flags = \defined('PKCS7_NOOLDMIMETYPE') ? \PKCS7_NOOLDMIMETYPE : 0;
		return \openssl_pkcs7_encrypt(
			$input->filename(),
			$output->filename(),
			$certificates,
			$this->headers,
			$flags,
			$this->cipher_algo
		) ? $output->getContents() : null;
	}

	public function sign(/*string|Temporary*/$input, $certificate = null, $private_key = null)
	{
		if (\is_string($input)) {
			$input = new Temporary('smimein-');
			if (!$input->putContents($data)) {
				return null;
			}
		}
		$output = new Temporary('smimeout-');
		if (!$input->putContents($data) || !\openssl_pkcs7_sign(
			$input->filename(),
			$output->filename(),
			$certificate ?: $this->certificate, // \openssl_pkey_get_public();
			$private_key ?: $this->private_key, // \openssl_pkey_get_private($private_key, ?string $passphrase = null);
			$this->headers,
			\PKCS7_DETACHED, // | PKCS7_NOCERTS | PKCS7_NOATTR
			$this->untrusted_certificates_filename
		)) {
			return null;
		}
/*
		$body = $output->getContents();
		// The message returned by openssl contains both headers and body, so need to split them up
		$parts = explode("\n\n", $body, 2);
		$this->MIMEHeader .= $parts[0] . static::$LE . static::$LE;
		$body = $parts[1];
*/
		return $output->getContents();
	}

	public function verify(string $data, $signers_certificates_filename = null)
	{
		$input = new Temporary('smimein-');
		return $input->putContents($data) && true === \openssl_pkcs7_verify(
			$input->filename(),
			$flags = 0,
			$signers_certificates_filename ?: null,
			$ca_info = [],
			$this->untrusted_certificates_filename,
			$content = null,
			$output_filename = null
		);
	}
}
