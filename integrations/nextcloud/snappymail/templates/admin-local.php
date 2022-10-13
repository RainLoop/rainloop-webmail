<div class="section">
	<form class="snappymail" action="admin.php" method="post">
		<input type="hidden" name="requesttoken" value="<?php echo $_['requesttoken'] ?>" id="requesttoken">
		<fieldset class="personalblock">
			<h2><?php echo($l->t('SnappyMail Webmail')); ?></h2>
			<br />
			<?php if ($_['snappymail-admin-panel-link']) { ?>
			<p>
				<a href="<?php echo $_['snappymail-admin-panel-link'] ?>" target="_blank" style="text-decoration: underline">
					<?php echo($l->t('Go to SnappyMail Webmail admin panel')); ?>
				</a>
			</p>
			<br />
			<?php } ?>
			<p>
				<div style="display: flex;">
					<input type="radio" id="snappymail-noautologin" name="snappymail-autologin" value="0" <?php if (!$_['snappymail-autologin']&&!$_['snappymail-autologin-with-email']) echo 'checked="checked"'; ?> />
					<label style="margin: auto 5px;" for="snappymail-noautologin">
						<?php echo($l->t('Users will login manually, or define credentials in their personal settings for automatic logins.')); ?>
					</label>
				</div>
				<div style="display: flex;">
					<input type="radio" id="snappymail-autologin" name="snappymail-autologin" value="1" <?php if ($_['snappymail-autologin']) echo 'checked="checked"'; ?> />
					<label style="margin: auto 5px;" for="snappymail-autologin">
						<?php echo($l->t('Attempt to automatically login users with their Nextcloud username and password, or user-defined credentials, if set.')); ?>
					</label>
				</div>
				<div style="display: flex;">
					<input type="radio" id="snappymail-autologin-with-email" name="snappymail-autologin" value="2" <?php if ($_['snappymail-autologin-with-email']) echo 'checked="checked"'; ?> />
					<label style="margin: auto 5px;" for="snappymail-autologin-with-email">
						<?php echo($l->t('Attempt to automatically login users with their Nextcloud email and password, or user-defined credentials, if set.')); ?>
					</label>
				</div>
			</p>
			<br />
			<br />
			<p>
				<input id="snappymail-embed" name="snappymail-embed" type="checkbox" class="checkbox"  <?php if ($_['snappymail-embed']) echo 'checked="checked"'; ?>>
				<label for="snappymail-embed">Embed without iframe (experimental)</label>
			</p>
			<br />
			<br />
			<p>
				<button id="snappymail-save-button" name="snappymail-save-button"><?php echo($l->t('Save')); ?></button>
				&nbsp;&nbsp;<span class="snappymail-result-desc"></span>
			</p>
		</fieldset>
	</form>
</div>
