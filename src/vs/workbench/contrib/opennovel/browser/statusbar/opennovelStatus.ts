/*---------------------------------------------------------------------------------------------
 *  Copyright (c) OpenNovel IDE. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from 'vs/base/common/lifecycle';
import { localize } from 'vs/nls';
import { IWorkbenchContribution } from 'vs/workbench/common/contributions';
import { IStatusbarService, StatusbarAlignment, IStatusbarEntryAccessor } from 'vs/workbench/services/statusbar/browser/statusbar';
import { IOpenNovelService } from 'vs/workbench/contrib/opennovel/common/opennovel';
import { Codicon } from 'vs/base/common/codicons';

export class OpenNovelStatus extends Disposable implements IWorkbenchContribution {
	private static readonly ID = 'status.opennovel';

	private readonly statusEntry: IStatusbarEntryAccessor;

	constructor(
		@IOpenNovelService private readonly opennovelService: IOpenNovelService,
		@IStatusbarService private readonly statusbarService: IStatusbarService
	) {
		super();

		this.statusEntry = this._register(
			this.statusbarService.addEntry(
				this.getStatusEntry(),
				OpenNovelStatus.ID,
				StatusbarAlignment.LEFT,
				100
			)
		);

		this._register(
			this.opennovelService.onDidChangeConnection(() => this.updateStatus())
		);

		this._register(
			this.opennovelService.onDidChangeAgents(() => this.updateStatus())
		);
	}

	private getStatusEntry() {
		const connected = this.opennovelService.isConnected;
		const agents = this.opennovelService.agents;
		const activeAgents = agents.filter(a => a.status === 'active').length;

		return {
			name: localize('opennovelStatus', "OpenNovel Connection Status"),
			text: connected
				? `$(plug) OpenNovel ${activeAgents > 0 ? `(${activeAgents} active)` : ''}`
				: '$(plug) OpenNovel (disconnected)',
			ariaLabel: connected
				? localize('opennovelConnected', "OpenNovel: Connected")
				: localize('opennovelDisconnected', "OpenNovel: Disconnected"),
			tooltip: connected
				? localize('opennovelConnectedTooltip', "OpenNovel IDE is connected to backend server")
				: localize('opennovelDisconnectedTooltip', "Click to connect to OpenNovel server"),
			command: 'opennovel.connectServer',
			kind: 'prominent',
			showInAllWindows: true
		};
	}

	private updateStatus(): void {
		this.statusEntry.update(this.getStatusEntry());
	}
}