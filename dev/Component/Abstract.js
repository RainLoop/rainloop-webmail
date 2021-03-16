
export class AbstractComponent {
	constructor() {
		this.disposable = [];
	}

	dispose() {
		this.disposable.forEach((funcToDispose) => {
			if (funcToDispose && funcToDispose.dispose) {
				funcToDispose.dispose();
			}
		});
	}
}
