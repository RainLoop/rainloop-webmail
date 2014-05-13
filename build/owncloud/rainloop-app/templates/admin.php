<form id="mail-rainloop-admin-form" action="#" method="post">
	<input type="hidden" name="requesttoken" value="<?php echo $_['requesttoken'] ?>" id="requesttoken">
	<input type="hidden" name="appname" value="rainloop">

	<fieldset class="personalblock">
		<h2><?php p($l->t('RainLoop Webmail')); ?></h2>
		<br />
		<p>
			<?php p($l->t('RainLoop Webmail URL')); ?>:
			<br />
			<input type="text" style="width:300px;" id="rainloop-url" name="rainloop-url" value="<?php echo $_['rainloop-url']; ?>" placeholder="https://" />
			<br />
			<br />
			<?php p($l->t('SSO key')); ?>:
			<br />
			<input type="text" style="width:300px;" id="rainloop-url" name="rainloop-sso-key" value="<?php echo $_['rainloop-sso-key']; ?>" />
			<br />
			<br />
			<input type="button" id="rainloop-save-button" name="rainloop-save-button" value="<?php p($l->t('Save')); ?>" />
			&nbsp;&nbsp;<span class="rainloop-result-desc"></span>
		</p>
	</fieldset>
</form>