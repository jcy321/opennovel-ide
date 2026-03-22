/*---------------------------------------------------------------------------------------------
 *  Copyright (c) OpenNovel IDE. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { IFileDialogService } from 'vs/platform/dialogs/common/dialogs';
import { IFileService } from 'vs/platform/files/common/files';
import { ILogService } from 'vs/platform/log/common/log';
import { URI } from 'vs/base/common/uri';
import { VSBuffer } from 'vs/base/common/buffer';

export const IOpenNovelMainService = createDecorator<IOpenNovelMainService>('opennovelMainService');

export interface ExportOptions {
	format: 'txt' | 'md' | 'pdf' | 'epub';
	includeMetadata?: boolean;
}

export interface IOpenNovelMainService {
	readonly _serviceBrand: undefined;
	openExternal(url: string): Promise<void>;
	selectExportPath(defaultName: string): Promise<URI | undefined>;
	exportContent(content: string, uri: URI): Promise<void>;
}

export class OpenNovelMainService implements IOpenNovelMainService {
	declare readonly _serviceBrand: undefined;

	constructor(
		@IOpenerService private readonly openerService: IOpenerService,
		@IFileDialogService private readonly fileDialogService: IFileDialogService,
		@IFileService private readonly fileService: IFileService,
		@ILogService private readonly logService: ILogService
	) { }

	async openExternal(url: string): Promise<void> {
		try {
			await this.openerService.open(URI.parse(url));
		} catch (e) {
			this.logService.error('[OpenNovel] Failed to open external URL:', e);
		}
	}

	async selectExportPath(defaultName: string): Promise<URI | undefined> {
		try {
			const result = await this.fileDialogService.showSaveDialog({
				defaultUri: URI.file(defaultName),
				filters: [
					{ name: 'Text File', extensions: ['txt'] },
					{ name: 'Markdown', extensions: ['md'] }
				]
			});
			return result;
		} catch (e) {
			this.logService.error('[OpenNovel] Failed to select export path:', e);
			return undefined;
		}
	}

	async exportContent(content: string, uri: URI): Promise<void> {
		try {
			await this.fileService.writeFile(uri, VSBuffer.fromString(content));
			this.logService.info('[OpenNovel] Content exported to:', uri.toString());
		} catch (e) {
			this.logService.error('[OpenNovel] Failed to export content:', e);
			throw e;
		}
	}
}