<?php

namespace SnappyMail\SMime;

class Certificate
{
	public
		$x509 = null,
		$pkey = null,

		$digest = 'sha256',
		$cipher = \OPENSSL_CIPHER_AES_256_CBC,
		$keyBits = 4096,
		$keyType = \OPENSSL_KEYTYPE_RSA,
		$days    = 1185, // EV = 1185, DV/OV = 825
		$distinguishedName = array(
			'commonName'   => '', // max 64 bytes
			'emailAddress' => ''  // max 64 bytes
		),
		$challengePassphrase; // min 4, max 20 bytes

	// add_entry_by_NID
	private $NID = [
		13 => 'commonName',
		14 => 'countryName',
		15 => 'localityName',
		16 => 'stateOrProvinceName',
		17 => 'organizationName',
		18 => 'organizationalUnitName',
		48 => 'emailAddress',
	];

	/**
	 * A string having the format file://path/to/cert.pem; the named file must contain a PEM encoded certificate
	 * A string containing the content of a certificate, PEM encoded, may start with -----BEGIN CERTIFICATE-----
	 */
	function __construct($x509cert = null, $privateKey = null)
	{
		if ($x509cert) {
			$x509cert = \openssl_x509_read($x509cert);
			if (!$x509cert) {
				throw new \RuntimeException('OpenSSL x509: ' . \openssl_error_string());
			}
			$this->x509 = $x509cert;
			if ($privateKey && \openssl_x509_check_private_key($this->x509, $privateKey)) {
				$this->pkey = $privateKey;
			}
		}
	}

	function __destruct()
	{
	}

	/**
	 * Verifies if a certificate can be used for a particular purpose
	 */
	public function checkPurpose(int $purpose, array $cainfo = array(), ?string $untrustedfile = null)/*: bool|int*/
	{
		if ($this->x509) {
			return \openssl_x509_checkpurpose($this->x509, $purpose, $cainfo, $untrustedfile);
		}
		return false;
	}

	public function canSign() : bool
	{
		return $this->x509
			? true === \openssl_x509_checkpurpose($this->x509, \X509_PURPOSE_SMIME_SIGN)
			: false;
	}

	public function canEncrypt() : bool
	{
		return $this->x509
			? true === \openssl_x509_checkpurpose($this->x509, \X509_PURPOSE_SMIME_ENCRYPT)
			: false;
	}

	/**
	 * Returns the certificate in a PEM encoded format string
	 */
	public function export(bool $notext = true) : ?string
	{
		if ($this->x509) {
			$output = '';
			if (\openssl_x509_export($this->x509, $output, $notext)) {
				return $output;
			}
		}
		return null;
	}

	/**
	 * Returns the fingerprint or digest of the certificate
	 */
	public function fingerprint(string $hash_algorithm = 'sha1', bool $raw_output = false)/*: string|bool*/
	{
		return $this->x509 ? \openssl_x509_fingerprint($this->x509, $hash_algorithm, $raw_output) : false;
	}

	/**
	 * Returns the certificate information as an array
	 */
	public function info(bool $shortnames = true) /*: array|bool*/
	{
		return $this->x509 ? \openssl_x509_parse($this->x509, $shortnames) : false;
	}

	public static function getCipherMethods(bool $aliases = false) : array
	{
		return \openssl_get_cipher_methods($aliases);
	}

	public function createSelfSigned(
		#[\SensitiveParameter]
		string $passphrase = '',
		?string $privateKey = null
	) : array
	{
		$options = array(
			'config'             => __DIR__ . '/openssl.cnf',
			'digest_alg'         => $this->digest,
			'private_key_bits'   => $this->keyBits,
			'private_key_type'   => $this->keyType,
			'encrypt_key'        => true,
			'encrypt_key_cipher' => $this->cipher,
			// v3_ca    = Extensions to use when signing a CA
			// usr_cert = Extensions for when we sign normal certs (specified as default)
			'x509_extensions'    => 'snappymail_ca', // v3_ca | usr_cert
			// Extensions to add to a certificate request
			'req_extensions'     => 'snappymail_req', // v3_req
		);

		$dn = $this->distinguishedName;
		if (empty($dn['organizationalUnitName'])) {
			unset($dn['organizationalUnitName']);
		}

		$pkey = null; // openssl_pkey_new($options);
		if ($privateKey) {
			$pkey = \openssl_pkey_get_private($privateKey, $passphrase);
			if (!$pkey) {
				throw new \RuntimeException('OpenSSL pkey: ' . \openssl_error_string());
			}
		}
		$csr = \openssl_csr_new($dn, $pkey, $options);
		if ($csr) {
			$this->x509 = \openssl_csr_sign(
				$csr,
				\file_get_contents(__DIR__ . '/snappymail.crt'),
				\file_get_contents(__DIR__ . '/snappymail.key'),
				$this->days,
				$options
			);
			if ($this->x509/* && $this->canSign() && $this->canEncrypt()*/) {
				$this->pkey = $pkey;
				$privateKey || \openssl_pkey_export($pkey, $privateKey, $passphrase);
				$certificate = '';
				\openssl_x509_export($this->x509, $certificate);
				return array(
					'pkey' => $privateKey,
					'x509' => $certificate,
//					'pkcs12' => $this->asPKCS12($pkey, $passphrase/*, array $args = array()*/)
//					'canSign' => $this->canSign(),
//					'canEncrypt' => $this->canEncrypt()
				);
			} else {
				throw new \RuntimeException('OpenSSL sign: ' . \openssl_error_string());
			}
		} else {
			throw new \RuntimeException('OpenSSL csr: ' . \openssl_error_string());
		}
		return [];
	}

	// returns binary data
	public function asPKCS12(
		#[\SensitiveParameter]
		string $pass = '',
		array $args = array()
	) : string
	{
		$out = '';
    	\openssl_pkcs12_export($this->x509, $out, $this->pkey, $pass, $args);
    	return $out;
	}
}
