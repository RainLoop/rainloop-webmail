<?php
/**
 * GnuPG
 */

namespace SnappyMail\GPG;

use SnappyMail\SensitiveString;

abstract class Base
{
	const
		// @see https://pear.php.net/bugs/bug.php?id=21077
		CHUNK_SIZE = 65536,

		// This is used to pass data to the GPG process.
		FD_INPUT = 0,

		// This is used to receive normal output from the GPG process.
		FD_OUTPUT = 1,

		// This is used to receive error output from the GPG process.
		FD_ERROR = 2,

		/**
		 * GPG status output file descriptor. The status file descriptor outputs
		 * detailed information for many GPG commands. See the second section of
		 * the file <b>doc/DETAILS</b> in the
		 * {@link http://www.gnupg.org/download/ GPG package} for a detailed
		 * description of GPG's status output.
		 */
		FD_STATUS = 3,

		// This is used for methods requiring passphrases.
		FD_COMMAND = 4,

		// This is used for passing signed data when verifying a detached signature.
		FD_MESSAGE = 5;

	public
		$strict = false;

	protected
		$binary,
		$version = '2.0',
		$pinentries = [],
		$encryptKeys = [],
		// Create PEM encoded output
		$armor = true,

		$_input,
		$_output,

		$proc_resource,
		$_openPipes, // ProcPipes

		// https://www.gnupg.org/documentation/manuals/gnupg/GPG-Configuration-Options.html
		$options = [
			'homedir' => '',
			'keyring' => '',
			'digest-algo' => '',
			'cipher-algo' => '',
		];

	function __construct(string $homedir)
	{
		$homedir = \rtrim($homedir, '/\\');
		// BSD 4.4 max length
		if (104 <= \strlen($homedir . '/S.gpg-agent.extra')) {
			throw new \Exception('Socket name for S.gpg-agent.extra is too long');
		}
		$this->options['homedir'] = $homedir;
//		\putenv("GNUPGHOME={$homedir}");
	}

	function __destruct()
	{
		$this->proc_close();

		$gpgconf = static::findBinary('gpgconf');
		if ($gpgconf) {
			$env = ['GNUPGHOME' => $this->options['homedir']];
			$pipes = [];
			if ($process = \proc_open($gpgconf . ' --kill gpg-agent --homedir ' . \escapeshellarg($this->options['homedir']), [], $pipes, null, $env)) {
				\proc_close($process);
			}
		}
	}

	public static function isSupported() : bool
	{
		return \is_callable('shell_exec') && \is_callable('proc_open');
	}

	protected function listDecryptKeys(/*string|resource*/ $input, /*string|resource*/ $output = null)
	{
		return false;
	}

	/**
	 * Decrypts a given text
	 */
	public function decrypt(string $text) /*: string|false */
	{
		return false;
	}

	/**
	 * Decrypts a given file
	 */
	public function decryptFile(string $filename) /*: string|false */
	{
		return false;
	}

	/**
	 * Decrypts a given stream
	 */
	public function decryptStream($fp, /*string|resource*/ $output = null) /*: string|false*/
	{
		return false;
	}

	/**
	 * Decrypts and verifies a given text
	 */
	public function decryptVerify(string $text, string &$plaintext) /*: array|false*/
	{
		return false;
	}

	/**
	 * Decrypts and verifies a given file
	 */
	public function decryptVerifyFile(string $filename, string &$plaintext) /*: array|false*/
	{
		return false;
	}

	/**
	 * Encrypts a given text
	 */
	public function encrypt(string $plaintext, /*string|resource*/ $output = null) /*: string|false*/
	{
		return false;
	}

	/**
	 * Encrypts a given text
	 */
	public function encryptFile(string $filename, /*string|resource*/ $output = null) /*: string|false*/
	{
		return false;
	}

	public function encryptStream(/*resource*/ $fp, /*string|resource*/ $output = null) /*: string|false*/
	{
		return false;
	}

	/**
	 * Encrypts and signs a given text
	 */
	public function encryptSign(string $plaintext) /*: string|false*/
	{
		return false;
	}

	/**
	 * Encrypts and signs a given text
	 */
	public function encryptSignFile(string $filename) /*: string|false*/
	{
		return false;
	}

	/**
	 * Exports a public or private key
	 */
	public function export(string $fingerprint, ?SensitiveString $passphrase = null) /*: string|false*/
	{
		return false;
	}

	/**
	 * Imports a key
	 */
	public function import(string $keydata) /*: array|false*/
	{
		return false;
	}

	/**
	 * Imports a key
	 */
	public function importFile(string $filename) /*: array|false*/
	{
		return false;
	}

	public function deleteKey(string $keyId, bool $private)
	{
		return false;
	}

	/**
	 * Returns an array with information about all keys that matches the given pattern
	 */
	public function keyInfo(string $pattern, bool $private = false) : array
	{
		return [];
	}

	/**
	 * Sets the mode for error_reporting
	 * GNUPG_ERROR_WARNING, GNUPG_ERROR_EXCEPTION and GNUPG_ERROR_SILENT.
	 * By default GNUPG_ERROR_SILENT is used.
	 */
	public function setErrorMode(int $errormode) : void
	{
	}

	/**
	 * Signs a given text
	 */
	public function sign(string $plaintext, /*string|resource*/ $output = null) /*: string|false*/
	{
		return false;
	}

	/**
	 * Signs a given file
	 */
	public function signFile(string $filename, /*string|resource*/ $output = null) /*: string|false*/
	{
		return false;
	}

	/**
	 * Signs a given file
	 */
	public function signStream($fp, /*string|resource*/ $output = null) /*: string|false*/
	{
		return false;
	}

	/**
	 * Verifies a signed text
	 */
	public function verify(string $signed_text, string $signature, string &$plaintext = null) /*: array|false*/
	{
		return false;
	}

	/**
	 * Verifies a signed file
	 */
	public function verifyFile(string $filename, string $signature, string &$plaintext = null) /*: array|false*/
	{
		return false;
	}

	/**
	 * Verifies a signed file
	 */
	public function verifyStream($fp, string $signature, string &$plaintext = null) /*: array|false*/
	{
		return false;
	}

	public function getEncryptedMessageKeys(/*string|resource*/ $data) : array
	{
		return [];
	}

	/******************************************************************
	 * Defined methods
	 ******************************************************************/

	/**
	 * Add a key for decryption
	 */
	public function addDecryptKey(string $fingerprint, SensitiveString $passphrase) : bool
	{
		$this->addPinentry($fingerprint, $passphrase);
		return true;
	}

	/**
	 * Add a key for encryption
	 */
	public function addEncryptKey(string $fingerprint) : bool
	{
		$this->encryptKeys[$fingerprint] = 1;
		return true;
	}

	/**
	 * Add a key for signing
	 */
	public function addSignKey(string $fingerprint, SensitiveString $passphrase) : bool
	{
		$this->addPinentry($fingerprint, $passphrase);
		return true;
	}

	public function clear() : bool
	{
		$this->clearPinentries();
		$this->clearEncryptKeys();
		return true;
	}

	/**
	 * Removes all keys which were set for decryption before
	 */
	public function clearDecryptKeys() : bool
	{
		return $this->clearPinentries();
	}

	/**
	 * Removes all keys which were set for encryption before
	 */
	public function clearEncryptKeys() : bool
	{
		$this->encryptKeys = [];
		return true;
	}

	/**
	 * Removes all keys which were set for signing before
	 */
	public function clearSignKeys() : bool
	{
		return $this->clearPinentries();
	}

	/**
	 * Returns the engine info
	 */
	public function getEngineInfo() : array
	{
		return [
			'protocol' => null,
			'file_name' => $this->binary,
			'home_dir' => $this->options['homedir'],
			'version' => $this->version
		];
	}

	/**
	 * Add private key passphrase for decrypt, sign or export
	 * $keyId or fingerprint
	 */
	public function addPinentry(string $keyId, SensitiveString $passphrase)
	{
		/**
		 * Test first?
		 * gpg --dry-run --passwd <your-user-id>
		$_ENV['PINENTRY_USER_DATA'] = \json_encode(\array_map('strval', [$keyId => $passphrase]));
		$result = $this->exec([
			'--dry-run',
			'--passwd',
			$passphrase
		]);
		 */
//		$this->export($keyId, $passphrase);
		$this->pinentries[$keyId] = $passphrase;
//		$this->pinentries[\substr($keyId, -16)] = $passphrase;
		return $this;
	}

	/**
	 * Removes all keys which were set for decryption, signing and export
	 */
	public function clearPinentries() : bool
	{
		$this->pinentries = [];
		return true;
	}

	/**
	 * Toggle the armored output
	 * When true the output is ASCII
	 */
	public function setArmor(bool $armor = true) : bool
	{
		$this->armor = $armor;
		return true;
	}

	protected function _debug(string $msg) : void
	{
		\SnappyMail\Log::debug('GPG', $msg);
	}

	protected function setInput(&$input) : void
	{
		if (\is_resource($input)) {
			// https://github.com/the-djmaze/snappymail/issues/331
			// $meta['stream_type'] == MEMORY or $meta['wrapper_data'] == MailSo\Base\StreamWrappers\Literal
			$meta = \stream_get_meta_data($input);
			if (!\in_array($meta['stream_type'], ['STDIO', 'TEMP'])) {
/*
				$fp = \fopen('php://temp');
				\stream_copy_to_stream($input, $fp);
				$input = $fp;
*/
				$input = \stream_get_contents($input);
			}
		}
		$this->_input =& $input;
	}

	protected function setOutput($output)/* : resource|false*/
	{
		$fclose = false;
		if ($output && !\is_resource($output)) {
			$output = \fopen($output, 'wb');
			if (!$output) {
				throw new \Exception("Could not open file '{$filename}'");
			}
			$fclose = $output;
		}
		$this->_output = $output;
		return $fclose;
	}

	public function agent()
	{
//		$home = \escapeshellarg($this->options['homedir']);
//		echo `gpg-agent --daemon --homedir $home 2>&1`;
	}

	protected function getPassphrase($key)
	{
		$passphrase  = '';
		$keyIdLength = \strlen($key);
		if ($keyIdLength && !empty($_ENV['PINENTRY_USER_DATA'])) {
			$passphrases = \json_decode($_ENV['PINENTRY_USER_DATA'], true);
			foreach ($passphrases as $keyId => $pass) {
				$length = \min($keyIdLength, \strlen($keyId));
				if (\substr($keyId, -$length) === \substr($key, -$length)) {
					return $pass;
				}
			}
		}
//		throw new \Exception("Passphrase not found for {$key}");
		return '';
	}

	protected function proc_close() : int
	{
		$exitCode = 0;

		// clear PINs from environment if they were set
		$_ENV['PINENTRY_USER_DATA'] = null;

		if (\is_resource($this->proc_resource)) {
			$this->_debug('CLOSING SUBPROCESS');

			// close remaining open pipes
			$this->_openPipes->closeAll();

			$status   = \proc_get_status($this->proc_resource);
			$exitCode = \proc_close($this->proc_resource);
			$this->proc_resource = null;

			// proc_close() can return -1 in some cases,
			// get the real exit code from the process status
			if ($exitCode < 0 && $status && !$status['running']) {
				$exitCode = $status['exitcode'];
			}

			if ($exitCode > 0) {
				$this->_debug('=> subprocess returned an unexpected exit code: ' . $exitCode);
			}
		}

		return $exitCode;
	}

	protected static function findBinary($name) : ?string
	{
		$binary = \trim((string) `which $name`);
		if ($binary && \is_executable($binary)) {
			return $binary;
		}
		$locations = \array_filter([
			'/sw/bin/',
			'/usr/bin/',
			'/usr/local/bin/',
			'/opt/local/bin/',
			'/run/current-system/sw/bin/'
		], '\RainLoop\Utils::inOpenBasedir');
		foreach ($locations as $location) {
			if (\is_executable($location . $name)) {
				return $location . $name;
			}
		}
		return null;
	}

}
