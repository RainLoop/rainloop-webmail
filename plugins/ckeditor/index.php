<?php

class CKEditorPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME = 'CKEditor',
		VERSION = '2.2',
		RELEASE = '2021-08-17',
		REQUIRED = '2.6.2',
		DESCRIPTION = 'Use CKEditor instead of Squire as WYSIWYG';

	public function Init() : void
	{
		$path = APP_VERSION_ROOT_PATH . 'static/ckeditor';

		// Apache AH00037: Symbolic link not allowed or link target not accessible
		// That's why we clone the source
		if (!\is_dir($path)/* && !\is_link($path)*/) {
			$old_mask = umask(0022);
			// $active = \symlink(__DIR__ . '/src', $path);
			\mkdir($path, 0755);
			$iterator = new \RecursiveIteratorIterator(
				new \RecursiveDirectoryIterator(__DIR__ . '/src', \RecursiveDirectoryIterator::SKIP_DOTS),
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

		if (\is_file("{$path}/ckeditor.js")) {
			$this->addCss('style.css');
			$this->addJs('ckeditor.js');
		}
	}
}
