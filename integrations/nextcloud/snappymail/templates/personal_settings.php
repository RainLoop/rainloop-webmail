<div class="section">
	<form class="snappymail" action="personal.php" method="post">
		<input type="hidden" name="requesttoken" value="<?php echo $_['requesttoken'] ?>" id="requesttoken">
		<fieldset class="personalblock">
			<h2><?php echo $l->t('SnappyMail Webmail'); ?></h2>
			<p>
				<?php echo $l->t('Enter an email and password to auto-login to SnappyMail.'); ?>
			</p>
			<p>
				<input type="text" id="snappymail-email" name="snappymail-email"
					value="<?php echo $_['snappymail-email']; ?>" placeholder="<?php echo($l->t('Email')); ?>" />

				<input type="password" id="snappymail-password" name="snappymail-password"
					value="<?php echo $_['snappymail-password']; ?>" placeholder="<?php echo($l->t('Password')); ?>" />

				<button id="snappymail-save-button" name="snappymail-save-button"><?php echo($l->t('Save')); ?></button>
				&nbsp;&nbsp;<span class="snappymail-result-desc"></span>
			</p>
		</fieldset>
	</form>
</div>
