<?php
/**
 * openssl req -new -newkey rsa:1024 -days 730 -nodes -x509 -keyout www.example.com.key -out www.example.com.crt
 *
 * Generate private key file (2048 BIT)
 * 		openssl genrsa -aes128 -out private.key -passout pass:ownPassword 2048
 * Generate private certificate
 * 		openssl req -x509 -sha256 -new -key private.key -passin pass:ownPassword -days 1825 -out private.cer
 */

namespace SnappyMail\SMime;

class Certificate
{
	public
		$x509 = null,
		$digest = 'sha256',
		$cipher = \OPENSSL_CIPHER_AES_256_CBC,
		$keyBits = 2048,
		$keyType = \OPENSSL_KEYTYPE_RSA,
		$days    = 1825, // max 5 years, EV = 1185, DV/OV = 825
		$distinguishedName = array(
			'commonName'             => 'SnappyMail', // max 64 bytes
			'countryName'            => 'XX', // NL
			'localityName'           => 'N/A',
			'stateOrProvinceName'    => 'N/A',
			'organizationName'       => 'SnappyMail',
			'organizationalUnitName' => '',
			'emailAddress'           => ''  // max 64 bytes
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
	function __construct($x509cert = null)
	{
		if ($x509cert) {
			$this->x509 = \openssl_x509_read($x509cert);
		}
	}

	function __destruct()
	{
		if ($this->x509) {
			\openssl_x509_free($this->x509);
		}
	}

	/**
	 * Verifies if a certificate can be used for a particular purpose
	 */
	public function checkPurpose($purpose, array $cainfo = array(), $untrustedfile = null)/*: bool|int*/
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
	public function export($notext = true) : ?string
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
	public function fingerprint($hash_algorithm = 'sha1', $raw_output = false)/*: string|bool*/
	{
		return $this->x509 ? \openssl_x509_fingerprint($this->x509, $hash_algorithm, $raw_output) : false;
	}

	/**
	 * Returns the certificate information as an array
	 */
	public function info($shortnames = true) /*: array|bool*/
	{
		return $this->x509 ? \openssl_x509_parse($this->x509, $shortnames) : false;
	}

	public static function getCipherMethods($aliases = false) : array
	{
		return \openssl_get_cipher_methods($aliases);
	}

	public function createSelfSigned($passphrase = null) : array
	{
		if ($this->x509) {
			\openssl_x509_free($this->x509);
		}

		$configargs = array(
			'digest_alg'         => $this->digest,
			'private_key_bits'   => $this->keyBits,
			'private_key_type'   => $this->keyType,
			'encrypt_key'        => true,
			'encrypt_key_cipher' => $this->cipher,
			// v3_ca    = Extensions to use when signing a CA
			// usr_cert = Extensions for when we sign normal certs (specified as default)
			'x509_extensions'    => 'v3_ca', // usr_cert
			// v3_req   = Extensions to add to a certificate request
//			'req_extensions'     => 'v3_req',
		);

		$dn = $this->distinguishedName;
		if (empty($dn['organizationalUnitName'])) {
			unset($dn['organizationalUnitName']);
		}

		$privkey    = null; // openssl_pkey_new($configargs);
		$csr        = \openssl_csr_new($dn, $privkey, $configargs);
		$this->x509 = $csr ? \openssl_csr_sign($csr, null, $privkey, $this->days, $configargs) : null;
		if ($this->x509) {
			$privatekey = '';
			$publickey = '';
			$csrStr = '';
			\openssl_pkey_export($privkey, $privatekey, $passphrase);
			\openssl_x509_export($this->x509, $publickey);
			\openssl_csr_export($csr, $csrStr);
			return array(
				'pkey' => $privatekey,
				'x509' => $publickey,
				'csr'  => $csrStr,
//				'pkcs12' => $this->asPKCS12($privkey, $passphrase/*, array $args = array()*/)
			);
		}
	}

	// returns binary data
	public function asPKCS12($priv_key, $pass = null, array $args = array()) : string
	{
		$out = '';
    	\openssl_pkcs12_export($this->x509, $out, $priv_key, $pass, $args);
    	return $out;
	}
}
