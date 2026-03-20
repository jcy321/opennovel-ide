/*---------------------------------------------------------------------------------------------
 *  Copyright (c) OpenNovel IDE. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { EditorInput } from 'vs/workbench/common/editor/editorInput';
import { EditorModel } from 'vs/workbench/common/editor/editorModel';
import { EditorPane } from 'vs/workbench/browser/parts/editor/editorPane';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { IOpenNovelService, OPENNOVEL_SERVER_URL } from 'vs/workbench/contrib/opennovel/common/opennovel';
import { $, addDisposableListener, EventType, clearNode } from 'vs/base/browser/dom';
import { IEditorGroup } from 'vs/workbench/services/editor/common/editorGroupsService';
import { DisposableStore } from 'vs/base/common/lifecycle';

export const WELCOME_PAGE_ID = 'opennovel.welcome';

export class WelcomePageInput extends EditorInput {
	static readonly ID = WELCOME_PAGE_ID;

	override get typeId(): string {
		return WelcomePageInput.ID;
	}

	override getName(): string {
		return 'OpenNovel IDE';
	}

	override matches(other: EditorInput): boolean {
		return other instanceof WelcomePageInput;
	}
}

export class WelcomePage extends EditorPane {
	static readonly ID = WELCOME_PAGE_ID;

	private container!: HTMLElement;
	private readonly disposables = this._register(new DisposableStore());

	constructor(
		@ITelemetryService telemetryService: ITelemetryService,
		@IThemeService themeService: IThemeService,
		@IStorageService storageService: IStorageService,
		@IOpenNovelService private readonly opennovelService: IOpenNovelService
	) {
		super(WelcomePage.ID, telemetryService, themeService, storageService);
	}

	protected createEditor(parent: HTMLElement): void {
		this.container = $('.welcome-page');
		parent.appendChild(this.container);
		this.render();
	}

	private render(): void {
		clearNode(this.container);

		if (this.opennovelService.isConnected) {
			this.renderDashboard();
		} else {
			this.renderConnectForm();
		}
	}

	private renderConnectForm(): void {
		const form = $('.welcome-connect-form');
		
		const title = $('.welcome-title');
		title.textContent = '欢迎使用 OpenNovel IDE';
		form.appendChild(title);

		const serverGroup = $('.welcome-form-group');
		const serverLabel = $('label');
		serverLabel.textContent = '服务器地址';
		const serverInput = $('input') as HTMLInputElement;
		serverInput.type = 'text';
		serverInput.value = OPENNOVEL_SERVER_URL;
		serverInput.placeholder = 'http://localhost:6688';
		serverGroup.appendChild(serverLabel);
		serverGroup.appendChild(serverInput);
		form.appendChild(serverGroup);

		const connectButton = $('button.welcome-connect-button');
		connectButton.textContent = '连接';
		this.disposables.add(addDisposableListener(connectButton, EventType.CLICK, async () => {
			const url = serverInput.value.trim() || OPENNOVEL_SERVER_URL;
			connectButton.textContent = '连接中...';
			connectButton.setAttribute('disabled', 'true');
			
			const success = await this.opennovelService.connect(url);
			
			if (success) {
				this.render();
			} else {
				connectButton.textContent = '连接失败，重试';
				connectButton.removeAttribute('disabled');
			}
		}));
		form.appendChild(connectButton);

		this.container.appendChild(form);
	}

	private renderDashboard(): void {
		const dashboard = $('.welcome-dashboard');
		
		const header = $('.dashboard-header');
		const date = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
		header.innerHTML = `<span class="dashboard-title">📊 今日创作</span><span class="dashboard-date">${date}</span>`;
		dashboard.appendChild(header);

		const stats = $('.dashboard-stats');
		
		const wordCountCard = this.createStatCard('📈 字数统计', [
			`今日新增: +0 字`,
			`本周新增: +0 字`,
			`总计: 0 字`
		]);
		stats.appendChild(wordCountCard);

		const activeBookCard = this.createStatCard('📝 活跃书籍', [
			this.opennovelService.books.length > 0 
				? this.opennovelService.books[0].name 
				: '暂无书籍'
		]);
		stats.appendChild(activeBookCard);

		const pendingCard = this.createStatCard('🔮 待处理事项', [
			'伏笔待触发: 0',
			'一致性警告: 0',
			'章节待审核: 0'
		]);
		stats.appendChild(pendingCard);

		dashboard.appendChild(stats);

		const actions = $('.dashboard-actions');
		
		const createBookBtn = $('button.dashboard-action-btn');
		createBookBtn.textContent = '➕ 创建新书';
		this.disposables.add(addDisposableListener(createBookBtn, EventType.CLICK, () => {
			console.log('Create new book');
		}));
		actions.appendChild(createBookBtn);

		const continueBtn = $('button.dashboard-action-btn.primary');
		continueBtn.textContent = '✏️ 继续创作';
		this.disposables.add(addDisposableListener(continueBtn, EventType.CLICK, () => {
			console.log('Continue writing');
		}));
		actions.appendChild(continueBtn);

		dashboard.appendChild(actions);

		this.container.appendChild(dashboard);
	}

	private createStatCard(title: string, items: string[]): HTMLElement {
		const card = $('.dashboard-stat-card');
		
		const cardTitle = $('.stat-card-title');
		cardTitle.textContent = title;
		card.appendChild(cardTitle);

		const cardContent = $('.stat-card-content');
		for (const item of items) {
			const line = $('.stat-card-item');
			line.textContent = item;
			cardContent.appendChild(line);
		}
		card.appendChild(cardContent);

		return card;
	}

	override setInput(input: WelcomePageInput, options: unknown, context: unknown, token: unknown): Promise<void> {
		return super.setInput(input, options, context, token);
	}

	layout(dimension: unknown): void {}

	override clearInput(): void {
		super.clearInput();
	}
}