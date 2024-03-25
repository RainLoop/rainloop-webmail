<?php

namespace SnappyMail\SASL;

class Cram extends \SnappyMail\SASL
{

	function __construct(string $algo)
	{
		$algo = \strtolower($algo);
		if (!\in_array($algo, \hash_algos())) {
			throw new \Exception("Unsupported SASL CRAM algorithm: {$algo}");
		}
		$this->algo = $algo;
	}

	public function authenticate(string $authcid,
		#[\SensitiveParameter]
		string $passphrase,
		?string $challenge = null
	) : string
	{
		if (empty($challenge)) {
			$this->writeLogException(new \MailSo\Smtp\Exceptions\NegativeResponseException);
		}
		return $this->encode($authcid . ' ' . \hash_hmac($this->algo, $this->decode($challenge), $passphrase));
	}

	public static function isSupported(string $param) : bool
	{
		return \in_array(\strtolower($param), \hash_algos());
	}

}
