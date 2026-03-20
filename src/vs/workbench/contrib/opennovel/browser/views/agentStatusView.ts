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
import { IOpenNovelService, Agent } from 'vs/workbench/contrib/opennovel/common/opennovel';
import { $ } from 'vs/base/browser/dom';

export class AgentStatusView extends ViewPane {
	static readonly ID = 'opennovel.agents';

	private container!: HTMLElement;

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

		this._register(opennovelService.onDidChangeAgents(() => this.renderAgents()));
	}

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);

		this.container = $('.agent-status-view');
		container.appendChild(this.container);

		this.renderAgents();
	}

	private renderAgents(): void {
		this.container.innerHTML = '';

		if (!this.opennovelService.isConnected) {
			const empty = $('.agent-empty');
			empty.textContent = '请先连接服务器';
			this.container.appendChild(empty);
			return;
		}

		const agents = this.opennovelService.agents;

		if (agents.length === 0) {
			const empty = $('.agent-empty');
			empty.textContent = '暂无 Agent 数据';
			this.container.appendChild(empty);
			return;
		}

		for (const agent of agents) {
			const card = this.renderAgentCard(agent);
			this.container.appendChild(card);
		}
	}

	private renderAgentCard(agent: Agent): HTMLElement {
		const card = $('.agent-card');
		
		const header = $('.agent-card-header');
		
		const avatar = $('.agent-avatar');
		avatar.style.backgroundColor = agent.color;
		avatar.textContent = agent.name.charAt(0);
		header.appendChild(avatar);

		const info = $('.agent-card-info');
		const name = $('.agent-name');
		name.textContent = agent.name;
		info.appendChild(name);

		const role = $('.agent-role');
		role.textContent = agent.role;
		info.appendChild(role);

		header.appendChild(info);
		card.appendChild(header);

		const status = $('.agent-card-status');
		const statusIcon = this.getStatusIcon(agent.status);
		status.innerHTML = `${statusIcon} ${this.getStatusText(agent.status)}`;
		card.appendChild(status);

		if (agent.currentTask) {
			const task = $('.agent-card-task');
			task.textContent = `📍 ${agent.currentTask}`;
			card.appendChild(task);
		}

		return card;
	}

	private getStatusIcon(status: string): string {
		switch (status) {
			case 'active': return '🟢';
			case 'idle': return '🟡';
			case 'locked': return '🔴';
			default: return '⚪';
		}
	}

	private getStatusText(status: string): string {
		switch (status) {
			case 'active': return '活跃';
			case 'idle': return '空闲';
			case 'locked': return '锁定';
			default: return '未知';
		}
	}

	protected override layoutBody(height: number, width: number): void {
		super.layoutBody(height, width);
	}
}