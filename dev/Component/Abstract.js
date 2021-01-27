
export class AbstractComponent {
	disposable = [];

	dispose() {
		this.disposable.forEach((funcToDispose) => {
			if (funcToDispose && funcToDispose.dispose) {
				funcToDispose.dispose();
			}
		});
	}
}
