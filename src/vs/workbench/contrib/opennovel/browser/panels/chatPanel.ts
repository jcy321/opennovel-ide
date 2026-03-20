/*---------------------------------------------------------------------------------------------
 *  Copyright (c) OpenNovel IDE. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IViewPaneOptions, ViewPane } from 'vs/workbench/browser/parts/views/viewPane';
import { IKeybindingService } from 'vs/platform/keybinding/common/keybinding';
import { IContextMenuService } from 'vs/platform/contextview/browser/contextView';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IViewDescriptorService } from 'vs/workbench/common/views';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IOpenNovelService, ChatMessage, CHAT_VIEW_ID } from 'vs/workbench/contrib/opennovel/common/opennovel';
import { $, addDisposableListener, EventType, clearNode } from 'vs/base/browser/dom';
import { DisposableStore } from 'vs/base/common/lifecycle';

export class ChatPanel extends ViewPane {
	static readonly ID = CHAT_VIEW_ID;

	private container!: HTMLElement;
	private messagesContainer!: HTMLElement;
	private inputContainer!: HTMLElement;
	private currentBookId: string | null = null;
	private messages: ChatMessage[] = [];
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
		@IOpenNovelService private readonly opennovelService: IOpenNovelService
	) {
		super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, telemetryService);

		this._register(opennovelService.onDidReceiveMessage((message) => {
			this.messages.push(message);
			this.renderMessage(message);
		}));
	}

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);

		this.container = $('.chat-panel');
		container.appendChild(this.container);

		this.messagesContainer = $('.chat-messages');
		this.container.appendChild(this.messagesContainer);

		this.inputContainer = $('.chat-input-container');
		this.renderInputArea();
		this.container.appendChild(this.inputContainer);

		this.renderEmptyState();
	}

	private renderEmptyState(): void {
		clearNode(this.messagesContainer);

		if (!this.opennovelService.isConnected) {
			const empty = $('.chat-empty');
			empty.textContent = '请先连接服务器';
			this.messagesContainer.appendChild(empty);
			return;
		}

		if (!this.currentBookId) {
			const empty = $('.chat-empty');
			empty.textContent = '请选择一本书籍开始群聊';
			this.messagesContainer.appendChild(empty);
			return;
		}
	}

	private renderInputArea(): void {
		clearNode(this.inputContainer);

		const inputWrapper = $('.chat-input-wrapper');
		
		const input = $('textarea.chat-input') as HTMLTextAreaElement;
		input.placeholder = '输入消息... (Enter 发送, Shift+Enter 换行)';
		input.rows = 1;
		
		this.disposables.add(addDisposableListener(input, EventType.KEY_DOWN, (e) => {
			const event = e as KeyboardEvent;
			if (event.key === 'Enter' && !event.shiftKey) {
				event.preventDefault();
				this.sendMessage(input.value);
				input.value = '';
			}
		}));

		const sendButton = $('button.chat-send-button');
		sendButton.textContent = '发送';
		this.disposables.add(addDisposableListener(sendButton, EventType.CLICK, () => {
			this.sendMessage(input.value);
			input.value = '';
		}));

		inputWrapper.appendChild(input);
		inputWrapper.appendChild(sendButton);
		this.inputContainer.appendChild(inputWrapper);
	}

	private async sendMessage(content: string): Promise<void> {
		if (!content.trim() || !this.currentBookId) return;
		
		await this.opennovelService.sendMessage(this.currentBookId, content);
	}

	private renderMessage(message: ChatMessage): void {
		const messageEl = $('.chat-message');
		
		const header = $('.chat-message-header');
		
		const avatar = $('.chat-message-avatar');
		avatar.textContent = message.agentName.charAt(0);
		header.appendChild(avatar);

		const name = $('.chat-message-agent-name');
		name.textContent = message.agentName;
		header.appendChild(name);

		const time = $('.chat-message-time');
		time.textContent = new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
		header.appendChild(time);

		messageEl.appendChild(header);

		if (message.thinking) {
			const thinking = $('.chat-message-thinking');
			thinking.textContent = `💭 ${message.thinking}`;
			messageEl.appendChild(thinking);
		}

		const content = $('.chat-message-content');
		content.textContent = message.content;
		messageEl.appendChild(content);

		this.messagesContainer.appendChild(messageEl);
		this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
	}

	setBook(bookId: string): void {
		this.currentBookId = bookId;
		this.messages = [];
		clearNode(this.messagesContainer);
		this.renderEmptyState();
	}

	protected override layoutBody(height: number, width: number): void {
		super.layoutBody(height, width);
		const inputHeight = 60;
		this.messagesContainer.style.height = `${height - inputHeight}px`;
	}
}