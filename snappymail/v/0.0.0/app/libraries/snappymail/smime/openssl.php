<?php

namespace SnappyMail\SMime;

use SnappyMail\File\Temporary;

/**
 * PHP 8.3.0 PKCS7_NOOLDMIMETYPE
 */

class OpenSSL
{
	private string $homedir;
	private array $headers = [];
	private int $flags = 0;
	private int $cipher_algo = \OPENSSL_CIPHER_AES_128_CBC;
	private ?string $untrusted_certificates_filename = null;

	// Used for sign and decrypt
	private $certificate; // OpenSSLCertificate|array|string
	private $privateKey; // OpenSSLAsymmetricKey|OpenSSLCertificate|array|string

	function __construct(string $homedir)
	{
		$this->homedir = $homedir;
	}

	public function certificates() : array
	{
		$keys = [];
		foreach (\glob("{$this->homedir}/*.key") as $file) {
			$data = \file_get_contents($file);
			// Can't check ENCRYPTED PRIVATE KEY
			if (\str_contains($data, '-----BEGIN PRIVATE KEY-----')) {
				$keys[] = [\basename($file), $data];
			}
		}
		$result = [];
		foreach (\glob("{$this->homedir}/*.crt") as $file) {
			$name = \basename($file);
			$certificate = \file_get_contents($file);
			$data = \openssl_x509_parse($certificate);
			if ($data) {
				$short = [
					'file' => \basename($file),
					'CN' => $data['subject']['CN'],
					'emailAddress' => $data['subject']['emailAddress'],
					'validTo' => \gmdate('Y-m-d\\TH:i:s\\Z', $data['validTo_time_t']),
					'smimesign' => false,
					'smimeencrypt' => false,
					'privateKey' => null // not found or encrypted
				];
				foreach ($data['purposes'] as $purpose) {
					if ('smimesign' === $purpose[2] || 'smimeencrypt' === $purpose[2]) {
						// [general availability, tested purpose]
						$short[$purpose[2]] = $purpose[0] || $purpose[1];
					}
				}
				foreach ($keys as $key) {
					if (\openssl_x509_check_private_key($certificate, $key[1])) {
						$short['privateKey'] = $key[0];
						break;
					}
				}
				$result[] = $short;
			} else {
				\error_log("OpenSSL parse({$file}): " . \openssl_error_string());
			}
		}
		return $result;
	}

	public function privateKeys() : array
	{
//		\glob("{$this->homedir}/*.key");
	}

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

	public function decrypt(/*string|Temporary*/ $input) : ?string
	{
		if (\is_string($input)) {
			$tmp = new Temporary('smimein-');
			if (!$tmp->putContents($input)) {
				return null;
			}
			$input = $tmp;
		}
		$output = new Temporary('smimeout-');
		if (!\openssl_pkcs7_decrypt(
			$input->filename(),
			$output->filename(),
			$this->certificate,
			$this->privateKey
		)) {
			throw new \RuntimeException('OpenSSL decrypt: ' . \openssl_error_string());
		}
		return $output->getContents();
	}

	public function encrypt(/*string|Temporary*/$input, array $certificates) : ?string
	{
		if (\is_string($input)) {
			$tmp = new Temporary('smimein-');
			if (!$tmp->putContents($input)) {
				return null;
			}
			$input = $tmp;
		}
		$output = new Temporary('smimeout-');
		$flags = \defined('PKCS7_NOOLDMIMETYPE') ? \PKCS7_NOOLDMIMETYPE : 0;
		if (!\openssl_pkcs7_encrypt(
			$input->filename(),
			$output->filename(),
			$certificates,
			$this->headers,
			$flags,
			$this->cipher_algo
		)) {
			throw new \RuntimeException('OpenSSL encrypt: ' . \openssl_error_string());
		}
		return $output->getContents();
	}

	public function sign(/*string|Temporary*/$input, bool $detached = true)
	{
		if (\is_string($input)) {
			$tmp = new Temporary('smimein-');
			if (!$tmp->putContents($input)) {
				return null;
			}
			$input = $tmp;
		}
		$output = new Temporary('smimeout-');
		if (!\openssl_pkcs7_sign(
			$input->filename(),
			$output->filename(),
			$this->certificate,
			$this->privateKey,
			$this->headers,
			$detached ? \PKCS7_DETACHED | \PKCS7_BINARY : 0, // | PKCS7_NOCERTS | PKCS7_NOATTR
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

	/**
	 * $opaque = true, when the message is not detached
	 */
	public function verify(/*string|Temporary*/$input, ?string $signers_certificates_filename = null, bool $opaque = false)
	{
		if (\is_string($input)) {
			$tmp = new Temporary('smimein-');
			if (!$tmp->putContents($input)) {
				return null;
			}
			$opaque |= \str_contains($input, 'application/pkcs7-mime') || \str_contains($input, 'application/x-pkcs7-mime');
			$input = $tmp;
		}
		$output = $opaque ? new Temporary('smimeout-') : null;
		if (true !== \openssl_pkcs7_verify(
			$input->filename(),
//			$flags = 0, // \PKCS7_NOVERIFY | \PKCS7_NOCHAIN | \PKCS7_NOSIGS
			\PKCS7_NOVERIFY | \PKCS7_NOCHAIN | \PKCS7_NOSIGS,
			$signers_certificates_filename ?: null,
			$ca_info = [],
			$this->untrusted_certificates_filename,
			$output ? $output->filename() : null,
			$output_filename = null
		)) {
			throw new \RuntimeException('OpenSSL verify: ' . \openssl_error_string());
		}
		return [
			'body' => $output ? $output->getContents() : null,
			'success' => true
		];
	}
}
