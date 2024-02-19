<?php

namespace SnappyMail\SMime;

use SnappyMail\File\Temporary;

class OpenSSL
{
	private array $headers = [];
	private int $flags = 0;
	private int $cipher_algo = \OPENSSL_CIPHER_AES_128_CBC;
	private ?string $untrusted_certificates_filename = null;

	// Used for sign and decrypt
	private $certificate; // OpenSSLCertificate|array|string
	private $privateKey; // OpenSSLAsymmetricKey|OpenSSLCertificate|array|string

	public static function isSupported() : bool
	{
		return \defined('PKCS7_DETACHED');
	}

	public function setCertificate(/*OpenSSLCertificate|string*/$certificate)
	{
		$this->certificate = \openssl_x509_read($certificate);
		if (!$this->certificate) {
			throw new \RuntimeException('OpenSSL x509: ' . \openssl_error_string());
		}
		if ($this->privateKey && !\openssl_x509_check_private_key($this->certificate, $this->privateKey)) {
			throw new \RuntimeException('OpenSSL x509: ' . \openssl_error_string());
		}
	}

	public function setPrivateKey(/*OpenSSLAsymmetricKey|string*/$privateKey,
		#[\SensitiveParameter]
		?string $passphrase = null
	) : void
	{
		$this->privateKey = \openssl_pkey_get_private($privateKey, $passphrase);
		if (!$this->privateKey) {
			throw new \RuntimeException('OpenSSL setPrivateKey: ' . \openssl_error_string());
		}
		if ($this->certificate && !\openssl_x509_check_private_key($this->certificate, $this->privateKey)) {
			throw new \RuntimeException('OpenSSL setPrivateKey: ' . \openssl_error_string());
		}
	}

	public function decrypt(string $data) : ?string
	{
		$input = new Temporary('smimein-');
		$output = new Temporary('smimeout-');
		return ($input->putContents($data) && \openssl_pkcs7_decrypt(
			$input->filename(),
			$output->filename(),
			$this->certificate,
			$this->privateKey
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

	public function sign(/*string|Temporary*/$input, bool $detached = true)
	{
		if (\is_string($input)) {
			$input = new Temporary('smimein-');
			if (!$input->putContents($data)) {
				return null;
			}
		}
		$output = new Temporary('smimeout-');
		if (!\openssl_pkcs7_sign(
			$input->filename(),
			$output->filename(),
			$this->certificate,
			$this->privateKey,
			$this->headers,
			$detached ? \PKCS7_DETACHED | \PKCS7_BINARY : \PKCS7_BINARY, // | PKCS7_NOCERTS | PKCS7_NOATTR
			$this->untrusted_certificates_filename
		)) {
			throw new \RuntimeException('OpenSSL sign: ' . \openssl_error_string());
		}

		/**
		 * Only fetch the signed part
		 */
		$fp = $output->fopen();
		$micalg = '';
		while (!\feof($fp)) {
			$line = \fgets($fp);
			$fp = $output->fopen();
			while (!\feof($fp)) {
				$line = \fgets($fp);
/*
				if (!$micalg && \str_contains($line, 'Content-Type: multipart/signed')) {
					\preg_match('/micalg="([^"+])"/', $line, $match);
					$micalg = $match[1];
				}
*/
				if (($detached && \str_contains($line, 'Content-Type: application/x-pkcs7-signature'))
				 || (!$detached && \str_contains($line, 'Content-Type: application/x-pkcs7-mime'))
				) {
					// Skip headers
					while (\trim(\fgets($fp)));
					// Fetch the body
					$data = '';
					do {
						$line = \fgets($fp);
						if (!\trim($line)) {
							return $data;
						}
						$data .= $line;
					} while (true);
				}
			}
		}

		throw new \RuntimeException('OpenSSL sign: failed to find p7s');
	}

	public function verify(string $data, $signers_certificates_filename = null)
	{
		if (\is_string($input)) {
			$input = new Temporary('smimein-');
			if (!$input->putContents($data)) {
				return null;
			}
		}
		return true === \openssl_pkcs7_verify(
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
