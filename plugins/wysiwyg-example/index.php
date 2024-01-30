<?php

class WysiwygQuillPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME = 'WYSIWYG Example',
		VERSION = '1.0',
		RELEASE = '2024-01-30',
		REQUIRED = '2.34.0',
		DESCRIPTION = 'Add Example as WYSIWYG editor option';

	public function Init() : void
	{
		$path = APP_VERSION_ROOT_PATH . 'static/wysiwyg-example';

		// Apache AH00037: Symbolic link not allowed or link target not accessible
		// That's why we clone the source
		if (!\is_dir($path)/* && !\is_link($path)*/) {
			$old_mask = umask(0022);
			// $active = \symlink(__DIR__ . '/src', $path);
			\mkdir($path, 0755);
			$iterator = new \RecursiveIteratorIterator(
				new \RecursiveDirectoryIterator(__DIR__ . '/static', \RecursiveDirectoryIterator::SKIP_DOTS),
				\RecursiveIteratorIterator::SELF_FIRST
			);
			foreach ($iterator as $item) {
				if ($item->isDir()) {
					\mkdir($path . DIRECTORY_SEPARATOR . $iterator->getSubPathName());
				} else {
					\copy($item, $path . DIRECTORY_SEPARATOR . $iterator->getSubPathName());
				}
			}
			umask($old_mask);
		}

		if (\is_file("{$path}/example.min.js")) {
//			$this->addCss('style.css');
			$this->addJs('example.js');
		}
	}
}
