<?php

// Run with: php test/header-unfold.php
// RFC 5322 unfolding keeps the folding whitespace; RFC 2047 drops only the
// whitespace BETWEEN two encoded words. A plain word followed by a folded
// encoded word lost its space: "de vos\r\n =?utf-8?Q?=C3=A9quipements?="
// was shown as "voséquipements" (Symfony Mailer folds subjects this way).
define('APP_VERSION', 'test');
spl_autoload_register(static function (string $class): void {
	if (str_starts_with($class, 'SnappyMail\\')) {
		$file = dirname(__DIR__).'/snappymail/v/0.0.0/app/libraries/snappymail/'.strtolower(str_replace('\\', '/', substr($class, 11))).'.php';
	} else {
		$file = dirname(__DIR__).'/snappymail/v/0.0.0/app/libraries/'.str_replace('\\', '/', $class).'.php';
	}
	if (is_file($file)) {
		require_once $file;
	}
});

function check(bool $condition, string $message): void
{
	if (!$condition) {
		throw new RuntimeException($message);
	}
}

function subject(string $raw): string
{
	$headers = new \MailSo\Mime\HeaderCollection("Subject: {$raw}\r\nX-Next: 1\r\n");
	return (string) $headers->ValueByName('Subject');
}

$cases = [
	// plain word, then a folded encoded word: the space stays
	"Traiter les =?utf-8?Q?vuln=C3=A9rabilit=C3=A9s?= de vos\r\n =?utf-8?Q?=C3=A9quipements?= : plan de =?utf-8?Q?rem=C3=A9diation?= et\r\n checklist =?utf-8?Q?sign=C3=A9e?="
		=> 'Traiter les vulnérabilités de vos équipements : plan de remédiation et checklist signée',
	// two encoded words split across lines: no space between them (RFC 2047 §6.2)
	"=?utf-8?Q?r=C3=A9pon?=\r\n =?utf-8?Q?se?=" => 'réponse',
	"=?utf-8?B?w6l0w6k=?=\r\n\t=?utf-8?B?IGZpbg==?=" => 'été fin',
	// encoded word, then a folded plain word: the space stays
	"=?utf-8?Q?r=C3=A9union?=\r\n demain" => 'réunion demain',
	// no encoding at all
	"Hello\r\n world" => 'Hello world',
];
foreach ($cases as $raw => $want) {
	// exact: a fold is one space, never two ("et  checklist" ended up in replies)
	$got = subject($raw);
	check($got === $want, "got [{$got}], want [{$want}]");
}

echo "header-unfold: ".count($cases)." checks OK\n";
