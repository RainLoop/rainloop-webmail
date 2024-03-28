<div class="section">
	<form class="snappymail" action="admin.php" method="post">
		<input type="hidden" name="requesttoken" value="<?php echo $_['requesttoken'] ?>" id="requesttoken">
		<fieldset class="personalblock">
			<h2><?php echo($l->t('SnappyMail Webmail')); ?></h2>
			<br />
			<?php if ($_['snappymail-admin-panel-link']) { ?>
			<p>
				<a href="<?php echo $_['snappymail-admin-panel-link'] ?>" style="text-decoration: underline">
					<?php echo($l->t('Go to SnappyMail Webmail admin panel')); ?>
				</a>
			<?php if ($_['snappymail-admin-password']) { ?>
				<br/>
				Username: admin<br/>
				Temporary password: <?php echo $_['snappymail-admin-password']; ?>
			<?php } ?>
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
<!-- DISABLED https://github.com/the-djmaze/snappymail/issues/1420#issuecomment-1933045917
			<p>
				<input id="snappymail-autologin-oidc" name="snappymail-autologin-oidc" type="checkbox" class="checkbox" <php if ($_['snappymail-autologin-oidc']) echo 'checked="checked"'; ?>>
				<label for="snappymail-autologin-oidc">
					<php echo($l->t('Attempt to automatically login with OIDC when active')); ?>
				</label>
			</p>
			<br />
-->
			<p>
				<input id="snappymail-no-embed" name="snappymail-no-embed" type="checkbox" class="checkbox" <?php if ($_['snappymail-no-embed']) echo 'checked="checked"'; ?>>
				<label for="snappymail-no-embed">
					<?php echo($l->t('Don\'t fully integrate in Nextcloud, use in iframe')); ?>
				</label>
			</p>
			<br />
			<p>
				<input id="snappymail-debug" name="snappymail-debug" type="checkbox" class="checkbox" <?php if ($_['snappymail-debug']) echo 'checked="checked"'; ?>>
				<label for="snappymail-debug">
					<?php echo($l->t('Debug')); ?>
				</label>
			</p>
			<br />
			<?php if ($_['can-import-rainloop']) { ?>
			<p>
				<input id="import-rainloop" name="import-rainloop" type="checkbox" class="checkbox">
				<label for="import-rainloop">
					<?php echo($l->t('Import RainLoop data')); ?>
				</label>
			</p>
			<br />
			<?php } ?>
			<p>
				<button id="snappymail-save-button" name="snappymail-save-button"><?php echo($l->t('Save')); ?></button>
				<div class="snappymail-result-desc" style="white-space: pre"></div>
			</p>
		</fieldset>
	</form>
</div>
