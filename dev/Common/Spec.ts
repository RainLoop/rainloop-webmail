
import { Mime } from './Mime';
import { EventKeyCode } from './Enums';

interface IPage {
    current: boolean,
	name: string,
	custom: boolean,
	title: string,
	value: string
};

export function computedPagenatorHelper(koCurrentPage: () => number, koPageCount: () => number)
{
	return (): IPage[] => {

		const
			currentPage: number = koCurrentPage(),
			pageCount: number = koPageCount(),
			result: IPage[] = [],
			fAdd = (index: number, push: boolean = true, customName: string = ''): void => {

				const data: IPage = {
					current: index === currentPage,
					name: '' === customName ? index.toString() : customName.toString(),
					custom: '' === customName ? false : true,
					title: '' === customName ? '' : index.toString(),
					value: index.toString()
				};

				if (push)
				{
					result.push(data);
				}
				else
				{
					result.unshift(data);
				}
			}
		;

		let
			prev: number = 0,
			next: number = 0,
			limit: number = 2
		;

		if (1 < pageCount || (0 < pageCount && pageCount < currentPage))
		{
			if (pageCount < currentPage)
			{
				fAdd(pageCount);
				prev = pageCount;
				next = pageCount;
			}
			else
			{
				if (3 >= currentPage || pageCount - 2 <= currentPage)
				{
					limit += 2;
				}

				fAdd(currentPage);
				prev = currentPage;
				next = currentPage;
			}

			while (0 < limit) {

				prev -= 1;
				next += 1;

				if (0 < prev)
				{
					fAdd(prev, false);
					limit--;
				}

				if (pageCount >= next)
				{
					fAdd(next, true);
					limit--;
				}
				else if (0 >= prev)
				{
					break;
				}
			}

			if (3 === prev)
			{
				fAdd(2, false);
			}
			else if (3 < prev)
			{
				fAdd(Math.round((prev - 1) / 2), false, '...');
			}

			if (pageCount - 2 === next)
			{
				fAdd(pageCount - 1, true);
			}
			else if (pageCount - 2 > next)
			{
				fAdd(Math.round((pageCount + next) / 2), true, '...');
			}

			// first and last
			if (1 < prev)
			{
				fAdd(1, false);
			}

			if (pageCount > next)
			{
				fAdd(pageCount, true);
			}
		}

		return result;
	};
}

/**
 * @param {string} fileName
 * @return {string}
 */
export function getFileExtension(fileName: string): string
{
	fileName = fileName.trim().toLowerCase();

	const result = fileName.split('.').pop();
	return result === fileName ? '' : result;
}

/**
 * @param {string} fileName
 * @return {string}
 */
export function mimeContentType(fileName: string): string
{
	let
		ext = '',
		result = 'application/octet-stream'
	;

	fileName = fileName.trim().toLowerCase();

	if ('winmail.dat' === fileName)
	{
		return 'application/ms-tnef';
	}

	ext = getFileExtension(fileName);
	if (ext && 0 < ext.length && undefined !== Mime[ext])
	{
		result = Mime[ext];
	}

	return result;
}

/**
 * @param {string} url
 * @param {number} value
 * @param {Function} fCallback
 */
export function resizeAndCrop(url: string, value: number, fCallback: (data: string) => void)
{
	const img = new Image();
	img.onload = function() {

		let
			diff: number[] = [0, 0]
		;

		const
			canvas: HTMLCanvasElement = window.document.createElement('canvas'),
			ctx: CanvasRenderingContext2D = canvas.getContext('2d')
		;

		canvas.width = value;
		canvas.height = value;

		if (this.width > this.height)
		{
			diff = [this.width - this.height, 0];
		}
		else
		{
			diff = [0, this.height - this.width];
		}

		ctx.fillStyle = '#fff';
		ctx.fillRect(0, 0, value, value);
		ctx.drawImage(this, diff[0] / 2, diff[1] / 2, this.width - diff[0], this.height - diff[1], 0, 0, value, value);

		fCallback(canvas.toDataURL('image/jpeg'));
	};

	img.src = url;
}
