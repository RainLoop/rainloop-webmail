<?php

namespace OCA\SnappyMail\Command;

use OCA\SnappyMail\Util\SnappyMailHelper;
use OC\Core\Command\Base;
use OCP\IConfig;
use OCP\IUserManager;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

class Settings extends Base
{
	protected IUserManager $userManager;
	protected IConfig $config;

	public function __construct(IUserManager $userManager, IConfig $config) {
		parent::__construct();
		$this->userManager = $userManager;
		$this->config = $config;
	}

	protected function configure() {
		$this
			->setName('snappymail:settings')
			->setDescription('modifies configuration')
			->addArgument(
				'uid',
				InputArgument::REQUIRED,
				'User ID used to login'
			)
			->addArgument(
				'user',
				InputArgument::REQUIRED,
				'The login username'
			)
			->addArgument(
				'pass',
				InputArgument::OPTIONAL,
				'The login passphrase'
			)
		;
	}

	protected function execute(InputInterface $input, OutputInterface $output): int {
		$uid = $input->getArgument('uid');
		if (!$this->userManager->userExists($uid)) {
			$output->writeln('<error>The user "' . $uid . '" does not exist.</error>');
			return 1;
		}

		$sEmail = $input->getArgument('user');
		$this->config->setUserValue($uid, 'snappymail', 'snappymail-email', $sEmail);

		$sPass = $input->getArgument('pass');
		if (empty($sPass)) {
			// Prompt on command line for value
			if (\is_callable('readline')) {
				$sPass = \readline("password: ");
			} else {
				echo "password: ";
				$sPass = \stream_get_line(STDIN, 1024, PHP_EOL);
			}
		}
		$sPass = ($sEmail && $sPass) ? SnappyMailHelper::encodePassword($sPass, \md5($sEmail)) : '';
		$this->config->setUserValue($uid, 'snappymail', 'passphrase', $sPass);
		return 0;
	}
}
