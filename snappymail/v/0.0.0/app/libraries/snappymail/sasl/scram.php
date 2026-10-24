<?php
/**
 * https://tools.ietf.org/html/rfc5802
 * https://tools.ietf.org/html/rfc7677
 */

namespace SnappyMail\SASL;

use SnappyMail\SensitiveString;

class Scram extends \SnappyMail\SASL
{
	protected ?SensitiveString $passphrase;
	protected
		$algo,
		$nonce,
		$gs2_header,
		$auth_message,
		$server_key;

	function __construct(string $algo)
	{
		if (\stripos($algo, '-PLUS')) {
			// https://github.com/the-djmaze/snappymail/issues/182
			throw new \Exception("SASL SCRAM channel binding unsupported: {$algo}");
		}
		$algo = \str_replace('sha-', 'sha', \strtolower($algo));
		if (!\in_array($algo, \hash_algos())) {
			throw new \Exception("SASL SCRAM unsupported algorithm: {$algo}");
		}
		$this->algo = $algo;
	}

	public function authenticate(string $authcid,
		#[\SensitiveParameter]
		string $passphrase,
		?string $authzid = null
	) : string
	{
		// SASLprep
		$authcid = \str_replace(array('=',','), array('=3D','=2C'), $authcid);

		$this->nonce = \bin2hex(\random_bytes(16));
		$this->passphrase = new SensitiveString($passphrase);
		$this->gs2_header = 'n,' . (empty($authzid) ? '' : 'a=' . $authzid) . ',';
		$this->auth_message = "n={$authcid},r={$this->nonce}";
		return $this->encode($this->gs2_header . $this->auth_message);
	}

	public function challenge(string $challenge) : ?string
	{
		$challenge = $this->decode($challenge);
		$values = static::parseMessage($challenge);

		if (empty($values['r'])) {
			throw new \Exception('Server nonce not found');
		}
		if (empty($values['s'])) {
			throw new \Exception('Server salt not found');
		}
		if (empty($values['i'])) {
			throw new \Exception('Server iterator not found');
		}

		if (\substr($values['r'], 0, \strlen($this->nonce)) !== $this->nonce) {
			throw new \Exception('Server invalid nonce');
		}

		$salt = \base64_decode($values['s']);
		if (!$salt) {
			throw new \Exception('Server invalid salt');
		}

		$pass = \hash_pbkdf2($this->algo, $this->passphrase->getValue(), $salt, \intval($values['i']), 0, true);
		$this->passphrase = null;

		$ckey = \hash_hmac($this->algo, 'Client Key', $pass, true);
		$skey = \hash($this->algo, $ckey, true);

		$cfmb = 'c='.\base64_encode($this->gs2_header).',r='.$values['r'];
		$amsg = "{$this->auth_message},{$challenge},{$cfmb}";

		$csig = \hash_hmac($this->algo, $amsg, $skey, true);
		$proof = \base64_encode($ckey ^ $csig);

		$skey = \hash_hmac($this->algo, 'Server Key', $pass, true);
		$this->server_key = \hash_hmac($this->algo, $amsg, $skey, true);

		return $this->encode("{$cfmb},p={$proof}");
	}

	public function hasChallenge() : bool
	{
		return true;
	}

	public function verify(string $data) : void
	{
		$v = static::parseMessage($this->decode($data));
		if (empty($v['v'])) {
			throw new \Exception('Server signature not found');
		}
		if (\base64_encode($this->server_key) !== $v['v']) {
			throw new \Exception('Server signature invalid');
		}
	}

	protected static function parseMessage(string $msg) : array
	{
		if ($msg && \preg_match_all('#(\w+)\=(?:"([^"]+)"|([^,]+))#', $msg, $m)) {
			return \array_combine(
				$m[1],
				\array_replace(
					\array_filter($m[2]),
					\array_filter($m[3])
				)
			);
		}
		return array();
	}

	public static function isSupported(string $param) : bool
	{
		$param = \str_replace('sha-', 'sha', \strtolower($param));
		return \in_array($param, \hash_algos());
	}

}
