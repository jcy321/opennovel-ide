/*---------------------------------------------------------------------------------------------
 *  Copyright (c) OpenNovel IDE. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { ViewPane, IViewPaneOptions } from 'vs/workbench/browser/parts/views/viewPane';
import { IKeybindingService } from 'vs/platform/keybinding/common/keybinding';
import { IContextMenuService } from 'vs/platform/contextview/browser/contextView';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IViewDescriptorService } from 'vs/workbench/common/views';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { IOpenNovelService, Book } from 'vs/workbench/contrib/opennovel/common/opennovel';
import { $, addDisposableListener, EventType } from 'vs/base/browser/dom';
import { IListVirtualDelegate, IListRenderer } from 'vs/base/browser/ui/list/list';
import { List } from 'vs/base/browser/ui/list/listWidget';
import { DisposableStore } from 'vs/base/common/lifecycle';
import { IDialogService } from 'vs/platform/dialogs/common/dialogs';
import { INotificationService, Severity } from 'vs/platform/notification/common/notification';

export class BookExplorerView extends ViewPane {

	static readonly ID = 'opennovel.explorer';
	static readonly TITLE = localize('books', "Books");

	private list!: List<Book>;
	private listContainer!: HTMLElement;
	private headerContainer!: HTMLElement;
	private readonly disposables = this._register(new DisposableStore());

	constructor(
		options: IViewPaneOptions,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurationService configurationService: IConfigurationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IOpenNovelService private readonly opennovelService: IOpenNovelService,
		@IDialogService private readonly dialogService: IDialogService,
		@INotificationService private readonly notificationService: INotificationService
	) {
		super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, telemetryService);

		this._register(opennovelService.onDidChangeBooks(() => this.updateList()));
		this._register(opennovelService.onDidChangeConnection(() => this.updateList()));
	}

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);

		this.headerContainer = $('.book-explorer-header');
		const createButton = $('button.create-book-button');
		createButton.textContent = '+ 新建书籍';
		createButton.style.cssText = 'width: 100%; padding: 8px; margin-bottom: 8px; cursor: pointer; border: 1px solid var(--vscode-button-border); background: var(--vscode-button-background); color: var(--vscode-button-foreground); border-radius: 4px;';
		
		this.disposables.add(addDisposableListener(createButton, EventType.CLICK, () => {
			this.createBook();
		}));

		this.headerContainer.appendChild(createButton);
		container.appendChild(this.headerContainer);

		this.listContainer = $('.book-list-container');
		this.listContainer.style.cssText = 'flex: 1; overflow: hidden;';
		container.appendChild(this.listContainer);

		const delegate = new BookListDelegate();
		const renderer = new BookListRenderer();

		this.list = this._register(new List('opennovel-books', this.listContainer, delegate, [renderer], {
			identityProvider: { getId: (book: Book) => book.id },
			mouseSupport: true,
			multipleSelectionSupport: false
		}));

		this.disposables.add(addDisposableListener(this.list.getHTMLElement(), EventType.DBLCLICK, () => {
			const focus = this.list.getFocus();
			if (focus.length > 0) {
				const book = this.list.element(focus[0]);
				this.openBook(book);
			}
		}));

		this.updateList();
	}

	private async createBook(): Promise<void> {
		if (!this.opennovelService.isConnected) {
			this.notificationService.prompt(Severity.Warning, '请先连接服务器', []);
			return;
		}

		const result = await this.dialogService.input({
			title: '创建新书',
			message: '请输入书名',
			inputs: [{
				type: 'text',
				placeholder: '例如：仙侠传说'
			}],
			primaryButton: '创建'
		});

		if (result.confirmed && result.values?.[0]) {
			const title = result.values[0].trim();
			if (title) {
				try {
					await this.opennovelService.createBook({ name: title });
					this.notificationService.prompt(Severity.Info, `书籍 "${title}" 创建成功`, []);
				} catch (e) {
					this.notificationService.prompt(Severity.Error, `创建失败: ${e}`, []);
				}
			}
		}
	}

	private updateList(): void {
		if (!this.opennovelService.isConnected) {
			this.list.splice(0, this.list.length);
			return;
		}

		const books = this.opennovelService.books;
		this.list.splice(0, this.list.length, books);
	}

	private openBook(book: Book): void {
		console.log('Opening book:', book.name);
	}

	protected override layoutBody(height: number, width: number): void {
		super.layoutBody(height, width);
		const headerHeight = 48;
		this.list.layout(height - headerHeight, width);
	}
}

class BookListDelegate implements IListVirtualDelegate<Book> {
	getHeight(): number {
		return 48;
	}

	getTemplateId(): string {
		return 'book-item';
	}
}

interface BookItemTemplate {
	readonly container: HTMLElement;
	readonly name: HTMLElement;
	readonly status: HTMLElement;
	readonly info: HTMLElement;
}

class BookListRenderer implements IListRenderer<Book, BookItemTemplate> {
	readonly templateId = 'book-item';

	renderTemplate(container: HTMLElement): BookItemTemplate {
		const row = $('.book-item');
		const name = $('.book-name');
		const status = $('.book-status');
		const info = $('.book-info');

		row.appendChild(name);
		row.appendChild(status);
		row.appendChild(info);
		container.appendChild(row);

		return { container, name, status, info };
	}

	renderElement(book: Book, _index: number, template: BookItemTemplate): void {
		template.name.textContent = `📖 ${book.name}`;
		template.status.textContent = this.getStatusText(book.status);
		template.info.textContent = `${book.chapterCount}章 | ${book.wordCount}字`;
	}

	private getStatusText(status: string): string {
		switch (status) {
			case 'planning': return '📋 规划中';
			case 'writing': return '✏️ 撰写中';
			case 'paused': return '⏸️ 暂停';
			case 'completed': return '✅ 已完结';
			default: return status;
		}
	}

	disposeTemplate(): void {}
}