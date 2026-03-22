/*---------------------------------------------------------------------------------------------
 *  Copyright (c) OpenNovel IDE. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';

export const IOpenNovelMainService = createDecorator<IOpenNovelMainService>('opennovelMainService');

export interface IOpenNovelMainService {
	readonly _serviceBrand: undefined;

	selectFolder(options?: { title?: string; defaultPath?: string }): Promise<string | undefined>;
	selectFile(options?: { title?: string; defaultPath?: string; filters?: FileFilter[] }): Promise<string | undefined>;
	openExternal(url: string): Promise<void>;
	readFile(path: string): Promise<string>;
	writeFile(path: string, content: string): Promise<void>;
	exists(path: string): Promise<boolean>;
	ensureDir(path: string): Promise<void>;
}

export interface FileFilter {
	name: string;
	extensions: string[];
}

export class OpenNovelMainService implements IOpenNovelMainService {
	declare readonly _serviceBrand: undefined;

	async selectFolder(options?: { title?: string; defaultPath?: string }): Promise<string | undefined> {
		return undefined;
	}

	async selectFile(options?: { title?: string; defaultPath?: string; filters?: FileFilter[] }): Promise<string | undefined> {
		return undefined;
	}

	async openExternal(url: string): Promise<void> {
		if (typeof window !== 'undefined') {
			window.open(url, '_blank');
		}
	}

	async readFile(path: string): Promise<string> {
		throw new Error('readFile not available in browser context');
	}

	async writeFile(path: string, content: string): Promise<void> {
		throw new Error('writeFile not available in browser context');
	}

	async exists(path: string): Promise<boolean> {
		return false;
	}

	async ensureDir(path: string): Promise<void> {
		throw new Error('ensureDir not available in browser context');
	}
}