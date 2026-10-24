(() => {

const dom = document.getElementById('MailMessageView').content;

dom.querySelector('.attachmentsControls').dataset.bind = '';

let ds = dom.querySelector('.attachmentsPlace').dataset;
ds.bind = ds.bind.replace('showAttachmentControls', 'true');

ds = dom.querySelector('.controls-handle').dataset;
ds.bind = ds.bind.replace('allowAttachmentControls', 'false');

})();
