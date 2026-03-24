/*---------------------------------------------------------------------------------------------
 *  Copyright (c) OpenNovel IDE. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { ILogService } from 'vs/platform/log/common/log';
import { IRequestService, asText } from 'vs/platform/request/common/request';
import { CancellationToken } from 'vs/base/common/cancellation';

export const IHttpClient = createDecorator<IHttpClient>('opennovelHttpClient');

export interface IHttpClient {
	readonly _serviceBrand: undefined;
	get<T>(url: string): Promise<T>;
	post<T>(url: string, body?: object): Promise<T>;
	put<T>(url: string, body?: object): Promise<T>;
	delete<T>(url: string): Promise<T>;
}

export class HttpClient implements IHttpClient {
	declare readonly _serviceBrand: undefined;

	private readonly retries = 2;

	constructor(
		@ILogService private readonly logService: ILogService,
		@IRequestService private readonly requestService: IRequestService
	) { }

	async get<T>(url: string): Promise<T> {
		return this.request<T>('GET', url);
	}

	async post<T>(url: string, body?: object): Promise<T> {
		return this.request<T>('POST', url, body);
	}

	async put<T>(url: string, body?: object): Promise<T> {
		return this.request<T>('PUT', url, body);
	}

	async delete<T>(url: string): Promise<T> {
		return this.request<T>('DELETE', url);
	}

	private async request<T>(method: string, url: string, body?: object): Promise<T> {
		let lastError: Error | null = null;

		this.logService.info(`[HttpClient] >>> ${method} ${url}`);
		if (body) {
			this.logService.info(`[HttpClient] >>> Body:`, JSON.stringify(body));
		}

		for (let attempt = 0; attempt <= this.retries; attempt++) {
			try {
				const options = {
					type: method as 'GET' | 'POST' | 'PUT' | 'DELETE',
					url,
					headers: { 'Content-Type': 'application/json' },
					data: body ? JSON.stringify(body) : undefined
				};

				this.logService.info(`[HttpClient] Using IRequestService for request...`);
				
				const context = await this.requestService.request(options, CancellationToken.None);

				this.logService.info(`[HttpClient] <<< ${method} ${url} Status: ${context.res.statusCode}`);

				if (!context.res.statusCode || context.res.statusCode >= 400) {
					throw new Error(`HTTP ${context.res.statusCode || 'unknown'}`);
				}

				const text = await asText(context);
				this.logService.info(`[HttpClient] <<< Response body:`, text || '(empty)');

				if (!text) {
					return {} as T;
				}

				const parsed = JSON.parse(text) as T;
				this.logService.info(`[HttpClient] <<< Parsed JSON successfully`);
				return parsed;
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));
				this.logService.error(`[HttpClient] ${method} ${url} failed (attempt ${attempt + 1}):`, lastError.message);

				if (attempt < this.retries) {
					await this.delay(1000 * (attempt + 1));
				}
			}
		}

		throw lastError || new Error('Request failed');
	}

	private delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}