<?php script('snappymail', 'personal');

$textLink1 = $l->t('may have some');
$textLink2 = $l->t('security considerations');
$links = [
	"<a href=\"https://github.com/pierre-alain-b/rainloop-nextcloud/issues/87\" style=\"text-decoration:underline\" target=\"_blank\">{$textLink1}</a>",
	"<a href=\"https://github.com/RainLoop/rainloop-webmail/issues/1082\" style=\"text-decoration:underline\" target=\"_blank\">{$textLink2}</a>"
	]; ?>

<div class="section">
	<form id="mail-snappymail-personal-form" action="#" method="post">
		<input type="hidden" name="requesttoken" value="<?php echo $_['requesttoken'] ?>" id="requesttoken">
		<input type="hidden" name="appname" value="snappymail">

		<fieldset class="personalblock">
			<h2><?php echo($l->t('SnappyMail Webmail')); ?></h2>
			<p>
				<?php echo($l->t('Enter an email and password to auto-login to SnappyMail. <b>Please note</b> that this feature %s %s.', $links)); ?>
			</p>
			<p>
				<input type="text" id="snappymail-email" name="snappymail-email"
					value="<?php echo $_['snappymail-email']; ?>" placeholder="<?php echo($l->t('Email')); ?>" />

				<input type="password" id="snappymail-password" name="snappymail-password"
					value="<?php echo $_['snappymail-password']; ?>" placeholder="<?php echo($l->t('Password')); ?>" />

				<input type="button" id="snappymail-save-button" name="snappymail-save-button" value="<?php echo($l->t('Save')); ?>" />
				&nbsp;&nbsp;<span class="snappymail-result-desc"></span>
			</p>
		</fieldset>
	</form>
</div>
