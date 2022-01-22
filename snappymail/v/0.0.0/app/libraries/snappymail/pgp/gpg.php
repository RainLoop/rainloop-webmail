<?php
/**
	# gpg1 --version
		gpg (GnuPG) 1.4.23
		Pubkey: RSA, RSA-E, RSA-S, ELG-E, DSA
		Cipher: IDEA, 3DES, CAST5, BLOWFISH, AES, AES192, AES256, TWOFISH, CAMELLIA128, CAMELLIA192, CAMELLIA256
		Hash: MD5, SHA1, RIPEMD160, SHA256, SHA384, SHA512, SHA224
		Compression: Uncompressed, ZIP, ZLIB, BZIP2

	# gpg2 --version
		gpg (GnuPG) 2.2.20
		libgcrypt 1.8.5
		Pubkey: RSA, ELG, DSA, ECDH, ECDSA, EDDSA
		Cipher: IDEA, 3DES, CAST5, BLOWFISH, AES, AES192, AES256, TWOFISH, CAMELLIA128, CAMELLIA192, CAMELLIA256
		Hash: SHA1, RIPEMD160, SHA256, SHA384, SHA512, SHA224
		Compression: Uncompressed, ZIP, ZLIB, BZIP2
 */

namespace SnappyMail\PGP;

class GPG
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
		$strict = false,
		$debug = false;

	private
		$_processHandler = null,
		$_errorHandlers = array(),
		$_statusHandlers = array(),
		$_commandBuffer,
		$_message,
		$_input,
		$_output;

	private
		$binary,
		$version = '1.0',
		$cipher_algorithms = ['IDEA', '3DES', 'CAST5', 'BLOWFISH', 'AES', 'AES192', 'AES256', 'TWOFISH', 'CAMELLIA128', 'CAMELLIA192', 'CAMELLIA256'],
		$hash_algorithms = ['SHA1', 'RIPEMD160', 'SHA256', 'SHA384', 'SHA512', 'SHA224'],
		$pubkey_algorithms = ['RSA', 'DSA'],
		$compression = ['Uncompressed', 'ZIP', 'ZLIB'],

		$proc_resource,

		$options = [
			'homedir' => '',
			'keyring' => '',
			'secret-keyring' => '',
			'digest-algo' => '',
			'cipher-algo' => '',
			/*
			2 = ZLIB (GnuPG, default)
			1 = ZIP (PGP)
			0 = Uncompressed
			*/
			'compress-algo' => 2,
		];

	function __construct(string $homedir)
	{
		$homedir = \rtrim($homedir, '/\\');
		// BSD 4.4 max length
		if (104 <= \strlen($homedir . '/S.gpg-agent.extra')) {
			throw new \Exception("socket name for '{$homedir}/S.gpg-agent.extra' is too long");
		}

		if (!\is_dir($homedir)) {
			\mkdir($homedir, 0700, true);
		}

		$this->options['homedir'] = $homedir;

		// the random seed file makes subsequent actions faster so only disable it if we have to.
		if ($this->options['homedir'] && !\is_writeable($this->options['homedir'])) {
			$this->options['no-random-seed-file'] = true;
		}

		// How to use gpgme-json ?
		$this->binary = static::findBinary('gpg');

		$info = \preg_replace('/\R +/', ' ', `$this->binary --version`);
		if (\preg_match('/gpg\\s.+([0-9]+\\.[0-9]+\\.[0-9]+)/', $info, $match)) {
			$this->version = $match[1];
		}
		if (\preg_match('/Cipher: (.+)/', $info, $match)) {
			$this->cipher_algorithms = \array_map('trim', \explode(',', $match[1]));
		}
		if (\preg_match('/Hash: (.+)/', $info, $match)) {
			$this->hash_algorithms = \array_map('trim', \explode(',', $match[1]));
		}
		if (\preg_match('/Pubkey: (.+)/', $info, $match)) {
			$this->pubkey_algorithms = \array_map('trim', \explode(',', $match[1]));
		}
		if (\preg_match('/Compression: (.+)/', $info, $match)) {
			$this->compression = \array_map('trim', \explode(',', $match[1]));
		}
	}

	function __destruct()
	{
		$this->proc_close();

		$gpgconf = static::findBinary('gpgconf');
		if ($gpgconf) {
            $env = array('GNUPGHOME' => $this->options['homedir']);
			$pipes = array();
			if ($process = \proc_open($gpgconf . ' --kill gpg-agent --homedir ' . \escapeshellarg($this->options['homedir']), array(), $pipes, null, $env)) {
				\proc_close($process);
			}
		}
	}

	public static function isSupported() : bool
	{
		return \is_callable('proc_open') && static::findBinary('gpg');
	}

	/**
	 * Add a key for decryption
	 */
	public function addDecryptKey(string $fingerprint, string $passphrase) : bool
	{
		return false;
	}

	/**
	 * Add a key for encryption
	 */
	public function addEncryptKey(string $fingerprint) : bool
	{
		return false;
	}

	/**
	 * Add a key for signing
	 */
	public function addSignKey(string $fingerprint, ?string $passphrase) : bool
	{
		return false;
	}

	/**
	 * Removes all keys which were set for decryption before
	 */
	public function clearDecryptKeys() : bool
	{
		return false;
	}

	/**
	 * Removes all keys which were set for encryption before
	 */
	public function clearEncryptKeys() : bool
	{
		return false;
	}

	/**
	 * Removes all keys which were set for signing before
	 */
	public function clearSignKeys() : bool
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
	public function encrypt(string $plaintext) /*: string|false*/
	{
		return false;
	}

	/**
	 * Encrypts a given text
	 */
	public function encryptFile(string $filename) /*: string|false*/
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
	 * Exports a key
	 */
	public function export(string $fingerprint) /*: string|false*/
	{
		return false;
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
	 * Returns the errortext, if a function fails
	 */
	public function getError() /*: string|false*/
	{
		return false;
	}

	/**
	 * Returns the error info
	 */
	public function getErrorInfo() : array
	{
		return false;
	}

	/**
	 * Returns the currently active protocol for all operations
	 */
	public function getProtocol() : int
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

	/**
	 * Returns an array with information about all keys that matches the given pattern
	 */
	public function keyInfo(string $pattern) : array
	{
		return false;
	}

	/**
	 * Returns an array with information about all keys that matches the given pattern
	 */
	public function hasPrivateKey(string $keygrip) : bool
	{
		return \is_file("{$this->options['homedir']}/private-keys-v1.d/{$keygrip}.key");
	}

	/**
	 * Toggle armored output
	 * When true the output is ASCII
	 */
	public function setArmor(bool $armor = true) : bool
	{
		return false;
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
	 * Sets the mode for signing
	 * GNUPG_SIG_MODE_NORMAL, GNUPG_SIG_MODE_DETACH and GNUPG_SIG_MODE_CLEAR.
	 * By default GNUPG_SIG_MODE_CLEAR
	 */
	public function setSignMode(int $signmode) : bool
	{
		return false;
	}

	/**
	 * Signs a given text
	 */
	public function sign(string $plaintext) /*: string|false*/
	{
		return false;
	}

	/**
	 * Signs a given file
	 */
	public function signFile(string $filename) /*: string|false*/
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
	 * RFC 4880
	 * https://datatracker.ietf.org/doc/html/rfc4880#section-5.2.3.5
	 */
	public function signatureIssuer(string $signature) /*: array|false*/
	{
		if (preg_match('/-----BEGIN PGP SIGNATURE-----(.+)-----END PGP SIGNATURE-----/', $signature, $match)) {
			// TODO: use https://github.com/singpolyma/openpgp-php ?
			$binary = \base64_decode(\trim($match[1]));
			return \strtoupper(\bin2hex(\substr($binary, 24, 8)));
		}
		return false;
	}

	/**
	 * This hangs with:
	 *     gpg: can't connect to the agent: IPC connect call failed
	 */
	public function getPrivateKeys($keyId = '') : array
	{
		// According to The file 'doc/DETAILS' in the GnuPG distribution, using
		// double '--with-fingerprint' also prints the fingerprint for subkeys.
		$arguments = array(
			'--with-colons',
			'--with-fingerprint',
			'--with-fingerprint',
			'--fixed-list-mode',
			'--list-secret-keys'
		);
		if ($keyId) {
			$arguments[] = '--utf8-strings';
			$arguments[] = \escapeshellarg($keyId);
		}

		$output = '';

		$this->reset();
		$this->setOutput($output);
		$this->exec($arguments);

echo $output;
return [];

		$fingerprints = array();
		foreach (\explode(PHP_EOL, $output) as $line) {
			$lineExp = \explode(':', $line);
			if ('fpr' === $lineExp[0]) {
				$fingerprints[] = $lineExp[9];
			}
		}
		return $fingerprints;
	}

	public function getPublicKeys($keyId = '') : array
	{
//		$privateKeyFingerprints = $this->getPrivateKeys($keyId);

		// According to The file 'doc/DETAILS' in the GnuPG distribution, using
		// double '--with-fingerprint' also prints the fingerprint for subkeys.
		$arguments = array(
			'--with-colons',
			'--with-fingerprint',
			'--with-fingerprint',
			'--fixed-list-mode',
			'--list-public-keys' // --list-keys ?
		);
		if ($keyId) {
			$arguments[] = '--utf8-strings';
			$arguments[] = \escapeshellarg($keyId);
		}

		$output = '';

		$this->reset();
		$this->setOutput($output);
		$this->exec($arguments);

		$keys   = array();
		$key    = null; // current key
		$subKey = null; // current sub-key

		foreach (\explode(PHP_EOL, $output) as $line) {
			$tokens = \explode(':', $line);

			switch ($tokens[0])
			{
			case 'tru':
				break;

			case 'pub':
				// new primary key means last key should be added to the array
				if ($key !== null) {
					$keys[] = $key;
				}
				$key = [
					'disabled' => false,
					'expired' => false,
					'revoked' => false,
					'is_secret' => false,
					'can_sign' => \str_contains($tokens[11], 's'),
					'can_encrypt' => \str_contains($tokens[11], 'e'),
					'uids' => [],
					'subkeys' => []
				];
				// Fall through to add (sub)key
			case 'sub':
				$key['subkeys'][] = [
					'fingerprint' => '', // fpr:::::::::....:
					'keyid' => $tokens[4],
					'timestamp' => $tokens[5],
					'expires' => $tokens[6],
					'is_secret' => false,
					'invalid' => false,
					// escaESCA
					'can_encrypt' => \str_contains($tokens[11], 'e'),
					'can_sign' => \str_contains($tokens[11], 's'),
					'can_certify' => \str_contains($tokens[11], 'c'),
					'can_authenticate' => \str_contains($tokens[11], 'a'),
					'disabled' => false,
					'expired' => false,
					'revoked' => 'r' === $tokens[1],
					'length' => $tokens[2],
					'algorithm' => $tokens[3],
				];
				break;

			case 'fpr':
				$key['subkeys'][\array_key_last($key['subkeys'])]['fingerprint'] = $tokens[9];
				break;

			case 'uid':
				$string  = \stripcslashes($tokens[9]); // as per documentation
				$name    = '';
				$email   = '';
				$comment = '';
				$matches = array();

				// get email address from end of string if it exists
				if (\preg_match('/^(.*?)<([^>]+)>$/', $string, $matches)) {
					$string = \trim($matches[1]);
					$email  = $matches[2];
				}

				// get comment from end of string if it exists
				$matches = array();
				if (\preg_match('/^(.+?) \(([^\)]+)\)$/', $string, $matches)) {
					$string  = $matches[1];
					$comment = $matches[2];
				}

				// there can be an email without a name
				if (!$email && \preg_match('/^[\S]+@[\S]+$/', $string, $matches)) {
					$email = $string;
				} else {
					$name = $string;
				}

				$key['uids'][] = [
					'name' => $name,
					'comment' => $comment,
					'email' => $email,
					'uid' => $tokens[9],
					'revoked' => 'r' === $tokens[1],
					'invalid' => false,
				];
				break;
			}
		}

		// add last key
		if ($key) {
			$keys[] = $key;
		}

		return $keys;
	}

	private function _debug(string $msg)
	{
		if ($this->debug) {
			echo $msg . "\n";
		}
	}

	public function setOutput(&$output)
	{
		$this->_output =& $output;
	}

	/**
	 * Resets the GPG engine, preparing it for a new operation
	 *
	 * @return void
	 *
	 * @see Crypt_GPG_Engine::run()
	 * @see Crypt_GPG_Engine::setOperation()
	 */
	public function reset()
	{
		$this->_message        = null;
		$this->_input          = null;
		$this->_output         = '';
		$this->_commandBuffer  = '';

		$this->_errorHandlers  = array();
		$this->_statusHandlers = array();
/*
		if ($this->debug) {
			$this->addStatusHandler(array($this, '_handleDebugStatus'));
			$this->addErrorHandler(array($this, '_handleDebugError'));
		}

		$this->_processHandler = new Crypt_GPG_ProcessHandler($this);
		$this->addStatusHandler(array($this->_processHandler, 'handleStatus'));
		$this->addErrorHandler(array($this->_processHandler, 'handleError'));
*/
	}

	public function agent()
	{
//		$home = \escapeshellarg($this->options['homedir']);
//		echo `gpg-agent --daemon --homedir $home 2>&1`;
	}

	private function exec(array $arguments)
	{
		if (\version_compare($this->version, '2.2.5', '<')) {
			// Too old (<2018)
			return false;
		}

		$defaultArguments = array(
			'--status-fd ' . self::FD_STATUS,
			'--command-fd ' . self::FD_COMMAND,
//			'--no-greeting',
			'--no-secmem-warning',
			'--no-tty',
			'--no-default-keyring',         // ignored if keying files are not specified
			'--no-options',                 // prevent creation of ~/.gnupg directory
			'--no-permission-warning',      // 1.0.7+
//			'--no-use-agent',               // < 2.0.0
			'--exit-on-status-write-error', // 1.4.2+
			'--trust-model always',         // 1.3.2+ else --always-trust
			'--pinentry-mode loopback'      // 2.1.13+
		);

		if (!$this->strict) {
			$defaultArguments[] = '--ignore-time-conflict';
			$defaultArguments[] = '--ignore-valid-from';
		}

		if ($this->options['digest-algo']) {
			$this->options['s2k-digest-algo'] = $this->options['digest-algo'];
		}
		if ($this->options['cipher-algo']) {
			$this->options['s2k-cipher-algo'] = $this->options['cipher-algo'];
		}

		foreach ($this->options as $option => $value) {
			if (\is_string($value)) {
				if (\strlen($value)) {
					$defaultArguments[] = "--{$option} " . \escapeshellarg($value);
				}
			} else if (true === $value) {
				$defaultArguments[] = "--{$option}";
			} else if ('compress-algo' === $option && 2 !== $value) {
				$defaultArguments[] = "--{$option} " . \intval($value);
			}
		}

		$commandLine = $this->binary . ' ' . \implode(' ', \array_merge($defaultArguments, $arguments));

		$descriptorSpec = array(
			self::FD_INPUT   => array('pipe', 'rb'), // stdin
			self::FD_OUTPUT  => array('pipe', 'wb'), // stdout
			self::FD_ERROR   => array('pipe', 'wb'), // stderr
			self::FD_STATUS  => array('pipe', 'wb'), // status
			self::FD_COMMAND => array('pipe', 'rb'), // command
			self::FD_MESSAGE => array('pipe', 'rb')  // message
		);

		$this->_debug('OPENING GPG SUBPROCESS WITH THE FOLLOWING COMMAND:');
		$this->_debug($commandLine);

		// Don't localize GnuPG results.
		$env = $_ENV;
		$env['LC_ALL'] = 'C';

		$proc_pipes = array();

		$this->proc_resource = \proc_open(
			$commandLine,
			$descriptorSpec,
			$proc_pipes,
			null,
			$env,
			array('binary_pipes' => true)
		);

		if (!\is_resource($this->proc_resource)) {
			throw new \Exception('Unable to open GPG process.');
		}

		$this->_openPipes = new GpgProcPipes($proc_pipes);

		$this->_debug('BEGIN PROCESSING');

		$this->_commandBuffer = '';    // buffers input to GPG
		$messageBuffer        = '';    // buffers input to GPG
		$inputBuffer          = '';    // buffers input to GPG
		$outputBuffer         = '';    // buffers output from GPG
		$inputComplete        = false; // input stream is completely buffered
		$messageComplete      = false; // message stream is completely buffered

		if (\is_string($this->_input)) {
			$inputBuffer   = $this->_input;
			$inputComplete = true;
		}

		if (\is_string($this->_message)) {
			$messageBuffer   = $this->_message;
			$messageComplete = true;
		}

		if (\is_string($this->_output)) {
			$outputBuffer =& $this->_output;
		}

		// convenience variables
		$fdInput   = $proc_pipes[self::FD_INPUT];
		$fdOutput  = $proc_pipes[self::FD_OUTPUT];
		$fdError   = $proc_pipes[self::FD_ERROR];
		$fdStatus  = $proc_pipes[self::FD_STATUS];
		$fdCommand = $proc_pipes[self::FD_COMMAND];
		$fdMessage = $this->_openPipes->get(self::FD_MESSAGE);

		// select loop delay in milliseconds
		$delay         = 0;
		$inputPosition = 0;

		while (true) {
			$inputStreams     = array();
			$outputStreams    = array();
			$exceptionStreams = array();

			// set up input streams
			if (!$inputComplete && \is_resource($this->_input)) {
				if (\feof($this->_input)) {
					$inputComplete = true;
				} else {
					$inputStreams[] = $this->_input;
				}
			}

			// close GPG input pipe if there is no more data
			if ('' == $inputBuffer && $inputComplete) {
				$this->_debug('=> closing GPG input pipe');
				$this->_openPipes->close(self::FD_INPUT);
			}

			if (\is_resource($this->_message) && !$messageComplete) {
				if (\feof($this->_message)) {
					$messageComplete = true;
				} else {
					$inputStreams[] = $this->_message;
				}
			}

			if (!\feof($fdOutput)) {
				$inputStreams[] = $fdOutput;
			}

			if (!\feof($fdStatus)) {
				$inputStreams[] = $fdStatus;
			}

			if (!\feof($fdError)) {
				$inputStreams[] = $fdError;
			}

			// set up output streams
			if ($outputBuffer != '' && \is_resource($this->_output)) {
				$outputStreams[] = $this->_output;
			}

			if ($this->_commandBuffer != '' && \is_resource($fdCommand)) {
				$outputStreams[] = $fdCommand;
			}

			if ('' != $messageBuffer) {
				if (\is_resource($fdMessage)) {
					$outputStreams[] = $fdMessage;
				}
			} else if ($messageComplete) {
				// close GPG message pipe if there is no more data
				$this->_debug('=> closing GPG message pipe');
				$this->_openPipes->close(self::FD_MESSAGE);
			}

			if ($inputBuffer != '' && \is_resource($fdInput)) {
				$outputStreams[] = $fdInput;
			}

			// no streams left to read or write, we're all done
			if (!\count($inputStreams) && !\count($outputStreams)) {
				break;
			}

			$this->_debug('selecting streams');

			$ready = \stream_select(
				$inputStreams,
				$outputStreams,
				$exceptionStreams,
				null
			);

			$this->_debug('=> got ' . $ready);

			if ($ready === false) {
				throw new \Exception(
					'Error selecting stream for communication with GPG ' .
					'subprocess. Please file a bug report at: ' .
					'http://pear.php.net/bugs/report.php?package=Crypt_GPG'
				);
			}

			if ($ready === 0) {
				throw new \Exception(
					'stream_select() returned 0. This can not happen! Please ' .
					'file a bug report at: ' .
					'http://pear.php.net/bugs/report.php?package=Crypt_GPG'
				);
			}

			// write input (to GPG)
			if (\in_array($fdInput, $outputStreams, true)) {
				$this->_debug('GPG is ready for input');
				$chunk  = \substr($inputBuffer, $inputPosition, self::CHUNK_SIZE);
				$length = \strlen($chunk);
				$this->_debug('=> about to write ' . $length . ' bytes to GPG input');
				$length = $this->_openPipes->writePipe(self::FD_INPUT, $chunk, $length);
				if ($length) {
					$this->_debug('=> wrote ' . $length . ' bytes');
					// Move the position pointer, don't modify $inputBuffer (#21081)
					if (\is_string($this->_input)) {
						$inputPosition += $length;
					} else {
						$inputPosition = 0;
						$inputBuffer   = \substr($inputBuffer, $length);
					}
				} else {
					$this->_debug('=> pipe broken and closed');
				}
			}

			// read input (from PHP stream)
			// If the buffer is too big wait until it's smaller, we don't want
			// to use too much memory
			if (\in_array($this->_input, $inputStreams, true) && \strlen($inputBuffer) < self::CHUNK_SIZE) {
				$this->_debug('input stream is ready for reading');
				$this->_debug('=> about to read ' . self::CHUNK_SIZE . ' bytes from input stream');
				$chunk        = \fread($this->_input, self::CHUNK_SIZE);
				$length       = \strlen($chunk);
				$inputBuffer .= $chunk;
				$this->_debug('=> read ' . $length . ' bytes');
			}

			// write message (to GPG)
			if (\in_array($fdMessage, $outputStreams, true)) {
				$this->_debug('GPG is ready for message data');
				$this->_debug('=> about to write ' . \min(self::CHUNK_SIZE, \strlen($messageBuffer)) . ' bytes to GPG message');
				$length = $this->_openPipes->writePipe(self::FD_MESSAGE, $messageBuffer, self::CHUNK_SIZE);
				if ($length) {
					$this->_debug('=> wrote ' . $length . ' bytes');
					$messageBuffer = \substr($messageBuffer, $length);
				} else {
					$this->_debug('=> pipe broken and closed');
				}
			}

			// read message (from PHP stream)
			if (\in_array($this->_message, $inputStreams, true)) {
				$this->_debug('message stream is ready for reading');
				$this->_debug('=> about to read ' . self::CHUNK_SIZE . ' bytes from message stream');
				$chunk          = \fread($this->_message, self::CHUNK_SIZE);
				$length         = \strlen($chunk);
				$messageBuffer .= $chunk;
				$this->_debug('=> read ' . $length . ' bytes');
			}

			// read output (from GPG)
			if (\in_array($fdOutput, $inputStreams, true)) {
				$this->_debug('GPG output stream ready for reading');
				$this->_debug('=> about to read ' . self::CHUNK_SIZE . ' bytes from GPG output');
				$chunk         = \fread($fdOutput, self::CHUNK_SIZE);
				$length        = \strlen($chunk);
				$outputBuffer .= $chunk;
				$this->_debug('=> read ' . $length . ' bytes');
			}

			// write output (to PHP stream)
			if (\in_array($this->_output, $outputStreams, true)) {
				$this->_debug('output stream is ready for data');
				$chunk  = \substr($outputBuffer, 0, self::CHUNK_SIZE);
				$length = \strlen($chunk);
				$this->_debug('=> about to write ' . $length . ' bytes to output stream');
				$length = \fwrite($this->_output, $chunk, $length);
				if ($length === 0 || $length === false) {
					// If we wrote 0 bytes it was either EAGAIN or EPIPE. Since
					// the pipe was seleted for writing, we assume it was EPIPE.
					// There's no way to get the actual error code in PHP. See
					// PHP Bug #39598. https://bugs.php.net/bug.php?id=39598
					$this->_debug('=> broken pipe on output stream');
					$this->_debug('=> closing pipe output stream');
					$this->_openPipes->close(self::FD_OUTPUT);
				} else {
					$this->_debug('=> wrote ' . $length . ' bytes');
					$outputBuffer = \substr($outputBuffer, $length);
				}
			}

			// read error (from GPG)
			if (\in_array($fdError, $inputStreams, true)) {
				$this->_debug('GPG error stream ready for reading');
				$this->_debug('=> about to read ' . self::CHUNK_SIZE . ' bytes from GPG error');
				foreach ($this->_openPipes->readPipeLines(self::FD_ERROR) as $line) {
					if (!$this->_errorHandlers) {
						$this->debug ? $this->_debug('ERROR ' . $line) : \trigger_error($line, E_USER_WARNING);
					}
					foreach ($this->_errorHandlers as $handler) {
						\array_unshift($handler['args'], $line);
						\call_user_func_array(
							$handler['callback'],
							$handler['args']
						);
						\array_shift($handler['args']);
					}
				}
			}

			// read status (from GPG)
			if (\in_array($fdStatus, $inputStreams, true)) {
				$this->_debug('GPG status stream ready for reading');
				$this->_debug('=> about to read ' . self::CHUNK_SIZE . ' bytes from GPG status');
				// pass lines to status handlers
				foreach ($this->_openPipes->readPipeLines(self::FD_STATUS) as $line) {
					if (!$this->_statusHandlers) {
						$this->debug ? $this->_debug($line) : \trigger_error($line);
					}
					// only pass lines beginning with magic prefix
					if ('[GNUPG:] ' == \substr($line, 0, 9)) {
						$line = \substr($line, 9);
						foreach ($this->_statusHandlers as $handler) {
							\array_unshift($handler['args'], $line);
							\call_user_func_array(
								$handler['callback'],
								$handler['args']
							);
							\array_shift($handler['args']);
						}
					}
				}
			}

			// write command (to GPG)
			if (\in_array($fdCommand, $outputStreams, true)) {
				$this->_debug('GPG is ready for command data');
				$chunk  = \substr($this->_commandBuffer, 0, self::CHUNK_SIZE);
				$length = \strlen($chunk);
				$this->_debug('=> about to write ' . $length . ' bytes to GPG command');
				$length = $this->_openPipes->writePipe(self::FD_COMMAND, $chunk, $length);
				if ($length) {
					$this->_debug('=> wrote ' . $length);
					$this->_commandBuffer = \substr($this->_commandBuffer, $length);
				} else {
					$this->_debug('=> pipe broken and closed');
				}
			}

			if (\count($outputStreams) === 0 || \count($inputStreams) === 0) {
				// we have an I/O imbalance, increase the select loop delay
				// to smooth things out
				$delay += 10;
			} else {
				// things are running smoothly, decrease the delay
				$delay -= 8;
				$delay = \max(0, $delay);
			}

			if ($delay > 0) {
				\usleep($delay);
			}

		} // end loop while streams are open

		$this->_debug('END PROCESSING');

		$this->proc_close();
	}

	private function proc_close()
	{
		// clear PINs from environment if they were set
		$_ENV['PINENTRY_USER_DATA'] = null;

		if (\is_resource($this->proc_resource)) {
			$this->_debug('CLOSING GPG SUBPROCESS');

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

			// close file handles before throwing an exception
			if (\is_resource($this->_input)) {
				\fclose($this->_input);
			}

			if (\is_resource($this->_output)) {
				\fclose($this->_output);
			}

			$this->_processHandler && $this->_processHandler->throwException($exitCode);
		}
	}

	private static function findBinary($name) : ?string
	{
		$binary = \trim(`which $name`);
		if ($binary && \is_executable($binary)) {
			return $binary;
		}
		$locations = array(
			'/sw/bin/',
			'/usr/bin/',
			'/usr/local/bin/',
			'/opt/local/bin/',
			'/run/current-system/sw/bin/'
		);
		foreach ($locations as $location) {
			if (\is_executable($location . $name)) {
				return $location . $name;
			}
		}
		return null;
	}

}


class GpgProcPipes
{
	private $pipes;

	function __construct(array $pipes)
	{
		// Set streams as non-blocking.
		foreach ($pipes as $pipe) {
			\stream_set_blocking($pipe, 0);
			\stream_set_write_buffer($pipe, GPG::CHUNK_SIZE);
			\stream_set_chunk_size($pipe, GPG::CHUNK_SIZE);
			\stream_set_read_buffer($pipe, GPG::CHUNK_SIZE);
		}
		$this->pipes = $pipes;
	}

	function __destruct()
	{
		$this->closeAll();
	}

	public function closeAll() : void
	{
		foreach (\array_keys($this->pipes) as $number) {
			$this->close($number);
		}
	}

	public function get(int $number)
	{
		if (\array_key_exists($number, $this->pipes) && \is_resource($this->pipes[$number])) {
			return $this->pipes[$number];
		}
	}

	public function close(int $number) : void
	{
		if (\array_key_exists($number, $this->pipes)) {
			\fflush($this->pipes[$number]);
			\fclose($this->pipes[$number]);
			unset($this->pipes[$number]);
		}
	}

	private $buffers = [];
	public function readPipeLines(int $number) : iterable
	{
		$pipe = $this->get($number);
		if ($pipe) {
			$chunk     = \fread($pipe, GPG::CHUNK_SIZE);
			$length    = \strlen($chunk);
			$eolLength = \strlen(PHP_EOL);
			if (!isset($this->buffers[$number])) {
				$this->buffers[$number] = '';
			}
			$this->buffers[$number] .= $chunk;
			while (false !== ($pos = \strpos($this->buffers[$number], PHP_EOL))) {
				yield \substr($this->buffers[$number], 0, $pos);
				$this->buffers[$number] = \substr($this->buffers[$number], $pos + $eolLength);
			}
		}
	}

	public function writePipe(int $number, string $data, int $length = 0) : int
	{
		$pipe = $this->get($number);
		if ($pipe) {
			$chunk  = \substr($data, 0, $length ?: \strlen($data));
			$length = \strlen($chunk);
			$length = \fwrite($pipe, $chunk, $length);
			if (!$length) {
				// If we wrote 0 bytes it was either EAGAIN or EPIPE. Since
				// the pipe was seleted for writing, we assume it was EPIPE.
				// There's no way to get the actual error code in PHP. See
				// PHP Bug #39598. https://bugs.php.net/bug.php?id=39598
				$this->pipes->close($number);
			}
			return $length ?: 0;
		}
		return 0;
	}
}
