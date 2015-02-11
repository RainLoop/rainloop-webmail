<div class="section">
	<form id="mail-rainloop-admin-form" action="#" method="post">
		<input type="hidden" name="requesttoken" value="<?php echo $_['requesttoken'] ?>" id="requesttoken">
		<input type="hidden" name="appname" value="rainloop">

		<fieldset class="personalblock">
			<h2><?php p($l->t('RainLoop Webmail')); ?></h2>
			<br />
			<?php if ($_['rainloop-admin-panel-link']): ?>
			<p>
				<a href="<?php echo $_['rainloop-admin-panel-link'] ?>" target="_blank" style="text-decoration: underline">
					<?php p($l->t('Go to RainLoop Webmail admin panel')); ?>
				</a>
			</p>
			<br />
			<?php endif; ?>
			<p>
				<input type="checkbox" id="rainloop-autologin" id="rainloop-autologin" name="rainloop-autologin" value="1" <?php if ($_['rainloop-autologin']): ?>checked="checked"<?php endif; ?> />
				<label for="rainloop-autologin">
					<?php p($l->t('Automatically login with ownCloud user credentials')); ?>
				</label>
				<br />
				<br />
				<input type="button" id="rainloop-save-button" name="rainloop-save-button" value="<?php p($l->t('Save')); ?>" />
				&nbsp;&nbsp;<span class="rainloop-result-desc"></span>
			</p>
		</fieldset>
	</form>
</div>