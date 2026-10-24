<?php

namespace SnappyMail\GPG;

class PGPKeySettings
{
	public
		// Primary key
		$type    = 'EDDSA', // One of pubkey_types
		$curve   = 'ed25519', // One of curves for ECC keys.
		$length  = null, // For non-ECC keys.
		$usage   = 'cert', // cert is default
		$expires = 0,

		$subkeys = [
			[
				'type'   => null, // One of pubkey_types
				'curve'  => 'ed25519', // One of curves
				'length' => null,
				'usage'  => 'sign'
			],
			[
				'type'    => null, // One of pubkey_types
				'curve'   => 'cv25519', // One of curves
				'length'  => null,
				'usage'   => 'encrypt'
			]
		],

		$name = '',
		$email = '',
		$comment = '',
		$passphrase;

	public function algo() : string
	{
		if ($this->curve) {
			return $this->curve;
		}
		return $this->type . ($this->length ?: '');
	}

	public function uid() : string
	{
		$result = '';
		if (\strlen($this->name)) {
			$result .= $this->name;
		}
		if (\strlen($this->comment)) {
			$result .= ' (' . $this->comment . ')';
		}
		if (\strlen($this->email)) {
			$result .= ' <' . $this->email. '>';
		}
		return \trim($result);
	}

	public function useDefault() : void
	{
		$this->type   = 'default';
		$this->curve  = null;
		$this->length = null;
		$this->usage  = null;
		$subkeys[0]   = ['type' => 'default'];
	}

	/**
	 * https://www.gnupg.org/documentation/manuals/gnupg/Unattended-GPG-key-generation.html
	 */
	public function asUnattendedData() : string
	{
		$keyParams = [
			"Key-Type: {$this->type}"
		];
		if ($this->curve) {
			$keyParams[] = "Key-Curve: {$this->curve}";
		}
		if ($this->length) {
			$keyParams[] = "Key-Length: {$this->length}";
		}
		if ($this->usage) {
			$keyParams[] = "Key-Usage: {$this->usage}";
		}

		/** Somehow this is broken and not working in v2.3.4
		$subkey = $this->subkeys[0];
		if (!empty($subkey['type'])) {
			$keyParams[] = "Subkey-Type: {$subkey['type']}";
		}
		if (!empty($subkey['curve'])) {
			$keyParams[] = "Subkey-Curve: {$subkey['curve']}";
		}
		if (!empty($subkey['length'])) {
			$keyParams[] = "Subkey-Length: {$subkey['length']}";
		}
		if (!empty($subkey['usage'])) {
			$keyParams[] = "Subkey-Usage: {$subkey['usage']}";
		}
		*/

		if ($this->expires) {
			$keyParams[] = "Expire-Date: " . \date('Y-m-d', $this->expires);
		}

		if (\strlen($this->name)) {
			$keyParams[] = "Name-Real: {$this->name}";
		}
		if (\strlen($this->email)) {
			$keyParams[] = "Name-Email: {$this->email}";
		}
		if (\strlen($this->comment)) {
			$keyParams[] = "Name-Comment: {$this->comment}";
		}

		if (\strlen($this->passphrase)) {
			$keyParams[] = "Passphrase: {$this->passphrase}";
		} else {
			$keyParams[] = '%no-protection';
		}

		$keyParams[] = '%commit';
		return \implode("\n", $keyParams) . "\n";
	}
}
