<div class="section">
	<form id="mail-rainloop-personal-form" action="#" method="post">
		<input type="hidden" name="requesttoken" value="<?php echo $_['requesttoken'] ?>" id="requesttoken">
		<input type="hidden" name="appname" value="rainloop">

		<fieldset class="personalblock">
			<h2><?php p($l->t('RainLoop Webmail')); ?></h2>
			<p>
				<input type="text" id="rainloop-email" name="rainloop-email"
					value="<?php echo $_['rainloop-email']; ?>" placeholder="<?php p($l->t('Email')); ?>" />

				<input type="password" id="rainloop-password" name="rainloop-password"
					value="<?php echo $_['rainloop-password']; ?>" placeholder="<?php p($l->t('Password')); ?>" />

				<input type="button" id="rainloop-save-button" name="rainloop-save-button" value="<?php p($l->t('Save')); ?>" />
				&nbsp;&nbsp;<span class="rainloop-result-desc"></span>
			</p>
		</fieldset>
	</form>
</div>