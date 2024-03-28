(rl => {

const getFolders = type => {
	const
		aResult = [{
			id: '',
			name: '',
		}],
		foldersWalk = folders => {
			folders.forEach(oItem => {
				if (type === oItem.kolabType()) {
					aResult.push({
						id: oItem.fullName,
						name: oItem.fullName
					});
				}
				if (oItem.subFolders.length) {
					foldersWalk(oItem.subFolders());
				}
			});
		};
	foldersWalk(rl.app.folderList());
	return aResult;
};


class KolabSettings /* extends AbstractViewSettings */
{
	constructor() {
		this.contactFolder = ko.observable(rl.settings.get('KolabContactFolder'));
//		rl.app.FolderUserStore.hasCapability('METADATA');
		this.contactFolder.subscribe(value => {
			rl.pluginRemoteRequest(()=>{}, 'KolabFolder', {
				contact: value
			});
		});
		this.contactFoldersList = ko.computed(() => getFolders('contact'), {'pure':true});
//		this.eventFoldersList = ko.computed(() => getFolders('event'), {'pure':true});
//		this.taskFoldersList = ko.computed(() => getFolders('task'), {'pure':true});
//		this.noteFoldersList = ko.computed(() => getFolders('note'), {'pure':true});
//		this.fileFoldersList = ko.computed(() => getFolders('file'), {'pure':true});
//		this.journalFoldersList = ko.computed(() => getFolders('journal'), {'pure':true});
//		this.configFoldersList = ko.computed(() => getFolders('configuration'), {'pure':true});
	}
}

rl.addSettingsViewModel(
	KolabSettings,
	'KolabSettings',
	'Kolab',
	'kolab'
);

})(window.rl);
