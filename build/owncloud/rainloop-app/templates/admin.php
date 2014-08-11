<div class="section">
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
				<?php p($l->t('Absolute (full) path to RainLoop Webmail installation')); ?>:
				<br />
				<input type="text" style="width:300px;" id="rainloop-path" name="rainloop-path" value="<?php echo $_['rainloop-path']; ?>" />
				<br />
				<br />
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